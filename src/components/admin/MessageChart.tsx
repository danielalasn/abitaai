'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  ai_messages: number;
  agent_messages: number;
  template_messages: number;
}

interface MessageChartProps {
  data: ChartDataPoint[];
}

export function MessageChart({ data }: MessageChartProps) {
  // Format date for display (DD/MM)
  const formattedData = data.map(d => {
    const parts = d.date.split('-');
    if (parts.length === 3) {
      return {
        ...d,
        displayDate: `${parts[2]}/${parts[1]}`
      };
    }
    return { ...d, displayDate: d.date };
  });

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl">
        No hay datos para este rango de fechas.
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.3} />
          <XAxis 
            dataKey="displayDate" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line 
            type="monotone" 
            name="Mensajes IA"
            dataKey="ai_messages" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            name="Mensajes Nosotros"
            dataKey="agent_messages" 
            stroke="#f59e0b" 
            strokeWidth={3}
            dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            name="Mensajes Template"
            dataKey="template_messages" 
            stroke="#6366f1" 
            strokeWidth={3}
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
