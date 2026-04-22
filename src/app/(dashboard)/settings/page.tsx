'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Save, Bot, BookOpen, Fingerprint, Loader2, HelpCircle, Code, Sparkles,
  CheckCircle2, Flame, Plus, Trash2, MessageSquare, ShieldCheck, ShieldX,
  Wifi, ChevronRight, Power, X, FileText, PanelLeftClose, PanelLeftOpen,
  Eye, EyeOff, User, Lock, Globe, Link, Camera, Unlink, AlertCircle
} from 'lucide-react'
import {
  getProjectConfig, saveProjectWhatsApp, getAgentConfig,
  createAgent, deleteAgent, saveAgentConfig, toggleAgent,
  compileKnowledgeWithAI, verifyWhatsappConnection,
  updateUserProfile, updateUserPassword
} from '@/app/actions/settings'
import { getIntegrationStatus, disconnectIntegration } from '@/app/actions/integrations'

// Instagram logo SVG (lucide doesn't include it)
const IgIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

type AgentSummary = {
  id: string; name: string; description: string | null; isActive: boolean;
  identity: string | null; instructions: string | null;
  knowledgeData: string | null; knowledgeRaw: string | null;
  faq: string | null; leadScoringRules: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.email === 'info@abitaai.com'

  // Project-level
  const [projectId, setProjectId] = useState("")
  const [whatsappToken, setWhatsappToken] = useState("")
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("")
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)

  // Agent list
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Agent form
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [identity, setIdentity] = useState("")
  const [instructions, setInstructions] = useState("")
  const [knowledgeData, setKnowledgeData] = useState("")
  const [knowledgeRaw, setKnowledgeRaw] = useState("")
  const [faq, setFaq] = useState("")
  const [leadScoringRules, setLeadScoringRules] = useState<{id: number, condition: string, score: number}[]>([])
  const [isDevMode, setIsDevMode] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingWA, setIsSavingWA] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)
  const [waStatus, setWaStatus] = useState<'success' | 'error' | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileStatus, setCompileStatus] = useState<'success' | 'error' | null>(null)
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentDesc, setNewAgentDesc] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Profile management
  const [activeSection, setActiveSection] = useState<'agent' | 'profile' | 'connections'>(isAdmin ? 'agent' : 'profile')
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'success' | 'error' | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<'success' | 'error' | null>(null)

  // Integration states
  const searchParams = useSearchParams()
  const [igIntegration, setIgIntegration] = useState<{ status: string; instagramAccountId: string | null; pageId: string | null; createdAt: Date } | null>(null)
  const [igLoading, setIgLoading] = useState(false)
  const [igFeedback, setIgFeedback] = useState<'success' | 'denied' | 'error' | null>(null)

  const loadIgStatus = useCallback(async () => {
    const integration = await getIntegrationStatus('meta_instagram')
    setIgIntegration(integration as any)
  }, [])

  useEffect(() => {
    loadProject()
    loadIgStatus()
    // Handle redirect back from Meta OAuth
    const tab     = searchParams.get('tab')
    const success = searchParams.get('success')
    const error   = searchParams.get('error')
    if (tab === 'connections') {
      setActiveSection('connections')
      if (success === 'instagram') { setIgFeedback('success'); loadIgStatus() }
      if (error === 'instagram_denied') setIgFeedback('denied')
      if (error === 'oauth_failed' || error === 'invalid_state') setIgFeedback('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDisconnectIg = async () => {
    setIgLoading(true)
    await disconnectIntegration('meta_instagram')
    setIgIntegration(null)
    setIgFeedback(null)
    setIgLoading(false)
  }

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const data = await getProjectConfig()
      setProjectId(data.projectId)
      setWhatsappToken(data.whatsappToken)
      setWhatsappPhoneId(data.whatsappPhoneId)
      setWhatsappBusinessId(data.whatsappBusinessId)
      setAgents(data.agents as AgentSummary[])
      
      // Load user profile from data
      if (data.client) {
        setUserName(data.client.name || "")
        setUserEmail(data.client.email || "")
      }

      if (data.agents.length > 0) {
        selectAgent(data.agents[0] as AgentSummary)
      }
    } catch (e) { console.error(e) }
    setIsLoading(false)
  }

  const selectAgent = (agent: AgentSummary) => {
    setSelectedAgentId(agent.id)
    setAgentName(agent.name)
    setAgentDescription(agent.description || "")
    setIdentity(agent.identity || "")
    setInstructions(agent.instructions || "")
    setKnowledgeData(agent.knowledgeData || "")
    setKnowledgeRaw(agent.knowledgeRaw || "")
    setFaq(agent.faq || "")
    try {
      const parsed = agent.leadScoringRules ? JSON.parse(agent.leadScoringRules) : []
      setLeadScoringRules(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ id: 1, condition: '', score: 0 }])
    } catch { setLeadScoringRules([{ id: 1, condition: '', score: 0 }]) }
  }

  const handleSaveAgent = async () => {
    if (!selectedAgentId) return
    const totalScore = leadScoringRules.reduce((acc, r) => acc + (r.score || 0), 0)
    if (totalScore !== 100) {
      alert(`La puntuación total debe ser 100 (actual: ${totalScore})`)
      return
    }

    setIsSaving(true)
    try {
      await saveAgentConfig(
        selectedAgentId,
        agentName,
        agentDescription,
        identity,
        instructions,
        knowledgeData,
        knowledgeRaw,
        faq,
        JSON.stringify(leadScoringRules)
      )
      setSaveStatus('success')
      // Update local list
      setAgents(prev => prev.map(a => a.id === selectedAgentId ? { ...a, name: agentName, description: agentDescription } : a))
      setTimeout(() => setSaveStatus(null), 3000)
    } catch { setSaveStatus('error') }
    setIsSaving(false)
  }

  const handleUpdateProfile = async () => {
    const user = session?.user as any
    if (!user?.id) return
    setIsUpdatingProfile(true); setProfileStatus(null)
    try {
      await updateUserProfile(user.id, userName, userEmail)
      setProfileStatus('success')
      setTimeout(() => setProfileStatus(null), 3000)
    } catch (e: any) {
      alert(e.message)
      setProfileStatus('error')
    }
    setIsUpdatingProfile(false)
  }

  const handleUpdatePassword = async () => {
    const user = session?.user as any
    if (!user?.id || !userPassword) return
    setIsUpdatingPassword(true); setPasswordStatus(null)
    try {
      await updateUserPassword(user.id, userPassword)
      setUserPassword("")
      setPasswordStatus('success')
      setTimeout(() => setPasswordStatus(null), 3000)
    } catch { setPasswordStatus('error') }
    setIsUpdatingPassword(false)
  }

  const handleSaveWhatsApp = async () => {
    setIsSavingWA(true); setWaStatus(null)
    try {
      await saveProjectWhatsApp(projectId, whatsappToken, whatsappPhoneId, whatsappBusinessId)
      setWaStatus("success"); setTimeout(() => setWaStatus(null), 3000)
    } catch { setWaStatus("error") }
    setIsSavingWA(false)
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return
    try {
      const agent = await createAgent(projectId, newAgentName, newAgentDesc)
      const newAgent: AgentSummary = { ...agent, description: agent.description }
      setAgents(prev => [...prev, newAgent])
      selectAgent(newAgent)
      setShowNewAgent(false); setNewAgentName(""); setNewAgentDesc("")
    } catch (e: any) { alert(e.message) }
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este agente? Se perderán todos sus datos.")) return
    try {
      await deleteAgent(id)
      const remaining = agents.filter(a => a.id !== id)
      setAgents(remaining)
      if (selectedAgentId === id) {
        if (remaining.length > 0) selectAgent(remaining[0])
        else setSelectedAgentId(null)
      }
    } catch (e: any) { alert(e.message) }
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714]">
      <Loader2 className="animate-spin text-[#F36A2D]" size={32} />
    </div>
  )

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
              <Bot size={18} />
            </div>
            <h1 className="text-xl font-medium text-zinc-900 dark:text-[#EDE9E0]">Configuración</h1>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {saveStatus === 'success' && (
          <div className="bg-zinc-900 dark:bg-white text-white dark:text-black shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300">
            <div className="bg-green-500 p-1.5 rounded-full"><CheckCircle2 size={18} className="text-white" /></div>
            <div className="flex flex-col"><p className="text-sm font-semibold">Agente guardado</p><p className="text-xs opacity-70">Los cambios se aplicaron correctamente.</p></div>
          </div>
        )}
        {waStatus === 'success' && (
          <div className="bg-emerald-600 text-white shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300">
            <div className="bg-white/20 p-1.5 rounded-full"><Wifi size={18} /></div>
            <div className="flex flex-col"><p className="text-sm font-semibold">WhatsApp guardado</p></div>
          </div>
        )}
      </div>

      {/* Main Layout = Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
             {/* ─── Sidebar ─── */}
        <aside className={`shrink-0 border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-white/50 dark:bg-[#111111]/30 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 pointer-events-none'}`}>
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* Navigation for non-admins (or shared) */}
            <div className="p-4 space-y-1">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 px-2">Configuración General</h3>
              <button
                onClick={() => { setActiveSection('profile'); setSelectedAgentId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === 'profile' ? 'bg-[#F36A2D]/10 text-[#F36A2D] shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'}`}
              >
                <User size={18} /> Mi Perfil
              </button>
              <button
                onClick={() => { setActiveSection('connections'); setSelectedAgentId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === 'connections' ? 'bg-[#F36A2D]/10 text-[#F36A2D] shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'}`}
              >
                <Globe size={18} /> Conexiones
              </button>
            </div>

            {/* AI Agent List (ONLY FOR ADMINS) */}
            {isAdmin && (
              <div className="mt-4 flex-1 flex flex-col min-w-[288px]">
                <div className="p-4 border-t border-[#DEDAD0] dark:border-zinc-800/60">
                  <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 px-2">Gestión de Agentes (Avanzado)</h3>
                  <button
                    onClick={() => setShowNewAgent(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F36A2D] hover:bg-[#E55A1D] text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus size={16} /> Nuevo Agente
                  </button>
                </div>

                {/* New Agent Form */}
                {showNewAgent && (
                  <div className="p-4 bg-[#F36A2D]/5 space-y-2">
                    <input type="text" placeholder="Nombre del agente" value={newAgentName} onChange={e => setNewAgentName(e.target.value)} className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                    <input type="text" placeholder="Descripción breve" value={newAgentDesc} onChange={e => setNewAgentDesc(e.target.value)} className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleCreateAgent} className="flex-1 py-2 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-lg text-xs font-bold">Crear</button>
                      <button onClick={() => setShowNewAgent(false)} className="px-3 py-2 text-[#6F6F6F] text-xs font-bold">Cerrar</button>
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-2">
                  {agents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => { selectAgent(agent); setActiveSection('agent'); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all group ${
                        activeSection === 'agent' && selectedAgentId === agent.id
                          ? 'border-[#F36A2D] bg-[#F36A2D]/5 dark:bg-[#F36A2D]/10 shadow-sm'
                          : 'border-transparent hover:border-[#DEDAD0] dark:hover:border-zinc-700 hover:bg-white/60 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${agent.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          <span className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0] truncate">{agent.name}</span>
                        </div>
                        <ChevronRight size={14} className={selectedAgentId === agent.id ? 'text-[#F36A2D]' : 'text-zinc-400'} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Section in Sidebar (Only for Admins) */}
          {isAdmin && (
            <div className="border-t border-[#DEDAD0] dark:border-zinc-800/60 p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={12} /> WhatsApp Cloud API
              </h3>
              <input 
                type="text" 
                placeholder="Phone Number ID" 
                value={whatsappPhoneId} 
                onChange={e => setWhatsappPhoneId(e.target.value)} 
                autoComplete="new-password"
                className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono" 
              />
              <input 
                type="text" 
                placeholder="Business ID" 
                value={whatsappBusinessId} 
                onChange={e => setWhatsappBusinessId(e.target.value)} 
                autoComplete="new-password"
                className="w-full p-2 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono" 
              />
              <div className="relative group/token">
                <input 
                  type={showToken ? "text" : "password"} 
                  placeholder="Access Token" 
                  value={whatsappToken} 
                  onChange={e => setWhatsappToken(e.target.value)} 
                  autoComplete="new-password"
                  className="w-full p-2 pr-9 rounded-lg border border-[#DEDAD0] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono" 
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#F36A2D]"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveWhatsApp} disabled={isSavingWA} className="flex-1 py-2 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-lg text-xs font-bold">
                  {isSavingWA ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={async () => {
                    setIsVerifying(true); setVerifyResult(null)
                    const r = await verifyWhatsappConnection(whatsappPhoneId, whatsappToken)
                    setVerifyResult(r); setIsVerifying(false)
                  }}
                  disabled={isVerifying}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  {isVerifying ? '...' : <Wifi size={14} />}
                </button>
              </div>
              {verifyResult && (
                <p className={`text-[10px] font-medium whitespace-pre-line ${verifyResult.success ? 'text-emerald-600' : 'text-red-500'}`}>
                  {verifyResult.message}
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ─── Main Content ─── */}
        <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-transparent">
          
          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div className="h-full flex flex-col p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
              <header className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">Configuración de Cuenta</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gestiona tu identidad y seguridad de acceso.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Identity Card */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
                    <div className="w-24 h-24 bg-[#F36A2D]/10 text-[#F36A2D] rounded-full flex items-center justify-center mb-4 ring-4 ring-[#F36A2D]/5">
                      <User size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-[#EDE9E0] truncate w-full">{userName || 'Usuario'}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">{isAdmin ? 'Administrador' : 'Cliente'}</p>
                    <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 w-full">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400">Estado</span>
                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Activo
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Email</span>
                        <span className="text-zinc-900 dark:text-zinc-300 truncate ml-2">{userEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-[#F36A2D]/10 rounded-xl">
                        <ShieldCheck className="text-[#F36A2D]" size={20} />
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-[#EDE9E0]">Detalles del Perfil</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nombre Completo</label>
                        <input 
                          type="text" 
                          value={userName} 
                          onChange={e => setUserName(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full text-sm px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-[#F36A2D]/50 outline-none transition-all dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                        <input 
                          type="email" 
                          value={userEmail} 
                          disabled
                          className="w-full text-sm px-4 py-3 bg-zinc-100 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 cursor-not-allowed opacity-70"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nueva Contraseña</label>
                          <span className="text-[10px] text-zinc-400 italic">Opcional</span>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                          <input 
                            type="password" 
                            placeholder="Introduce tu nueva contraseña"
                            value={userPassword} 
                            onChange={e => setUserPassword(e.target.value)}
                            className="w-full text-sm pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-[#F36A2D]/50 outline-none transition-all dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex gap-4">
                      <button 
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="flex-1 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-black/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdatingProfile ? <Loader2 size={18} className="animate-spin" /> : profileStatus === 'success' ? <CheckCircle2 size={18} /> : 'Guardar Datos'}
                      </button>
                      {userPassword && (
                        <button 
                          onClick={handleUpdatePassword}
                          disabled={isUpdatingPassword}
                          className="flex-1 border-2 border-zinc-900 dark:border-[#EDE9E0] text-zinc-900 dark:text-[#EDE9E0] py-3.5 rounded-2xl text-sm font-bold hover:bg-zinc-900 hover:text-white dark:hover:bg-[#EDE9E0] dark:hover:text-[#111111] transition-all flex items-center justify-center gap-2"
                        >
                          {isUpdatingPassword ? <Loader2 size={18} className="animate-spin" /> : passwordStatus === 'success' ? <CheckCircle2 size={18} /> : 'Actualizar Pass'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTIONS SECTION */}
          {activeSection === 'connections' && (
            <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <header>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-[#EDE9E0]">Conexiones</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Conecta Abita.ai con tus canales de comunicación y herramientas.</p>
              </header>

              {/* Feedback banner */}
              {igFeedback === 'success' && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={18} /> Instagram conectado correctamente.
                </div>
              )}
              {(igFeedback === 'error' || igFeedback === 'denied') && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">
                  <AlertCircle size={18} /> {igFeedback === 'denied' ? 'Cancelaste la autorización de Instagram.' : 'Hubo un error al conectar Instagram. Intenta de nuevo.'}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ─── Instagram Card ─── */}
                <div className={`p-6 bg-white dark:bg-[#111111]/40 border rounded-3xl shadow-sm transition-all ${
                  igIntegration?.status === 'active'
                    ? 'border-pink-300 dark:border-pink-700/50 ring-1 ring-pink-200 dark:ring-pink-800/40'
                    : 'border-[#DEDAD0] dark:border-zinc-800'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-md">
                      <IgIcon size={28} />
                    </div>
                    {igIntegration?.status === 'active' && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Conectado
                      </span>
                    )}
                    {igIntegration?.status === 'error' && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-2.5 py-1 rounded-full">
                        Error
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-zinc-900 dark:text-[#EDE9E0] text-lg">Instagram</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Recibe y responde DMs de Instagram automáticamente con tu agente de IA.
                  </p>

                  {igIntegration?.status === 'active' && igIntegration.instagramAccountId && (
                    <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Instagram ID</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 text-[10px]">{igIntegration.instagramAccountId}</span>
                      </div>
                      {igIntegration.pageId && (
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Page ID</span>
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 text-[10px]">{igIntegration.pageId}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    {igIntegration?.status === 'active' ? (
                      <button
                        onClick={handleDisconnectIg}
                        disabled={igLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-red-200 dark:border-red-800 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                      >
                        {igLoading ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                        Desconectar
                      </button>
                    ) : (
                      <a
                        href="/api/integrations/instagram/connect"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <IgIcon size={14} /> Conectar Instagram
                      </a>
                    )}
                  </div>
                </div>

                {/* ─── Placeholders ─── */}
                {[
                  { name: 'Facebook Messenger', icon: <Globe size={24} />, desc: 'Responde mensajes de Messenger.' },
                  { name: 'HubSpot', icon: <Link size={24} />, desc: 'Sincroniza contactos y deals.' },
                  { name: 'AirBnB', icon: <Globe size={24} />, desc: 'Gestión de huéspedes automática.' },
                ].map(cx => (
                  <div key={cx.name} className="p-6 bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-3xl opacity-50 select-none">
                    <div className="h-14 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mb-4">
                      {cx.icon}
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-[#EDE9E0]">{cx.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{cx.desc}</p>
                    <button disabled className="mt-6 w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl text-xs font-bold cursor-not-allowed">
                      Próximamente
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* AGENT CONFIG SECTION (ADMIN ONLY) */}
          {isAdmin && activeSection === 'agent' && selectedAgent ? (
            <div className="flex-1 overflow-auto">
              {/* Agent Header */}
              <div className="sticky top-0 z-10 bg-[#E9E4D8]/90 dark:bg-[#1A1714]/90 backdrop-blur-md border-b border-[#DEDAD0] dark:border-zinc-800/60 px-8 py-4 flex items-center justify-between">
                <div className="flex-1">
                    <input
                      type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                      className="text-2xl font-bold bg-transparent border-none outline-none text-[#111111] dark:text-[#EDE9E0] w-full max-w-xl"
                    />
                  <div className="h-8 w-[1px] bg-[#DEDAD0] dark:bg-zinc-800 mx-2" />
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedAgent.isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {selectedAgent.isActive ? 'Encendido' : 'Apagado'}
                    </span>
                    <button 
                      onClick={() => toggleAgent(selectedAgentId!, !selectedAgent.isActive).then(loadProject)} 
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        selectedAgent.isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30' 
                          : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 ring-1 ring-zinc-300 dark:ring-zinc-700'
                      }`} 
                      title={selectedAgent.isActive ? 'Desactivar Agente' : 'Activar Agente'}
                    >
                      <Power size={18} />
                    </button>
                  </div>

                  <button onClick={handleSaveAgent} disabled={isSaving} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm disabled:opacity-70 ${
                    saveStatus === 'success' ? "bg-emerald-600 text-white"
                    : compileStatus === 'success' ? "bg-[#F36A2D] text-white animate-pulse scale-105"
                    : "bg-[#111111] hover:bg-[#333] dark:bg-[#EDE9E0] dark:hover:bg-white text-white dark:text-[#111111]"
                  }`}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'success' ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    {isSaving ? 'Guardando...' : saveStatus === 'success' ? '¡Guardado!' : 'Guardar Agente'}
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-8 max-w-4xl mx-auto space-y-8 pb-12">
                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Descripción del Agente</label>
                  <input type="text" value={agentDescription} onChange={e => setAgentDescription(e.target.value)} placeholder="Ej: Agente especializado en la Boda de Carlos y María" className="w-full mt-2 p-3 bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100" />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 px-1">Esta descripción la usa el Bot Enrutador para saber a quién transferir al cliente.</p>
                </div>

                {/* Identity */}
                <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex items-center gap-3">
                    <Fingerprint className="text-[#F36A2D]" size={20} />
                    <div>
                      <h2 className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Identidad del Agente</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Define la personalidad y el comportamiento de este agente.</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <textarea value={identity} onChange={e => setIdentity(e.target.value)} placeholder="Eres un experto asesor de ventas..." className="w-full min-h-[160px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all resize-y" />
                  </div>
                </section>

                {/* Instructions */}
                <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex items-center gap-3">
                    <Bot className="text-zinc-500 dark:text-zinc-400" size={20} />
                    <div>
                      <h2 className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Instrucciones Operativas</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Reglas estrictas, lógica condicional y políticas del negocio.</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={"1. Nunca des descuentos.\n2. Si preguntan por precios, usa la base de conocimientos."} className="w-full min-h-[200px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all resize-y font-mono" />
                  </div>
                </section>

                {/* Knowledge Base */}
                <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-zinc-500 dark:text-zinc-400" size={20} />
                      <div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Knowledge Base</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Escribe de forma natural, la IA crea el JSON.</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                      <button onClick={() => setIsDevMode(false)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${!isDevMode ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" : "text-zinc-500"}`}>Natural</button>
                      <button onClick={() => setIsDevMode(true)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${isDevMode ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" : "text-zinc-500"}`}><Code size={14} /> JSON</button>
                    </div>
                  </div>
                    <div className="p-6">
                      {!isDevMode ? (
                        <>
                          <textarea value={knowledgeRaw} onChange={e => setKnowledgeRaw(e.target.value)} placeholder="Ej: Tenemos un restaurante llamado 'Bella Italia'..." className="w-full min-h-[300px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all resize-y" />
                          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F36A2D]/5 dark:bg-[#F36A2D]/10 border border-[#F36A2D]/20 p-4 rounded-xl">
                            <p className="text-sm text-zinc-900 dark:text-[#EDE9E0] flex items-center gap-2"><Sparkles size={16} className="text-[#F36A2D]" /> Procesador inteligente de texto a JSON.</p>
                          <button onClick={async () => {
                            setIsCompiling(true); setCompileStatus(null)
                            try { const json = await compileKnowledgeWithAI(knowledgeRaw); setKnowledgeData(json); setCompileStatus("success"); setTimeout(() => setCompileStatus(null), 4000) }
                            catch { setCompileStatus("error") }
                            setIsCompiling(false)
                          }} disabled={isCompiling || !knowledgeRaw.trim()} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${compileStatus === 'success' ? "bg-green-600 text-white" : "bg-[#F36A2D] hover:bg-[#E55A1D] text-white"}`}>
                            {isCompiling ? <Loader2 size={16} className="animate-spin" /> : compileStatus === 'success' ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                            {isCompiling ? "Analizando..." : compileStatus === 'success' ? "¡Estructurado!" : "Sincronizar con IA"}
                          </button>
                        </div>
                        {compileStatus === 'success' && (
                          <p className="mt-4 text-sm text-[#F36A2D] font-bold flex items-center gap-2 animate-bounce">
                            <Save size={16} /> ¡Estructurado! Haz clic en "Guardar Agente" arriba para aplicar.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <textarea value={knowledgeData} onChange={e => setKnowledgeData(e.target.value)} placeholder={'{\n  "empresa": "Chat AI",\n  "proyectos": []\n}'} className="w-full min-h-[400px] p-4 bg-zinc-900 dark:bg-black border border-zinc-700 rounded-xl text-sm text-green-400 focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all resize-y font-mono shadow-inner" />
                      </>
                    )}
                  </div>
                </section>

                {/* FAQ */}
                <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex items-center gap-3">
                    <HelpCircle className="text-zinc-500 dark:text-zinc-400" size={20} />
                    <div>
                      <h2 className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Preguntas Frecuentes (FAQ)</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">El bot intentará responder estas preguntas antes de usar la KB.</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <textarea value={faq} onChange={e => setFaq(e.target.value)} placeholder={"P: ¿Dónde están ubicados?\nR: Nos encontramos en la Av. Reforma."} className="w-full min-h-[200px] p-4 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F36A2D]/50 transition-all resize-y font-mono" />
                  </div>
                </section>

                {/* Lead Scoring */}
                <section className="bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="border-b border-[#DEDAD0] dark:border-zinc-800 p-6 bg-[#E9E4D8]/40 dark:bg-[#111111]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Flame className="text-rose-500" size={20} />
                      <div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Eventos de Calificación (Heatmap)</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">La suma debe dar 100.</p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${leadScoringRules.reduce((a, r) => a + (r.score || 0), 0) === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {leadScoringRules.reduce((a, r) => a + (r.score || 0), 0)} / 100
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    {leadScoringRules.map((rule, idx) => (
                      <div key={rule.id} className="flex gap-3 items-start">
                        <input type="text" value={rule.condition} onChange={e => { const n = [...leadScoringRules]; n[idx].condition = e.target.value; setLeadScoringRules(n); }} placeholder="Ej: Muestra intención de compra" className="flex-1 p-3 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                        <input type="number" value={rule.score || ''} onChange={e => { const n = [...leadScoringRules]; n[idx].score = parseInt(e.target.value) || 0; setLeadScoringRules(n); }} className="w-20 p-3 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-center text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                        <button onClick={() => { if (leadScoringRules.length === 1) return; setLeadScoringRules(leadScoringRules.filter(r => r.id !== rule.id)); }} className="p-3 text-zinc-400 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={18} /></button>
                      </div>
                    ))}
                    <button onClick={() => setLeadScoringRules([...leadScoringRules, { id: Date.now(), condition: '', score: 0 }])} className="mt-2 flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 w-fit"><Plus size={16} /> Añadir regla</button>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            activeSection === 'agent' && (
              <div className="flex-1 flex items-center justify-center text-[#6F6F6F]">
                <div className="text-center">
                  <Bot size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium text-zinc-900 dark:text-[#EDE9E0]">Selecciona un agente para configurar</p>
                  <p className="text-sm mt-1 text-zinc-500">O crea uno nuevo en la barra lateral.</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
