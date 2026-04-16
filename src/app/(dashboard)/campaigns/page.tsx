'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone, UploadCloud, Users, FileText, Send, Loader2,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Link2,
  Sparkles, Download, Clock, Search, X, AlertCircle
} from 'lucide-react';
import { fetchCampaigns, fetchMetaTemplates, launchCampaignAction, fetchCampaignLogs } from '@/app/actions/campaigns';
import { uploadImageAction } from '@/app/actions/storage';

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
function StepBadge({ n, label, active, done, onClick }: { n: number, label: string, active: boolean, done: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={!done && !active}
      className={`flex items-center gap-2 transition-all ${active ? 'opacity-100' : done ? 'opacity-100 cursor-pointer hover:translate-y-[-1px]' : 'opacity-40 cursor-not-allowed'}`}
    >
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
        done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
      }`}>
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600' : 'text-[#6F6F6F]'}`}>
        {label}
      </span>
    </button>
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
  const [isBotActive, setIsBotActive] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Logs Report
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    const data = await fetchCampaigns();
    setCampaigns(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        let records: any[] = [];
        
        if (isExcel) {
          const { read, utils } = await import('xlsx');
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          records = utils.sheet_to_json(firstSheet, { defval: '' });
        } else {
          // CSV processing
          const text = new TextDecoder('utf-8').decode(event.target?.result as ArrayBuffer);
          const { parse } = await import('csv-parse/sync');
          records = parse(text, {
            columns: true, skip_empty_lines: true, trim: true,
            delimiter: [',', ';'], bom: true
          });
        }

        if (records.length === 0) { alert('El archivo está vacío.'); return; }
        const headers = Object.keys(records[0] as object);
        if (!headers.includes('#')) {
          alert(`❌ Falta la columna "#" (teléfonos).\n\nColumnas detectadas: ${headers.join(', ')}`);
          return;
        }
        setCsvColumns(headers);
        setParsedLeads(records);
      } catch (err: any) {
        alert('Error leyendo el archivo: ' + err.message);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file); // TextDecoder will handle CSV
    }
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
      await launchCampaignAction(
        campaignName,
        selectedTemplate.name,
        bodyText,
        selectedTemplate.language,
        variableMapping,
        parsedLeads,
        headerUrl,
        isBotActive
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
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadImageAction(formData);
    if (result.success && result.url) {
      setHeaderUrl(result.url);
    } else {
      alert(result.error || 'Error al subir imagen');
    }
    setIsUploadingImage(false);
    e.target.value = '';
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter || new Date(c.createdAt).toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E9E4D8] dark:bg-[#1A1714] overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8]/80 dark:bg-[#1A1714]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <h1 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Difusión</h1>
        </div>
      </header>
      
      {/* Success Notification Toast */}
      {successStatus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/20">
            <div className="bg-white/20 p-1 rounded-full">
              <CheckCircle2 size={18} />
            </div>
            <span className="font-bold text-sm">{successStatus}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-1">
              <StepBadge n={1} label="CSV" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-800" />
              <StepBadge n={2} label="Plantilla" active={step === 2} done={step > 2} onClick={() => (step > 2) ? setStep(2) : undefined} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-800" />
              <StepBadge n={3} label="Mapeo" active={step === 3} done={false} />
            </div>

            <div className="bg-white dark:bg-[#111111]/40 rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-sm overflow-hidden">
              {step === 1 && (
                <div className="p-6 space-y-5">
                  <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">1. Subir contactos</h2>
                  <div className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${parsedLeads.length > 0 ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-[#DEDAD0] dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}>
                    {parsedLeads.length > 0 ? (
                      <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                        <div className="h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                           <Users size={24} />
                        </div>
                        <p className="text-lg text-[#111111] dark:text-[#EDE9E0] font-black">{parsedLeads.length} Contactos Listos</p>
                        <button onClick={() => setParsedLeads([])} className="text-xs text-red-500 font-bold hover:bg-red-500/10 px-4 py-2 rounded-full transition-colors uppercase tracking-widest">Eliminar y cambiar archivo</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud size={40} className="text-emerald-500/50" />
                          <p className="font-bold text-[#111111] dark:text-[#EDE9E0]">Selecciona tu archivo</p>
                          <p className="text-xs text-[#6F6F6F]">Sube un archivo CSV o Excel para comenzar</p>
                        </div>
                        <input 
                          type="file" 
                          id="file-up" 
                          className="hidden" 
                          accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                          onChange={handleFileUpload} 
                        />
                        <label htmlFor="file-up" className="inline-block px-10 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20">
                          ELEGIR ARCHIVO
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Instrucciones del CSV Compactas */}
                  <div className="bg-white/50 dark:bg-zinc-900/30 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600/80">
                      <AlertCircle size={14} />
                      <span className="text-[9px] font-black uppercase tracking-[0.15em]">Guía Rápida</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex gap-2">
                          <div className="h-4 w-4 bg-emerald-500 text-white text-[9px] font-black rounded flex items-center justify-center shrink-0">#</div>
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-bold text-[#111111] dark:text-[#EDE9E0] uppercase tracking-tighter">Celular</p>
                             <p className="text-[8px] text-[#6F6F6F] leading-none">Columna # obligatoria</p>
                          </div>
                       </div>
                       <div className="flex gap-2 border-l border-[#DEDAD0] dark:border-zinc-800 pl-4">
                          <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black rounded flex items-center justify-center shrink-0">N</div>
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-bold text-[#111111] dark:text-[#EDE9E0] uppercase tracking-tighter">Nombre</p>
                             <p className="text-[8px] text-[#6F6F6F] leading-none">Opcional: Nombre o Name</p>
                          </div>
                       </div>
                    </div>
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
                    <button onClick={loadTemplates} className="text-xs text-emerald-500 font-bold hover:opacity-70 transition-opacity">Cargar</button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {templates.map(t => (
                      <button 
                        key={t.name} 
                        onClick={() => handleSelectTemplate(t)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 ${selectedTemplate?.name === t.name ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#DEDAD0] dark:border-zinc-800'}`}
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
                    <div className="space-y-4 p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Cabecera Multimedia</span>
                        </div>
                        
                        {/* Selector de modo: Fijo o Variables de CSV */}
                        <select 
                          value={headerUrl.startsWith('{{') ? 'CSV' : 'FIXED'} 
                          onChange={e => {
                            if (e.target.value === 'FIXED') setHeaderUrl('');
                            else setHeaderUrl(`{{${csvColumns.find(c => c !== '#') || ''}}}`);
                          }}
                          className="bg-transparent text-[9px] font-bold text-emerald-600 focus:outline-none uppercase tracking-tighter cursor-pointer"
                        >
                          <option value="FIXED">Imagen Fija</option>
                          <option value="CSV">Desde CSV</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {headerUrl.startsWith('{{') ? (
                          <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Columna del CSV con URLs:</p>
                            <select 
                              value={headerUrl} 
                              onChange={e => setHeaderUrl(e.target.value)}
                              className="w-full p-4 rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#1A1714] text-xs font-bold text-[#111111] dark:text-[#EDE9E0] focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            >
                              {csvColumns.filter(c => c !== '#').map(c => <option key={c} value={`{{${c}}}`}>Columna: {c}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                            {headerUrl && headerUrl.startsWith('http') ? (
                               <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl group aspect-video">
                                  <img src={headerUrl} alt="Preview" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                                     <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-2xl border border-emerald-500 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Imagen Lista</span>
                                     </div>
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <button 
                                        onClick={() => setHeaderUrl('')}
                                        className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                                     >
                                        <X size={20} />
                                     </button>
                                  </div>
                               </div>
                            ) : (
                               <label className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                                  isUploadingImage ? 'bg-zinc-50 border-zinc-200' : 'border-emerald-500/30 bg-white dark:bg-zinc-900/40 hover:border-emerald-500 hover:bg-emerald-500/5'
                               }`}>
                                  {isUploadingImage ? (
                                     <>
                                        <Loader2 size={24} className="animate-spin text-emerald-500 mb-2" />
                                        <span className="text-xs font-bold text-emerald-600 animate-pulse">Subiendo...</span>
                                     </>
                                  ) : (
                                     <>
                                        <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                                           <UploadCloud size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-[#111111] dark:text-[#EDE9E0] tracking-widest uppercase">Subir Imagen</span>
                                        <span className="text-[8px] text-zinc-400 font-bold">PDF, JPG o PNG</span>
                                     </>
                                  )}
                                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                               </label>
                            )}

                            {/* URL como secundario */}
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
                                <Link2 size={14} />
                              </div>
                              <input 
                                type="text" 
                                placeholder="O pega una URL directa..." 
                                value={headerUrl && headerUrl.startsWith('http') ? headerUrl : ''} 
                                onChange={e => setHeaderUrl(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white dark:bg-[#1A1714] text-[10px] text-[#111111] dark:text-[#EDE9E0] outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-400 font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {bodyVars.map(v => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold w-12 text-emerald-500">{'{{'}{v}{'}}'}</span>
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
                  <div className="flex items-center justify-between p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1.5">
                        <RefreshCw size={12} className={isBotActive ? 'animate-spin-slow' : ''} />
                        Respuesta Automática
                      </div>
                      <p className="text-[10px] text-[#6F6F6F]">El bot responderá a los mensajes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBotActive(!isBotActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBotActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBotActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-bold text-[#6F6F6F] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">Volver</button>
                    <button 
                      onClick={handleLaunch} 
                      disabled={isSending || !campaignName || bodyVars.some(v => !variableMapping[v])} 
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                    >
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : null}
                      {isSending ? 'Lanzando...' : `Lanzar (${parsedLeads.length} leads)`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2 text-[#111111] dark:text-[#EDE9E0]">
                <FileText size={20} /> Historial
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/50 dark:bg-black/20 text-[#111111] dark:text-[#EDE9E0] w-32 focus:w-48 transition-all outline-none"
                  />
                </div>
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-white/50 dark:bg-black/20 text-[#111111] dark:text-[#EDE9E0] outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto p-4 border border-[#DEDAD0] dark:border-zinc-800 rounded-[2rem] bg-[#DEDAD0]/20 dark:bg-black/10 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
              {filteredCampaigns.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-[#DEDAD0] dark:border-zinc-800 rounded-3xl opacity-50">
                  <Clock size={32} className="mx-auto mb-2 text-[#6F6F6F]" />
                  <p className="text-sm font-medium text-[#6F6F6F]">
                    {searchQuery || dateFilter ? 'No se encontraron resultados' : 'No hay campañas lanzadas aún'}
                  </p>
                </div>
              )}
              {filteredCampaigns.map(c => (
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={async () => {
                        setIsLoadingLogs(true);
                        setShowLogsModal(true);
                        const logs = await fetchCampaignLogs(c.id);
                        setActiveLogs(logs);
                        setIsLoadingLogs(false);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Reporte
                    </button>
                    {c.csvData && (
                      <button 
                        onClick={() => handleDownloadCsv(c)}
                        title="Descargar Leads CSV"
                        className="p-1.5 bg-[#F36A2D]/10 text-[#F36A2D] rounded-xl hover:bg-[#F36A2D] hover:text-white transition-all shadow-sm"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE REPORTES */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogsModal(false)} />
          <div className="bg-white dark:bg-[#111111] w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-[#DEDAD0] dark:border-zinc-800 animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-medium text-[#111111] dark:text-[#EDE9E0]">Reporte de Entrega</h3>
                   <div className="flex items-center gap-2">
                      <p className="text-xs text-[#6F6F6F]">Estado detallado por contacto</p>
                      <button 
                        onClick={async () => {
                          setIsLoadingLogs(true);
                          // Encontrando la campaña activa de alguna forma si no la tenemos a mano
                          // pero por ahora activeLogs viene de una campaña específica.
                          // Reusando el ID que ya tenemos en los logs previos.
                          if (activeLogs.length > 0) {
                            const logs = await fetchCampaignLogs(activeLogs[0].campaignId);
                            setActiveLogs(logs);
                          }
                          setIsLoadingLogs(false);
                        }}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-emerald-600"
                        title="Actualizar estados"
                      >
                        <RefreshCw size={12} className={isLoadingLogs ? 'animate-spin' : ''} />
                      </button>
                   </div>
                </div>
                <button 
                   onClick={() => setShowLogsModal(false)}
                   className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors"
                >
                   <X size={20} className="text-[#6F6F6F]" />
                </button>
             </div>

             <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
                {isLoadingLogs ? (
                    <div className="flex flex-col items-center py-12 gap-3">
                       <Loader2 size={32} className="animate-spin text-emerald-500" />
                       <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Generando Reporte...</p>
                    </div>
                ) : activeLogs.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                       <p className="text-sm">No hay registros disponibles para esta campaña.</p>
                    </div>
                ) : (
                    activeLogs.map((log: any) => {
                       let badgeColor = 'bg-red-500/10 text-red-600';
                       let badgeText = 'Fallido';
                       let Icon = AlertCircle;
                       if (log.status === 'SENT') {
                         badgeColor = 'bg-amber-500/10 text-amber-600';
                         badgeText = 'Enviado';
                         Icon = CheckCircle2;
                       } else if (log.status === 'DELIVERED') {
                         badgeColor = 'bg-emerald-500/10 text-emerald-600';
                         badgeText = 'Recibido';
                         Icon = CheckCircle2;
                       } else if (log.status === 'READ') {
                         badgeColor = 'bg-blue-500/10 text-blue-600';
                         badgeText = 'Leído';
                         Icon = CheckCircle2;
                       }

                       return (
                       <div key={log.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                          <div className="flex items-center gap-3">
                             <div className={`h-8 w-8 rounded-full flex items-center justify-center ${badgeColor}`}>
                                <Icon size={16} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0]">{log.phone}</p>
                                {log.error && <p className="text-[10px] text-red-500 font-medium">{log.error}</p>}
                             </div>
                          </div>
                          <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${badgeColor}`}>
                             {badgeText}
                          </div>
                       </div>
                       );
                    })
                )}
             </div>
             
             <div className="p-8 bg-zinc-50 dark:bg-black/10 border-t border-[#DEDAD0] dark:border-zinc-800 flex justify-between items-center">
                 <button 
                    onClick={() => {
                        const headers = ["Telefono", "Estado", "Error", "Fecha"];
                        const rows = activeLogs.map((l: any) => [
                            l.phone,
                            l.status,
                            l.error || "",
                            new Date(l.createdAt).toLocaleString()
                        ]);
                        
                        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `Reporte_Campaña_${activeLogs[0]?.campaignId || 'logs'}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl transition-all"
                 >
                    <Download size={14} />
                    Descargar Log CSV
                 </button>
                 <button 
                    onClick={() => setShowLogsModal(false)}
                    className="px-8 py-3 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                 >
                    CERRAR
                 </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
