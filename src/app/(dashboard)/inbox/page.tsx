'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot, User, Send, Loader2, Phone, Hash, AlertCircle, TrendingUp, Clock,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, Filter, Mail, Trash2, Archive,
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, MessageSquare, Check, CheckCheck,
  Paperclip, FileText, X as XIcon, Image as ImageIcon, Smile, Sparkles, RefreshCw, Download,
  Mic, Square, ChevronDown, LogOut, Camera, MapPin, ExternalLink, Navigation, ArrowUpRight,
  Reply
} from "lucide-react";
import { formatWhatsAppText } from '@/lib/utils';
import { useSidebarData } from '@/lib/client-cache/hooks';
import { getMemoryChats, setMemoryChats, getMemoryChatsMap, setMemoryChatDetail } from '@/lib/client-cache/inbox-memory';
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
import { getActiveChats, getChatMessages, getChatMessagesPaginated, loadMoreMessages, toggleBotActive, toggleAutoWakeBot, requestHandoff, simulateIncomingMessage, saveAssistantReply, saveAgentMessage, sendAgentMedia, sendAgentLocation, deleteChat, bulkArchiveChats, bulkDisableBot, bulkEnableBot } from "@/app/actions/inbox";
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
  const { data: sidebarData } = useSidebarData();
  const userAvatarUrl = sidebarData?.avatarUrl || null;
  const router = useRouter();

  // Inicializar inmediatamente con datos en memoria si existen (0ms de espera)
  const [chats, setChats] = useState<any[]>(() => getMemoryChats() || []);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(() => getMemoryChats() === null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Cache de chats abiertos para cambio instantáneo
  const [chatsCache, setChatsCache] = useState<Record<string, any>>(() => getMemoryChatsMap() || {});

  // Paginación de mensajes
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // States para los dos inputs mockeados
  const [clientInput, setClientInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const agentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Media attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
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

  // Estado para swipe-to-reply en móvil
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDirectionLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const hasTriggeredReplyHaptic = useRef<boolean>(false);

  // Refs para Debounce del Simulador de Cliente (Inbox)
  const clientPendingMessages = useRef<string[]>([]);
  const clientDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Refs para control de estado optimista y polling
  const pendingOptimistic = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);
  const lastRequestedId = useRef<string | null>(null);
  const pollIntervalRef = useRef(3000);

  // Estado para dropdown personalizado de filtros
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const filterDropdownContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar el Ref con el ID activo
  useEffect(() => {
    activeChatIdRef.current = activeChat?.id || null;
  }, [activeChat?.id]);

  // Cerrar emoji picker, attach menu y filter dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
      if (filterDropdownContainerRef.current && !filterDropdownContainerRef.current.contains(event.target as Node)) {
        setOpenFilterDropdown(null);
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
    // No hacer scroll al fondo si estamos cargando mensajes anteriores (scroll hacia arriba)
    if (isLoadingMore) return;
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
      setMemoryChatDetail(activeChat.id, activeChat);
    }
  }, [activeChat]);

  // Sincronizar memoria de chats en memoria para transiciones instantáneas entre páginas
  useEffect(() => {
    if (chats && chats.length > 0) {
      setMemoryChats(chats);
    }
  }, [chats]);

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

          // Ajustar polling interval: 15s si la pestaña está oculta, o progresivo si está visible
          if (typeof document !== 'undefined' && document.hidden) {
            pollIntervalRef.current = 15000;
          } else if (hasNewMessages) {
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
        console.error('[inbox][polling] Error al sincronizar datos:', e);
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
    // Limpiar estado de respuesta previa al cambiar de conversación
    setReplyingTo(null);
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

  // Desplaza suavemente hacia un mensaje y lo resalta visualmente
  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-[#FF4D00]', 'ring-offset-2', 'dark:ring-offset-black', 'scale-[1.02]', 'brightness-110', 'z-50', 'transition-all', 'duration-300');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[#FF4D00]', 'ring-offset-2', 'dark:ring-offset-black', 'scale-[1.02]', 'brightness-110', 'z-50');
      }, 1400);
    }
  };

  // Inicia la respuesta contextual a un mensaje específico
  const handleStartReply = (msg: any) => {
    if (activeChat?.botActive) {
      handleToggleBot();
    }
    setReplyingTo(msg);
    setTimeout(() => {
      agentTextareaRef.current?.focus();
    }, 60);
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
              <div className="font-black text-[9px] uppercase tracking-tighter text-[#FF4D00]">En respuesta a:</div>
              {originalMsg && <div className="text-[8px] font-bold text-[#FF4D00] opacity-0 group-hover:opacity-100 transition-opacity">IR AL MENSAJE ↑</div>}
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

    const replyTarget = replyingTo;
    setReplyingTo(null);

    const rawSnippet = replyTarget?.content || replyTarget?.mediaFilename || (replyTarget?.mediaType ? `[${replyTarget?.mediaType}]` : 'Mensaje');
    const cleanSnippet = rawSnippet ? rawSnippet.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').replace(/"/g, "'").slice(0, 100) : '';
    const replyPrefix = replyTarget ? `[En respuesta a: "${cleanSnippet}"]\n` : '';
    const optimisticContent = `${replyPrefix}${voiceNoteCaption}`;

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
          content: optimisticContent,
          mediaUrl: localUrl,
          mediaType: 'audio',
          mediaFilename: fileName,
          createdAt: new Date().toISOString(),
          status: 'pending',
          sendError: null,
          buttonsConfig: replyTarget ? JSON.stringify({
            replyTo: {
              id: replyTarget.id,
              wamid: replyTarget.wamid,
              role: replyTarget.role,
              content: cleanSnippet,
              mediaType: replyTarget.mediaType,
              mediaUrl: replyTarget.mediaUrl || replyTarget.imageUrl,
              mediaFilename: replyTarget.mediaFilename
            }
          }) : null
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

      const result = await sendAgentMedia(chatId, uploadResult.url, 'audio', fileName, voiceNoteCaption, replyTarget?.id);

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

  const [isSendingLocation, setIsSendingLocation] = useState(false);

  const handleSendLocation = async () => {
    if (!activeChat) return;
    setShowAttachMenu(false);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const replyTarget = replyingTo;
        setReplyingTo(null);

        const rawSnippet = replyTarget?.content || replyTarget?.mediaFilename || (replyTarget?.mediaType ? `[${replyTarget?.mediaType}]` : 'Mensaje');
        const cleanSnippet = rawSnippet ? rawSnippet.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').replace(/"/g, "'").slice(0, 100) : '';
        const replyPrefix = replyTarget ? `[En respuesta a: "${cleanSnippet}"]\n` : '';
        const optimisticContent = `${replyPrefix}`;

        const tempId = `temp-loc-${Date.now()}`;
        const chatId = activeChat.id;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        pendingOptimistic.current.add(tempId);
        setActiveChat((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, {
              id: tempId,
              role: 'agent',
              content: optimisticContent,
              mediaUrl: mapsUrl,
              mediaType: 'location',
              mediaFilename: JSON.stringify({ latitude, longitude, name: '', address: '' }),
              createdAt: new Date().toISOString(),
              status: 'pending',
              sendError: null,
              buttonsConfig: replyTarget ? JSON.stringify({
                replyTo: {
                  id: replyTarget.id,
                  wamid: replyTarget.wamid,
                  role: replyTarget.role,
                  content: cleanSnippet,
                  mediaType: replyTarget.mediaType,
                  mediaUrl: replyTarget.mediaUrl || replyTarget.imageUrl,
                  mediaFilename: replyTarget.mediaFilename
                }
              }) : null
            }]
          };
        });
        setTimeout(() => scrollToBottom(true), 50);

        try {
          const result = await sendAgentLocation(chatId, latitude, longitude, undefined, undefined, replyTarget?.id);
          setActiveChat((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m: any) =>
                m.id === tempId
                  ? { ...m, status: result.success ? 'sent' : 'failed', sendError: result.error || null }
                  : m
              )
            };
          });
          if (!result.success) {
            alert(result.error || "No se pudo enviar la ubicación por WhatsApp.");
          }
        } catch (err: any) {
          console.error("Error al enviar ubicación:", err);
          setActiveChat((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m: any) =>
                m.id === tempId ? { ...m, status: 'failed', sendError: err.message || 'Error al enviar' } : m
              )
            };
          });
          alert("Error al enviar ubicación: " + (err?.message || err));
        } finally {
          setIsSendingLocation(false);
          setTimeout(() => { pendingOptimistic.current.delete(tempId); }, 5000);
        }
      },
      (err) => {
        setIsSendingLocation(false);
        console.error("Error obteniendo geolocalización:", err);
        alert(`No se pudo obtener tu ubicación: ${err.message}. Asegúrate de permitir el acceso a tu ubicación en el navegador.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
    const replyTarget = replyingTo;

    // Limpiar input y estado de respuesta
    setAgentInput('');
    setReplyingTo(null);

    const rawSnippet = replyTarget?.content || replyTarget?.mediaFilename || (replyTarget?.mediaType ? `[${replyTarget?.mediaType}]` : 'Mensaje');
    const cleanSnippet = rawSnippet ? rawSnippet.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').replace(/"/g, "'").slice(0, 100) : '';
    const replyPrefix = replyTarget ? `[En respuesta a: "${cleanSnippet}"]\n` : '';
    const optimisticContent = `${replyPrefix}${msgContent}`;

    const temporaryId = 'temp-' + Date.now();
    const optimisticMessage = {
      id: temporaryId,
      role: 'agent',
      content: optimisticContent,
      createdAt: new Date().toISOString(),
      status: 'pending',
      sendError: null as string | null,
      buttonsConfig: replyTarget ? JSON.stringify({
        replyTo: {
          id: replyTarget.id,
          wamid: replyTarget.wamid,
          role: replyTarget.role,
          content: cleanSnippet,
          mediaType: replyTarget.mediaType,
          mediaUrl: replyTarget.mediaUrl || replyTarget.imageUrl,
          mediaFilename: replyTarget.mediaFilename
        }
      }) : null
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
        const result = await saveAgentMessage(chatId, msgContent, replyTarget?.id);

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
      const replyTarget = replyingTo;

      // Limpiar UI inmediatamente
      setPendingFile(null);
      setPendingFilePreview(null);
      setAgentInput('');
      setReplyingTo(null);

      const rawSnippet = replyTarget?.content || replyTarget?.mediaFilename || (replyTarget?.mediaType ? `[${replyTarget?.mediaType}]` : 'Mensaje');
      const cleanSnippet = rawSnippet ? rawSnippet.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').replace(/"/g, "'").slice(0, 100) : '';
      const replyPrefix = replyTarget ? `[En respuesta a: "${cleanSnippet}"]\n` : '';
      const optimisticContent = caption ? `${replyPrefix}${caption}` : (replyPrefix ? `${replyPrefix}${filename}` : filename);

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
            content: optimisticContent,
            imageUrl: isImage ? url : null,
            createdAt: new Date().toISOString(),
            status: 'pending',
            _mediaType: mediaType,
            _mediaUrl: url,
            _filename: filename,
            buttonsConfig: replyTarget ? JSON.stringify({
              replyTo: {
                id: replyTarget.id,
                wamid: replyTarget.wamid,
                role: replyTarget.role,
                content: cleanSnippet,
                mediaType: replyTarget.mediaType,
                mediaUrl: replyTarget.mediaUrl || replyTarget.imageUrl,
                mediaFilename: replyTarget.mediaFilename
              }
            }) : null
          }]
        };
      });

      // Enviar en background
      const result = await sendAgentMedia(chatId, url, mediaType, filename, caption, replyTarget?.id);

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
      <div className="flex h-dvh w-full items-center justify-center bg-[#EBE4D6] dark:bg-[#1A1714]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#FF4D00]" size={40} />
          <span className="text-sm font-medium text-[#6F6F6F] animate-pulse">Iniciando plataforma...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-1 h-full w-full bg-[#EBE4D6] dark:bg-[#1A1714] min-w-0 min-h-0 overflow-hidden">
      {/* 1. SIDEBAR DE CHATS */}
      {/* Desktop: controlado por isInboxSidebarOpen | Móvil: pantalla completa solo si mobileView === 'list' */}
      <div className={`shrink-0 border-r border-[#DDD5C2] dark:border-zinc-800/60 bg-[#DDD5C2]/50 dark:bg-[#141210] flex flex-col transition-all duration-300 ease-in-out min-h-0 overflow-hidden
        ${isInboxSidebarOpen ? 'md:w-[300px]' : 'md:w-0 md:opacity-0 md:pointer-events-none'}
        ${mobileView === 'list' ? 'flex flex-1 md:flex-none w-full' : 'hidden md:flex'}
      `}>
        <div className="relative h-16 shrink-0 px-4 flex items-center justify-between bg-[#DDD5C2]/40 dark:bg-[#141210] min-w-[300px] shadow-[inset_0_-1px_0_rgba(138,129,114,.15)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,.06)]">
          {/* Logo centrado en móvil (Isotipo puro) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden">
            <svg
              viewBox="894.02 80 377.93 336.06"
              className="h-7 w-7 text-[#FF4D00]"
              fill="currentColor"
              aria-label="Abita AI"
            >
              <path d="M1184.09 248.293L1183.07 246.366C1177.73 236.181 1165.53 231.612 1165.04 231.419C1163.3 230.814 1160.5 230.043 1156.95 229.74C1156.17 229.658 1155.35 229.63 1154.41 229.63C1153.48 229.63 1152.57 229.658 1151.66 229.713H1151.25L1099.75 229.575H1038.17L1066.72 175.129L1092.87 125.28L1116.48 80H1037.21L1015.33 121.922L970.43 207.472H970.541L949.07 248.43C943.951 258.752 944.088 270.561 949.456 280.773C954.796 290.958 964.375 297.729 975.716 299.408C977.147 299.601 978.661 299.738 980.367 299.738H982.074L1050.09 299.656L1131.76 299.904L1158.05 350.028L1186.1 403.483C1186.1 403.483 1188.63 408.218 1192.73 415.98H1271.95L1206.05 290.325C1200.79 280.388 1192.73 265.056 1184.03 248.265L1184.09 248.293Z" />
              <path d="M996.69 356.607C996.69 349.34 993.167 342.651 987.442 339.018L959.751 321.456C950.97 315.896 939.739 315.896 930.959 321.456L903.268 339.018C897.543 342.651 894.019 349.34 894.019 356.607V398.253C893.936 400.07 894.019 404.254 896.496 408.41C897.818 410.585 899.276 411.906 899.854 412.401C904.176 416.062 909.324 416.062 911.14 415.98C922.508 415.457 930.931 415.98 942.602 415.842C943.042 415.842 944.859 415.842 948.465 415.842C963.742 415.787 971.367 415.842 973.376 415.842C975.055 415.842 978.165 415.842 979.789 415.842C980.478 415.842 989.451 415.897 994.185 408.41C996.8 404.254 996.773 399.96 996.663 398.253V356.607H996.69Z" />
            </svg>
          </div>
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8 w-8 flex items-center justify-center glass-panel !rounded-full text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-[#FF4D00] transition-colors"
                  title="Cancelar selección"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
                <div className="flex flex-col leading-none">
                  <span className="text-[17px] font-semibold tracking-tight text-[#FF4D00] tabular-nums">{selectedIds.size}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A8172] mt-1">seleccionados</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSelectAll}
                  title={selectedIds.size === filteredChats.length ? 'Quitar selección' : 'Seleccionar todos'}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className={`h-[18px] w-[18px] rounded-full flex items-center justify-center transition-all ${selectedIds.size === filteredChats.length ? 'bg-[#FF4D00] shadow-[var(--abita-gloss)]' : 'shadow-[inset_0_0_0_1.5px_rgba(138,129,114,.6)]'}`}>
                    {selectedIds.size === filteredChats.length && <Check size={11} strokeWidth={3.5} className="text-white" />}
                  </span>
                </button>
                <div className="glass-panel !rounded-full flex items-center gap-0.5 p-1">
                  <button
                    onClick={handleBulkEnableBot}
                    disabled={isBulkLoading}
                    className="p-1.5 text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-full transition-all disabled:opacity-30"
                    title="Activar IA"
                  >
                    <Bot size={16} />
                  </button>
                  <button
                    onClick={handleBulkDisableBot}
                    disabled={isBulkLoading}
                    className="p-1.5 text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-full transition-all disabled:opacity-30"
                    title="Pausar IA"
                  >
                    <User size={16} />
                  </button>
                  <button
                    onClick={handleBulkArchive}
                    disabled={isBulkLoading}
                    className="p-1.5 text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all disabled:opacity-30"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                  {isBulkLoading && <Loader2 size={14} className="animate-spin text-[#FF4D00] mx-1" />}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-semibold tracking-tight text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2">
                Inbox
                <span className="bg-[#FF4D00]/10 text-[#FF4D00] text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums">
                  {filteredChats.length}
                </span>
              </h2>
              <div className="flex items-center gap-1.5">
                {filteredChats.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    title="Seleccionar todos"
                    aria-label="Seleccionar todos"
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="h-[18px] w-[18px] rounded-full shadow-[inset_0_0_0_1.5px_rgba(138,129,114,.6)]" />
                  </button>
                )}
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="h-8 w-8 rounded-full bg-[#FF4D00] hover:bg-[#E64500] text-white flex items-center justify-center transition-all shadow-[0_1px_3px_rgba(0,0,0,.15),0_2px_6px_rgba(255,77,0,.3)] active:scale-95 shrink-0"
                  title="Nuevo Chat Individual"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-3 pt-3 pb-3 flex flex-col gap-2 shadow-[inset_0_-1px_0_rgba(138,129,114,.15)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,.06)]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8172]" />
              <input
                type="text"
                placeholder="Buscar nombre o teléfono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[12px] rounded-full pl-9 pr-3 py-2 bg-white/50 dark:bg-white/[.06] text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#8A8172] outline-none border border-[#8A8172]/20 dark:border-white/10 focus:border-[#FF4D00]/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              title="Filtros"
              className={`relative h-8 w-8 shrink-0 flex items-center justify-center rounded-full transition-all ${isFiltersOpen
                  ? 'bg-[#FF4D00]/15 text-[#FF4D00] border border-[#FF4D00]/30'
                  : 'bg-white/50 dark:bg-white/[.06] text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-[#FF4D00] border border-[#8A8172]/20 dark:border-white/10 hover:border-[#FF4D00]/30'
                }`}
            >
              <Filter size={14} />
              {(filterHeat !== 'ALL' || filterStatus !== 'ALL' || filterCampaign !== 'ALL') && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FF4D00] shadow-[0_0_6px_rgba(255,77,0,.6)]" />
              )}
            </button>
          </div>

          {isFiltersOpen && (
            <div ref={filterDropdownContainerRef} className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
              {[
                {
                  id: 'heat',
                  value: filterHeat,
                  set: (v: string) => setFilterHeat(v as any),
                  options: [['ALL', 'Todas las temperaturas'], ['CALIENTE', 'Caliente'], ['TIBIO', 'Tibio'], ['FRIO', 'Frío']]
                },
                {
                  id: 'status',
                  value: filterStatus,
                  set: (v: string) => setFilterStatus(v as any),
                  options: [['ALL', 'Todos los estados'], ['BOT', 'IA Gestionando'], ['NEEDS_AGENT', 'Necesita Humano'], ['AGENT', 'En Atención Humana'], ['UNANSWERED', 'No Contestados']]
                },
                {
                  id: 'campaign',
                  value: filterCampaign,
                  set: (v: string) => setFilterCampaign(v),
                  options: [['ALL', 'Todas las campañas'], ...availableCampaigns.map((camp: any) => [camp.id, camp.name])]
                },
              ].map((f) => {
                const isSelectedActive = f.value !== 'ALL';
                const currentLabel = f.options.find(([val]: any) => val === f.value)?.[1] || f.options[0][1];
                const isOpen = openFilterDropdown === f.id;

                return (
                  <div key={f.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterDropdown(isOpen ? null : f.id)}
                      className={`w-full flex items-center justify-between text-[12px] rounded-full pl-3.5 pr-3 py-2 outline-none transition-all text-left ${isSelectedActive
                          ? 'bg-[#FF4D00]/10 text-[#FF4D00] font-semibold border border-[#FF4D00]/30 shadow-[0_1px_4px_rgba(255,77,0,.15)]'
                          : 'bg-white/50 dark:bg-white/[.06] text-[#111111] dark:text-[#EDE9E0] border border-[#8A8172]/20 dark:border-white/10 hover:border-[#FF4D00]/30'
                        }`}
                    >
                      <span className="truncate pr-2">{currentLabel}</span>
                      <ChevronDown
                        size={13}
                        className={`text-[#8A8172] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#FF4D00]' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl p-1 bg-[#FAF6EE] dark:bg-[#1C1815] border border-[#8A8172]/25 dark:border-white/15 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3),0_4px_10px_rgba(0,0,0,0.15)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto no-scrollbar">
                        {f.options.map(([val, label]: any) => {
                          const isOptionSelected = f.value === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                f.set(val);
                                setOpenFilterDropdown(null);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${isOptionSelected
                                  ? 'bg-[#FF4D00]/15 text-[#FF4D00] font-semibold'
                                  : 'text-[#1F1E1D] dark:text-[#EDE9E0] hover:bg-black/5 dark:hover:bg-white/[.08]'
                                }`}
                            >
                              <span className="truncate">{label}</span>
                              {isOptionSelected && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D00] shrink-0 ml-2 shadow-[0_0_6px_rgba(255,77,0,.8)]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar w-full p-2 pb-24 md:pb-2 space-y-1 relative min-h-0">
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
                    className={`w-full text-left py-2 pl-3.5 pr-3 rounded-2xl transition-all duration-200 flex items-center gap-3 relative ${isMultiSelected
                      ? 'bg-white/65 dark:bg-white/[.08] shadow-[inset_0_1px_0_rgba(255,255,255,.9),inset_0_0_0_1px_rgba(255,77,0,.3),0_4px_14px_rgba(66,54,36,.07)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.12),inset_0_0_0_1px_rgba(255,77,0,.4)]'
                      : isActive
                        ? 'glass-pill z-10 before:content-[""] before:absolute before:left-1 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full before:bg-[#FF4D00] before:shadow-[0_0_10px_rgba(255,77,0,.5)]'
                        : isHandoff
                          ? 'bg-red-500/[.035] dark:bg-red-500/[.025] hover:bg-red-500/[.07] dark:hover:bg-red-500/[.06] shadow-[inset_0_0_0_1px_rgba(220,38,38,.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08),inset_0_0_0_1px_rgba(239,68,68,.32)]'
                          : isNewMessage
                            ? 'bg-[#FF4D00]/[.035] dark:bg-[#FF4D00]/[.025] hover:bg-[#FF4D00]/[.07] dark:hover:bg-[#FF4D00]/[.06] shadow-[inset_0_0_0_1px_rgba(230,69,0,.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08),inset_0_0_0_1px_rgba(255,77,0,.32)]'
                            : 'bg-transparent hover:bg-white/40 dark:hover:bg-white/[.05] after:content-[""] after:absolute after:bottom-0 after:left-14 after:right-4 after:h-px after:bg-gradient-to-r after:from-[#8A8172]/20 after:to-transparent dark:after:from-white/10'
                      }`}
                  >
                    {/* Avatar / Canal / Selector */}
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleSelect(chat.id, e); }}
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer relative overflow-hidden group/avatar ${isMultiSelected
                        ? 'bg-[#FF4D00] border-[#FF4D00] text-white shadow-[var(--abita-gloss),0_2px_8px_rgba(255,77,0,.35)]'
                        : selectedIds.size > 0
                          ? 'bg-transparent border-[#8A8172]/45 hover:border-[#FF4D00]'
                          : chat.lead.channel === 'instagram'
                            ? 'bg-pink-500/10 border-transparent text-pink-500 hover:border-[#FF4D00]'
                            : chat.lead.channel === 'simulator'
                              ? 'bg-[#FF4D00]/10 border-transparent text-[#FF4D00] hover:border-[#FF4D00]'
                              : 'bg-[#25D366]/10 border-transparent text-[#25D366] hover:border-[#FF4D00]'
                        }`}
                    >
                      {isMultiSelected ? (
                        <Check size={16} strokeWidth={3.5} className="animate-in zoom-in-50 duration-200" />
                      ) : (
                        <>
                          <div className={`transition-all duration-200 group-hover/avatar:opacity-0 group-hover/avatar:scale-50 ${selectedIds.size > 0 ? 'opacity-0 scale-50' : 'opacity-100'}`}>
                            {chat.lead.channel === 'instagram' ? <IgIcon size={18} /> : chat.lead.channel === 'simulator' ? <SimIcon size={18} /> : <WaIcon size={18} />}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-50 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 text-[#FF4D00]">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                      <div className="flex justify-between items-center w-full gap-2">
                        <span
                          className={`truncate text-[13px] tracking-tight ${isNewMessage || isHandoff ? 'font-bold text-[#111111] dark:text-white' : isUnanswered ? 'font-semibold text-[#111111] dark:text-[#EDE9E0]' : 'font-medium text-[#111111]/75 dark:text-[#EDE9E0]/70'}`}
                          title={chat.lead.name || chat.lead.phone}
                        >
                          {chat.lead.name || chat.lead.phone}
                        </span>
                        <span className={`text-[10px] shrink-0 ${isNewMessage ? 'text-[#FF4D00] font-semibold' : isHandoff ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-[#8A8172] font-normal'}`}>
                          {formatSidebarDate(new Date(chat.lastActiveAt))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1 text-[12px] line-clamp-1 ${isNewMessage || isHandoff ? 'text-[#111111] dark:text-white/95 font-medium' : isUnanswered ? 'text-[#111111]/80 dark:text-white/80 font-normal' : 'text-[#6F6F6F] font-normal'}`}>
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
                                <CheckCheck size={12} className="text-[#FF4D00]" />
                              ) : (
                                <Check size={12} className="opacity-60" />
                              )}
                            </div>
                          )}
                          <span className="truncate">
                            {lastMsg ? (
                              lastMsg.mediaType === 'audio'
                                ? (lastMsg.content && lastMsg.content.startsWith('Mensaje de voz') ? lastMsg.content : 'Mensaje de voz')
                                : (lastMsg.mediaType === 'location' || lastMsg.mediaUrl?.includes('google.com/maps') || lastMsg.content?.includes('google.com/maps'))
                                  ? '📍 Ubicación'
                                  : lastMsg.content || (lastMsg.mediaType ? `[${lastMsg.mediaType}]` : '')
                            ) : <span className="italic opacity-50 text-[10px]">Sin mensajes</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isBot ? (
                            <Bot size={12} className="text-[#FF4D00]" />
                          ) : isHandoff ? (
                            <AlertCircle size={12} className="text-red-500 animate-pulse" />
                          ) : isNewMessage ? (
                            <div className="dot-live shadow-[0_0_8px_rgba(255,77,0,.8)]" />
                          ) : (
                            <User size={11} className="text-[#8A8172]/70" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        {chat.lead.project?.leadScoringEnabled !== false && (
                          <>
                            {chat.lead.heat === 'CALIENTE' && <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0">🔥 {chat.lead.score}</span>}
                            {chat.lead.heat === 'TIBIO' && <span className="text-[9px] bg-[#FF4D00]/12 text-[#B33500] dark:text-[#FF8A4C] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0"><TrendingUp size={9} /> {chat.lead.score}</span>}
                            {(!chat.lead.heat || chat.lead.heat === 'FRIO') && <span className="text-[9px] bg-[#8A8172]/12 text-[#5C5C5C] dark:bg-white/10 dark:text-[#A3A3A3] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0">Frío · {chat.lead.score || 0}</span>}
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
      <div className={`flex-1 min-w-0 flex-col bg-[#F5F0E5] dark:bg-[#1A1714]
        ${mobileView === 'chat' ? 'flex fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto' : 'hidden md:flex relative'}
      `}>
        {/* Loader de transición rápida */}
        {isChatLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#EBE4D6]/30 dark:bg-[#1A1714]/30 backdrop-blur-[2px] animate-in fade-in">
            <div className="glass-dark px-5 py-3 rounded-full flex items-center gap-3 text-sm font-semibold">
              <Loader2 className="animate-spin text-[#FF4D00]" size={20} />
              <span className="text-xs font-semibold text-[#EDE9E0]">Cargando conversación...</span>
            </div>
          </div>
        )}

        {!activeChat ? (
          <div className="h-full flex flex-col items-center justify-center bg-[#EBE4D6]/30 dark:bg-black/20 text-[#6F6F6F]">
            <div className="bg-[#111111] dark:bg-[#EBE4D6] p-4 rounded-3xl shadow-xl mb-6 flex items-center justify-center">
              <MessageSquare size={36} className="text-[#FF4D00]" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-[#111111] dark:text-[#EDE9E0] mb-2">Bandeja de Entrada</h3>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
          </div>
        ) : (
          <>
            <header className="h-16 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#F5F0E5]/70 dark:bg-white/[.03] backdrop-blur-xl shadow-[inset_0_-1px_0_rgba(138,129,114,.18),0_8px_24px_rgba(66,54,36,.04)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,.06)] relative z-10">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                {/* Botón volver: solo en móvil */}
                <button
                  onClick={() => {
                    setMobileView('list');
                    setActiveChat(null);
                  }}
                  className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500 transition-colors shrink-0"
                  title="Volver"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
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
                    <span className="text-[9px] glass-panel !rounded-full text-[#5C5C5C] dark:text-[#A3A3A3] px-2 py-0.5 flex items-center gap-1 shrink-0 font-semibold">
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
                  className="p-2 text-[#6F6F6F] hover:text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-full transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-[#DDD5C2] dark:bg-zinc-800 mx-1"></div>
                <span className="text-sm font-medium text-[#6F6F6F]">IA</span>
                <button
                  onClick={() => setIsBotConfirmModalOpen(true)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${activeChat.botActive ? 'bg-[#FF4D00] shadow-[var(--abita-gloss),0_4px_12px_rgba(255,77,0,.3)]' : 'bg-[#8A8172]/30 dark:bg-zinc-700 shadow-[inset_0_1px_2px_rgba(66,54,36,.15)]'
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeChat.botActive ? 'translate-x-[22px]' : 'translate-x-1'
                    }`} />
                </button>
                {/* Botón perfil: solo en desktop */}
                <div className="hidden md:block w-px h-6 bg-[#DDD5C2] dark:bg-zinc-800 mx-1"></div>
                <button
                  onClick={() => setIsProfileSidebarOpen(!isProfileSidebarOpen)}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isProfileSidebarOpen
                    ? 'btn-primary-abita'
                    : 'glass-panel !rounded-full text-[#5C5C5C] dark:text-[#A3A3A3] hover:text-[#FF4D00]'
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
                      className="text-xs text-[#FF4D00] hover:underline font-medium"
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
                const isAudio = msg.mediaType === 'audio';

                const isSystem = msg.role === 'system';

                const currentMsgDate = new Date(msg.createdAt);
                const prevMsgDate = idx > 0 ? new Date(activeChat.messages[idx - 1].createdAt) : null;
                const showDateHeader = !prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString();

                if (isSystem) {
                  return (
                    <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-500 rounded-2xl">
                      {showDateHeader && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest glass-panel !rounded-full text-[#5C5C5C] dark:text-[#A3A3A3]">
                            {formatDateLabel(currentMsgDate)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1.5 text-[11px] font-medium text-[#5C5C5C] dark:text-[#A3A3A3] glass-panel !rounded-full flex items-center gap-1.5">
                          <Bot size={12} className="text-[#FF4D00]" />
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
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest glass-panel !rounded-full text-[#5C5C5C] dark:text-[#A3A3A3]">
                          {formatDateLabel(currentMsgDate)}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2 mb-4 group/msg ${isAudio ? 'w-[80%] md:w-[40%]' : 'max-w-[85%]'} ${isUser ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}>
                      {/* Avatar icon */}
                      {isBot && (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center mb-1">
                          <Bot size={13} />
                        </div>
                      )}
                      {isAgent && (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#111111]/10 text-[#111111] dark:bg-[#EDE9E0]/10 dark:text-[#EDE9E0] flex items-center justify-center mb-1">
                          <User size={13} />
                        </div>
                      )}

                      {/* Contenedor relativo para permitir Swipe to Reply en móvil */}
                      <div
                        className="relative flex items-center w-fit max-w-full"
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                          touchDirectionLockedRef.current = null;
                          hasTriggeredReplyHaptic.current = false;
                        }}
                        onTouchMove={(e) => {
                          if (!touchStartRef.current) return;
                          const touch = e.touches[0];
                          const deltaX = touch.clientX - touchStartRef.current.x;
                          const deltaY = touch.clientY - touchStartRef.current.y;

                          // Bloquear eje para no interferir con scroll vertical
                          if (!touchDirectionLockedRef.current) {
                            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                              touchDirectionLockedRef.current = 'vertical';
                              return;
                            } else if (Math.abs(deltaX) > 8 && deltaX > 0) {
                              touchDirectionLockedRef.current = 'horizontal';
                            } else {
                              return;
                            }
                          }

                          if (touchDirectionLockedRef.current === 'horizontal' && deltaX > 0) {
                            // Aplicar resistencia elástica después de 65px
                            const clampedOffset = deltaX > 65 ? 65 + (deltaX - 65) * 0.25 : deltaX;
                            setSwipingMessageId(msg.id);
                            setSwipeOffset(clampedOffset);

                            if (clampedOffset >= 50 && !hasTriggeredReplyHaptic.current) {
                              hasTriggeredReplyHaptic.current = true;
                              if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
                                try { window.navigator.vibrate(25); } catch { }
                              }
                            }
                          }
                        }}
                        onTouchEnd={() => {
                          if (swipingMessageId === msg.id) {
                            if (swipeOffset >= 50) {
                              handleStartReply(msg);
                            }
                            setSwipingMessageId(null);
                            setSwipeOffset(0);
                          }
                          touchStartRef.current = null;
                          touchDirectionLockedRef.current = null;
                          hasTriggeredReplyHaptic.current = false;
                        }}
                        onTouchCancel={() => {
                          if (swipingMessageId === msg.id) {
                            setSwipingMessageId(null);
                            setSwipeOffset(0);
                          }
                          touchStartRef.current = null;
                          touchDirectionLockedRef.current = null;
                          hasTriggeredReplyHaptic.current = false;
                        }}
                      >
                        {/* Indicador de Reply al hacer swipe en móvil */}
                        <div
                          className={`absolute left-[-36px] flex items-center justify-center w-8 h-8 rounded-full bg-[#FF4D00] text-white shadow-md pointer-events-none transition-opacity duration-200 md:hidden ${swipingMessageId === msg.id && swipeOffset > 15 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                            }`}
                          style={{
                            transform: `translateX(${swipingMessageId === msg.id ? Math.min(swipeOffset * 0.6, 32) : 0}px) scale(${swipingMessageId === msg.id ? Math.min(0.6 + (swipeOffset / 60) * 0.4, 1.1) : 0.7
                              })`
                          }}
                        >
                          <Reply size={15} className="-scale-x-100" />
                        </div>

                        <div
                          style={{
                            transform: swipingMessageId === msg.id ? `translateX(${swipeOffset}px)` : 'none',
                            transition: swipingMessageId === msg.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)'
                          }}
                          className={`relative p-3 pb-6 rounded-2xl text-sm min-w-[90px] ${isAudio ? 'w-full' : 'w-fit'} font-sans transition-opacity duration-300 ${isUser
                            ? 'bg-white/85 text-[#111111] dark:bg-white/[.07] dark:text-[#EDE9E0] rounded-tl-sm shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_1px_2px_rgba(66,54,36,.05),0_6px_18px_rgba(66,54,36,.07)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.12)]'
                            : isBot
                              ? 'bg-gradient-to-b from-[#FF6A26] to-[#FF4D00] dark:from-[#E8581A] dark:to-[#CC3D00] text-white rounded-tr-sm shadow-[var(--abita-gloss),0_1px_3px_rgba(255,77,0,.24),0_6px_16px_rgba(255,77,0,.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_4px_12px_rgba(0,0,0,.35)]'
                              : 'bg-[#1A1714] text-white dark:bg-[#EBE4D6] dark:text-[#111111] rounded-tr-sm shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_6px_18px_rgba(26,23,20,.22)]'
                            } ${msg.status === 'pending' ? 'opacity-70' : 'opacity-100'} ${(msg.status === 'failed' || msg.status === 'FAILED') ? 'ring-2 ring-red-500/50 bg-red-950/20 text-red-100' : ''}`}
                        >



                          {msg.scoreBump && (
                            <div className="absolute -top-10 right-0 flex items-center gap-2 glass-panel !rounded-full px-3 py-1 animate-in fade-in zoom-in duration-300 z-10">
                              <div className="px-2 py-0.5 bg-[#FF4D00] rounded-full text-[10px] text-white font-black">
                                +{msg.scoreBump}
                              </div>
                              <span className="text-[9px] font-bold text-[#B33500] dark:text-[#FF8A4C] uppercase tracking-wider whitespace-nowrap">
                                {msg.scoreReason || 'Mejora de Score'}
                              </span>
                            </div>
                          )}

                          {/* 1. Bloque de respuesta contextual (Meta WhatsApp compliant) */}
                          {(() => {
                            let replyInfo: { id?: string; wamid?: string; role?: string; content?: string; mediaType?: string; mediaUrl?: string; mediaFilename?: string } | null = null;

                            if (msg.buttonsConfig) {
                              try {
                                const parsed = JSON.parse(msg.buttonsConfig);
                                if (parsed.replyTo) replyInfo = parsed.replyTo;
                              } catch (e) { }
                            }

                            if (!replyInfo && msg.content && msg.content.includes('[En respuesta a:')) {
                              const match = msg.content.match(/\[En respuesta a:\s*"([^"]+)"\]\n?/);
                              if (match) {
                                replyInfo = { content: match[1] };
                              }
                            }

                            if (!replyInfo) return null;

                            const originalMsg = replyInfo.id
                              ? activeChat.messages.find((m: any) => m.id === replyInfo.id)
                              : (replyInfo.wamid
                                ? activeChat.messages.find((m: any) => m.wamid === replyInfo.wamid)
                                : activeChat.messages.find((m: any) => m.content && replyInfo?.content && m.content.includes(replyInfo.content)));

                            const quotedSenderName = originalMsg
                              ? (originalMsg.role === 'user' ? (activeChat.lead.name || 'Cliente') : originalMsg.role === 'assistant' ? 'IA (Bot)' : 'Tú')
                              : (replyInfo.role === 'user' ? (activeChat.lead.name || 'Cliente') : replyInfo.role === 'assistant' ? 'IA' : 'Tú');

                            const quotedText = replyInfo.content || (originalMsg?.content ? originalMsg.content.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '') : (replyInfo.mediaFilename || 'Archivo adjunto'));
                            const quotedMediaUrl = replyInfo.mediaUrl || originalMsg?.imageUrl || originalMsg?.mediaUrl;
                            const isQuotedImage = (replyInfo.mediaType === 'image' || originalMsg?.mediaType === 'image' || !replyInfo.mediaType) && quotedMediaUrl && (quotedMediaUrl.includes('image') || quotedMediaUrl.includes('.jpg') || quotedMediaUrl.includes('.png') || quotedMediaUrl.includes('.webp') || quotedMediaUrl.includes('.jpeg'));

                            return (
                              <div
                                onClick={() => originalMsg && scrollToMessage(originalMsg.id)}
                                className={`group/quote p-2.5 mb-2.5 rounded-xl border-l-4 border-[#FF4D00] bg-black/10 dark:bg-black/35 backdrop-blur-sm text-[11px] transition-all relative overflow-hidden ${originalMsg ? 'cursor-pointer hover:bg-black/15 dark:hover:bg-black/50' : 'opacity-75'}`}
                                title={originalMsg ? "Clic para ir al mensaje original" : undefined}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#FF4D00] uppercase tracking-wider">
                                    <Reply size={11} className="rotate-180" />
                                    <span>{quotedSenderName}</span>
                                  </div>
                                  {originalMsg && (
                                    <div className="text-[8px] font-bold text-[#FF4D00] opacity-0 group-hover/quote:opacity-100 transition-opacity flex items-center gap-0.5">
                                      <span>IR AL MENSAJE</span> ↑
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="line-clamp-2 italic opacity-85 leading-snug flex-1 select-none">
                                    {quotedText}
                                  </p>
                                  {isQuotedImage && (
                                    <img
                                      src={quotedMediaUrl}
                                      alt="Thumbnail"
                                      className="w-8 h-8 rounded-md object-cover shrink-0 border border-black/10 dark:border-white/10"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })()}

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
                              <VoiceNotePlayer url={msg.mediaUrl} variant={isUser ? 'user' : isBot ? 'bot' : 'agent'} avatarUrl={userAvatarUrl} transcript={msg.content} />
                            </div>
                          )}

                          {/* 3.5. Ubicación / Modern Location Card */}
                          {(msg.mediaType === 'location' || (msg.mediaUrl && (msg.mediaUrl.includes('google.com/maps') || msg.mediaUrl.includes('maps.google.com')))) && (() => {
                            let locData: { name?: string; address?: string; latitude?: number; longitude?: number } = {};
                            if (msg.mediaFilename) {
                              try { locData = JSON.parse(msg.mediaFilename); } catch (e) { }
                            }
                            const mapsUrl = msg.mediaUrl || (msg.content?.match(/https:\/\/(www\.)?(google\.com\/maps|maps\.google\.com)[^\s]+/)?.[0]) || '';

                            // Extraer coordenadas para el badge numérico
                            let lat = locData.latitude;
                            let lng = locData.longitude;
                            if ((lat === undefined || lng === undefined) && mapsUrl) {
                              const coordsMatch = mapsUrl.match(/q=([-\d.]+),([-\d.]+)/);
                              if (coordsMatch) {
                                lat = parseFloat(coordsMatch[1]);
                                lng = parseFloat(coordsMatch[2]);
                              }
                            }
                            const hasCoords = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
                            const coordLabel = hasCoords ? `${lat!.toFixed(4)}°, ${lng!.toFixed(4)}°` : '';

                            // Filtrar nombres genéricos/sintéticos para que no aparezca "Mi ubicación actual" o "Ubicación recibida"
                            const rawTitle = (locData.name || '').trim();
                            const isGeneric = !rawTitle || ['ubicación', 'ubicacion', 'ubicación recibida', 'ubicacion recibida', 'mi ubicación actual', 'mi ubicacion actual', 'ubicación compartida', 'ubicacion compartida'].includes(rawTitle.toLowerCase());
                            const locationTitle = isGeneric ? '' : rawTitle;
                            const locationAddress = (locData.address || '').trim();

                            return (
                              <a
                                href={mapsUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block mb-2 w-[310px] sm:w-[340px] max-w-[85vw] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] bg-[#111111] text-white select-none relative"
                                onClick={(e) => { if (!mapsUrl) e.preventDefault(); }}
                              >
                                {/* Visualizador de Mapa con Retícula Urbana y Pin de Abita */}
                                <div className="relative h-36 w-full bg-gradient-to-br from-[#1E1B18] via-[#141210] to-[#0A0908] overflow-hidden flex items-center justify-center">
                                  {/* Vector de Rutas Estilizadas y Bloques Urbanos */}
                                  <svg className="absolute inset-0 w-full h-full opacity-35 group-hover:opacity-50 transition-opacity duration-500" viewBox="0 0 340 144" preserveAspectRatio="xMidYMid slice" fill="none">
                                    {/* Bloques de la ciudad */}
                                    <rect x="15" y="14" width="60" height="40" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="85" y="14" width="75" height="40" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="190" y="14" width="65" height="40" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="265" y="14" width="60" height="40" rx="4" fill="white" fillOpacity="0.05" />

                                    <rect x="15" y="78" width="60" height="50" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="85" y="78" width="75" height="50" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="190" y="78" width="65" height="50" rx="4" fill="white" fillOpacity="0.05" />
                                    <rect x="265" y="78" width="60" height="50" rx="4" fill="white" fillOpacity="0.05" />

                                    {/* Parque / Área verde */}
                                    <path d="M 190 16 L 245 16 L 245 50 L 190 50 Z" fill="#10B981" fillOpacity="0.15" />

                                    {/* Río / Agua */}
                                    <path d="M-15 115 C 80 82, 140 128, 220 98 C 270 80, 310 110, 360 92" stroke="#0284C7" strokeWidth="5.5" strokeLinecap="round" opacity="0.35" />

                                    {/* Calles secundarias */}
                                    <line x1="0" y1="65" x2="340" y2="65" stroke="white" strokeWidth="1" opacity="0.12" />
                                    <line x1="78" y1="0" x2="78" y2="144" stroke="white" strokeWidth="1" opacity="0.12" />
                                    <line x1="170" y1="0" x2="170" y2="144" stroke="white" strokeWidth="1" opacity="0.12" />
                                    <line x1="258" y1="0" x2="258" y2="144" stroke="white" strokeWidth="1" opacity="0.12" />

                                    {/* Arteria principal con resplandor naranja */}
                                    <path d="M -10 32 Q 100 42 170 72 T 350 102" stroke="#FF4D00" strokeWidth="2.5" opacity="0.75" strokeLinecap="round" />
                                    <path d="M -10 32 Q 100 42 170 72 T 350 102" stroke="white" strokeWidth="0.8" opacity="0.8" strokeDasharray="3 3" />

                                    {/* Ondas concéntricas centradas en (170, 72) */}
                                    <circle cx="170" cy="72" r="32" stroke="#FF4D00" strokeWidth="1" opacity="0.45" strokeDasharray="2 2" />
                                    <circle cx="170" cy="72" r="58" stroke="white" strokeWidth="0.5" opacity="0.18" />
                                  </svg>

                                  {/* Pin de Ubicación (Naranja de Abita) */}
                                  <div className="relative z-10 flex flex-col items-center">
                                    <div className="relative h-10 w-10 rounded-full bg-gradient-to-tr from-[#FF4D00] to-orange-400 text-white flex items-center justify-center shadow-lg shadow-[#FF4D00]/50 group-hover:scale-105 transition-transform">
                                      <MapPin size={20} className="fill-white/30" />
                                    </div>
                                  </div>

                                  {/* Brújula Top-Right */}
                                  <div className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 group-hover:text-white group-hover:bg-[#FF4D00] transition-colors shadow-sm">
                                    <Navigation size={11} className="group-hover:rotate-45 transition-transform duration-300" />
                                  </div>
                                </div>

                                {/* Barra de Información Inferior */}
                                <div className="p-3 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-2.5 border-t border-white/10">
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-bold text-white truncate group-hover:text-[#FF4D00] transition-colors">
                                      {locationTitle || 'Ubicación'}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                      {locationAddress || 'Google Maps'}
                                    </p>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 group-hover:bg-[#FF4D00] text-zinc-200 group-hover:text-white text-[11px] font-semibold transition-all shadow-sm">
                                    <span>Abrir</span>
                                    <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                  </div>
                                </div>
                              </a>
                            );
                          })()}

                          {/* 4. Otros documentos */}
                          {msg.mediaUrl && msg.mediaType !== 'image' && msg.mediaType !== 'audio' && msg.mediaType !== 'location' && !msg.mediaUrl.includes('google.com/maps') && !msg.mediaUrl.includes('maps.google.com') && (
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
                          {msg.content && msg.mediaType !== 'location' && !msg.content.includes('maps.google.com') && !msg.content.includes('google.com/maps') && msg.content !== '[Archivo]' && msg.content !== '[Archivo enviado por IA]' && msg.content !== msg.mediaFilename && msg.mediaType !== 'audio' && !(msg.role === 'assistant' && msg.mediaUrl) && (
                            <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatWhatsAppText(msg.content.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '').trim()) }}>
                            </div>
                          )}

                          {/* 6. Badge de respuesta de botón (mensajes entrantes del usuario) */}
                          {isUser && msg.mediaType === 'button_reply' && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 dark:bg-black/20 rounded-full text-[10px] font-bold border border-white/30 dark:border-white/10">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
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
                              <CheckCheck size={10} className="text-[#FF4D00] opacity-100" />
                            )}
                            {(isAgent || isBot) && !['failed', 'FAILED', 'ERROR', 'pending', 'SENT', 'sent', 'DELIVERED', 'READ'].includes(msg.status) && (
                              <Check size={10} className="opacity-60" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botón flotante para responder a este mensaje (visible solo en desktop al hacer hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReply(msg);
                        }}
                        className="hidden md:flex opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-all p-1.5 rounded-full bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 text-[#6F6F6F] hover:text-[#FF4D00] shadow-sm hover:scale-110 active:scale-95 shrink-0 mb-1 items-center justify-center"
                        title="Responder a este mensaje"
                      >
                        <Reply size={13} className={isUser ? "" : "-scale-x-100"} />
                      </button>

                      {/* Error banner debajo de la burbuja */}
                      {(msg.status === 'failed' || msg.status === 'FAILED' || msg.status === 'ERROR') && msg.sendError && (
                        <div className="mt-1 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl max-w-full">
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle size={10} /> No se envió por WhatsApp
                          </p>
                          <p className="text-[10px] text-red-500 dark:text-red-400/80 mt-0.5 break-words">{msg.sendError}</p>
                          {(msg.role === 'agent' || msg.role === 'assistant') && (() => {
                            const lastUserMsg = [...(activeChat.messages || [])].reverse().find((m: any) => m.role === 'user');
                            const lastUserDate = lastUserMsg ? new Date(lastUserMsg.createdAt).getTime() : 0;
                            const within24h = lastUserDate > 0 && (Date.now() - lastUserDate) < 24 * 60 * 60 * 1000;
                            return within24h ? (
                              <button
                                onClick={async () => {
                                  const { retryFailedMessage } = await import('@/app/actions/inbox');
                                  const result = await retryFailedMessage(msg.id);
                                  if (result.success) {
                                    setActiveChat((prev: any) => prev ? {
                                      ...prev,
                                      messages: prev.messages.map((m: any) =>
                                        m.id === msg.id ? { ...m, status: 'SENT', sendError: null } : m
                                      )
                                    } : prev);
                                  } else {
                                    setActiveChat((prev: any) => prev ? {
                                      ...prev,
                                      messages: prev.messages.map((m: any) =>
                                        m.id === msg.id ? { ...m, sendError: result.error || m.sendError } : m
                                      )
                                    } : prev);
                                  }
                                }}
                                className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors underline underline-offset-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                Reintentar envío
                              </button>
                            ) : (
                              <p className="mt-1.5 text-[10px] text-red-400/60 dark:text-red-500/50 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                No se puede reenviar — ventana de 24h expirada
                              </p>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSimulating && (
                <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center mb-1">
                    <Bot size={13} />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FF4D00]/20 text-[#FF4D00] rounded-tr-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* CONTROLES DE SIMULACIÓN MVP */}
            <div className="shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_-8px_24px_rgba(66,54,36,.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)] bg-[#F5F0E5]/70 dark:bg-white/[.03] backdrop-blur-xl z-10 shrink-0 pb-4 md:pb-2">

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
                  <div className="px-4 py-4">
                    <div className="text-[10px] font-bold text-[#FF4D00] mb-2 flex items-center justify-between tracking-widest px-1">
                      <span>{isPast24h ? "SESIÓN EXPIRADA (> 24H)" : "AGENTE REAL (TU RESPUESTA)"}</span>
                      <User size={10} />
                    </div>

                    {/* Preview de Respuesta Contextual */}
                    {replyingTo && (
                      <div className="mb-2 flex items-center justify-between gap-3 p-2.5 bg-white/95 dark:bg-zinc-900/95 border border-[#DDD5C2] dark:border-zinc-700 border-l-4 border-l-[#FF4D00] rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => scrollToMessage(replyingTo.id)}
                          title="Ir al mensaje original"
                        >
                          <div className="p-1 rounded-md bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                            <Reply size={14} className="rotate-180" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-[#FF4D00]">
                                Respondiendo a {replyingTo.role === 'user' ? (activeChat.lead?.name || 'Cliente') : replyingTo.role === 'assistant' ? 'IA' : 'Tú'}
                              </span>
                              {replyingTo.mediaType && (
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                  {replyingTo.mediaType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                              {replyingTo.content
                                ? replyingTo.content.replace(/\[En respuesta a:\s*"[^"]+"\]\n?/, '')
                                : (replyingTo.mediaFilename || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : 'Mensaje adjunto'))}
                            </p>
                          </div>
                          {(replyingTo.imageUrl || (replyingTo.mediaType === 'image' ? replyingTo.mediaUrl : null)) && (
                            <img
                              src={replyingTo.imageUrl || replyingTo.mediaUrl}
                              alt="Thumbnail"
                              className="w-9 h-9 rounded-md object-cover shrink-0 border border-black/10 dark:border-white/10"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
                          title="Cancelar respuesta (Esc)"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    )}

                    {/* Preview de archivo adjunto */}
                    {pendingFile && (
                      <div className="mb-2 flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-[#DDD5C2] dark:border-zinc-700 rounded-xl">
                        {pendingFilePreview ? (
                          <img src={pendingFilePreview} alt="preview" className="h-10 w-10 object-cover rounded-lg shrink-0" />
                        ) : (
                          <div className="h-10 w-10 bg-[#FF4D00]/10 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-[#FF4D00]" />
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
                          className="shrink-0 px-4 py-2.5 bg-[#FF4D00] text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <MessageSquare size={16} /> Ver Templates
                        </button>
                      )}

                      {!activeChat.botActive && !isPast24h && (
                        <>
                          <input
                            type="file"
                            ref={docInputRef}
                            className="hidden"
                            accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            onChange={handleFileSelect}
                          />
                          <input
                            type="file"
                            ref={galleryInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                          />
                          <input
                            type="file"
                            ref={cameraInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            capture="environment"
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
                              <div className="relative" ref={attachMenuRef}>
                                <button
                                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                                  className={`shrink-0 p-2.5 border rounded-xl transition-all ${showAttachMenu ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00]' : 'bg-white dark:bg-zinc-800 border-[#DDD5C2] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#FF4D00] hover:border-[#FF4D00]'}`}
                                  title="Adjuntar"
                                >
                                  <Paperclip size={16} />
                                </button>
                                {showAttachMenu && (
                                  <div className="absolute bottom-full left-0 mb-4 z-[70] glass-dark rounded-2xl p-2 w-48 animate-in fade-in slide-in-from-bottom-4 duration-200">
                                    <div className="flex flex-col gap-1">
                                      <button onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-colors text-left text-sm font-medium text-[#EDE9E0]">
                                        <div className="p-1.5 bg-[#FF4D00]/10 text-[#FF4D00] rounded-lg"><FileText size={16} /></div>
                                        Documento
                                      </button>
                                      <button onClick={() => { setShowAttachMenu(false); cameraInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-colors text-left text-sm font-medium text-[#EDE9E0]">
                                        <div className="p-1.5 bg-[#FF4D00]/10 text-[#FF4D00] rounded-lg"><Camera size={16} /></div>
                                        Cámara
                                      </button>
                                      <button onClick={() => { setShowAttachMenu(false); galleryInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-colors text-left text-sm font-medium text-[#EDE9E0]">
                                        <div className="p-1.5 bg-[#FF4D00]/10 text-[#FF4D00] rounded-lg"><ImageIcon size={16} /></div>
                                        Galería
                                      </button>
                                      <button
                                        onClick={handleSendLocation}
                                        disabled={isSendingLocation || isUploadingMedia}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-colors text-left text-sm font-medium text-[#EDE9E0] disabled:opacity-50"
                                      >
                                        <div className="p-1.5 bg-[#FF4D00]/10 text-[#FF4D00] rounded-lg">
                                          {isSendingLocation ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                                        </div>
                                        <span>{isSendingLocation ? 'Enviando ubicación...' : 'Ubicación'}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="relative" ref={emojiPickerRef}>
                                <button
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                  className={`shrink-0 p-2.5 border rounded-xl transition-all ${showEmojiPicker ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00]' : 'bg-white dark:bg-zinc-800 border-[#DDD5C2] dark:border-zinc-700 text-[#6F6F6F] hover:text-[#FF4D00] hover:border-[#FF4D00]'}`}
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
                                  ref={agentTextareaRef}
                                  value={agentInput}
                                  onChange={(e) => setAgentInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape' && replyingTo) {
                                      e.preventDefault();
                                      setReplyingTo(null);
                                      return;
                                    }
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
                                          : replyingTo
                                            ? "Escribe una respuesta..."
                                            : "Escribe una respuesta..."
                                  }
                                  className="w-full bg-[#EBE4D6]/50 dark:bg-[#111111]/40 border border-[#DDD5C2] dark:border-zinc-800 rounded-2xl px-5 py-3 pr-12 min-h-[52px] max-h-32 resize-none outline-none disabled:opacity-50 transition-all focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/40 text-sm text-[#111111] dark:text-white"
                                  rows={1}
                                />

                                {!activeChat.botActive && !isPast24h && (
                                  <div className="absolute right-2 flex items-center gap-1">
                                    {!agentInput.trim() && !pendingFile ? (
                                      <button
                                        onClick={startRecording}
                                        className="p-2 text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-xl transition-all"
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
                      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F] bg-[#DDD5C2]/30 dark:bg-zinc-800/20 py-2 rounded-lg border border-[#DDD5C2] dark:border-zinc-800/40 opacity-80">
                        <Bot size={12} className="text-[#FF4D00]" />
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
        className={`${mobileView === 'profile' ? 'flex w-full fixed inset-0 z-[60]' : 'hidden'} md:flex shrink-0 shadow-[inset_1px_0_0_rgba(138,129,114,.18)] dark:shadow-[inset_1px_0_0_rgba(255,255,255,.06)] bg-[#EBE4D6] dark:bg-[#1A1714] flex-col transition-all duration-300 ease-in-out relative overflow-hidden ${activeChat && isProfileSidebarOpen ? 'md:w-[300px]' : 'md:w-0 opacity-0 pointer-events-none border-l-0'
          }`}
      >
        {activeChat && (isProfileSidebarOpen || mobileView === 'profile') && (
          <div className="flex-1 w-full md:w-[300px] overflow-y-auto no-scrollbar pb-6 absolute inset-0">
            {/* Cabecera del perfil */}
            {mobileView === 'profile' && (
              <div className="md:hidden sticky top-0 bg-[#EBE4D6]/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 z-10 border-b border-[#DDD5C2] dark:border-zinc-800/60 flex items-center gap-2">
                <button onClick={() => setMobileView('chat')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[#111111] dark:text-[#EDE9E0] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <span className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0]">Perfil del Contacto</span>
              </div>
            )}
            <div className="px-6 py-8 flex flex-col items-center justify-center border-b border-[#DDD5C2] dark:border-zinc-800/60 bg-[#EBE4D6]/30 dark:bg-black/20">
              <div className="h-20 w-20 bg-[#111111] dark:bg-[#EBE4D6] rounded-full flex items-center justify-center text-[#FF4D00] font-black text-3xl shadow-xl mb-4 relative">
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
                  <div className="bg-[#EBE4D6]/30 dark:bg-zinc-900/50 p-3 rounded-xl border border-[#DDD5C2] dark:border-zinc-800 space-y-4">
                    <div>
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-1">Temperatura</span>
                      <div className="flex items-center gap-2">
                        {activeChat.lead.heat === 'CALIENTE' && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Caliente 🔥</span>}
                        {activeChat.lead.heat === 'TIBIO' && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Tibio 📈</span>}
                        {(!activeChat.lead.heat || activeChat.lead.heat === 'FRIO') && <span className="bg-[#8A8172] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Frío ❄️</span>}
                        <span className="text-xs font-bold text-[#111111] dark:text-[#EDE9E0]">Pts: {activeChat.lead.score}</span>
                      </div>
                    </div>
                    {/* Switch de Auto-Wake Bot */}
                    <div className="pt-3 border-t border-[#DDD5C2] dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-[10px] text-[#6F6F6F] font-bold uppercase">Auto-Reactivar IA</span>
                      <button
                        onClick={handleToggleAutoWake}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${activeChat.autoWakeBot ? 'bg-[#FF4D00]' : 'bg-[#DDD5C2] dark:bg-zinc-700'
                          }`}
                        title={activeChat.autoWakeBot ? "Desactivar reactivación automática" : "Activar reactivación automática"}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${activeChat.autoWakeBot ? 'translate-x-[18px]' : 'translate-x-1'
                          }`} />
                      </button>
                    </div>

                    {/* Triggers de Score */}
                    {activeChat.messages?.some((m: any) => m.scoreBump) && (
                      <div className="pt-3 border-t border-[#DDD5C2] dark:border-zinc-800">
                        <span className="text-[10px] text-[#6F6F6F] font-bold uppercase block mb-2">Eventos de Interés</span>
                        <div className="space-y-2">
                          {activeChat.messages
                            .filter((m: any) => m.scoreBump)
                            .map((m: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-[#DDD5C2]/50 dark:border-zinc-800/50">
                                <span className="text-[#FF4D00] font-bold shrink-0">+{m.scoreBump}</span>
                                <span className="text-[#111111] dark:text-[#EDE9E0] leading-tight">{m.scoreReason || 'Sin razón especificada'}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-[#DDD5C2] dark:border-zinc-800">
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
                  <div className="bg-[#EBE4D6]/30 dark:bg-zinc-900/50 p-3 rounded-xl border border-[#DDD5C2] dark:border-zinc-800 flex justify-between items-center">
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
                    className={`p-1.5 rounded-lg transition-all ${isRefreshingSummary ? 'animate-spin text-[#FF4D00]' : 'text-[#6F6F6F] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#FF4D00]'}`}
                    title="Refrescar resumen"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                <div className="bg-[#FF4D00]/5 border border-[#FF4D00]/20 p-4 rounded-xl text-xs text-[#111111] dark:text-[#EDE9E0] leading-relaxed relative">
                  <Sparkles size={14} className="absolute top-2 right-2 text-[#FF4D00]/40" />
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
                      <div className="bg-[#FF4D00]/10 px-3 py-2.5 rounded-lg border border-[#FF4D00]/20 flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-[#FF4D00] uppercase tracking-wider">Campañas de Origen</span>
                        <div className="flex flex-col gap-1">
                          {activeChat.lead.allCampaigns.map((camp: any) => (
                            <span key={camp.id} className="text-[11px] font-bold text-[#FF4D00] flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-[#FF4D00]"></span>
                              {camp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : activeChat.lead.latestCampaign ? (
                      <div className="bg-[#FF4D00]/10 px-3 py-2.5 rounded-lg border border-[#FF4D00]/20 flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-[#FF4D00] uppercase tracking-wider">Campaña de Origen</span>
                        <span className="text-xs font-bold text-[#FF4D00] truncate">{activeChat.lead.latestCampaign.name}</span>
                      </div>
                    ) : null}

                    {/* Luego los demás datos de metadata */}
                    {activeChat.lead.metadata && Object.keys(activeChat.lead.metadata).length > 0 && typeof activeChat.lead.metadata === 'object' && Object.entries(activeChat.lead.metadata)
                      .filter(([key]) => !key.toLowerCase().startsWith('__empty'))
                      .map(([key, val]) => (
                        <div key={key} className="bg-[#EBE4D6]/30 dark:bg-zinc-900/50 px-3 py-2.5 rounded-lg border border-[#DDD5C2] dark:border-zinc-800 flex flex-col gap-0.5">
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
            className="pointer-events-auto glass-dark rounded-2xl p-4 w-72 animate-in slide-in-from-right-8 fade-in duration-500 cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              loadChatDetails(n.chatId);
              setNotifications(prev => prev.filter(item => item.id !== n.id));
            }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="dot-live" />
              <span className="text-xs font-bold text-[#FF4D00]">NUEVO MENSAJE MANUAL</span>
            </div>
            <p className="text-sm font-bold text-white line-clamp-1">{n.name}</p>
            <p className="text-xs text-[#6F6F6F] line-clamp-2 mt-1 italic">"{n.text}"</p>
          </div>
        ))}
      </div>

      {/* Modal de Doble Verificación para Bot Active */}
      {isBotConfirmModalOpen && activeChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#F5F0E5] dark:bg-[#1A1714] w-full max-w-md rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,.85),0_10px_26px_rgba(66,54,36,.12),0_28px_60px_rgba(66,54,36,.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_28px_60px_rgba(0,0,0,.6)] p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl flex items-center justify-center ${activeChat.botActive ? 'bg-amber-500/10 text-amber-600' : 'bg-[#FF4D00]/10 text-[#FF4D00]'}`}>
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD5C2]/60 dark:border-zinc-800">
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
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${activeChat.botActive
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-[#FF4D00] hover:bg-[#E64500] shadow-[#FF4D00]/20'
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
              className="absolute -top-12 right-0 text-white hover:text-[#FF4D00] transition-colors p-2"
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
                className="flex items-center gap-2 bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg"
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
