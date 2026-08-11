'use client';

import { useState, useEffect, useRef } from 'react';
import { getCalendarConfig, saveCalendarConfig } from '@/app/actions/calendar';
import { Loader2, CheckCircle2, Calendar, Plus, X, ChevronDown, RefreshCw, Users, Lock, Infinity } from 'lucide-react';

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
  const [maxCapacityPerSlot, setMaxCapacityPerSlot] = useState<number>(1);
  const [customCapacity, setCustomCapacity] = useState<string>('');
  const [fieldsToCollect, setFieldsToCollect] = useState<string[]>(['nombre_cliente']);
  const [newField, setNewField] = useState('');
  const [eventTitle, setEventTitle] = useState('Cita / Reserva - {{nombre_cliente}}');
  const [eventDescription, setEventDescription] = useState('Cliente: {{nombre_cliente}}\\nAgendado via Abita AI.');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [confirmationMessage, setConfirmationMessage] = useState('¡Listo! Su cita ha sido agendada para el {{fecha}} a las {{hora_inicio}}.');

  // Derived
  const isMultiBooking = maxCapacityPerSlot !== 1;
  const allVars = ['fecha', 'hora_inicio', 'hora_fin', ...fieldsToCollect];
  const titleVars = isMultiBooking ? ['fecha', 'hora_inicio', 'hora_fin'] : allVars;

  const VariableToolbar = ({ vars, onInsert }: { vars: string[]; onInsert: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {vars.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(`{{${v}}}`)}
          className="px-2 py-1 text-[10px] font-bold bg-[#F36A2D]/10 text-[#F36A2D] border border-[#F36A2D]/20 rounded-md hover:bg-[#F36A2D]/20 transition-colors"
        >
          +{v}
        </button>
      ))}
    </div>
  );

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getCalendarConfig();
        if (config) {
          setSelectedCalendarIds(config.selectedCalendarIds || []);
          setFieldsToCollect(config.fieldsToCollect?.length > 0 ? config.fieldsToCollect : ['nombre_cliente']);
          const cap = config.maxCapacityPerSlot ?? 1;
          setMaxCapacityPerSlot(cap);
          if (cap > 1) setCustomCapacity(String(cap));
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
    if (isMultiBooking) {
      const usedClientVars = fieldsToCollect.filter(f => 
        eventTitle.includes(`{{${f}}}`) || eventDescription.includes(`{{${f}}}`)
      );
      
      if (usedClientVars.length > 0) {
        alert(`Error: En modo grupal no puedes usar variables exclusivas de cliente como {{${usedClientVars[0]}}} en el título o descripción, ya que el evento es compartido por varias personas.`);
        return;
      }
    }

    setIsSaving(true);
    setSaveStatus(null);
    const finalDuration = typeof durationMinutes === 'number' ? durationMinutes : 60;
    try {
      await saveCalendarConfig(
        selectedCalendarIds,
        fieldsToCollect,
        eventTitle,
        eventDescription,
        finalDuration,
        confirmationMessage,
        maxCapacityPerSlot
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
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Datos a pedir al cliente (Variables)</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              La IA se asegurará de preguntar estos datos antes de poder agendar la cita. Crea aquí las variables (ej: nombre_cliente, motivo_consulta). Luego podrás usar estas variables en el título y descripción del evento. "nombre_cliente" es obligatorio por defecto.
            </p>
            <div className="flex gap-2">
              <input
                value={newField}
                onChange={e => setNewField(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddField()}
                placeholder="ej: nombre_cliente"
                className="flex-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
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

          {/* ── Modo de reservas ── */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Modo de reservas por horario</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Define cuántas personas pueden reservar el mismo bloque de tiempo.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {/* Exclusivo */}
              <button
                type="button"
                onClick={() => setMaxCapacityPerSlot(1)}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                  maxCapacityPerSlot === 1
                    ? 'border-[#F36A2D] bg-[#F36A2D]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${ maxCapacityPerSlot === 1 ? 'bg-[#F36A2D]/15' : 'bg-zinc-100 dark:bg-zinc-800' }`}>
                  <Lock size={14} className={maxCapacityPerSlot === 1 ? 'text-[#F36A2D]' : 'text-zinc-400'} />
                </div>
                <span className={`text-xs font-bold ${ maxCapacityPerSlot === 1 ? 'text-[#F36A2D]' : 'text-zinc-700 dark:text-zinc-300' }`}>Exclusivo</span>
                <span className="text-[10px] text-zinc-400 leading-tight">1 reserva por slot. Cuando alguien aparta, ese horario se cierra para todos.</span>
              </button>

              {/* Con cupo */}
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(customCapacity);
                  setMaxCapacityPerSlot(!isNaN(n) && n > 1 ? n : 2);
                  if (!customCapacity) setCustomCapacity('2');
                }}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                  maxCapacityPerSlot > 1
                    ? 'border-[#F36A2D] bg-[#F36A2D]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${ maxCapacityPerSlot > 1 ? 'bg-[#F36A2D]/15' : 'bg-zinc-100 dark:bg-zinc-800' }`}>
                  <Users size={14} className={maxCapacityPerSlot > 1 ? 'text-[#F36A2D]' : 'text-zinc-400'} />
                </div>
                <span className={`text-xs font-bold ${ maxCapacityPerSlot > 1 ? 'text-[#F36A2D]' : 'text-zinc-700 dark:text-zinc-300' }`}>Con cupo</span>
                <span className="text-[10px] text-zinc-400 leading-tight">Múltiples personas hasta un máximo. Ideal para clases, talleres o sesiones grupales.</span>
              </button>

              {/* Ilimitado */}
              <button
                type="button"
                onClick={() => setMaxCapacityPerSlot(0)}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                  maxCapacityPerSlot === 0
                    ? 'border-[#F36A2D] bg-[#F36A2D]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${ maxCapacityPerSlot === 0 ? 'bg-[#F36A2D]/15' : 'bg-zinc-100 dark:bg-zinc-800' }`}>
                  <Infinity size={14} className={maxCapacityPerSlot === 0 ? 'text-[#F36A2D]' : 'text-zinc-400'} />
                </div>
                <span className={`text-xs font-bold ${ maxCapacityPerSlot === 0 ? 'text-[#F36A2D]' : 'text-zinc-700 dark:text-zinc-300' }`}>Ilimitado</span>
                <span className="text-[10px] text-zinc-400 leading-tight">Sin límite. El bot siempre confirmará disponibilidad y creará un registro por persona.</span>
              </button>
            </div>

            {/* Input de cupo cuando modo = Con cupo */}
            {maxCapacityPerSlot > 1 && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-zinc-500">Cupo máximo:</span>
                <input
                  type="number"
                  min={2}
                  value={customCapacity}
                  placeholder="ej: 20"
                  onChange={e => {
                    const val = e.target.value;
                    setCustomCapacity(val);
                    const n = parseInt(val);
                    if (!isNaN(n) && n > 1) setMaxCapacityPerSlot(n);
                  }}
                  className="w-24 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
                />
                <span className="text-[10px] text-[#F36A2D] font-semibold">personas por horario</span>
              </div>
            )}

            {/* Aviso modo grupal */}
            {isMultiBooking && (
              <div className="mt-1 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mb-1">Modo grupal activo</p>
                <ul className="text-[10px] text-amber-600 dark:text-amber-500 space-y-1 list-disc list-inside">
                  <li>Cada persona genera su propia reserva, todas vinculadas al mismo evento en Google Calendar.</li>
                  <li>El <strong>título del evento</strong> será estático (sin variables de cliente) ya que es compartido.</li>
                  <li>La <strong>descripción del evento</strong> se actualiza automáticamente con la lista de asistentes cada vez que alguien reserva.</li>
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/40" />

          {/* Duración */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Duración de la cita (minutos)</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              ¿Cuánto tiempo bloqueamos en el calendario para cada cita agendada por la IA?
            </p>
            <input
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value) || 60)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Título del evento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Título del evento en tu Google Calendar</label>
            {isMultiBooking ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                En modo grupal el título es <strong>compartido</strong> por todos los asistentes del mismo slot. Usa un nombre estático (ej: &quot;Clase de Baile&quot;) o variables de tiempo como <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{'{{hora_inicio}}'}</code>.
                Las variables de cliente (ej: <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{'{{nombre_cliente}}'}</code>) no aplican aquí.
              </p>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Así aparecerá el evento bloqueado en tu calendario de Google. Haz clic en las variables anaranjadas para insertarlas.
              </p>
            )}
            
            <VariableToolbar vars={titleVars} onInsert={(val) => setEventTitle(prev => prev + val)} />
            
            <input
              type="text"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Descripción del evento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Descripción interna del evento</label>
            {isMultiBooking ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Agrega aquí el contexto general del evento (ej: &quot;Sesión de baile - Nivel intermedio&quot;).
                </p>
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                  <span className="text-blue-500 text-[10px] font-bold mt-0.5 shrink-0">ℹ</span>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">
                    La lista de asistentes se agregará <strong>automáticamente</strong> debajo de esta descripción cada vez que alguien reserve. No necesitas agregarla manualmente.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Esta es la información que se guardará dentro de la descripción del evento en tu Google Calendar.
              </p>
            )}
            
            <VariableToolbar vars={titleVars} onInsert={(val) => setEventDescription(prev => prev + val)} />
            
            <textarea
              value={eventDescription}
              onChange={e => setEventDescription(e.target.value)}
              rows={3}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
            />
          </div>

          {/* Confirmation Message */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-900 dark:text-[#EDE9E0]">Respuesta final de la IA (Confirmación)</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Este es el mensaje exacto que enviará la IA por WhatsApp al cliente justo después de haber guardado la cita exitosamente.
            </p>
            <VariableToolbar vars={allVars} onInsert={(val) => setConfirmationMessage(prev => prev + val)} />
            <textarea
              value={confirmationMessage}
              onChange={e => setConfirmationMessage(e.target.value)}
              rows={2}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#F36A2D]"
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
