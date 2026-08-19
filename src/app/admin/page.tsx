'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Plus, Settings, ChevronRight, Save, X, Edit3, Trash2, LayoutDashboard, Calendar, MessageSquare, Megaphone, AlertTriangle, Bot, User, Clock, LogOut, CreditCard, Cpu, Phone, DollarSign, RefreshCw, Key, Database, HelpCircle, Code, Sparkles, CheckCircle2, BookOpen, Layers, GripVertical, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Globe, TestTube, Play, Copy } from 'lucide-react';
import { getClients, createClient, updateBotConfig, updateClient, deleteClient, getUsageStats, fetchAvailableTemplateGroups, getMasterConfig, updateMasterConfig, type ProjectUsageStats, getGlobalStats, getMessageTimeSeries } from '@/app/actions/admin';
import { compileKnowledgeWithAI, saveAgentConfig } from '@/app/actions/settings';
import { getPromptBlocks, updatePromptBlock, reorderPromptBlocks, createPromptBlock, deletePromptBlock, resetToDefaultBlocks } from '@/app/actions/prompt-builder';
import { generateBotConfigFromFile, generateBotConfigFromUrl, type GeneratedBotConfig } from '@/app/actions/bot-builder';
import { runTestSimulation, getTestSuiteStatus, getTestSuiteResults } from '@/app/actions/testing';
import { MessageChart, type ChartDataPoint } from '@/components/admin/MessageChart';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clients, setClients] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  // Global Stats state
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Create User state
  const [showCreate, setShowCreate] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserTemplateGroup, setNewUserTemplateGroup] = useState('');
  const [newUserNumberType, setNewUserNumberType] = useState<'abita' | 'embedded'>('abita');
  const [isCreating, setIsCreating] = useState(false);

  // Global Config state
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [masterWabaId, setMasterWabaId] = useState('');
  const [masterToken, setMasterToken] = useState('');
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [globalConfigTab, setGlobalConfigTab] = useState<'api' | 'prompt'>('api');
  const [activeBotSubTab, setActiveBotSubTab] = useState<'api' | 'identity' | 'instructions' | 'handoff' | 'knowledge' | 'faq' | 'scoring'>('identity');

  // Prompt Builder state
  const [promptBlocks, setPromptBlocks] = useState<any[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [newBlockLabel, setNewBlockLabel] = useState('');
  const [newBlockXmlTag, setNewBlockXmlTag] = useState('');
  const [newBlockContent, setNewBlockContent] = useState('');
  const [newBlockDescription, setNewBlockDescription] = useState('');
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  // Modal / Tab state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'edit' | 'bot' | 'usage' | 'subscription' | 'builder' | 'testing'>('dashboard');
  const [activeEditSubTab, setActiveEditSubTab] = useState<'info' | 'subscription' | 'danger'>('info');
  const [isRefreshingClient, setIsRefreshingClient] = useState(false);

  // Bot Builder state
  const [builderPhase, setBuilderPhase] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [builderMode, setBuilderMode] = useState<'file' | 'url'>('file');
  const [builderFile, setBuilderFile] = useState<File | null>(null);
  const [builderUrl, setBuilderUrl] = useState('');
  const [builderDragOver, setBuilderDragOver] = useState(false);
  const [builderProcessingStep, setBuilderProcessingStep] = useState<string>('');
  const [builderGenerated, setBuilderGenerated] = useState<GeneratedBotConfig | null>(null);
  const [builderPreviewTab, setBuilderPreviewTab] = useState<'identity' | 'instructions' | 'knowledge' | 'faq' | 'handoff' | 'scoring'>('identity');
  const [isSavingBuilder, setIsSavingBuilder] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Testing / Simulator state
  const [isTesting, setIsTesting] = useState(false);
  const [testData, setTestData] = useState<any | null>(null);
  const [testProgress, setTestProgress] = useState<string>('');

  const handleRefreshClient = async () => {
    if (!selectedClient) return;
    setIsRefreshingClient(true);
    try {
      const data = await getClients();
      setClients(data);
      const updatedClient = data.find((c: any) => c.id === selectedClient.id);
      if (updatedClient) {
        setSelectedClient(updatedClient);
        // Refresh usage stats too
        const project = updatedClient.projects?.[0];
        if (project?.id) {
          let startIso, endIso;
          if (clientStartDate) startIso = new Date(clientStartDate + 'T00:00:00').toISOString();
          if (clientEndDate) endIso = new Date(clientEndDate + 'T23:59:59.999').toISOString();
          const stats = await getUsageStats(project.id, startIso, endIso);
          setUsageStats(stats);
        }
      }
    } catch (err) {
      console.error("Error refreshing client info:", err);
    } finally {
      setIsRefreshingClient(false);
    }
  };

  const handleRunTest = async () => {
    const project = selectedClient?.projects?.[0];
    if (!project) return;

    setIsTesting(true);
    setTestData(null);
    setTestProgress('Iniciando simulación...');

    try {
      const res = await runTestSimulation(project.id, 5);
      if (!res.success || !res.suiteId) {
        alert("Error al iniciar los tests: " + (res.error || "No se obtuvo ID del suite"));
        setIsTesting(false);
        return;
      }

      const suiteId = res.suiteId;

      // Iniciar el polling
      const interval = setInterval(async () => {
        try {
          const statusRes = await getTestSuiteStatus(suiteId);
          if (statusRes.success && statusRes.suite) {
            setTestProgress(statusRes.suite.progress || 'Procesando...');

            if (statusRes.suite.status === 'COMPLETED') {
              clearInterval(interval);
              // Fetch results
              const resultsRes = await getTestSuiteResults(suiteId);
              if (resultsRes.success) {
                setTestData(resultsRes);
              } else {
                alert("Error al obtener resultados: " + resultsRes.error);
              }
              setIsTesting(false);
            } else if (statusRes.suite.status === 'FAILED') {
              clearInterval(interval);
              alert("La simulación falló: " + statusRes.suite.progress);
              setIsTesting(false);
            }
          }
        } catch (pollErr: any) {
          console.error("Polling error:", pollErr);
        }
      }, 1500);

    } catch (err: any) {
      alert("Error: " + err.message);
      setIsTesting(false);
    }
  };

  // Usage / Cost state
  const [usageStats, setUsageStats] = useState<ProjectUsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');

  const [clientChartData, setClientChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const project = selectedClient?.projects?.[0];
    if (!project?.id) {
      setUsageStats(null);
      setClientChartData([]);
      return;
    }
    
    let startIso, endIso;
    if (clientStartDate) startIso = new Date(clientStartDate + 'T00:00:00');
    if (clientEndDate) endIso = new Date(clientEndDate + 'T23:59:59.999Z');

    setIsLoadingUsage(true);

    Promise.all([
      getUsageStats(project.id, startIso?.toISOString(), endIso?.toISOString()),
      getMessageTimeSeries(startIso, endIso, project.id)
    ])
      .then(([stats, timeSeries]) => {
        setUsageStats(stats);
        setClientChartData(timeSeries);
        setIsLoadingUsage(false);
      })
      .catch(() => setIsLoadingUsage(false));
  }, [selectedClient?.id, clientStartDate, clientEndDate]);

  // Edit Config state
  const [configData, setConfigData] = useState<any>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'success' | 'error' | null>(null);

  // Bot Scoring state (JSON array) + leadScoringEnabled (from project)
  const [scoringRulesList, setScoringRulesList] = useState<{ condition: string; score: number }[]>([]);


  // Edit User state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTemplateGroup, setEditTemplateGroup] = useState('');
  const [editSubscriptionStatus, setEditSubscriptionStatus] = useState('ACTIVE');
  const [editSubscriptionEndsAt, setEditSubscriptionEndsAt] = useState<string | undefined>('');
  const [editMessageLimit, setEditMessageLimit] = useState<number | ''>(1000);
  const [editSubscriptionResetDay, setEditSubscriptionResetDay] = useState<number>(1);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Delete User state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy bot state
  const [copiedBotConfig, setCopiedBotConfig] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.email !== 'info@abitaai.com') {
        router.push('/');
      } else if (!hasLoadedInitially) {
        setHasLoadedInitially(true);
        loadClients();
        loadMasterConfig();
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    const handleOpenGlobalConfig = () => setShowGlobalConfig(true);
    window.addEventListener('open-global-config', handleOpenGlobalConfig);
    return () => window.removeEventListener('open-global-config', handleOpenGlobalConfig);
  }, []);

  const loadStats = async (start?: string, end?: string) => {
    setIsStatsLoading(true);
    try {
      const [stats, timeSeries] = await Promise.all([
        getGlobalStats(
          start ? new Date(start) : undefined,
          end ? new Date(`${end}T23:59:59.999Z`) : undefined
        ),
        getMessageTimeSeries(
          start ? new Date(start) : undefined,
          end ? new Date(`${end}T23:59:59.999Z`) : undefined
        )
      ]);
      setGlobalStats(stats);
      setChartData(timeSeries);
    } catch (err) {
      console.error('Error fetching stats', err);
    }
    setIsStatsLoading(false);
  };

  const loadClients = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getClients();
      setClients(data);
      setAvailableGroups([]); // Se omite el fetch automático para no saturar la API
      
      // Load stats initially
      await loadStats(statsStartDate, statsEndDate);
    } catch (err) { console.error('Error fetching clients or groups', err) }
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    if (hasLoadedInitially) {
      loadStats(statsStartDate, statsEndDate);
    }
  }, [statsStartDate, statsEndDate]);

  const loadMasterConfig = async () => {
    try {
      const config = await getMasterConfig();
      setMasterWabaId(config.whatsappBusinessId);
      setMasterToken(config.whatsappToken);
    } catch (err) {
      console.error('Error loading master config:', err);
    }
  };

  const loadPromptBlocks = async () => {
    setIsLoadingBlocks(true);
    try {
      const blocks = await getPromptBlocks();
      setPromptBlocks(blocks);
    } catch (err) {
      console.error('Error loading prompt blocks:', err);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const handleToggleBlock = async (block: any) => {
    try {
      await updatePromptBlock(block.id, { isEnabled: !block.isEnabled });
      setPromptBlocks(prev => prev.map(b => b.id === block.id ? { ...b, isEnabled: !b.isEnabled } : b));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleMoveBlock = async (blocks: any[], fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= blocks.length) return;
    const reordered = [...blocks];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];
    setPromptBlocks(reordered);
    await reorderPromptBlocks(reordered.map(b => b.id));
  };

  const handleSaveBlock = async () => {
    if (!editingBlock) return;
    setIsSavingBlock(true);
    try {
      await updatePromptBlock(editingBlock.id, {
        label: editingBlock.label,
        description: editingBlock.description,
        xmlTag: editingBlock.xmlTag,
        content: editingBlock.content,
      });
      setPromptBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, ...editingBlock } : b));
      setEditingBlock(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!newBlockLabel || !newBlockXmlTag) return;
    setIsSavingBlock(true);
    try {
      const block = await createPromptBlock({
        label: newBlockLabel,
        description: newBlockDescription,
        xmlTag: newBlockXmlTag,
        content: newBlockContent,
        source: 'global',
      });
      setPromptBlocks(prev => [...prev, block]);
      setShowNewBlock(false);
      setNewBlockLabel(''); setNewBlockXmlTag(''); setNewBlockContent(''); setNewBlockDescription('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    try {
      await deletePromptBlock(id);
      setPromptBlocks(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetBlocks = async () => {
    if (!confirm('Esto reemplazará todos los bloques default con la configuración original. Los bloques custom se conservan. ¿Continuar?')) return;
    try {
      await resetToDefaultBlocks();
      await loadPromptBlocks();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };


  const handleSaveGlobalConfig = async () => {
    setIsSavingGlobal(true);
    try {
      await updateMasterConfig({
        whatsappBusinessId: masterWabaId,
        whatsappToken: masterToken
      });
      alert('Configuración maestra guardada con éxito.');
      setShowGlobalConfig(false);
      // Refresh groups after updating credentials
      const groups = await fetchAvailableTemplateGroups();
      setAvailableGroups(groups);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) return;

    setIsCreating(true);
    try {
      await createClient({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        templateGroup: newUserTemplateGroup,
        numberType: newUserNumberType,
        initialBotConfig: copiedBotConfig
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserTemplateGroup('');
      setNewUserNumberType('abita');
      setCopiedBotConfig(null);
      setShowCreate(false);
      loadClients();
      alert('Usuario creado con éxito');
    } catch (err: any) {
      alert('Error al crear usuario: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyBot = () => {
    if (!selectedClient) return;
    const project = selectedClient.projects?.[0];
    const initialConfig = project?.agents?.[0] || {};
    setCopiedBotConfig(initialConfig);
    setShowCreate(true);
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setActiveTab('dashboard');

    // Init Edit tab
    setEditName(client.name);
    setEditEmail(client.email);
    setEditPassword('');
    setEditTemplateGroup(client.templateGroup || '');
    setEditSubscriptionStatus(client.subscriptionStatus || 'ACTIVE');
    setEditSubscriptionEndsAt(client.subscriptionEndsAt ? new Date(client.subscriptionEndsAt).toISOString().split('T')[0] : '');
    setEditMessageLimit(client.messageLimit ?? 1000);
    setEditSubscriptionResetDay(client.subscriptionResetDay ?? 1);
    setDeleteConfirmText('');

    // Init Bot Config tab
    const project = client.projects?.[0];
    const initialConfig = project?.agents?.[0] || {};
    setConfigData({
      identity: initialConfig.identity || '',
      instructions: initialConfig.instructions || '',
      handoffRules: initialConfig.handoffRules || '',
      knowledgeData: initialConfig.knowledgeData || '',
      knowledgeRaw: initialConfig.knowledgeRaw || '',
      faq: initialConfig.faq || '',
      leadScoringRules: initialConfig.leadScoringRules || '',
      leadScoringEnabled: project?.leadScoringEnabled ?? true,
      defaultBotActive: project?.defaultBotActive ?? false,
      botAutoWakeHours: project?.botAutoWakeHours ?? null,
      whatsappToken: project?.whatsappToken || '',
      whatsappPhoneId: project?.whatsappPhoneId || '',
      whatsappBusinessId: project?.whatsappBusinessId || '',
    });

    try {
      if (initialConfig.leadScoringRules) {
        setScoringRulesList(JSON.parse(initialConfig.leadScoringRules));
      } else {
        setScoringRulesList([]);
      }
    } catch {
      setScoringRulesList([]);
    }

    // Preload usage stats
    setClientStartDate('');
    setClientEndDate('');
    setUsageStats(null);
  };

  const handleSaveConfig = async () => {
    if (!selectedClient) return;
    const project = selectedClient.projects?.[0];
    if (!project) {
      alert('El usuario no tiene proyecto asignado.');
      return;
    }

    setIsSavingConfig(true);
    try {
      const configToSave = {
        ...configData,
        leadScoringRules: JSON.stringify(scoringRulesList) // Save list as JSON string
      };
      await updateBotConfig(project.id, configToSave);
      setSelectedClient(null);
      alert('Configuración guardada exitosamente');
      loadClients(true);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedClient) return;
    setIsSavingUser(true);
    try {
      await updateClient(selectedClient.id, {
        name: editName,
        email: editEmail,
        password: editPassword || undefined,
        templateGroup: editTemplateGroup,
        subscriptionStatus: editSubscriptionStatus,
        subscriptionEndsAt: editSubscriptionEndsAt ? new Date(editSubscriptionEndsAt) : null,
        messageLimit: editMessageLimit === '' ? 0 : editMessageLimit,
        subscriptionResetDay: editSubscriptionResetDay,
        // Si el admin manualmente lo pasa a ACTIVE, reiniciamos intentos por si acaso
        resetFailedLogins: editSubscriptionStatus === 'ACTIVE'
      });
      setSelectedClient(null);
      alert('Usuario actualizado');
      loadClients(true);
      setEditPassword('');
    } catch (err: any) {
      alert('Error al actualizar usuario: ' + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedClient) return;
    setIsSavingUser(true);
    try {
      await updateClient(selectedClient.id, {
        subscriptionStatus: 'ACTIVE',
        resetFailedLogins: true
      });
      alert('Cuenta desbloqueada con éxito');
      loadClients(true);
      setEditSubscriptionStatus('ACTIVE');
      setSelectedClient({ ...selectedClient, failedLoginAttempts: 0, subscriptionStatus: 'ACTIVE' });
    } catch (err: any) {
      alert('Error al desbloquear: ' + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedClient) return;
    if (deleteConfirmText !== `eliminar ${selectedClient.name}`) {
      alert('El texto de confirmación no coincide.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClient(selectedClient.id);
      setSelectedClient(null);
      loadClients();
      alert('Usuario eliminado correctamente');
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelativeDate = (dateString: string | Date) => {
    if (!dateString) return 'Sin actividad';
    const date = new Date(dateString);
    const now = new Date();

    // Reset hours to compare days only
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Hoy ${timeStr}`;
    if (diffDays === 1) return `Ayer ${timeStr}`;
    if (diffDays < 7) {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return `${days[date.getDay()]} ${timeStr}`;
    }

    return `${date.toLocaleDateString('es-ES')} ${timeStr}`;
  };

  const getClientStatus = (client: any) => {
    if (client.subscriptionStatus && client.subscriptionStatus !== 'ACTIVE') {
      return { label: 'Bloqueado', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' };
    }
    const lastUseAt = client.projects?.[0]?.lastUseAt;
    if (!lastUseAt) {
      return { label: 'Sin actividad', color: 'bg-zinc-400', textColor: 'text-zinc-500 dark:text-zinc-400' };
    }
    const diffDays = (Date.now() - new Date(lastUseAt).getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 30) {
      return { label: 'Activo', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' };
    } else {
      return { label: 'Dormido', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  if (session?.user?.email !== 'info@abitaai.com') {
    return null;
  }

  return (
    <div className="space-y-8">
      <datalist id="template-groups">
        {availableGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-orange-600" /> Gestionar Clientes
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Visualiza y administra todas las cuentas de la plataforma.
          </p>
        </div>
      </div>

      {/* GLOBAL CONFIG MODAL */}
      {showGlobalConfig && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl h-[80vh] rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <Settings size={20} className="text-orange-600" />
                <h3 className="font-semibold">Configuración Maestra (Abita.ai)</h3>
              </div>
              <button onClick={() => setShowGlobalConfig(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#121214]/50 p-4 space-y-2 overflow-y-auto">
                <button
                  onClick={() => setGlobalConfigTab('api')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${globalConfigTab === 'api' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Key size={18} /> API &amp; Tokens
                </button>
                <button
                  onClick={() => { setGlobalConfigTab('prompt'); if (promptBlocks.length === 0) loadPromptBlocks(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${globalConfigTab === 'prompt' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Layers size={18} /> Prompt Builder
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {globalConfigTab === 'api' && (
                  <div className="space-y-6">
                    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4">
                      <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed font-medium">
                        Estas credenciales se utilizan para sincronizar los grupos de plantillas de Facebook. Asegúrate de que correspondan al Business Account donde viven los templates.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Master WABA ID</label>
                        <input
                          value={masterWabaId}
                          onChange={e => setMasterWabaId(e.target.value)}
                          placeholder="WhatsApp Business Account ID"
                          className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Master System User Token</label>
                        <textarea
                          rows={4}
                          value={masterToken}
                          onChange={e => setMasterToken(e.target.value)}
                          placeholder="Permanent Access Token"
                          className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}


                {globalConfigTab === 'prompt' && (
                  <div className="flex flex-col h-full gap-3">
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Estructura del Prompt</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Reordena los bloques. Los bloques <span className="text-orange-500 font-bold">globales</span> son editables; los <span className="text-purple-500 font-bold">de cliente</span> son variables automáticas.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowCheatsheet(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-xs font-bold rounded-xl transition-all"
                          title="Guía de Acciones"
                        >
                          <HelpCircle size={14} /> Actions Cheat Sheet
                        </button>
                        <button
                          onClick={handleResetBlocks}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-500 hover:text-red-500 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-300 transition-all"
                          title="Restaurar bloques default"
                        >
                          <RefreshCw size={12} /> Reset
                        </button>
                        <button
                          onClick={() => setShowNewBlock(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Plus size={14} /> Nuevo Bloque
                        </button>
                      </div>
                    </div>

                    {isLoadingBlocks ? (
                      <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" size={28} /></div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {promptBlocks.map((block, index) => {
                          const isPlaceholder = block.source === 'agent' || block.source === 'runtime';
                          const isGlobal = block.source === 'global';
                          return (
                            <div
                              key={block.id}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${!block.isEnabled
                                ? 'opacity-40 bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900'
                                : isPlaceholder
                                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40'
                                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700'
                                }`}
                            >
                              {/* Order controls */}
                              <div className="flex flex-col gap-0 shrink-0">
                                <button onClick={() => handleMoveBlock(promptBlocks, index, 'up')} disabled={index === 0} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-300 disabled:opacity-20"><ChevronUp size={13} /></button>
                                <button onClick={() => handleMoveBlock(promptBlocks, index, 'down')} disabled={index === promptBlocks.length - 1} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-300 disabled:opacity-20"><ChevronDown size={13} /></button>
                              </div>

                              {/* Number */}
                              <span className="text-[11px] font-bold text-zinc-300 w-4 shrink-0">{index + 1}</span>

                              {/* Label + badge */}
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className={`font-semibold text-sm ${isPlaceholder ? 'text-purple-700 dark:text-purple-300' : 'text-zinc-900 dark:text-white'}`}>
                                  {isPlaceholder ? `{ ${block.label} }` : block.label}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${block.source === 'global' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                  block.source === 'agent' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                  }`}>
                                  {block.source === 'global' ? 'Global' : block.source === 'agent' ? 'Cliente' : 'Auto'}
                                </span>
                                {!block.isEnabled && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500">OFF</span>}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleBlock(block)}
                                  className={`p-1.5 rounded-lg transition-all ${block.isEnabled ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                  title={block.isEnabled ? 'Desactivar' : 'Activar'}
                                >
                                  {block.isEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                </button>
                                {isGlobal && (
                                  <button
                                    onClick={() => setEditingBlock({ ...block })}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 transition-all"
                                    title="Editar contenido"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}
                                {block.isDeletable && (
                                  <button onClick={() => handleDeleteBlock(block.id)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all" title="Eliminar">
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}


                    {/* Edit Block Modal */}
                    {editingBlock && (
                      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
                          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-zinc-900 dark:text-white">Editar: {editingBlock.label}</h3>
                            <button onClick={() => setEditingBlock(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400"><X size={18} /></button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Label</label>
                                <input value={editingBlock.label} onChange={e => setEditingBlock((b: any) => ({ ...b, label: e.target.value }))} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">XML Tag</label>
                                <input value={editingBlock.xmlTag} onChange={e => setEditingBlock((b: any) => ({ ...b, xmlTag: e.target.value }))} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Descripción (ayuda interna)</label>
                              <input value={editingBlock.description || ''} onChange={e => setEditingBlock((b: any) => ({ ...b, description: e.target.value }))} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Contenido del Bloque</label>
                              <textarea
                                value={editingBlock.content || ''}
                                onChange={e => setEditingBlock((b: any) => ({ ...b, content: e.target.value }))
                                }
                                rows={14}
                                className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono resize-none leading-relaxed"
                              />
                            </div>
                          </div>
                          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setEditingBlock(null)} className="px-5 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">Cancelar</button>
                            <button onClick={handleSaveBlock} disabled={isSavingBlock} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all">
                              {isSavingBlock ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* New Block Modal */}
                    {showNewBlock && (
                      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
                          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-zinc-900 dark:text-white">Nuevo Bloque de Prompt</h3>
                            <button onClick={() => setShowNewBlock(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400"><X size={18} /></button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Label</label>
                                <input value={newBlockLabel} onChange={e => setNewBlockLabel(e.target.value)} placeholder="Ej: Regla Final Especial" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">XML Tag</label>
                                <input value={newBlockXmlTag} onChange={e => setNewBlockXmlTag(e.target.value)} placeholder="Ej: final_rule" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Descripción (ayuda interna)</label>
                              <input value={newBlockDescription} onChange={e => setNewBlockDescription(e.target.value)} placeholder="Para qué sirve este bloque..." className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-widest">Contenido</label>
                              <textarea value={newBlockContent} onChange={e => setNewBlockContent(e.target.value)} rows={12} placeholder="Escribe el contenido de este bloque..." className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono resize-none leading-relaxed" />
                            </div>
                          </div>
                          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowNewBlock(false)} className="px-5 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">Cancelar</button>
                            <button onClick={handleCreateBlock} disabled={isSavingBlock || !newBlockLabel || !newBlockXmlTag} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50">
                              {isSavingBlock ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear Bloque
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions Cheat Sheet Modal */}
                    {showCheatsheet && (
                      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-xl max-h-[85vh] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
                          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              <HelpCircle size={18} className="text-orange-500" /> System Actions Cheat Sheet
                            </h3>
                            <button onClick={() => setShowCheatsheet(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400"><X size={18} /></button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              Usa estas etiquetas (tags) en tus reglas maestras. El sistema intercepta estas etiquetas y ejecuta la acción automáticamente en la base de datos o en la bandeja de entrada.
                            </p>

                            <div className="space-y-4">
                              <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><User size={16} className="text-orange-500" /> Transferencia a Humano (Handoff)</h4>
                                <p className="text-xs text-zinc-500 mb-3">Apaga el bot inmediatamente y pone el chat en modo "Atención Humana".</p>
                                <code className="block bg-black dark:bg-black/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono">
                                  [ACTION: HANDOFF]
                                </code>
                              </div>

                              <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" /> Pregunta Sin Respuesta</h4>
                                <p className="text-xs text-zinc-500 mb-3">Registra en la base de datos una pregunta que el bot no supo contestar para posterior aprendizaje.</p>
                                <code className="block bg-black dark:bg-black/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono">
                                  [ACTION: UNANSWERED_QUESTION "Pregunta exacta del usuario"]
                                </code>
                              </div>

                              <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><Cpu size={16} className="text-orange-500" /> Sube Puntos (Lead Scoring)</h4>
                                <p className="text-xs text-zinc-500 mb-3">Incrementa el Heatmap (Score) del prospecto por mostrar interés.</p>
                                <code className="block bg-black dark:bg-black/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono mb-2">
                                  [ACTION: SCORE_BUMP +10]
                                </code>
                                <p className="text-[10px] text-zinc-400 mb-1">O especificando la razón:</p>
                                <code className="block bg-black dark:bg-black/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono">
                                  [ACTION: SCORE_BUMP +10 REASON: "Hizo click en precio"]
                                </code>
                              </div>

                              <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><MessageSquare size={16} className="text-orange-500" /> Actualizar Correo</h4>
                                <p className="text-xs text-zinc-500 mb-3">Guarda automáticamente el correo del prospecto en el CRM.</p>
                                <code className="block bg-black dark:bg-black/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono">
                                  [ACTION: UPDATE_EMAIL "correo@ejemplo.com"]
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowGlobalConfig(false)}
                className="px-6 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGlobalConfig}
                disabled={isSavingGlobal}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                {isSavingGlobal ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {copiedBotConfig ? 'Crear Nuevo Cliente (Copiando Bot)' : 'Crear Nuevo Cliente'}
              </h3>
              <button onClick={() => { setShowCreate(false); setCopiedBotConfig(null); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Nombre Completo</label>
                  <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ej: Automotriz S.A." className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Correo Electrónico</label>
                  <input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="contacto@empresa.com" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Contraseña Temporal</label>
                  <input required type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Escribe una contraseña segura" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Tipo de Número</label>
                  <select
                    value={newUserNumberType}
                    onChange={(e: any) => setNewUserNumberType(e.target.value)}
                    className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="abita">Número Abita</option>
                    <option value="embedded">Embedded Signup</option>
                  </select>
                </div>

                {newUserNumberType === 'abita' && (
                  <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Grupo de Plantillas (Prefijo)</label>
                    <select
                      value={newUserTemplateGroup}
                      onChange={e => setNewUserTemplateGroup(e.target.value)}
                      className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Inactivo / Ninguno</option>
                      {availableGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1 pl-1">Selecciona el grupo de plantillas autorizado para este cliente.</p>
                  </div>
                )}
                <button disabled={isCreating} type="submit" className="w-full py-3 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 mt-4 transition-all">
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : 'Registrar Cliente'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL DASHBOARD */}
      {globalStats && (
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Left Column: Global non-date stats */}
          <div className="lg:w-1/4 flex flex-col">
            <div className="flex items-center h-[34px] mb-3">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Cuentas Globales</h2>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow flex-1">
                <Users className="text-blue-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Clientes Totales</span>
                <span className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.totalClients}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow flex-1">
                <CheckCircle2 className="text-green-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Clientes Activos</span>
                <span className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.activeClients}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Date-dependent stats */}
          <div className="lg:w-3/4 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Métricas de Uso</h2>
                {isStatsLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={statsStartDate}
                  onChange={(e) => setStatsStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <span className="text-zinc-500 text-sm">a</span>
                <input
                  type="date"
                  value={statsEndDate}
                  onChange={(e) => setStatsEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                {(statsStartDate || statsEndDate) && (
                  <button 
                    onClick={() => { setStatsStartDate(''); setStatsEndDate(''); }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    title="Limpiar fechas"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {/* Row 1 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <User className="text-cyan-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Leads Totales</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.totalLeads}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <AlertTriangle className="text-red-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Handoffs</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.handoffs}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <DollarSign className="text-emerald-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Costo Est.</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">${globalStats.totalEstimatedCostUsd.toFixed(2)}</span>
              </div>
              
              {/* Row 2 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <Bot className="text-purple-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mensajes IA</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.botMessages}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <MessageSquare className="text-orange-500 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Msj Nosotros</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.agentMessages}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <MessageSquare className="text-blue-400 mb-2" size={24} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Templates</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{globalStats.templateMessages}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHART ROW */}
      {globalStats && (
        <div className="mb-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6">Volumen de Mensajes</h2>
          <MessageChart data={chartData} />
        </div>
      )}

      {/* CLIENTS HEADER & CARDS GRID */}
      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
          Clientes
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-medium tracking-wide shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {clients.map(client => {
          const project = client.projects?.[0];
          const leadsCount = project?._count?.leads || 0;
          const campCount = project?._count?.campaigns || 0;
          const status = getClientStatus(client);

          return (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 text-zinc-200 dark:text-zinc-800 opacity-60 group-hover:opacity-100 transition-opacity">
                <Users size={80} />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="h-10 w-10 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center font-bold text-xl mb-4">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white line-clamp-1">{client.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{client.email}</p>
                <div className="flex items-center gap-1.5 mt-2 mb-6">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${status.color}`} title={status.label} />
                  <span className={`text-[10px] font-bold whitespace-nowrap ${status.textColor}`}>
                    {status.label}
                  </span>
                  {project?.lastUseAt && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">•</span>
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        Último uso: {formatRelativeDate(project.lastUseAt)}
                      </span>
                    </>
                  )}
                </div>

              </div>
            </button>
          )
        })}
        {clients.length === 0 && !showCreate && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 mb-4">
              <Users size={32} />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Sin clientes registrados</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm text-center">Todavía no has creado ninguna cuenta para tus clientes. Comienza añadiendo uno nuevo.</p>
          </div>
        )}
      </div>

      {/* SELECTED CLIENT MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-50 dark:bg-[#09090b] w-full max-w-5xl h-[650px] rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {selectedClient.name}
                </h2>
                <div className="text-sm text-zinc-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                  {(() => {
                    const st = getClientStatus(selectedClient);
                    return (
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`h-2 w-2 rounded-full inline-block ${st.color}`} />
                        <span className={`font-bold ${st.textColor}`}>{st.label}</span>
                      </span>
                    );
                  })()}
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span>{selectedClient.email}</span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Creado: {new Date(selectedClient.createdAt).toLocaleDateString()}
                  </span>
                  {selectedClient.projects?.[0]?.lastUseAt && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <Clock size={14} /> Último uso: {formatRelativeDate(selectedClient.projects[0].lastUseAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBot}
                  className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-xl text-[13px] font-bold transition flex items-center gap-2"
                  title="Copiar reglas de este bot a un nuevo usuario"
                >
                  <Copy size={16} />
                  <span className="hidden md:inline">Copiar Bot</span>
                </button>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
                <button
                  onClick={handleRefreshClient}
                  disabled={isRefreshingClient}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors disabled:opacity-50"
                  title="Refrescar datos"
                >
                  <RefreshCw size={20} className={isRefreshingClient ? "animate-spin text-orange-600" : ""} />
                </button>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
                <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Main Layout: Tabs + Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#121214]/50 p-4 space-y-2 overflow-y-auto">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab('builder'); setBuilderPhase('upload'); setBuilderGenerated(null); setBuilderError(null); setBuilderFile(null); setBuilderUrl(''); setBuilderMode('file'); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'builder' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Sparkles size={18} />
                  Bot Builder
                </button>
                <button
                  onClick={() => setActiveTab('bot')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'bot' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Settings size={18} />
                  Bot Config
                </button>
                <button
                  onClick={() => setActiveTab('testing')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'testing' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <TestTube size={18} />
                  Testing & Eval
                </button>
                <button
                  onClick={() => {
                    setActiveTab('edit');
                    setActiveEditSubTab('info');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'edit' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Edit3 size={18} />
                  Editar Usuario
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {activeTab === 'dashboard' && (
                  <div className="mb-6 bg-zinc-100/80 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-orange-600" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                        Filtrar por Periodo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-[#121214] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <span className="text-xs text-zinc-400 font-medium">Del</span>
                        <input
                          type="date"
                          value={clientStartDate}
                          onChange={e => setClientStartDate(e.target.value)}
                          className="bg-transparent text-xs text-zinc-900 dark:text-white outline-none font-medium cursor-pointer"
                        />
                        <span className="text-xs text-zinc-400 font-medium ml-1">al</span>
                        <input
                          type="date"
                          value={clientEndDate}
                          onChange={e => setClientEndDate(e.target.value)}
                          className="bg-transparent text-xs text-zinc-900 dark:text-white outline-none font-medium cursor-pointer"
                        />
                        {(clientStartDate || clientEndDate) && (
                          <button
                            type="button"
                            onClick={() => { setClientStartDate(''); setClientEndDate(''); }}
                            title="Limpiar periodo"
                            className="text-zinc-400 hover:text-red-500 text-xs font-bold px-1 ml-1 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {isLoadingUsage && (
                        <div className="flex items-center gap-1.5 text-orange-600 text-xs font-bold px-2 animate-pulse">
                          <Loader2 size={14} className="animate-spin" />
                          Calculando...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB: DASHBOARD --- */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Métricas Generales</h3>
                      <p className="text-sm text-zinc-500 mt-1">Resumen del volumen de mensajes, leads y campañas.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
                      {/* Row 1 */}
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                          <User size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Leads</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.leadsCount : (selectedClient.projects?.[0]?._count?.leads || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Megaphone size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Campañas</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.campaignsCount : (selectedClient.projects?.[0]?._count?.campaigns || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Handoffs</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.handoffsCount : 0}
                          </p>
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Bot size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Mensajes IA</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.botMessagesCount : (selectedClient.projects?.[0]?.botMessagesCount || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Mensajes Nosotros</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.manualMessagesCount : (selectedClient.projects?.[0]?.manualMessagesCount || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Layers size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Mensajes Template</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.templateMessagesCount : (selectedClient.projects?.[0]?.templateMessagesCount || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Row 3 */}
                      <div className="md:col-start-2 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                          <Bot size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Total Automáticos</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-0.5">
                            {usageStats ? usageStats.automatedMessagesCount : (selectedClient.projects?.[0]?.automatedMessagesCount || 0)}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">IA + Templates</p>
                        </div>
                      </div>
                    </div>

                    {/* Chart Row */}
                    <div className="mb-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6">Volumen de Mensajes</h2>
                      <MessageChart data={clientChartData} />
                    </div>

                    {/* --- MÓDULO DE CONSUMO INTEGRADO --- */}
                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Consumo y Costos</h3>
                        <p className="text-sm text-zinc-500 mt-1">Desglose de créditos consumidos en IA (Claude) y WhatsApp (Meta).</p>
                      </div>

                      {isLoadingUsage ? (
                        <div className="flex items-center justify-center py-16">
                          <Loader2 size={32} className="animate-spin text-orange-600" />
                        </div>
                      ) : usageStats ? (
                        <>
                          {/* Costo Total Estimado */}
                          <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <DollarSign size={100} />
                            </div>
                            <div className="relative z-10">
                              <p className="text-orange-200 text-xs font-bold uppercase tracking-widest">Costo Total Estimado</p>
                              <p className="text-4xl font-bold mt-2">${usageStats.totalEstimatedCostUsd.toFixed(4)}</p>
                              <p className="text-orange-200 text-xs mt-2 opacity-80">Basado en precios actuales de Claude Sonnet y Meta WA API (LATAM).</p>
                            </div>
                          </div>

                          {/* AI Section (Claude) */}
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                                <Cpu size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Inteligencia Artificial (Claude Sonnet 4.6)</h4>
                                <p className="text-[10px] text-zinc-500">$2.00/MTok entrada · $10.00/MTok salida</p>
                              </div>
                              <div className="ml-auto">
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">${usageStats.claudeEstimatedCostUsd?.toFixed(4) || '0.0000'}</span>
                              </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6">
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Entrada</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{(usageStats.claudeInputTokens || 0).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Prompt + historial</p>
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Salida</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{(usageStats.claudeOutputTokens || 0).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Respuestas de IA</p>
                              </div>
                            </div>
                          </div>

                          {/* AI Section (Gemini) */}
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
                                <Sparkles size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Respaldo IA (Gemini 3.7 Flash)</h4>
                                <p className="text-[10px] text-zinc-500">$0.75/MTok entrada · $3.75/MTok salida</p>
                              </div>
                              <div className="ml-auto">
                                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">${usageStats.geminiEstimatedCostUsd?.toFixed(4) || '0.0000'}</span>
                              </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6">
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Entrada</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{(usageStats.geminiInputTokens || 0).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Prompt + historial</p>
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Salida</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{(usageStats.geminiOutputTokens || 0).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Respuestas de IA</p>
                              </div>
                            </div>
                          </div>

                          {/* Simulator Section */}
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center">
                                <Bot size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Simulador (Pruebas IA)</h4>
                                <p className="text-[10px] text-zinc-500">Tokens de pruebas internas consumidas</p>
                              </div>
                              <div className="ml-auto">
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">${usageStats.simulatorEstimatedCostUsd?.toFixed(4) || '0.0000'}</span>
                              </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6">
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Entrada</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{((usageStats.simulatorClaudeInputTokens || 0) + (usageStats.simulatorGeminiInputTokens || 0)).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Prompt + historial</p>
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens de Salida</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{((usageStats.simulatorClaudeOutputTokens || 0) + (usageStats.simulatorGeminiOutputTokens || 0)).toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Respuestas de IA</p>
                              </div>
                            </div>
                          </div>

                          {/* WhatsApp Section */}
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                              <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
                                <Phone size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">WhatsApp (Meta API)</h4>
                                <p className="text-[10px] text-zinc-500">Precios por conversación según categoría LATAM</p>
                              </div>
                              <div className="ml-auto">
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">${usageStats.estimatedWaCostUsd.toFixed(4)}</span>
                              </div>
                            </div>
                            <div className="p-6 space-y-4">
                              {/* Service */}
                              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Service</p>
                                    <p className="text-[10px] text-zinc-500">Respuestas dentro de la ventana 24h (gratis)</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{usageStats.waServiceMessages}</p>
                                  <p className="text-[10px] text-green-600 font-medium">$0.00</p>
                                </div>
                              </div>

                              {/* Marketing */}
                              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Marketing</p>
                                    <p className="text-[10px] text-zinc-500">Plantillas de campañas ($0.0520/msj)</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{usageStats.waMarketingMessages}</p>
                                  <p className="text-[10px] text-orange-600 font-medium">${(usageStats.waMarketingMessages * 0.0520).toFixed(4)}</p>
                                </div>
                              </div>

                              {/* Utility */}
                              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Utility</p>
                                    <p className="text-[10px] text-zinc-500">Confirmaciones, alertas ($0.0080/msj)</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{usageStats.waUtilityMessages}</p>
                                  <p className="text-[10px] text-blue-600 font-medium">${(usageStats.waUtilityMessages * 0.0080).toFixed(4)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-center">
                          <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 mb-4">
                            <CreditCard size={32} />
                          </div>
                          <h3 className="font-semibold text-zinc-900 dark:text-white">Sin datos de consumo</h3>
                          <p className="text-sm text-zinc-500 mt-1 max-w-sm">Aún no hay mensajes registrados para este proyecto en el periodo seleccionado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* --- TAB: EDIT USER --- */}
                {activeTab === 'edit' && (
                  <div className="max-w-4xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Perfil del Usuario</h3>
                        <p className="text-sm text-zinc-500 mt-1">Gestiona la identidad, suscripción y seguridad de la cuenta.</p>
                      </div>
                    </div>

                    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-fit">
                      <button
                        onClick={() => setActiveEditSubTab('info')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeEditSubTab === 'info' ? 'bg-white dark:bg-zinc-900 text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        Información
                      </button>
                      <button
                        onClick={() => setActiveEditSubTab('subscription')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeEditSubTab === 'subscription' ? 'bg-white dark:bg-zinc-900 text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        Suscripción
                      </button>
                      <button
                        onClick={() => setActiveEditSubTab('danger')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeEditSubTab === 'danger' ? 'bg-white dark:bg-zinc-900 text-red-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        Zona de Riesgo
                      </button>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-5 shadow-sm">
                      {activeEditSubTab === 'info' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Nombre Completo</label>
                              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Correo Electrónico</label>
                              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Restablecer Contraseña (Opcional)</label>
                              <input type="text" placeholder="Dejar en blanco para no cambiar" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Grupo de Plantillas (WABA)</label>
                              <select
                                value={editTemplateGroup}
                                onChange={e => setEditTemplateGroup(e.target.value)}
                                className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100"
                              >
                                <option value="">Inactivo / Ninguno</option>
                                {availableGroups.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="pt-4 flex justify-end gap-3">
                            <button
                              onClick={handleSaveUser}
                              disabled={isSavingUser}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl text-[13px] font-bold flex items-center gap-2 transition shadow-lg shadow-orange-500/20 disabled:opacity-50"
                            >
                              {isSavingUser ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              Guardar Cambios
                            </button>
                          </div>
                        </div>
                      )}

                      {activeEditSubTab === 'subscription' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                          {selectedClient?.failedLoginAttempts >= 5 && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-center justify-between">
                              <div>
                                <h4 className="text-red-800 dark:text-red-400 font-bold text-[13px]">Cuenta Bloqueada por Seguridad</h4>
                                <p className="text-red-600 dark:text-red-500 text-[11px] mt-1">El usuario intentó iniciar sesión fallidamente {selectedClient?.failedLoginAttempts} veces.</p>
                              </div>
                              <button
                                onClick={handleUnblock}
                                disabled={isSavingUser}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[12px] font-bold transition disabled:opacity-50"
                              >
                                {isSavingUser ? 'Desbloqueando...' : 'Desbloquear Ahora'}
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Estado de la Cuenta</label>
                              <select
                                value={editSubscriptionStatus}
                                onChange={e => setEditSubscriptionStatus(e.target.value)}
                                className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100"
                              >
                                <option value="ACTIVE">✅ Activo</option>
                                <option value="INACTIVE">⏸️ Inactivo (Pausa)</option>
                                <option value="BLOCKED">🚫 Bloqueado</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Fecha de Vencimiento</label>
                              <input
                                type="date"
                                value={editSubscriptionEndsAt}
                                onChange={e => setEditSubscriptionEndsAt(e.target.value)}
                                className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Límite de Mensajes (Mensual)</label>
                              <input
                                type="number"
                                min={1}
                                value={editMessageLimit}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditMessageLimit(val === '' ? '' : Number(val));
                                }}
                                className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Día de Corte</label>
                              <input
                                type="number"
                                min={1}
                                max={31}
                                value={editSubscriptionResetDay}
                                onChange={e => setEditSubscriptionResetDay(Number(e.target.value))}
                                className="w-full text-[13px] px-4 py-2.5 border border-zinc-200 rounded-2xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 transition-colors text-zinc-900 dark:text-zinc-100"
                              />
                              <p className="text-[10px] text-zinc-500 mt-1">Día del mes en que se reinicia el contador.</p>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 mb-4 block uppercase tracking-widest leading-none">Acciones de Extensión Rápida</label>
                            <div className="flex flex-wrap gap-3">
                              {[
                                { label: '+1 Mes', months: 1 },
                                { label: '+6 Meses', months: 6 },
                                { label: '+1 Año', years: 1 }
                              ].map((opt, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const d = new Date();
                                    if (opt.months) d.setMonth(d.getMonth() + opt.months);
                                    if (opt.years) d.setFullYear(d.getFullYear() + opt.years);
                                    setEditSubscriptionEndsAt(d.toISOString().split('T')[0]);
                                    setEditSubscriptionStatus('ACTIVE');
                                  }}
                                  className="px-4 py-2.5 text-[13px] font-bold rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-200 transition-all text-zinc-700 dark:text-zinc-300"
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setEditSubscriptionEndsAt('');
                                  setEditSubscriptionStatus('ACTIVE');
                                }}
                                className="px-4 py-2.5 text-[13px] font-bold rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 transition-all text-orange-700 dark:text-orange-400"
                              >
                                Acceso Permanente
                              </button>
                            </div>
                          </div>

                          <div className="pt-4 flex justify-end gap-3">
                            <button
                              onClick={handleSaveUser}
                              disabled={isSavingUser}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl text-[13px] font-bold flex items-center gap-2 transition shadow-lg shadow-orange-500/20 disabled:opacity-50"
                            >
                              {isSavingUser ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              Guardar Suscripción
                            </button>
                          </div>
                        </div>
                      )}

                      {activeEditSubTab === 'danger' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-[1.5rem] p-6">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-red-800 dark:text-red-400">Eliminación Definitiva</h3>
                                <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-1 leading-relaxed">
                                  Esta acción borrará permanentemente el proyecto, sus agentes, historial de chats y configuraciones. No se puede deshacer.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 pl-1">
                              Escribe <strong className="font-mono bg-white dark:bg-black px-2 py-0.5 rounded text-red-600 border border-red-200 dark:border-red-900">eliminar {selectedClient.name}</strong> para confirmar:
                            </p>
                            <input
                              type="text"
                              value={deleteConfirmText}
                              onChange={e => setDeleteConfirmText(e.target.value)}
                              placeholder={`eliminar ${selectedClient.name}`}
                              className="w-full text-[13px] px-5 py-4 border border-red-200 dark:border-red-900/50 rounded-2xl bg-white dark:bg-[#121214] outline-none focus:ring-2 focus:ring-red-500/30 text-zinc-900 dark:text-zinc-100 transition-all font-mono"
                            />
                            <button
                              onClick={handleDeleteUser}
                              disabled={deleteConfirmText !== `eliminar ${selectedClient.name}` || isDeleting}
                              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl text-[13px] font-bold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all"
                            >
                              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              Confirmar Eliminación Total
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* --- TAB: BOT BUILDER --- */}
                {activeTab === 'builder' && (
                  <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">

                    {/* PHASE: UPLOAD */}
                    {builderPhase === 'upload' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Sparkles size={20} className="text-orange-500" /> Bot Builder IA
                          </h3>
                          <p className="text-sm text-zinc-500 mt-1">La IA analizará la información y configurará el bot completo automáticamente.</p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                          <button
                            onClick={() => { setBuilderMode('file'); setBuilderUrl(''); }}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${builderMode === 'file'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}
                          >
                            <Database size={15} /> Documento
                          </button>
                          <button
                            onClick={() => { setBuilderMode('url'); setBuilderFile(null); }}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${builderMode === 'url'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}
                          >
                            <Globe size={15} /> Página Web
                          </button>
                        </div>

                        {/* FILE MODE */}
                        {builderMode === 'file' && (
                          <label
                            htmlFor="bot-builder-file-input"
                            onDragOver={(e) => { e.preventDefault(); setBuilderDragOver(true); }}
                            onDragLeave={() => setBuilderDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setBuilderDragOver(false);
                              const f = e.dataTransfer.files[0];
                              if (f) setBuilderFile(f);
                            }}
                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${builderDragOver
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                              : builderFile
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-950/10'
                              }`}
                          >
                            <input
                              id="bot-builder-file-input"
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) setBuilderFile(f); }}
                            />
                            {builderFile ? (
                              <div className="flex flex-col items-center gap-2 text-center px-4">
                                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                                  <CheckCircle2 size={24} className="text-emerald-600" />
                                </div>
                                <p className="font-bold text-zinc-900 dark:text-white text-sm">{builderFile.name}</p>
                                <p className="text-xs text-zinc-500">{(builderFile.size / 1024).toFixed(1)} KB — Click para cambiar</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-center px-4">
                                <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                                  <Database size={24} className="text-zinc-400" />
                                </div>
                                <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">Arrastra el documento aquí</p>
                                <p className="text-xs text-zinc-400">PDF · Word · Excel · TXT · CSV — máx. 15MB</p>
                              </div>
                            )}
                          </label>
                        )}

                        {/* URL MODE */}
                        {builderMode === 'url' && (
                          <div className="flex flex-col gap-3">
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                <Globe size={18} />
                              </div>
                              <input
                                type="url"
                                value={builderUrl}
                                onChange={(e) => setBuilderUrl(e.target.value)}
                                placeholder="https://ejemplo.com"
                                className="w-full pl-11 pr-4 py-4 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                              />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl px-4 py-3 flex items-start gap-3">
                              <Globe size={15} className="text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-700 dark:text-blue-400">
                                La IA leerá y analizará el contenido público de esa página. Funciona mejor con sitios estáticos o con SSR. Si el sitio usa React/Vue sin SSR, puede que el contenido sea limitado.
                              </p>
                            </div>
                          </div>
                        )}

                        {builderError && (
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-400">{builderError}</p>
                          </div>
                        )}

                        <button
                          disabled={builderMode === 'file' ? !builderFile : !builderUrl.trim()}
                          onClick={async () => {
                            if (!selectedClient) return;
                            setBuilderError(null);
                            setBuilderPhase('processing');
                            try {
                              if (builderMode === 'file') {
                                if (!builderFile) return;
                                setBuilderProcessingStep('Enviando documento a la IA...');
                                const fd = new FormData();
                                fd.append('file', builderFile);
                                const generated = await generateBotConfigFromFile(fd, selectedClient.name);
                                setBuilderGenerated(generated);
                              } else {
                                setBuilderProcessingStep('Analizando página web...');
                                const generated = await generateBotConfigFromUrl(builderUrl.trim(), selectedClient.name);
                                setBuilderGenerated(generated);
                              }
                              setBuilderPreviewTab('identity');
                              setBuilderPhase('preview');
                            } catch (err: any) {
                              setBuilderError(err.message || 'Error desconocido.');
                              setBuilderPhase('upload');
                            }
                          }}
                          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                        >
                          <Sparkles size={16} /> Generar Configuración del Bot
                        </button>
                      </div>
                    )}

                    {/* PHASE: PROCESSING */}
                    {builderPhase === 'processing' && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
                        <div className="relative">
                          <div className="h-20 w-20 rounded-full border-4 border-orange-100 dark:border-orange-900/30 flex items-center justify-center">
                            <Loader2 size={36} className="animate-spin text-orange-600" />
                          </div>
                          <div className="absolute -top-1 -right-1 h-6 w-6 bg-orange-600 rounded-full flex items-center justify-center">
                            <Sparkles size={12} className="text-white" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-zinc-900 dark:text-white text-lg">Procesando con IA</p>
                          <p className="text-sm text-zinc-500 mt-2 max-w-xs">{builderProcessingStep}</p>
                        </div>
                        <div className="flex flex-col gap-2 w-full max-w-xs">
                          {[
                            'Extrayendo texto del documento',
                            'Identificando datos del negocio',
                            'Generando identidad del bot',
                            'Creando knowledge base',
                            'Formulando FAQs',
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="h-4 w-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                                <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                              </div>
                              <span className="text-xs text-zinc-500">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PHASE: PREVIEW */}
                    {builderPhase === 'preview' && builderGenerated && (
                      <div className="flex flex-col gap-3 h-full min-h-0">
                        <div className="flex items-center justify-between shrink-0">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              <CheckCircle2 size={18} className="text-emerald-500" /> Configuración generada
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">Revisa y edita cada campo antes de guardar.</p>
                          </div>
                          <button
                            onClick={() => { setBuilderPhase('upload'); setBuilderFile(null); setBuilderGenerated(null); }}
                            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                          >
                            <RefreshCw size={12} /> Nuevo archivo
                          </button>
                        </div>

                        {/* Preview Tabs */}
                        <div className="flex items-center overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl shrink-0">
                          {([
                            { id: 'identity', label: 'Identidad', icon: <User size={13} /> },
                            { id: 'instructions', label: 'Instrucciones', icon: <Edit3 size={13} /> },
                            { id: 'knowledge', label: 'Knowledge', icon: <Database size={13} /> },
                            { id: 'faq', label: 'FAQs', icon: <HelpCircle size={13} /> },
                            { id: 'handoff', label: 'Handoff', icon: <User size={13} /> },
                            { id: 'scoring', label: 'Scoring', icon: <Cpu size={13} /> },
                          ] as const).map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setBuilderPreviewTab(tab.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${builderPreviewTab === tab.id
                                ? 'bg-white dark:bg-zinc-900 text-orange-600 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                            >
                              {tab.icon} {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Editable content */}
                        <div className="flex-1 min-h-0">
                          {builderPreviewTab === 'identity' && (
                            <textarea
                              value={builderGenerated.identity}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, identity: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                            />
                          )}
                          {builderPreviewTab === 'instructions' && (
                            <textarea
                              value={builderGenerated.instructions}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, instructions: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                            />
                          )}
                          {builderPreviewTab === 'knowledge' && (
                            <textarea
                              value={builderGenerated.knowledgeRaw}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, knowledgeRaw: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                            />
                          )}
                          {builderPreviewTab === 'faq' && (
                            <textarea
                              value={builderGenerated.faq}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, faq: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                            />
                          )}
                          {builderPreviewTab === 'handoff' && (
                            <textarea
                              value={builderGenerated.handoffRules}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, handoffRules: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                            />
                          )}
                          {builderPreviewTab === 'scoring' && (
                            <textarea
                              value={builderGenerated.leadScoringRules}
                              onChange={(e) => setBuilderGenerated({ ...builderGenerated, leadScoringRules: e.target.value })}
                              className="w-full h-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed"
                              placeholder='[{"condition": "...", "score": 10}]'
                            />
                          )}
                        </div>

                        {/* Save button */}
                        <div className="shrink-0 flex gap-3 pt-1">
                          <button
                            disabled={isSavingBuilder}
                            onClick={async () => {
                              if (!builderGenerated || !selectedClient) return;
                              const project = selectedClient.projects?.[0];
                              const agentId = project?.agents?.[0]?.id;
                              if (!agentId) { alert('El cliente no tiene agente configurado.'); return; }
                              setIsSavingBuilder(true);
                              try {
                                // Compile knowledge to JSON too
                                let knowledgeJson = '{}';
                                try { knowledgeJson = await compileKnowledgeWithAI(builderGenerated.knowledgeRaw); } catch { }

                                await saveAgentConfig(
                                  agentId,
                                  selectedClient.name + ' Bot',
                                  'Configurado por Bot Builder',
                                  builderGenerated.identity,
                                  builderGenerated.instructions,
                                  knowledgeJson,
                                  builderGenerated.knowledgeRaw,
                                  builderGenerated.faq,
                                  builderGenerated.leadScoringRules,
                                );

                                // Also save handoffRules via updateBotConfig
                                await updateBotConfig(project.id, {
                                  handoffRules: builderGenerated.handoffRules,
                                });

                                // Refresh client
                                const data = await getClients();
                                setClients(data);
                                const updated = data.find((c: any) => c.id === selectedClient.id);
                                if (updated) {
                                  setSelectedClient(updated);
                                  // Sync configData
                                  const ag = updated.projects?.[0]?.agents?.[0] || {};
                                  setConfigData((prev: any) => ({
                                    ...prev,
                                    identity: ag.identity || '',
                                    instructions: ag.instructions || '',
                                    knowledgeData: ag.knowledgeData || '',
                                    knowledgeRaw: ag.knowledgeRaw || '',
                                    faq: ag.faq || '',
                                    handoffRules: ag.handoffRules || '',
                                    leadScoringRules: ag.leadScoringRules || '',
                                  }));
                                }

                                alert('Bot configurado exitosamente. Puedes revisarlo en la tab "Bot Config".');
                                setActiveTab('bot');
                                setActiveBotSubTab('identity');
                              } catch (err: any) {
                                alert('Error al guardar: ' + err.message);
                              } finally {
                                setIsSavingBuilder(false);
                              }
                            }}
                            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                          >
                            {isSavingBuilder ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSavingBuilder ? 'Guardando...' : 'Guardar en Bot Config'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB: BOT CONFIG --- */}
                {activeTab === 'bot' && (
                  <div className="max-w-4xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Configuración del Agente</h3>
                        <p className="text-sm text-zinc-500">Credenciales Meta y reglas de inteligencia artificial.</p>
                      </div>
                      <button
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
                      >
                        {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Configuración
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl shrink-0">
                        <div className="flex items-center gap-1">
                          {[
                            { id: 'api', label: 'Keys', icon: <Key size={14} /> },
                            { id: 'identity', label: 'Identidad', icon: <User size={14} /> },
                            { id: 'instructions', label: 'Instrucciones', icon: <Edit3 size={14} /> },
                            { id: 'handoff', label: 'Handoff', icon: <User size={14} /> },
                            { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={14} /> },
                            { id: 'faq', label: 'FAQs', icon: <HelpCircle size={14} /> },
                            { id: 'scoring', label: 'Scoring', icon: <Cpu size={14} /> },
                          ].map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setActiveBotSubTab(sub.id as any)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeBotSubTab === sub.id ? 'bg-white dark:bg-zinc-900 text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                              {sub.icon} {sub.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm h-[320px] flex flex-col overflow-hidden">
                        {activeBotSubTab === 'api' && (
                          <div className="space-y-4 animate-in fade-in duration-200 overflow-y-auto pr-2">
                            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                              <div>
                                <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Respuesta Automática del Bot</h4>
                                <p className="text-[11px] text-zinc-500 mt-0.5">Si está apagado, los mensajes nuevos requerirán atención humana.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={configData.defaultBotActive ?? false}
                                  onChange={e => {
                                    if (window.confirm(`¿Estás seguro de que quieres ${e.target.checked ? 'activar' : 'desactivar'} el bot por defecto para este usuario?`)) {
                                      setConfigData({ ...configData, defaultBotActive: e.target.checked })
                                    }
                                  }}
                                />
                                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                              <div>
                                <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Auto-Reactivación (Horas)</h4>
                                <p className="text-[11px] text-zinc-500 mt-0.5">Horas de inactividad antes de que el bot se encienda solo. (0 o vacío = Nunca)</p>
                              </div>
                              <input
                                type="number"
                                min="0"
                                placeholder="Ej: 2"
                                className="w-20 text-[13px] px-3 py-2 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono text-center"
                                value={configData.botAutoWakeHours || ''}
                                onChange={e => {
                                  const val = e.target.value ? parseInt(e.target.value) : null;
                                  setConfigData({ ...configData, botAutoWakeHours: val })
                                }}
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                                <Key size={14} /> Credenciales Meta (WhatsApp API)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase tracking-widest leading-none">Phone Number ID</label>
                                  <input value={configData.whatsappPhoneId} onChange={e => setConfigData({ ...configData, whatsappPhoneId: e.target.value })} className="w-full text-[13px] px-3 py-2 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase tracking-widest leading-none">Business Account ID</label>
                                  <input placeholder="Opcional" value={configData.whatsappBusinessId} onChange={e => setConfigData({ ...configData, whatsappBusinessId: e.target.value })} className="w-full text-[13px] px-3 py-2 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase tracking-widest leading-none">System User Token</label>
                                  <textarea rows={3} placeholder="Opcional" value={configData.whatsappToken} onChange={e => setConfigData({ ...configData, whatsappToken: e.target.value })} className="w-full text-[12px] px-3 py-2 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono resize-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeBotSubTab === 'identity' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Identidad (Rol, Tono, Nombre)</label>
                            <textarea value={configData.identity} onChange={e => setConfigData({ ...configData, identity: e.target.value })} className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed" placeholder="Ej: Eres un asistente experto en ventas..." />
                          </div>
                        )}

                        {activeBotSubTab === 'instructions' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Instrucciones Estrictas (System Prompt)</label>
                            <textarea value={configData.instructions} onChange={e => setConfigData({ ...configData, instructions: e.target.value })} className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed" placeholder="Instrucciones específicas para este bot..." />
                          </div>
                        )}

                        {activeBotSubTab === 'handoff' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">Reglas de Handoff (Transferencia a Humano)</label>
                            <p className="text-[11px] text-zinc-500 mb-2">Define cuándo y cómo el bot debe transferir la conversación a un asesor. Si lo dejas vacío, no transferirá proactivamente.</p>
                            <textarea value={configData.handoffRules} onChange={e => setConfigData({ ...configData, handoffRules: e.target.value })} className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed" placeholder="Ej: 1. Si el cliente pide hablar con alguien, pregúntale si quiere que lo transfiera... 2. Si dice que sí, pon [ACTION: HANDOFF]." />
                          </div>
                        )}

                        {activeBotSubTab === 'knowledge' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 shrink-0">
                              <label className="text-[10px] font-bold text-zinc-500 block uppercase tracking-widest leading-none">Data Base (Precios, Info, etc.)</label>
                              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                                <button onClick={() => setIsDevMode(false)} className={`px-4 py-1 flex items-center gap-1.5 text-xs font-medium rounded-md transition-all ${!isDevMode ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" : "text-zinc-500"}`}><BookOpen size={12} /> Natural</button>
                                <button onClick={() => setIsDevMode(true)} className={`px-4 py-1 flex items-center gap-1.5 text-xs font-medium rounded-md transition-all ${isDevMode ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5" : "text-zinc-500"}`}><Code size={12} /> JSON</button>
                              </div>
                            </div>
                            {!isDevMode ? (
                              <>
                                <textarea value={configData.knowledgeRaw || ''} onChange={e => setConfigData({ ...configData, knowledgeRaw: e.target.value })} placeholder="Ej: Tenemos un restaurante llamado 'Bella Italia'..." className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed" />
                                <div className="mt-3 flex flex-col md:flex-row items-center justify-between gap-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-3 rounded-2xl shrink-0">
                                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 flex items-center gap-2"><Sparkles size={14} className="text-orange-600 dark:text-orange-400" /> Procesador inteligente a JSON.</p>
                                  <div className="flex items-center gap-3">
                                    {compileStatus === 'success' && (
                                      <p className="text-[11px] text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 animate-bounce">
                                        <CheckCircle2 size={14} /> ¡Estructurado!
                                      </p>
                                    )}
                                    <button
                                      onClick={async () => {
                                        setIsCompiling(true); setCompileStatus(null);
                                        try {
                                          const json = await compileKnowledgeWithAI(configData.knowledgeRaw || '');
                                          setConfigData({ ...configData, knowledgeData: json });
                                          setCompileStatus("success");
                                          setTimeout(() => setCompileStatus(null), 4000);
                                        } catch {
                                          setCompileStatus("error");
                                        }
                                        setIsCompiling(false);
                                      }}
                                      disabled={isCompiling || !configData.knowledgeRaw?.trim()}
                                      className="px-4 py-2 text-[11px] font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                                    >
                                      {isCompiling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                      {isCompiling ? "Analizando..." : "Sincronizar"}
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <textarea value={configData.knowledgeData || ''} onChange={e => setConfigData({ ...configData, knowledgeData: e.target.value })} className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-green-600 dark:text-green-500 resize-none font-mono leading-relaxed whitespace-pre shadow-inner" placeholder="Aquí va toda la información técnica..." />
                            )}
                          </div>
                        )}

                        {activeBotSubTab === 'faq' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-widest leading-none">FAQs (Preguntas Frecuentes)</label>
                            <textarea value={configData.faq} onChange={e => setConfigData({ ...configData, faq: e.target.value })} className="flex-1 w-full text-[13px] px-4 py-3 border border-zinc-200 rounded-2xl dark:bg-[#121416] dark:border-zinc-800 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 resize-none font-mono leading-relaxed" placeholder="Preguntas y respuestas textuales..." />
                          </div>
                        )}

                        {activeBotSubTab === 'scoring' && (
                          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200 overflow-y-auto pr-2">
                            <div className="flex items-center justify-between mb-4 bg-orange-50 dark:bg-orange-950/20 px-4 py-3 rounded-2xl border border-orange-100 dark:border-orange-900/30 shrink-0">
                              <div>
                                <h4 className="font-bold text-orange-800 dark:text-orange-400 text-sm">Sistema de Puntuación</h4>
                                <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80">Activa el heatmap para calificar leads.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={configData.leadScoringEnabled}
                                  onChange={e => setConfigData({ ...configData, leadScoringEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                              </label>
                            </div>

                            <div className={`flex flex-col gap-3 transition-opacity ${!configData.leadScoringEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                              <label className="text-[10px] font-bold text-zinc-500 block uppercase tracking-widest leading-none mb-1">Reglas ({scoringRulesList.length})</label>

                              {scoringRulesList.map((rule, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-800/30 p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                  <div className="flex-1 space-y-2">
                                    <input
                                      type="text"
                                      value={rule.condition}
                                      onChange={e => {
                                        const newList = [...scoringRulesList];
                                        newList[idx].condition = e.target.value;
                                        setScoringRulesList(newList);
                                      }}
                                      placeholder="Si el cliente pregunta por precios..."
                                      className="w-full text-[13px] px-3 py-2 border border-zinc-200 rounded-lg dark:bg-[#121416] dark:border-zinc-700 outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100"
                                    />
                                  </div>
                                  <div className="w-24 shrink-0 flex items-center gap-1">
                                    <span className="text-zinc-400 font-bold px-1">+</span>
                                    <input
                                      type="number"
                                      value={rule.score || ''}
                                      max={100}
                                      onChange={e => {
                                        const newList = [...scoringRulesList];
                                        newList[idx].score = parseInt(e.target.value) || 0;
                                        setScoringRulesList(newList);
                                      }}
                                      placeholder="Puntos"
                                      className="w-full text-center text-[13px] px-2 py-2 border border-zinc-200 rounded-lg dark:bg-[#121416] dark:border-zinc-700 outline-none focus:border-orange-500 text-emerald-600 dark:text-emerald-400 font-bold"
                                    />
                                  </div>
                                  <button onClick={() => setScoringRulesList(scoringRulesList.filter((_, i) => i !== idx))} className="shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-0.5">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}

                              {scoringRulesList.length === 0 && (
                                <p className="text-xs text-zinc-500 italic text-center py-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">No hay reglas configuradas. La IA no sumará puntos todavía.</p>
                              )}

                              <button
                                onClick={() => setScoringRulesList([...scoringRulesList, { condition: '', score: 10 }])}
                                className="w-full py-2.5 mt-2 border border-dashed border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                              >
                                <Plus size={14} /> Añadir Regla de Puntuación
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: USAGE / CONSUMO --- */}
                {activeTab === 'testing' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Testing Automático del Bot</h3>
                        <p className="text-zinc-500 text-sm mt-1">Evalúa cómo responde tu bot frente a clientes simulados (MVP).</p>
                      </div>
                      <button
                        onClick={handleRunTest}
                        disabled={isTesting}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                        {isTesting ? 'Corriendo Tests...' : 'Correr 5 Tests'}
                      </button>
                    </div>

                    {isTesting && (
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4 py-12">
                        <Loader2 size={36} className="text-orange-600 animate-spin" />
                        <div className="text-center">
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 text-lg">Ejecutando suite de pruebas...</p>
                          <p className="text-zinc-500 text-sm mt-1 font-semibold text-orange-600 dark:text-orange-400">{testProgress}</p>
                        </div>
                      </div>
                    )}

                    {testData && (
                      <div className="space-y-6 mt-6">

                        {/* Resumen de Evaluación */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
                            <p className="text-sm text-zinc-500 mb-1">Score Promedio</p>
                            <p className={`text-3xl font-black ${testData.averageScore >= 8 ? 'text-green-500' : testData.averageScore >= 6 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {(testData.averageScore || 0).toFixed(1)} <span className="text-lg text-zinc-400">/ 10</span>
                            </p>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
                            <p className="text-sm text-zinc-500 mb-1">Issues Críticos</p>
                            <p className={`text-3xl font-black ${testData.criticalIssues > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {testData.criticalIssues}
                            </p>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
                            <p className="text-sm text-zinc-500 mb-1">Conversaciones</p>
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">
                              {testData.results?.length || 0}
                            </p>
                          </div>
                        </div>

                        {/* Mejoras Sugeridas */}
                        {testData.suggestedImprovements && testData.suggestedImprovements.suggested_changes?.length > 0 && (
                          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
                            <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-2">
                              <Sparkles size={18} />
                              Sugerencias de Mejora (IA)
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-200 mb-4">{testData.suggestedImprovements.summary}</p>
                            <ul className="space-y-3">
                              {testData.suggestedImprovements.suggested_changes.map((change: any, i: number) => (
                                <li key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-orange-100 dark:border-zinc-800 text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${change.priority === 'high' ? 'bg-red-100 text-red-700' : change.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {change.priority}
                                    </span>
                                    <span className="font-semibold text-zinc-900 dark:text-white">{change.change_type.toUpperCase()}</span>
                                  </div>
                                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">{change.problem_addressed}</p>
                                  <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded text-xs font-mono text-zinc-800 dark:text-zinc-300">
                                    + {change.specific_text_to_add}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <h4 className="font-bold text-lg text-zinc-900 dark:text-white pt-4">Detalle de Conversaciones</h4>
                        <div className="space-y-6">
                          {testData.results?.map((resItem: any, idx: number) => {
                            const res = resItem.conversation;
                            const ev = resItem.evaluation;
                            return (
                              <div key={idx} className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                                  <div>
                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg uppercase tracking-wider">Test {idx + 1}</span>
                                    <h5 className="font-bold text-zinc-900 dark:text-white mt-2">Perfil: {res.profile}</h5>
                                    <p className="text-sm text-zinc-500">Intención: {res.intent}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-xl font-black ${ev?.overall_score >= 8 ? 'text-green-500' : ev?.overall_score >= 6 ? 'text-yellow-500' : 'text-red-500'}`}>
                                      {ev?.overall_score || 0}/10
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1 max-w-[200px] truncate" title={ev?.summary}>{ev?.summary}</p>
                                  </div>
                                </div>

                                {ev?.critical_issues?.length > 0 && (
                                  <div className="mb-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl">
                                    <h6 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 uppercase">Issues Detectados</h6>
                                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                                      {ev.critical_issues.map((iss: any, i: number) => (
                                        <li key={i}>Turno {iss.turn}: {iss.issue}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="space-y-4 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800">
                                  {res.turns.map((turn: any, tIdx: number) => (
                                    <div key={tIdx} className="space-y-2">
                                      <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cliente Simulado</span>
                                        <div className="bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-zinc-800 dark:text-zinc-200 max-w-[85%]">
                                          {turn.client_said}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mr-1">Bot</span>
                                        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-orange-900 dark:text-orange-100 max-w-[85%] text-right whitespace-pre-wrap">
                                          {turn.bot_responded || <span className="italic opacity-50">Sin respuesta / Error</span>}
                                        </div>
                                        {turn.metadata?.isHandoff && (
                                          <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full mt-1">HANDOFF TRIGGERED</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
