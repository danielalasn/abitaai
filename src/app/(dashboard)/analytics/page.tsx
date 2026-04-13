'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquareText, Megaphone, Flame, TrendingUp, Zap, HelpCircle, Bot, AlertCircle, Loader2 } from 'lucide-react'
import { getAnalyticsData } from '@/app/actions/analytics'
import Link from 'next/link'
import DateRangePicker from '@/components/ui/DateRangePicker'

type Analytics = {
  totalLeads: number;
  handedOffLeads: number;
  messagesSaved: number;
  unresolvedQuestions: number;
  totalCampaigns: number;
  conversionRate: number;
  autonomyRate: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  botActiveLeads: number;
  needsAgentLeads: number;
  agentLeads: number;
} | null

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => { fetchData() }, [dateRange])

  const fetchData = async () => {
    setIsLoading(true)
    const res = await getAnalyticsData({ start: dateRange.start || undefined, end: dateRange.end || undefined }) as Analytics
    setData(res)
    setIsLoading(false)
  }

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BarChart3 className="text-[#6F6F6F]" size={32} />
          <p className="text-sm text-[#6F6F6F]">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">
            Resumen de Rendimiento
          </h1>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} onClear={() => setDateRange({ start: '', end: '' })} />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* KPI 1 — Total Leads */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-[#111111]">
                <Users size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg">
                  <Users size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Total Leads Procesados</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.totalLeads}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2 flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" /> Clientes atendidos por el bot
                </p>
              </div>
            </div>

            {/* KPI 2 — Handoff */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-rose-500">
                <Flame size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Flame size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Consultas Calientes (Handoff)</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0]">{data?.handedOffLeads}</h3>
                  <span className="text-sm font-medium text-[#F36A2D] bg-[#F36A2D]/10 px-2 py-0.5 rounded-full">
                    {data?.conversionRate}%
                  </span>
                </div>
                <p className="text-xs text-[#6F6F6F] mt-2">Leads que pidieron hablar con humanos</p>
              </div>
            </div>

            {/* KPI 3 — Automatización */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-emerald-500">
                <Zap size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Zap size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 rounded-full">
                  {Math.round((data?.messagesSaved || 0) / 60)} HRS AHORRADAS
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Automatización (Mensajes)</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.messagesSaved}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2">Mensajes delegados al Agente Virtual</p>
              </div>
            </div>

            {/* KPI 4 — Preguntas */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-[#F36A2D]">
                <HelpCircle size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg">
                  <HelpCircle size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Preguntas Pendientes</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.unresolvedQuestions}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2">Temas que necesitan actualizarse en el Knowledge Base</p>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Autonomía */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">Autonomía de IA</h3>
              <div className="p-4 bg-[#E9E4D8]/60 dark:bg-[#111111]/60 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0]">Tasa de Autonomía</span>
                  <span className="text-sm font-bold text-[#F36A2D]">{data?.autonomyRate}%</span>
                </div>
                <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                  <div className="bg-[#F36A2D] h-2 rounded-full transition-all duration-700" style={{ width: `${data?.autonomyRate}%` }} />
                </div>
                <p className="text-[10px] text-[#6F6F6F] mt-3 leading-tight opacity-70">
                  Porcentaje de chats que la IA gestiona sin necesidad de intervención humana.
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#E9E4D8]/60 dark:bg-[#111111]/60 rounded-xl border border-[#DEDAD0] dark:border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[#6F6F6F] uppercase tracking-wider">Campañas</span>
                  <span className="text-lg font-bold text-[#111111] dark:text-[#EDE9E0]">{data?.totalCampaigns}</span>
                </div>
                <div className="h-10 w-10 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
                  <Megaphone size={18} />
                </div>
              </div>
            </div>

            {/* Estado de Atención */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] mb-4">Estado de Atención</h3>
              <div className="space-y-4">
                <Link href="/?status=BOT" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-[#F36A2D] bg-[#F36A2D]/10 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105 uppercase tracking-wider">
                      <Bot size={10} /> BOT
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.botActiveLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-[#F36A2D] h-2 rounded-full transition-all duration-500" style={{ width: `${data?.totalLeads ? Math.round(((data?.botActiveLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
                <Link href="/?status=NEEDS_AGENT" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105 uppercase tracking-wider">
                      <AlertCircle size={10} /> ALERTA
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.needsAgentLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]" style={{ width: `${data?.totalLeads ? Math.round(((data?.needsAgentLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
                <Link href="/?status=AGENT" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105 uppercase tracking-wider">
                      <Users size={10} /> HUMANO
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.agentLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${data?.totalLeads ? Math.round(((data?.agentLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
              </div>
            </div>

            {/* Temperatura */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] mb-4">Temperatura de Leads</h3>
              <div className="space-y-4">
                <Link href="/?heat=CALIENTE" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/20 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105">
                      <Flame size={10} /> CALIENTE
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.hotLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${data?.totalLeads ? Math.round(((data?.hotLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
                <Link href="/?heat=TIBIO" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-[#F36A2D] bg-[#F36A2D]/10 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105">
                      <TrendingUp size={10} /> TIBIO
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.warmLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-[#F36A2D] h-2 rounded-full transition-all duration-500" style={{ width: `${data?.totalLeads ? Math.round(((data?.warmLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
                <Link href="/?heat=FRIO" className="block group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-0.5 rounded flex items-center gap-1.5 transition-transform group-hover:scale-105">
                      ❄️ FRÍO
                    </span>
                    <span className="text-xs font-bold text-[#6F6F6F]">{data?.coldLeads}</span>
                  </div>
                  <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${data?.totalLeads ? Math.round(((data?.coldLeads || 0) / data?.totalLeads) * 100) : 0}%` }} />
                  </div>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
