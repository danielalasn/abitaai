'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone, UploadCloud, Users, FileText, Send, Loader2,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Link2,
  AlertTriangle, Sparkles
} from 'lucide-react';
import { createCampaign, getCampaigns, fetchMetaTemplates } from '@/app/actions/campaigns';

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
        done ? 'bg-emerald-500 text-white' : active ? 'bg-purple-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
      }`}>
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>{label}</span>
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
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    const data = await getCampaigns();
    setCampaigns(data);
  };

  // ── Step 1: CSV Upload ──
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

  // ── Step 2: Load templates from Meta ──
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    const result = await fetchMetaTemplates();
    if (result.error) {
      setTemplatesError(result.error);
    } else {
      setTemplates(result.templates as MetaTemplate[]);
      if (result.templates.length === 0) {
        setTemplatesError('No se encontraron plantillas aprobadas en tu cuenta de Meta.');
      }
    }
    setTemplatesLoading(false);
  };

  const handleSelectTemplate = (t: MetaTemplate) => {
    setSelectedTemplate(t);
    // Pre-init variable mapping
    const vars = extractBodyVars(t);
    const initial: Record<string, string> = {};
    vars.forEach(v => { initial[v] = ''; });
    setVariableMapping(initial);
  };

  // ── Step 3: Launch ──
  const bodyVars = selectedTemplate ? extractBodyVars(selectedTemplate) : [];

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
        bodyText, // Nuevo: pasamos el texto de la plantilla
        selectedTemplate.language,
        variableMapping,
        parsedLeads
      );
      setSuccessStatus(`¡Campaña "${campaignName}" lanzada! Enviando a ${parsedLeads.length} leads.`);
      // Reset
      setStep(1);
      setCampaignName('');
      setParsedLeads([]);
      setCsvColumns([]);
      setSelectedTemplate(null);
      setVariableMapping({});
      setTimeout(() => { loadCampaigns(); setSuccessStatus(null); }, 2000);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const bodyText = selectedTemplate?.components.find(c => c.type === 'BODY')?.text ?? '';

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-[#09090b] overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">Campañas de Difusión</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">

          {/* LEFT — Wizard */}
          <div className="space-y-6">

            {/* Progress steps */}
            <div className="flex items-center gap-4 px-1">
              <StepBadge n={1} label="Subir CSV" active={step === 1} done={step > 1} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-700" />
              <StepBadge n={2} label="Elegir Plantilla" active={step === 2} done={step > 2} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-700" />
              <StepBadge n={3} label="Mapear Variables" active={step === 3} done={false} />
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="p-6 space-y-5">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">1. Sube tu lista de contactos</h2>
                  <p className="text-sm text-zinc-500 -mt-2">El archivo debe incluir la columna <code className="font-bold text-purple-600 dark:text-purple-400">#</code> con los números de teléfono.</p>

                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${parsedLeads.length > 0 ? 'border-purple-300 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-900/10' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                    {parsedLeads.length > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Users size={24} />
                        </div>
                        <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{parsedLeads.length} contactos detectados</p>
                        <p className="text-xs text-zinc-500">Columnas: {csvColumns.join(', ')}</p>
                        <button onClick={() => { setParsedLeads([]); setCsvColumns([]); }} className="mt-2 text-xs text-red-500 hover:underline">Eliminar lista</button>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            {isUploading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 font-medium"><span className="text-purple-600 dark:text-purple-400">Sube tu archivo .csv</span> o arrástralo</p>
                        </label>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={parsedLeads.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl font-medium transition-all shadow-sm disabled:opacity-30"
                  >
                    Continuar <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">2. Elige una plantilla de Meta</h2>
                    <button onClick={loadTemplates} disabled={templatesLoading} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      <RefreshCw size={12} className={templatesLoading ? 'animate-spin' : ''} />
                      {templates.length > 0 ? 'Recargar' : 'Cargar plantillas'}
                    </button>
                  </div>

                  {templates.length === 0 && !templatesLoading && (
                    <button
                      onClick={loadTemplates}
                      className="w-full border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 flex flex-col items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <Sparkles size={20} className="text-purple-500" />
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Conectar con Meta y cargar plantillas aprobadas</p>
                      <p className="text-xs text-zinc-400">Asegúrate de haber configurado el Token y el Business ID</p>
                    </button>
                  )}

                  {templatesError && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      {templatesError}
                    </div>
                  )}

                  {templatesLoading && (
                    <div className="flex items-center justify-center py-8 gap-2 text-zinc-400">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Conectando con Meta...</span>
                    </div>
                  )}

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {templates.map(t => {
                      const vars = extractBodyVars(t);
                      const isSelected = selectedTemplate?.name === t.name;
                      return (
                        <button
                          key={t.name}
                          onClick={() => handleSelectTemplate(t)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-[#121214]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded">{t.language}</span>
                              {vars.length > 0 && <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">{vars.length} variables</span>}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {t.components.find(c => c.type === 'BODY')?.text ?? 'Sin cuerpo de texto'}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <ChevronLeft size={16} /> Volver
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!selectedTemplate}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl font-medium transition-all shadow-sm disabled:opacity-30"
                    >
                      Continuar <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && selectedTemplate && (
                <div className="p-6 space-y-5">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">3. Mapear variables de la plantilla</h2>

                  {/* Template preview */}
                  <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Vista Previa de la Plantilla</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{bodyText}</p>
                  </div>

                  {/* Campaign name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nombre de la Campaña</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      placeholder="Ej. Promo Abril 2026"
                      className="w-full bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    />
                  </div>

                  {/* Variable mapping */}
                  {bodyVars.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                        <Link2 size={16} className="text-purple-500" />
                        Asigna cada variable a una columna de tu CSV
                      </label>
                      <div className="space-y-3">
                        {bodyVars.map(varNum => (
                          <div key={varNum} className="flex items-center gap-3">
                            <div className="shrink-0 h-9 px-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center text-sm font-mono font-bold">
                              {'{{'}{varNum}{'}}'}
                            </div>
                            <ChevronRight size={14} className="text-zinc-400 shrink-0" />
                            <select
                              value={variableMapping[varNum] || ''}
                              onChange={e => setVariableMapping(prev => ({ ...prev, [varNum]: e.target.value }))}
                              className="flex-1 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                            >
                              <option value="">— Selecciona columna CSV —</option>
                              {csvColumns.filter(c => c !== '#').map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500">
                      Esta plantilla no tiene variables dinámicas. Se enviará el texto exacto a todos los contactos.
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <ChevronLeft size={16} /> Volver
                    </button>
                    <button
                      onClick={handleLaunch}
                      disabled={isSending || !campaignName.trim()}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-xl font-semibold transition-all shadow-md disabled:opacity-30"
                    >
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {isSending ? 'Enviando...' : `Lanzar a ${parsedLeads.length} contactos`}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Success banner */}
            {successStatus && (
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
                <CheckCircle2 size={16} />
                {successStatus}
              </div>
            )}
          </div>

          {/* RIGHT — Campaign history */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText size={20} className="text-zinc-400" />
              Historial de Campañas
            </h3>

            {campaigns.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Megaphone size={40} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Aún no has lanzado campañas.</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm">Aquí verás el registro completo con la plantilla y los leads contactados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(camp => (
                  <div key={camp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{camp.name}</h4>
                        {camp.templateName && (
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                            {camp.templateName}
                          </span>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">{new Date(camp.createdAt).toLocaleDateString()} a las {new Date(camp.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        camp.status === 'RUNNING'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {camp.status === 'RUNNING' ? 'En Progreso' : 'Completada'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                        <Users size={16} />
                        {camp.leadCount || 0} contactos
                      </div>
                      {camp.csvData && (
                        <button
                          onClick={() => {
                            try {
                              const leads = JSON.parse(camp.csvData);
                              if (!leads?.length) return;
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
                            } catch { alert('No se pudo descargar el archivo.'); }
                          }}
                          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          Descargar CSV
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
