'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Plus, Settings, ChevronRight, Save, X, Edit3, Trash2, LayoutDashboard, Calendar, MessageSquare, Megaphone, AlertTriangle, Bot, User, Clock, LogOut } from 'lucide-react';
import { getClients, createClient, updateBotConfig, updateClient, deleteClient } from '@/app/actions/admin';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create User state
  const [showCreate, setShowCreate] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal / Tab state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'edit' | 'bot'>('dashboard');

  // Edit Config state
  const [configData, setConfigData] = useState<any>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Edit User state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  
  // Delete User state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.email !== 'info@abitaai.com') {
        router.push('/'); 
      } else {
        loadClients();
      }
    }
  }, [status, session, router]);

  const loadClients = async () => {
    setIsLoading(true);
    const data = await getClients();
    setClients(data);
    setIsLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) return;
    
    setIsCreating(true);
    try {
      await createClient({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setShowCreate(false);
      loadClients();
      alert('Usuario creado con éxito');
    } catch (err: any) {
      alert('Error al crear usuario: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setActiveTab('dashboard');
    
    // Init Edit tab
    setEditName(client.name);
    setEditEmail(client.email);
    setEditPassword(''); // Leave blank unless they want to change it
    setDeleteConfirmText('');

    // Init Bot Config tab
    const project = client.projects?.[0];
    const initialConfig = project?.botConfig || {};
    setConfigData({
      identity: initialConfig.identity || '',
      instructions: initialConfig.instructions || '',
      knowledgeData: initialConfig.knowledgeData || '',
      knowledgeRaw: initialConfig.knowledgeRaw || '',
      faq: initialConfig.faq || '',
      leadScoringRules: initialConfig.leadScoringRules || '',
      whatsappToken: initialConfig.whatsappToken || '',
      whatsappPhoneId: initialConfig.whatsappPhoneId || '',
      whatsappBusinessId: initialConfig.whatsappBusinessId || '',
    });
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
      await updateBotConfig(project.id, configData);
      alert('Configuración guardada exitosamente');
      loadClients();
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
        password: editPassword || undefined
      });
      alert('Usuario actualizado');
      const updatedList = await getClients();
      setClients(updatedList);
      // Actualizar el selectedClient
      const updatedClient = updatedList.find(c => c.id === selectedClient.id);
      setSelectedClient(updatedClient);
      setEditPassword('');
    } catch(err: any) {
      alert('Error al actualizar usuario: ' + err.message);
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (session?.user?.email !== 'info@abitaai.com') {
    return null; 
  }

  return (
    <div className="space-y-8">
      {/* HEADER & Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-purple-600" /> Gestionar Clientes
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Visualiza y administra todas las cuentas de la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium tracking-wide shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Crear Nuevo Cliente</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Nombre Completo</label>
                  <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ej: Automotriz S.A." className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Correo Electrónico</label>
                  <input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="contacto@empresa.com" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Contraseña Temporal</label>
                  <input required type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Escribe una contraseña segura" className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 text-zinc-900 dark:text-zinc-100" />
                </div>
                <button disabled={isCreating} type="submit" className="w-full py-3 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 mt-4 transition-all">
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : 'Registrar Cliente'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {clients.map(client => {
          const project = client.projects?.[0];
          const leadsCount = project?._count?.leads || 0;
          const campCount = project?._count?.campaigns || 0;
          
          return (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-left hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users size={80} />
              </div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center font-bold text-xl mb-4">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white line-clamp-1">{client.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{client.email}</p>
                <div className="flex items-center gap-1.5 mt-2 mb-6">
                  <div className={`h-1.5 w-1.5 rounded-full ${project?.lastUseAt ? 'bg-green-500' : 'bg-zinc-300'}`} />
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    Último uso: {formatRelativeDate(project?.lastUseAt)}
                  </span>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Leads Totales</span>
                     <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{leadsCount}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Campañas</span>
                     <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{campCount}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Respuestas Bot</span>
                     <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{project?.botMessagesCount || 0}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Contactos Nosotros</span>
                     <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{project?.agentMessagesCount || 0}</span>
                   </div>
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
          <div className="bg-zinc-50 dark:bg-[#09090b] w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {selectedClient.name}
                </h2>
                <div className="text-sm text-zinc-500 font-medium mt-1 flex items-center gap-2">
                  <span>{selectedClient.email}</span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Creado: {new Date(selectedClient.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <Clock size={14} /> Último uso: {formatRelativeDate(selectedClient.projects?.[0]?.lastUseAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('edit')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'edit' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Edit3 size={18} />
                  Editar Usuario
                </button>
                <button 
                  onClick={() => setActiveTab('bot')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'bot' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Settings size={18} />
                  Bot Config
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                
                {/* --- TAB: DASHBOARD --- */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Métricas Generales</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Fila 1: Leads y Campañas */}
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                           <MessageSquare size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Leads</p>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                            {selectedClient.projects?.[0]?._count?.leads || 0}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="h-14 w-14 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                           <Megaphone size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Campañas</p>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                            {selectedClient.projects?.[0]?._count?.campaigns || 0}
                          </p>
                        </div>
                      </div>
                      
                      {/* Fila 2: Mensajes Bot y Contactos Nosotros */}
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                           <Bot size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mensajes Bot</p>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                            {selectedClient.projects?.[0]?.botMessagesCount || 0}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="h-14 w-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl flex items-center justify-center">
                           <User size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Contactos Nosotros</p>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                            {selectedClient.projects?.[0]?.agentMessagesCount || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB: EDIT USER --- */}
                {activeTab === 'edit' && (
                  <div className="max-w-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Información de la Cuenta</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Nombre Completo</label>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Correo Electrónico</label>
                          <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase tracking-widest">Restablecer Contraseña (Opcional)</label>
                          <input type="text" placeholder="Dejar en blanco si no se desea cambiar" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 transition-colors text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button 
                            onClick={handleSaveUser}
                            disabled={isSavingUser}
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                          >
                            {isSavingUser ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-500/5 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-10 w-10 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center shrink-0">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-700 dark:text-red-400">Eliminar Cliente</h3>
                          <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Esta acción es irreversible. Se eliminará el proyecto, historial de chats, configuraciones y todos los datos asociados.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-2">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          Escribe <strong className="font-mono bg-white dark:bg-black px-2 py-0.5 rounded text-red-600 border border-red-200 dark:border-red-900">eliminar {selectedClient.name}</strong> para confirmar:
                        </p>
                        <input 
                          type="text" 
                          value={deleteConfirmText}
                          onChange={e => setDeleteConfirmText(e.target.value)}
                          placeholder={`eliminar ${selectedClient.name}`}
                          className="w-full text-sm px-4 py-3 border border-red-300 dark:border-red-900/80 rounded-xl bg-white dark:bg-[#121214] outline-none focus:ring-2 focus:ring-red-500/50 text-zinc-900 dark:text-zinc-100" 
                        />
                        <button 
                          onClick={handleDeleteUser}
                          disabled={deleteConfirmText !== `eliminar ${selectedClient.name}` || isDeleting}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
                        >
                          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          Eliminar Cuentas de este Usuario
                        </button>
                      </div>
                    </div>

                  </div>
                )}


                {/* --- TAB: BOT CONFIG --- */}
                {activeTab === 'bot' && (
                  <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Configuración del Agente</h3>
                        <p className="text-sm text-zinc-500">Credenciales Meta y reglas de inteligencia artificial.</p>
                      </div>
                      <button 
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
                      >
                        {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Configuración
                      </button>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-10">
                      
                      <div className="space-y-4">
                        <h4 className="font-bold text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">Credenciales Meta (WhatsApp API)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Phone Number ID</label>
                            <input value={configData.whatsappPhoneId} onChange={e => setConfigData({...configData, whatsappPhoneId: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Business Account ID</label>
                            <input value={configData.whatsappBusinessId} onChange={e => setConfigData({...configData, whatsappBusinessId: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-zinc-500 mb-1.5 block">System User Token (Permanent)</label>
                            <input type="password" value={configData.whatsappToken} onChange={e => setConfigData({...configData, whatsappToken: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <h4 className="font-bold text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">Cerebro del Agente</h4>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Identidad (Rol, Tono, Nombre)</label>
                          <textarea rows={3} value={configData.identity} onChange={e => setConfigData({...configData, identity: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Instrucciones Estrictas</label>
                          <textarea rows={4} value={configData.instructions} onChange={e => setConfigData({...configData, instructions: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Data Base (Precios, Info, etc.)</label>
                          <textarea rows={6} value={configData.knowledgeData} onChange={e => setConfigData({...configData, knowledgeData: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1.5 block">FAQs (Preguntas Frecuentes)</label>
                          <textarea rows={4} value={configData.faq} onChange={e => setConfigData({...configData, faq: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Reglas de Calificación (Scoring)</label>
                          <textarea rows={3} value={configData.leadScoringRules} onChange={e => setConfigData({...configData, leadScoringRules: e.target.value})} className="w-full text-sm px-4 py-3 border border-zinc-200 rounded-xl dark:bg-[#121214] dark:border-zinc-800 outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100" placeholder="Ej: +10 si pregunta precio, -5 si es estudiante" />
                        </div>
                      </div>
                    </div>
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
