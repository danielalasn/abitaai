'use client';

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Bot, User, Phone, Loader2, Send, Check, Trash2, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { getActiveChats, getChatMessages, toggleBotActive, requestHandoff, simulateIncomingWhatsApp, saveAssistantReply, saveAgentMessage, deleteChat, bulkArchiveChats, bulkDisableBot, bulkEnableBot } from "@/app/actions/inbox";
import { sendTestMessage } from "@/app/actions/chat";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { NewChatModal } from "@/components/NewChatModal";

// Helper component for the Wait Timer
function WaitTimer({ startTime }: { startTime: string | Date }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000); // seconds

      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}m`);
      else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        setElapsed(`${h}h ${m}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded-full animate-pulse">
      <Clock size={10} />
      <span>Esperando: {elapsed}</span>
    </div>
  );
}

const formatDateLabel = (date: Date) => {
  const now = new Date();
  const d = new Date(date);

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Hoy";
  if (isYesterday) return "Ayer";

  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return d.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, (c) => c.toUpperCase());
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatSidebarDate = (date: Date) => {
  const now = new Date();
  const d = new Date(date);
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(" p. m.", " pm").replace(" a. m.", " am");
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";

  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return d.toLocaleDateString('es-ES', { weekday: 'short' }).replace(/^\w/, c => c.toUpperCase());
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Cache de chats abiertos para cambio instantáneo
  const [chatsCache, setChatsCache] = useState<Record<string, any>>({});

  // States para los dos inputs mockeados
  const [clientInput, setClientInput] = useState('');
  const [agentInput, setAgentInput] = useState('');

  // States para filtros de inbox
  const [filterHeat, setFilterHeat] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Refs para control de estado optimista y polling
  const pendingOptimistic = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);
  const lastRequestedId = useRef<string | null>(null);

  // Sincronizar el Ref con el ID activo
  useEffect(() => {
    activeChatIdRef.current = activeChat?.id || null;
  }, [activeChat?.id]);

  // Lee los filtros de la URL al cargar la página si vienen desde el Analytics Dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('heat')) setFilterHeat(params.get('heat') as string);
      if (params.get('status')) setFilterStatus(params.get('status') as string);
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Cargar chats
  // Aplica datos del servidor pero preservando cualquier estado optimista pendiente en botActive
  const mergeChats = (latestChats: any[], prev: any[], source: string) => {
    return latestChats.map(newChat => {
      // Buscamos si hay CUALQUIER llave en pendingOptimistic que contenga este ID
      const pendingKeys = Array.from(pendingOptimistic.current);
      const isPending = pendingKeys.some(key => key.includes(newChat.id));
      
      if (isPending) {
        // Si está pendiente, forzamos el valor que está actualmente en la pantalla (prev)
        const chatEnPantalla = prev.find(p => p.id === newChat.id);
        if (chatEnPantalla !== undefined && chatEnPantalla.botActive !== newChat.botActive) {
          console.log(`[DEBUG - mergeChats] Bloqueando reversión en ID ${newChat.id.slice(-4)}. Servidor dice ${newChat.botActive}, mantenemos local ${chatEnPantalla.botActive}`);
          return { ...newChat, botActive: chatEnPantalla.botActive };
        }
      }
      return newChat;
    });
  };

  // Recarga completa de la lista (con merge inteligente)
  const loadChats = async (selectId?: string) => {
    const data = await getActiveChats();
    setChats(prev => mergeChats(data, prev, 'loadChats'));
    if (selectId) loadChatDetails(selectId);
    setIsLoading(false);
  };

  // Sync silencioso: solo actualiza la lista lateral (con merge inteligente)
  const syncChatsList = async () => {
    const data = await getActiveChats();
    setChats(prev => mergeChats(data, prev, 'syncChatsList'));
  };

  // Sincronizar cache cada vez que el chat activo cambie (por polling u optimismo)
  useEffect(() => {
    if (activeChat?.id) {
      setChatsCache(prev => ({ ...prev, [activeChat.id]: activeChat }));
    }
  }, [activeChat]);

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

  // Polling inteligente: usa setTimeout recursivo para evitar solapamiento
  useEffect(() => {
    let cancelled = false;

    const syncData = async () => {
      if (cancelled) return;

      try {
        // Sincronizar lista lateral (Fusionando con estados optimistas pendientes)
        const latestChats = await getActiveChats();
        if (cancelled) return;
        
        setChats(prev => mergeChats(latestChats, prev, 'polling'));

        // Sincronizar chat activo si existe y no hay operaciones optimistas
        const currentId = activeChatIdRef.current;
        const hasOptimistic = pendingOptimistic.current.size > 0;
        
        if (currentId && !hasOptimistic) {
          const refreshed = await getChatMessages(currentId);
          if (cancelled) return;
          
          // Actualizar tanto el activo como el cache silenciosamente
          setActiveChat(refreshed);
          setChatsCache(prev => ({ ...prev, [currentId]: refreshed }));
        }
      } catch (e) {
        // Silenciar errores de polling para no romper la app
      }

      // Programar el siguiente ciclo DESPUÉS de que termine este
      if (!cancelled) {
        setTimeout(syncData, 8000);
      }
    };

    // Iniciar el primer ciclo después de 8 segundos
    const initialTimeout = setTimeout(syncData, 8000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
    };
  }, []);

  // Cargar detalle de un chat con CACHE para respuesta instantánea
  const loadChatDetails = async (chatId: string) => {
    // 0. Registrar el ID solicitado inmediatamente para evitar condiciones de carrera
    lastRequestedId.current = chatId;
    activeChatIdRef.current = chatId;

    // 1. Cambio instantáneo si ya tenemos los datos en cache
    if (chatsCache[chatId]) {
      setActiveChat(chatsCache[chatId]);
      // Si ya hay cache, no activamos el loader "full" pero el fetch va en paralelo
    } else {
      // Solo mostramos el loader principal si NO hay cache previo
      setIsChatLoading(true);
    }

    try {
      const data = await getChatMessages(chatId);
      
      // 2. IMPORTANTE: Solo actualizamos el estado si el usuario NO ha cambiado de chat mientras cargaba
      if (lastRequestedId.current === chatId) {
        setChatsCache(prev => ({ ...prev, [chatId]: data }));
        setActiveChat(data);
      }
    } catch (error) {
      console.error("Error al cargar chat:", error);
    } finally {
      // Solo quitamos el loader si seguimos en este chat
      if (lastRequestedId.current === chatId) {
        setIsChatLoading(false);
      }
    }
  };

  // Toggle Bot Handover
  const handleToggleBot = async () => {
    if (!activeChat) return;
    const newStatus = !activeChat.botActive;
    const chatId = activeChat.id;

    // --- ACTUALIZACIÓN OPTIMISTA ---
    // 1. Cambiamos el estado en el chat activo
    setActiveChat((prev: any) => prev?.id === chatId ? { ...prev, botActive: newStatus } : prev);
    
    // 2. Cambiamos el estado en la lista lateral (UI instantánea)
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, botActive: newStatus } : c));

    // Bloqueamos el polling para este ID temporalmente
    pendingOptimistic.current.add('toggle-' + chatId);

    try {
      await toggleBotActive(chatId, newStatus);
    } catch (error) {
      console.error(error);
      // Revertir si falla
      setActiveChat((prev: any) => ({ ...prev, botActive: !newStatus }));
    } finally {
      // Desbloqueamos el polling después de un pequeño delay para asegurar consistencia
      setTimeout(() => {
        pendingOptimistic.current.delete('toggle-' + chatId);
      }, 2000);
    }
  };

  // Delete Chat
  const handleDeleteChat = async () => {
    if (!activeChat) return;
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar toda la conversación y el contacto? Esto no se puede deshacer.");
    if (!confirmDelete) return;

    await deleteChat(activeChat.id);
    setSelectedIds(new Set());
    setActiveChat(null);
    loadChats();
  };

  // Bulk handlers
  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkLoading(true);
    await bulkArchiveChats([...selectedIds]);
    setSelectedIds(new Set());
    if (activeChat && selectedIds.has(activeChat.id)) setActiveChat(null);
    await loadChats();
    setIsBulkLoading(false);
  };

  const handleBulkDisableBot = async () => {
    if (selectedIds.size === 0) return;
    const idsToUpdate = [...selectedIds];
    
    // --- OPTIMISTA ---
    setChats(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, botActive: false } : c));
    
    // Registrar IDs como pendientes
    idsToUpdate.forEach(id => pendingOptimistic.current.add('bulk-' + id));

    if (activeChat && idsToUpdate.includes(activeChat.id)) {
      setActiveChat((prev: any) => ({ ...prev, botActive: false }));
    }
    
    setSelectedIds(new Set());

    try {
      await bulkDisableBot(idsToUpdate);
    } catch (error) {
      console.error(error);
      loadChats(); 
    } finally {
      // Damos 5 segundos de margen para actualizaciones masivas (más pesado para la BD)
      setTimeout(() => {
        idsToUpdate.forEach(id => pendingOptimistic.current.delete('bulk-' + id));
      }, 5000);
    }
  };
  const handleBulkEnableBot = async () => {
    if (selectedIds.size === 0) return;
    const idsToUpdate = [...selectedIds];
    
    // --- OPTIMISTA ---
    setChats(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, botActive: true } : c));

    // Registrar IDs como pendientes
    idsToUpdate.forEach(id => pendingOptimistic.current.add('bulk-' + id));

    if (activeChat && idsToUpdate.includes(activeChat.id)) {
      setActiveChat((prev: any) => ({ ...prev, botActive: true }));
    }

    setSelectedIds(new Set());

    try {
      await bulkEnableBot(idsToUpdate);
    } catch (error) {
      console.error(error);
      loadChats(); 
    } finally {
      // 5 segundos de margen para acciones masivas
      setTimeout(() => {
        idsToUpdate.forEach(id => pendingOptimistic.current.delete('bulk-' + id));
      }, 5000);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredChats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChats.map((c: any) => c.id)));
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

        const botData = await sendTestMessage(msg, history, chatDetails.lead.name || undefined);
        if (botData && typeof botData !== 'string') {
          await saveAssistantReply(chatId, botData.reply, botData.scoreBump);

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

  // 3. El AGENTE envía un mensaje: aparece INSTANTÁNEO en UI, BD en background
  const handleAgentSubmit = () => {
    if (!agentInput.trim() || !activeChat || activeChat.botActive) return;

    const msgContent = agentInput.trim();
    const chatId = activeChat.id;
    setAgentInput('');

    const temporaryId = 'temp-' + Date.now();
    const optimisticMessage = {
      id: temporaryId,
      role: 'agent',
      content: msgContent,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Registrar como en vuelo → bloquea el polling
    pendingOptimistic.current.add(temporaryId);

    // Mostrar el mensaje INMEDIATAMENTE al final de la lista
    setActiveChat((prev: any) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, optimisticMessage] };
    });

    // Todo lo demás en background
    (async () => {
      try {
        await saveAgentMessage(chatId, msgContent);

        // Marcar como enviado → aparece el cheque ✓
        setActiveChat((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m: any) =>
              m.id === temporaryId ? { ...m, status: 'sent' } : m
            )
          };
        });

        // Desbloquear el polling DESPUÉS de confirmar el cheque
        pendingOptimistic.current.delete(temporaryId);
        syncChatsList();
      } catch (error) {
        console.error(error);
        pendingOptimistic.current.delete(temporaryId);
        // Eliminar el mensaje optimista si falló
        setActiveChat((prev: any) => {
          if (!prev) return prev;
          return { ...prev, messages: prev.messages.filter((m: any) => m.id !== temporaryId) };
        });
      }
    })();
  };

  // Filtrado de chats
  const filteredChats = chats.filter(chat => {
    // Filtrar por temperatura (heat)
    if (filterHeat !== 'ALL') {
      const heat = chat.lead.heat || 'FRIO';
      if (heat !== filterHeat) return false;
    }
    // Filtrar por estado (status)
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'BOT' && !chat.botActive) return false;
      if (filterStatus === 'NEEDS_AGENT' && (chat.botActive || chat.lead.status !== 'NEEDS_AGENT')) return false;
      if (filterStatus === 'AGENT' && (chat.botActive || chat.lead.status === 'NEEDS_AGENT')) return false;
    }
    return true;
  });

  if (status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#F36A2D]" size={40} />
          <span className="text-sm font-medium text-[#6F6F6F] animate-pulse">Iniciando plataforma...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-full w-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* 1. SIDEBAR DE CHATS */}
      <div className="w-[340px] border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8] dark:bg-[#1A1714] flex flex-col shrink-0">
        <div className="h-16 shrink-0 px-4 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex items-center justify-between bg-[#E9E4D8] dark:bg-[#1A1714]">
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[#6F6F6F]"
                >
                  <Plus size={18} className="rotate-45" />
                </button>
                <span className="text-sm font-bold text-[#F36A2D]">{selectedIds.size} seleccionados</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBulkEnableBot}
                  disabled={isBulkLoading}
                  className="p-2 text-[#6F6F6F] hover:text-[#F36A2D] hover:bg-[#F36A2D]/10 rounded-xl transition-all disabled:opacity-30"
                  title="Activar IA"
                >
                  <Bot size={18} />
                </button>
                <button
                  onClick={handleBulkDisableBot}
                  disabled={isBulkLoading}
                  className="p-2 text-[#6F6F6F] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all disabled:opacity-30"
                  title="Pausar IA"
                >
                  <User size={18} />
                </button>
                <button
                  onClick={handleBulkArchive}
                  disabled={isBulkLoading}
                  className="p-2 text-[#6F6F6F] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-30"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
                {isBulkLoading && <Loader2 size={14} className="animate-spin text-[#F36A2D] ml-1" />}
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2">
                Inbox
                <span className="bg-[#F36A2D]/10 text-[#F36A2D] text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {filteredChats.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {filteredChats.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="p-1.5 rounded-lg text-xs font-bold text-[#6F6F6F] hover:bg-white/60 dark:hover:bg-white/5 transition-all"
                  >
                    ⬜
                  </button>
                )}
                <button 
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="p-1.5 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-lg hover:scale-105 transition-all shadow-sm"
                  title="Nuevo Chat Individual"
                >
                  <Plus size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex flex-col gap-2 bg-[#E9E4D8]/60 dark:bg-[#1A1714]">
          <select
            value={filterHeat}
            onChange={(e) => setFilterHeat(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg p-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#F36A2D]/50 shadow-sm"
          >
            <option value="ALL">Todas las temperaturas</option>
            <option value="CALIENTE">Caliente</option>
            <option value="TIBIO">Tibio</option>
            <option value="FRIO">Frío</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg p-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#F36A2D]/50 shadow-sm"
          >
            <option value="ALL">Todos los estados</option>
            <option value="BOT">IA Gestionando</option>
            <option value="NEEDS_AGENT">Necesita Humano</option>
            <option value="AGENT">En Atención Humana</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-2 space-y-1 relative">
          {isLoading && chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
              <Loader2 className="animate-spin mb-2" size={20} />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <MessageSquare size={32} className="mb-3 opacity-20" />
              <p className="text-sm">No hay conversaciones con estos filtros.</p>
            </div>
          ) : (
            filteredChats.map((chat: any) => {
              const isSelected = activeChat?.id === chat.id;
              const isMultiSelected = selectedIds.has(chat.id);
              const isHandoff = chat.lead.status === 'NEEDS_AGENT';
              const isBot = chat.botActive;
              const isHuman = !chat.botActive && !isHandoff;

              return (
                <div key={chat.id} className="relative group">
                  {/* Checkbox */}
                  <div
                    onClick={(e) => toggleSelect(chat.id, e)}
                    className={`absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                      isMultiSelected
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isMultiSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>

                <button
                  onClick={() => { if (selectedIds.size > 0) toggleSelect(chat.id, { stopPropagation: () => {} } as any); else loadChatDetails(chat.id); }}
                  className={`w-full text-left p-4 pl-8 rounded-2xl transition-all duration-200 flex flex-col gap-1 border-1 shadow-sm ${
                    isMultiSelected
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/20'
                      : isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/20'
                    : isHandoff
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-800'
                      : isBot
                        ? 'bg-white dark:bg-zinc-900/60 border-[#F36A2D] dark:border-[#F36A2D]/80'
                        : isHuman
                          ? 'bg-white dark:bg-zinc-900/60 border-emerald-500 dark:border-emerald-600'
                          : 'bg-white/50 dark:bg-zinc-900/20 border-transparent'
                    }`}
                >
                  <div className="flex justify-between items-center w-full gap-2">
                    <div className="flex items-center gap-2 truncate flex-1">
                      {chat.lead.heat === 'CALIENTE' && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0">🔥 {chat.lead.score}</span>}
                      {chat.lead.heat === 'TIBIO' && <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-1 shrink-0"><TrendingUp size={10} /> {chat.lead.score}</span>}
                      {(!chat.lead.heat || chat.lead.heat === 'FRIO') && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0">❄️ {chat.lead.score || 0}</span>}

                      <span className="font-semibold text-sm text-[#111111] dark:text-[#EDE9E0] truncate">
                        {chat.lead.name || chat.lead.phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#6F6F6F] font-medium opacity-70">
                        {formatSidebarDate(new Date(chat.lastActiveAt))}
                      </span>
                      {isBot ? (
                        <Bot size={13} className="text-[#F36A2D]" />
                      ) : isHandoff ? (
                        <div className="relative">
                          <AlertCircle size={13} className="text-red-500 animate-pulse" />
                        </div>
                      ) : (
                        <User size={13} className="text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {isHandoff && (
                    <div className="flex justify-end -mt-1 mb-1">
                      <WaitTimer startTime={chat.lastActiveAt} />
                    </div>
                  )}
                  <div className="text-xs text-[#6F6F6F] truncate pr-4 opacity-80 italic">
                    {chat.messages?.[0]?.content || "Sin mensajes"}
                  </div>
                </button>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 2. VENTANA DE CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1714] relative">
        {/* Loader de transición rápida */}
        {isChatLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#E9E4D8]/30 dark:bg-[#1A1714]/30 backdrop-blur-[2px] animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-[#DEDAD0] dark:border-zinc-800">
               <Loader2 className="animate-spin text-[#F36A2D]" size={20} />
               <span className="text-xs font-semibold text-[#111111] dark:text-[#EDE9E0]">Cargando conversación...</span>
            </div>
          </div>
        )}

        {!activeChat ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Selecciona un chat para ver la conversación</p>
          </div>
        ) : (
          <>
            <header className="h-16 px-6 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex items-center justify-between shrink-0 bg-[#E9E4D8]/80 dark:bg-[#111111]/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#111111] dark:bg-[#E9E4D8] rounded-full flex items-center justify-center text-[#F36A2D] font-bold shadow-sm">
                  {activeChat.lead.name?.[0]?.toUpperCase() || 'a'}
                </div>
                <div>
                  <h2 className="font-semibold text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2">
                    {activeChat.lead.name}
                    <span className="text-[10px] bg-[#EDE9E0] dark:bg-zinc-800 text-[#6F6F6F] px-1.5 py-0.5 rounded-md font-mono border border-[#DEDAD0] dark:border-zinc-700">
                      WhatsApp
                    </span>
                  </h2>
                  <p className="text-xs text-[#6F6F6F]">{activeChat.lead.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteChat}
                  title="Eliminar chat"
                  className="p-2 text-[#6F6F6F] hover:text-[#F36A2D] hover:bg-[#F36A2D]/5 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-[#DEDAD0] dark:bg-zinc-800 mx-1"></div>
                <span className="text-sm font-medium text-[#6F6F6F]">IA Activa</span>
                <button
                  onClick={handleToggleBot}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${activeChat.botActive ? 'bg-[#F36A2D]' : 'bg-[#DEDAD0] dark:bg-zinc-700'
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeChat.botActive ? 'translate-x-[22px]' : 'translate-x-1'
                    }`} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeChat.messages?.map((msg: any, idx: number) => {
                const isUser = msg.role === 'user';
                const isBot = msg.role === 'assistant';
                const isAgent = msg.role === 'agent';

                const currentMsgDate = new Date(msg.createdAt);
                const prevMsgDate = idx > 0 ? new Date(activeChat.messages[idx - 1].createdAt) : null;
                const showDateHeader = !prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString();

                return (
                  <div key={msg.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-6">
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700/50">
                          {formatDateLabel(currentMsgDate)}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2 max-w-[85%] mb-4 ${isUser ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}>
                      {/* Avatar icon */}
                      {isBot && (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#F36A2D]/10 text-[#F36A2D] flex items-center justify-center mb-1">
                          <Bot size={13} />
                        </div>
                      )}
                      {isAgent && (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#111111]/10 text-[#111111] dark:bg-[#EDE9E0]/10 dark:text-[#EDE9E0] flex items-center justify-center mb-1">
                          <User size={13} />
                        </div>
                      )}

                      <div className={`relative p-3 pb-6 rounded-2xl text-sm min-w-[90px] w-fit font-sans transition-opacity duration-300 ${isUser
                        ? 'bg-white text-[#111111] dark:bg-[#111111]/40 dark:text-zinc-200 rounded-tl-sm border border-[#DEDAD0] dark:border-zinc-800'
                        : isBot
                          ? 'bg-[#F36A2D] text-white rounded-tr-sm shadow-md'
                          : 'bg-[#1A1714] text-white dark:bg-[#EDE9E0] dark:text-[#111111] rounded-tr-sm shadow-md'
                        } ${msg.status === 'pending' ? 'opacity-70' : 'opacity-100'}`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        <div className={`absolute bottom-1 right-2 text-[9px] font-medium flex items-center gap-1 ${isUser ? 'text-[#6F6F6F]' : 'text-inherit'
                          }`}>
                          <span className="opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {(isAgent || isBot) && msg.status !== 'pending' && (
                            <Check size={10} className="opacity-100" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isSimulating && (
                <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-[#F36A2D]/10 text-[#F36A2D] flex items-center justify-center mb-1">
                    <Bot size={13} />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F36A2D]/20 text-[#F36A2D] rounded-tr-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* CONTROLES DE SIMULACIÓN MVP */}
            <div className="border-t border-[#DEDAD0] dark:border-zinc-800/60 bg-white/80 dark:bg-[#111111]/40 backdrop-blur-xl z-10 shrink-0 pb-2">

              {/* AGENT INPUT */}
              <div className="px-4 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 bg-[#F8F5EE] dark:bg-[#1A1714]">
                <div className="text-[10px] font-bold text-[#F36A2D] mb-2 flex items-center justify-between tracking-widest px-1">
                  <span>AGENTE REAL (TU RESPUESTA)</span>
                  <User size={10} />
                </div>

                <div className="relative flex items-center">
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
                    placeholder={activeChat.botActive ? "Desactiva la IA para responder" : "Escribe una respuesta..."}
                    className="w-full bg-[#E9E4D8]/50 dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl px-5 py-3 pr-14 min-h-[52px] max-h-32 resize-none outline-none disabled:opacity-50 transition-all focus:border-[#F36A2D] focus:ring-1 focus:ring-[#F36A2D]/40 text-sm text-[#111111] dark:text-white"
                    rows={1}
                  />
                  {!activeChat.botActive && (
                    <button
                      onClick={handleAgentSubmit}
                      disabled={!agentInput.trim()}
                      className="absolute right-2 p-2 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center h-9 w-9 hover:scale-105 shadow-sm"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </div>

                {activeChat.botActive && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F] bg-[#DEDAD0]/30 dark:bg-zinc-800/20 py-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-800/40 opacity-80">
                    <Bot size={12} className="text-[#F36A2D]" />
                    Inteligencia Artificial Gestionando
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)}
        onSuccess={(chatId) => {
          loadChats(chatId);
          // Opcional: mostrar un toast o mensaje de éxito
        }}
      />
    </div>
  );
}
