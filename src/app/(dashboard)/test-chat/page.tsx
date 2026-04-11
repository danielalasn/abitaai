'use client';

import { useState, useRef, useEffect } from 'react';
import { sendTestMessage } from '@/app/actions/chat';
import { Send, Bot, User } from 'lucide-react';

export default function TestChatPage() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Call server action
    const botData = await sendTestMessage(userMessage, messages);
    const replyText = typeof botData === 'string' ? botData : botData.reply;
    
    setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      <header className="px-8 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Simulador del Bot</h1>
          <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
            Esta pantalla interactúa directamente con el Knowledge Base y las Instrucciones que acabas de guardar.
          </p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-6 flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <Bot size={48} className="mb-4 opacity-50" />
            <p>El bot está listo y tiene la memoria cargada. ¡Escríbele algo!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Bot size={18} className="text-blue-600 dark:text-blue-300" />
              </div>
            )}
            
            <div className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm' 
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                <User size={18} className="text-zinc-600 dark:text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-blue-600 dark:text-blue-300" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-tl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe un mensaje al bot..."
            className="flex-1 max-h-32 min-h-12 bg-transparent resize-none outline-none py-3 px-4 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center transition-colors"
          >
            <Send size={20} className={input.trim() && !isLoading ? 'ml-0.5' : ''} />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 mt-3 flex items-center justify-center gap-1.5">
           El bot usa tecnología de Anthropic y responde basado en tus instrucciones personalizadas.
        </p>
      </div>
    </div>
  );
}
