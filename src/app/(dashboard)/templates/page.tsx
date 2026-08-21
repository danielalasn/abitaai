'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutTemplate, Plus, RefreshCw, Search, X, CheckCircle2, Clock,
  XCircle, AlertTriangle, Loader2, ChevronDown, Trash2, Eye,
  MessageSquare, FileText, Image, Video, Film, Link2, Phone, Copy, Zap,
  Globe, Info, Filter, PauseCircle, UploadCloud, Sparkles
} from 'lucide-react';
import { uploadFileAction } from '@/app/actions/storage';
import {
  fetchAllTemplates,
  createMetaTemplate,
  deleteMetaTemplate,
  type MetaTemplate,
  type TemplateStatus,
  type MetaTemplateButton,
  type CreateTemplateInput,
} from '@/app/actions/templates';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const STATUS_CONFIG: Record<TemplateStatus | string, { label: string; color: string; bg: string; icon: any }> = {
  APPROVED:  { label: 'Aprobada',    color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  PENDING:   { label: 'En revisión', color: 'text-amber-600',   bg: 'bg-amber-500/10',   icon: Clock },
  REJECTED:  { label: 'Rechazada',   color: 'text-red-500',     bg: 'bg-red-500/10',     icon: XCircle },
  IN_APPEAL: { label: 'En apelación',color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: AlertTriangle },
  PAUSED:    { label: 'Pausada',     color: 'text-zinc-500',    bg: 'bg-zinc-500/10',    icon: PauseCircle },
  DISABLED:  { label: 'Desactivada', color: 'text-zinc-400',    bg: 'bg-zinc-400/10',    icon: PauseCircle },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MARKETING:      { label: 'Marketing',      color: 'text-amber-600',   bg: 'bg-amber-500/10' },
  UTILITY:        { label: 'Utilidad',       color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  AUTHENTICATION: { label: 'Autenticación',  color: 'text-violet-600',  bg: 'bg-violet-500/10' },
};

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'es_MX', label: 'Español (México)' },
  { code: 'es_AR', label: 'Español (Argentina)' },
  { code: 'es_ES', label: 'Español (España)' },
  { code: 'en', label: 'English' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'pt_BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
];

type FilterStatus = 'ALL' | TemplateStatus;

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.MARKETING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TemplatePreview({ template }: { template: MetaTemplate }) {
  const header = template.components.find(c => c.type === 'HEADER');
  const body   = template.components.find(c => c.type === 'BODY');
  const footer = template.components.find(c => c.type === 'FOOTER');
  const buttons = template.components.find(c => c.type === 'BUTTONS');

  return (
    <div className="bg-[#e5ddd5] dark:bg-[#0d1117] rounded-2xl p-3 w-full max-w-xs mx-auto shadow-inner">
      <div className="bg-white dark:bg-[#1e2328] rounded-xl overflow-hidden shadow-sm">
        {header && (
          <div className="bg-zinc-100 dark:bg-zinc-800/60 px-3 pt-3 pb-2">
            {header.format === 'TEXT' && (
              <p className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0]">{header.text}</p>
            )}
            {header.format === 'IMAGE' && (
              <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-400">
                <Image size={20} />
                <span className="text-[10px] font-bold uppercase">Imagen</span>
              </div>
            )}
            {header.format === 'VIDEO' && (
              <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-400">
                <Film size={20} />
                <span className="text-[10px] font-bold uppercase">Video</span>
              </div>
            )}
            {header.format === 'DOCUMENT' && (
              <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-400">
                <FileText size={16} />
                <span className="text-[10px] font-bold uppercase">Documento</span>
              </div>
            )}
            {(header.format as string) === 'LOCATION' && (
              <div className="h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center gap-2 text-blue-500">
                <Globe size={18} />
                <span className="text-[10px] font-bold uppercase">Ubicación</span>
              </div>
            )}
          </div>
        )}
        <div className="px-3 py-2 space-y-1">
          {body?.text && (
            <p className="text-[11px] text-[#111111] dark:text-[#EDE9E0] leading-relaxed whitespace-pre-wrap">{body.text}</p>
          )}
          {footer?.text && (
            <p className="text-[9px] text-[#6F6F6F] mt-1">{footer.text}</p>
          )}
        </div>
        {buttons && buttons.buttons && buttons.buttons.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-700 px-2 pb-2 pt-1 space-y-1">
            {buttons.buttons.map((btn, i) => (
              <div key={i} className="flex items-center justify-center gap-1.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                {btn.type === 'URL' && <Link2 size={10} className="text-blue-500" />}
                {btn.type === 'PHONE_NUMBER' && <Phone size={10} className="text-blue-500" />}
                {btn.type === 'QUICK_REPLY' && <MessageSquare size={10} className="text-blue-500" />}
                {btn.type === 'COPY_CODE' && <Copy size={10} className="text-blue-500" />}
                <span className="text-[10px] font-bold text-blue-600">{btn.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, onDelete, onPreview }: { template: MetaTemplate; onDelete: () => void; onPreview: () => void }) {
  const body = template.components.find(c => c.type === 'BODY');
  const header = template.components.find(c => c.type === 'HEADER');
  const hasButtons = template.components.some(c => c.type === 'BUTTONS');

  return (
    <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-[#F36A2D]/30 transition-all group h-full">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate">{template.name}</p>
          <p className="text-[10px] text-[#6F6F6F] mt-0.5">{template.language}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CategoryBadge category={template.category} />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <StatusBadge status={template.status} />
        {template.status === 'REJECTED' && template.rejected_reason && template.rejected_reason.trim().toLowerCase() !== 'none' && (
          <span className="text-[9px] text-red-400 italic max-w-[60%] truncate" title={template.rejected_reason}>
            {template.rejected_reason}
          </span>
        )}
      </div>

      {/* Header type pill */}
      {header && (
        <div className="flex items-center gap-1">
          {header.format === 'IMAGE' && <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md"><Image size={9} /> Imagen</div>}
          {header.format === 'VIDEO' && <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md"><Video size={9} /> Video</div>}
          {header.format === 'DOCUMENT' && <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md"><FileText size={9} /> Doc</div>}
          {header.format === 'TEXT' && <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md"><FileText size={9} /> {header.text?.slice(0, 20)}</div>}
        </div>
      )}

      {/* Body preview */}
      <p className="text-[11px] text-[#6F6F6F] line-clamp-2 leading-relaxed h-9">
        {body?.text || ''}
      </p>

      {hasButtons && (
        <div className="text-[9px] font-bold text-blue-500 bg-blue-500/5 px-2 py-1 rounded-lg">+ Botones incluidos</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#DEDAD0]/40 dark:border-zinc-800/40 mt-auto">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#6F6F6F] hover:bg-[#F36A2D]/10 hover:text-[#F36A2D] transition-all"
        >
          <Eye size={12} /> Preview
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
          title="Eliminar plantilla"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Create Template Modal
// ──────────────────────────────────────────────
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

const BUTTON_TYPES: { value: ButtonType; label: string; icon: any }[] = [
  { value: 'QUICK_REPLY',   label: 'Respuesta Rápida', icon: MessageSquare },
  { value: 'URL',           label: 'URL',              icon: Link2 },
  { value: 'PHONE_NUMBER',  label: 'Teléfono',         icon: Phone },
];

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('es');
  const [headerFormat, setHeaderFormat] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerExampleUrl, setHeaderExampleUrl] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<Array<{ type: ButtonType; text: string; url?: string; phone?: string; urlExample?: string }>>([]);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLInputElement>(null);

  const handleHeaderFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingHeader(true);
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadFileAction(formData);
      if (result.success && result.url) {
        setHeaderExampleUrl(result.url);
      } else {
        alert(result.error || 'Error al subir el archivo');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const insertVariable = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const varNum = (body.match(/\{\{\d+\}\}/g)?.length ?? 0) + 1;
    const newVal = body.slice(0, start) + `{{${varNum}}}` + body.slice(end);
    setBody(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 5, start + 5); }, 0);
  };

  const insertHeaderVariable = () => {
    const inp = headerRef.current;
    if (!inp) return;
    if (headerText.includes('{{1}}')) return; // Meta solo permite 1 variable en header
    const start = inp.selectionStart || headerText.length;
    const end = inp.selectionEnd || headerText.length;
    const newVal = headerText.slice(0, start) + '{{1}}' + headerText.slice(end);
    setHeaderText(newVal);
    setTimeout(() => { inp.focus(); inp.setSelectionRange(start + 5, start + 5); }, 0);
  };

  const addButton = () => {
    if (buttons.length >= 10) return;
    setButtons(prev => [...prev, { type: 'QUICK_REPLY', text: '' }]);
  };

  const removeButton = (i: number) => {
    setButtons(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !body.trim()) {
      setError('El nombre y el cuerpo son obligatorios.');
      return;
    }

    // Validaciones de botones
    if (buttons.length > 0) {
      const quickReplies = buttons.filter(b => b.type === 'QUICK_REPLY');
      const ctaButtons   = buttons.filter(b => b.type === 'URL' || b.type === 'PHONE_NUMBER');

      // Meta no permite mezclar Quick Reply con URL/Phone en la misma plantilla
      if (quickReplies.length > 0 && ctaButtons.length > 0) {
        setError('Meta no permite mezclar botones de "Respuesta Rápida" con botones de "URL" o "Teléfono" en la misma plantilla. Usa solo un tipo.');
        return;
      }

      // Límites de Meta
      if (quickReplies.length > 10) {
        setError('Meta permite máximo 10 botones de Respuesta Rápida.');
        return;
      }
      if (ctaButtons.length > 2) {
        setError('Meta permite máximo 2 botones de acción (URL + Teléfono).');
        return;
      }
      const urlBtns = buttons.filter(b => b.type === 'URL');
      const phoneBtns = buttons.filter(b => b.type === 'PHONE_NUMBER');
      if (urlBtns.length > 2) {
        setError('Meta permite máximo 2 botones de URL.');
        return;
      }
      if (phoneBtns.length > 1) {
        setError('Meta permite máximo 1 botón de Teléfono.');
        return;
      }

      for (const btn of buttons) {
        if (!btn.text.trim()) {
          setError('Todos los botones deben tener un texto.');
          return;
        }
        if (btn.type === 'URL' && !btn.url?.trim()) {
          setError(`El botón "${btn.text || 'URL'}" necesita una URL.`);
          return;
        }
        if (btn.type === 'URL' && btn.url?.includes('{{') && !btn.urlExample?.trim()) {
          setError(`El ejemplo de URL es obligatorio para el botón "${btn.text || 'URL'}" porque contiene variables.`);
          return;
        }
        if (btn.type === 'PHONE_NUMBER') {
          if (!btn.phone?.trim()) {
            setError(`El botón "${btn.text || 'Teléfono'}" necesita un número de teléfono.`);
            return;
          }
          if (!btn.phone.startsWith('+')) {
            setError(`El número de teléfono del botón "${btn.text}" debe incluir el código de país (ej. +50288887777).`);
            return;
          }
        }
      }
    }

    setError(null);
    setIsSubmitting(true);

    const input: CreateTemplateInput = {
      name,
      category,
      language,
      body,
      footer: footer || undefined,
      header: headerFormat !== 'NONE' ? {
        format: headerFormat as any,
        text: headerFormat === 'TEXT' ? headerText : undefined,
        exampleUrl: (headerFormat === 'IMAGE' || headerFormat === 'VIDEO' || headerFormat === 'DOCUMENT') ? (headerExampleUrl || undefined) : undefined,
      } : undefined,
      buttons: buttons.length > 0 ? buttons.map(b => {
        const hasVariable = b.url?.includes('{{');
        return {
          type: b.type,
          text: b.text,
          url: b.type === 'URL' ? b.url : undefined,
          phone_number: b.type === 'PHONE_NUMBER' ? b.phone : undefined,
          example: (b.type === 'URL' && hasVariable && b.urlExample) ? [b.urlExample] : undefined,
        };
      }) : undefined,
    };

    const result = await createMetaTemplate(input);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error desconocido');
      return;
    }

    onCreated();
    onClose();
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-[#111111] w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl relative overflow-hidden border border-[#DEDAD0] dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col">

        {/* Modal header */}
        <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Nueva Plantilla</h2>
            <p className="text-xs text-[#6F6F6F] mt-0.5">Se enviará a Meta para aprobación</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${step === 1 ? 'bg-[#F36A2D] text-white' : 'bg-emerald-500 text-white'}`}>
                {step > 1 ? <CheckCircle2 size={12} /> : '1'}
              </div>
              <div className="h-px w-4 bg-zinc-300 dark:bg-zinc-700" />
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${step === 2 ? 'bg-[#F36A2D] text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                2
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors">
              <X size={16} className="text-[#6F6F6F]" />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {step === 1 && (
            <>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Nombre de la plantilla</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ej. bienvenida_nuevo_cliente"
                  className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#6F6F6F]/40 outline-none focus:border-[#F36A2D] transition-colors font-mono"
                />
                <p className="text-[9px] text-[#6F6F6F]">Solo minúsculas, números y guiones bajos. Sin espacios.</p>
              </div>

              {/* Category + Language */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-[#1A1714] text-sm text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utilidad</option>
                    <option value="AUTHENTICATION">Autenticación</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Idioma</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-[#1A1714] text-sm text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors"
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Header */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Encabezado (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'] as const).map(fmt => {
                    const icons: Record<string, any> = { NONE: X, TEXT: FileText, IMAGE: Image, VIDEO: Film, DOCUMENT: FileText, LOCATION: Globe };
                    const Icon = icons[fmt];
                    const labels: Record<string, string> = { NONE: 'Sin encabezado', TEXT: 'Texto', IMAGE: 'Imagen', VIDEO: 'Video', DOCUMENT: 'Documento', LOCATION: 'Ubicación' };
                    return (
                      <button
                        key={fmt}
                        onClick={() => { setHeaderFormat(fmt); setHeaderExampleUrl(''); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${headerFormat === fmt ? 'border-[#F36A2D] bg-[#F36A2D]/10 text-[#F36A2D]' : 'border-[#DEDAD0] dark:border-zinc-800 text-[#6F6F6F] hover:border-[#F36A2D]/50'}`}
                      >
                        <Icon size={10} /> {labels[fmt]}
                      </button>
                    );
                  })}
                </div>
                {headerFormat === 'TEXT' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Texto del encabezado</label>
                      <button
                        onClick={insertHeaderVariable}
                        disabled={headerText.includes('{{1}}')}
                        className="flex items-center gap-1 text-[9px] font-black text-[#F36A2D] hover:opacity-70 transition-opacity uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Zap size={10} /> + Variable
                      </button>
                    </div>
                    <input
                      ref={headerRef}
                      type="text"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      placeholder="Texto del encabezado..."
                      maxLength={60}
                      className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors"
                    />
                  </div>
                )}
                {(headerFormat === 'IMAGE' || headerFormat === 'VIDEO' || headerFormat === 'DOCUMENT') && (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-600 flex items-start gap-2">
                      <Info size={12} className="mt-0.5 shrink-0" />
                      El archivo real se envía en la campaña. Meta requiere una <strong>imagen/video/documento de ejemplo</strong> para aprobación.
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#6F6F6F]">
                        Subir Ejemplo {headerFormat === 'IMAGE' ? '(imagen)' : headerFormat === 'VIDEO' ? '(video mp4)' : '(PDF)'} <span className="text-[#F36A2D]">*</span>
                      </label>
                      
                      {headerExampleUrl ? (
                         <div className="relative rounded-2xl overflow-hidden border-2 border-[#F36A2D] shadow-xl group aspect-video">
                            {headerFormat === 'VIDEO' ? (
                                <video src={headerExampleUrl} className="w-full h-full object-cover" />
                            ) : headerFormat === 'DOCUMENT' ? (
                                <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                  <FileText size={40} className="text-zinc-400" />
                                </div>
                            ) : (
                                <img src={headerExampleUrl} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-[#F36A2D]/10 flex items-center justify-center">
                               <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-2xl border border-[#F36A2D] flex items-center gap-2">
                                  <CheckCircle2 size={16} className="text-[#F36A2D]" />
                                  <span className="text-[10px] font-black text-[#F36A2D] uppercase tracking-widest">Ejemplo Subido</span>
                               </div>
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <button 
                                  onClick={() => setHeaderExampleUrl('')}
                                  className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                               >
                                  <X size={20} />
                               </button>
                            </div>
                         </div>
                      ) : (
                         <label className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                            isUploadingHeader ? 'bg-zinc-50 border-zinc-200' : 'border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-[#F36A2D] hover:bg-[#F36A2D]/5'
                         }`}>
                            {isUploadingHeader ? (
                               <>
                                  <Loader2 size={24} className="animate-spin text-[#F36A2D] mb-2" />
                                  <span className="text-xs font-bold text-[#F36A2D] animate-pulse">Subiendo...</span>
                               </>
                            ) : (
                               <>
                                  <div className="h-10 w-10 bg-[#F36A2D]/10 text-[#F36A2D] rounded-full flex items-center justify-center mb-2">
                                     <UploadCloud size={20} />
                                  </div>
                                  <span className="text-[10px] font-black text-[#111111] dark:text-[#EDE9E0] tracking-widest uppercase">Subir {headerFormat === 'IMAGE' ? 'Imagen' : headerFormat === 'VIDEO' ? 'Video' : 'Documento'} de Ejemplo</span>
                                  <span className="text-[8px] text-zinc-400 font-bold mt-1">Obligatorio para la revisión de Meta</span>
                               </>
                            )}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept={headerFormat === 'VIDEO' ? 'video/mp4' : headerFormat === 'DOCUMENT' ? 'application/pdf' : 'image/*'} 
                              onChange={handleHeaderFileUpload} 
                              disabled={isUploadingHeader} 
                            />
                         </label>
                      )}
                    </div>
                  </div>
                )}
                {headerFormat === 'LOCATION' && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] text-blue-600 flex items-start gap-2">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    El header de ubicación se enviará con coordenadas al usar la plantilla en una campaña.
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Cuerpo del mensaje *</label>
                  <button
                    onClick={insertVariable}
                    className="flex items-center gap-1 text-[9px] font-black text-[#F36A2D] hover:opacity-70 transition-opacity uppercase tracking-widest"
                  >
                    <Zap size={10} /> + Variable
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Ej: Hola {{1}}, tienes una nueva oferta disponible para ti."
                  rows={4}
                  maxLength={1024}
                  className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#6F6F6F]/40 outline-none focus:border-[#F36A2D] transition-colors resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-[#6F6F6F]">Usa {'{{1}}'}, {'{{2}}'}, etc. para variables dinámicas.</p>
                  <span className="text-[9px] text-[#6F6F6F]">{body.length}/1024</span>
                </div>
              </div>

              {/* Footer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Pie de página (opcional)</label>
                <input
                  type="text"
                  value={footer}
                  onChange={e => setFooter(e.target.value)}
                  placeholder="Ej: Responde STOP para cancelar"
                  maxLength={60}
                  className="w-full p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#6F6F6F]/40 outline-none focus:border-[#F36A2D] transition-colors"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Botones (máx. 10)</label>
                  {buttons.length < 10 && (
                    <button
                      onClick={addButton}
                      className="flex items-center gap-1 text-[9px] font-black text-[#F36A2D] hover:opacity-70 transition-opacity uppercase tracking-widest"
                    >
                      <Plus size={10} /> Agregar
                    </button>
                  )}
                </div>

                {buttons.length === 0 && (
                  <div className="p-6 border-2 border-dashed border-[#DEDAD0] dark:border-zinc-800 rounded-xl text-center text-[#6F6F6F] text-xs">
                    Sin botones (opcional). Puedes agregar hasta 10.
                  </div>
                )}

                {buttons.length > 0 && (
                  <div className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] text-blue-500 flex items-start gap-2">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>Meta <strong>no permite mezclar</strong> Respuestas Rápidas con botones de URL o Teléfono. Usa solo un tipo por plantilla. Máx: 10 Quick Reply, o 2 CTA (URL/Teléfono).</span>
                  </div>
                )}


                <div className="space-y-3">
                  {buttons.map((btn, i) => (
                    <div key={i} className="p-4 bg-zinc-50 dark:bg-black/20 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#6F6F6F] uppercase">Botón {i + 1}</span>
                        <button onClick={() => removeButton(i)} className="p-1 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all">
                          <X size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-[#6F6F6F] uppercase tracking-widest block mb-1">Tipo</label>
                          <select
                            value={btn.type}
                            onChange={e => {
                              const copy = [...buttons];
                              copy[i] = { ...copy[i], type: e.target.value as ButtonType };
                              setButtons(copy);
                            }}
                            className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-[#1A1714] text-[11px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D]"
                          >
                            {BUTTON_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#6F6F6F] uppercase tracking-widest block mb-1">Texto del botón</label>
                          <input
                            type="text"
                            value={btn.text}
                            onChange={e => {
                              const copy = [...buttons];
                              copy[i] = { ...copy[i], text: e.target.value };
                              setButtons(copy);
                            }}
                            placeholder="Ej: Ver oferta"
                            maxLength={25}
                            className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-transparent text-[11px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D]"
                          />
                        </div>
                      </div>

                      {btn.type === 'URL' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] font-black text-[#6F6F6F] uppercase tracking-widest block mb-1">URL</label>
                            <input
                              type="url"
                              value={btn.url || ''}
                              onChange={e => {
                                const copy = [...buttons];
                                copy[i] = { ...copy[i], url: e.target.value };
                                setButtons(copy);
                              }}
                              placeholder="https://..."
                              className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-transparent text-[11px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D]"
                            />
                          </div>
                          {btn.url?.includes('{{') && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                              <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Ejemplo de URL con variable *</label>
                              <input
                                type="url"
                                value={btn.urlExample || ''}
                                onChange={e => {
                                  const copy = [...buttons];
                                  copy[i] = { ...copy[i], urlExample: e.target.value };
                                  setButtons(copy);
                                }}
                                placeholder="e.g. https://example.com/1234"
                                className="w-full p-2 rounded-lg border border-blue-500/30 bg-transparent text-[11px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-blue-500"
                              />
                              <p className="text-[8px] text-[#6F6F6F] mt-0.5">Meta requiere un ejemplo real de la URL con la variable reemplazada.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {btn.type === 'PHONE_NUMBER' && (
                        <div>
                          <label className="text-[9px] font-black text-[#6F6F6F] uppercase tracking-widest block mb-1">Número de teléfono</label>
                          <input
                            type="tel"
                            value={btn.phone || ''}
                            onChange={e => {
                              const copy = [...buttons];
                              copy[i] = { ...copy[i], phone: e.target.value };
                              setButtons(copy);
                            }}
                            placeholder="+50288887777"
                            className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-transparent text-[11px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6F6F6F]">Vista previa</label>
                <TemplatePreview template={{
                  id: 'preview',
                  name,
                  status: 'PENDING',
                  category,
                  language,
                  components: [
                    ...(headerFormat !== 'NONE' ? [{ type: 'HEADER' as const, format: headerFormat as any, text: headerText }] : []),
                    { type: 'BODY' as const, text: body },
                    ...(footer ? [{ type: 'FOOTER' as const, text: footer }] : []),
                    ...(buttons.length > 0 ? [{ type: 'BUTTONS' as const, buttons: buttons.map(b => ({ type: b.type, text: b.text, url: b.url, phone_number: b.phone })) as MetaTemplateButton[] }] : []),
                  ],
                }} />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="p-6 border-t border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-black/10">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="text-sm font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!name.trim() || !body.trim()) { setError('El nombre y el cuerpo son obligatorios.'); return; }
                  
                  const bodyTrimmed = body.trim();
                  const headerTrimmed = headerText.trim();
                  
                  if (bodyTrimmed.match(/^\{\{\d+\}\}/) || bodyTrimmed.match(/\{\{\d+\}\}$/)) {
                    setError('Meta no permite que el cuerpo del mensaje empiece o termine con una variable. Añade un punto o texto.');
                    return;
                  }
                  
                  if (headerFormat === 'TEXT' && (headerTrimmed.match(/^\{\{\d+\}\}/) || headerTrimmed.match(/\{\{\d+\}\}$/))) {
                    setError('Meta no permite que el encabezado empiece o termine con una variable. Añade un punto o texto.');
                    return;
                  }

                  setError(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-xl font-bold text-sm hover:opacity-80 transition-opacity"
              >
                Continuar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="text-sm font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">
                Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#F36A2D] text-white rounded-xl font-bold text-sm hover:bg-[#e0601a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                {isSubmitting ? 'Enviando a Meta...' : 'Enviar a revisión'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Preview Modal
// ──────────────────────────────────────────────
function PreviewModal({ template, onClose }: { template: MetaTemplate; onClose: () => void }) {
  const body = template.components.find(c => c.type === 'BODY');
  const footer = template.components.find(c => c.type === 'FOOTER');
  const header = template.components.find(c => c.type === 'HEADER');
  const buttons = template.components.find(c => c.type === 'BUTTONS');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-[#111111] w-full max-w-md max-h-[90vh] rounded-[2rem] shadow-2xl relative overflow-hidden border border-[#DEDAD0] dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] truncate max-w-[250px]" title={template.name}>{template.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={template.status} />
              <CategoryBadge category={template.category} />
              <span className="text-[10px] text-[#6F6F6F]">{template.language}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors">
            <X size={16} className="text-[#6F6F6F]" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <TemplatePreview template={template} />

          {template.status === 'REJECTED' && template.rejected_reason && template.rejected_reason.trim().toLowerCase() !== 'none' && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
              <span className="font-black block mb-1">Razón de rechazo:</span>
              {template.rejected_reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'ALL',       label: 'Todas' },
  { value: 'APPROVED',  label: 'Aprobadas' },
  { value: 'PENDING',   label: 'Revisión' },
  { value: 'REJECTED',  label: 'Rechazadas' },
  { value: 'PAUSED',    label: 'Pausadas' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MetaTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchAllTemplates();
    if (result.error) setError(result.error);
    else setTemplates(result.templates);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = templates.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const counts: Record<string, number> = templates.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDelete = async (template: MetaTemplate) => {
    if (!confirm(`¿Eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(template.id);
    const result = await deleteMetaTemplate(template.name);
    setDeletingId(null);
    if (result.success) {
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      setSuccessMsg('Plantilla eliminada correctamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      alert(result.error || 'Error al eliminar.');
    }
  };

  return (
    <DesktopOnlyGuard>
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <LayoutTemplate size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Templates</h1>
          <span className="text-[10px] font-black text-[#6F6F6F] bg-white/60 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {templates.length}
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
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center h-9 w-9 bg-[#F36A2D] text-white rounded-xl hover:bg-[#e0601a] transition-colors shadow-lg shadow-[#F36A2D]/20"
            title="Nueva plantilla"
          >
            <Plus size={16} />
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

      <div className="flex-1 overflow-auto p-8 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Aprobadas',    count: counts['APPROVED'] || 0,  color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'Revisión',     count: counts['PENDING'] || 0,   color: 'text-amber-600',   bg: 'bg-amber-500/10' },
              { label: 'Rechazadas',   count: counts['REJECTED'] || 0,  color: 'text-red-500',     bg: 'bg-red-500/10' },
              { label: 'Otras',        count: (counts['PAUSED'] || 0) + (counts['DISABLED'] || 0) + (counts['IN_APPEAL'] || 0), color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
            ].map(stat => (
              <div key={stat.label} className={`p-4 rounded-2xl ${stat.bg} flex flex-col justify-center gap-1 h-24`}>
                <span className={`text-2xl font-black leading-none ${stat.color}`}>{stat.count}</span>
                <span className="text-[9px] font-bold text-[#6F6F6F] uppercase tracking-wider truncate" title={stat.label}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
              <input
                type="text"
                placeholder="Buscar plantilla..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/60 dark:bg-white/5 text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors w-48 placeholder:text-[#6F6F6F]/60"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="pl-4 pr-9 py-2 text-sm rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/60 dark:bg-white/5 text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-[#F36A2D] transition-colors appearance-none cursor-pointer"
              >
                <option value="ALL">Todas las categorías</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidad</option>
                <option value="AUTHENTICATION">Autenticación</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6F6F6F]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 rounded-xl p-1 border border-[#DEDAD0] dark:border-zinc-800 overflow-x-auto max-w-full w-full sm:w-auto scrollbar-hide">
              {STATUS_FILTERS.map(f => {
                const count = f.value === 'ALL' ? templates.length : (counts[f.value] || 0);
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0 ${statusFilter === f.value ? 'bg-white dark:bg-[#111111]/60 text-[#111111] dark:text-[#EDE9E0] shadow-sm' : 'text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0]'}`}
                  >
                    {f.label} {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={36} className="animate-spin text-[#F36A2D]" />
              <p className="text-sm font-medium text-[#6F6F6F]">Cargando plantillas de Meta...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-500">Error al cargar plantillas</p>
                <p className="text-xs text-red-400 mt-0.5">{error}</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-[#DEDAD0] dark:border-zinc-800 rounded-3xl">
              <div className="h-16 w-16 bg-[#F36A2D]/10 rounded-2xl flex items-center justify-center">
                <LayoutTemplate size={32} className="text-[#F36A2D]/50" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#111111] dark:text-[#EDE9E0]">
                  {search || statusFilter !== 'ALL' ? 'Sin resultados' : 'No hay plantillas'}
                </p>
                <p className="text-sm text-[#6F6F6F] mt-1">
                  {search || statusFilter !== 'ALL' ? 'Prueba con otros filtros.' : 'Crea tu primera plantilla.'}
                </p>
              </div>
              {!search && statusFilter === 'ALL' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#F36A2D] text-white rounded-xl font-bold text-sm hover:bg-[#e0601a] transition-colors"
                >
                  <Plus size={14} /> Nueva plantilla
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(t => (
                <div key={t.id} className={`h-full transition-all ${deletingId === t.id ? 'opacity-40 pointer-events-none scale-95' : ''}`}>
                  <TemplateCard
                    template={t}
                    onDelete={() => handleDelete(t)}
                    onPreview={() => setPreviewTemplate(t)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setSuccessMsg('Plantilla enviada a Meta para revisión.');
            setTimeout(() => setSuccessMsg(null), 4000);
            load();
          }}
        />
      )}

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
    </DesktopOnlyGuard>
  );
}
