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

  if (project) {
    const adminClient = await prisma.client.findFirst({
      where: { email: 'info@abitaai.com' },
      include: { projects: true }
    });
    const masterProject = adminClient?.projects?.[0];
    
    if (masterProject) {
      if (!project.whatsappBusinessId) {
        project.whatsappBusinessId = masterProject.whatsappBusinessId;
      }
      if (!project.whatsappToken) {
        project.whatsappToken = masterProject.whatsappToken;
      }
    }
  }

  return project;
}
