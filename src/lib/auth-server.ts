import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function getCurrentProject() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) return null;
  
  return prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: { botConfig: true }
  });
}
