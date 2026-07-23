'use client';

import { useState, useEffect, useRef } from 'react';
import { getCalendarConfig, saveCalendarConfig } from '@/app/actions/calendar';
import { Loader2, CheckCircle2, Calendar, Plus, X, ChevronDown, RefreshCw } from 'lucide-react';

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

interface CalendarConfigPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectId?: string;
}

export default function CalendarConfigPanel({ isOpen, onClose, projectId }: CalendarConfigPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  // Calendar list state
  const [calendarList, setCalendarList] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Config state
  const [fieldsToCollect, setFieldsToCollect] = useState<string[]>([]);
  const [newField, setNewField] = useState('');
  const [eventTitle, setEventTitle] = useState('Cita / Reserva - {{nombre_cliente}}');
  const [eventDescription, setEventDescription] = useState('Cliente: {{nombre_cliente}}\\nAgendado via Abita AI.');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [confirmationMessage, setConfirmationMessage] = useState('¡Listo! Su cita ha sido agendada para el {{fecha}} a las {{hora_inicio}}.');

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getCalendarConfig();
        if (config) {
          setSelectedCalendarIds(config.selectedCalendarIds || []);
          setFieldsToCollect(config.fieldsToCollect || []);
          setEventTitle(config.eventTitle);
          setEventDescription(config.eventDescription);
          setDurationMinutes(config.durationMinutes);
          setConfirmationMessage(config.confirmationMessage);
        }
      } catch (err) {
        console.error('Error loading calendar config', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const fetchCalendars = async () => {
    if (!projectId) return;
    setLoadingCalendars(true);
    setCalendarError(null);
    try {
      const res = await fetch(`/api/integrations/calendars?projectId=${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar calendarios');
      setCalendarList(data.calendars || []);
    } catch (err: unknown) {
      setCalendarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingCalendars(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchCalendars();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectedCalendars = calendarList.filter(c => selectedCalendarIds.includes(c.id));

  const handleAddField = () => {
    if (newField.trim() && !fieldsToCollect.includes(newField.trim())) {
      setFieldsToCollect([...fieldsToCollect, newField.trim()]);
      setNewField('');
    }
  };

  const handleRemoveField = (field: string) => {
    setFieldsToCollect(fieldsToCollect.filter(f => f !== field));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await saveCalendarConfig(
        selectedCalendarIds,
        fieldsToCollect,
        eventTitle,
        eventDescription,
        durationMinutes,
        confirmationMessage
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-[#F36A2D]" />
      </div>
    );
  }

  if (isOpen === false) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1714] w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F36A2D]/10 rounded-xl">
              <Calendar className="text-[#F36A2D]" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Configuración de Google Calendar</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ajusta cómo la IA agendará las citas en tu calendario conectado.
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

          {/* ── Calendar Selector ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Calendarios a usar</label>
              <button
                onClick={fetchCalendars}
                disabled={loadingCalendars}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-[#F36A2D] transition-colors"
              >
                <RefreshCw size={12} className={loadingCalendars ? 'animate-spin' : ''} />
                Recargar
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Selecciona en cuáles calendarios el bot revisará disponibilidad y creará eventos. Si no seleccionas ninguno, usará el calendario principal.
            </p>

            {calendarError && (
              <p className="text-xs text-red-500">{calendarError}</p>
            )}

            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                <Loader2 size={14} className="animate-spin" /> Cargando calendarios...
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D] transition-colors"
                >
                  <span className="text-zinc-600 dark:text-zinc-400 truncate">
                    {selectedCalendars.length === 0
                      ? 'Calendario principal (por defecto)'
                      : selectedCalendars.map(c => c.summary).join(', ')}
                  </span>
                  <ChevronDown size={16} className={`text-zinc-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-white dark:bg-[#1A1714] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden">
                    {calendarList.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4 px-4">No se encontraron calendarios disponibles.</p>
                    ) : (
                      calendarList.map(cal => {
                        const selected = selectedCalendarIds.includes(cal.id);
                        return (
                          <button
                            key={cal.id}
                            type="button"
                            onClick={() => toggleCalendar(cal.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${selected ? 'bg-[#F36A2D]/5' : ''}`}
                          >
                            {/* Color dot */}
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                              style={{ backgroundColor: cal.backgroundColor || '#4285F4' }}
                            />
                            <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">
                              {cal.summary}
                              {cal.primary && <span className="ml-1 text-[10px] text-zinc-400">(principal)</span>}
                            </span>
                            {/* Checkbox */}
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-[#F36A2D] border-[#F36A2D]' : 'border-zinc-300 dark:border-zinc-600'}`}>
                              {selected && <CheckCircle2 size={10} className="text-white" />}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected tags */}
            {selectedCalendars.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedCalendars.map(cal => (
                  <span key={cal.id} className="flex items-center gap-1 bg-[#F36A2D]/10 text-[#F36A2D] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F36A2D]/20">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cal.backgroundColor || '#4285F4' }}
                    />
                    {cal.summary}
                    <button onClick={() => toggleCalendar(cal.id)} className="hover:text-red-500 ml-1">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/40" />

          {/* Fields to Collect */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Datos a pedir al cliente</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              La IA preguntará estos datos antes de agendar la cita. Escribe el nombre de la variable (ej: nombre_cliente, motivo).
            </p>
            <div className="flex gap-2">
              <input 
                value={newField}
                onChange={e => setNewField(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddField()}
                placeholder="ej: nombre_completo"
                className="flex-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D]"
              />
              <button 
                onClick={handleAddField}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {fieldsToCollect.map(field => (
                <span key={field} className="flex items-center gap-1 bg-[#F36A2D]/10 text-[#F36A2D] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F36A2D]/20">
                  {field}
                  <button onClick={() => handleRemoveField(field)} className="hover:text-red-500 ml-1">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Duración por cita (minutos)</label>
            <input 
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(parseInt(e.target.value) || 60)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Título del evento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Título del evento en Calendar</label>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Puedes usar las variables entre doble llave (ej: {'{{nombre_completo}}'})</p>
            <input 
              type="text"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Descripción del evento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Descripción del evento</label>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Puedes usar las variables. Se guardará en la descripción de Google Calendar.</p>
            <textarea 
              value={eventDescription}
              onChange={e => setEventDescription(e.target.value)}
              rows={3}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Confirmation Message */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Mensaje de confirmación (WhatsApp)</label>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Mensaje que el bot dirá al finalizar de agendar. Variables: {'{{fecha}}'}, {'{{hora_inicio}}'}, {'{{hora_fin}}'}</p>
            <textarea 
              value={confirmationMessage}
              onChange={e => setConfirmationMessage(e.target.value)}
              rows={2}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800/40">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3 rounded-xl text-xs font-black tracking-tight shadow-md hover:bg-[#F36A2D] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'success' ? <><CheckCircle2 size={16} /> ¡Guardado!</> : 'Guardar Calendario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
