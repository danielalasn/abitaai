import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nango } from '@/lib/integrations/nangoClient';

/**
 * POST /api/integrations/connect
 *
 * Guarda o actualiza el NangoConnection después de que el frontend
 * completa el flujo OAuth de Nango.
 * 
 * Consulta a Nango el connection_id real (UUID) asignado al end_user (projectId).
 *
 * Body: { projectId, providerConfigKey }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, providerConfigKey } = body;

  if (!projectId || !providerConfigKey) {
    return NextResponse.json(
      { error: 'Se requieren: projectId, providerConfigKey' },
      { status: 400 }
    );
  }

  // Verificar que el proyecto pertenece al cliente autenticado
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { email: session.user.email! } },
  });

  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado o acceso denegado' }, { status: 404 });
  }

  // Obtener el connection_id real de Nango (el popup le asigna un UUID, no el projectId)
  let realConnectionId: string | null = null;
  try {
    const connections = await nango.listConnections();
    const match = connections.connections?.find(
      (c: any) =>
        c.provider_config_key === providerConfigKey &&
        c.end_user?.id === projectId
    );
    realConnectionId = match?.connection_id || null;
  } catch (err) {
    console.error('[Nango] Error listando conexiones:', err);
  }

  if (!realConnectionId) {
    return NextResponse.json(
      { error: 'No se encontró la conexión en Nango. Asegúrate de completar el flujo OAuth.' },
      { status: 404 }
    );
  }

  // Upsert de la conexión Nango con el connection_id real
  const connection = await prisma.nangoConnection.upsert({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey } },
    update: { connectionId: realConnectionId, status: 'CONNECTED', updatedAt: new Date() },
    create: { projectId, providerConfigKey, connectionId: realConnectionId, status: 'CONNECTED' },
  });

  return NextResponse.json({ success: true, connection });
}


/**
 * DELETE /api/integrations/connect
 *
 * Desconecta una integración (marca como DISCONNECTED).
 * Body: { projectId, providerConfigKey }
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, providerConfigKey } = body;

  if (!projectId || !providerConfigKey) {
    return NextResponse.json(
      { error: 'Se requieren: projectId, providerConfigKey' },
      { status: 400 }
    );
  }

  // Verificar ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { email: session.user.email! } },
  });

  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado o acceso denegado' }, { status: 404 });
  }

  const nangoConn = await prisma.nangoConnection.findFirst({
    where: { projectId, providerConfigKey }
  });

  if (nangoConn && nangoConn.connectionId) {
    try {
      await nango.deleteConnection(providerConfigKey, nangoConn.connectionId);
      console.log(`[Nango] Conexión ${nangoConn.connectionId} eliminada en Nango.`);
    } catch (err) {
      console.error('[Nango] Error eliminando conexión en Nango:', err);
    }
  }

  await prisma.nangoConnection.updateMany({
    where: { projectId, providerConfigKey },
    data: { status: 'DISCONNECTED' },
  });

  return NextResponse.json({ success: true });
}
