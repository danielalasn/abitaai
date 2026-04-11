'use client';

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Bot, User, Phone, Loader2, Send, Trash2, AlertCircle } from "lucide-react";
import { getActiveChats, getChatMessages, toggleBotActive, requestHandoff, simulateIncomingWhatsApp, saveAssistantReply, saveAgentMessage, deleteChat } from "@/app/actions/inbox";
import { sendTestMessage } from "@/app/actions/chat";

export default function InboxPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // States para los dos inputs mockeados
  const [clientInput, setClientInput] = useState('');
  const [agentInput, setAgentInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Cargar chats
  const loadChats = async (selectId?: string) => {
    const data = await getActiveChats();
    setChats(data);
    
    // Solo seleccionamos el primero si realmente no hay nada seleccionado
    // Usamos una variable auxiliar para no depender del estado que puede ser stale en el closure
    if (selectId) {
      loadChatDetails(selectId);
    }
    
    setIsLoading(false);
  };

  // Efecto inicial y selección automática por primera vez
  useEffect(() => {
    const initialLoad = async () => {
      const data = await getActiveChats();
      setChats(data);
      if (data.length > 0) {
        loadChatDetails(data[0].id);
      }
      setIsLoading(false);
    };
    initialLoad();
  }, []);

  // Polling solo para actualizar la LISTA de chats y el contenido del chat ACTUAL
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getActiveChats();
      setChats(data);
      
      // Si hay un chat activo, refrescamos sus mensajes sin cambiar de chat
      if (activeChat?.id) {
        const refreshed = await getChatMessages(activeChat.id);
        setActiveChat(refreshed);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeChat?.id]);

  // Cargar detalle de un chat
  const loadChatDetails = async (chatId: string) => {
    const data = await getChatMessages(chatId);
    setActiveChat(data);
  };

  // Toggle Bot Handover
  const handleToggleBot = async () => {
    if (!activeChat) return;
    const newState = !activeChat.botActive;
    setActiveChat({ ...activeChat, botActive: newState }); // Optimistic
    await toggleBotActive(activeChat.id, newState);
    loadChats();
  };

  // Delete Chat
  const handleDeleteChat = async () => {
    if (!activeChat) return;
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar toda la conversación y el contacto? Esto no se puede deshacer.");
    if (!confirmDelete) return;

    await deleteChat(activeChat.id);
    setActiveChat(null);
    loadChats();
  };

  // 1. Simular creación de un lead nuevo desde WhatsApp
  const onCreateLead = async () => {
    setIsSimulating(true);
    try {
      const fakePhone = "7000" + Math.floor(1000 + Math.random() * 9000);
      const fakeMsg = "¿Hola, qué tal? Quisiera saber más información.";
      const chatId = await simulateIncomingWhatsApp(fakePhone, fakeMsg);
      
      const chatDetails = await getChatMessages(chatId);
      if (chatDetails?.botActive) {
          const botData = await sendTestMessage(fakeMsg, []);
          if (botData && typeof botData !== 'string') {
            await saveAssistantReply(chatId, botData.reply);
            
            if (botData.isHandoff) {
              await requestHandoff(chatId);
            }
          }
      }

      await loadChats(chatId); // Refresh y autoseleccionar
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // 2. Simular que el CLIENTE envía un mensaje por WhatsApp al chat actual
  const handleClientSubmit = async () => {
    if (!clientInput.trim() || !activeChat) return;
    setIsSimulating(true);
    try {
      const msg = clientInput.trim();
      const phone = activeChat.lead.phone;
      setClientInput('');
      
      // Guardar el mensaje del cliente en BD
      const chatId = await simulateIncomingWhatsApp(phone, msg);
      
      const chatDetails = await getChatMessages(chatId);
      
      // Si el bot está activo, responde automáticamente
      if (chatDetails?.botActive) {
          // Extraemos el historial de la BD, pero evitamos pasarle el que acabamos de meter
          // para no duplicarlo en la lógica de sendTestMessage.
          const history = chatDetails.messages.slice(0, -1);
          
          const botData = await sendTestMessage(msg, history);
          if (botData && typeof botData !== 'string') {
            await saveAssistantReply(chatId, botData.reply);
            
            if (botData.isHandoff) {
              await requestHandoff(chatId);
            }
          }
      }

      await loadChats();
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // 3. Simular que el AGENTE (Tú) envía un mensaje manualmente desde el Inbox
  const handleAgentSubmit = async () => {
    if (!agentInput.trim() || !activeChat || activeChat.botActive) return;
    try {
      const msg = agentInput.trim();
      setAgentInput('');
      await saveAgentMessage(activeChat.id, msg);
      await loadChats();
    } catch (error: any) {
       console.error(error);
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-[#09090b]">
      {/* 1. SIDEBAR DE CHATS */}
      <div className="w-[340px] border-r border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-[#0a0a0c] flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Inbox
            <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {chats.length}
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
          {isLoading && chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
               <Loader2 className="animate-spin mb-2" size={20} />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
               <MessageSquare size={32} className="mb-3 opacity-20" />
               <p className="text-sm">No hay conversaciones activas.</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => loadChatDetails(chat.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 ${
                  activeChat?.id === chat.id 
                  ? 'bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-200 dark:ring-blue-800/50' 
                  : chat.botActive === false && chat.lead.status === 'NEEDS_AGENT' 
                      ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50' 
                      : chat.botActive === false ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate">
                    {chat.lead.name || chat.lead.phone}
                  </span>
                  {chat.botActive ? (
                    <Bot size={14} className="text-blue-500" />
                  ) : chat.lead.status === 'NEEDS_AGENT' ? (
                    <AlertCircle size={14} className="text-red-500" />
                  ) : (
                    <User size={14} className="text-emerald-500" />
                  )}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate pr-4">
                  {chat.messages?.[0]?.content || "Sin mensajes"}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/60">
           <button 
             onClick={onCreateLead}
             disabled={isSimulating}
             className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
           >
             {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
             Nuevo Lead Random (Prueba)
           </button>
        </div>
      </div>

      {/* 2. VENTANA DE CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#09090b] relative">
        {!activeChat ? (
           <div className="h-full flex flex-col items-center justify-center text-zinc-400">
             <MessageSquare size={48} className="mb-4 opacity-20" />
             <p>Selecciona un chat para ver la conversación</p>
           </div>
        ) : (
          <>
            <header className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                   {activeChat.lead.name?.[0]?.toUpperCase() || '#'}
                 </div>
                 <div>
                   <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                     {activeChat.lead.name}
                     <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md font-mono border border-zinc-200 dark:border-zinc-700">
                       WhatsApp
                     </span>
                   </h2>
                   <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeChat.lead.phone}</p>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <button
                   onClick={handleDeleteChat}
                   title="Eliminar chat"
                   className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                 >
                   <Trash2 size={18} />
                 </button>
                 <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
                 <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">IA Activa:</span>
                 <button 
                   onClick={handleToggleBot}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                     activeChat.botActive ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                   }`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                     activeChat.botActive ? 'translate-x-6' : 'translate-x-1'
                   }`} />
                 </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {activeChat.messages?.map((msg: any) => (
                 <div key={msg.id} className={`flex max-w-[80%] ${msg.role === 'user' ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                    <div className={`p-3 rounded-2xl whitespace-pre-wrap ${
                       msg.role === 'user' 
                       ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 rounded-tl-xl border border-zinc-200 dark:border-zinc-700/50' 
                       : 'bg-emerald-600 text-white rounded-tr-xl shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                 </div>
               ))}
               
               {isSimulating && (
                  <div className="flex max-w-[80%] ml-auto flex-row-reverse">
                    <div className="p-3 rounded-2xl bg-emerald-600/50 text-white rounded-tr-xl flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* CONTROLES DE SIMULACIÓN MVP */}
            <div className="border-t border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0">
               
               {/* CLIENT SIMULATOR (Lo que el cliente escribe en WhatsApp) */}
               <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 mb-2 flex items-center justify-between">
                     <span>SIMULADOR DE CELULAR CLIENTE</span>
                     <Phone size={12} />
                  </div>
                  <div className="relative">
                     <textarea 
                       value={clientInput}
                       onChange={(e) => setClientInput(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleClientSubmit();
                         }
                       }}
                       disabled={isSimulating}
                       placeholder="Envía un mensaje como si fueras el cliente desde WhatsApp..."
                       className="w-full bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 min-h-[40px] max-h-24 resize-none outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 text-sm disabled:opacity-50"
                       rows={1}
                     />
                     <button 
                       onClick={handleClientSubmit}
                       disabled={isSimulating || !clientInput.trim()}
                       className="absolute right-2 bottom-2 p-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-md transition-colors disabled:opacity-50"
                     >
                       <Send size={14} className="mt-0.5 ml-0.5" />
                     </button>
                  </div>
               </div>

               {/* AGENT INPUT (Tu panel en Respond.io) */}
               <div className="p-4">
                  <div className="text-xs font-semibold text-blue-500 mb-2 flex items-center justify-between">
                     <span>TU INBOX PANEL (AGENTE REAL)</span>
                     <User size={12} />
                  </div>

                  <div className="relative">
                    <textarea 
                      value={agentInput}
                      onChange={(e) => setAgentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAgentSubmit();
                        }
                      }}
                      disabled={activeChat.botActive}
                      placeholder={activeChat.botActive ? "Para escribir manualmente a este cliente, apaga el Bot Arriba." : "Escribe una respuesta manual al cliente..."}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 min-h-[56px] max-h-32 resize-none outline-none disabled:opacity-50 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      rows={1}
                    />
                    {!activeChat.botActive && (
                      <button 
                        onClick={handleAgentSubmit}
                        disabled={!agentInput.trim()}
                        className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center h-8 w-8"
                      >
                        <Send size={14} className="mt-[1px] ml-[1px]" />
                      </button>
                    )}
                  </div>
                  
                  {activeChat.botActive && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <Bot size={14} />
                        La Inteligencia Artificial está gestionando esta conversación en automático.
                    </div>
                  )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
