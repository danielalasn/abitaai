'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquareText, Megaphone, Flame, TrendingUp, Zap, HelpCircle, Bot, AlertCircle, Loader2, Clock, CheckCircle2, CheckCheck, Smartphone, Cpu, Info, Shield, ArrowUp, Send, X } from 'lucide-react'
import { getAnalyticsData } from '@/app/actions/analytics'
import Link from 'next/link'
import DateRangePicker from '@/components/ui/DateRangePicker'
import { format, startOfMonth } from 'date-fns'
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard'
import { MessageChart } from '@/components/admin/MessageChart'

type Analytics = {
  totalLeads: number;
  handedOffLeads: number;
  messagesSaved: number;
  unresolvedQuestions: number;
  totalCampaigns: number;
  campaignMessagesCount: number;
  humanMessagesCount: number;
  totalResponses: number;
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
  abitaMessageLimit: number;
  abitaMessageUsage: number;
  dailyTrends: any[];
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

const getTierInfo = (tierName: string, tierLimit: number) => {
  const name = tierName?.toLowerCase() || ''
  if (tierLimit <= 250) {
    return {
      color: 'text-zinc-500',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      border: 'border-zinc-200 dark:border-zinc-700',
      badge: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400',
      description: 'Nivel inicial de todo portfolio comercial nuevo en WhatsApp Business.'
    }
  }
  if (tierLimit <= 2000) {
    return {
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
      description: 'Primer nivel de aumento manual. Desbloqueado al verificar el negocio o enviar 2,000 mensajes en 30 días.'
    }
  }
  if (tierLimit <= 10000) {
    return {
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
      description: 'Tier de alto volumen. Aumento automático desde 2,000 por uso sostenido.'
    }
  }
  if (tierLimit <= 100000) {
    return {
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
      description: 'Tier empresarial de gran escala. Segundo aumento automático.'
    }
  }
  return {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    description: 'Nivel máximo de mensajería. Sin límites prácticos de escala.'
  }
}

function TierInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#111111] border border-[#DEDAD0] dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#F36A2D]" />
            <h3 className="font-bold text-[#111111] dark:text-white text-sm">Cómo funcionan los Tiers de WhatsApp</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#6F6F6F]">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-sm">
          <p className="text-[#6F6F6F] leading-relaxed">
            Los <strong className="text-[#111111] dark:text-white">límites de mensajes</strong> son el máximo de usuarios únicos a los que puedes enviar mensajes
            <strong> fuera de la ventana de atención al cliente de 24h</strong>, en un periodo continuo de 24 horas.
            Se aplican al <strong>portfolio comercial</strong> completo (todos los números de la empresa comparten el mismo límite).
          </p>

          <div className="space-y-3">
            <p className="text-xs font-bold text-[#6F6F6F] uppercase tracking-widest">Escala de Tiers</p>
            {[
              { tier: 'Tier 0', desc: 'Inicio de todo portfolio nuevo (250 limit)', color: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' },
              { tier: 'Tier 1', desc: 'Primer aumento manual/verif (2,000 limit)', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
              { tier: 'Tier 2', desc: 'Aumento automático (10,000 limit)', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
              { tier: 'Tier 3', desc: 'Aumento automático (100,000 limit)', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
              { tier: 'Tier 4', desc: 'Aumento automático final (Ilimitado)', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${t.color}`}>{t.tier}</span>
                <span className="text-xs text-[#6F6F6F]">{t.desc}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#E9E4D8]/60 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#111111] dark:text-white">Para subir de Tier 0 → Tier 1 (manual):</p>
            <ul className="space-y-1.5 text-xs text-[#6F6F6F]">
              <li className="flex gap-2"><span className="shrink-0 mt-0.5">A.</span>Verificar tu empresa con Meta (Business Verification en Meta Business Suite)</li>
              <li className="flex gap-2"><span className="shrink-0 mt-0.5">B.</span>Enviar y entregar 2,000 mensajes fuera de ventana de 24h a usuarios únicos, en 30 días continuos, usando plantillas de calidad alta</li>
            </ul>
          </div>

          <div className="bg-[#E9E4D8]/60 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#111111] dark:text-white">Para aumentos automáticos (Tier 1 → Tier 2 → Tier 3 → Tier 4):</p>
            <ul className="space-y-1.5 text-xs text-[#6F6F6F]">
              <li className="flex gap-2"><span className="shrink-0 mt-0.5">•</span>Usar al menos el 50% del límite actual en los últimos 7 días</li>
              <li className="flex gap-2"><span className="shrink-0 mt-0.5">•</span>Mantener calidad alta en todos los mensajes y plantillas (sin reportes de spam)</li>
              <li className="flex gap-2"><span className="shrink-0 mt-0.5">•</span>Si se cumplen ambos criterios, Meta sube el tier automáticamente en un plazo de 6 horas</li>
            </ul>
          </div>

          <p className="text-[11px] text-[#6F6F6F] italic">
            Nota: El límite aplica a nivel de portfolio, no por número. Si tienes varios números, comparten el mismo cupo.
          </p>
        </div>
      </div>
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-[#6F6F6F] hover:text-[#F36A2D] transition-colors ml-1"
      >
        <Info size={13} />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-[#111111] text-white text-xs rounded-xl px-3 py-2 shadow-xl z-50 pointer-events-none leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111111]" />
        </span>
      )}
    </span>
  )
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [isInitialized, setIsInitialized] = useState(false)
  const [showTierInfo, setShowTierInfo] = useState(false)

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
    let startIso, endIso;
    if (dateRange.start) {
      startIso = new Date(dateRange.start + 'T00:00:00').toISOString();
    }
    if (dateRange.end) {
      endIso = new Date(dateRange.end + 'T23:59:59.999').toISOString();
    }
    const res = await getAnalyticsData({ start: startIso, end: endIso }) as Analytics
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

  const tierInfo = getTierInfo(data?.tierName || 'Tier 1', data?.tierLimit || 250)
  const tierUsagePct = data?.tierLimit ? Math.min(100, Math.round((data.tierUsage / data.tierLimit) * 100)) : 0
  const abitaUsagePct = data?.abitaMessageLimit ? Math.min(100, Math.round(((data.abitaMessageUsage || 0) / data.abitaMessageLimit) * 100)) : 0

  const totalRes = data?.totalResponses ?? (
    (data?.messagesSaved || 0) + (data?.humanMessagesCount || 0) + (data?.proactiveMessagesCount || 0)
  )

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
          <div className="flex items-center gap-3">
            {isLoading && data && (
              <Loader2 size={16} className="text-[#F36A2D] animate-spin" />
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} onClear={() => setDateRange(getDefaultDateRange())} />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8 pb-12">

            {/* TIER CARD AND ABITA LIMIT CARD */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              
              {/* TIER CARD */}
              <div className={`border rounded-2xl p-6 shadow-sm ${tierInfo.border} ${tierInfo.bg}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={16} className={tierInfo.color} />
                      <span className="text-xs font-bold text-[#6F6F6F] uppercase tracking-widest">Tier de Mensajería WhatsApp</span>
                      <button
                        onClick={() => setShowTierInfo(true)}
                        className="text-[#6F6F6F] hover:text-[#F36A2D] transition-colors"
                        title="¿Cómo funcionan los tiers?"
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className={`text-2xl font-bold ${tierInfo.color}`}>{data?.tierName || 'Tier 0'}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierInfo.badge}`}>
                        {data?.tierUsage || 0} / {data?.tierLimit || 250} iniciadas (24h)
                      </span>
                    </div>
                    <p className="text-sm text-[#6F6F6F] mt-2 leading-relaxed">{tierInfo.description}</p>
                  </div>
                  <div className="w-full sm:w-48 shrink-0">
                    <div className="flex justify-between text-xs text-[#6F6F6F] mb-1.5">
                      <span>Uso del día</span>
                      <span className={`font-bold ${tierInfo.color}`}>{tierUsagePct}%</span>
                    </div>
                    <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${tierUsagePct > 80 ? 'bg-red-500' : tierUsagePct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${tierUsagePct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6F6F6F] mt-1.5">
                      Cuenta conversaciones que tú iniciaste con templates (campañas o WhatsApp directo) en las últimas 24h. Si alguien te escribe y el bot responde, no cuenta.
                    </p>
                  </div>
                </div>
              </div>

              {/* ABITA LIMIT CARD */}
              {data?.abitaMessageLimit !== null && (
                <div className={`border rounded-2xl p-6 shadow-sm border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-900/10`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-orange-500" />
                        <span className="text-xs font-bold text-[#6F6F6F] uppercase tracking-widest">Suscripción Abita</span>
                      </div>
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className={`text-2xl font-bold text-orange-600 dark:text-orange-400`}>Límite Mensual</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300`}>
                          {data?.abitaMessageUsage || 0} / {data?.abitaMessageLimit || 1000} mensajes
                        </span>
                      </div>
                      <p className="text-sm text-[#6F6F6F] mt-2 leading-relaxed">
                        Límite de mensajes automatizados (bot y campañas) para tu ciclo de facturación actual.
                      </p>
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                      <div className="flex justify-between text-xs text-[#6F6F6F] mb-1.5">
                        <span>Uso mensual</span>
                        <span className={`font-bold ${abitaUsagePct > 90 ? 'text-red-500' : 'text-orange-500'}`}>{abitaUsagePct}%</span>
                      </div>
                      <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${abitaUsagePct > 90 ? 'bg-red-500' : abitaUsagePct > 70 ? 'bg-amber-500' : 'bg-orange-500'}`}
                          style={{ width: `${abitaUsagePct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#6F6F6F] mt-1.5">
                        Cuenta los mensajes enviados por tu Agente IA y las Campañas. Los mensajes manuales enviados por ti a través del Inbox no consumen esta cuota.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  <p className="text-sm font-medium text-[#6F6F6F]">Mensajes Nosotros</p>
                  <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.humanMessagesCount}</h3>
                  <p className="text-xs text-[#6F6F6F] mt-2">Enviados por agentes en chats activos</p>
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
                  <p className="text-sm font-medium text-[#6F6F6F]">Mensajes Template</p>
                  <h3 className="text-3xl font-bold text-[#111111] dark:text-[#EDE9E0] mt-1">{data?.proactiveMessagesCount}</h3>
                  <p className="text-xs text-[#6F6F6F] mt-2">Campañas e inicios de chat</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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


              </div>

            </div>

            {/* VOLUMEN DE MENSAJES (CHART) */}
            <div className="mt-6 bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] mb-6">Volumen de Mensajes</h3>
              <MessageChart data={data?.dailyTrends || []} />
            </div>

          </div>
        </div>
      </div>
      {showTierInfo && <TierInfoModal onClose={() => setShowTierInfo(false)} />}
    </DesktopOnlyGuard>
  )
}
