import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export function resolveProjectCredentials<T extends { whatsappToken?: string | null, whatsappBusinessId?: string | null, whatsappPhoneId?: string | null } | null | undefined>(project: T): T {
  if (!project) return project;

  const masterWabaId = process.env.WHATSAPP_BUSINESS_ID || '2178386092973067';

  // Si el proyecto no tiene WABA ID, o si usa el WABA ID por defecto de Abita, forzamos usar las credenciales de .env
  if (!project.whatsappBusinessId || project.whatsappBusinessId === masterWabaId) {
    project.whatsappBusinessId = masterWabaId;
    if (process.env.SYSTEM_USER_TOKEN) {
      project.whatsappToken = encrypt(process.env.SYSTEM_USER_TOKEN);
    }
    project.whatsappPhoneId = project.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID || '1087380634460356';
  }

  return project;
}

export async function getCurrentProject() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) return null;
  
  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: { agents: true, client: true }
  });

  return resolveProjectCredentials(project);
}

