'use client';

import { useState, useRef, useEffect } from 'react';
import { sendTestMessage } from '@/app/actions/chat';
import { getProjectConfig } from '@/app/actions/settings';
import { Send, Bot, User, Sparkles, AlertCircle, ChevronDown, Check } from 'lucide-react';

export default function TestChatPage() {
  const [messages, setMessages] = useState<{role: string, content: string, agentName?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const config = await getProjectConfig();
        setAgents(config.agents);
        setProjectId(config.projectId);
      } catch (e) {
        console.error("Error loading agents:", e);
      }
    };
    loadAgents();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Pasamos el agentId. Si es null, el backend usará (o usaremos pronto) la lógica de enrutamiento.
      const botData = await sendTestMessage(
        userMessage, 
        messages.map(m => ({ role: m.role, content: m.content })), 
        undefined, 
        projectId || undefined, 
        selectedAgentId || undefined
      );

      const replyText = typeof botData === 'string' ? botData : botData.reply;
      const agentName = typeof botData !== 'string' ? (botData as any).agentName : undefined;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: replyText,
        agentName: agentName
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error procesando tu mensaje.' }]);
    }
    setIsLoading(false);
  };

  const selectedAgentName = agents.find(a => a.id === selectedAgentId)?.name || 'Enrutamiento Automático';

  return (
    <div className="flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* Header con Selector de Agente */}
      <header className="px-8 py-5 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-[#EDE9E0] flex items-center gap-2">
            Simulador Multi-Agente
            <Sparkles size={20} className="text-[#F36A2D]" />
          </h1>
          <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
            Prueba cómo interactúan tus especialistas o valida el enrutador inteligente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Simular como:</label>
          <div className="relative group">
            <select
              value={selectedAgentId || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAgentId(val === "" ? null : val);
                setMessages([]); // Reset chat when agent changes for clean testing
              }}
              className="appearance-none bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-zinc-900 dark:text-[#EDE9E0] focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all cursor-pointer shadow-sm"
            >
              <option value="">🤖 Enrutamiento Dinámico (Elegir por intención)</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>👤 {agent.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
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
            <p className="max-w-xs mt-2 text-sm">
              {selectedAgentId 
                ? `Estás hablando directamente con "${selectedAgentName}".`
                : "Escribe cualquier cosa. El sistema decidirá qué agente debe responderte según tu intención."}
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
                <span className="text-[10px] font-bold text-[#F36A2D] uppercase tracking-widest pl-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#F36A2D] rounded-full" /> {msg.agentName}
                </span>
              )}
              <div className={`px-5 py-3.5 rounded-2xl shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 dark:bg-[#EDE9E0] text-white dark:text-zinc-900 border-zinc-800 dark:border-[#EDE9E0] rounded-tr-sm' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-[#DEDAD0] dark:border-zinc-800 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
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
              <LoaderCircle className="animate-spin text-[#F36A2D]" size={20} />
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
      <div className="p-6 bg-transparent border-t border-[#DEDAD0] dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto flex items-end gap-3 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-sm focus-within:ring-2 focus-within:ring-[#F36A2D]/30 transition-all">
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
            className="flex-1 max-h-48 min-h-12 bg-transparent resize-none outline-none py-3 px-5 text-zinc-900 dark:text-[#EDE9E0] text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 shrink-0 rounded-full bg-[#111111] dark:bg-[#EDE9E0] hover:scale-105 active:scale-95 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 flex items-center justify-center transition-all shadow-md group"
          >
            <Send size={18} className={`transition-transform duration-300 ${input.trim() && !isLoading ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''}`} />
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-4 flex items-center justify-center gap-2">
            AI SIMULATION PORTAL <span className="w-1 h-1 bg-zinc-300 rounded-full" /> ABITA.AI ENGINE v4
        </p>
      </div>
    </div>
  );
}

function LoaderCircle({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
