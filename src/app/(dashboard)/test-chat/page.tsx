'use client';

import { useState, useRef, useEffect } from 'react';
import { sendSimulatorMessage, getSimulatorChat, resetSimulatorChat } from '@/app/actions/chat';
import { getProjectConfig } from '@/app/actions/settings';
import { Send, Bot, User, Sparkles, ChevronDown, RotateCcw, Flame, Loader2, FileText, ExternalLink } from 'lucide-react';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import nextDynamic from 'next/dynamic';
import { Paperclip, Smile, XIcon } from 'lucide-react';
import { uploadFileAction } from "@/app/actions/storage";

const EmojiPicker = nextDynamic(() => import('emoji-picker-react'), { ssr: false });

export default function TestChatPage() {
  const [messages, setMessages] = useState<{
    role: string, 
    content: string, 
    agentName?: string | null,
    scoreBump?: number | null,
    scoreReason?: string | null,
    mediaUrl?: string | null,
    mediaType?: string | null,
    imageUrl?: string | null,
    mediaFilename?: string | null
  }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // States for media & emoji
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [score, setScore] = useState(0);
  const [heat, setHeat] = useState("FRIO");
  const [isResetting, setIsResetting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);

  const scrollToBottom = (force = false) => {
    if (force || messages.length > lastMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      lastMessageCount.current = messages.length;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await getProjectConfig();
        setAgents(config.agents);
        setProjectId(config.projectId);
        
        // Cargar chat persistente
        const chatData = await getSimulatorChat(config.projectId);
        setMessages(chatData.messages);
        setScore(chatData.score);
        setHeat(chatData.heat);
      } catch (e) {
        console.error("Error loading chat data:", e);
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
  }, []);

  const pendingMessages = useRef<string[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es muy grande. Máximo 10MB.');
        return;
      }
      setPendingFile(file);
      if (file.type.startsWith('image/')) {
        setPendingFilePreview(URL.createObjectURL(file));
      } else {
        setPendingFilePreview(null);
      }
    }
  };

  const handleSend = async () => {
    const hasText = input.trim().length > 0;
    if (!hasText && !pendingFile) return;
    if (!projectId) return;
    
    const userMessage = input.trim();
    setInput('');
    
    if (pendingFile) {
      setIsUploadingMedia(true);
      let fileUrl = null;
      let fileType = null;
      let fileName = null;
      try {
        const formData = new FormData();
        formData.append('file', pendingFile);
        const uploadResult = await uploadFileAction(formData);
        if (!uploadResult.success || !uploadResult.url) {
          alert('Error al subir el archivo: ' + (uploadResult as any).error);
          setIsUploadingMedia(false);
          return;
        }
        fileUrl = uploadResult.url;
        fileType = (uploadResult as any).mediaType || (pendingFile.type.startsWith('image/') ? 'image' : 'document');
        fileName = (uploadResult as any).filename || pendingFile.name;
      } catch (e) {
        console.error(e);
        alert('Error al subir');
        setIsUploadingMedia(false);
        return;
      } finally {
        setIsUploadingMedia(false);
      }

      const finalMsg = userMessage || '[Archivo]';
      setMessages(prev => [...prev, { role: 'user', content: finalMsg, mediaUrl: fileUrl, mediaType: fileType, mediaFilename: fileName, imageUrl: fileType === 'image' ? fileUrl : null }]);
      
      setPendingFile(null);
      setPendingFilePreview(null);
      setIsLoading(true);

      try {
        const result = await sendSimulatorMessage(finalMsg, projectId, selectedAgentId || undefined, fileUrl, fileName, fileType);
        const chatData = await getSimulatorChat(projectId);
        setMessages(chatData.messages);
        setScore(chatData.score);
        setHeat(chatData.heat);
      } catch (e) {
         console.error(e);
         setMessages(prev => [...prev, { role: 'assistant', content: 'Error procesando archivo.' }]);
      } finally {
         setIsLoading(false);
      }
      return;
    }

    // 1. Agregar a la cola y mostrar en UI de inmediato
    pendingMessages.current.push(userMessage);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // 2. Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 3. Crear nuevo timer de 3 segundos
    debounceTimer.current = setTimeout(async () => {
      if (pendingMessages.current.length === 0) return;
      
      const combinedText = pendingMessages.current.join('\n');
      pendingMessages.current = []; // Vaciar la cola
      
      setIsLoading(true);
      try {
        const result = await sendSimulatorMessage(
          combinedText,
          projectId,
          selectedAgentId || undefined
        );
        
        // Recargar el chat para sincronizar con BD
        const chatData = await getSimulatorChat(projectId);
        setMessages(chatData.messages);
        setScore(chatData.score);
        setHeat(chatData.heat);

        if (result.debugPrompt) {
          console.log("%c🚀 [AI DEBUG PROMPT]", "color: #F36A2D; font-size: 14px; font-weight: bold;");
          console.log(result.debugPrompt);
          console.log("%c-----------------------", "color: #F36A2D;");
        }
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error procesando tu mensaje.' }]);
      } finally {
        setIsLoading(false);
      }
    }, 6000);
  };

  const handleReset = async () => {
    if (!projectId || !confirm("¿Quieres borrar el historial de este chat de prueba?")) return;
    setIsResetting(true);
    try {
      await resetSimulatorChat(projectId);
      setMessages([]);
      setScore(0);
      setHeat("FRIO");
    } catch (e) {
      console.error("Error resetting chat:", e);
    } finally {
      setIsResetting(false);
    }
  };

  const selectedAgentName = agents.find(a => a.id === selectedAgentId)?.name || 'Enrutamiento Automático';

  if (isInitialLoading) return (
    <div className="flex-1 flex items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714]">
      <Loader2 className="animate-spin text-[#F36A2D]" size={32} />
    </div>
  );

  return (
    <DesktopOnlyGuard>
    <div className="flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* Header con Selector de Agente y Score */}
      <header className="px-8 py-5 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-[#EDE9E0] flex items-center gap-2">
              Simulador Multi-Agente
              <Sparkles size={20} className="text-[#F36A2D]" />
            </h1>
            <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
              Prueba cómo interactúan tus especialistas en un entorno real persistente.
            </p>
          </div>

          <div className="h-10 w-[1px] bg-[#DEDAD0] dark:bg-zinc-800 hidden md:block" />

          {/* Lead Score Badge */}
          <div className="flex items-center gap-3">
             <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 transition-all shadow-sm border ${
               heat === 'CALIENTE' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' :
               heat === 'TIBIO' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
               'bg-blue-500/10 border-blue-500/30 text-blue-600'
             }`}>
                <Flame size={18} className={heat === 'CALIENTE' ? 'animate-pulse' : ''} />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Cualificación</span>
                  <span className="text-sm font-black">{score} / 100 ({heat})</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <select
                value={selectedAgentId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAgentId(val === "" ? null : val);
                }}
                className="appearance-none bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-zinc-900 dark:text-[#EDE9E0] focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="">🤖 Enrutamiento Dinámico</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>👤 {agent.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RotateCcw size={16} />
            )}
            <span className="hidden lg:inline">{isResetting ? 'Reiniciando...' : 'Reiniciar'}</span>
          </button>
        </div>
      </header>
      
      {/* Área de Chat */}
      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-6 flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center animate-in fade-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-white/50 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <Bot size={40} className="text-[#F36A2D]/50" />
             </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#EDE9E0]">Simulador listo</h3>
            <p className="max-w-xs mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {selectedAgentId 
                ? `Estás hablando directamente con "${selectedAgentName}".`
                : "Escribe cualquier cosa. El sistema decidirá qué agente debe responderte."}
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border border-[#DEDAD0] dark:border-zinc-800 text-[#F36A2D]">
                  <Bot size={22} />
                </div>
              </div>
            )}
            
            <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              {msg.agentName && (
                <span className="text-[10px] font-bold text-[#F36A2D] uppercase tracking-widest pl-1 mb-0.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#F36A2D] rounded-full" /> {msg.agentName}
                </span>
              )}

              {msg.scoreBump && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-800/20 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-xl mb-1 self-start animate-in fade-in slide-in-from-left-2 duration-300 shadow-sm">
                  <div className="px-2 py-0.5 bg-emerald-500 rounded-full text-[11px] text-white font-black whitespace-nowrap">
                    +{msg.scoreBump}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {msg.scoreReason || 'Calificación de interés'}
                  </span>
                </div>
              )}

              <div className={`px-5 py-3.5 rounded-2xl shadow-sm border space-y-2 ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 dark:bg-[#EDE9E0] text-white dark:text-zinc-900 border-zinc-800 dark:border-[#EDE9E0] rounded-tr-sm' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-[#DEDAD0] dark:border-zinc-800 rounded-tl-sm'
              }`}>
                {(msg.mediaUrl || msg.imageUrl) && (
                  <div className="mb-2">
                    {msg.mediaType === 'image' || msg.imageUrl || msg.mediaUrl?.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i) ? (
                      <img src={msg.mediaUrl || msg.imageUrl || ''} alt="Adjunto" className="rounded-xl max-h-64 object-cover border border-zinc-200 dark:border-zinc-700" />
                    ) : (
                      <a href={msg.mediaUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold text-[#F36A2D]">
                        <FileText size={18} />
                        <span className="truncate max-w-[180px]">{msg.mediaFilename || 'Documento adjunto'}</span>
                        <ExternalLink size={14} className="ml-auto" />
                      </a>
                    )}
                  </div>
                )}
                {msg.content && msg.content !== '[Archivo]' && msg.content !== '[Archivo enviado por IA]' && msg.content !== msg.mediaFilename && !(msg.role === 'assistant' && msg.mediaUrl) && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-xl bg-[#F36A2D] text-white flex items-center justify-center shadow-md grow-0 shrink-0 self-end">
                <User size={22} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border border-[#DEDAD0] dark:border-zinc-800">
              <Loader2 className="animate-spin text-[#F36A2D]" size={20} />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-500 border border-[#DEDAD0] dark:border-zinc-800 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#F36A2D] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-[#F36A2D] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-[#F36A2D] rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Chat */}
      <div className="p-6 bg-transparent border-t border-[#DEDAD0] dark:border-zinc-800/60 transition-all flex flex-col gap-2">
        {pendingFile && (
          <div className="max-w-4xl mx-auto w-full mb-2 flex items-center gap-2 p-2 bg-white/50 dark:bg-zinc-900/50 border border-[#DEDAD0] dark:border-zinc-700 rounded-xl">
            {pendingFilePreview ? (
              <img src={pendingFilePreview} alt="preview" className="h-10 w-10 object-cover rounded-lg shrink-0" />
            ) : (
              <div className="h-10 w-10 bg-[#F36A2D]/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={18} className="text-[#F36A2D]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#111111] dark:text-white truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-[#6F6F6F]">{(pendingFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={() => { setPendingFile(null); setPendingFilePreview(null); }}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[#6F6F6F]"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full flex items-end gap-3 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-sm focus-within:border-[#F36A2D]/50 focus-within:ring-4 focus-within:ring-[#F36A2D]/5 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf,video/*,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-3 bg-white dark:bg-zinc-800 border border-[#DEDAD0] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#F36A2D] hover:border-[#F36A2D] rounded-full transition-all mb-1"
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          
          <div className="relative mb-1" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`shrink-0 p-3 border rounded-full transition-all ${showEmojiPicker ? 'bg-[#F36A2D]/10 border-[#F36A2D] text-[#F36A2D]' : 'bg-white dark:bg-zinc-800 border-[#DEDAD0] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#F36A2D] hover:border-[#F36A2D]'}`}
              title="Insertar emoji"
            >
              <Smile size={18} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-4 z-[70] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setInput(prev => prev + emojiData.emoji);
                  }}
                  theme={'auto' as any}
                  lazyLoadEmojis={true}
                  searchPlaceholder="Buscar emoji..."
                />
              </div>
            )}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={selectedAgentId ? `Escribiendo a ${selectedAgentName}...` : "Envía un mensaje para enrutamiento automático..."}
            className="flex-1 max-h-48 min-h-12 bg-transparent resize-none outline-none py-3 px-3 text-zinc-900 dark:text-[#EDE9E0] text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingFile) || isUploadingMedia}
            className="h-12 w-12 mb-0.5 shrink-0 rounded-full bg-[#111111] dark:bg-[#EDE9E0] hover:scale-105 active:scale-95 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 flex items-center justify-center transition-all shadow-md group border border-transparent dark:border-zinc-800"
          >
            {isUploadingMedia ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={`transition-transform duration-300 ${(input.trim() || pendingFile) && !isLoading ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''}`} />}
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-4 flex items-center justify-center gap-2">
            AI PERSISTENT SIMULATOR <span className="w-1 h-1 bg-zinc-300 rounded-full" /> PERSISTENCE ENGINE ACTIVE
        </p>
      </div>
    </div>
    </DesktopOnlyGuard>
  );
}
