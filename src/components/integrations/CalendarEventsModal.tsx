'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getCalendarConfig } from '@/app/actions/calendar';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  htmlLink?: string;
}

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

interface CalendarEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function CalendarEventsModal({ isOpen, onClose, projectId }: CalendarEventsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Cargar configuración de calendarios seleccionados y sus nombres
  useEffect(() => {
    if (!isOpen || !projectId) return;

    async function init() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Obtener la config del proyecto para ver qué calendarios están seleccionados
        const config = await getCalendarConfig();
        const selectedIds = config?.selectedCalendarIds || [];

        // 2. Obtener la lista de calendarios reales de Nango/Google
        const res = await fetch(`/api/integrations/calendars?projectId=${projectId}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Error al cargar calendarios');
        
        const allCalendars: CalendarOption[] = data.calendars || [];
        
        // 3. Filtrar para mostrar solo los seleccionados (o el principal por defecto)
        let displayCalendars = allCalendars.filter(c => selectedIds.includes(c.id));
        if (displayCalendars.length === 0) {
          // Si no hay ninguno guardado en config, asumimos el primary
          const primary = allCalendars.find(c => c.primary);
          if (primary) displayCalendars = [primary];
        }

        setCalendars(displayCalendars);
        if (displayCalendars.length > 0) {
          setActiveCalendarId(displayCalendars[0].id);
        } else if (allCalendars.length > 0) {
           setActiveCalendarId(allCalendars[0].id);
           setCalendars([allCalendars[0]]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido al iniciar');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [isOpen, projectId]);

  // Cargar eventos del mes actual y calendario activo
  useEffect(() => {
    if (!activeCalendarId || !isOpen || !projectId) return;

    async function fetchEvents() {
      if (!activeCalendarId) return;
      try {
        setLoadingEvents(true);
        const monthStr = format(currentDate, 'yyyy-MM');
        const res = await fetch(`/api/integrations/calendars/events?projectId=${projectId}&calendarId=${encodeURIComponent(activeCalendarId)}&month=${monthStr}`);
        const data = await res.json();
        
        if (res.ok && data.events) {
          setEvents(data.events);
        } else {
          console.error(data.error);
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchEvents();
  }, [activeCalendarId, currentDate, isOpen, projectId]);

  if (!isOpen) return null;

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Generar grid de fechas para el calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Eventos del día seleccionado
  const selectedDayEvents = events.filter(ev => {
    if (!ev.start) return false;
    const evDate = parseISO(ev.start);
    return isSameDay(evDate, selectedDate);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1714] w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <CalendarIcon className="text-blue-500" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Visor de Citas</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tus eventos programados en Google Calendar.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500 px-6 text-center">
            {error}
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT PANEL: Calendar Grid */}
            <div className="w-full md:w-[60%] border-r border-[#DEDAD0] dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-black/20">
              
              {/* Calendar Selector (Filter) */}
              {calendars.length > 1 && (
                <div className="p-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex gap-2 overflow-x-auto custom-scrollbar">
                  {calendars.map(cal => (
                    <button
                      key={cal.id}
                      onClick={() => setActiveCalendarId(cal.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                        activeCalendarId === cal.id
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-blue-500/50'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cal.backgroundColor || (activeCalendarId === cal.id ? '#fff' : '#4285F4') }}
                      />
                      {cal.summary}
                    </button>
                  ))}
                </div>
              )}

              {/* Month Navigation */}
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex gap-1">
                  <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="px-4 pb-6 flex-1 flex flex-col">
                <div className="grid grid-cols-7 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 flex-1 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    
                    // Count events for this day
                    const dayEvents = events.filter(ev => ev.start && isSameDay(parseISO(ev.start), day));
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={`relative flex flex-col items-center p-1 rounded-xl transition-all min-h-[60px] ${
                          !isCurrentMonth ? 'opacity-30' : 'opacity-100'
                        } ${
                          isSelected 
                            ? 'bg-blue-500/10 border-blue-500/50' 
                            : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                        } border`}
                      >
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-1 ${
                          isTodayDate 
                            ? 'bg-blue-500 text-white' 
                            : isSelected 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Event Indicators */}
                        <div className="mt-auto flex flex-wrap justify-center gap-1 w-full px-1 pb-1">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-zinc-500 font-bold">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Events List */}
            <div className="w-full md:w-[40%] flex flex-col bg-white dark:bg-[#1A1714]">
              <div className="p-6 border-b border-[#DEDAD0] dark:border-zinc-800">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white capitalize">
                  {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'cita programada' : 'citas programadas'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {loadingEvents ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500 opacity-60">
                    <CalendarIcon className="w-12 h-12 mb-3 stroke-1" />
                    <p className="text-sm">No hay citas para este día.</p>
                  </div>
                ) : (
                  selectedDayEvents.map(ev => {
                    const startStr = ev.start ? format(parseISO(ev.start), 'HH:mm') : '';
                    const endStr = ev.end ? format(parseISO(ev.end), 'HH:mm') : '';
                    
                    return (
                      <div 
                        key={ev.id}
                        className="group flex flex-col p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight pr-4">
                            {ev.summary || 'Cita sin título'}
                          </h4>
                          {ev.htmlLink && (
                            <a 
                              href={ev.htmlLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg shrink-0 hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                          <Clock size={12} />
                          <span>{startStr} - {endStr}</span>
                        </div>
                        
                        {ev.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
