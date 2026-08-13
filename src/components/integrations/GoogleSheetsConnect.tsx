'use client';

import { useState } from 'react';
import Nango from '@nangohq/frontend';

interface GoogleSheetsConnectProps {
  projectId: string;
  isConnected: boolean;
  onStatusChange?: (connected: boolean) => void;
  onOpenConfig?: () => void;
}

const PROVIDER_CONFIG_KEY = 'google-sheet';

export default function GoogleSheetsConnect({
  projectId,
  isConnected,
  onStatusChange,
  onOpenConfig,
}: GoogleSheetsConnectProps) {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(isConnected);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const sessionRes = await fetch('/api/integrations/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, provider: PROVIDER_CONFIG_KEY }),
      });
      const sessionData = await sessionRes.json();

      if (!sessionData.success || !sessionData.token) {
        throw new Error(sessionData.error || 'No se pudo obtener la sesión de autenticación.');
      }

      const connectLink = sessionData.connectLink || 
        `https://connect.nango.dev/?session_token=${sessionData.token}&provider_config_key=google-sheet`;

      await new Promise<void>((resolve, reject) => {
        const popup = window.open(connectLink, 'nango-connect', 'width=500,height=700,scrollbars=yes');

        if (!popup) {
          reject(new Error('El navegador bloqueó el popup. Permite popups para este sitio.'));
          return;
        }

        const onMessage = (event: MessageEvent) => {
          if (!event.origin.includes('nango.dev') && !event.origin.includes('localhost')) return;
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

        const pollClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollClosed);
            window.removeEventListener('message', onMessage);
            resolve(); 
          }
        }, 500);
      });

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
      className={`group p-8 bg-white dark:bg-[#111111]/60 border rounded-[3rem] shadow-2xl shadow-black/5 flex flex-col items-center text-center transition-all duration-500 hover:scale-[1.02] hover:border-green-500/40 ${
      connected
        ? 'border-green-500/20 ring-1 ring-green-500/20'
        : 'border-[#DEDAD0] dark:border-zinc-800'
    }`}
    >
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-green-500 rounded-2xl blur-xl opacity-10 group-hover:opacity-30 transition-opacity" />
        <div className="relative h-16 w-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:-rotate-3 transition-transform duration-500">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.5" />
            <path d="M3 10h18M9 4v16M15 4v16" stroke="#dadce0" strokeWidth="1.5" />
            <rect x="3" y="4" width="6" height="6" fill="#34a853" rx="2" />
          </svg>
        </div>
        {connected && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#111111] rounded-full shadow-lg animate-pulse" />
        )}
      </div>

      <h3 className="text-2xl font-black text-zinc-900 dark:text-[#EDE9E0] tracking-tight mb-2">
        Google Sheets
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-[240px]">
        Conecta tus hojas de cálculo para leer y escribir datos.
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
              id={`disconnect-google-sheets-${projectId}`}
            >
              {loading ? '...' : 'Desconectar'}
            </button>
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="flex-1 py-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
              >
                Configurar
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-4 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-green-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            id={`connect-google-sheets-${projectId}`}
          >
            {loading ? 'Conectando...' : 'Conectar Google Sheets'}
          </button>
        )}
      </div>
    </div>
  );
}
