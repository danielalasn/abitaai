'use client';

import { useState, useEffect } from 'react';
import { getCalendarConfig, saveCalendarConfig } from '@/app/actions/calendar';
import { Loader2, CheckCircle2, Calendar, Plus, X } from 'lucide-react';

export default function CalendarConfigPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

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

  return (
    <div className="bg-white dark:bg-[#111111]/60 border border-[#DEDAD0] dark:border-zinc-800/80 rounded-3xl p-6 shadow-lg shadow-black/5 dark:shadow-none transition-all duration-500 mt-6">
      <div className="flex items-center gap-3 mb-6">
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

      <div className="space-y-6">
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
  );
}
