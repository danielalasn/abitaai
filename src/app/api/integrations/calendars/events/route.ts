import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nango } from '@/lib/integrations/nangoClient';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const calendarId = searchParams.get('calendarId');
  const month = searchParams.get('month'); // YYYY-MM

  if (!projectId || !calendarId) {
    return NextResponse.json({ error: 'Se requiere projectId y calendarId' }, { status: 400 });
  }

  const nangoConn = await prisma.nangoConnection.findUnique({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey: 'google-calendar' } },
  });

  if (!nangoConn || nangoConn.status !== 'CONNECTED') {
    return NextResponse.json({ error: 'No hay conexión activa de Google Calendar' }, { status: 404 });
  }

  try {
    let timeMin: string;
    let timeMax: string;

    if (month) {
      const date = parseISO(`${month}-01`);
      timeMin = startOfMonth(date).toISOString();
      timeMax = endOfMonth(date).toISOString();
    } else {
      // Default to current month if not specified
      const date = new Date();
      timeMin = startOfMonth(date).toISOString();
      timeMax = endOfMonth(date).toISOString();
    }

    const response = await nango.get({
      providerConfigKey: 'google-calendar',
      connectionId: nangoConn.connectionId,
      baseUrlOverride: 'https://www.googleapis.com',
      endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      params: { 
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime'
      },
    });

    const events = (response.data?.items || []).map((ev: any) => ({
      id: ev.id,
      summary: ev.summary,
      description: ev.description,
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      htmlLink: ev.htmlLink
    }));

    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    const status = err?.response?.status || err?.status;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 424 || message.includes('424')) {
      return NextResponse.json({ error: 'Tu conexión con Google Calendar ha expirado o fue revocada. Por favor desconecta y vuelve a conectar tu cuenta.' }, { status: 424 });
    }
    console.error('[Calendar Events API Error]:', message);
    return NextResponse.json({ error: `Error al obtener eventos: ${message}` }, { status: 500 });
  }
}
