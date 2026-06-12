'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
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
  updateUserProfile, updateUserPassword,
  getNotificationEmails, saveNotificationEmails
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
  const [defaultBotActive, setDefaultBotActive] = useState(true)

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
  const [activeSection, setActiveSection] = useState<'agent' | 'profile' | 'connections' | 'botConfig'>(isAdmin ? 'agent' : 'profile')
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'success' | 'error' | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<'success' | 'error' | null>(null)

  // Integration states
  const searchParams = useSearchParams()
  const [igIntegration, setIgIntegration] = useState<{ status: string; instagramAccountId: string | null; pageId: string | null; createdAt: Date } | null>(null)
  const [igLoading, setIgLoading] = useState(false)
  const [igFeedback, setIgFeedback] = useState<'success' | 'denied' | 'error' | null>(null)
  const [waIntegration, setWaIntegration] = useState<{ status: string } | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waFeedback, setWaFeedback] = useState<'success' | 'error' | null>(null)
  const [waErrorMessage, setWaErrorMessage] = useState<string | null>(null)
  const [waVerifyStatus, setWaVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Notification emails
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [notificationEmailInput, setNotificationEmailInput] = useState('')
  const [isSavingNotificationEmails, setIsSavingNotificationEmails] = useState(false)
  const [notificationEmailsStatus, setNotificationEmailsStatus] = useState<'success' | 'error' | null>(null)

  const loadIgStatus = useCallback(async () => {
    const integration = await getIntegrationStatus('meta_instagram')
    setIgIntegration(integration as any)
  }, [])

  const loadWaStatus = useCallback(async () => {
    const integration = await getIntegrationStatus('meta_whatsapp')
    setWaIntegration(integration as any)
  }, [])

  useEffect(() => {
    loadProject()
    loadIgStatus()
    loadWaStatus()
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
      setDefaultBotActive(data.defaultBotActive ?? true)
      setAgents(data.agents as AgentSummary[])
      
      // Load user profile from data
      if (data.client) {
        setUserName(data.client.name || "")
        setUserEmail(data.client.email || "")
      }

      if (data.agents.length > 0) {
        selectAgent(data.agents[0] as AgentSummary)
      }

      // Load notification emails
      const emails = await getNotificationEmails()
      setNotificationEmails(emails)
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
    if (!user?.id || !oldPassword || !userPassword || !confirmPassword) {
      alert("Por favor completa todos los campos de contraseña.")
      return
    }
    if (userPassword !== confirmPassword) {
      alert("La nueva contraseña y su confirmación no coinciden.")
      return
    }

    setIsUpdatingPassword(true); setPasswordStatus(null)
    try {
      await updateUserPassword(user.id, oldPassword, userPassword)
      setOldPassword("")
      setUserPassword("")
      setConfirmPassword("")
      setPasswordStatus('success')
      setTimeout(() => setPasswordStatus(null), 3000)
    } catch (e: any) {
      alert(e.message || "Error al actualizar la contraseña")
      setPasswordStatus('error')
    }
    setIsUpdatingPassword(false)
  }

  const handleSaveNotificationEmails = async () => {
    setIsSavingNotificationEmails(true); setNotificationEmailsStatus(null)
    try {
      let finalEmails = [...notificationEmails]
      const trimmedInput = notificationEmailInput.trim()
      if (trimmedInput && !finalEmails.includes(trimmedInput)) {
        finalEmails.push(trimmedInput)
        setNotificationEmails(finalEmails)
        setNotificationEmailInput('')
      }
      await saveNotificationEmails(finalEmails)
      setNotificationEmailsStatus('success')
      setTimeout(() => setNotificationEmailsStatus(null), 3000)
    } catch (e: any) {
      alert(e.message || 'Error al guardar correos')
      setNotificationEmailsStatus('error')
    }
    setIsSavingNotificationEmails(false)
  }

  const handleSaveWhatsApp = async () => {
    setIsSavingWA(true); setWaStatus(null)
    try {
      await saveProjectWhatsApp(projectId, whatsappToken, whatsappPhoneId, whatsappBusinessId)
      setWaStatus("success"); setTimeout(() => setWaStatus(null), 3000)
    } catch { setWaStatus("error") }
    setIsSavingWA(false)
  }

  const handleConnectInstagram = () => {
    const FB = (window as any).FB;
    if (FB) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost && window.location.protocol !== 'https:') {
        alert("Facebook Login requiere una conexión segura (HTTPS).");
        return;
      }

      setIgLoading(true);
      FB.login(
        (response: any) => {
          if (response.authResponse) {
            const code = response.authResponse.code;
            fetch('/api/integrations/instagram/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
            })
            .then(res => {
              if (res.ok) {
                setIgFeedback('success');
                loadIgStatus();
              } else {
                setIgFeedback('error');
              }
            })
            .catch(() => setIgFeedback('error'))
            .finally(() => setIgLoading(false));
          } else {
            setIgLoading(false);
          }
        },
        {
          config_id: process.env.NEXT_PUBLIC_FB_CONFIG_INSTAGRAM,
          response_type: 'code',
          override_default_response_type: true
        }
      );
    } else {
      alert("Facebook SDK no cargado aún.");
    }
  };

  const handleConnectWhatsApp = () => {
    const FB = (window as any).FB
    if (!FB) { alert('Facebook SDK no cargado aún.'); return }

    setWaLoading(true)
    setWaFeedback(null)
    setWaVerifyStatus('idle')

    // Captura waba_id/phone_number_id del mensaje WA_EMBEDDED_SIGNUP.
    // El mensaje puede llegar antes o después del callback de FB.login,
    // así que escuchamos desde antes de abrir el popup y esperamos hasta 3s.
    let embeddedSignupInfo: { waba_id?: string; phone_number_id?: string; business_id?: string } = {}
    let loginCode: string | null = null
    let sent = false

    const sendToBackend = (code: string, info: typeof embeddedSignupInfo) => {
      if (sent) return
      sent = true
      console.log('[WA Embedded Signup] Enviando al backend:', info)
      fetch('/api/integrations/whatsapp/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          waba_id: info.waba_id,
          phone_number_id: info.phone_number_id,
          business_id: info.business_id,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWaFeedback('success')
            setWaErrorMessage(null)
            loadWaStatus()
            loadProject()
          } else {
            console.error('[WA Embedded Signup]', data)
            setWaFeedback('error')
            setWaErrorMessage(data.errorMessage || 'Hubo un error al conectar con WhatsApp.')
          }
        })
        .catch(() => setWaFeedback('error'))
        .finally(() => setWaLoading(false))
    }
    const sessionInfoListener = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object' || !event.origin.includes('facebook.com')) return
      
      console.log('[WA Message Event]', event.data);
      
      if (event.data.type === 'WA_EMBEDDED_SIGNUP' && event.data.event === 'FINISH') {
        window.removeEventListener('message', sessionInfoListener)
        embeddedSignupInfo = event.data.data || {}
        console.log('[WA Embedded Signup] sessionInfo recibido:', embeddedSignupInfo)
        // Si el código ya llegó, enviamos de inmediato
        if (loginCode) sendToBackend(loginCode, embeddedSignupInfo)
      }
    }
    window.addEventListener('message', sessionInfoListener)

    FB.login(
      (response: any) => {
        if (response.authResponse) {
          loginCode = response.authResponse.code
          // Si el sessionInfo ya llegó, enviamos de inmediato.
          // Si no, esperamos hasta 5s y enviamos con lo que haya.
          if (embeddedSignupInfo.waba_id) {
            window.removeEventListener('message', sessionInfoListener)
            sendToBackend(loginCode!, embeddedSignupInfo)
          } else {
            setTimeout(() => {
              window.removeEventListener('message', sessionInfoListener)
              if (loginCode) sendToBackend(loginCode!, embeddedSignupInfo)
            }, 5000)
          }
        } else {
          window.removeEventListener('message', sessionInfoListener)
          setWaLoading(false)
          setWaFeedback('error')
          setWaErrorMessage('Autenticación cancelada o bloqueada por el navegador.')
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_FB_CONFIG_WHATSAPP,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {} // Requerido para Embedded Signup
        }
      }
    )
  }

  const handleVerifyWhatsApp = async () => {
    setIsVerifying(true); setVerifyResult(null); setWaVerifyStatus('idle')
    try {
      const r = await verifyWhatsappConnection(whatsappPhoneId || undefined, whatsappToken || undefined)
      setVerifyResult(r)
      setWaVerifyStatus(r.success ? 'success' : 'error')
      setTimeout(() => setVerifyResult(null), 10000)
    } catch {
      setVerifyResult({ success: false, message: "Error al conectar con el servidor." })
      setWaVerifyStatus('error')
    }
    setIsVerifying(false)
  }

  const handleCompileKnowledge = async () => {
    setIsCompiling(true); setCompileStatus(null)
    try { 
      const json = await compileKnowledgeWithAI(knowledgeRaw); 
      setKnowledgeData(json); 
      setCompileStatus("success"); 
      setTimeout(() => setCompileStatus(null), 4000) 
    }
    catch { setCompileStatus("error") }
    setIsCompiling(false)
  }

  const handleSaveBotConfig = async () => {
    setIsSaving(true); setSaveStatus(null)
    try {
      const { updateDefaultBotActive } = await import('@/app/actions/settings')
      await updateDefaultBotActive(projectId, defaultBotActive)
      setSaveStatus('success'); setTimeout(() => setSaveStatus(null), 3000)
    } catch (e: any) {
      alert(e.message)
      setSaveStatus('error')
    }
    setIsSaving(false)
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
      <Script 
        src="https://connect.facebook.net/en_US/sdk.js" 
        strategy="afterInteractive" 
        onLoad={() => {
          // Llamar FB.init directamente — fbAsyncInit ya fue revisado por el SDK al cargar
          ;(window as any).FB.init({
            appId: process.env.NEXT_PUBLIC_FB_APP_ID || '',
            cookie: true,
            xfbml: true,
            version: 'v25.0'
          })
        }}
      />
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
        {verifyResult && (
          <div className={`${verifyResult.success ? 'bg-emerald-600' : 'bg-red-600'} text-white shadow-2xl px-6 py-4 rounded-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300 relative group/notif`}>
            <button 
              onClick={() => setVerifyResult(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover/notif:opacity-100"
            >
              <X size={14} />
            </button>
            <div className="bg-white/20 p-1.5 rounded-full shrink-0">
              {verifyResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold">{verifyResult.success ? 'Conexión Exitosa' : 'Error de Conexión'}</p>
              <p className="text-xs opacity-90 whitespace-pre-line">
                {verifyResult.message.replace(/^[^\n]*\n/, '')}
              </p>
            </div>
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
              <button
                onClick={() => { setActiveSection('botConfig'); setSelectedAgentId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === 'botConfig' ? 'bg-[#F36A2D]/10 text-[#F36A2D] shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'}`}
              >
                <Bot size={18} /> Asistente IA
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
            <div className="h-full flex flex-col p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in transition-all duration-500 overflow-y-auto">
              <header className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-6 bg-[#F36A2D] rounded-full" />
                  <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-[0.2em]">Ajustes de Usuario</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">Mi Perfil</h2>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Visual Identity Card */}
                <div className="group h-full">
                  <div className="bg-white dark:bg-[#111111]/60 border border-[#DEDAD0] dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg shadow-black/5 dark:shadow-none hover:border-[#F36A2D]/30 transition-all duration-500 h-full">
                    <div className="relative mb-6">
                       <div className="absolute inset-0 bg-gradient-to-tr from-[#F36A2D] to-[#FF9E7A] rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                       <div className="relative w-20 h-20 bg-[#F36A2D]/10 text-[#F36A2D] rounded-full flex items-center justify-center ring-4 ring-[#F36A2D]/5 transition-transform duration-500 group-hover:scale-105">
                         <User size={40} strokeWidth={1.5} />
                       </div>
                       <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border-2 border-white dark:border-[#111111] w-5 h-5 rounded-full shadow-md" />
                    </div>

                    <div className="space-y-1 mb-6">
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">{userName || 'Usuario'}</h3>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full">
                        <ShieldCheck size={10} className="text-[#F36A2D]" />
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-black">{isAdmin ? 'Administrador' : 'Cliente'}</span>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/60 flex-1">
                      <div className="flex flex-col items-start gap-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                        <div className="w-full text-left px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                          {userEmail}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1">Nombre Público</label>
                        <input 
                          type="text" 
                          value={userName} 
                          onChange={e => setUserName(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full text-xs px-4 py-2.5 bg-white dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#F36A2D]/50 focus:border-[#F36A2D] outline-none transition-all text-zinc-900 dark:text-zinc-100 shadow-inner"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isUpdatingProfile}
                      className="w-full mt-6 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3 rounded-xl text-xs font-black tracking-tight shadow-lg shadow-black/5 hover:bg-[#F36A2D] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdatingProfile ? <Loader2 size={16} className="animate-spin" /> : profileStatus === 'success' ? <><CheckCircle2 size={16} /> ¡Hecho!</> : 'Guardar Perfil'}
                    </button>
                  </div>
                </div>

                {/* Password Form */}
                <div className="h-full">
                  <div className="bg-white dark:bg-[#111111]/60 border border-[#DEDAD0] dark:border-zinc-800/80 rounded-3xl p-6 shadow-lg shadow-black/5 dark:shadow-none h-full flex flex-col hover:border-[#F36A2D]/30 transition-all duration-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-[#F36A2D]/10 rounded-xl">
                        <Lock className="text-[#F36A2D]" size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Seguridad</h3>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1">Contraseña Actual</label>
                        <div className="relative group/input">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within/input:text-[#F36A2D] transition-colors" size={14} />
                          <input 
                            type="password" 
                            placeholder="••••••••••••"
                            value={oldPassword} 
                            onChange={e => setOldPassword(e.target.value)}
                            className="w-full text-xs pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#F36A2D]/50 focus:border-[#F36A2D] outline-none transition-all text-zinc-900 dark:text-zinc-100 shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1">Nueva Contraseña</label>
                        <div className="relative group/input">
                          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within/input:text-[#F36A2D] transition-colors" size={14} />
                          <input 
                            type="password" 
                            placeholder="Mínimo 8 caracteres"
                            value={userPassword} 
                            onChange={e => setUserPassword(e.target.value)}
                            className="w-full text-xs pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#F36A2D]/50 focus:border-[#F36A2D] outline-none transition-all text-zinc-900 dark:text-zinc-100 shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1">Confirmar Nueva</label>
                        <div className="relative group/input">
                          <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" size={14} />
                          <input 
                            type="password" 
                            placeholder="Repita la contraseña"
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full text-xs pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all text-zinc-900 dark:text-zinc-100 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleUpdatePassword}
                      disabled={isUpdatingPassword || !userPassword || !oldPassword || !confirmPassword}
                      className="w-full mt-6 bg-[#111111] dark:bg-zinc-800 text-white py-3 rounded-xl text-xs font-black tracking-tight shadow-lg hover:bg-[#F36A2D] transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : passwordStatus === 'success' ? <><CheckCircle2 size={16} /> ¡Listo!</> : 'Actualizar Pass'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Emails Card */}
              <div className="mt-6 bg-white dark:bg-[#111111]/60 border border-[#DEDAD0] dark:border-zinc-800/80 rounded-3xl p-6 shadow-lg shadow-black/5 dark:shadow-none hover:border-[#F36A2D]/30 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#F36A2D]/10 rounded-xl">
                    <MessageSquare className="text-[#F36A2D]" size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Notificaciones de Handoff</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Cuando el bot transfiera a un humano, se enviará un correo a estas direcciones.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {notificationEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {notificationEmails.map((email) => (
                        <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-[#F36A2D]/10 border border-[#F36A2D]/20 rounded-full text-xs font-medium text-[#F36A2D]">
                          <span>{email}</span>
                          <button
                            onClick={() => setNotificationEmails(prev => prev.filter(e => e !== email))}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      id="notification-email-input"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={notificationEmailInput}
                      onChange={e => setNotificationEmailInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = notificationEmailInput.trim();
                          if (trimmed && !notificationEmails.includes(trimmed)) {
                            setNotificationEmails(prev => [...prev, trimmed]);
                            setNotificationEmailInput('');
                          }
                        }
                      }}
                      className="flex-1 text-xs px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#F36A2D]/50 focus:border-[#F36A2D] outline-none transition-all text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => {
                        const trimmed = notificationEmailInput.trim();
                        if (trimmed && !notificationEmails.includes(trimmed)) {
                          setNotificationEmails(prev => [...prev, trimmed]);
                          setNotificationEmailInput('');
                        }
                      }}
                      className="px-4 py-2.5 bg-[#F36A2D]/10 text-[#F36A2D] rounded-xl text-xs font-bold hover:bg-[#F36A2D] hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    onClick={handleSaveNotificationEmails}
                    disabled={isSavingNotificationEmails}
                    className="w-full mt-2 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3 rounded-xl text-xs font-black tracking-tight shadow-lg shadow-black/5 hover:bg-[#F36A2D] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingNotificationEmails ? <Loader2 size={16} className="animate-spin" /> : notificationEmailsStatus === 'success' ? <><CheckCircle2 size={16} /> ¡Guardado!</> : 'Guardar correos'}
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* BOT CONFIG SECTION */}
          {activeSection === 'botConfig' && (
            <div className="h-full flex flex-col p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in transition-all duration-500 overflow-y-auto">
              <header className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-6 bg-[#F36A2D] rounded-full" />
                  <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-[0.2em]">Configuración</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">Asistente IA</h2>
              </header>

              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-[#111111]/60 border border-[#DEDAD0] dark:border-zinc-800/80 rounded-3xl p-6 shadow-lg shadow-black/5 dark:shadow-none transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#F36A2D]/10 rounded-xl">
                      <Bot className="text-[#F36A2D]" size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Comportamiento del Bot</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Controla cómo interactúa la IA con los nuevos clientes.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Responder automáticamente</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Si activas esta opción, el bot contestará a los clientes que te escriban por primera vez. Si la apagas, todos los mensajes nuevos requerirán atención humana y la IA no enviará respuestas automáticas.
                        </span>
                      </div>
                      <button
                        onClick={() => setDefaultBotActive(!defaultBotActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F36A2D] focus:ring-offset-2 ${defaultBotActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        role="switch"
                        aria-checked={defaultBotActive}
                      >
                        <span className="sr-only">Habilitar bot por defecto</span>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${defaultBotActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800/40">
                      <button 
                        onClick={handleSaveBotConfig}
                        disabled={isSaving}
                        className="px-6 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3 rounded-xl text-xs font-black tracking-tight shadow-md hover:bg-[#F36A2D] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'success' ? <><CheckCircle2 size={16} /> ¡Hecho!</> : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTIONS SECTION */}
          {activeSection === 'connections' && (
            <div className="h-full flex flex-col p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in transition-all duration-500 overflow-y-auto">
              <header className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-6 bg-[#F36A2D] rounded-full" />
                  <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-[0.2em]">Canales</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">Conexiones</h2>
              </header>

              {igFeedback && (
                <div className="mb-6 flex items-center gap-2 p-3 rounded-xl border text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top-2">
                  <CheckCircle2 size={14} /> {igFeedback === 'success' ? 'Éxito' : 'Error'} al conectar Instagram
                </div>
              )}

              {waFeedback && (
                <div className={`mb-6 flex items-center gap-2 p-3 rounded-xl border text-[10px] font-semibold animate-in slide-in-from-top-2 ${waFeedback === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
                  {waFeedback === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />} 
                  <span>{waFeedback === 'success' ? 'WhatsApp conectado exitosamente.' : waErrorMessage}</span>
                </div>
              )}

              <div className="max-w-md mx-auto w-full">
                {/* ─── WhatsApp Card ─── */}
                <div className={`group p-8 bg-white dark:bg-[#111111]/60 border rounded-[3rem] shadow-2xl shadow-black/5 flex flex-col items-center text-center transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/40 ${
                  waIntegration?.status === 'active' ? 'border-emerald-500/20 ring-1 ring-emerald-500/20' : 'border-[#DEDAD0] dark:border-zinc-800'
                }`}>
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-xl opacity-10 group-hover:opacity-30 transition-opacity" />
                    <div className="relative h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:-rotate-3 transition-transform duration-500">
                      <MessageSquare size={32} />
                    </div>
                    {waIntegration?.status === 'active' && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#111111] rounded-full shadow-lg animate-pulse" />
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-zinc-900 dark:text-[#EDE9E0] tracking-tight mb-2">WhatsApp</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-[240px]">
                    Conecta tu número a través de la API oficial de WhatsApp Business.
                  </p>
                  
                  <div className="mt-auto flex gap-3 w-full">
                    <button 
                      onClick={handleConnectWhatsApp} 
                      disabled={waLoading}
                      className="flex-1 py-4 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {waLoading ? <Loader2 size={16} className="animate-spin" /> : waIntegration?.status === 'active' ? 'Reconectar' : 'Conectar'}
                    </button>
                    <button 
                      onClick={handleVerifyWhatsApp}
                      disabled={isVerifying}
                      className={`px-5 py-4 border rounded-2xl transition-all duration-300 ${
                        waVerifyStatus === 'success' 
                          ? 'text-emerald-500 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20' 
                          : waVerifyStatus === 'error'
                          ? 'text-red-500 border-red-500/30 bg-red-50/50 hover:bg-red-50 dark:border-red-800/40 dark:bg-red-950/20 dark:hover:bg-red-900/20'
                          : 'text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      {isVerifying ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
                    </button>
                  </div>
                </div>
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
                          <button 
                            onClick={handleCompileKnowledge}
                            disabled={isCompiling || !knowledgeRaw.trim()} 
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${compileStatus === 'success' ? "bg-green-600 text-white" : "bg-[#F36A2D] hover:bg-[#E55A1D] text-white"}`}
                          >
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
