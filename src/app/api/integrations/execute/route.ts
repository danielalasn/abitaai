import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeIntegration } from '@/lib/integrations/integrationFactory';

/**
 * POST /api/integrations/execute
 *
 * Endpoint unificado llamado por el orquestador de IA (Claude)
 * cuando emite un [ACTION: CALENDAR ...] tag.
 *
 * Body:
 * {
 *   projectId: string,
 *   provider: "google-calendar",
 *   action: "CHECK_AVAILABILITY" | "CREATE_BOOKING" | "CANCEL_BOOKING",
 *   payload: { ... }
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: {
    projectId?: string;
    provider?: string;
    action?: string;
    payload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { projectId, provider, action, payload } = body;

  if (!projectId || !provider || !action) {
    return NextResponse.json(
      { error: 'Se requieren: projectId, provider, action' },
      { status: 400 }
    );
  }

  // Buscar la conexión Nango del proyecto para el proveedor solicitado
  const nangoConn = await prisma.nangoConnection.findUnique({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey: provider } },
  });

  if (!nangoConn || nangoConn.status !== 'CONNECTED') {
    return NextResponse.json(
      {
        error: `El proyecto no tiene una integración activa con "${provider}". Conecta primero desde Settings.`,
      },
      { status: 404 }
    );
  }

  // Ejecutar la acción via el factory
  const result = await executeIntegration(
    provider,
    action,
    payload || {},
    nangoConn.connectionId
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
