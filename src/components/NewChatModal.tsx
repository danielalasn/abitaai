'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Phone, Sparkles, AlertTriangle, Bot, CheckCircle2, User, UploadCloud, ChevronRight, Users, FileText } from 'lucide-react';
import { fetchMetaTemplates } from '@/app/actions/campaigns';
import { startIndividualChatAction } from '@/app/actions/inbox';
import { uploadImageAction } from '@/app/actions/storage';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (chatId: string) => void;
  initialPhone?: string;
  initialLeadName?: string;
}

type MetaTemplate = {
  name: string;
  language: string;
  components: any[];
  category: string;
};

export function NewChatModal({ isOpen, onClose, onSuccess, initialPhone, initialLeadName }: NewChatModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState(initialPhone || '');
  const [leadName, setLeadName] = useState(initialLeadName || '');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [buttonVars, setButtonVars] = useState<Record<string, string>>({});
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [headerMediaType, setHeaderMediaType] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT' | null>(null);
  const [templatePrefix, setTemplatePrefix] = useState<string | null>(null);
  const [botActive, setBotActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setPhone(initialPhone || '');
      setLeadName(initialLeadName || '');
      setStep(initialPhone ? 2 : 1);
      setSelectedTemplate(null);
      setVariables({});
      setButtonVars({});
      setHeaderMediaUrl('');
      setHeaderMediaType(null);
      setBotActive(false);
      setError(null);
    }
  }, [isOpen, initialPhone, initialLeadName]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    const result = await fetchMetaTemplates();
    if (result.error) {
      setError(result.error);
    } else {
      setTemplates(result.templates as MetaTemplate[]);
      setTemplatePrefix(result.prefix || null);
    }
    setIsLoadingTemplates(false);
  };

  const extractVars = (template: MetaTemplate): string[] => {
    const body = template.components.find((c: any) => c.type === 'BODY');
    if (!body?.text) return [];
    const matches = (body.text as string).match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
  };

  const extractButtonVarsLocal = (template: MetaTemplate): { buttonIndex: number; label: string }[] => {
    const buttonsComp = template.components.find((c: any) => c.type === 'BUTTONS');
    if (!buttonsComp || !buttonsComp.buttons) return [];
    const vars: { buttonIndex: number; label: string }[] = [];
    buttonsComp.buttons.forEach((btn: any, index: number) => {
      if (btn.type === 'URL' && btn.url && btn.url.includes('{{1}}')) {
        vars.push({ buttonIndex: index, label: btn.text || `Enlace ${index + 1}` });
      }
    });
    return vars;
  };

  const handleSelectTemplate = (t: MetaTemplate) => {
    setSelectedTemplate(t);
    const vars = extractVars(t);
    const initial: Record<string, string> = {};
    vars.forEach((v: string) => { initial[v] = ''; });
    setVariables(initial);
    // Init button vars
    const bVars = extractButtonVarsLocal(t);
    const initBvars: Record<string, string> = {};
    bVars.forEach(bv => { initBvars[`button_${bv.buttonIndex}`] = ''; });
    setButtonVars(initBvars);
    // Detect header media type
    const hComp = t.components.find((c: any) => c.type === 'HEADER') as any;
    if (hComp && (hComp.format === 'IMAGE' || hComp.format === 'VIDEO' || hComp.format === 'DOCUMENT')) {
      setHeaderMediaType(hComp.format as 'IMAGE' | 'VIDEO' | 'DOCUMENT');
    } else {
      setHeaderMediaType(null);
    }
    setHeaderMediaUrl('');
    setStep(3);
  };

  const MAX_MEDIA_SIZE_MB = 14;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño antes de subir
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_MEDIA_SIZE_MB) {
      setError(`El archivo "${file.name}" es demasiado grande (${sizeMB.toFixed(1)} MB). El límite es ${MAX_MEDIA_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadImageAction(formData);
    if (result.success && result.url) {
      setHeaderMediaUrl(result.url);
    } else {
      setError(result.error || 'Error al subir el archivo');
    }
    setIsUploading(false);
  };

  const handleSend = async () => {
    if (!phone || !selectedTemplate) return;
    
    if (headerMediaType && !headerMediaUrl?.trim()) {
      setError('Debes subir un archivo o ingresar una URL para el encabezado de la plantilla.');
      return;
    }
    
    setIsSending(true);
    setError(null);
    try {
      const bodyText = selectedTemplate.components.find((c: any) => c.type === 'BODY')?.text ?? '';
      // Merge body vars + button vars into a single variables map with button_ prefix
      const allVars = { ...variables, ...buttonVars };
      
      const hasEmptyVar = Object.values(allVars).some(val => !val.trim());
      if (hasEmptyVar) {
        setIsSending(false);
        setError('Por favor completa todos los campos de las variables requeridas por la plantilla.');
        return;
      }
      
      // Extract quick-reply buttons from template to store in the message
      const quickReplyButtons = selectedTemplate.components
        .find((c: any) => c.type === 'BUTTONS')?.buttons
        ?.filter((b: any) => b.type === 'QUICK_REPLY') || [];
      const buttonsConfigJson = quickReplyButtons.length > 0 ? JSON.stringify(quickReplyButtons) : undefined;

      const result = await startIndividualChatAction(
        phone,
        selectedTemplate.name,
        selectedTemplate.language,
        allVars,
        bodyText,
        selectedTemplate.category,
        headerMediaUrl,
        botActive,
        leadName,
        headerMediaType || undefined,
        buttonsConfigJson
      );

      if (result.success && result.chatId) {
        onSuccess(result.chatId);
        onClose();
      } else {
        setError(result.error || 'Error al iniciar el chat');
      }
    } catch (err: any) {
      console.error('[NewChatModal] Error:', err);
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#E9E4D8] dark:bg-[#1A1714] w-full max-w-lg rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
              <Phone size={18} />
            </div>
            <h2 className="text-lg font-semibold text-[#111111] dark:text-[#EDE9E0]">WhatsApp Directo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Step 1: Phone Number */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-[0.2em] ml-1">
                  1. Datos del Contacto
                </label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
                    <Phone size={20} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Número (ej: 5037600XXXX)"
                    className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl pl-14 pr-5 py-5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-base font-medium text-[#111111] dark:text-[#EDE9E0] placeholder:text-zinc-400"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    value={leadName}
                    onChange={e => setLeadName(e.target.value)}
                    placeholder="Nombre del contacto (Opcional)"
                    className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl pl-14 pr-5 py-4 outline-none focus:border-emerald-500 transition-all text-sm font-medium text-[#111111] dark:text-[#EDE9E0] placeholder:text-zinc-400"
                  />
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex gap-4">
                  <Sparkles size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/60 leading-relaxed font-medium">
                    Iniciaremos una conversación oficial mediante una plantilla aprobada. El número debe incluir el código de país.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between sticky top-0 bg-[#E9E4D8] dark:bg-[#1A1714] pb-2 z-10">
                {!initialPhone && (
                  <button onClick={() => setStep(1)} className="text-xs text-emerald-600 font-bold hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    ← Volver
                  </button>
                )}
                {initialPhone && <div></div>}
                <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-500 tracking-wider">
                  TEL: {phone}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-[0.2em] ml-1 flex items-center justify-between">
                  2. Selecciona Contenido
                  {isLoadingTemplates && <Loader2 size={12} className="animate-spin text-emerald-500" />}
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {templates.map(t => (
                    <button
                      key={t.name}
                      onClick={() => handleSelectTemplate(t)}
                      className="w-full text-left p-5 rounded-2xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:border-emerald-500 hover:bg-white dark:hover:bg-zinc-900 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-emerald-500 text-white p-1 rounded-full"><Send size={10} /></div>
                      </div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0] group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
                            {templatePrefix && t.name.startsWith(templatePrefix) 
                              ? t.name.replace(templatePrefix, '') 
                              : t.name}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${
                            t.category === 'MARKETING' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                          }`}>
                            {t.category}
                          </span>
                        </div>
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded tracking-widest uppercase">{t.language}</span>
                      </div>
                      <p className="text-xs text-[#6F6F6F] line-clamp-3 leading-relaxed opacity-80 group-hover:opacity-100">
                        {t.components.find((c: any) => c.type === 'BODY')?.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Variables, Image & Bot Toggle */}
          {step === 3 && selectedTemplate && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(2)} className="text-xs text-emerald-600 font-bold hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors">
                  ← Elegir otra
                </button>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-bold text-emerald-600 tracking-wider">
                  PARA: {phone}
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-[0.2em] ml-1">
                      3. Personaliza el Mensaje
                    </label>
                    
                    {extractVars(selectedTemplate).map(v => (
                      <div key={v} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">{`Variable ${v}`}</span>
                        </div>
                        <input
                          type="text"
                          value={variables[v] || ''}
                          onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`Escribe el valor para {{${v}}}`}
                          className="w-full bg-white dark:bg-[#111111] border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-5 py-3.5 outline-none focus:border-emerald-500 transition-all text-sm font-medium text-[#111111] dark:text-[#EDE9E0]"
                        />
                      </div>
                    ))}

                    {extractVars(selectedTemplate).length === 0 && extractButtonVarsLocal(selectedTemplate).length === 0 && !headerMediaType && (
                      <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-[#DEDAD0] dark:border-zinc-800">
                        <Sparkles size={24} className="mx-auto text-zinc-300 mb-2" />
                        <p className="text-xs text-[#6F6F6F] font-medium">Esta plantilla no tiene variables de texto.</p>
                      </div>
                    )}

                    {/* Button URL variables */}
                    {extractButtonVarsLocal(selectedTemplate).map(bv => (
                      <div key={`btn_${bv.buttonIndex}`} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">Botón: {bv.label}</span>
                        </div>
                        <input
                          type="text"
                          value={buttonVars[`button_${bv.buttonIndex}`] || ''}
                          onChange={e => setButtonVars(prev => ({ ...prev, [`button_${bv.buttonIndex}`]: e.target.value }))}
                          placeholder={`URL para botón "${bv.label}"...`}
                          className="w-full bg-white dark:bg-[#111111] border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-5 py-3.5 outline-none focus:border-blue-500 transition-all text-sm font-medium text-[#111111] dark:text-[#EDE9E0]"
                        />
                      </div>
                    ))}
                 </div>

                {/* Header Media — IMAGE, VIDEO, or DOCUMENT */}
                {headerMediaType && (
                   <div className="space-y-4 pt-6 border-t border-[#DEDAD0] dark:border-zinc-800">
                    <label className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                       {headerMediaType === 'IMAGE' ? 'Imagen Requerida' : headerMediaType === 'VIDEO' ? 'Video Requerido' : 'Documento Requerido'} <Sparkles size={12} className="text-emerald-500" />
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      {/* Media: allow file upload for all types (up to 20MB) */}
                      {headerMediaType && (
                        <>
                          {headerMediaUrl && headerMediaUrl.startsWith('http') ? (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl group animate-in zoom-in-95 duration-300">
                               {headerMediaType === 'VIDEO' ? (
                                  <video src={headerMediaUrl} className="w-full h-40 object-cover" />
                               ) : headerMediaType === 'DOCUMENT' ? (
                                  <div className="w-full h-40 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <FileText size={40} className="text-zinc-400" />
                                  </div>
                               ) : (
                                  <img src={headerMediaUrl} alt="Preview" className="w-full h-40 object-cover" />
                               )}
                               <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                                  <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-2xl border border-emerald-500 flex items-center gap-2 scale-110">
                                     <CheckCircle2 size={16} className="text-emerald-500" />
                                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">¡Subida Exitosa!</span>
                                  </div>
                               </div>
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={(e) => { e.preventDefault(); setHeaderMediaUrl(''); }}
                                    className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                                  >
                                    <X size={20} />
                                  </button>
                               </div>
                            </div>
                          ) : (
                            <label className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                              isUploading ? 'bg-zinc-50 border-zinc-200' : 'bg-white dark:bg-zinc-900/40 border-[#DEDAD0] dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/5'
                            }`}>
                              {isUploading ? (
                                  <>
                                    <Loader2 size={24} className="animate-spin text-emerald-500 mb-2" />
                                    <span className="text-xs font-bold text-emerald-600 animate-pulse">Subiendo...</span>
                                  </>
                              ) : (
                                  <>
                                    <Sparkles size={24} className="text-emerald-500/50 mb-2" />
                                    <span className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0]">Seleccionar o Arrastrar {headerMediaType === 'VIDEO' ? 'Video' : headerMediaType === 'DOCUMENT' ? 'Documento' : 'Imagen'}</span>
                                    <span className="text-[10px] text-[#6F6F6F] mt-1">Hasta {MAX_MEDIA_SIZE_MB}MB</span>
                                  </>
                              )}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept={headerMediaType === 'VIDEO' ? 'video/mp4' : headerMediaType === 'DOCUMENT' ? 'application/pdf' : 'image/*'} 
                                onChange={handleFileChange} 
                                disabled={isUploading} 
                              />
                            </label>
                          )}
                          
                          <div className="relative flex items-center gap-2">
                            <div className="flex-1 h-[1px] bg-[#DEDAD0] dark:border-zinc-800" />
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">o usa una URL</span>
                            <div className="flex-1 h-[1px] bg-[#DEDAD0] dark:border-zinc-800" />
                          </div>
                        </>
                      )}

                      <input
                        type="text"
                        value={headerMediaUrl}
                        onChange={e => setHeaderMediaUrl(e.target.value)}
                        placeholder={
                          headerMediaType === 'IMAGE' ? 'Pegar URL de la imagen...' :
                          headerMediaType === 'VIDEO' ? 'URL del video (mp4 público)...' :
                          'URL del documento (PDF público)...'
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-medium text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Bot Toggle */}
                <div className="pt-6 border-t border-[#DEDAD0] dark:border-zinc-800">
                  <div className="flex items-center justify-between p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-all ${botActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        <Bot size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0]">Inteligencia Artificial</span>
                        <span className={`text-[10px] font-medium ${botActive ? 'text-emerald-600' : 'text-[#6F6F6F]'}`}>
                          {botActive ? 'Responderá automáticamente' : 'Espera tu atención manual'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setBotActive(!botActive)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all outline-none ${botActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${botActive ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-xs flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#DEDAD0] dark:border-zinc-800 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md flex gap-4 shrink-0">
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!phone || phone.length < 8}
              className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                !phone || phone.length < 8
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                : 'bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] hover:translate-y-[-2px] hover:shadow-emerald-500/10'
              }`}
            >
              Continuar a Plantilla <Send size={18} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl bg-emerald-500 text-white hover:bg-emerald-600 hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
            >
              {isSending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Enviar WhatsApp
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
