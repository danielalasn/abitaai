'use client'

import { useState, useEffect } from 'react'
import { Save, Bot, BookOpen, Fingerprint, Loader2, HelpCircle, Code, Sparkles, CheckCircle2, Flame, Plus, Trash2, MessageSquare, ShieldCheck, ShieldX, Wifi } from 'lucide-react'
import { getOrCreateDefaultConfig, saveBotConfig, compileKnowledgeWithAI, verifyWhatsappConnection } from '@/app/actions/settings'

export default function SettingsPage() {
  const [projectId, setProjectId] = useState<string>("")
  const [identity, setIdentity] = useState("")
  const [instructions, setInstructions] = useState("")
  const [knowledgeData, setKnowledgeData] = useState("")
  const [knowledgeRaw, setKnowledgeRaw] = useState("")
  const [faq, setFaq] = useState("")
  const [whatsappToken, setWhatsappToken] = useState("")
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("")
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [leadScoringRules, setLeadScoringRules] = useState<{id: number, condition: string, score: number}[]>([])
  const [isDevMode, setIsDevMode] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileStatus, setCompileStatus] = useState<'success' | 'error' | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    getOrCreateDefaultConfig().then(config => {
      if (!config) {
        setIsLoading(false)
        return
      }
      setProjectId(config.projectId)
      setIdentity(config.identity || "")
      setInstructions(config.instructions || "")
      setKnowledgeData(config.knowledgeData || "")
      setKnowledgeRaw(config.knowledgeRaw || "")
      setFaq(config.faq || "")
      setWhatsappToken(config.whatsappToken || "")
      setWhatsappPhoneId(config.whatsappPhoneId || "")
      setWhatsappBusinessId(config.whatsappBusinessId || "")

      try {
        const parsedRules = config.leadScoringRules ? JSON.parse(config.leadScoringRules) : []
        setLeadScoringRules(Array.isArray(parsedRules) && parsedRules.length > 0 ? parsedRules : [{ id: 1, condition: '', score: 0 }])
      } catch (e) {
        setLeadScoringRules([{ id: 1, condition: '', score: 0 }])
      }

      setIsLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const totalScore = leadScoringRules.reduce((acc, rule) => acc + (rule.score || 0), 0)
    if (totalScore !== 100) {
      alert("La suma de todos los puntajes debe ser exactamente 100.");
      return;
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {
      const rulesString = JSON.stringify(leadScoringRules)
      await saveBotConfig(
        projectId, 
        identity, 
        instructions, 
        knowledgeData, 
        knowledgeRaw, 
        faq, 
        rulesString, 
        whatsappToken, 
        whatsappPhoneId, 
        whatsappBusinessId
      )
      setSaveStatus("success")
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714]">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <Bot size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0] flex items-center gap-2">
            Configuración del Bot
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm disabled:opacity-70 ${
            saveStatus === 'success' 
              ? "bg-emerald-600 text-white" 
              : compileStatus === 'success'
                ? "bg-[#F36A2D] text-white animate-pulse scale-105"
                : "bg-[#111111] hover:bg-[#333] dark:bg-[#E9E4D8] dark:hover:bg-white text-white dark:text-[#111111]"
          }`}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? 'Guardando...' : saveStatus === 'success' ? '¡Todo Guardado!' : 'Guardar Cambios'}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">

          {/* Fixed Floating Notifications Container */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {saveStatus === 'success' && (
              <div className="bg-zinc-900 dark:bg-white text-white dark:text-black shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in zoom-in duration-300">
                <div className="bg-green-500 p-1.5 rounded-full">
                  <CheckCircle2 size={18} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">Cambios guardados</p>
                  <p className="text-xs opacity-70">Tu agente ha sido actualizado con éxito.</p>
                </div>
              </div>
            )}
            
            {compileStatus === 'success' && (
              <div className="bg-indigo-600 text-white shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in zoom-in duration-300">
                <div className="bg-white/20 p-1.5 rounded-full text-white">
                  <Sparkles size={18} />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">IA Sincronizada</p>
                  <p className="text-xs opacity-80">El inventario ya tiene estructura profesional.</p>
                </div>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="bg-red-600 text-white shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300">
                <p className="text-sm font-medium text-center w-full">Error al intentar guardar.</p>
              </div>
            )}
          </div>

          {/* AI Identity Section */}
          <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex items-center gap-3">
              <Fingerprint className="text-[#F36A2D]" size={20} />
              <div>
                <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">Identidad del Agente</h2>
                <p className="text-sm text-[#6F6F6F] mt-1">Define la personalidad y el comportamiento principal de tu asistente de IA.</p>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Eres un experto asesor de ventas. Hablas formal pero amigable..."
                className="w-full min-h-[160px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all resize-y"
              />
            </div>
          </section>

          {/* AI Instructions Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-3">
              <Bot className="text-zinc-500 dark:text-zinc-400" size={20} />
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Instrucciones Operativas</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Especifica reglas estrictas, lógica condicional y políticas.</p>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={"1. Nunca des descuentos.\n2. Si preguntan por precios, usa la base de conocimientos.\n3. Ofrece transferir con un agente si el cliente se enoja."}
                className="w-full min-h-[200px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:focus:ring-purple-500/30 transition-all resize-y font-mono"
              />
            </div>
          </section>


          {/* Knowledge Base Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md mb-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="text-zinc-500 dark:text-zinc-400" size={20} />
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Cerebro de Inventario (Knowledge Base)</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Escribe tus productos o proyectos de forma natural, la IA se encarga de crear el JSON por debajo.</p>
                </div>
              </div>
              
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setIsDevMode(false)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    !isDevMode 
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" 
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  }`}
                >
                  Texto Natural
                </button>
                <button
                  type="button"
                  onClick={() => setIsDevMode(true)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    isDevMode 
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" 
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  }`}
                >
                  <Code size={14} /> Developer (JSON)
                </button>
              </div>
            </div>

            <div className="p-6">
              {!isDevMode ? (
                <>
                  <textarea
                    value={knowledgeRaw}
                    onChange={(e) => setKnowledgeRaw(e.target.value)}
                    placeholder={`Ej:\nTenemos un restaurante llamado 'Bella Italia'.\nLas pizzas cuestan $15 la grande y $10 la pequeña. Los sabores son Pepperoni, Hawaiana y Vegana.\nNuestro horario es de 12:00 PM a 10:00 PM.\nHacemos delivery por Uber Eats.`}
                    className="w-full min-h-[300px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all resize-y"
                  />
                  
                  <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                      <Sparkles size={16} /> 
                      Usa el procesador inteligente para convertir tu texto en una estructura limpia para el bot.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsCompiling(true);
                        setCompileStatus(null);
                        try {
                          const jsonString = await compileKnowledgeWithAI(knowledgeRaw);
                          setKnowledgeData(jsonString);
                          setCompileStatus("success");
                          setTimeout(() => setCompileStatus(null), 4000);
                        } catch (e) {
                          console.error("Error compilando JSON", e);
                          setCompileStatus("error");
                        }
                        setIsCompiling(false);
                      }}
                      disabled={isCompiling || !knowledgeRaw.trim()}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${
                        compileStatus === 'success' 
                          ? "bg-green-600 text-white" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      {isCompiling ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : compileStatus === 'success' ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {isCompiling ? "Analizando..." : compileStatus === 'success' ? "¡Estructurado!" : "Sincronizar con IA"}
                    </button>
                  </div>
                  {compileStatus === 'success' && (
                    <p className="mt-4 text-sm text-[#F36A2D] dark:text-[#F36A2D] font-bold flex items-center gap-2 animate-bounce">
                       <Save size={16} /> ¡Estructurado con éxito! Haz clic en "Guardar Cambios" arriba para que el Bot aprenda esto.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    value={knowledgeData}
                    onChange={(e) => setKnowledgeData(e.target.value)}
                    placeholder={`{\n  "empresa": "Chat AI",\n  "proyectos": []\n}`}
                    className="w-full min-h-[400px] p-4 bg-zinc-900 dark:bg-black border border-zinc-700 dark:border-zinc-800 rounded-xl text-sm text-green-400 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-y font-mono shadow-inner"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600"></span>
                    Advertencia: Edita el JSON manualmente solo si comprendes la estructura exacta requerida por el bot.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* FAQs Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-3">
              <HelpCircle className="text-zinc-500 dark:text-zinc-400" size={20} />
              <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Preguntas Frecuentes (FAQ)</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Escribe las preguntas más comunes que recibes y su respuesta exacta. El bot tratará de replicar esto antes de usar el Knowledge Base.</p>
              </div>
            </div>
            <div className="p-6">
              <textarea 
                value={faq}
                onChange={(e) => setFaq(e.target.value)}
                placeholder={"P: ¿Dónde están ubicados?\nR: Nos encontramos en la Av. Reforma.\n\nP: ¿Cuáles son sus horarios de atención?\nR: De lunes a viernes de 8am a 5pm."}
                className="w-full min-h-[200px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:focus:ring-orange-500/30 transition-all resize-y font-mono"
              />
            </div>
          </section>

          {/* Lead Scoring (Heatmap) Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Flame size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Eventos de Calificación (Heatmap)</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                    Agrega reglas específicas para que el bot detecte si un prospecto es prometedor. La suma de los puntos debe dar exactamente 100.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl shadow-sm">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Suma Total:</span>
                <span className={`text-lg font-bold ${leadScoringRules.reduce((acc, r) => acc + (r.score || 0), 0) === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {leadScoringRules.reduce((acc, r) => acc + (r.score || 0), 0)} / 100
                </span>
              </div>
            </div>
            <div className="p-6 bg-zinc-50/30 dark:bg-[#0c0c0e]">
              <div className="space-y-3">
                <div className="flex px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  <div className="flex-1">Condición (Si el cliente hace esto...)</div>
                  <div className="w-24 text-center">Puntos</div>
                  <div className="w-10"></div>
                </div>

                {leadScoringRules.map((rule, idx) => (
                  <div key={rule.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
                    <input
                      type="text"
                      value={rule.condition}
                      onChange={(e) => {
                        const newRules = [...leadScoringRules];
                        newRules[idx].condition = e.target.value;
                        setLeadScoringRules(newRules);
                      }}
                      placeholder="Ej: Muestra intención de agendar una visita"
                      className="flex-1 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">+</span>
                      <input
                        type="number"
                        value={rule.score || ''}
                        onChange={(e) => {
                          const newRules = [...leadScoringRules];
                          newRules[idx].score = parseInt(e.target.value) || 0;
                          setLeadScoringRules(newRules);
                        }}
                        className="w-24 pl-7 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-center text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (leadScoringRules.length === 1) return;
                        setLeadScoringRules(leadScoringRules.filter(r => r.id !== rule.id));
                      }}
                      className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setLeadScoringRules([...leadScoringRules, { id: Date.now(), condition: '', score: 0 }])}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 w-fit"
              >
                <Plus size={16} /> Añadir regla
              </button>
            </div>
          </section>

          {/* WhatsApp Channel Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md mb-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">WhatsApp Cloud API</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Configura la conexión oficial con Meta para recibir y enviar mensajes.</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Phone Number ID</label>
                  <input
                    type="text"
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    placeholder="Ej: 105928374650293"
                    className="w-full p-3 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1.5 px-1">Identificador único del número en Meta Developers.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">WhatsApp Business ID</label>
                  <input
                    type="text"
                    value={whatsappBusinessId}
                    onChange={(e) => setWhatsappBusinessId(e.target.value)}
                    placeholder="Ej: 928374650192837"
                    className="w-full p-3 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1.5 px-1">ID de la cuenta comercial (WABID).</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Access Token (Permanent)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    placeholder="Pega aquí tu Access Token (EAAGz...)"
                    className="w-full p-3 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono break-all"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 px-1">Se recomienda usar un System User Token para que no expire.</p>
              </div>

              {/* Verify Button */}
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={async () => {
                    setIsVerifying(true)
                    setVerifyResult(null)
                    const result = await verifyWhatsappConnection(whatsappPhoneId, whatsappToken)
                    setVerifyResult(result)
                    setIsVerifying(false)
                  }}
                  disabled={isVerifying || !whatsappPhoneId || !whatsappToken}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {isVerifying ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Wifi size={15} />
                  )}
                  {isVerifying ? 'Verificando...' : 'Verificar Conexión'}
                </button>

                {verifyResult && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-left-2 ${
                    verifyResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                  }`}>
                    {verifyResult.success ? <ShieldCheck size={15} /> : <ShieldX size={15} />}
                    <span>{verifyResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
