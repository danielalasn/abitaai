import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/integrations/status?projectId=xxx&provider=google-calendar
 *
 * Devuelve si un proyecto tiene una integración Nango activa para el proveedor dado.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const provider = searchParams.get('provider');

  if (!projectId || !provider) {
    return NextResponse.json({ error: 'Se requieren projectId y provider' }, { status: 400 });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { email: session.user.email! } },
  });

  if (!project) {
    return NextResponse.json({ connected: false });
  }

  const conn = await prisma.nangoConnection.findUnique({
    where: { projectId_providerConfigKey: { projectId, providerConfigKey: provider } },
  });

  return NextResponse.json({
    connected: conn?.status === 'CONNECTED',
    status: conn?.status || null,
  });
}
