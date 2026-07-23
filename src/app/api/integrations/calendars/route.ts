import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nango } from '@/lib/integrations/nangoClient';

/**
 * GET /api/integrations/calendars?projectId=xxx
 *
 * Obtiene la lista de calendarios de Google Calendar via Nango proxy.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 });
  }

  const nangoConn = await prisma.nangoConnection.findUnique({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey: 'google-calendar' } },
  });

  if (!nangoConn || nangoConn.status !== 'CONNECTED') {
    return NextResponse.json({ error: 'No hay conexión activa de Google Calendar' }, { status: 404 });
  }

  try {
    const response = await nango.get({
      providerConfigKey: 'google-calendar',
      connectionId: nangoConn.connectionId,
      baseUrlOverride: 'https://www.googleapis.com',
      endpoint: '/calendar/v3/users/me/calendarList',
      params: { minAccessRole: 'writer' },
    });

    const calendars = (response.data?.items || []).map((cal: {
      id: string;
      summary: string;
      primary?: boolean;
      backgroundColor?: string;
      accessRole?: string;
    }) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
    }));

    return NextResponse.json({ success: true, calendars });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al obtener calendarios: ${message}` }, { status: 500 });
  }
}
