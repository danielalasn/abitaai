'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot, User, Send, Loader2, Phone, Hash, AlertCircle, TrendingUp, Clock,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, Filter, Mail, Trash2, Archive,
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, MessageSquare, Check, CheckCheck,
  Paperclip, FileText, X as XIcon, Image as ImageIcon, Smile, Sparkles, RefreshCw, Download,
  Mic, Square, ChevronDown, LogOut
} from "lucide-react";
import { getProfileWithMeta } from '@/app/actions/settings';
import { formatWhatsAppText } from '@/lib/utils';
import nextDynamic from 'next/dynamic';
const EmojiPicker = nextDynamic(() => import('emoji-picker-react'), { ssr: false });
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";

const IgIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const WaIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const SimIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Sparkles size={size} className={className} />
);
import { getActiveChats, getChatMessages, getChatMessagesPaginated, loadMoreMessages, toggleBotActive, toggleAutoWakeBot, requestHandoff, simulateIncomingMessage, saveAssistantReply, saveAgentMessage, sendAgentMedia, deleteChat, bulkArchiveChats, bulkDisableBot, bulkEnableBot } from "@/app/actions/inbox";
import { updateLeadAISummary } from "@/app/actions/leads";
import { uploadFileAction } from "@/app/actions/storage";
import { sendTestMessage } from "@/app/actions/chat";
import { useSession, signOut } from "next-auth/react";
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

      if (diff < 60) {
        setElapsed(`${diff}s`);
      } else if (diff < 3600) {
        setElapsed(`${Math.floor(diff / 60)}m`);
      } else if (diff < 86400) {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        setElapsed(`${h}h ${m}m`);
      } else if (diff < 2592000) { // 30 dias aprox
        const d = Math.floor(diff / 86400);
        setElapsed(`${d}d`);
      } else if (diff < 31536000) { // 365 dias aprox
        const m = Math.floor(diff / 2592000);
        setElapsed(`${m} mes${m > 1 ? 'es' : ''}`);
      } else {
        const y = Math.floor(diff / 31536000);
        setElapsed(`${y} año${y > 1 ? 's' : ''}`);
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
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getProfileWithMeta().then(p => {
      if (p.avatarUrl) setUserAvatarUrl(p.avatarUrl);
    }).catch(console.error);
  }, []);
  const router = useRouter();

  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Cache de chats abiertos para cambio instantáneo
  const [chatsCache, setChatsCache] = useState<Record<string, any>>({});

  // Paginación de mensajes
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // States para los dos inputs mockeados
  const [clientInput, setClientInput] = useState('');
  const [agentInput, setAgentInput] = useState('');

  // Media attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // States para filtros de inbox
  const [filterHeat, setFilterHeat] = useState<'ALL' | 'FRIO' | 'TIBIO' | 'CALIENTE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BOT' | 'NEEDS_AGENT' | 'AGENT' | 'UNANSWERED'>('ALL');
  const [filterCampaign, setFilterCampaign] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBotConfirmModalOpen, setIsBotConfirmModalOpen] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(true);
  // Vista móvil: 'list' muestra la lista de chats, 'chat' muestra la conversación
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'profile'>('list');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readMessageIds, setReadMessageIds] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedMessageIds = useRef<Set<string>>(new Set());

  // Estados para grabación de voz
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef<number>(0); // ref para leer en closures
  
  // Refs para Debounce del Simulador de Cliente (Inbox)
  const clientPendingMessages = useRef<string[]>([]);
  const clientDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Refs para control de estado optimista y polling
  const pendingOptimistic = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);
  const lastRequestedId = useRef<string | null>(null);
  const pollIntervalRef = useRef(3000);

  // Sincronizar el Ref con el ID activo
  useEffect(() => {
    activeChatIdRef.current = activeChat?.id || null;
  }, [activeChat?.id]);

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lee los filtros de la URL al cargar la página si vienen desde el Analytics Dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('heat')) setFilterHeat(params.get('heat') as any);
      if (params.get('status')) setFilterStatus(params.get('status') as any);
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);
  const lastActiveChatId = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const scrollToBottom = (force = false) => {
    const currentMessages = activeChat?.messages || [];
    const currentId = activeChat?.id || null;
    const isNewChat = currentId !== lastActiveChatId.current;
    const isNewMessage = currentMessages.length > lastMessageCount.current;

    if (force || isNewChat || isNewMessage) {
      // Use 'auto' (instant) for new chats to avoid visual jumps, 'smooth' for incoming messages
      messagesEndRef.current?.scrollIntoView({ behavior: isNewChat ? "auto" : "smooth" });

      lastMessageCount.current = currentMessages.length;
      lastActiveChatId.current = currentId;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, activeChat?.id]);

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

  // Efecto inicial sin selección automática
  useEffect(() => {
    const initialLoad = async () => {
      const data = await getActiveChats(Date.now());
      setChats(data);
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const chatId = params.get('chatId');
        if (chatId) {
          loadChatDetails(chatId);
          window.history.replaceState({}, '', '/inbox');
        }
      }
    };
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inicializar audio de notificación
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Polling inteligente: usa setTimeout recursivo para evitar solapamiento
  useEffect(() => {
    let cancelled = false;

    const syncData = async () => {
      if (cancelled) return;

      try {
        // Sincronizar lista lateral (Bypass cache con timestamp)
        const latestChats = await getActiveChats(Date.now());
        if (cancelled) return;

        const currentId = activeChatIdRef.current;
        const hasOptimistic = pendingOptimistic.current.size > 0;

        if (currentId && !hasOptimistic) {
          const refreshed = await getChatMessagesPaginated(currentId, 30);
          if (cancelled) return;
          
          // EVITAR CARRERAS (RACE CONDITIONS):
          // Si el usuario hizo clic en el toggle MIENTRAS esta petición estaba en vuelo,
          // ignoramos la respuesta del servidor para no sobreescribir el estado optimista.
          if (pendingOptimistic.current.has('toggle-' + currentId) || pendingOptimistic.current.has('bulk-' + currentId)) {
            return;
          }

          setActiveChat((prev: any) => {
            if (!prev || prev.id !== currentId) return prev;
            const newMsgsFromRefreshed = refreshed?.messages || [];

            // Remove optimistic messages that have a counterpart in the refreshed list
            const currentMsgs = (prev.messages || []).filter((msg: any) => {
              if (!msg.id.startsWith('temp-')) return true;
              return !newMsgsFromRefreshed.some((nm: any) => nm.content === msg.content && nm.role === msg.role);
            });

            const existingIds = new Set(currentMsgs.map((m: any) => m.id));
            const distinctNewMsgs = newMsgsFromRefreshed.filter((m: any) => !existingIds.has(m.id));

            const merged = [...currentMsgs, ...distinctNewMsgs].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            // Actualizamos todo el objeto (lead, score, heat, etc) y no solo los mensajes
            return { 
              ...prev, 
              ...refreshed,
              messages: merged 
            };
          });
          setChatsCache(prev => ({ ...prev, [currentId]: refreshed }));
        }

        // DETECTAR NUEVOS MENSAJES PARA NOTIFICACIONES Y BACKOFF
        let hasNewMessages = false;

        setChats(prev => {
          latestChats.forEach(newChat => {
            const oldChat = prev.find(p => p.id === newChat.id);
            const lastMsg = newChat.messages?.[0];

            // Si hay un chat nuevo o el último mensaje cambió, hay datos nuevos
            if (!oldChat || lastMsg?.id !== oldChat.messages?.[0]?.id) {
              hasNewMessages = true;
            }

            // Si el bot está apagado Y el mensaje es nuevo Y es del usuario Y NO ha sido notificado
            if (oldChat && !newChat.botActive && lastMsg && lastMsg.id !== oldChat.messages?.[0]?.id && lastMsg.role === 'user' && !notifiedMessageIds.current.has(lastMsg.id)) {

              notifiedMessageIds.current.add(lastMsg.id); // Marcar como notificado

              const toast = {
                id: Date.now() + Math.random(),
                name: newChat.lead?.name || 'Cliente',
                text: lastMsg.content,
                chatId: newChat.id
              };
              setNotifications(n => [...n, toast]);
              audioRef.current?.play().catch(() => { });

              // Auto-eliminar notificación después de 10 segundos
              setTimeout(() => {
                setNotifications(n => n.filter(item => item.id !== toast.id));
              }, 10000);
            }
          });

          // Ajustar polling interval según si hay nuevos mensajes
          if (hasNewMessages) {
            pollIntervalRef.current = 3000;
          } else {
            // Incrementar progresivamente: 3s -> 5s -> 10s
            if (pollIntervalRef.current === 3000) {
              pollIntervalRef.current = 5000;
            } else if (pollIntervalRef.current === 5000) {
              pollIntervalRef.current = 10000;
            }
          }

          // FORZAMOS LOS DATOS DEL SERVIDOR SI NO HAY OPTIMISMO PENDIENTE
          if (pendingOptimistic.current.size === 0) {
            return latestChats;
          }
          return mergeChats(latestChats, prev, 'polling');
        });
      } catch (e) {
        // Silenciar errores de polling para no romper la app
      }

      // Programar el siguiente ciclo DESPUÉS de que termine este
      if (!cancelled) {
        setTimeout(syncData, pollIntervalRef.current);
      }
    };

    // Iniciar el primer ciclo después de 3 segundos
    const initialTimeout = setTimeout(syncData, pollIntervalRef.current);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
    };
  }, []);

  // Reiniciar intervalo de polling a 3s cuando hay actividad del usuario
  useEffect(() => {
    const handleUserActivity = () => {
      pollIntervalRef.current = 3000;
    };
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('focus', handleUserActivity);
    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('focus', handleUserActivity);
    };
  }, []);

  // Cargar detalle de un chat con CACHE para respuesta instantánea (paginado)
  const loadChatDetails = async (chatId: string) => {
    // En móvil, al seleccionar un chat cambiar a vista de conversación
    setMobileView('chat');
    // 0. Registrar el ID solicitado inmediatamente para evitar condiciones de carrera
    lastRequestedId.current = chatId;
    activeChatIdRef.current = chatId;

    // 1. Cambio instantáneo si ya tenemos los datos en cache
    if (chatsCache[chatId]) {
      setActiveChat(chatsCache[chatId]);
      setHasMoreMessages(chatsCache[chatId]?.hasMore ?? false);
    } else {
      setIsChatLoading(true);
    }

    try {
      // Usa la versión paginada: solo los últimos 30 mensajes
      const data = await getChatMessagesPaginated(chatId, 30);

      if (lastRequestedId.current === chatId) {
        setChatsCache(prev => ({ ...prev, [chatId]: data }));
        setActiveChat(data);
        setHasMoreMessages(data?.hasMore ?? false);

        const lastId = data?.messages?.[data.messages.length - 1]?.id;
        if (lastId) {
          setReadMessageIds(prev => ({ ...prev, [chatId]: lastId }));
        }
      }
    } catch (error) {
      console.error("Error al cargar chat:", error);
    } finally {
      if (lastRequestedId.current === chatId) {
        setIsChatLoading(false);
      }
    }
  };

  // Carga mensajes anteriores al hacer scroll hacia arriba
  const handleLoadMoreMessages = async () => {
    if (!activeChat || isLoadingMore || !hasMoreMessages) return;
    const firstMsg = activeChat.messages?.[0];
    if (!firstMsg) return;

    const container = messagesScrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    setIsLoadingMore(true);
    try {
      const older = await loadMoreMessages(activeChat.id, firstMsg.createdAt, 30);
      if (older && older.length > 0) {
        setActiveChat((prev: any) => {
          if (!prev) return prev;
          const newMessages = [...older, ...prev.messages];
          const newHasMore = (prev.totalMessages ?? 0) > newMessages.length;
          setHasMoreMessages(newHasMore);
          return { ...prev, messages: newMessages, hasMore: newHasMore };
        });

        // Double rAF: first frame queues the paint, second fires after DOM is updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
            }
          });
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (e) {
      console.error('Error loading more messages:', e);
    } finally {
      setIsLoadingMore(false);
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
    } catch (error: any) {
      console.error(error);
      alert('Error al cambiar el estado del bot: ' + (error?.message || 'Error desconocido'));
      // Revertir si falla en ambas listas
      setActiveChat((prev: any) => prev?.id === chatId ? { ...prev, botActive: !newStatus } : prev);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, botActive: !newStatus } : c));
    } finally {
      // Desbloqueamos el polling después de un pequeño delay para asegurar consistencia
      setTimeout(() => {
        pendingOptimistic.current.delete('toggle-' + chatId);
      }, 2000);
    }
  };

  const handleToggleAutoWake = async () => {
    if (!activeChat) return;
    const newStatus = !activeChat.autoWakeBot;
    const chatId = activeChat.id;

    setActiveChat((prev: any) => prev?.id === chatId ? { ...prev, autoWakeBot: newStatus } : prev);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, autoWakeBot: newStatus } : c));
    pendingOptimistic.current.add('toggle-autowake-' + chatId);

    try {
      await toggleAutoWakeBot(chatId, newStatus);
    } catch (error: any) {
      console.error(error);
      alert('Error al cambiar la reactivación automática: ' + (error?.message || 'Error desconocido'));
      setActiveChat((prev: any) => prev?.id === chatId ? { ...prev, autoWakeBot: !newStatus } : prev);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, autoWakeBot: !newStatus } : c));
    } finally {
      setTimeout(() => {
        pendingOptimistic.current.delete('toggle-autowake-' + chatId);
      }, 2000);
    }
  };

  // Delete Chat
  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Pulso de tamaño y brillo sin bordes
      element.classList.add('scale-[1.02]', 'brightness-125', 'z-50');
      setTimeout(() => {
        element.classList.remove('scale-[1.02]', 'brightness-125', 'z-50');
      }, 800);
    }
  };

  const renderMessageContent = (content: string, allMessages: any[]) => {
    // Buscar si hay un bloque "[En respuesta a: "..."]" en cualquier parte del mensaje
    const replyRegex = /\[En respuesta a:\s*"([^"]+)"\]\n?/;
    const match = content.match(replyRegex);

    if (match) {
      const repliedText = match[1];
      // Remover el tag de la respuesta del texto principal
      const actualMessage = content.replace(match[0], '').trim();

      // Intentar encontrar el mensaje original para el link
      const originalMsg = allMessages.find(m => m.content === repliedText);

      return (
        <div className="space-y-2">
          <div
            onClick={() => originalMsg && scrollToMessage(originalMsg.id)}
            className={`group p-2.5 mb-1 rounded-xl bg-black/5 dark:bg-black/30 text-[11px] transition-all relative overflow-hidden ${originalMsg ? 'cursor-pointer hover:bg-black/10 dark:hover:bg-black/50' : 'opacity-70'
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-black text-[9px] uppercase tracking-tighter text-[#F36A2D]">En respuesta a:</div>
              {originalMsg && <div className="text-[8px] font-bold text-[#F36A2D] opacity-0 group-hover:opacity-100 transition-opacity">IR AL MENSAJE ↑</div>}
            </div>
            <div className="line-clamp-2 italic opacity-80 leading-snug">
              {repliedText}
            </div>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatWhatsAppText(actualMessage) }}></div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatWhatsAppText(content) }}></div>;
  };

  const startRecording = async () => {
    try {
      // Activar UI inmediatamente para que no se sienta lag
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // WhatsApp acepta: audio/ogg (opus), audio/mp4, audio/aac, audio/mpeg, audio/amr
      // audio/webm NO está soportado por WhatsApp → usar ogg/opus o mp4
      const preferredMimeTypes = [
        'audio/ogg; codecs=opus',
        'audio/mp4',
        'audio/webm; codecs=opus',
        'audio/webm',
      ];
      const supportedMime = preferredMimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      const actualMime = recorder.mimeType || supportedMime || 'audio/webm';

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        if (audioBlob.size > 0) {
          await handleSendVoiceNote(audioBlob, actualMime, recordingTimeRef.current);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err) {
      setIsRecording(false);
      console.error("Error al acceder al micrófono:", err);
      alert("No se pudo acceder al micrófono. Por favor, revisa los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current!);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const MAX_FILE_SIZE_MB = 10;
  const MAX_VOICE_SIZE_MB = 5;

  const handleSendVoiceNote = async (blob: Blob, mimeType?: string, elapsedSeconds: number = 0) => {
    if (!activeChat) return;

    // Validar tamaño antes de subir
    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > MAX_VOICE_SIZE_MB) {
      alert(`La nota de voz es muy larga (${sizeMB.toFixed(1)} MB). El límite es ${MAX_VOICE_SIZE_MB} MB. Graba un mensaje más corto.`);
      return;
    }

    // Determinar extensión según el mime type real del recorder
    const mime = mimeType || blob.type || 'audio/ogg';
    let ext = 'ogg';
    if (mime.includes('mp4')) ext = 'mp4';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';

    const fileName = `voice-note-${Date.now()}.${ext}`;
    const chatId = activeChat.id;
    const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;
    const voiceNoteCaption = `Mensaje de voz (${formattedTime})`;

    // UI optimista: mostrar la burbuja con relojito INMEDIATAMENTE
    const tempId = 'temp-voice-' + Date.now();
    const localUrl = URL.createObjectURL(blob);
    pendingOptimistic.current.add(tempId);
    setActiveChat((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, {
          id: tempId,
          role: 'agent',
          content: voiceNoteCaption,
          mediaUrl: localUrl,
          mediaType: 'audio',
          mediaFilename: fileName,
          createdAt: new Date().toISOString(),
          status: 'pending',
          sendError: null,
        }]
      };
    });

    setIsUploadingMedia(true);
    try {
      const file = new File([blob], fileName, { type: mime });
      const formData = new FormData();
      formData.append('file', file);

      const uploadResult = await uploadFileAction(formData);
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error((uploadResult as any).error || 'Error al subir el audio');
      }

      const result = await sendAgentMedia(chatId, uploadResult.url, 'audio', fileName, voiceNoteCaption);

      // Actualizar el mensaje optimista con el resultado real
      setActiveChat((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m: any) =>
            m.id === tempId
              ? { ...m, mediaUrl: uploadResult.url, status: result.success ? 'sent' : 'failed', sendError: result.error || null }
              : m
          )
        };
      });
    } catch (err: any) {
      console.error("Error enviando nota de voz:", err);
      setActiveChat((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m: any) =>
            m.id === tempId ? { ...m, status: 'failed', sendError: err.message || 'Error al enviar' } : m
          )
        };
      });
    } finally {
      setIsUploadingMedia(false);
      setTimeout(() => { pendingOptimistic.current.delete(tempId); }, 5000);
    }
  };

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


  // 2. Simular que el CLIENTE envía un mensaje por WhatsApp al chat actual (CON DEBOUNCE)
  const handleClientSubmit = async () => {
    if (!clientInput.trim() || !activeChat) return;
    
    const msg = clientInput.trim();
    const phone = activeChat.lead.phone;
    const chatId = activeChat.id;
    setClientInput('');

    // 1. Acumular mensaje
    clientPendingMessages.current.push(msg);

    // 2. Mostrar mensaje optimista en el chat (opcional, pero ayuda al feedback)
    // simulateIncomingMessage ya lo guarda en BD, pero queremos que sea instantáneo en UI
    // En el simulador de inbox, mejor esperamos al timer para no duplicar si el polling ocurre
    
    // 3. Reiniciar timer de 6 segundos (mismo que WhatsApp)
    if (clientDebounceTimer.current) {
      clearTimeout(clientDebounceTimer.current);
    }

    clientDebounceTimer.current = setTimeout(async () => {
      // Limpiar referencia al timer una vez disparado
      clientDebounceTimer.current = null;
      
      if (clientPendingMessages.current.length === 0) return;

      const combinedText = clientPendingMessages.current.join('\n');
      clientPendingMessages.current = [];
      
      setIsSimulating(true);
      try {
        await simulateIncomingMessage(phone, combinedText);
        const chatDetails = await getChatMessages(chatId);

        if (chatDetails?.botActive) {
          const history = chatDetails.messages.slice(0, -1);
          const botData = await sendTestMessage(
            combinedText,
            history.map((m: any) => ({ role: m.role, content: m.content })),
            chatDetails.lead.name || undefined,
            undefined,
            undefined,
            chatDetails.lead.metadata
          );

          if (botData && typeof botData !== 'string' && botData.reply) {
            await saveAssistantReply(
              chatId,
              botData.reply,
              botData.scoreBump,
              botData.inputTokens,
              botData.outputTokens,
              'SERVICE',
              botData.agentName,
              botData.scoreReason
            );

            if (botData.isHandoff) {
              await requestHandoff(chatId);
            }
          }
        }
        await loadChats();
      } catch (error: any) {
        console.error(error);
      } finally {
        setIsSimulating(false);
      }
    }, 6000);
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
      status: 'pending',
      sendError: null as string | null,
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
        const result = await saveAgentMessage(chatId, msgContent);

        if (result.success) {
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
        } else {
          // Marcar como FALLIDO → aparece ⚠ con el error de Meta
          setActiveChat((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m: any) =>
                m.id === temporaryId ? { ...m, status: 'failed', sendError: result.error } : m
              )
            };
          });
        }

        // Damos 5 segundos de margen para que el polling de 3s encuentre el mensaje real en la DB
        setTimeout(() => {
          pendingOptimistic.current.delete(temporaryId);
          syncChatsList();
        }, 5000);

      } catch (error) {
        console.error(error);
        pendingOptimistic.current.delete(temporaryId);
        // Eliminar el mensaje optimista si falló completamente (error de red, etc.)
        setActiveChat((prev: any) => {
          if (!prev) return prev;
          return { ...prev, messages: prev.messages.filter((m: any) => m.id !== temporaryId) };
        });
      }
    })();
  };

  // Seleccionar archivo adjunto
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño antes de aceptar el archivo
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      alert(`El archivo "${file.name}" es demasiado grande (${sizeMB.toFixed(1)} MB). El límite es ${MAX_FILE_SIZE_MB} MB. Por favor elige un archivo más pequeño.`);
      e.target.value = '';
      return;
    }

    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      setPendingFilePreview(URL.createObjectURL(file));
    } else {
      setPendingFilePreview(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Enviar archivo multimedia como agente
  const handleMediaSend = async () => {
    if (!pendingFile || !activeChat || activeChat.botActive) return;
    setIsUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      const uploadResult = await uploadFileAction(formData);

      if (!uploadResult.success || !uploadResult.url) {
        alert('Error al subir el archivo: ' + (uploadResult as any).error);
        return;
      }

      const { url, mediaType, filename } = uploadResult as any;
      const caption = agentInput.trim() || undefined;
      const chatId = activeChat.id;

      // Optimistic UI
      const tempId = 'temp-media-' + Date.now();
      const isImage = mediaType === 'image';
      pendingOptimistic.current.add(tempId);
      setActiveChat((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, {
            id: tempId,
            role: 'agent',
            content: caption || filename,
            imageUrl: isImage ? url : null,
            createdAt: new Date().toISOString(),
            status: 'pending',
            _mediaType: mediaType,
            _mediaUrl: url,
            _filename: filename,
          }]
        };
      });

      // Limpiar UI inmediatamente
      setPendingFile(null);
      setPendingFilePreview(null);
      setAgentInput('');

      // Enviar en background
      const result = await sendAgentMedia(chatId, url, mediaType, filename, caption);

      setActiveChat((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m: any) =>
            m.id === tempId ? { ...m, status: result.success ? 'sent' : 'failed', sendError: result.error } : m
          )
        };
      });

      setTimeout(() => { pendingOptimistic.current.delete(tempId); }, 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRefreshSummary = async () => {
    if (!activeChat) return;
    setIsRefreshingSummary(true);
    try {
      const newSummary = await updateLeadAISummary(activeChat.id, true);
      if (newSummary) {
        setActiveChat((prev: any) => ({
          ...prev,
          lead: { ...prev.lead, aiSummary: newSummary }
        }));
      }
    } catch (err) {
      console.error("Error refreshing summary", err);
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Extraer todas las campañas disponibles para el filtro
  const availableCampaigns = useMemo(() => {
    const campaignsMap = new Map<string, string>();
    chats.forEach(chat => {
      if (chat.lead?.allCampaigns) {
        chat.lead.allCampaigns.forEach((camp: any) => {
          campaignsMap.set(camp.id, camp.name);
        });
      }
    });
    return Array.from(campaignsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [chats]);

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

      if (filterStatus === 'UNANSWERED') {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const isUnanswered = !chat.botActive && lastMsg?.role === 'user';
        if (!isUnanswered) return false;
      }
    }

    // Filtrar por campaña
    if (filterCampaign !== 'ALL') {
      const inCampaign = chat.lead?.allCampaigns?.some((camp: any) => camp.id === filterCampaign);
      if (!inCampaign) return false;
    }

    // Búsqueda por nombre o teléfono
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = chat.lead.name?.toLowerCase().includes(q);
      const phoneMatch = chat.lead.phone.includes(q);
      if (!nameMatch && !phoneMatch) return false;
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
    <div className="flex flex-1 h-full w-full bg-[#E9E4D8] dark:bg-[#1A1714] min-w-0 min-h-0 overflow-hidden">
      {/* 1. SIDEBAR DE CHATS */}
      {/* Desktop: controlado por isInboxSidebarOpen | Móvil: pantalla completa solo si mobileView === 'list' */}
      <div className={`shrink-0 border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-[#DEDAD0]/50 dark:bg-[#141210] flex flex-col transition-all duration-300 ease-in-out min-h-0 overflow-hidden
        ${isInboxSidebarOpen ? 'md:w-[300px]' : 'md:w-0 md:opacity-0 md:pointer-events-none'}
        ${mobileView === 'list' ? 'flex flex-1 md:flex-none w-full' : 'hidden md:flex'}
      `}>
        <div className="relative h-16 shrink-0 px-4 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex items-center justify-between bg-[#DEDAD0]/50 dark:bg-[#141210] min-w-[300px]">
          {/* Logo centrado en móvil */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden">
            <span className="font-black text-lg tracking-widest text-[#111111] dark:text-[#EDE9E0]">Abita <span className="text-[#F36A2D]">AI</span></span>
          </div>
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
          <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center justify-between w-full text-xs font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors"
          >
            <span className="flex items-center gap-2"><Search size={14} /> Filtros y Búsqueda</span>
            <ChevronDown size={14} className={`transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isFiltersOpen && (
            <div className="flex flex-col gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
              <select
                value={filterHeat}
                onChange={(e) => setFilterHeat(e.target.value as any)}
                className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg p-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#F36A2D]/50 shadow-sm"
              >
                <option value="ALL">Todas las temperaturas</option>
                <option value="CALIENTE">Caliente</option>
                <option value="TIBIO">Tibio</option>
                <option value="FRIO">Frío</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg p-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#F36A2D]/50 shadow-sm"
              >
                <option value="ALL">Todos los estados</option>
                <option value="BOT">IA Gestionando</option>
                <option value="NEEDS_AGENT">Necesita Humano</option>
                <option value="AGENT">En Atención Humana</option>
                <option value="UNANSWERED">No Contestados</option>
              </select>

              <select
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg p-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#F36A2D]/50 shadow-sm"
              >
                <option value="ALL">Todas las campañas</option>
                {availableCampaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>{camp.name}</option>
                ))}
              </select>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
                <input
                  type="text"
                  placeholder="Buscar nombre o tel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 text-xs rounded-lg pl-9 pr-3 py-2 text-[#111111] dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar w-full p-2 space-y-1 relative min-h-0">
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
              const isActive = activeChat?.id === chat.id;
              const isMultiSelected = selectedIds.has(chat.id);
              const isHandoff = chat.lead.status === 'NEEDS_AGENT';
              const isBot = chat.botActive;
              const lastMsg = chat.messages?.[0];

              // Lógica de estados
              const lastReadId = readMessageIds[chat.id];
              const isNewMessage = !isBot && lastMsg && lastMsg.id !== lastReadId && lastMsg.role === 'user';
              const isUnanswered = !isBot && lastMsg?.role === 'user' && !isNewMessage;
              const isAnsweredHuman = !isBot && lastMsg?.role === 'agent' && !isHandoff;

              // Si está activo, lo marcamos como leído en cada render (simplificación)
              if (isActive && lastMsg?.id && lastReadId !== lastMsg.id) {
                setTimeout(() => setReadMessageIds(prev => ({ ...prev, [chat.id]: lastMsg.id })), 0);
              }

              return (
                <div key={chat.id} className="relative group">
                  <button
                    onClick={() => { if (selectedIds.size > 0) toggleSelect(chat.id, { stopPropagation: () => { } } as any); else loadChatDetails(chat.id); }}
                    className={`w-full text-left p-2.5 pl-4 rounded-2xl transition-all duration-200 flex items-center gap-4 border shadow-sm ${isMultiSelected
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600'
                      : isActive
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 z-10'
                        : isHandoff
                          ? 'bg-red-50 dark:bg-red-900/40 border-red-500 dark:border-red-400 shadow-red-100'
                          : isNewMessage
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-400 ring-1 ring-emerald-500/20'
                            : isUnanswered
                              ? 'bg-white dark:bg-zinc-900 border-emerald-500 dark:border-emerald-400/50'
                              : 'bg-white/50 dark:bg-black/10 border-[#DEDAD0] dark:border-zinc-800'
                      }`}
                  >
                    {/* Avatar / Canal / Selector */}
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleSelect(chat.id, e); }}
                      className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 transition-all cursor-pointer relative overflow-hidden group/avatar ${isMultiSelected
                          ? 'bg-orange-600 border-orange-600 text-white scale-105'
                          : chat.lead.channel === 'instagram'
                            ? 'bg-pink-50 border-white text-pink-500 dark:bg-pink-900/40 dark:border-zinc-800 hover:border-orange-500'
                            : chat.lead.channel === 'simulator'
                              ? 'bg-orange-50 border-white text-orange-500 dark:bg-orange-950/40 dark:border-zinc-800 hover:border-orange-500'
                              : 'bg-[#25D366]/10 border-white text-[#25D366] dark:bg-[#25D366]/20 dark:border-zinc-800 hover:border-orange-500'
                        }`}
                    >
                      {isMultiSelected ? (
                        <Check size={24} strokeWidth={3} className="animate-in zoom-in-50 duration-200" />
                      ) : (
                        <>
                          <div className="transition-all duration-200 group-hover/avatar:opacity-0 group-hover/avatar:scale-50 opacity-100">
                             {chat.lead.channel === 'instagram' ? <IgIcon size={22} /> : chat.lead.channel === 'simulator' ? <SimIcon size={22} /> : <WaIcon size={22} />}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-50 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 text-orange-600">
                            <Check size={20} strokeWidth={3} />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                      <div className="flex justify-between items-center w-full gap-2">
                        <span 
                          className={`truncate text-sm ${isNewMessage || isUnanswered || isHandoff ? 'font-black text-[#111111] dark:text-[#EDE9E0]' : 'font-semibold text-[#111111]/70 dark:text-[#EDE9E0]/70'}`}
                          title={chat.lead.name || chat.lead.phone}
                        >
                          {chat.lead.name || chat.lead.phone}
                        </span>
                        <span className="text-[10px] text-[#6F6F6F] font-medium shrink-0">
                          {formatSidebarDate(new Date(chat.lastActiveAt))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1 text-xs line-clamp-1 ${isNewMessage || isUnanswered || isHandoff ? 'text-[#111111] dark:text-white font-bold' : 'text-[#6F6F6F]'}`}>
                          {lastMsg && (lastMsg.role === 'agent' || lastMsg.role === 'assistant') && (
                            <div className="shrink-0">
                              {(lastMsg.status === 'failed' || lastMsg.status === 'FAILED') ? (
                                <AlertCircle size={12} className="text-red-500" />
                              ) : lastMsg.status === 'pending' ? (
                                <Clock size={12} className="opacity-60" />
                              ) : (lastMsg.status === 'SENT' || lastMsg.status === 'sent') ? (
                                <Check size={12} className="opacity-60 text-zinc-500" />
                              ) : lastMsg.status === 'DELIVERED' ? (
                                <CheckCheck size={12} className="opacity-60 text-zinc-500" />
                              ) : lastMsg.status === 'READ' ? (
                                <CheckCheck size={12} className="text-blue-500" />
                              ) : (
                                <Check size={12} className="opacity-60" />
                              )}
                            </div>
                          )}
                          <span className="truncate">
                            {lastMsg ? (
                              lastMsg.mediaType === 'audio' 
                                ? (lastMsg.content && lastMsg.content.startsWith('Mensaje de voz') ? lastMsg.content : 'Mensaje de voz') 
                                : lastMsg.content
                            ) : <span className="italic opacity-50 text-[10px]">Sin mensajes</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isBot ? (
                            <Bot size={12} className="text-[#F36A2D]" />
                          ) : isHandoff ? (
                            <AlertCircle size={12} className="text-red-500 animate-pulse" />
                          ) : isNewMessage ? (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" />
                          ) : (
                            <User size={11} className="text-emerald-500/50" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        {chat.lead.project?.leadScoringEnabled !== false && (
                          <>
                            {chat.lead.heat === 'CALIENTE' && <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0">🔥 {chat.lead.score}</span>}
                            {chat.lead.heat === 'TIBIO' && <span className="text-[9px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-1 shrink-0"><TrendingUp size={9} /> {chat.lead.score}</span>}
                            {(!chat.lead.heat || chat.lead.heat === 'FRIO') && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0">❄️ {chat.lead.score || 0}</span>}
                          </>
                        )}

                        {isHandoff && (
                          <WaitTimer startTime={chat.lastActiveAt} />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 2. VENTANA DE CHAT CENTRAL */}
      {/* Desktop: siempre visible | Móvil: solo si mobileView === 'chat' */}
      <div className={`flex-1 min-w-0 flex-col bg-white dark:bg-[#1A1714]
        ${mobileView === 'chat' ? 'flex fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto' : 'hidden md:flex relative'}
      `}>
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
          <div className="h-full flex flex-col items-center justify-center bg-[#E9E4D8]/30 dark:bg-black/20 text-[#6F6F6F]">
            <div className="bg-[#111111] dark:bg-[#E9E4D8] p-4 rounded-3xl shadow-xl mb-6 flex items-center justify-center">
              <MessageSquare size={36} className="text-[#F36A2D]" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-[#111111] dark:text-[#EDE9E0] mb-2">Bandeja de Entrada</h3>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
          </div>
        ) : (
          <>
            <header className="h-16 px-4 md:px-6 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex items-center justify-between shrink-0 bg-[#E9E4D8]/80 dark:bg-[#111111]/10 backdrop-blur-md">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                {/* Botón volver: solo en móvil */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500 transition-colors shrink-0"
                  title="Volver"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                {/* Toggle panel izquierdo: solo en desktop */}
                <button
                  onClick={() => setIsInboxSidebarOpen(!isInboxSidebarOpen)}
                  className="hidden md:block p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
                >
                  {isInboxSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
                <div className="min-w-0 flex-1">
                  <h2 
                    className="font-semibold text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { if (window.innerWidth < 768) setMobileView('profile'); }}
                  >
                    <span className="truncate">{activeChat.lead.name}</span>
                  </h2>
                  <p className="text-xs text-[#6F6F6F] truncate flex items-center gap-2 mt-0.5">
                     <span>{activeChat.lead.phone}</span>
                     <span className="text-[9px] bg-[#EDE9E0] dark:bg-zinc-800 text-[#6F6F6F] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 font-mono border border-[#DEDAD0] dark:border-zinc-700">
                      {activeChat.lead.channel === 'instagram' ? <IgIcon size={10} /> : activeChat.lead.channel === 'simulator' ? <SimIcon size={10} /> : <WaIcon size={10} />}
                      <span className="hidden md:inline">{activeChat.lead.channel === 'instagram' ? 'Instagram' : activeChat.lead.channel === 'simulator' ? 'Simulador' : 'WhatsApp'}</span>
                    </span>
                  </p>
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
                <span className="text-sm font-medium text-[#6F6F6F]">IA</span>
                <button
                  onClick={() => setIsBotConfirmModalOpen(true)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${activeChat.botActive ? 'bg-[#F36A2D]' : 'bg-[#DEDAD0] dark:bg-zinc-700'
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeChat.botActive ? 'translate-x-[22px]' : 'translate-x-1'
                    }`} />
                </button>
                {/* Botón perfil: solo en desktop */}
                <div className="hidden md:block w-px h-6 bg-[#DEDAD0] dark:bg-zinc-800 mx-1"></div>
                <button
                  onClick={() => setIsProfileSidebarOpen(!isProfileSidebarOpen)}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${isProfileSidebarOpen
                    ? 'bg-[#F36A2D] text-white border-[#F36A2D] shadow-sm shadow-[#F36A2D]/20'
                    : 'bg-white dark:bg-zinc-900 text-[#6F6F6F] border-[#DEDAD0] dark:border-zinc-800 hover:border-[#F36A2D] hover:text-[#F36A2D]'
                    }`}
                  title={isProfileSidebarOpen ? "Cerrar Perfil" : "Ver Perfil"}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider">Perfil</span>
                  {isProfileSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                </button>
              </div>
            </header>

            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4" onScroll={(e) => {
              if (e.currentTarget.scrollTop < 120 && hasMoreMessages && !isLoadingMore) {
                handleLoadMoreMessages();
              }
            }}>
              {/* Sentinel de "cargar más" */}
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-xs text-[#6F6F6F]">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Cargando historial...</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleLoadMoreMessages}
                      className="text-xs text-[#F36A2D] hover:underline font-medium"
                    >
                      Cargar mensajes anteriores
                    </button>
                  )}
                </div>
              )}
              {activeChat.messages?.map((msg: any, idx: number) => {
                const isUser = msg.role === 'user';
                const isBot = msg.role === 'assistant';
                const isAgent = msg.role === 'agent';

                const isSystem = msg.role === 'system';

                const currentMsgDate = new Date(msg.createdAt);
                const prevMsgDate = idx > 0 ? new Date(activeChat.messages[idx - 1].createdAt) : null;
                const showDateHeader = !prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString();

                if (isSystem) {
                  return (
                    <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-500 rounded-2xl">
                      {showDateHeader && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700/50">
                            {formatDateLabel(currentMsgDate)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1.5 text-[11px] font-medium text-[#6F6F6F] bg-zinc-100 dark:bg-zinc-800/50 rounded-lg flex items-center gap-1.5 border border-zinc-200/50 dark:border-zinc-700/30">
                          <Bot size={12} className="text-[#F36A2D]" />
                          {msg.content}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-500 rounded-2xl">
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
                        } ${msg.status === 'pending' ? 'opacity-70' : 'opacity-100'} ${(msg.status === 'failed' || msg.status === 'FAILED') ? 'ring-2 ring-red-500/50 bg-red-950/20 text-red-100' : ''}`}>

                        {(isBot || isAgent) && msg.agentName && (
                          <div className={`absolute -top-5 ${isBot ? 'right-1' : 'left-1'} flex items-center gap-1`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isBot ? 'text-white/70' : 'text-zinc-500'}`}>{msg.agentName}</span>
                          </div>
                        )}

                        {msg.scoreBump && (
                          <div className="absolute -top-10 right-0 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 px-3 py-1 rounded-full shadow-lg animate-in fade-in zoom-in duration-300 z-10">
                            <div className="px-2 py-0.5 bg-emerald-500 rounded-full text-[10px] text-white font-black">
                              +{msg.scoreBump}
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider whitespace-nowrap">
                              {msg.scoreReason || 'Mejora de Score'}
                            </span>
                          </div>
                        )}

                        {/* 1. Bloque de respuesta (si existe) */}
                        {msg.content && msg.content.includes('[En respuesta a:') && (
                          (() => {
                            const replyRegex = /\[En respuesta a:\s*"([^"]+)"\]\n?/;
                            const match = msg.content.match(replyRegex);
                            if (match) {
                              const repliedText = match[1];
                              const originalMsg = activeChat.messages.find((m: any) => m.content === repliedText);
                              return (
                                <div
                                  onClick={() => originalMsg && scrollToMessage(originalMsg.id)}
                                  className={`group p-2.5 mb-2 rounded-xl bg-black/5 dark:bg-black/30 text-[11px] transition-all relative overflow-hidden ${originalMsg ? 'cursor-pointer hover:bg-black/10 dark:hover:bg-black/50' : 'opacity-70'}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="font-black text-[9px] uppercase tracking-tighter text-[#F36A2D]">En respuesta a:</div>
                                    {originalMsg && <div className="text-[8px] font-bold text-[#F36A2D] opacity-0 group-hover:opacity-100 transition-opacity">IR AL MENSAJE ↑</div>}
                                  </div>
                                  <div className="line-clamp-2 italic opacity-80 leading-snug">{repliedText}</div>
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}

                        {/* 2. Imagen / Thumbnail */}
                        {(msg.mediaUrl || msg.imageUrl) && (msg.mediaType === 'image' || !msg.mediaType) && (
                          <div
                            className="mb-2 rounded-lg overflow-hidden border border-white/10 shadow-sm leading-[0] cursor-pointer relative z-10"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(msg.mediaUrl || msg.imageUrl); }}
                          >
                            <img
                              src={msg.mediaUrl || msg.imageUrl}
                              alt="Adjunto"
                              onLoad={() => scrollToBottom(true)}
                              className="w-full h-auto max-h-[300px] object-cover hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}

                        {/* 3. Audio adjunto */}
                        {msg.mediaUrl && msg.mediaType === 'audio' && (
                          <div className="mb-2 w-full pt-1">
                            <VoiceNotePlayer url={msg.mediaUrl} variant={isUser ? 'user' : isBot ? 'bot' : 'agent'} avatarUrl={userAvatarUrl} />
                          </div>
                        )}

                        {/* 4. Otros documentos */}
                        {msg.mediaUrl && msg.mediaType !== 'image' && msg.mediaType !== 'audio' && (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-2 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
                          >
                            <FileText size={16} className="shrink-0 opacity-80" />
                            <span className="text-xs font-semibold truncate">{msg.mediaFilename || 'Ver archivo'}</span>
                          </a>
                        )}

                        {/* 5. Contenido del mensaje (sin el tag de respuesta) */}
                        {msg.content && msg.content !== '[Archivo]' && msg.content !== '[Archivo enviado por IA]' && msg.content !== msg.mediaFilename && msg.mediaType !== 'audio' && !(msg.role === 'assistant' && msg.mediaUrl) && (
                          <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatWhatsAppText(msg.content.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').trim()) }}>
                          </div>
                        )}

                        {/* 6. Badge de respuesta de botón (mensajes entrantes del usuario) */}
                        {isUser && msg.mediaType === 'button_reply' && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 dark:bg-black/20 rounded-full text-[10px] font-bold border border-white/30 dark:border-white/10">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                              Botón presionado
                            </div>
                          </div>
                        )}

                        {/* 7. Botones quick-reply de la template (mensajes salientes) */}
                        {(isAgent || isBot) && msg.buttonsConfig && (() => {
                          try {
                            const buttons: { text: string; type: string }[] = JSON.parse(msg.buttonsConfig);
                            if (buttons.length === 0) return null;
                            return (
                              <div className="mt-3 pt-2 border-t border-white/20 flex flex-col gap-1.5">
                                {buttons.map((btn, i) => (
                                  <div
                                    key={i}
                                    className="px-3 py-1.5 text-center text-[11px] font-bold rounded-xl border border-white/30 bg-white/10 text-inherit opacity-80"
                                  >
                                    {btn.text}
                                  </div>
                                ))}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                        <div className={`absolute bottom-1 right-2 text-[9px] font-medium flex items-center gap-1 ${isUser ? 'text-[#6F6F6F]' : 'text-inherit'
                          }`}>
                          <span className="opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {(isAgent || isBot) && (msg.status === 'failed' || msg.status === 'FAILED' || msg.status === 'ERROR') && (
                            <AlertCircle size={10} className="text-red-400" />
                          )}
                          {(isAgent || isBot) && msg.status === 'pending' && (
                            <Clock size={10} className="opacity-60" />
                          )}
                          {(isAgent || isBot) && (msg.status === 'SENT' || msg.status === 'sent') && (
                            <Check size={10} className="opacity-60 text-zinc-500" />
                          )}
                          {(isAgent || isBot) && msg.status === 'DELIVERED' && (
                            <CheckCheck size={10} className="opacity-60 text-zinc-500" />
                          )}
                          {(isAgent || isBot) && msg.status === 'READ' && (
                            <CheckCheck size={10} className="text-blue-400 opacity-100 dark:text-blue-400" />
                          )}
                          {(isAgent || isBot) && !['failed', 'FAILED', 'ERROR', 'pending', 'SENT', 'sent', 'DELIVERED', 'READ'].includes(msg.status) && (
                            <Check size={10} className="opacity-60" />
                          )}
                        </div>
                      </div>
                      {/* Error banner debajo de la burbuja */}
                      {(msg.status === 'failed' || msg.status === 'FAILED') && msg.sendError && (
                        <div className="mt-1 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl max-w-full">
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle size={10} /> No se envió por WhatsApp
                          </p>
                          <p className="text-[10px] text-red-500 dark:text-red-400/80 mt-0.5 break-words">{msg.sendError}</p>
                        </div>
                      )}
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
            <div className="border-t border-[#DEDAD0] dark:border-zinc-800/60 bg-white/80 dark:bg-[#111111]/40 backdrop-blur-xl z-10 shrink-0 pb-4 md:pb-2">

              {/* AGENT INPUT */}
              {(() => {
                const isWhatsApp = activeChat.lead?.channel === 'whatsapp';
                const messages = activeChat.messages || [];
                const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
                const lastUserMsgDate = lastUserMsg ? new Date(lastUserMsg.createdAt).getTime() : 0;

                // Si es WhatsApp y (nunca ha enviado msj [0] o pasaron 24h)
                const msPassed = lastUserMsgDate ? Date.now() - lastUserMsgDate : 0;
                const isPast24h = isWhatsApp && (!lastUserMsgDate || msPassed > 24 * 60 * 60 * 1000);

                return (
                  <div className="px-4 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 bg-[#F8F5EE] dark:bg-[#1A1714]">
                    <div className="text-[10px] font-bold text-[#F36A2D] mb-2 flex items-center justify-between tracking-widest px-1">
                      <span>{isPast24h ? "SESIÓN EXPIRADA (> 24H)" : "AGENTE REAL (TU RESPUESTA)"}</span>
                      <User size={10} />
                    </div>

                    {/* Preview de archivo adjunto */}
                    {pendingFile && (
                      <div className="mb-2 flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-700 rounded-xl">
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

                    <div className="relative flex items-center gap-2">
                      {isPast24h && (
                        <button
                          onClick={() => setIsTemplateModalOpen(true)}
                          className="shrink-0 px-4 py-2.5 bg-[#F36A2D] text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <MessageSquare size={16} /> Ver Templates
                        </button>
                      )}

                      {!activeChat.botActive && !isPast24h && (
                        <>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,application/pdf,video/*,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            onChange={handleFileSelect}
                          />

                          {isRecording ? (
                            <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl px-4 py-2 animate-in fade-in zoom-in duration-300 h-[52px]">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-xs font-black text-red-600 dark:text-red-400 tabular-nums">
                                  {formatRecordingTime(recordingTime)}
                                </span>
                              </div>
                              <div className="flex-1 text-[11px] font-bold text-red-500/70 uppercase tracking-wider animate-pulse">
                                Grabando audio...
                              </div>
                              <button
                                onClick={cancelRecording}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                title="Cancelar"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={stopRecording}
                                className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center"
                                title="Detener y enviar"
                              >
                                <Send size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="shrink-0 p-2.5 bg-white dark:bg-zinc-800 border border-[#DEDAD0] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#F36A2D] hover:border-[#F36A2D] rounded-xl transition-all"
                                title="Adjuntar archivo"
                              >
                                <Paperclip size={16} />
                              </button>

                              <div className="relative" ref={emojiPickerRef}>
                                <button
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                  className={`shrink-0 p-2.5 border rounded-xl transition-all ${showEmojiPicker ? 'bg-[#F36A2D]/10 border-[#F36A2D] text-[#F36A2D]' : 'bg-white dark:bg-zinc-800 border-[#DEDAD0] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#F36A2D] hover:border-[#F36A2D]'}`}
                                  title="Insertar emoji"
                                >
                                  <Smile size={16} />
                                </button>

                                {showEmojiPicker && (
                                  <div className="absolute bottom-full left-0 mb-4 z-[70] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                                    <EmojiPicker
                                      onEmojiClick={(emojiData) => {
                                        setAgentInput(prev => prev + emojiData.emoji);
                                      }}
                                      theme={'auto' as any}
                                      lazyLoadEmojis={true}
                                      searchPlaceholder="Buscar emoji..."
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 relative flex items-center">
                                <textarea
                                  value={agentInput}
                                  onChange={(e) => setAgentInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      if (pendingFile) handleMediaSend();
                                      else handleAgentSubmit();
                                    }
                                  }}
                                  disabled={activeChat.botActive || isPast24h}
                                  placeholder={
                                    isPast24h
                                      ? "Envía un Template para abrirla."
                                      : activeChat.botActive
                                        ? "Desactiva la IA para responder"
                                        : pendingFile
                                          ? "Agrega un caption (opcional)..."
                                          : "Escribe una respuesta..."
                                  }
                                  className="w-full bg-[#E9E4D8]/50 dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl px-5 py-3 pr-12 min-h-[52px] max-h-32 resize-none outline-none disabled:opacity-50 transition-all focus:border-[#F36A2D] focus:ring-1 focus:ring-[#F36A2D]/40 text-sm text-[#111111] dark:text-white"
                                  rows={1}
                                />

                                {!activeChat.botActive && !isPast24h && (
                                  <div className="absolute right-2 flex items-center gap-1">
                                    {!agentInput.trim() && !pendingFile ? (
                                      <button
                                        onClick={startRecording}
                                        className="p-2 text-[#F36A2D] hover:bg-[#F36A2D]/10 rounded-xl transition-all"
                                        title="Grabar nota de voz"
                                      >
                                        <Mic size={20} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { if (pendingFile) handleMediaSend(); else handleAgentSubmit(); }}
                                        disabled={(!agentInput.trim() && !pendingFile) || isUploadingMedia}
                                        className="p-2 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center h-8 w-8 hover:scale-105 shadow-sm"
                                      >
                                        {isUploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {activeChat.botActive && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F] bg-[#DEDAD0]/30 dark:bg-zinc-800/20 py-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-800/40 opacity-80">
                        <Bot size={12} className="text-[#F36A2D]" />
                        Inteligencia Artificial Gestionando
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* 3. SIDEBAR DE PERFIL DE CONTACTO — solo en desktop */}
      <div
        className={`${mobileView === 'profile' ? 'flex w-full fixed inset-0 z-[60]' : 'hidden'} md:flex shrink-0 border-l border-[#DEDAD0] dark:border-zinc-800/60 bg-white dark:bg-[#1A1714] flex-col transition-all duration-300 ease-in-out relative overflow-hidden ${activeChat && isProfileSidebarOpen ? 'md:w-[300px]' : 'md:w-0 opacity-0 pointer-events-none border-l-0'
          }`}
      >
        {activeChat && (isProfileSidebarOpen || mobileView === 'profile') && (
          <div className="flex-1 w-full md:w-[300px] overflow-y-auto no-scrollbar pb-6 absolute inset-0">
            {/* Cabecera del perfil */}
            {mobileView === 'profile' && (
               <div className="md:hidden sticky top-0 bg-[#E9E4D8]/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 z-10 border-b border-[#DEDAD0] dark:border-zinc-800/60 flex items-center gap-2">
                 <button onClick={() => setMobileView('chat')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[#111111] dark:text-[#EDE9E0] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                 </button>
                 <span className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0]">Perfil del Contacto</span>
               </div>
            )}
            <div className="px-6 py-8 flex flex-col items-center justify-center border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/30 dark:bg-black/20">
              <div className="h-20 w-20 bg-[#111111] dark:bg-[#E9E4D8] rounded-full flex items-center justify-center text-[#F36A2D] font-black text-3xl shadow-xl mb-4 relative">
                {activeChat.lead.name?.[0]?.toUpperCase() || 'A'}
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1A1714] p-1 rounded-full shadow-sm">
                  {activeChat.lead.channel === 'instagram' ? <IgIcon size={16} className="text-pink-500" /> : activeChat.lead.channel === 'simulator' ? <SimIcon size={16} className="text-orange-500" /> : <WaIcon size={16} className="text-[#25D366]" />}
                </div>
              </div>
              <h2 className="font-bold text-lg text-[#111111] dark:text-[#EDE9E0] text-center px-4 leading-tight mb-1">
                {activeChat.lead.name || 'Sin Nombre'}
              </h2>
              <p className="text-sm font-medium text-[#6F6F6F] flex items-center gap-1.5">
                <Phone size={12} /> {activeChat.lead.phone}
              </p>
              {activeChat.lead.email && (
                <p className="text-xs font-medium text-[#6F6F6F] flex items-center gap-1.5 mt-1">
                  <Mail size={12} /> {activeChat.lead.email}
                </p>
              )}
            </div>

            <div className="p-5 space-y-6">

              {/* Score Section: Condicional según config */}
              {activeChat.lead.project?.leadScoringEnabled !== false && (
                <div>
                  <h3 className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-3">
                    <User size={12} /> Detalles
                  </h3>
                  <div className="bg-[#E9E4D8]/30 dark:bg-zinc-900/50 p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 space-y-4">
                    <div>
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-1">Temperatura</span>
                      <div className="flex items-center gap-2">
                        {activeChat.lead.heat === 'CALIENTE' && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Caliente 🔥</span>}
                        {activeChat.lead.heat === 'TIBIO' && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Tibio 📈</span>}
                        {(!activeChat.lead.heat || activeChat.lead.heat === 'FRIO') && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Frío ❄️</span>}
                        <span className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0]">Pts: {activeChat.lead.score}</span>
                      </div>
                    </div>
                    {/* Switch de Auto-Wake Bot */}
                    <div className="pt-3 border-t border-[#DEDAD0] dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase">Auto-Reactivar IA</span>
                      <button
                        onClick={handleToggleAutoWake}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          activeChat.autoWakeBot ? 'bg-[#F36A2D]' : 'bg-[#DEDAD0] dark:bg-zinc-700'
                        }`}
                        title={activeChat.autoWakeBot ? "Desactivar reactivación automática" : "Activar reactivación automática"}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          activeChat.autoWakeBot ? 'translate-x-[18px]' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Triggers de Score */}
                    {activeChat.messages?.some((m: any) => m.scoreBump) && (
                      <div className="pt-3 border-t border-[#DEDAD0] dark:border-zinc-800">
                        <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-2">Eventos de Interés</span>
                        <div className="space-y-2">
                          {activeChat.messages
                            .filter((m: any) => m.scoreBump)
                            .map((m: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-[#DEDAD0]/50 dark:border-zinc-800/50">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">+{m.scoreBump}</span>
                                <span className="text-[#111111] dark:text-[#EDE9E0] leading-tight">{m.scoreReason || 'Sin razón especificada'}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-[#DEDAD0] dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-0.5">Contactado</span>
                        <span className="text-xs font-medium text-[#111111] dark:text-[#EDE9E0]">
                          {new Date(activeChat.lead.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-0.5">Última Acc.</span>
                        <span className="text-xs font-medium text-[#111111] dark:text-[#EDE9E0]">
                          {new Date(activeChat.lastActiveAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback de layout si el score está apagado */}
              {activeChat.lead.project?.leadScoringEnabled === false && (
                <div>
                  <h3 className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-3">
                    <User size={12} /> Detalles Básicos
                  </h3>
                  <div className="bg-[#E9E4D8]/30 dark:bg-zinc-900/50 p-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-0.5">Contactado</span>
                      <span className="text-xs font-medium text-[#111111] dark:text-[#EDE9E0]">
                        {new Date(activeChat.lead.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-0.5">Última Acc.</span>
                      <span className="text-xs font-medium text-[#111111] dark:text-[#EDE9E0]">
                        {new Date(activeChat.lastActiveAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen de IA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2">
                    <Bot size={12} /> Resumen de IA
                  </h3>
                  <button
                    onClick={handleRefreshSummary}
                    disabled={isRefreshingSummary}
                    className={`p-1.5 rounded-lg transition-all ${isRefreshingSummary ? 'animate-spin text-[#F36A2D]' : 'text-[#6F6F6F] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#F36A2D]'}`}
                    title="Refrescar resumen"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                <div className="bg-[#F36A2D]/5 border border-[#F36A2D]/20 p-4 rounded-xl text-xs text-[#111111] dark:text-[#EDE9E0] leading-relaxed relative">
                  <Sparkles size={14} className="absolute top-2 right-2 text-[#F36A2D]/40" />
                  {activeChat.lead.aiSummary ? (
                    <span className="font-medium">{activeChat.lead.aiSummary}</span>
                  ) : (
                    <span className="text-[#6F6F6F] italic">No hay notas o IA no ha detectado suficiente información relevante.</span>
                  )}
                </div>
              </div>

              {/* Metadata Variables (Ej: De CSV de Campañas) */}
              {((activeChat.lead.metadata && Object.keys(activeChat.lead.metadata).length > 0 && typeof activeChat.lead.metadata === 'object') || activeChat.lead.latestCampaign) && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} /> Datos de Campaña / Extra
                  </h3>
                  <div className="space-y-2">
                    {/* Mostrar primero las campañas si existen */}
                    {activeChat.lead.allCampaigns && activeChat.lead.allCampaigns.length > 0 ? (
                      <div className="bg-[#F36A2D]/10 px-3 py-2.5 rounded-lg border border-[#F36A2D]/20 flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-wider">Campañas de Origen</span>
                        <div className="flex flex-col gap-1">
                          {activeChat.lead.allCampaigns.map((camp: any) => (
                            <span key={camp.id} className="text-[11px] font-bold text-[#F36A2D] flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-[#F36A2D]"></span>
                              {camp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : activeChat.lead.latestCampaign ? (
                      <div className="bg-[#F36A2D]/10 px-3 py-2.5 rounded-lg border border-[#F36A2D]/20 flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-wider">Campaña de Origen</span>
                        <span className="text-xs font-bold text-[#F36A2D] truncate">{activeChat.lead.latestCampaign.name}</span>
                      </div>
                    ) : null}

                    {/* Luego los demás datos de metadata */}
                    {activeChat.lead.metadata && Object.keys(activeChat.lead.metadata).length > 0 && typeof activeChat.lead.metadata === 'object' && Object.entries(activeChat.lead.metadata).map(([key, val]) => (
                      <div key={key} className="bg-[#E9E4D8]/30 dark:bg-zinc-900/50 px-3 py-2.5 rounded-lg border border-[#DEDAD0] dark:border-zinc-800 flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-[#6F6F6F] uppercase tracking-wider">{key}</span>
                        <span className="text-xs font-medium text-[#111111] dark:text-[#EDE9E0] truncate">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSuccess={(chatId) => {
          loadChats(chatId);
        }}
      />

      <NewChatModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        initialPhone={activeChat?.lead?.phone}
        initialLeadName={activeChat?.lead?.name || ''}
        onSuccess={(chatId) => {
          loadChats(chatId);
        }}
      />

      {/* Notificaciones Flotantes */}
      <div className="fixed top-20 right-8 z-[60] flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className="pointer-events-auto bg-white dark:bg-zinc-900 border border-[#DEDAD0] dark:border-zinc-800 shadow-2xl rounded-2xl p-4 w-72 animate-in slide-in-from-right-8 fade-in duration-500 cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              loadChatDetails(n.chatId);
              setNotifications(prev => prev.filter(item => item.id !== n.id));
            }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-600">NUEVO MENSAJE MANUAL</span>
            </div>
            <p className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] line-clamp-1">{n.name}</p>
            <p className="text-xs text-[#6F6F6F] line-clamp-2 mt-1 italic">"{n.text}"</p>
          </div>
        ))}
      </div>

      {/* Modal de Doble Verificación para Bot Active */}
      {isBotConfirmModalOpen && activeChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1714] w-full max-w-md rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl flex items-center justify-center ${activeChat.botActive ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                <Bot size={24} />
              </div>
              <button
                onClick={() => setIsBotConfirmModalOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#111111] dark:text-[#EDE9E0] mb-2">
              {activeChat.botActive ? '¿Desactivar Inteligencia Artificial?' : '¿Activar Inteligencia Artificial?'}
            </h3>

            <p className="text-sm text-[#6F6F6F] leading-relaxed mb-6">
              {activeChat.botActive ? (
                <>
                  Estás a punto de <strong>desactivar</strong> el bot para <strong className="text-[#111111] dark:text-[#EDE9E0]">{activeChat.lead?.name || activeChat.lead?.phone}</strong>. El bot dejará de responder automáticamente a los mensajes de este cliente.
                </>
              ) : (
                <>
                  Estás a punto de <strong>activar</strong> el bot para <strong className="text-[#111111] dark:text-[#EDE9E0]">{activeChat.lead?.name || activeChat.lead?.phone}</strong>. La IA responderá de forma automática a los mensajes entrantes de este cliente.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DEDAD0]/60 dark:border-zinc-800">
              <button
                onClick={() => setIsBotConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#6F6F6F] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsBotConfirmModalOpen(false);
                  handleToggleBot();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  activeChat.botActive
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-[#F36A2D] hover:bg-[#d9591d] shadow-[#F36A2D]/20'
                }`}
              >
                {activeChat.botActive ? 'Sí, desactivar bot' : 'Sí, activar bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagen */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-screen flex flex-col items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-[#F36A2D] transition-colors p-2"
              onClick={() => setSelectedImage(null)}
            >
              <XIcon size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()} 
            />
            <div className="mt-4 flex gap-4" onClick={(e) => e.stopPropagation()}>
              <a 
                href={selectedImage} 
                download 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 bg-[#F36A2D] hover:bg-[#F36A2D]/90 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg"
              >
                <Download size={18} /> Descargar Imagen
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
