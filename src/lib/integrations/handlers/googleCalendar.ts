import { nango } from '../nangoClient';
import { prisma } from '../../prisma';
import type { IntegrationHandler, IntegrationResult } from './baseHandler';

const PROVIDER_CONFIG_KEY = 'google-calendar';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
}

/**
 * Handler de Google Calendar.
 * Todas las peticiones pasan por el proxy de Nango, que gestiona
 * el refresh automático de tokens OAuth.
 */
export class GoogleCalendarHandler implements IntegrationHandler {
  async execute(
    action: string,
    payload: Record<string, unknown>,
    connectionId: string
  ): Promise<IntegrationResult> {
    // Resolve selected calendars from config (fallback to 'primary')
    const projectId = payload.projectId as string | undefined;
    let calendarIds: string[] = ['primary'];
    if (projectId) {
      try {
        const config = await prisma.calendarConfig.findUnique({ where: { projectId } });
        if (config?.selectedCalendarIds?.length) {
          calendarIds = config.selectedCalendarIds;
        }
      } catch { /* ignore — use primary */ }
    }

    switch (action) {
      case 'CHECK_AVAILABILITY':
        return this.checkAvailability(payload, connectionId, calendarIds);
      case 'CREATE_BOOKING':
        return this.createBooking(payload, connectionId, calendarIds[0]);
      case 'CANCEL_BOOKING':
        return this.cancelBooking(payload, connectionId, calendarIds[0]);
      default:
        return { success: false, error: `Acción no reconocida: ${action}` };
    }
  }

  /**
   * Obtiene los eventos de un día y devuelve bloques ocupados/libres.
   * Payload: { date: "YYYY-MM-DD", timeZone: string }
   */
  private async checkAvailability(
    payload: Record<string, unknown>,
    connectionId: string,
    calendarIds: string[] = ['primary']
  ): Promise<IntegrationResult> {
    const date = payload.date as string;
    const timeZone = (payload.timeZone as string) || 'America/Mexico_City';

    if (!date) return { success: false, error: 'Se requiere el campo "date" (YYYY-MM-DD)' };

    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59`).toISOString();

    try {
      // Query all selected calendars in parallel
      const results = await Promise.all(calendarIds.map(calId =>
        nango.get({
          providerConfigKey: PROVIDER_CONFIG_KEY,
          connectionId,
          baseUrlOverride: 'https://www.googleapis.com',
          endpoint: `/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
          params: {
            timeMin: dayStart,
            timeMax: dayEnd,
            singleEvents: 'true',
            orderBy: 'startTime',
            timeZone,
          },
        })
      ));

      const events: CalendarEvent[] = results
        .flatMap(r => r.data?.items || [])
        .filter((e: CalendarEvent) => e.status !== 'cancelled');

      const busySlots = events.map((e) => ({
        summary: e.summary || 'Ocupado',
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date,
      }));

      return {
        success: true,
        data: {
          date,
          timeZone,
          busySlots,
          totalEvents: busySlots.length,
          message:
            busySlots.length === 0
              ? `El ${date} está completamente libre.`
              : `El ${date} tiene ${busySlots.length} evento(s) agendado(s).`,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Error al consultar Google Calendar: ${message}` };
    }
  }

  /**
   * Crea un evento en el calendario.
   * Payload: { date, startTime, endTime, summary, description, attendeeEmail? }
   */
  private async createBooking(
    payload: Record<string, unknown>,
    connectionId: string,
    calendarId: string = 'primary'
  ): Promise<IntegrationResult> {
    const { date, startTime, endTime, summary, description, attendeeEmail } = payload as {
      date: string;
      startTime: string;
      endTime: string;
      summary: string;
      description?: string;
      attendeeEmail?: string;
    };

    if (!date || !startTime || !endTime || !summary) {
      return { success: false, error: 'Se requieren: date, startTime, endTime, summary' };
    }

    const attendees = attendeeEmail ? [{ email: attendeeEmail }] : [];

    const eventBody = {
      summary,
      description: description || '',
      start: { dateTime: `${date}T${startTime}`, timeZone: 'America/Mexico_City' },
      end: { dateTime: `${date}T${endTime}`, timeZone: 'America/Mexico_City' },
      attendees,
    };

    try {
      const response = await nango.post({
        providerConfigKey: PROVIDER_CONFIG_KEY,
        connectionId,
        baseUrlOverride: 'https://www.googleapis.com',
        endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        data: eventBody,
      });

      return {
        success: true,
        data: {
          eventId: response.data?.id,
          htmlLink: response.data?.htmlLink,
          summary: response.data?.summary,
          start: response.data?.start,
          end: response.data?.end,
          message: `Cita "${summary}" agendada para el ${date} de ${startTime} a ${endTime}.`,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Error al crear evento en Google Calendar: ${message}` };
    }
  }

  /**
   * Cancela un evento por ID.
   * Payload: { eventId: string }
   */
  private async cancelBooking(
    payload: Record<string, unknown>,
    connectionId: string,
    calendarId: string = 'primary'
  ): Promise<IntegrationResult> {
    const eventId = payload.eventId as string;
    if (!eventId) return { success: false, error: 'Se requiere el campo "eventId"' };

    try {
      await nango.delete({
        providerConfigKey: PROVIDER_CONFIG_KEY,
        connectionId,
        baseUrlOverride: 'https://www.googleapis.com',
        endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      });

      return {
        success: true,
        data: { message: `Evento ${eventId} cancelado correctamente.` },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Error al cancelar evento: ${message}` };
    }
  }
}
