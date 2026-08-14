'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, Activity } from 'lucide-react';
import {
  checkAIModelsConnections,
  checkDatabaseConnection, 
  checkWhatsAppConnections,
  checkToolsConnections,
  checkMasterMetaConnection
} from '@/app/actions/health';

interface CheckStatus {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  details?: any[];
}

export default function HealthCheckModal({ onClose }: { onClose: () => void }) {
  const [checks, setChecks] = useState<CheckStatus[]>([
    { name: 'Master Abita Meta', status: 'idle' },
    { name: 'Base de Datos', status: 'idle' },
    { name: 'Modelos de IA', status: 'idle' },
    { name: 'Herramientas', status: 'idle' },
    { name: 'Tokens WhatsApp', status: 'idle' },
  ]);

  const runChecks = async () => {
    setChecks(prev => prev.map(c => ({ ...c, status: 'idle', message: undefined, details: undefined })));

    // Master Meta
    setChecks(prev => prev.map(c => c.name === 'Master Abita Meta' ? { ...c, status: 'loading', details: [] } : c));
    const masterResult = await checkMasterMetaConnection();
    setChecks(prev => prev.map(c => c.name === 'Master Abita Meta' ? { ...c, status: masterResult.status as any, message: masterResult.message, details: masterResult.details } : c));

    // Base de Datos
    setChecks(prev => prev.map(c => c.name === 'Base de Datos' ? { ...c, status: 'loading', details: [] } : c));
    const dbResult = await checkDatabaseConnection();
    setChecks(prev => prev.map(c => c.name === 'Base de Datos' ? { ...c, status: dbResult.status as any, message: dbResult.message, details: dbResult.details } : c));

    // Modelos
    setChecks(prev => prev.map(c => c.name === 'Modelos de IA' ? { ...c, status: 'loading', details: [] } : c));
    const aiResult = await checkAIModelsConnections();
    setChecks(prev => prev.map(c => c.name === 'Modelos de IA' ? { ...c, status: aiResult.status as any, message: aiResult.message, details: aiResult.details } : c));

    // Herramientas
    setChecks(prev => prev.map(c => c.name === 'Herramientas' ? { ...c, status: 'loading', details: [] } : c));
    const toolsResult = await checkToolsConnections();
    setChecks(prev => prev.map(c => c.name === 'Herramientas' ? { ...c, status: toolsResult.status as any, message: toolsResult.message, details: toolsResult.details } : c));

    // WhatsApp
    setChecks(prev => prev.map(c => c.name === 'Tokens WhatsApp' ? { ...c, status: 'loading', details: [] } : c));
    const waResult = await checkWhatsAppConnections();
    setChecks(prev => prev.map(c => c.name === 'Tokens WhatsApp' ? { ...c, status: waResult.status as any, message: waResult.message, details: waResult.details } : c));
  };

  useEffect(() => {
    runChecks();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="flex shrink-0 items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-semibold">
            <Activity className="w-5 h-5 text-orange-500" />
            Health Check del Sistema
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <div className="mt-0.5">
                {check.status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />}
                {check.status === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
                {check.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {check.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{check.name}</div>
                {check.message && (
                  <div className={`text-xs mt-1 ${check.status === 'error' ? 'text-red-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {check.message}
                  </div>
                )}
                {check.details && check.details.length > 0 && (
                  <div className="mt-2 space-y-1 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-xs max-h-48 overflow-y-auto">
                    {check.details.map((d: any, i: number) => (
                      <div key={i} className={`flex flex-col gap-1 py-1.5 border-b last:border-0 border-zinc-200 dark:border-zinc-700 ${d.status === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{d.name}</span>
                          {d.status === 'success' && <span className="flex-shrink-0 text-[10px] font-bold">OK</span>}
                        </div>
                        {d.status === 'error' && (
                          <p className="text-[10px] bg-red-50 dark:bg-red-900/20 p-2 rounded-md border border-red-100 dark:border-red-900/30 max-h-24 overflow-y-auto whitespace-pre-wrap">
                            {d.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 shrink-0 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button 
            onClick={runChecks}
            disabled={checks.some(c => c.status === 'loading')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Re-checar
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
