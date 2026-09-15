'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  ai_messages: number;
  agent_messages: number;
  template_messages: number;
}

export interface ChartClient {
  id: string;
  name: string;
  projectId: string;
}

interface MessageChartProps {
  data: ChartDataPoint[];
  /** Pass clients list to enable per-user filtering (global chart only) */
  clients?: ChartClient[];
  /** Called when user toggles client selection — parent should re-fetch */
  onClientFilterChange?: (selectedProjectIds: string[] | null) => void;
}

const SERIES = [
  { key: 'ai_messages',       label: 'Mensajes IA',       color: '#10b981' },
  { key: 'agent_messages',    label: 'Mensajes Nosotros', color: '#f59e0b' },
  { key: 'template_messages', label: 'Mensajes Template', color: '#6366f1' },
] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl text-xs min-w-[160px]">
      <p className="text-zinc-400 font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: entry.color }} />
            <span className="text-zinc-300">{entry.name}</span>
          </div>
          <span className="font-bold text-white">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export function MessageChart({ data, clients, onClientFilterChange }: MessageChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hiddenClients, setHiddenClients] = useState<Set<string>>(new Set());

  const formattedData = useMemo(() =>
    data.map(d => {
      const parts = d.date.split('-');
      return parts.length === 3
        ? { ...d, displayDate: `${parts[2]}/${parts[1]}` }
        : { ...d, displayDate: d.date };
    }), [data]);

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleClient = (clientId: string, projectId: string) => {
    setHiddenClients(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);

      if (onClientFilterChange) {
        const allIds = clients!.map(c => c.projectId);
        const hiddenIds = new Set(
          [...next].map(cid => clients!.find(c => c.id === cid)?.projectId).filter(Boolean) as string[]
        );
        const visible = allIds.filter(id => !hiddenIds.has(id));
        // null means "show all"
        onClientFilterChange(visible.length === allIds.length ? null : visible);
      }

      return next;
    });
  };

  const hasData = data && data.length > 0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Series toggles */}
        <div className="flex flex-wrap gap-2">
          {SERIES.map(s => {
            const active = !hiddenSeries.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSeries(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 bg-transparent line-through'
                }`}
                style={active ? { background: s.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0 transition-opacity"
                  style={{ background: s.color, opacity: active ? 1 : 0.3 }}
                />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Client toggles (only in global chart) */}
        {clients && clients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider self-center mr-1">Usuarios:</span>
            {clients.map((c, i) => {
              const active = !hiddenClients.has(c.id);
              const hue = (i * 47) % 360;
              const color = `hsl(${hue}, 65%, 55%)`;
              return (
                <button
                  key={c.id}
                  onClick={() => toggleClient(c.id, c.projectId)}
                  title={c.name}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all max-w-[140px] ${
                    active
                      ? 'border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 line-through'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: color, opacity: active ? 1 : 0.3 }}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="w-full h-[300px] flex items-center justify-center text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-sm">
          No hay datos para este rango de fechas.
        </div>
      ) : (
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.3} />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {SERIES.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  name={s.label}
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={hiddenSeries.has(s.key) ? 0 : 2.5}
                  dot={hiddenSeries.has(s.key) ? false : { r: 2.5, fill: s.color, strokeWidth: 0 }}
                  activeDot={hiddenSeries.has(s.key) ? false : { r: 5 }}
                  hide={hiddenSeries.has(s.key)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
