'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, CheckCircle2, MessageSquare, Plus, Clock, Trash2, Loader2, Eye, X } from 'lucide-react'
import { getUnansweredQuestions, deleteQuestion, answerAndTrain } from '@/app/actions/learning'
import { useRouter } from 'next/navigation'

type Question = {
  id: string;
  question: string;
  botAnswer?: string;
  createdAt: Date;
}

export default function LearningPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // States for answering
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [viewingAnswer, setViewingAnswer] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const data = await getUnansweredQuestions();
      setQuestions(data as Question[]);
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres borrar esta pregunta sin entrenar al bot?')) {
      await deleteQuestion(id);
      setQuestions(q => q.filter(item => item.id !== id));
    }
  }

  const handleTrain = async (id: string) => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    const res = await answerAndTrain(id, answer);
    if (res.success) {
      setQuestions(q => q.filter(item => item.id !== id));
      setAnsweringId(null);
      setAnswer('');
    }
    setIsSubmitting(false);
  }

  const handleMoveToConfig = () => {
    router.push('/settings')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BrainCircuit className="text-[#6F6F6F]" size={32} />
          <p className="text-sm text-[#6F6F6F]">Cargando reportes de IA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <BrainCircuit size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">
            Mejora Continua
          </h1>
        </div>
        <button
          onClick={handleMoveToConfig}
          className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#333] dark:bg-[#E9E4D8] dark:hover:bg-white dark:text-[#111111] text-white rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={16} />
          Ver FAQ actual
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">

          <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#6F6F6F]" />
                  Preguntas no contestadas por el Bot
                </h2>
                <p className="text-sm text-[#6F6F6F] mt-1 max-w-xl">
                  Estas son dudas reales de tus clientes. Al responderlas, el bot aprenderá la respuesta y la usará automáticamente en el futuro.
                </p>
              </div>
              <div className="shrink-0 bg-[#F36A2D]/10 text-[#F36A2D] px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shadow-sm border border-[#F36A2D]/20">
                {questions.length} pendientes
              </div>
            </div>

            <div className="divide-y divide-[#DEDAD0] dark:divide-zinc-800/60">
              {questions.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-[#111111] dark:text-[#EDE9E0] font-medium">¡El Bot lo sabe todo!</h3>
                  <p className="text-[#6F6F6F] mt-1 text-sm max-w-sm">
                    No hay preguntas pendientes. El agente virtual ha podido responder a todas las dudas de tus clientes.
                  </p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="p-6 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-[#6F6F6F]" />
                            <span className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider">
                              {new Date(q.createdAt).toLocaleDateString()} • {new Date(q.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {q.botAnswer && (
                            <button 
                              onClick={() => setViewingAnswer(q.botAnswer || null)}
                              className="text-[10px] font-bold text-[#F36A2D] hover:underline uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Eye size={12} /> Ver respuesta del bot
                            </button>
                          )}
                        </div>
                        <p className="text-base font-medium text-[#111111] dark:text-[#EDE9E0] leading-relaxed">
                          "{q.question}"
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                         <button
                           onClick={() => handleDelete(q.id)}
                           className="p-2 text-[#6F6F6F] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                           title="Borrar"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </div>

                    {answeringId === q.id ? (
                      <div className="bg-white dark:bg-black/20 border border-[#F36A2D]/30 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#111111] dark:text-[#F36A2D] uppercase tracking-widest ml-1">Escribe la respuesta correcta:</label>
                          <textarea
                            autoFocus
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Ej: El horario de atención es de 8am a 6pm de Lunes a Sábado."
                            className="w-full bg-white/50 dark:bg-black/20 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F36A2D] h-24 resize-none text-[#111111] dark:text-[#EDE9E0] placeholder-[#6F6F6F]"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => { setAnsweringId(null); setAnswer(''); }}
                            className="text-xs font-bold text-[#6F6F6F] hover:underline"
                          >
                            Cancelar
                          </button>
                          <button
                            disabled={!answer.trim() || isSubmitting}
                            onClick={() => handleTrain(q.id)}
                            className="px-6 py-2 bg-[#F36A2D] text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                            Entrenar Bot
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAnsweringId(q.id)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl text-xs font-bold hover:scale-[1.05] active:scale-[0.95] transition-all shadow-md shadow-black/10"
                        >
                          <Plus size={14} />
                          Enseñar respuesta al Bot
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bot Answer Modal */}
      {viewingAnswer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#F4F1EC] dark:bg-[#1A1714] w-full max-w-lg rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit size={16} className="text-[#F36A2D]" />
                Respuesta fallida del Bot
              </h3>
              <button 
                onClick={() => setViewingAnswer(null)}
                className="text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border border-[#DEDAD0] dark:border-zinc-800 italic text-[#6F6F6F] leading-relaxed relative">
                <span className="text-4xl absolute -top-2 -left-2 opacity-10 font-serif">"</span>
                {viewingAnswer}
                <span className="text-4xl absolute -bottom-6 -right-2 opacity-10 font-serif">"</span>
              </div>
            </div>
            <div className="p-6 bg-[#E9E4D8]/30 dark:bg-black/10 text-center">
              <button 
                onClick={() => setViewingAnswer(null)}
                className="w-full py-3 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl text-sm font-bold shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
