'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, MessageCircle, X, Send, RotateCcw, Loader2, ArrowLeftRight } from 'lucide-react';
import { getAbitaBotChat, sendAbitaBotMessage, resetAbitaBotChat } from '@/app/actions/abita-bot';
import { formatWhatsAppText } from '@/lib/utils';

export function AbitaBotBubble({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('left');

  useEffect(() => {
    const savedPos = localStorage.getItem('abita-bot-position');
    if (savedPos === 'left' || savedPos === 'right') {
      setPosition(savedPos);
    }
  }, []);

  const togglePosition = () => {
    const newPos = position === 'left' ? 'right' : 'left';
    setPosition(newPos);
    localStorage.setItem('abita-bot-position', newPos);
  };
  
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
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !isInitialLoading) {
      loadChat();
    }
  }, [isOpen]);

  const loadChat = async () => {
    setIsInitialLoading(true);
    try {
      const chat = await getAbitaBotChat();
      if (chat && chat.messages) {
        setMessages(chat.messages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');
    
    // Add optimistic message
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      await sendAbitaBotMessage(userText);
      // Reload chat to get the bot's response
      await loadChat();
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error al enviar mensaje. Por favor intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Borrar el historial de chat con Abita?")) return;
    setIsLoading(true);
    try {
      await resetAbitaBotChat();
      setMessages([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Sidebar Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-4 px-3 py-2 w-full rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left group relative overflow-hidden"
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="h-8 w-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
               <Bot size={18} />
            </div>
          </div>
          <div className={`flex flex-col justify-center text-left transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none w-0 h-0' : 'opacity-100 flex-1'}`}>
            <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate whitespace-nowrap">
              Soporte Abita
            </span>
          </div>
          {isCollapsed && (
            <div className="absolute left-16 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-zinc-800">
              Soporte Abita
            </div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 w-[360px] h-[550px] max-h-[85vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 transition-all ${
          position === 'left' 
            ? (isCollapsed ? 'left-[104px]' : 'left-[280px]')
            : 'right-6'
        }`}>
          {/* Header */}
          <div className="px-5 py-4 bg-orange-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Soporte Abita</h3>
                <p className="text-[10px] text-orange-200">Asistente Virtual</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={togglePosition} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title={position === 'left' ? "Mover a la derecha" : "Mover a la izquierda"}>
                <ArrowLeftRight size={14} />
              </button>
              <button onClick={handleReset} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="Reiniciar chat">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] dark:bg-zinc-900/50 flex flex-col gap-4">
            {isInitialLoading && messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-orange-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                <Bot size={40} className="text-orange-200 dark:text-orange-900/50 mb-3" />
                <p className="text-sm font-medium">¡Hola! ¿En qué te puedo ayudar hoy?</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">Hazme cualquier pregunta sobre el uso de la plataforma.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-orange-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 rounded-bl-sm'
                  }`}>
                    {msg.content ? (
                      <span dangerouslySetInnerHTML={{ __html: formatWhatsAppText(msg.content) }} />
                    ) : '...'}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              <Send size={18} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
