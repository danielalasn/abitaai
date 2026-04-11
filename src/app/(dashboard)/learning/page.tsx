'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, CheckCircle2, MessageSquare, Plus, Clock } from 'lucide-react'
import { getUnansweredQuestions, resolveQuestion } from '@/app/actions/learning'
import { useRouter } from 'next/navigation'

type Question = {
  id: string;
  question: string;
  createdAt: Date;
}

export default function LearningPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    const data = await getUnansweredQuestions();
    setQuestions(data);
    setIsLoading(false);
  }

  const handleResolve = async (id: string) => {
    await resolveQuestion(id);
    // Optimistic UI update
    setQuestions(q => q.filter(item => item.id !== id));
  }

  const handleMoveToConfig = () => {
    router.push('/settings')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50/50 dark:bg-[#09090b]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BrainCircuit className="text-zinc-400" size={32} />
          <p className="text-sm text-zinc-500">Cargando reportes de IA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-[#09090b]">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
            <BrainCircuit size={18} />
          </div>
          <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            Mejora Continua
          </h1>
        </div>
        <button
          onClick={handleMoveToConfig}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={16} />
          Ir a Configurar Respuestas
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <MessageSquare size={18} className="text-zinc-500" />
                  Preguntas no contestadas por el Bot
                </h2>
                <p className="text-sm text-zinc-500 mt-1 max-w-xl">
                  Aquí aparecen las preguntas que los clientes hicieron y el bot no supo responder. Añádelas a tus FAQs o a tu Cerebro de Inventario para entrenar al agente.
                </p>
              </div>
              <div className="shrink-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shadow-sm border border-orange-200 dark:border-orange-800/50">
                {questions.length} pendientes
              </div>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {questions.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-zinc-900 dark:text-zinc-100 font-medium">¡El Bot lo sabe todo!</h3>
                  <p className="text-zinc-500 mt-1 text-sm max-w-sm">
                    No hay preguntas pendientes. El agente virtual ha podido responder a todas las dudas de tus clientes usando la Base de Conocimientos actual.
                  </p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="p-5 flex items-start justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={12} className="text-zinc-400" />
                        <span className="text-xs text-zinc-500">
                          {new Date(q.createdAt).toLocaleDateString()} a las {new Date(q.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        "{q.question}"
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolve(q.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <CheckCircle2 size={14} />
                      Marcar como aprendida
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
