import { format, addDays, getDay, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

const TIMEZONE = 'America/El_Salvador';
const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY || '';
const NANGO_API = 'https://api.nango.dev';

// --- Funciones Internas --- //

async function _getNangoConnectionId(projectId: string, provider = 'google-calendar'): Promise<string | null> {
  try {
    const res = await fetch(`${NANGO_API}/connection`, {
      headers: {
        'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    for (const conn of (data.connections || [])) {
      if (conn.provider_config_key === provider && conn.end_user?.id === projectId) {
        return conn.connection_id;
      }
    }
    return null;
  } catch (err) {
    console.error('[Calendar] Error obteniendo connection_id', err);
    return null;
  }
}

async function _getAccessToken(connectionId: string, provider = 'google-calendar'): Promise<string | null> {
  try {
    const res = await fetch(`${NANGO_API}/connection/${connectionId}?provider_config_key=${provider}&refresh_token=true`, {
      headers: {
        'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.credentials?.access_token || null;
  } catch (err) {
    console.error('[Calendar] Error obteniendo token', err);
    return null;
  }
}

function _toRFC3339(dateStr: string, timeStr: string): string | null {
  console.log(`[DEBUG CALENDAR] _toRFC3339 received - dateStr: '${dateStr}', timeStr: '${timeStr}'`);
  // Ej: 2024-05-15 15:00 en America/El_Salvador
  // Limpieza robusta por si la IA envía "3:00 PM" o "3 pm" en lugar de "15:00"
  let cleanTime = (timeStr || '').trim().toLowerCase();
  let hours = 0;
  let minutes = 0;
  
  const match = cleanTime.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
  if (!match) return null;

  hours = parseInt(match[1], 10);
  minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];
  
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  
  const dateTimeStr = `${dateStr}T${hh}:${mm}:00`;
  const dateObj = new Date(`${dateTimeStr}-06:00`); // Hardcoded -6 para SLV
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  return dateObj.toISOString();
}

function _resolveDate(dateStr: string): string {
  const today = toZonedTime(new Date(), TIMEZONE);
  const lower = dateStr.toLowerCase().trim();

  if (lower === 'hoy' || lower === 'today') {
    return formatTz(today, 'yyyy-MM-dd', { timeZone: TIMEZONE });
  }
  if (lower === 'mañana' || lower === 'manana' || lower === 'tomorrow') {
    return formatTz(addDays(today, 1), 'yyyy-MM-dd', { timeZone: TIMEZONE });
  }

  const daysMap: Record<string, number> = {
    'lunes': 1, 'martes': 2, 'miercoles': 3, 'miércoles': 3,
    'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6, 'domingo': 0
  };

  if (lower in daysMap) {
    const targetWeekday = daysMap[lower];
    const currentWeekday = getDay(today);
    let daysAhead = (targetWeekday - currentWeekday + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    return formatTz(addDays(today, daysAhead), 'yyyy-MM-dd', { timeZone: TIMEZONE });
  }

  return dateStr;
}

// --- Funciones Públicas CRUD --- //

export async function checkAvailability(projectId: string, dateStr: string, startTime: string, endTime: string) {
  const resolvedDate = _resolveDate(dateStr);
  const connectionId = await _getNangoConnectionId(projectId);
  
  if (!connectionId) return { available: false, error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { available: false, error: 'No se pudo obtener token de Google.' };

  const timeMin = _toRFC3339(resolvedDate, startTime);
  const timeMax = _toRFC3339(resolvedDate, endTime);

  if (!timeMin || !timeMax) {
    return { available: false, error: 'La fecha o la hora proporcionada tienen un formato inválido. Asegúrate de usar YYYY-MM-DD y HH:MM.' };
  }

  const payload = {
    timeMin,
    timeMax,
    timeZone: TIMEZONE,
    items: [{ id: 'primary' }]
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (errorText.includes('timeRangeEmpty')) {
      return { available: false, error: 'El parámetro "end" debe ser mayor que "start". Por favor suma la duración de la cita a "start" para calcular "end".' };
    }
    return { available: false, error: errorText };
  }

  const data = await res.json();
  const busySlots = data.calendars?.primary?.busy || [];

  return {
    available: busySlots.length === 0,
    date: resolvedDate,
    start: startTime,
    end: endTime,
    busy_slots: busySlots,
    error: null
  };
}

export async function createEvent(
  projectId: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  title = 'Cita agendada',
  description = ''
) {
  const resolvedDate = _resolveDate(dateStr);
  const connectionId = await _getNangoConnectionId(projectId);
  
  if (!connectionId) return { success: false, error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { success: false, error: 'No se pudo obtener token de Google.' };

  const startRFC = _toRFC3339(resolvedDate, startTime);
  const endRFC = _toRFC3339(resolvedDate, endTime);

  if (!startRFC || !endRFC) {
    return { success: false, error: 'La fecha o la hora proporcionada tienen un formato inválido. Asegúrate de usar YYYY-MM-DD y HH:MM.' };
  }

  const payload = {
    summary: title,
    description,
    start: { dateTime: startRFC, timeZone: TIMEZONE },
    end: { dateTime: endRFC, timeZone: TIMEZONE }
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (errorText.includes('timeRangeEmpty') || errorText.includes('Invalid time range')) {
      return { success: false, error: 'El parámetro "end" debe ser estrictamente mayor que "start". Por favor suma la duración a "start" para calcular "end".' };
    }
    return { success: false, error: errorText };
  }

  const data = await res.json();
  return {
    success: true,
    event_id: data.id,
    event_link: data.htmlLink,
    date: resolvedDate,
    start: startTime,
    end: endTime,
    error: null
  };
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  title?: string
) {
  const resolvedDate = _resolveDate(dateStr);
  const connectionId = await _getNangoConnectionId(projectId);
  
  if (!connectionId) return { success: false, error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { success: false, error: 'No se pudo obtener token de Google.' };

  const startRFC = _toRFC3339(resolvedDate, startTime);
  const endRFC = _toRFC3339(resolvedDate, endTime);

  if (!startRFC || !endRFC) {
    return { success: false, error: 'La fecha o la hora proporcionada tienen un formato inválido. Asegúrate de usar YYYY-MM-DD y HH:MM.' };
  }

  const payload: any = {
    start: { dateTime: startRFC, timeZone: TIMEZONE },
    end: { dateTime: endRFC, timeZone: TIMEZONE }
  };
  if (title) payload.summary = title;

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (errorText.includes('timeRangeEmpty') || errorText.includes('Invalid time range')) {
      return { success: false, error: 'El parámetro "end" debe ser estrictamente mayor que "start". Por favor suma la duración a "start" para calcular "end".' };
    }
    return { success: false, error: errorText };
  }

  const data = await res.json();
  return {
    success: true,
    event_id: data.id,
    date: resolvedDate,
    start: startTime,
    end: endTime,
    error: null
  };
}

export async function deleteEvent(projectId: string, eventId: string) {
  const connectionId = await _getNangoConnectionId(projectId);
  if (!connectionId) return { success: false, error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { success: false, error: 'No se pudo obtener token de Google.' };

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 204) {
    return { success: false, error: await res.text() };
  }

  return { success: true, event_id: eventId, error: null };
}
