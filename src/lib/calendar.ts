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

  const startRFC = _toRFC3339(resolvedDate, startTime);
  const endRFC = _toRFC3339(resolvedDate, endTime);

  if (!startRFC || !endRFC) {
    return { available: false, error: 'La fecha o la hora proporcionada tienen un formato inválido. Asegúrate de usar YYYY-MM-DD y HH:MM.' };
  }

  const startMs = new Date(startRFC).getTime();
  const nowMs = Date.now();
  
  // Margen de gracia de 1 hora para el pasado
  if (startMs < nowMs - 60 * 60 * 1000) {
    return { available: false, error: `ERROR: La fecha/hora consultada (${resolvedDate} ${startTime}) está en el pasado. El año actual es ${new Date().getFullYear()}. Por favor corrige y usa una fecha futura.` };
  }
  // Límite de 6 meses en el futuro
  if (startMs > nowMs + 180 * 24 * 60 * 60 * 1000) {
    return { available: false, error: `ERROR: La fecha/hora consultada (${resolvedDate}) es demasiado lejana (más de 6 meses). Verifica si te equivocaste de año.` };
  }

  // --- Import prisma here to avoid circular deps ---
  const { prisma } = await import('@/lib/prisma');

  // Get the CalendarConfig to read maxCapacityPerSlot and selectedCalendarIds
  const calConfig = await prisma.calendarConfig.findUnique({
    where: { projectId },
    select: { maxCapacityPerSlot: true, selectedCalendarIds: true }
  });
  const maxCapacity = calConfig?.maxCapacityPerSlot ?? 1;
  const selectedCals = calConfig?.selectedCalendarIds?.length ? calConfig.selectedCalendarIds : ['primary'];

  console.log(`[DEBUG CALENDAR] CHECK_AVAILABILITY date: ${resolvedDate} ${startTime}-${endTime}`);
  console.log(`[DEBUG CALENDAR] Project: ${projectId}, Selected Calendars:`, selectedCals);

  // ── Mode: Unlimited (0) ──────────────────────────────────────────────────
  if (maxCapacity === 0) {
    return {
      available: true,
      date: resolvedDate,
      start: startTime,
      end: endTime,
      busy_slots: [],
      booked_count: null,
      max_capacity: null,
      error: null
    };
  }

  // ── Mode: Exclusive (1) — use Google FreeBusy (original behavior) ────────
  if (maxCapacity === 1) {
    const connectionId = await _getNangoConnectionId(projectId);
    if (!connectionId) return { available: false, error: 'Google Calendar no está conectado.' };

    const token = await _getAccessToken(connectionId);
    if (!token) return { available: false, error: 'No se pudo obtener token de Google.' };

    const timeMin = startRFC;
    const timeMax = endRFC;

    const payload = {
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: selectedCals.map(id => ({ id }))
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
    let busySlots: any[] = [];
    if (data.calendars) {
      for (const calId of Object.keys(data.calendars)) {
        if (data.calendars[calId].busy) {
          busySlots = busySlots.concat(data.calendars[calId].busy);
        }
      }
    }

    return {
      available: busySlots.length === 0,
      date: resolvedDate,
      start: startTime,
      end: endTime,
      busy_slots: busySlots,
      booked_count: null,
      max_capacity: null,
      error: null
    };
  }

  // ── Mode: Capped (N > 1) — count UserBookings in DB for this slot ────────
  const slotStartRFC = startRFC;
  const slotEndRFC   = endRFC;

  // Count bookings that overlap with the requested slot:
  // A booking overlaps if its startTime < slotEnd AND its endTime > slotStart
  const bookedCount = await prisma.userBooking.count({
    where: {
      projectId,
      date: resolvedDate,
      AND: [
        { startTime: { lt: endTime } },
        { endTime:   { gt: startTime } }
      ]
    }
  });

  const remaining = maxCapacity - bookedCount;
  const available = remaining > 0;

  return {
    available,
    date: resolvedDate,
    start: startTime,
    end: endTime,
    booked_count: bookedCount,
    max_capacity: maxCapacity,
    spots_remaining: remaining,
    busy_slots: available ? [] : [{ start: slotStartRFC, end: slotEndRFC }],
    error: null
  };
}

/**
 * CHECK_DAY: Devuelve todos los huecos libres de un día completo.
 * Hace UNA sola llamada a Google FreeBusy y calcula los slots libres
 * basándose en el horario de atención del negocio (business_start / business_end).
 */
