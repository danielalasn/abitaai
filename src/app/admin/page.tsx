'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Plus, Settings, ChevronRight, Save } from 'lucide-react';
import { getClients, createClient, updateBotConfig } from '@/app/actions/admin';

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

  // Edit Config state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [configData, setConfigData] = useState<any>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.email !== 'info@abitaai.com') {
        router.push('/'); // Si no es admin, fuera al dashboard normal
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
      loadClients(); // refrescar
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (session?.user?.email !== 'info@abitaai.com') {
    return null; // Prevents flashing content
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Lista de Usuarios */}
      <div className="col-span-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users size={20} /> Usuarios
          </h2>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 transition"
          >
            <Plus size={16} />
          </button>
        </div>

        {showCreate && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
            <h3 className="font-medium text-sm mb-4 text-zinc-900 dark:text-white">Nuevo Cliente</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1 block">Nombre</label>
                <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1 block">Correo (Email)</label>
                <input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1 block">Contraseña Temporal</label>
                <input required type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <button disabled={isCreating} type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium flex justify-center mt-2">
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedClient?.id === client.id 
                ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50' 
                : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{client.name}</div>
                <div className="text-xs text-zinc-500">{client.email}</div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          ))}
          {clients.length === 0 && <div className="text-sm text-zinc-500 p-4">No hay clientes creados.</div>}
        </div>
      </div>

      {/* Columna Derecha: Configuración del Bot */}
      <div className="col-span-2">
        {selectedClient ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                   <Settings size={22} className="text-purple-500" /> 
                   Configuración del Bot
                </h2>
                <p className="text-sm text-zinc-500">Editando parámetros para: <strong className="text-zinc-800 dark:text-zinc-200">{selectedClient.name}</strong></p>
              </div>
              <button 
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-sm font-medium flex items-center gap-2 transition"
              >
                {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Cambios
              </button>
            </div>

            <div className="space-y-8">
              {/* WhatsApp Config */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white uppercase text-xs tracking-widest text-zinc-400">Credenciales Meta (WhatsApp API)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Phone Number ID</label>
                    <input value={configData.whatsappPhoneId} onChange={e => setConfigData({...configData, whatsappPhoneId: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Business Account ID</label>
                    <input value={configData.whatsappBusinessId} onChange={e => setConfigData({...configData, whatsappBusinessId: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">System User Token (Permanent)</label>
                    <input type="password" value={configData.whatsappToken} onChange={e => setConfigData({...configData, whatsappToken: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* Bot Identity & Rules */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white uppercase text-xs tracking-widest text-zinc-400">Prompt & Knowledge del Agente AI</h3>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">Identidad (Rol, Tono, Nombre)</label>
                  <textarea rows={3} value={configData.identity} onChange={e => setConfigData({...configData, identity: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500 custom-scrollbar" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">Instrucciones Estrictas</label>
                  <textarea rows={4} value={configData.instructions} onChange={e => setConfigData({...configData, instructions: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500 custom-scrollbar" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">Data Base (Precios, Info, etc.)</label>
                  <textarea rows={6} value={configData.knowledgeData} onChange={e => setConfigData({...configData, knowledgeData: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500 custom-scrollbar whitespace-pre-wrap" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">FAQs (Preguntas Frecuentes)</label>
                  <textarea rows={4} value={configData.faq} onChange={e => setConfigData({...configData, faq: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500 custom-scrollbar" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">Reglas de Calificación (Scoring)</label>
                  <textarea rows={3} value={configData.leadScoringRules} onChange={e => setConfigData({...configData, leadScoringRules: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-xl dark:bg-[#121214] dark:border-zinc-700 outline-none focus:border-purple-500 custom-scrollbar" placeholder="Ej: +10 si pregunta precio, -5 si es estudiante" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400">
            <Settings size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Selecciona un cliente para editar su bot</p>
          </div>
        )}
      </div>
    </div>
  );
}
