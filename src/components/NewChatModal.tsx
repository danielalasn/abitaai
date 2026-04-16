'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Phone, Sparkles, AlertTriangle, Bot, CheckCircle2 } from 'lucide-react';
import { fetchMetaTemplates } from '@/app/actions/campaigns';
import { startIndividualChatAction } from '@/app/actions/inbox';
import { uploadImageAction } from '@/app/actions/storage';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (chatId: string) => void;
}

type MetaTemplate = {
  name: string;
  language: string;
  components: any[];
};

export function NewChatModal({ isOpen, onClose, onSuccess }: NewChatModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [botActive, setBotActive] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setStep(1);
      setPhone('');
      setSelectedTemplate(null);
      setVariables({});
      setHeaderImageUrl('');
      setBotActive(true);
      setError(null);
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    const result = await fetchMetaTemplates();
    if (result.error) {
      setError(result.error);
    } else {
      setTemplates(result.templates as MetaTemplate[]);
    }
    setIsLoadingTemplates(false);
  };

  const extractVars = (template: MetaTemplate): string[] => {
    const body = template.components.find((c: any) => c.type === 'BODY');
    if (!body?.text) return [];
    const matches = (body.text as string).match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
  };

  const handleSelectTemplate = (t: MetaTemplate) => {
    setSelectedTemplate(t);
    const vars = extractVars(t);
    const initial: Record<string, string> = {};
    vars.forEach((v: string) => { 
      initial[v] = ''; 
    });
    setVariables(initial);
    setHeaderImageUrl('');
    setStep(3);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadImageAction(formData);
    if (result.success && result.url) {
      setHeaderImageUrl(result.url);
    } else {
      setError(result.error || 'Error al subir la imagen');
    }
    setIsUploading(false);
  };

  const handleSend = async () => {
    if (!phone || !selectedTemplate) return;
    
    setIsSending(true);
    setError(null);
    try {
      const bodyText = selectedTemplate.components.find((c: any) => c.type === 'BODY')?.text ?? '';
      const chatId = await startIndividualChatAction(
        phone,
        selectedTemplate.name,
        selectedTemplate.language,
        variables,
        bodyText,
        headerImageUrl,
        botActive
      );
      onSuccess(chatId);
      onClose();
    } catch (err: any) {
      setError(err.message);
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
                <button onClick={() => setStep(1)} className="text-xs text-emerald-600 font-bold hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors">
                  ← Volver
                </button>
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
                        <span className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0] group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{t.name}</span>
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

                    {extractVars(selectedTemplate).length === 0 && (
                      <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-[#DEDAD0] dark:border-zinc-800">
                        <Sparkles size={24} className="mx-auto text-zinc-300 mb-2" />
                        <p className="text-xs text-[#6F6F6F] font-medium">Esta plantilla no tiene variables de texto.</p>
                      </div>
                    )}
                 </div>

                {/* Header Image Upload if needed */}
                {selectedTemplate.components.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                   <div className="space-y-4 pt-6 border-t border-[#DEDAD0] dark:border-zinc-800">
                    <label className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                       Imagen Requerida <Sparkles size={12} className="text-emerald-500" />
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      {headerImageUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl group animate-in zoom-in-95 duration-300">
                           <img src={headerImageUrl} alt="Preview" className="w-full h-40 object-cover" />
                           <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                              <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-2xl border border-emerald-500 flex items-center gap-2 scale-110">
                                 <CheckCircle2 size={16} className="text-emerald-500" />
                                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">¡Subida Exitosa!</span>
                              </div>
                           </div>
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={(e) => { e.preventDefault(); setHeaderImageUrl(''); }}
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
                                <span className="text-xs font-bold text-emerald-600 animate-pulse">Subiendo imagen...</span>
                              </>
                          ) : (
                              <>
                                <Sparkles size={24} className="text-emerald-500/50 mb-2" />
                                <span className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0]">Seleccionar o Arrastrar Imagen</span>
                                <span className="text-[10px] text-[#6F6F6F] mt-1">PNG, JPG hasta 5MB</span>
                              </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                        </label>
                      )}
                      
                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 h-[1px] bg-[#DEDAD0] dark:border-zinc-800" />
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">o usa una URL</span>
                        <div className="flex-1 h-[1px] bg-[#DEDAD0] dark:border-zinc-800" />
                      </div>

                      <input
                        type="text"
                        value={headerImageUrl}
                        onChange={e => setHeaderImageUrl(e.target.value)}
                        placeholder="Pegar URL de la imagen..."
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
