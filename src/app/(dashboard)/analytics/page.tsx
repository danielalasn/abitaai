'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquareText, Megaphone, Flame, TrendingUp, Zap, HelpCircle, Bot, AlertCircle, Loader2, Clock, CheckCircle2, CheckCheck, Smartphone, Cpu } from 'lucide-react'
import { getAnalyticsData } from '@/app/actions/analytics'
import Link from 'next/link'
import DateRangePicker from '@/components/ui/DateRangePicker'
import { format, startOfMonth } from 'date-fns'
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard'

type Analytics = {
  totalLeads: number;
  handedOffLeads: number;
  messagesSaved: number;
  unresolvedQuestions: number;
  totalCampaigns: number;
  campaignMessagesCount: number;
  humanMessagesCount: number;
  timeSavedMinutes: number;
  whatsappDeliveryRate: number;
  whatsappReadRate: number;
  whatsappLeads: number;
  instagramLeads: number;
  conversionRate: number;
  autonomyRate: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  botActiveLeads: number;
  needsAgentLeads: number;
  agentLeads: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedAiCostUsd: number;
  estimatedInputCostUsd: number;
  estimatedOutputCostUsd: number;
  sentByUsCount: number;
  proactiveMessagesCount: number;
  planUsageAllTime: number;
  tierLimit: number;
  tierName: string;
  tierUsage: number;
} | null

const CACHE_KEY = 'analytics_date_range'
const CACHE_DURATION_MS = 60 * 60 * 1000 // 60 minutos

const getDefaultDateRange = () => {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd')
  }
}

const formatTimeSaved = (minutes: number) => {
  if (!minutes) return { value: "0", unit: "MIN", sub: "Ahorrados" }
  if (minutes < 60) return { value: minutes.toString(), unit: "MIN", sub: "Ahorrados" }
  const hours = minutes / 60
  if (hours < 8) return { value: hours.toFixed(1), unit: "HRS", sub: "Ahorradas" }
  const days = hours / 8
  return { value: days.toFixed(1), unit: "DÍAS", sub: "Laborables ahorrados" }
}

const formatTokens = (num: number) => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + 'k'
  }
  return num.toString()
}

const formatCost = (cost: number) => {
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize date range from cache or default
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        const now = Date.now()
        if (now - parsed.timestamp < CACHE_DURATION_MS) {
          setDateRange(parsed.range)
          setIsInitialized(true)
          return
        }
      } catch (e) {
        // ignore parsing errors
      }
    }
    setDateRange(getDefaultDateRange())
    setIsInitialized(true)
  }, [])

  // Save to cache whenever dateRange changes
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        range: dateRange,
        timestamp: Date.now()
      }))
    }
  }, [dateRange, isInitialized])

  useEffect(() => { 
    if (isInitialized) {
      fetchData() 
    }
  }, [dateRange, isInitialized])

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

  const timeSaved = formatTimeSaved(data?.timeSavedMinutes || 0)

  const totalLimit = 1000
  const usage = data?.planUsageAllTime || 0
  const usagePct = Math.max(0, Math.min(100, Math.round((usage / totalLimit) * 100)))
  const remaining = Math.max(0, totalLimit - usage)
  const remainingPct = Math.max(0, Math.min(100, Math.round((remaining / totalLimit) * 100)))

  return (
    <DesktopOnlyGuard>
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
        <DateRangePicker value={dateRange} onChange={setDateRange} onClear={() => setDateRange(getDefaultDateRange())} />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

          {/* Límite de Mensajes Enviados */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
            <span className="block text-lg font-bold text-[#111111] dark:text-[#EDE9E0]">
              {data?.tierName || 'Tier 1'}
            </span>
            <span className="block text-sm text-[#6F6F6F] mt-1">
              {data?.tierUsage || 0} / {data?.tierLimit || 250}
            </span>
          </div>

          {/* Top KPIs - ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* IA Automation */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-emerald-500">
                <Zap size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Bot size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 rounded-full">
                  AUTOPILOT
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Mensajes IA</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.messagesSaved}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2">Respuestas autónomas del bot</p>
              </div>
            </div>

            {/* Campaign Messages */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-indigo-500">
                <Megaphone size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Megaphone size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Contactos Iniciales</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.proactiveMessagesCount}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2">Campañas e inicios de chat</p>
              </div>
            </div>

            {/* Human Messages */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-amber-500">
                <Users size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                  <MessageSquareText size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-[#6F6F6F]">Respuestas Humanas</p>
                <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.humanMessagesCount}</h3>
                <p className="text-xs text-[#6F6F6F] mt-2">Enviados por agentes en chats activos</p>
              </div>
            </div>

            {/* Time Saved */}
            <div className="bg-[#111111] dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none text-[#F36A2D]">
                <Clock size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-[#F36A2D]/20 text-[#F36A2D] rounded-lg shadow-sm">
                  <Clock size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-zinc-400">Tiempo de Gestión</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-white">{timeSaved.value}</h3>
                  <span className="text-lg font-bold text-[#F36A2D]">{timeSaved.unit}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">{timeSaved.sub}</p>
              </div>
            </div>

          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Autonomía y Entrega */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col space-y-4 lg:col-span-1">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">Métricas Clave</h3>
              
              {/* Autonomía */}
              <div className="p-4 bg-[#E9E4D8]/60 dark:bg-[#111111]/60 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0]">Tasa de Autonomía IA</span>
                  <span className="text-sm font-bold text-[#F36A2D]">{data?.autonomyRate}%</span>
                </div>
                <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                  <div className="bg-[#F36A2D] h-2 rounded-full transition-all duration-700" style={{ width: `${data?.autonomyRate}%` }} />
                </div>
              </div>

              {/* Entrega WhatsApp */}
              <div className="p-4 bg-[#E9E4D8]/60 dark:bg-[#111111]/60 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> Entregados</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{data?.whatsappDeliveryRate}%</span>
                </div>
                <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2 mb-3">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: `${data?.whatsappDeliveryRate}%` }} />
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-1.5"><CheckCheck size={14} className="text-blue-500"/> Leídos</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{data?.whatsappReadRate}%</span>
                </div>
                <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-700" style={{ width: `${data?.whatsappReadRate}%` }} />
                </div>
              </div>
            </div>

            {/* Estado de Atención */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] mb-4">Estado de Atención</h3>
              <div className="space-y-4">
                <Link href="/inbox?status=BOT" className="block group">
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
                <Link href="/inbox?status=NEEDS_AGENT" className="block group">
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
                <Link href="/inbox?status=AGENT" className="block group">
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

            {/* Temperatura e Interacciones */}
            <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] mb-4">Temperatura de Leads</h3>
              <div className="space-y-4">
                <Link href="/inbox?heat=CALIENTE" className="block group">
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
                <Link href="/inbox?heat=TIBIO" className="block group">
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
                <Link href="/inbox?heat=FRIO" className="block group">
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
              
              {/* Canales */}
              <div className="mt-6 pt-6 border-t border-[#DEDAD0] dark:border-zinc-800 flex justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#6F6F6F] uppercase font-bold tracking-wider mb-1">WhatsApp</span>
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-1.5"><Smartphone size={14} className="text-emerald-500"/> {data?.whatsappLeads || 0} leads</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-[#6F6F6F] uppercase font-bold tracking-wider mb-1">Instagram</span>
                  <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-1.5 justify-end"><Smartphone size={14} className="text-rose-500"/> {data?.instagramLeads || 0} leads</span>
                </div>
              </div>
            </div>

          </div>
          
        </div>
      </div>
    </div>
    </DesktopOnlyGuard>
  )
}
