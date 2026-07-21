import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/integrations/connect
 *
 * Guarda o actualiza el NangoConnection después de que el frontend
 * completa el flujo OAuth de Nango.
 *
 * Body: { projectId, providerConfigKey, connectionId }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, providerConfigKey, connectionId } = body;

  if (!projectId || !providerConfigKey || !connectionId) {
    return NextResponse.json(
      { error: 'Se requieren: projectId, providerConfigKey, connectionId' },
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

  // Upsert de la conexión Nango
  const connection = await prisma.nangoConnection.upsert({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey } },
    update: { connectionId, status: 'CONNECTED', updatedAt: new Date() },
    create: { projectId, providerConfigKey, connectionId, status: 'CONNECTED' },
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

  await prisma.nangoConnection.updateMany({
    where: { projectId, providerConfigKey },
    data: { status: 'DISCONNECTED' },
  });

  return NextResponse.json({ success: true });
}