export async function checkDayFreeSlots(
  projectId: string,
  dateStr: string,
  businessStart: string, // "HH:MM"
  businessEnd: string,   // "HH:MM"
  slotDurationMinutes: number = 60
) {
  const resolvedDate = _resolveDate(dateStr);

  console.log(`[DEBUG CALENDAR] CHECK_DAY date: ${resolvedDate} | hours: ${businessStart}-${businessEnd}`);

  const { prisma } = await import('@/lib/prisma');
  const calConfig = await prisma.calendarConfig.findUnique({
    where: { projectId },
    select: { selectedCalendarIds: true, maxCapacityPerSlot: true }
  });
  const selectedCals = calConfig?.selectedCalendarIds?.length ? calConfig.selectedCalendarIds : ['primary'];

  console.log(`[DEBUG CALENDAR] CHECK_DAY Selected Calendars:`, selectedCals);

  const timeMin = _toRFC3339(resolvedDate, businessStart);
  const timeMax = _toRFC3339(resolvedDate, businessEnd);

  if (!timeMin || !timeMax) {
    return { error: 'Formato de hora inválido.' };
  }

  // Validate not in the past (1h grace)
  const nowMs = Date.now();
  if (new Date(timeMax).getTime() < nowMs - 60 * 60 * 1000) {
    return { error: `ERROR: La fecha ${resolvedDate} ya pasó. Usa una fecha futura.` };
  }
  if (new Date(timeMin).getTime() > nowMs + 180 * 24 * 60 * 60 * 1000) {
    return { error: `ERROR: La fecha ${resolvedDate} es demasiado lejana (más de 6 meses).` };
  }

  const connectionId = await _getNangoConnectionId(projectId);
  if (!connectionId) return { error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { error: 'No se pudo obtener token de Google.' };

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: selectedCals.map(id => ({ id }))
    })
  });

  if (!res.ok) return { error: await res.text() };

  const data = await res.json();
  let busySlots: { start: string; end: string }[] = [];
  if (data.calendars) {
    for (const calId of Object.keys(data.calendars)) {
      if (data.calendars[calId].busy) {
        busySlots = busySlots.concat(data.calendars[calId].busy);
      }
    }
  }

  // Sort and deduplicate busy blocks
  busySlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Build all possible hour-slots within business hours
  const [startH, startM] = businessStart.split(':').map(Number);
  const [endH, endM] = businessEnd.split(':').map(Number);
  const businessStartMin = startH * 60 + startM;
  const businessEndMin = endH * 60 + endM;

  const freeSlots: { start: string; end: string }[] = [];
  for (let t = businessStartMin; t + slotDurationMinutes <= businessEndMin; t += slotDurationMinutes) {
    const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const slotEnd = `${String(Math.floor((t + slotDurationMinutes) / 60)).padStart(2, '0')}:${String((t + slotDurationMinutes) % 60).padStart(2, '0')}`;

    const slotStartMs = new Date(_toRFC3339(resolvedDate, slotStart)!).getTime();
    const slotEndMs = new Date(_toRFC3339(resolvedDate, slotEnd)!).getTime();

    // Skip slots already in the past
    if (slotEndMs < nowMs) continue;

    const isBusy = busySlots.some(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      return bStart < slotEndMs && bEnd > slotStartMs;
    });

    if (!isBusy) {
      freeSlots.push({ start: slotStart, end: slotEnd });
    }
  }

  console.log(`[DEBUG CALENDAR] CHECK_DAY ${resolvedDate}: ${freeSlots.length} free slots, ${busySlots.length} busy blocks`);

  return {
    date: resolvedDate,
    free_slots: freeSlots,
    busy_count: busySlots.length,
    total_checked: Math.floor((businessEndMin - businessStartMin) / slotDurationMinutes),
    error: null
  };
}

/**
 * CHECK_MULTIPLE_DAYS: Verifica un horario específico en varios días de un tirón.
 * Hace UNA sola llamada a Google FreeBusy para todo el rango de fechas.
 * Ideal para "¿qué día de la siguiente semana tienen a las 8pm?"
 */
