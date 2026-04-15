'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone, UploadCloud, Users, FileText, Send, Loader2,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Link2,
  Sparkles, Download, Clock
} from 'lucide-react';
import { createCampaign, getCampaigns, fetchMetaTemplates, uploadCampaignImage } from '@/app/actions/campaigns';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type TemplateParam = { type: string; text?: string };
type TemplateComponent = { type: string; parameters?: TemplateParam[]; text?: string; buttons?: any[] };
type MetaTemplate = { name: string; language: string; components: TemplateComponent[] };

// Extract {{n}} variables from a template's body text
function extractBodyVars(template: MetaTemplate): string[] {
  const body = template.components.find(c => c.type === 'BODY');
  if (!body?.text) return [];
  const matches = body.text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
}

// ──────────────────────────────────────────────
// Step badges
// ──────────────────────────────────────────────
function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
        done ? 'bg-emerald-500 text-white' : active ? 'bg-[#F36A2D] text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
      }`}>
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-[#111111] dark:text-[#EDE9E0]' : 'text-[#6F6F6F]'}`}>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Wizard step: 1 = Upload CSV, 2 = Choose Template, 3 = Map Variables
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: CSV
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Step 2: Template
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);

  // Step 3: Mapping
  const [campaignName, setCampaignName] = useState('');
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});

  // Launch
  const [headerUrl, setHeaderUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  useEffect(() => { loadCampaigns(); }, []);

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
        const { parse } = await import('csv-parse/sync');
        const records = parse(text, {
          columns: true, skip_empty_lines: true, trim: true,
          delimiter: [',', ';'], bom: true
        });
        if (records.length === 0) { alert('El archivo está vacío.'); return; }
        const headers = Object.keys(records[0] as object);
        if (!headers.includes('#')) {
          alert(`❌ Falta la columna "#" (teléfonos).\n\nColumnas detectadas: ${headers.join(', ')}`);
          return;
        }
        setCsvColumns(headers);
        setParsedLeads(records);
      } catch (err: any) {
        alert('Error leyendo el CSV: ' + err.message);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    const result = await fetchMetaTemplates();
    if (result.error) {
      setTemplatesError(result.error);
    } else {
      setTemplates(result.templates as MetaTemplate[]);
    }
    setTemplatesLoading(false);
  };

  const handleSelectTemplate = (t: MetaTemplate) => {
    setSelectedTemplate(t);
    setHeaderUrl(''); // Limpiar cualquier URL previa

    const vars = extractBodyVars(t);
    const initial: Record<string, string> = {};
    vars.forEach(v => { initial[v] = ''; });
    setVariableMapping(initial);
  };

  const bodyVars = selectedTemplate ? extractBodyVars(selectedTemplate) : [];
  const bodyText = selectedTemplate?.components.find(c => c.type === 'BODY')?.text ?? '';
  const needsImageHeader = selectedTemplate?.components.find(c => c.type === 'HEADER' && (c as any).format === 'IMAGE');

  const handleLaunch = async () => {
    if (!campaignName.trim() || !selectedTemplate) return;
    const missing = bodyVars.filter(v => !variableMapping[v]);
    if (missing.length > 0) {
      alert(`Asigna una columna CSV para cada variable: {{${missing.join('}}, {{')}}}`);
      return;
    }

    setIsSending(true);
    setSuccessStatus(null);
    try {
      await createCampaign(
        campaignName,
        selectedTemplate.name,
        bodyText,
        selectedTemplate.language,
        variableMapping,
        parsedLeads,
        headerUrl
      );
      setSuccessStatus(`¡Campaña lanzada con éxito!`);
      setStep(1);
      setCampaignName('');
      setParsedLeads([]);
      setCsvColumns([]);
      setSelectedTemplate(null);
      setTimeout(() => { loadCampaigns(); setSuccessStatus(null); }, 2000);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadCsv = (campaign: any) => {
    if (!campaign.csvData) return;
    try {
      const data = JSON.parse(campaign.csvData);
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row: any) => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${campaign.name.replace(/\s+/g, '_')}_leads.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error generando CSV');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await uploadCampaignImage(formData);
      setHeaderUrl(url);
    } catch (err: any) {
      alert('Error subiendo imagen: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F36A2D]/10 text-[#F36A2D] rounded-lg flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Difusión</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-1">
              <StepBadge n={1} label="CSV" active={step === 1} done={step > 1} />
              <ChevronRight size={14} className="text-[#6F6F6F]" />
              <StepBadge n={2} label="Plantilla" active={step === 2} done={step > 2} />
              <ChevronRight size={14} className="text-[#6F6F6F]" />
              <StepBadge n={3} label="Map" active={step === 3} done={false} />
            </div>

            <div className="bg-white dark:bg-[#111111]/40 rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-sm overflow-hidden">
              {step === 1 && (
                <div className="p-6 space-y-5">
                  <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">1. Subir contactos</h2>
                  <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${parsedLeads.length > 0 ? 'border-[#F36A2D]/40 bg-[#F36A2D]/5 dark:bg-[#F36A2D]/10' : 'border-[#DEDAD0] dark:border-zinc-800'}`}>
                    {parsedLeads.length > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <Users size={24} className="text-[#F36A2D]" />
                        <p className="text-[#111111] dark:text-[#EDE9E0] font-bold">{parsedLeads.length} contactos</p>
                        <button onClick={() => setParsedLeads([])} className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-up" />
                        <label htmlFor="file-up" className="cursor-pointer flex flex-col items-center gap-2">
                          <UploadCloud size={32} className="text-[#6F6F6F]" />
                          <p className="text-sm font-medium text-[#6F6F6F]">Haz clic para subir CSV</p>
                        </label>
                      </>
                    )}
                  </div>
                  <button onClick={() => setStep(2)} disabled={parsedLeads.length === 0} className="w-full py-3 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl font-bold disabled:opacity-30">
                    Continuar
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">2. Plantilla de Meta</h2>
                    <button onClick={loadTemplates} className="text-xs text-[#F36A2D] font-bold hover:opacity-70 transition-opacity">Cargar</button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {templates.map(t => (
                      <button 
                        key={t.name} 
                        onClick={() => handleSelectTemplate(t)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplate?.name === t.name ? 'border-[#F36A2D] bg-[#F36A2D]/5' : 'border-[#DEDAD0] dark:border-zinc-800'}`}
                      >
                        <p className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0]">{t.name}</p>
                        <p className="text-xs text-[#6F6F6F] line-clamp-1">{t.components.find(c => c.type === 'BODY')?.text}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-bold text-[#6F6F6F] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">Volver</button>
                    <button onClick={() => setStep(3)} disabled={!selectedTemplate} className="flex-1 py-3 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl font-bold disabled:opacity-30">
                      Configurar
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && selectedTemplate && (
                <div className="p-6 space-y-5">
                  <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">3. Mapear Variables</h2>
                  <input 
                    type="text" 
                    placeholder="Nombre de campaña" 
                    value={campaignName} 
                    onChange={e => setCampaignName(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#6F6F6F]/50"
                  />

                  {needsImageHeader && (
                    <div className="space-y-2 p-4 bg-[#F36A2D]/5 dark:bg-[#F36A2D]/10 rounded-2xl border border-[#F36A2D]/20">
                      <div className="flex items-center gap-2 text-[#F36A2D] mb-1">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Cabecera de Imagen Requerida</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select 
                          value={headerUrl.startsWith('{{') ? headerUrl : ''} 
                          onChange={e => setHeaderUrl(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-[#1A1714] text-sm text-[#111111] dark:text-[#EDE9E0]"
                        >
                          <option value="">— URL Fija —</option>
                          {csvColumns.filter(c => c !== '#').map(c => <option key={c} value={`{{${c}}}`}>CSV: {c}</option>)}
                        </select>
                        {!headerUrl.startsWith('{{') && (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="https://ejemplo.com/imagen.jpg" 
                              value={headerUrl} 
                              onChange={e => setHeaderUrl(e.target.value)}
                              className="flex-1 p-2.5 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-[#1A1714] text-sm text-[#111111] dark:text-[#EDE9E0]"
                            />
                            <label className="cursor-pointer flex items-center justify-center p-2.5 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-xl hover:opacity-80 transition-all min-w-[42px]">
                              {isUploadingImage ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {bodyVars.map(v => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold w-12 text-[#F36A2D]">{'{{'}{v}{'}}'}</span>
                        <select 
                          value={variableMapping[v]} 
                          onChange={e => setVariableMapping(p => ({ ...p, [v]: e.target.value }))}
                          className="flex-1 p-2 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0]"
                        >
                          <option value="">— Seleccionar columna —</option>
                          {csvColumns.filter(c => c !== '#').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-bold text-[#6F6F6F] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">Volver</button>
                    <button onClick={handleLaunch} disabled={isSending || !campaignName} className="flex-1 py-3 bg-[#F36A2D] text-white rounded-2xl font-bold disabled:opacity-30">
                      {isSending ? 'Enviando...' : `Lanzar (${parsedLeads.length} leads)`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2 text-[#111111] dark:text-[#EDE9E0]">
              <FileText size={20} /> Historial
            </h3>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {campaigns.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-[#DEDAD0] dark:border-zinc-800 rounded-3xl opacity-50">
                  <Clock size={32} className="mx-auto mb-2 text-[#6F6F6F]" />
                  <p className="text-sm font-medium text-[#6F6F6F]">No hay campañas lanzadas aún</p>
                </div>
              )}
              {campaigns.map(c => (
                <div key={c.id} className="p-4 bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0]">{c.name}</h4>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-[#6F6F6F]">{new Date(c.createdAt).toLocaleDateString()}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'COMPLETED' ? 'Completado' : 'Ejecutando'}
                      </span>
                      <span className="text-[10px] text-[#6F6F6F] font-bold">{c.leadCount} leads</span>
                    </div>
                  </div>
                  {c.csvData && (
                    <button 
                      onClick={() => handleDownloadCsv(c)}
                      title="Descargar Leads CSV"
                      className="p-2.5 bg-[#F36A2D]/10 text-[#F36A2D] rounded-xl hover:bg-[#F36A2D] hover:text-white transition-all shadow-sm"
                    >
                      <Download size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
