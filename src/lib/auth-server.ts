import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function getCurrentProject() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) return null;
  
  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: { agents: true, client: true }
  });

  // Eliminado el fallback automático al master project para garantizar data isolation y no mezclar tokens de Meta entre clientes.

  return project;
}
