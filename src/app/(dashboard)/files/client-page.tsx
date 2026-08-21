'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Files, Plus, RefreshCw, Search, X, CheckCircle2,
  AlertTriangle, Loader2, Trash2, Eye, FileText, Image as ImageIcon,
  Video, Film, Link2, UploadCloud, Edit3, ExternalLink, Music, FileSpreadsheet, File
} from 'lucide-react';
import { uploadFileAction } from '@/app/actions/storage';
import {
  getBotFiles,
  createBotFile,
  updateBotFile,
  deleteBotFile,
  type CreateBotFileInput,
} from '@/app/actions/files';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';

interface BotFileItem {
  id: string;
  name: string;
  description: string;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  createdAt: string | Date;
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return FileText;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  return FileText;
}

function getFileBadgeLabel(mimeType?: string | null, filename?: string | null) {
  if (mimeType?.startsWith('image/')) return 'Imagen / Render';
  if (mimeType?.startsWith('video/')) return 'Video';
  if (mimeType?.startsWith('audio/')) return 'Audio';
  if (filename?.endsWith('.pdf') || mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || filename?.endsWith('.xlsx')) return 'Excel';
  return 'Documento';
}

function FileCard({ file, onDelete, onEdit }: { file: BotFileItem; onDelete: () => void; onEdit: () => void }) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType?.startsWith('image/') || file.url.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i);
  const isVideo = file.mimeType?.startsWith('video/') || file.url.match(/\.(mp4|mov|webm)($|\?)/i);

  return (
    <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-[#F36A2D]/30 transition-all group h-full">
      {/* Preview media or Icon header */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center border border-[#DEDAD0]/40 dark:border-zinc-700/40">
        {isImage ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : isVideo ? (
          <video src={file.url} className="w-full h-full object-cover" muted />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <Icon size={36} className="text-[#F36A2D]" />
            <span className="text-[10px] font-bold uppercase text-zinc-500 max-w-[80%] truncate">{file.filename || 'Archivo'}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <Icon size={10} />
            {getFileBadgeLabel(file.mimeType, file.filename)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate" title={file.name}>
            {file.name}
          </h3>
          <p className="text-[11px] text-[#6F6F6F] mt-1.5 line-clamp-3 leading-relaxed">
            <span className="font-semibold text-[#F36A2D]/90">Instrucción IA:</span> {file.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#DEDAD0]/40 dark:border-zinc-800/40 mt-auto">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#6F6F6F] hover:bg-blue-500/10 hover:text-blue-500 transition-all"
        >
          <ExternalLink size={12} /> Abrir
        </a>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-xl text-zinc-400 hover:bg-amber-500/10 hover:text-amber-500 transition-all"
          title="Editar instrucción o archivo"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
          title="Eliminar archivo del bot"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function FileModal({ fileToEdit, onClose, onSaved }: { fileToEdit?: BotFileItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(fileToEdit?.name || '');
  const [description, setDescription] = useState(fileToEdit?.description || '');
  const [fileUrl, setFileUrl] = useState(fileToEdit?.url || '');
  const [filename, setFilename] = useState(fileToEdit?.filename || '');
  const [mimeType, setMimeType] = useState(fileToEdit?.mimeType || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadFileAction(formData);
      if (result.success && result.url) {
        setFileUrl(result.url);
        setFilename(file.name);
        setMimeType(file.type || 'application/octet-stream');
        if (!name) {
          const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[\s-]/g, '_');
          setName(defaultName);
        }
      } else {
        setError(result.error || 'Error al subir el archivo');
      }
    } catch (err: any) {
      setError('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !fileUrl.trim()) {
      setError('Nombre, instrucción del bot y archivo son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let res;
    if (fileToEdit) {
      res = await updateBotFile({
        id: fileToEdit.id,
        name: name.trim(),
        description: description.trim(),
        url: fileUrl.trim(),
        filename: filename || undefined,
        mimeType: mimeType || undefined,
      });
    } else {
      res = await createBotFile({
        name: name.trim(),
        description: description.trim(),
        url: fileUrl.trim(),
        filename: filename || undefined,
        mimeType: mimeType || undefined,
      });
    }

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Error desconocido');
      return;
    }

    onSaved();
    onClose();
  };

  const isImage = mimeType.startsWith('image/') || fileUrl.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-[#111111] w-full max-w-lg rounded-[2rem] shadow-2xl relative overflow-hidden border border-[#DEDAD0] dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal header */}
        <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">
              {fileToEdit ? 'Editar Archivo' : 'Nuevo Archivo para el Bot'}
            </h2>
            <p className="text-xs text-[#6F6F6F] mt-0.5">El bot enviará este archivo cuando el cliente lo requiera</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors">
            <X size={16} className="text-[#6F6F6F]" />
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto p-6 space-y-4">
          {/* Upload Box */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F] block mb-1.5">
              Archivo (Render, PDF, Excel, Foto, Video) <span className="text-[#F36A2D]">*</span>
            </label>
            {fileUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#F36A2D]/50 bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  {isImage ? (
                    <img src={fileUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-[#F36A2D]/10 rounded-xl flex items-center justify-center text-[#F36A2D] shrink-0">
                      <File size={24} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0] truncate">{filename || 'Archivo cargado'}</p>
                    <p className="text-[10px] text-[#F36A2D] font-mono mt-0.5">Listo para usar</p>
                  </div>
                </div>
                <label className="text-[11px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white cursor-pointer underline shrink-0 px-2">
                  Cambiar
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading || isSubmitting} />
                </label>
              </div>
            ) : (
              <label className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all cursor-pointer ${isUploading ? 'bg-zinc-50 border-zinc-200' : 'border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-[#F36A2D] hover:bg-[#F36A2D]/5'
                }`}>
                {isUploading ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-[#F36A2D] mb-2" />
                    <span className="text-xs font-bold text-[#F36A2D] animate-pulse">Subiendo archivo a Supabase...</span>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-[#F36A2D]/10 text-[#F36A2D] rounded-full flex items-center justify-center mb-2">
                      <UploadCloud size={20} />
                    </div>
                    <span className="text-[11px] font-black text-[#111111] dark:text-[#EDE9E0] tracking-widest uppercase">Haz clic para subir archivo</span>
                    <span className="text-[9px] text-zinc-400 font-bold mt-1">Imágenes, PDF, Documentos, Excel, Videos</span>
                  </>
                )}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading || isSubmitting} />
              </label>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">
              Nombre descriptivo <span className="text-[#F36A2D]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.replace(/\s+/g, '_'))}
              placeholder="Ej. Render_Fachada_Torre_A"
              className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors"
            />
          </div>

          {/* AI Instructions */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">
              Instrucción para el bot (¿Cuándo debe enviarlo?) <span className="text-[#F36A2D]">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Si el cliente pide ver los renders de la Torre A o pregunta por la fachada del edificio."
              rows={4}
              className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors resize-none leading-relaxed"
            />
            <p className="text-[10px] text-[#6F6F6F]">
              Sé específico para que Claude sepa exactamente en qué momento o ante qué pregunta adjuntar este documento en WhatsApp.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="p-6 border-t border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-black/10">
          <button onClick={onClose} disabled={isSubmitting} className="text-sm font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F36A2D] text-white rounded-xl font-bold text-sm hover:bg-[#e0601a] transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {fileToEdit ? 'Guardar Cambios' : 'Crear Archivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilesClientPage() {
  const [files, setFiles] = useState<BotFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFile, setEditingFile] = useState<BotFileItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getBotFiles();
      setFiles(data as BotFileItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo de la base de conocimiento de tu bot?')) return;
    const res = await deleteBotFile(id);
    if (res.success) {
      setSuccessMsg('Archivo eliminado.');
      setTimeout(() => setSuccessMsg(null), 3000);
      load();
    } else {
      alert(res.error || 'No se pudo eliminar el archivo.');
    }
  };

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DesktopOnlyGuard>
      <div className="flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
        {/* Header */}
        <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
              <Files size={18} />
            </div>
            <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Archivos del Bot</h1>
            <span className="text-[10px] font-black text-[#6F6F6F] bg-white/60 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-all"
              title="Actualizar"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setEditingFile(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F36A2D] text-white rounded-xl font-bold text-sm hover:bg-[#e0601a] transition-colors shadow-lg shadow-[#F36A2D]/20"
            >
              <Plus size={16} />
              Nuevo archivo
            </button>
          </div>
        </header>

        {/* Toast */}
        {successMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/20">
              <CheckCircle2 size={16} />
              <span className="font-bold text-sm">{successMsg}</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-8 pb-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Description card */}
            <div className="bg-white/60 dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-5 flex items-start gap-4">
              <div className="h-10 w-10 bg-[#F36A2D]/10 rounded-xl flex items-center justify-center text-[#F36A2D] shrink-0">
                <Files size={22} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0]">Archivos para IA</h2>
                <p className="text-xs text-[#6F6F6F] mt-1 leading-relaxed">
                  Sube renders, brochures, PDF de precios o fotos de tus proyectos. Asigna a cada archivo una instrucción para indicar en qué momento y ante qué preguntas la IA debe adjuntarlo en la conversación de WhatsApp.
                </p>
              </div>
            </div>

            {/* Search row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o instrucción..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/60 dark:bg-white/5 text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors placeholder:text-[#6F6F6F]/60"
                />
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 size={36} className="animate-spin text-[#F36A2D]" />
                <p className="text-sm font-medium text-[#6F6F6F]">Cargando archivos del bot...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-[#DEDAD0] dark:border-zinc-800 rounded-3xl">
                <div className="h-16 w-16 bg-[#F36A2D]/10 rounded-2xl flex items-center justify-center">
                  <Files size={32} className="text-[#F36A2D]/50" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#111111] dark:text-[#EDE9E0]">
                    {search ? 'Sin resultados de búsqueda' : 'No hay archivos guardados'}
                  </p>
                  <p className="text-sm text-[#6F6F6F] mt-1">
                    {search ? 'Intenta con otro término.' : 'Sube renders, brochures o fotos para que el bot pueda enviarlos a tus clientes.'}
                  </p>
                </div>
                {!search && (
                  <button
                    onClick={() => { setEditingFile(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F36A2D] text-white rounded-xl font-bold text-sm hover:bg-[#e0601a] transition-colors"
                  >
                    <Plus size={14} /> Nuevo archivo
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(f => (
                  <FileCard
                    key={f.id}
                    file={f}
                    onEdit={() => { setEditingFile(f); setShowModal(true); }}
                    onDelete={() => handleDelete(f.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <FileModal
            fileToEdit={editingFile}
            onClose={() => { setShowModal(false); setEditingFile(null); }}
            onSaved={() => {
              setSuccessMsg(editingFile ? 'Archivo actualizado correctamente.' : 'Archivo guardado correctamente.');
              setTimeout(() => setSuccessMsg(null), 3000);
              load();
            }}
          />
        )}
      </div>
    </DesktopOnlyGuard>
  );
}
