'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Download, Search, RefreshCw, Flame, Snowflake,
  Thermometer, MessageSquare, Clock, Calendar, ChevronUp,
  ChevronDown, ChevronsUpDown, Loader2, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getLeads } from '@/app/actions/leads';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';

type Lead = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider">
      <Flame size={11} /> {score}pts
    </span>
  );
  if (heat === 'TIBIO') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wider">
      <Thermometer size={11} /> {score}pts
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-wider">
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
  if (!active) return <ChevronsUpDown size={13} className="text-[#6F6F6F]" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-[#F36A2D]" />
    : <ChevronDown size={13} className="text-[#F36A2D]" />;
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
  const [currentPage, setCurrentPage] = useState(1);

  // Reset key parameters to page 1 on filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey, sortDir]);

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
        (l.email || '').toLowerCase().includes(q) ||
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

  const itemsPerPage = 100;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedLeads = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const headers = ['Nombre', 'Correo', 'Número', 'Fecha Contacto', 'Último Mensaje', 'Temperatura', 'Score', 'Campaña Destino', 'Mensajes Enviados', 'Resumen IA'];
    const rows = filtered.map(l => [
      l.name || 'Sin nombre',
      l.email || '—',
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
    <DesktopOnlyGuard>
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Base de Leads</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
              <input
                type="text"
                placeholder="Buscar por nombre, número o resumen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl text-[#111111] dark:text-[#EDE9E0] placeholder-[#6F6F6F] outline-none focus:border-[#F36A2D] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#EDE9E0] rounded-2xl transition-all"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Actualizar
              </button>
              <button
                onClick={exportCSV}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-[#111111] dark:bg-[#EDE9E0] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 text-white dark:text-[#111111] rounded-2xl shadow-xl shadow-black/10 transition-all"
              >
                <Download size={14} />
                Exportar Todo (CSV)
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'TOTAL LEADS', value: leads.length, color: 'text-[#111111] dark:text-[#EDE9E0]' },
              { label: 'CALIENTES 🔥', value: leads.filter(l => l.heat === 'CALIENTE').length, color: 'text-red-600' },
              { label: 'CON RESUMEN IA', value: leads.filter(l => l.aiSummary).length, color: 'text-[#F36A2D]' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl px-6 py-4 shadow-sm">
                <p className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-80 gap-4">
                <Loader2 className="animate-spin text-[#F36A2D]" size={32} />
                <p className="text-sm text-[#6F6F6F] font-medium">Cargando base de datos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-[#6F6F6F]">
                <Users size={40} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">{search ? 'Sin resultados' : 'Aún no hay leads'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#DEDAD0] dark:border-zinc-800 bg-[#E9E4D8]/30 dark:bg-black/20">
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest">Contacto</th>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className="text-left px-4 py-4 text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest cursor-pointer hover:text-[#F36A2D] transition-colors select-none"
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="flex items-center gap-1.5">
                            {col.label}
                            <SortIcon active={sortKey === col.key} dir={sortDir} />
                          </div>
                        </th>
                      ))}
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={12} className="text-[#F36A2D]" />
                          Resumen IA
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEDAD0] dark:divide-zinc-800/60">
                    {paginatedLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-white dark:hover:bg-black/10 transition-colors group"
                      >
                        {/* Contact */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-[#F36A2D]/10 flex items-center justify-center text-[#F36A2D] font-bold text-sm shrink-0 border border-[#F36A2D]/20 shadow-sm">
                              {lead.name ? lead.name.charAt(0).toUpperCase() : '#'}
                            </div>
                            <div>
                              <p className="font-bold text-[#111111] dark:text-[#EDE9E0]">
                                {lead.name || 'Sin nombre'}
                              </p>
                              <div className="flex flex-col gap-1 mt-0.5">
                                <p className="text-xs text-[#6F6F6F] font-mono">{lead.phone}</p>
                                {lead.email && <p className="text-[10px] text-[#F36A2D]/80 font-medium truncate max-w-[150px]">{lead.email}</p>}
                                {lead.latestCampaignName && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 text-[#6F6F6F] px-1.5 py-0.5 rounded-sm w-max">
                                    {lead.latestCampaignName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-2 text-[#6F6F6F]">
                            <Calendar size={13} className="shrink-0" />
                            <span className="text-xs font-medium">{formatRelative(lead.createdAt)}</span>
                          </div>
                        </td>

                        {/* Last Message */}
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-2 text-[#6F6F6F]">
                            <Clock size={13} className="shrink-0" />
                            <span className="text-xs font-medium">{formatRelative(lead.lastMessageAt)}</span>
                          </div>
                        </td>

                        {/* Heat */}
                        <td className="px-4 py-5">
                          <HeatBadge heat={lead.heat} score={lead.score} />
                        </td>

                        {/* Message Count */}
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-2 text-[#6F6F6F]">
                            <MessageSquare size={13} className="text-[#F36A2D]/40" />
                            <span className="font-bold text-[#111111] dark:text-[#EDE9E0]">{lead.userMessageCount}</span>
                          </div>
                        </td>

                        {/* AI Summary */}
                        <td className="px-6 py-5 max-w-xs">
                          {lead.aiSummary ? (
                            <div className="bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-2xl border border-[#DEDAD0]/40 dark:border-zinc-800/40">
                              <p className={`text-xs text-[#6F6F6F] leading-relaxed italic ${expandedSummary === lead.id ? '' : 'line-clamp-2'}`}>
                                "{lead.aiSummary}"
                              </p>
                              {lead.aiSummary.length > 100 && (
                                <button
                                  onClick={() => setExpandedSummary(expandedSummary === lead.id ? null : lead.id)}
                                  className="text-[10px] font-bold text-[#F36A2D] hover:underline mt-2 uppercase tracking-widest"
                                >
                                  {expandedSummary === lead.id ? 'Ver menos' : 'Ver más'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#6F6F6F]/40 italic">
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
              <div className="px-6 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between bg-[#E9E4D8]/20 dark:bg-black/10">
                <p className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest">
                  Mostrando <span className="text-[#111111] dark:text-[#EDE9E0]">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="text-[#111111] dark:text-[#EDE9E0]">{filtered.length}</span> leads
                </p>

                {/* Controles de Paginación */}
                <div className="flex items-center gap-3">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shadow-sm"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shadow-sm"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <p className="text-[10px] text-[#6F6F6F] flex items-center gap-2 font-bold uppercase tracking-widest hidden md:flex">
                  <Sparkles size={11} className="text-[#F36A2D]" />
                  Resúmenes IA Autogenerados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </DesktopOnlyGuard>
  );
}