export async function checkMultipleDays(
  projectId: string,
  startDateStr: string,  // primer día del rango "YYYY-MM-DD"
  endDateStr: string,    // último día del rango "YYYY-MM-DD"
  timeStr: string,       // hora a verificar "HH:MM"
  slotDurationMinutes: number = 60
) {
  const resolvedStart = _resolveDate(startDateStr);
  const resolvedEnd = _resolveDate(endDateStr);

  console.log(`[DEBUG CALENDAR] CHECK_MULTIPLE_DAYS ${resolvedStart} → ${resolvedEnd} at ${timeStr}`);

  const { prisma } = await import('@/lib/prisma');
  const calConfig = await prisma.calendarConfig.findUnique({
    where: { projectId },
    select: { selectedCalendarIds: true }
  });
  const selectedCals = calConfig?.selectedCalendarIds?.length ? calConfig.selectedCalendarIds : ['primary'];

  // Query Google for the whole date range at once
  const timeMin = _toRFC3339(resolvedStart, timeStr);
  // timeMax = end of last day (timeStr + duration)
  const [h, m] = timeStr.split(':').map(Number);
  const endMinutes = h * 60 + m + slotDurationMinutes;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const timeMax = _toRFC3339(resolvedEnd, endTime);

  if (!timeMin || !timeMax) {
    return { error: 'Formato de fecha/hora inválido.' };
  }

  const nowMs = Date.now();
  if (new Date(timeMax).getTime() > nowMs + 180 * 24 * 60 * 60 * 1000) {
    return { error: `ERROR: El rango de fechas es demasiado lejano (más de 6 meses).` };
  }

  const connectionId = await _getNangoConnectionId(projectId);
  if (!connectionId) return { error: 'Google Calendar no está conectado.' };

  const token = await _getAccessToken(connectionId);
  if (!token) return { error: 'No se pudo obtener token de Google.' };

  // Make one request covering the entire range
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: selectedCals.map(id => ({ id }))
    })
  });

  if (!res.ok) return { error: await res.text() };

  const data = await res.json();
  let busySlots: { start: string; end: string }[] = [];
  if (data.calendars) {
    for (const calId of Object.keys(data.calendars)) {
      if (data.calendars[calId].busy) {
        busySlots = busySlots.concat(data.calendars[calId].busy);
      }
    }
  }

  // For each day in range, check if the specific timeslot is free
  const slotDurationMs = slotDurationMinutes * 60 * 1000;
  const results: { date: string; available: boolean }[] = [];
  const startD = parseISO(resolvedStart);
  const endD = parseISO(resolvedEnd);

  for (let d = startD; d <= endD; d = addDays(d, 1)) {
    const dateStr = format(d, 'yyyy-MM-dd');
    const slotStartRFC = _toRFC3339(dateStr, timeStr);
    if (!slotStartRFC) continue;

    const slotStartMs = new Date(slotStartRFC).getTime();
    const slotEndMs = slotStartMs + slotDurationMs;

    // Skip past slots
    if (slotEndMs < nowMs) continue;

    const isBusy = busySlots.some(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      return bStart < slotEndMs && bEnd > slotStartMs;
    });

    results.push({ date: dateStr, available: !isBusy });
  }

  const freeDays = results.filter(r => r.available).map(r => r.date);
  const busyDays = results.filter(r => !r.available).map(r => r.date);

  console.log(`[DEBUG CALENDAR] CHECK_MULTIPLE_DAYS at ${timeStr}: ${freeDays.length} free, ${busyDays.length} busy`);

  return {
    time_checked: timeStr,
    free_days: freeDays,
    busy_days: busyDays,
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

  const startMs = new Date(startRFC).getTime();
  const nowMs = Date.now();
  if (startMs < nowMs - 60 * 60 * 1000) {
    return { success: false, error: `ERROR: La fecha/hora que intentas reservar (${resolvedDate} ${startTime}) está en el pasado. Por favor pide disculpas al cliente y pídele una fecha u hora en el futuro.` };
  }
  if (startMs > nowMs + 180 * 24 * 60 * 60 * 1000) {
    return { success: false, error: `ERROR: La fecha (${resolvedDate}) es demasiado lejana (más de 6 meses).` };
  }

  const payload = {
    summary: title,
    description,
    start: { dateTime: startRFC, timeZone: TIMEZONE },
    end: { dateTime: endRFC, timeZone: TIMEZONE }
  };

  const { prisma } = await import('@/lib/prisma');
  const calConfig = await prisma.calendarConfig.findUnique({
    where: { projectId },
    select: { selectedCalendarIds: true }
  });
  const targetCalendarId = calConfig?.selectedCalendarIds?.[0] || 'primary';

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
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
  title?: string,
  description?: string
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

  const startMs = new Date(startRFC).getTime();
  const nowMs = Date.now();
  if (startMs < nowMs - 60 * 60 * 1000) {
    return { success: false, error: `ERROR: La fecha/hora que intentas actualizar (${resolvedDate} ${startTime}) está en el pasado.` };
  }
  if (startMs > nowMs + 180 * 24 * 60 * 60 * 1000) {
    return { success: false, error: `ERROR: La fecha (${resolvedDate}) es demasiado lejana (más de 6 meses).` };
  }

  const payload: any = {
    start: { dateTime: startRFC, timeZone: TIMEZONE },
    end: { dateTime: endRFC, timeZone: TIMEZONE }
  };
  if (title) payload.summary = title;
  if (description !== undefined) payload.description = description;

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
    if (res.status === 404 || res.status === 410) {
      return { success: false, error: 'RESOURCE_DELETED' };
    }
    return { success: false, error: errorText };
  }

  const data = await res.json();
  if (data.status === 'cancelled') {
    return { success: false, error: 'RESOURCE_DELETED' };
  }

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
    if (res.status === 404 || res.status === 410) {
      return { success: true, event_id: eventId, error: null }; // Already deleted
    }
    return { success: false, error: await res.text() };
  }

  return { success: true, event_id: eventId, error: null };
}
