'use client';

import { useState } from 'react';
import Nango from '@nangohq/frontend';

interface GoogleCalendarConnectProps {
  projectId: string;
  isConnected: boolean;
  onStatusChange?: (connected: boolean) => void;
  onOpenConfig?: () => void;
}

const PROVIDER_CONFIG_KEY = 'google-calendar';

/**
 * Componente para conectar/desconectar Google Calendar via Nango OAuth.
 * Usa @nangohq/frontend para abrir el flujo OAuth en un popup.
 */
export default function GoogleCalendarConnect({
  projectId,
  isConnected,
  onStatusChange,
  onOpenConfig,
}: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(isConnected);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener token de sesión seguro del backend
      const sessionRes = await fetch('/api/integrations/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const sessionData = await sessionRes.json();
      console.log('[Frontend Nango Session Data]:', sessionData);

      if (!sessionData.success || !sessionData.token) {
        throw new Error(sessionData.error || 'No se pudo obtener la sesión de autenticación.');
      }

      // 2. Abrir el connect_link de Nango como popup y esperar el mensaje de retorno
      const connectLink = sessionData.connectLink || 
        `https://connect.nango.dev/?session_token=${sessionData.token}&provider_config_key=google-calendar`;

      await new Promise<void>((resolve, reject) => {
        const popup = window.open(connectLink, 'nango-connect', 'width=500,height=700,scrollbars=yes');

        if (!popup) {
          reject(new Error('El navegador bloqueó el popup. Permite popups para este sitio.'));
          return;
        }

        const onMessage = (event: MessageEvent) => {
          if (!event.origin.includes('nango.dev') && !event.origin.includes('localhost')) return;
          console.log('[Nango Popup Message]:', event.data);
          const type = event.data?.type || event.data?.eventType || '';
          const status = event.data?.status || '';
          
          if (type === 'AUTHORIZATION_SUCCEEDED' || type === 'success' || status === 'success') {
            window.removeEventListener('message', onMessage);
            popup.close();
            resolve();
          } else if (event.data?.eventType === 'AUTHORIZATION_FAILED' || event.data?.error) {
            window.removeEventListener('message', onMessage);
            popup.close();
            reject(new Error(event.data?.error?.message || 'Error al autorizar'));
          }
        };
        window.addEventListener('message', onMessage);

        // Poll por si el popup se cierra manualmente
        const pollClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollClosed);
            window.removeEventListener('message', onMessage);
            resolve(); // Asumimos que fue exitoso si el usuario cerró el popup
          }
        }, 500);
      });

      // 3. Guardar en la DB local — el backend busca el connection_id real en Nango
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          providerConfigKey: PROVIDER_CONFIG_KEY,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar la conexión');
      }

      setConnected(true);
      onStatusChange?.(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      // El usuario cerró el popup — no mostrar error
      if (!msg.includes('cancelled') && !msg.includes('closed')) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, providerConfigKey: PROVIDER_CONFIG_KEY }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al desconectar');
      }

      setConnected(false);
      onStatusChange?.(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`group p-8 bg-white dark:bg-[#111111]/60 border rounded-[3rem] shadow-2xl shadow-black/5 flex flex-col items-center text-center transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/40 ${
        connected
          ? 'border-blue-500/20 ring-1 ring-blue-500/20'
          : 'border-[#DEDAD0] dark:border-zinc-800'
      }`}
    >
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-10 group-hover:opacity-30 transition-opacity" />
        <div className="relative h-16 w-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:-rotate-3 transition-transform duration-500">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.5" />
            <rect x="3" y="7" width="18" height="3" fill="#4285f4" />
            <rect x="7" y="2" width="2" height="4" rx="1" fill="#4285f4" />
            <rect x="15" y="2" width="2" height="4" rx="1" fill="#4285f4" />
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#ea4335" />
            <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#34a853" />
            <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#fbbc04" />
          </svg>
        </div>
        {connected && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#111111] rounded-full shadow-lg animate-pulse" />
        )}
        {connected && onOpenConfig && (
          <button 
            onClick={onOpenConfig}
            className="absolute -top-3 -left-3 p-2 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-md text-zinc-500 hover:text-blue-500 transition-colors z-10"
            title="Configurar Calendario"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        )}
      </div>

      <h3 className="text-2xl font-black text-zinc-900 dark:text-[#EDE9E0] tracking-tight mb-2">
        Google Calendar
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-[240px]">
        Gestión de disponibilidad y citas desde el chat.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 w-full">
          {error}
        </div>
      )}

      <div className="mt-auto flex gap-3 w-full">
        {connected ? (
          <div className="flex w-full gap-2">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 py-4 bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
              id={`disconnect-google-calendar-${projectId}`}
            >
              {loading ? '...' : 'Desconectar'}
            </button>
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="flex-1 py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
              >
                Configurar
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-4 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            id={`connect-google-calendar-${projectId}`}
          >
            {loading ? 'Conectando...' : 'Conectar Google Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}
