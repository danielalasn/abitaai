'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Download, Search, RefreshCw, Flame, Snowflake,
  Thermometer, MessageSquare, Clock, Calendar, ChevronUp,
  ChevronDown, ChevronsUpDown, Loader2, Sparkles
} from 'lucide-react';
import { getLeads } from '@/app/actions/leads';

type Lead = {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  score: number;
  heat: string;
  aiSummary: string | null;
  latestCampaignName: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  userMessageCount: number;
};

type SortKey = 'createdAt' | 'lastMessageAt' | 'score' | 'userMessageCount';
type SortDir = 'asc' | 'desc';

function HeatBadge({ heat, score }: { heat: string; score: number }) {
  if (heat === 'CALIENTE') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Flame size={11} /> {score}pts
    </span>
  );
  if (heat === 'TIBIO') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Thermometer size={11} /> {score}pts
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <Snowflake size={11} /> {score}pts
    </span>
  );
}

function formatRelative(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Hoy ${time}`;
  if (diffDays === 1) return `Ayer ${time}`;
  if (diffDays < 7) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${days[d.getDay()]} ${time}`;
  }
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={13} className="text-zinc-400" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-purple-500" />
    : <ChevronDown size={13} className="text-purple-500" />;
}

export default function LeadsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await getLeads();
    setLeads(data as Lead[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = leads
    .filter(l => {
      const q = search.toLowerCase();
      return (
        l.phone.includes(q) ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.aiSummary || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'score' || sortKey === 'userMessageCount') {
        return (a[sortKey] - b[sortKey]) * dir;
      }
      const av = a[sortKey] ? new Date(a[sortKey]!).getTime() : 0;
      const bv = b[sortKey] ? new Date(b[sortKey]!).getTime() : 0;
      return (av - bv) * dir;
    });

  const exportCSV = () => {
    const headers = ['Nombre', 'Número', 'Fecha Contacto', 'Último Mensaje', 'Temperatura', 'Score', 'Campaña Destino', 'Mensajes Enviados', 'Resumen IA'];
    const rows = filtered.map(l => [
      l.name || 'Sin nombre',
      l.phone,
      new Date(l.createdAt).toLocaleDateString('es-ES'),
      l.lastMessageAt ? new Date(l.lastMessageAt).toLocaleDateString('es-ES') : '—',
      l.heat,
      l.score,
      l.latestCampaignName ? `"${l.latestCampaignName}"` : '—',
      l.userMessageCount,
      `"${(l.aiSummary || 'Sin resumen').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: 'createdAt', label: 'Fecha Contacto' },
    { key: 'lastMessageAt', label: 'Último Mensaje' },
    { key: 'score', label: 'Temperatura' },
    { key: 'userMessageCount', label: 'Mensajes' },
  ];

  return (
    <div className="min-h-full bg-[#F4F1EC] dark:bg-[#0E0E10] p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Base de Leads</h1>
            <p className="text-sm text-zinc-500">Historial completo de contactos con resumen IA</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, número o resumen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:border-purple-400 transition-all"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-purple-500/20 transition-all"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Leads', value: leads.length, color: 'text-zinc-900 dark:text-white' },
          { label: 'Calientes 🔥', value: leads.filter(l => l.heat === 'CALIENTE').length, color: 'text-red-600 dark:text-red-400' },
          { label: 'Con Resumen IA', value: leads.filter(l => l.aiSummary).length, color: 'text-purple-600 dark:text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">{search ? 'Sin resultados para esa búsqueda' : 'Aún no hay leads registrados'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contacto</th>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 transition-colors select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Resumen IA
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm shrink-0">
                          {lead.name ? lead.name.charAt(0).toUpperCase() : '#'}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {lead.name || 'Sin nombre'}
                          </p>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <p className="text-xs text-zinc-400 font-mono">{lead.phone}</p>
                            {lead.latestCampaignName && (
                              <span className="text-[10px] items-center flex w-max bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-sm font-medium">
                                Campaña: {lead.latestCampaignName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Calendar size={13} className="shrink-0" />
                        <span className="text-xs">{formatRelative(lead.createdAt)}</span>
                      </div>
                    </td>

                    {/* Last Message */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Clock size={13} className="shrink-0" />
                        <span className="text-xs">{formatRelative(lead.lastMessageAt)}</span>
                      </div>
                    </td>

                    {/* Heat */}
                    <td className="px-4 py-4">
                      <HeatBadge heat={lead.heat} score={lead.score} />
                    </td>

                    {/* Message Count */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <MessageSquare size={13} className="shrink-0" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{lead.userMessageCount}</span>
                      </div>
                    </td>

                    {/* AI Summary */}
                    <td className="px-4 py-4 max-w-xs">
                      {lead.aiSummary ? (
                        <div>
                          <p className={`text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed ${expandedSummary === lead.id ? '' : 'line-clamp-2'}`}>
                            {lead.aiSummary}
                          </p>
                          {lead.aiSummary.length > 100 && (
                            <button
                              onClick={() => setExpandedSummary(expandedSummary === lead.id ? null : lead.id)}
                              className="text-xs text-purple-500 hover:text-purple-700 font-medium mt-0.5"
                            >
                              {expandedSummary === lead.id ? 'Ver menos' : 'Ver más'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">
                          {lead.userMessageCount < 3 ? 'Menos de 3 mensajes' : 'Generando...'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Mostrando <span className="font-semibold text-zinc-600 dark:text-zinc-300">{filtered.length}</span> de <span className="font-semibold text-zinc-600 dark:text-zinc-300">{leads.length}</span> leads
            </p>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Sparkles size={11} className="text-purple-400" />
              Resúmenes generados automáticamente por IA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
