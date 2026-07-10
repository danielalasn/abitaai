'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Megaphone, UploadCloud, Users, FileText, Send, Loader2,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Link2,
  Sparkles, Download, Clock, Search, X, AlertCircle
} from 'lucide-react';
import { fetchCampaigns, fetchMetaTemplates, launchCampaignAction, fetchCampaignLogs, processCampaignLead, finalizeCampaign, updateCampaignStatus, prepareRetryFailed } from '@/app/actions/campaigns';
import { uploadImageAction } from '@/app/actions/storage';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type TemplateParam = { type: string; text?: string };
type TemplateComponent = { type: string; parameters?: TemplateParam[]; text?: string; buttons?: any[] };
type MetaTemplate = { name: string; language: string; components: TemplateComponent[]; category: string };

// Extract {{n}} variables from a template's body text
function extractBodyVars(template: MetaTemplate): string[] {
  const body = template.components.find(c => c.type === 'BODY');
  if (!body?.text) return [];
  const matches = body.text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
}

// Extract buttons with URL variables
function extractButtonVars(template: MetaTemplate): { buttonIndex: number; label: string }[] {
  const buttonsComp = template.components.find(c => c.type === 'BUTTONS');
  if (!buttonsComp || !buttonsComp.buttons) return [];
  
  const vars: { buttonIndex: number; label: string }[] = [];
  buttonsComp.buttons.forEach((btn, index) => {
    if (btn.type === 'URL' && btn.url && btn.url.includes('{{1}}')) {
      vars.push({
        buttonIndex: index,
        label: btn.text || `Enlace ${index + 1}`
      });
    }
  });
  return vars;
}

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
  const [templatePrefix, setTemplatePrefix] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);

  // Step 3: Mapping
  const [campaignName, setCampaignName] = useState('');
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});

  // Launch
  const [headerUrl, setHeaderUrl] = useState('');
  const [headerMediaType, setHeaderMediaType] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT' | null>(null);
  const [isBotActive, setIsBotActive] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Logs Report
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');

  // Control de Pausa y Reanudación de Campañas
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);

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
      setTemplatePrefix(result.prefix || null);
    }
    setTemplatesLoading(false);
  };

  const handleSelectTemplate = (t: MetaTemplate) => {
    setSelectedTemplate(t);
    setHeaderUrl(''); // Limpiar cualquier URL previa

    // Detectar tipo de media del header
    const hComp = t.components.find(c => c.type === 'HEADER') as any;
    if (hComp && (hComp.format === 'IMAGE' || hComp.format === 'VIDEO' || hComp.format === 'DOCUMENT')) {
      setHeaderMediaType(hComp.format as 'IMAGE' | 'VIDEO' | 'DOCUMENT');
    } else {
      setHeaderMediaType(null);
    }

    const vars = extractBodyVars(t);
    const btnVars = extractButtonVars(t);
    const initial: Record<string, string> = {};
    vars.forEach(v => { initial[v] = ''; });
    btnVars.forEach(bv => { initial[`button_${bv.buttonIndex}`] = ''; });
    setVariableMapping(initial);
  };

  const bodyVars = selectedTemplate ? extractBodyVars(selectedTemplate) : [];
  const buttonVars = selectedTemplate ? extractButtonVars(selectedTemplate) : [];
  const bodyText = selectedTemplate?.components.find(c => c.type === 'BODY')?.text ?? '';
  const headerComp = selectedTemplate?.components.find(c => c.type === 'HEADER') as any;
  const needsMediaHeader = headerComp && (headerComp.format === 'IMAGE' || headerComp.format === 'VIDEO' || headerComp.format === 'DOCUMENT');

  const executeSendingLoop = async (
    campaignId: string, 
    leads: any[], 
    processedPhones: Set<string>,
    isBotActiveVal: boolean,
    templateBodyText: string,
    templateHeaderUrl: string,
    dryRunVal: boolean
  ) => {
    setRunningCampaignId(campaignId);
    isPausedRef.current = false;
    setIsPaused(false);

    let sentInThisSession = 0;
    const targetCount = leads.length - processedPhones.size;
    setProgress({ current: 0, total: targetCount });

    try {
      for (let i = 0; i < leads.length; i++) {
        // Verificar si se solicitó pausa
        if (isPausedRef.current) {
          await updateCampaignStatus(campaignId, 'PAUSED');
          loadCampaigns();
          setRunningCampaignId(null);
          return false; // loop interrumpido
        }

        const lead = leads[i];
        const rawPhone = lead['#'];
        if (rawPhone) {
          let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
          if (cleanPhone.length === 8) {
            cleanPhone = '503' + cleanPhone;
          }
          // Si ya se procesó con éxito, omitir
          if (processedPhones.has(cleanPhone)) {
            continue;
          }
        }

        await processCampaignLead(campaignId, i, isBotActiveVal, templateBodyText, templateHeaderUrl, dryRunVal);
        sentInThisSession++;
        setProgress({ current: sentInThisSession, total: targetCount });

        // Retardo de seguridad entre mensajes
        if (i < leads.length - 1) {
          let delayTime = dryRunVal ? 50 : 500;
          if ((i + 1) % 21 === 0) delayTime = dryRunVal ? 200 : 3000;
          else if ((i + 1) % 3 === 0) delayTime = dryRunVal ? 100 : 1000;
          
          // Verificar pausa periódicamente durante la espera
          const steps = Math.ceil(delayTime / 100);
          for (let s = 0; s < steps; s++) {
            if (isPausedRef.current) {
              await updateCampaignStatus(campaignId, 'PAUSED');
              loadCampaigns();
              setRunningCampaignId(null);
              return false;
            }
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      await finalizeCampaign(campaignId);
      loadCampaigns();
      setRunningCampaignId(null);
      return true; // completado
    } catch (err) {
      console.error("Error en loop de envíos:", err);
      setRunningCampaignId(null);
      throw err;
    }
  };

  const handleLaunch = async () => {
    if (!campaignName.trim() || !selectedTemplate) return;
    const missing = bodyVars.filter(v => !variableMapping[v]);
    const missingButtons = buttonVars.filter(bv => !variableMapping[`button_${bv.buttonIndex}`]);
    if (missing.length > 0 || missingButtons.length > 0) {
      alert(`Asigna una columna CSV para cada variable del cuerpo y de los botones.`);
      return;
    }

    setIsSending(true);
    setSuccessStatus(null);
    setProgress({ current: 0, total: parsedLeads.length });

    try {
      const buttonsConfig = selectedTemplate.components.find(c => c.type === 'BUTTONS')?.buttons || [];
      const enhancedMapping = {
        ...variableMapping,
        __buttonsConfig: JSON.stringify(buttonsConfig)
      };

      const campaignData = await launchCampaignAction(
        campaignName,
        selectedTemplate.name,
        bodyText,
        selectedTemplate.language,
        enhancedMapping,
        parsedLeads,
        selectedTemplate.category,
        headerUrl,
        isBotActive,
        headerMediaType || undefined
      );

      const completed = await executeSendingLoop(
        campaignData.id,
        parsedLeads,
        new Set<string>(), // sin envíos previos
        isBotActive,
        bodyText,
        headerUrl || '',
        isDryRun
      );

      if (completed) {
        setSuccessStatus(`¡Campaña lanzada con éxito!`);
      } else {
        setSuccessStatus(`Campaña guardada en pausa.`);
      }
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
      setProgress({ current: 0, total: 0 });
    }
  };

  const handlePauseCampaign = async () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResumeCampaign = async (campaign: any) => {
    setIsSending(true);
    setSuccessStatus(null);
    setProgress({ current: 0, total: campaign.leadCount || 100 });
    
    try {
      await updateCampaignStatus(campaign.id, 'RUNNING');
      
      const logs = await fetchCampaignLogs(campaign.id);
      const processed = new Set<string>();
      logs.forEach((l: any) => {
        if (l.status !== 'FAILED') {
          processed.add(l.phone);
        }
      });

      const leads = JSON.parse(campaign.csvData || '[]');
      setProgress({ current: processed.size, total: leads.length });

      const completed = await executeSendingLoop(
        campaign.id,
        leads,
        processed,
        false,
        '',
        '',
        false
      );

      if (completed) {
        setSuccessStatus(`¡Campaña reanudada y completada con éxito!`);
      } else {
        setSuccessStatus(`Campaña pausada.`);
      }
      setTimeout(() => { loadCampaigns(); setSuccessStatus(null); }, 2000);
    } catch (err: any) {
      alert('Error al reanudar: ' + err.message);
    } finally {
      setIsSending(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleRetryFailedCampaign = async (campaign: any) => {
    setIsSending(true);
    setSuccessStatus(null);
    setProgress({ current: 0, total: campaign.leadCount || 100 });
    
    try {
      // 1. Eliminar fallidos en base de datos y poner estado en RUNNING
      await prepareRetryFailed(campaign.id);
      
      // 2. Cargar logs exitosos restantes
      const logs = await fetchCampaignLogs(campaign.id);
      const processed = new Set<string>();
      logs.forEach((l: any) => {
        if (l.status !== 'FAILED') {
          processed.add(l.phone);
        }
      });

      const leads = JSON.parse(campaign.csvData || '[]');
      const failedCount = leads.length - processed.size;
      setProgress({ current: 0, total: failedCount });

      // 3. Lanzar loop
      const completed = await executeSendingLoop(
        campaign.id,
        leads,
        processed,
        false,
        '',
        '',
        false
      );

      if (completed) {
        setSuccessStatus(`¡Re-envío completado con éxito!`);
      } else {
        setSuccessStatus(`Campaña pausada.`);
      }
      setTimeout(() => { loadCampaigns(); setSuccessStatus(null); }, 2000);
    } catch (err: any) {
      alert('Error al re-enviar fallidos: ' + err.message);
    } finally {
      setIsSending(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadCsv = async (campaign: any) => {
    if (!campaign.csvData) return;
    try {
      const latestLogs = await fetchCampaignLogs(campaign.id);
      const originalData = JSON.parse(campaign.csvData);
      if (!Array.isArray(originalData)) return;

      const logsMap: Record<string, any> = {};
      latestLogs.forEach((l: any) => {
        logsMap[l.phone] = l;
        if (l.phone.startsWith('503') && l.phone.length === 11) {
          logsMap[l.phone.substring(3)] = l;
        }
      });

      const mapping = JSON.parse(campaign.variableMapping || '{}');
      const allButtons: any[] = mapping.__buttonsConfig ? JSON.parse(mapping.__buttonsConfig) : [];
      const quickReplyButtons = allButtons.filter((btn: any) => btn.type === 'QUICK_REPLY');

      const originalHeaders = Object.keys(originalData[0] || {});
      const buttonHeaders = quickReplyButtons.map((btn: any) => btn.text);
      const headers = [...originalHeaders, 'WhatsApp_Status', 'WhatsApp_Error', ...buttonHeaders];

      const statusES: Record<string, string> = {
        SENT: 'ENVIADO', DELIVERED: 'ENTREGADO', READ: 'LEIDO', FAILED: 'FALLIDO',
        NO_INTENTADO: 'NO_INTENTADO'
      };

      const rows = originalData.map((row: any) => {
        const rawPhone = String(row['#'] || '').replace(/[^0-9]/g, '');
        const phone = rawPhone.length === 8 ? '503' + rawPhone : rawPhone;
        const log = logsMap[phone] || logsMap[rawPhone];
        const buttonReplies: string[] = log?.buttonReplies || [];

        return [
          ...originalHeaders.map(h => row[h]),
          statusES[log?.status] || 'NO_INTENTADO',
          log?.error || '',
          ...quickReplyButtons.map((btn: any) =>
            buttonReplies.includes(btn.text) ? btn.text : ''
          )
        ];
      });

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Reporte_${campaign.name.replace(/\s+/g, '_')}.csv`);

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
    <DesktopOnlyGuard>
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
          
          <div className="space-y-6 flex flex-col lg:h-[calc(100vh-180px)]">
            <div className="flex items-center gap-4 px-1 shrink-0">
              <StepBadge n={1} label="CSV" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-800" />
              <StepBadge n={2} label="Plantilla" active={step === 2} done={step > 2} onClick={() => (step > 2) ? setStep(2) : undefined} />
              <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-800" />
              <StepBadge n={3} label="Mapeo" active={step === 3} done={false} />
            </div>

            <div className="bg-white dark:bg-[#111111]/40 rounded-3xl border border-[#DEDAD0] dark:border-zinc-800 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
              {step === 1 && (
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
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
                <div className="p-6 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">2. Plantilla de Meta</h2>
                      <button onClick={loadTemplates} className="text-xs text-emerald-500 font-bold hover:opacity-70 transition-opacity">Cargar</button>
                    </div>
                    <div className="space-y-2 flex-1 min-y-0 overflow-y-auto pr-1">
                    {templates.map(t => (
                      <button 
                        key={t.name} 
                        onClick={() => handleSelectTemplate(t)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 ${selectedTemplate?.name === t.name ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#DEDAD0] dark:border-zinc-800'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-[#111111] dark:text-[#EDE9E0]">
                            {templatePrefix && t.name.startsWith(templatePrefix) 
                              ? t.name.replace(templatePrefix, '') 
                              : t.name}
                          </p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${
                            t.category === 'MARKETING' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                          }`}>
                            {t.category}
                          </span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {t.language}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F6F6F] line-clamp-1">{t.components.find(c => c.type === 'BODY')?.text}</p>
                      </button>
                    ))}
                  </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-[#DEDAD0]/40 dark:border-zinc-800/40 shrink-0">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-bold text-[#6F6F6F] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">Volver</button>
                    <button onClick={() => setStep(3)} disabled={!selectedTemplate} className="flex-1 py-3 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] rounded-2xl font-bold disabled:opacity-30">
                      Configurar
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && selectedTemplate && (
                <div className="p-6 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 pb-4">
                    <h2 className="text-lg font-medium text-[#111111] dark:text-[#EDE9E0]">3. Mapear Variables</h2>
                  <input 
                    type="text" 
                    placeholder="Nombre de campaña" 
                    value={campaignName} 
                    onChange={e => setCampaignName(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-[#111111] dark:text-[#EDE9E0] placeholder:text-[#6F6F6F]/50"
                  />

                  {needsMediaHeader && (
                    <div className="space-y-4 p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Cabecera {headerMediaType === 'IMAGE' ? 'Imagen' : headerMediaType === 'VIDEO' ? 'Video' : 'Documento'}
                          </span>
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
                          <option value="FIXED">URL Fija</option>
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
                            {/* Media upload para todos (IMAGE, VIDEO, DOCUMENT) */}
                            {headerMediaType && (
                              <>
                                {headerUrl && headerUrl.startsWith('http') ? (
                                   <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl group aspect-video">
                                      {headerMediaType === 'VIDEO' ? (
                                          <video src={headerUrl} className="w-full h-full object-cover" />
                                      ) : headerMediaType === 'DOCUMENT' ? (
                                          <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <FileText size={40} className="text-zinc-400" />
                                          </div>
                                      ) : (
                                          <img src={headerUrl} alt="Preview" className="w-full h-full object-cover" />
                                      )}
                                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                                         <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-2xl border border-emerald-500 flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Listo</span>
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
                                            <span className="text-[10px] font-black text-[#111111] dark:text-[#EDE9E0] tracking-widest uppercase">Subir {headerMediaType === 'VIDEO' ? 'Video' : headerMediaType === 'DOCUMENT' ? 'Documento' : 'Imagen'}</span>
                                            <span className="text-[8px] text-zinc-400 font-bold">Hasta 20MB</span>
                                         </>
                                      )}
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept={headerMediaType === 'VIDEO' ? 'video/mp4' : headerMediaType === 'DOCUMENT' ? 'application/pdf' : 'image/*'} 
                                        onChange={handleImageUpload} 
                                        disabled={isUploadingImage} 
                                      />
                                   </label>
                                )}
                              </>
                            )}

                            {/* URL input — para todos los tipos */}
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
                                <Link2 size={14} />
                              </div>
                              <input 
                                type="text" 
                                placeholder={
                                  headerMediaType === 'IMAGE' ? 'O pega una URL de imagen...' :
                                  headerMediaType === 'VIDEO' ? 'URL del video (mp4)...' :
                                  'URL del documento (PDF)...'
                                }
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
                          value={variableMapping[v] || ''}
                          onChange={e => setVariableMapping(p => ({ ...p, [v]: e.target.value }))}
                          className="flex-1 p-2 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0]"
                        >
                          <option value="">— Seleccionar columna —</option>
                          {csvColumns.filter(c => c !== '#').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {buttonVars.length > 0 && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-[#DEDAD0]/40 dark:border-zinc-800/40 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-black text-[#6F6F6F] uppercase tracking-widest">Variables de Botones</p>
                      {buttonVars.map(bv => (
                        <div key={`button_${bv.buttonIndex}`} className="flex items-center gap-3">
                          <span className="text-xs font-bold w-28 text-blue-500 truncate" title={`Botón: ${bv.label}`}>
                            {bv.label}
                          </span>
                          <select 
                            value={variableMapping[`button_${bv.buttonIndex}`] || ''}
                            onChange={e => setVariableMapping(p => ({ ...p, [`button_${bv.buttonIndex}`]: e.target.value }))}
                            className="flex-1 p-2 rounded-xl border border-[#DEDAD0] dark:border-zinc-800 bg-transparent text-sm text-[#111111] dark:text-[#EDE9E0]"
                          >
                            <option value="">— Seleccionar columna —</option>
                            {csvColumns.filter(c => c !== '#').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1.5">
                          <RefreshCw size={12} className={isBotActive ? 'animate-spin-slow' : ''} />
                          Respuesta IA
                        </div>
                        <p className="text-[9px] text-[#6F6F6F]">Bot encendido</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBotActive(!isBotActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBotActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBotActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          Simulacro
                        </div>
                        <p className="text-[9px] text-[#6F6F6F]">Sin envío real</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDryRun(!isDryRun)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDryRun ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDryRun ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#DEDAD0]/40 dark:border-zinc-800/40 shrink-0">
                    <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-bold text-[#6F6F6F] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#EDE9E0] transition-colors">Volver</button>
                    <button 
                      onClick={handleLaunch} 
                      disabled={isSending || !campaignName || bodyVars.some(v => !variableMapping[v])} 
                      className="relative overflow-hidden flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all group"
                    >
                      {isSending && progress.total > 0 && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-black/20 transition-all duration-300"
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      )}
                      
                      <div className="relative z-10 flex items-center gap-2">
                         {isSending ? <Loader2 size={16} className="animate-spin" /> : null}
                         {isSending ? `Enviando ${progress.current} de ${progress.total}...` : `Lanzar (${parsedLeads.length} leads)`}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 flex flex-col lg:h-[calc(100vh-180px)]">
            <div className="flex items-center justify-between mb-4 shrink-0">
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

            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 border border-[#DEDAD0] dark:border-zinc-800 rounded-[2rem] bg-[#DEDAD0]/20 dark:bg-black/10 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
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
                        c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'PAUSED' ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'COMPLETED' ? 'Completado' :
                         c.status === 'PAUSED' ? 'Pausado' : 'Ejecutando'}
                      </span>
                      <span className="text-[10px] text-[#6F6F6F] font-bold">{c.leadCount} leads</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(c.status === 'PAUSED' || c.status === 'RUNNING') && (
                      <button 
                        onClick={() => handleResumeCampaign(c)}
                        className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                      >
                        Reanudar
                      </button>
                    )}
                    {c.status === 'COMPLETED' && (
                      <button 
                        onClick={() => handleRetryFailedCampaign(c)}
                        className="px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                      >
                        Reintentar Fallidos
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        setIsLoadingLogs(true);
                        setShowLogsModal(true);
                        setActiveCampaign(c);
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
                      <select
                        value={logStatusFilter}
                        onChange={(e) => setLogStatusFilter(e.target.value)}
                        className="bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-[#EDE9E0] rounded-md px-2 py-1 outline-none border border-transparent focus:border-emerald-500 transition-colors"
                      >
                        <option value="ALL">Todos</option>
                        <option value="SENT">Enviado</option>
                        <option value="DELIVERED">Recibido</option>
                        <option value="READ">Leído</option>
                        <option value="FAILED">Fallido</option>
                      </select>
                      <button 
                        onClick={async () => {
                          setIsLoadingLogs(true);
                          if (activeLogs.length > 0) {
                            const logs = await fetchCampaignLogs(activeLogs[0].campaignId);
                            setActiveLogs(logs);
                          }
                          setIsLoadingLogs(false);
                        }}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-emerald-600"
                        title="Actualizar estados"
                      >
                        <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
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
                    activeLogs.filter((log: any) => {
                      if (logStatusFilter === 'ALL') return true;
                      if (logStatusFilter === 'FAILED') return log.status !== 'SENT' && log.status !== 'DELIVERED' && log.status !== 'READ';
                      return log.status === logStatusFilter;
                    }).length === 0 ? (
                      <div className="text-center py-12 opacity-50">
                         <p className="text-sm">No hay registros con este estado.</p>
                      </div>
                    ) : (
                      activeLogs.filter((log: any) => {
                        if (logStatusFilter === 'ALL') return true;
                        if (logStatusFilter === 'FAILED') return log.status !== 'SENT' && log.status !== 'DELIVERED' && log.status !== 'READ';
                        return log.status === logStatusFilter;
                      }).map((log: any) => {
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
                             <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0]">
                                   {log.leadName ? log.leadName : log.phone}
                                </span>
                                {log.leadName && (
                                  <span className="text-[10px] text-[#6F6F6F] mt-0.5">{log.phone}</span>
                                )}
                                {log.error && <p className="text-[10px] text-red-500 font-medium">{log.error}</p>}
                             </div>
                          </div>
                          <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${badgeColor}`}>
                             {badgeText}
                          </div>
                       </div>
                       );
                    })
                    )
                )}
             </div>
             
             <div className="p-8 bg-zinc-50 dark:bg-black/10 border-t border-[#DEDAD0] dark:border-zinc-800 flex justify-between items-center">
                 <button 
                    onClick={async () => {
                        if (!activeCampaign?.csvData) return;
                        try {
                           // Obtener los logs más frescos directamente de la base de datos
                           const latestLogs = await fetchCampaignLogs(activeCampaign.id);
                           const originalData = JSON.parse(activeCampaign.csvData);
                           if (!Array.isArray(originalData)) return;

                           // Mapear logs por telefono para busqueda rapida
                           const logsMap: Record<string, any> = {};
                           latestLogs.forEach((l: any) => {
                             // Normalize phone: try to match with or without 503 prefix
                             logsMap[l.phone] = l;
                             if (l.phone.startsWith('503') && l.phone.length === 11) {
                               logsMap[l.phone.substring(3)] = l;
                             }
                           });

                           const mapping = JSON.parse(activeCampaign.variableMapping || '{}');
                           // Buttons from the template (QUICK_REPLY type buttons - not URL)
                           const allButtons: any[] = mapping.__buttonsConfig ? JSON.parse(mapping.__buttonsConfig) : [];
                           const quickReplyButtons = allButtons.filter((btn: any) => btn.type === 'QUICK_REPLY');

                           const originalHeaders = Object.keys(originalData[0] || {});
                           // One extra column per quick reply button, named after the button text
                           const buttonHeaders = quickReplyButtons.map((btn: any) => btn.text);
                           const headers = [...originalHeaders, "WhatsApp_Status", "WhatsApp_Error", ...buttonHeaders];
                           
                           const rows = originalData.map((row: any) => {
                               const rawPhone = String(row['#'] || '').replace(/[^0-9]/g, '');
                               const phone = rawPhone.length === 8 ? '503' + rawPhone : rawPhone;
                               const log = logsMap[phone] || logsMap[rawPhone];
                               const buttonReplies: string[] = log?.buttonReplies || [];
                               
                               const statusES: Record<string, string> = {
                                   SENT: 'ENVIADO', DELIVERED: 'ENTREGADO', READ: 'LEIDO', FAILED: 'FALLIDO',
                                   NO_INTENTADO: 'NO_INTENTADO'
                               };

                               const rowData = [
                                   ...originalHeaders.map(h => row[h]),
                                   statusES[log?.status] || 'NO_INTENTADO',
                                   log?.error || '',
                                   ...quickReplyButtons.map((btn: any) =>
                                       buttonReplies.includes(btn.text) ? btn.text : ""
                                   )
                               ];
                               return rowData;
                           });
                           
                           const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                           const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                           const url = URL.createObjectURL(blob);
                           const link = document.createElement("a");
                           link.setAttribute("href", url);
                           link.setAttribute("download", `Reporte_Completo_${activeCampaign.name}.csv`);
                           document.body.appendChild(link);
                           link.click();
                           document.body.removeChild(link);
                        } catch (e) {
                           console.error("Error generando CSV completo:", e);
                           alert("Error al generar el CSV completo");
                        }
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

      {/* Modal de Progreso de Envío / Pausa */}
      {isSending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-white dark:bg-[#111111] w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-[#DEDAD0] dark:border-zinc-800 p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center animate-pulse">
              <Loader2 size={32} className="animate-spin" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-[#111111] dark:text-[#EDE9E0]">
                {isPaused ? 'Pausando envío...' : 'Procesando Difusión...'}
              </h3>
              <p className="text-sm text-[#6F6F6F]">
                Enviando {progress.current} de {progress.total} mensajes
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#DEDAD0] dark:bg-zinc-800 h-3 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>

            <button
              disabled={isPaused}
              onClick={handlePauseCampaign}
              className="mt-2 w-full py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors uppercase tracking-widest text-xs disabled:opacity-40"
            >
              {isPaused ? 'PAUSANDO...' : 'PAUSAR CAMPAÑA'}
            </button>
          </div>
        </div>
      )}
    </div>
    </DesktopOnlyGuard>
  );
}
