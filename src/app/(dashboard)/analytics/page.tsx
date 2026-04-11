'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquareText, Megaphone, Flame, TrendingUp, Zap, HelpCircle } from 'lucide-react'
import { getAnalyticsData } from '@/app/actions/analytics'

type Analytics = {
  totalLeads: number;
  handedOffLeads: number;
  messagesSaved: number;
  unresolvedQuestions: number;
  totalCampaigns: number;
  conversionRate: number;
} | null

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const res = await getAnalyticsData()
    setData(res)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50/50 dark:bg-[#09090b]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BarChart3 className="text-zinc-400" size={32} />
          <p className="text-sm text-zinc-500">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-[#09090b]">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center px-8 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            Resumen de Rendimiento
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* KPI 1 */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Users size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Leads Procesados</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{data?.totalLeads}</h3>
                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-500" /> Clientes atendidos por el bot
                </p>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Flame size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Consultas Calientes (Handoff)</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{data?.handedOffLeads}</h3>
                  <span className="text-sm font-medium text-rose-500 bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 rounded-full">
                    {data?.conversionRate}%
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Leads que pidieron hablar con humanos</p>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-emerald-500">
                <Zap size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <MessageSquareText size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Ahorro Biométrico (Mensajes)</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{data?.messagesSaved}</h3>
                <p className="text-xs text-zinc-500 mt-2">
                  Mensajes que tus asesores no tuvieron que escribir
                </p>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
                  <HelpCircle size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Preguntas Pendientes</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{data?.unresolvedQuestions}</h3>
                <p className="text-xs text-zinc-500 mt-2">
                  Temas que necesitan actualizarse en el Knowledge Base
                </p>
              </div>
            </div>

          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Insights Section */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Estado del Agente Virtual</h3>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-[#121214] rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tasa de Filtrado Exitoso</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {100 - (data?.conversionRate || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${100 - (data?.conversionRate || 0)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Porcentaje de personas que resolvieron sus dudas solo con la IA sin requerir atención humana.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-[#121214] rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Campañas Embudadas</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data?.totalCampaigns}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Megaphone size={14} /> Campañas Activas enviando tráfico al Bot
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Statement */}
            <div className="bg-gradient-to-br from-indigo-900 to-zinc-900 border border-indigo-800/50 rounded-2xl p-8 shadow-sm flex flex-col justify-center text-white relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-fuchsia-500/20 blur-3xl rounded-full"></div>

              <div className="relative z-10 w-full">
                <div className="h-10 w-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center mb-6">
                  <Zap size={20} className="text-indigo-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Tu copiloto está trabajando</h2>
                <p className="text-indigo-200/80 text-sm leading-relaxed max-w-sm mb-6">
                  El agente virtual ha manejado <strong>{data?.messagesSaved} mensajes</strong> en total.
                  Si cada respuesta tomara solo 1 minuto de tipeo humano, el bot le ha ahorrado a tu equipo
                  <strong> {Math.round((data?.messagesSaved || 0) / 60)} horas</strong> de trabajo repetitivo.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
