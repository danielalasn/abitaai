'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCheck, Bot } from 'lucide-react'

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const CHAT_SEQUENCE = [
  { sender: 'user', text: "Hola, me gustaría saber un poco de información sobre qué hacen.", delay: 1500 },
  { sender: 'bot', text: "¡Hola! 👋 abita.ai automatiza tu atención en WhatsApp e Instagram usando inteligencia artificial. Tu cliente escribe, y nuestra IA responde al instante con el contexto de tu negocio, 24/7.", delay: 2500 },
  { sender: 'user', text: "Suena genial. ¿Qué se necesita para poder empezar a usar la plataforma?", delay: 3000 },
  { sender: 'bot', text: "¡Es súper sencillo! Agendamos una reunión y con un pequeño cuestionario nosotros nos encargamos de armarte todo el bot.\n\nLe damos la personalidad, las reglas necesarias y todo el conocimiento de tu empresa que quieras que sepa. Tú no tienes que programar nada. 🚀", delay: 4000 }
];

export function HeroChatDemo() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const getTime = () => {
    return new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    }).toLowerCase();
  }

  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping])

  useEffect(() => {
    if (currentIndex >= CHAT_SEQUENCE.length) return;

    const nextMsg = CHAT_SEQUENCE[currentIndex]
    let messageTimer: NodeJS.Timeout;

    if (nextMsg.sender === 'bot') {
      setIsTyping(true)
      
      messageTimer = setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { 
            id: Math.random().toString(), 
            sender: nextMsg.sender as 'user' | 'bot', 
            text: nextMsg.text,
            time: getTime()
        }])
        setCurrentIndex(prev => prev + 1)
      }, nextMsg.delay)

    } else {
      messageTimer = setTimeout(() => {
        setMessages(prev => [...prev, { 
            id: Math.random().toString(), 
            sender: nextMsg.sender as 'user' | 'bot', 
            text: nextMsg.text,
            time: getTime()
        }])
        setCurrentIndex(prev => prev + 1)
      }, nextMsg.delay)
    }

    return () => {
      clearTimeout(messageTimer)
    }
  }, [currentIndex])

  return (
    <section className="w-full bg-[#E9E4D8] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
            <span className="inline-block w-12 h-1 bg-[#F36A2D] mb-4 rounded-full"></span>
            <h2 className="text-3xl md:text-4xl font-display text-[#111111] mb-3">La experiencia en tiempo real</h2>
            <p className="text-[#6F6F6F]">Así de natural fluirá la conversación con tus futuros clientes.</p>
        </div>

        <div className="w-full bg-[#f4f2ee] rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-[#DEDAD0] overflow-hidden flex flex-col h-[520px] relative">
          {/* Header */}
          <div className="bg-[#111111] px-6 py-4 flex items-center justify-between z-10">
            <div className="flex flex-row items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F36A2D] flex items-center justify-center font-bold text-white text-lg shadow-lg">
                a
                </div>
                <div>
                  <div className="text-white font-medium text-base">abita.ai Platform</div>
                  <div className="text-[#F36A2D] text-[10px] font-bold uppercase tracking-wider">AI Powered</div>
                </div>
            </div>
          </div>

          {/* Chat Body */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 p-6 md:p-10 overflow-y-auto flex flex-col gap-6 relative scroll-smooth bg-white"
          >
            <div className="text-center text-[10px] font-bold tracking-[0.2em] uppercase text-[#9A9A9A] mb-4 opacity-50">
              Hoy
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                
                {msg.sender === 'user' && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4F2EE] border border-[#DEDAD0] flex items-center justify-center mb-1">
                    <span className="text-[10px] font-bold text-[#6F6F6F]">U</span>
                  </div>
                )}

                <div 
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 relative shadow-sm ${
                    msg.sender === 'bot' 
                      ? 'bg-[#F36A2D] text-white rounded-tr-sm order-1' 
                      : 'bg-[#F4F2EE] text-[#111111] border border-[#DEDAD0] rounded-tl-sm'
                  }`}
                >
                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4">
                    {msg.text}
                  </div>
                  
                  <div className={`flex items-center gap-1.5 absolute bottom-1 right-2 ${msg.sender === 'bot' ? 'text-white/70' : 'text-[#9A9A9A]'}`}>
                    <span className="text-[9px] font-medium">{msg.time}</span>
                    {msg.sender === 'bot' && (
                        <CheckCheck size={12} className="text-blue-400" />
                    )}
                  </div>
                </div>

                {msg.sender === 'bot' && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#F36A2D]/10 text-[#F36A2D] flex items-center justify-center mb-1 order-2">
                    <Bot size={16} />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-end gap-2 justify-end animate-fade-in">
                <div className="bg-[#F36A2D] rounded-2xl rounded-tr-sm px-5 py-4 shadow-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#F36A2D]/10 text-[#F36A2D] flex items-center justify-center mb-1">
                  <Bot size={16} />
                </div>
              </div>
            )}
          </div>
          
          {/* Footer mockup */}
          <div className="bg-white px-8 py-5 border-t border-[#DEDAD0]/60 flex items-center gap-4">
             <div className="flex-1 bg-[#F4F2EE] rounded-2xl h-12 px-5 flex items-center text-[#9A9A9A] text-sm">
                 Escribe un mensaje...
             </div>
             <div className="w-12 h-12 rounded-2xl bg-[#111111] flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="#ffffff"/>
                </svg>
             </div>
          </div>
        </div>
      </div>
    </section>
  )
}
