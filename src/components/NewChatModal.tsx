'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Phone, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchMetaTemplates } from '@/app/actions/campaigns';
import { startIndividualChatAction } from '@/app/actions/inbox';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setStep(1);
      setPhone('');
      setSelectedTemplate(null);
      setVariables({});
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
    setStep(2);
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
        bodyText
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
            <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
              <Phone size={18} />
            </div>
            <h2 className="text-lg font-semibold text-[#111111] dark:text-[#EDE9E0]">Nuevo Chat Individual</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          {/* Step 1: Phone & Template Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                  Número de WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ej: 50376001234"
                  className="w-full bg-white/50 dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl px-4 py-3 outline-none focus:border-[#F36A2D] focus:ring-1 focus:ring-[#F36A2D]/40 transition-all text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                    Selecciona una Plantilla
                  </label>
                  {isLoadingTemplates && <Loader2 size={14} className="animate-spin text-[#F36A2D]" />}
                </div>

                {error && !templates.length && (
                   <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.name}
                      onClick={() => handleSelectTemplate(t)}
                      className="w-full text-left p-4 rounded-2xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:border-[#F36A2D]/50 hover:bg-white dark:hover:bg-zinc-900 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm text-[#111111] dark:text-[#EDE9E0] group-hover:text-[#F36A2D] transition-colors">{t.name}</span>
                        <span className="text-[8px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded tracking-tighter uppercase">{t.language}</span>
                      </div>
                      <p className="text-xs text-[#6F6F6F] line-clamp-2 italic">
                        {t.components.find((c: any) => c.type === 'BODY')?.text}
                      </p>
                    </button>
                  ))}
                  {!isLoadingTemplates && templates.length === 0 && !error && (
                    <div className="text-center py-8 text-[#6F6F6F] text-sm italic">
                      No se encontraron plantillas aprobadas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Variables Input */}
          {step === 2 && selectedTemplate && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="text-xs text-[#F36A2D] font-bold hover:underline">
                  ← Cambiar plantilla
                </button>
                <div className="text-[10px] font-bold text-zinc-400">PARA: {phone}</div>
              </div>

              <div className="bg-white/40 dark:bg-zinc-900/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-4">
                <p className="text-[9px] font-bold text-[#F36A2D] uppercase tracking-widest mb-2 opacity-70">Vista Previa Original</p>
                <p className="text-xs text-[#6F6F6F] leading-relaxed italic">
                  {selectedTemplate.components.find((c: any) => c.type === 'BODY')?.text}
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                  Valores de las Variables
                </label>
                
                {extractVars(selectedTemplate).map(v => (
                  <div key={v} className="flex items-center gap-3">
                    <div className="shrink-0 h-9 w-12 bg-[#F36A2D]/10 text-[#F36A2D] rounded-xl flex items-center justify-center text-xs font-bold">
                       {`{{${v}}}`}
                    </div>
                    <input
                      type="text"
                      value={variables[v] || ''}
                      onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`Valor para variable ${v}`}
                      className="flex-1 bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-[#F36A2D] text-sm"
                    />
                  </div>
                ))}

                {extractVars(selectedTemplate).length === 0 && (
                  <p className="text-sm text-[#6F6F6F] text-center py-4 italic">
                    Esta plantilla no requiere variables.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2 animate-in slide-in-from-top-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 bg-[#DEDAD0]/20 dark:bg-zinc-900/20 shrink-0">
          <button
            onClick={step === 1 ? () => {} : handleSend}
            disabled={step === 1 || isSending || !phone}
            className={`w-full h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              step === 1 || !phone 
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
              : 'bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={16} />
                Iniciar Chat y Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
