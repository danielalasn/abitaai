'use client';

import { useState, useEffect } from 'react';
import { Megaphone, UploadCloud, Users, FileText, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { createCampaign, getCampaigns } from '@/app/actions/campaigns';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const data = await getCampaigns();
    setCampaigns(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;

        // Carga el parseador de CSV dinámicamente solo en el cliente
        const { parse } = await import('csv-parse/sync');

        // Soportar comas y punto y comas (Excel en español)
        const records = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          delimiter: [',', ';'],
          bom: true // Ignorar caracteres invisibles al inicio del archivo (BOM)
        });

        if (records.length === 0) {
          alert("El archivo está vacío o no se reconocen los datos.");
          return;
        }

        // Obtener las columnas reales encontradas en la primera fila
        const firstRecord = records[0] as Record<string, any>;
        const headers = Object.keys(firstRecord);

        // Validar que la columna "#" exista obligatoriamente
        if (!headers.includes('#')) {
          alert('❌ Falta la columna "#": Revisa tu archivo y asegúrate de que la primera fila tenga exactamente el título "#" (sin comillas) en la columna de los teléfonos.\n\nColumnas detectadas: ' + headers.join(', '));
          return;
        }

        setAvailableColumns(headers);

        // Limpiar los objetos para que tengan solo las keys que importan
        const leads = records.map((record: any) => {
          const cleanLead: any = {};
          for (const h of headers) {
            cleanLead[h] = record[h];
          }
          return cleanLead;
        });

        setParsedLeads(leads);
      } catch (error: any) {
        alert("Error al leer el archivo CSV: " + error.message);
        console.error(error);
      } finally {
        setIsUploading(false);
        // Limpiamos el input para que pueda volver a subir el mismo archivo si lo corrigió
        e.target.value = '';
      }
    };

    // Leemos el archivo.
    reader.readAsText(file, "UTF-8");
  };

  const insertVariable = (variableName: string) => {
    const tag = `@${variableName}`;
    setTemplateMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + tag + ' ');
  };

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim() || !templateMessage.trim() || parsedLeads.length === 0) return;

    // Validar que las variables usadas en el texto realmente existen en las columnas del archivo
    const usedVariables = templateMessage.match(/@(\w+)/g) || [];
    const missingVariables = usedVariables
      .map(v => v.substring(1)) // quita el @
      .filter(v => !availableColumns.includes(v));

    if (missingVariables.length > 0) {
      alert(`⚠️ Variables inválidas detectadas:\n\nEstás intentando usar variables que no existen en tu archivo Excel: ${missingVariables.map(v => `"@${v}"`).join(', ')}.\n\nPor favor usa únicamente los botones morados de arriba o corrige tu texto.`);
      return; // Detener el envío
    }

    setIsSending(true);
    setSuccessStatus(null);
    try {
      await createCampaign(campaignName, templateMessage, parsedLeads);
      setSuccessStatus("¡Campaña iniciada de forma exitosa!");

      // Limpiar formulario
      setCampaignName('');
      setTemplateMessage('');
      setParsedLeads([]);
      setAvailableColumns([]);

      // Recargar lista después de un momento
      setTimeout(() => loadCampaigns(), 1000);

    } catch (error: any) {
      alert("No se pudo iniciar la campaña: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-[#09090b] overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Campañas de Difusión
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">

          {/* LADO IZQUIERDO: FORMULARIO CREAR CAMPAÑA */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-5">Nueva Campaña</h2>

              {successStatus && (
                <div className="mb-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
                  <CheckCircle2 size={18} />
                  {successStatus}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nombre de la Campaña</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ej. Promoción Verano 2026"
                    className="w-full bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Archivo de Leads (Excel / CSV)</label>

                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${parsedLeads.length > 0 ? 'border-purple-300 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-900/10' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                    {parsedLeads.length > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Users size={24} />
                        </div>
                        <p className="text-zinc-900 dark:text-zinc-100 font-medium">¡Identificamos {parsedLeads.length} leads!</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Listos para recibir la campaña.</p>
                        <button onClick={() => { setParsedLeads([]); setAvailableColumns([]); }} className="mt-2 text-xs text-red-500 hover:underline">Eliminar lista</button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                            {isUploading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                          </div>
                          <div>
                            <p className="text-zinc-700 dark:text-zinc-300 font-medium"><span className="text-purple-600 dark:text-purple-400">Sube tu archivo .csv</span> o arrástralo</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Debe incluir obligatoriamente la columna <span className="font-bold">#</span></p>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex justify-between items-center">
                    Mensaje Dinámico
                    <span className="text-xs text-zinc-400 font-normal">Este mensaje iniciará la conversación</span>
                  </label>

                  {/* Pill Variables Selector */}
                  {availableColumns.length > 0 && (
                    <div className="mb-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-zinc-500 font-medium mr-1 tracking-wide uppercase">Insertar variable:</span>
                      {availableColumns.filter(col => col !== '#').map(col => (
                        <button
                          key={col}
                          onClick={() => insertVariable(col)}
                          className="text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
                        >
                          @{col}
                        </button>
                      ))}
                      {availableColumns.filter(col => col !== '#').length === 0 && (
                        <span className="text-xs text-zinc-400 italic">El archivo no tiene columnas extras.</span>
                      )}
                    </div>
                  )}

                  <textarea
                    value={templateMessage}
                    onChange={(e) => setTemplateMessage(e.target.value)}
                    placeholder={"¡Hola @nombre! Te contactamos porque mostraste interés en el proyecto @proyecto. ¿Sigues en busca de departamento?"}
                    className="w-full min-h-[140px] bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLaunchCampaign}
                    disabled={isSending || parsedLeads.length === 0 || !campaignName.trim() || !templateMessage.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:text-zinc-500"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {isSending ? 'Lanzando Campaña...' : 'Lanzar Campaña Ahora'}
                  </button>
                  <p className="text-center text-xs text-zinc-400 mt-3">
                    La IA se conectará a los chats de tu Inbox automáticamente después del envío.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: HISTORIAL DE CAMPAÑAS */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText size={20} className="text-zinc-400" />
              Historial de Campañas
            </h3>

            {campaigns.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Megaphone size={40} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Aún no has lanzado campañas.</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm">Aquí verás el registro cuando envíes tu primera lista masiva de difusión.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{camp.name}</h4>
                        <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                          {new Date(camp.createdAt).toLocaleDateString()} a las {new Date(camp.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${camp.status === 'RUNNING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                          {camp.status === 'RUNNING' ? 'En Progreso' : 'Completada'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                        <Users size={16} />
                        {camp.leadCount || 0}
                      </div>
                      {camp.csvData && (
                        <button
                          onClick={() => {
                            try {
                              const leads = JSON.parse(camp.csvData);
                              if (!leads || leads.length === 0) return;

                              // Reconstruir CSV
                              const headers = Object.keys(leads[0]);
                              const csvContent = [
                                headers.join(','),
                                ...leads.map((row: any) => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
                              ].join('\n');

                              const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `campaña_${camp.name}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              alert('No se pudo descargar el archivo.');
                            }
                          }}
                          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline flex items-center gap-1"
                        >
                          Descargar CSV original
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
