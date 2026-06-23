'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentProject } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Creates an audit log entry for a specific action.
 */
export async function createAuditLog(action: string, details?: string) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) return;
  
  await prisma.auditLog.create({
    data: {
      clientId: session.user.id,
      action,
      details,
      ipAddress: 'server-action', // In server actions, IP is hard to get reliably without passing headers explicitly
    }
  });
}

/**
 * Exports all user data for the current client (Derecho a Portabilidad)
 */
export async function exportUserData() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) throw new Error("No autorizado");

  const clientData = await prisma.client.findUnique({
    where: { id: session.user.id },
    include: {
      projects: {
        include: {
          botConfig: true,
          agents: true,
          leads: {
            include: {
              chat: {
                include: { messages: true }
              }
            }
          },
          campaigns: true
        }
      },
      integrations: true,
      auditLogs: true
    }
  });

  await createAuditLog('DATA_EXPORT', 'Usuario solicitó exportación de sus datos (Portabilidad).');

  return clientData;
}

/**
 * Deletes the user account and all associated data permanently (Derecho a Eliminación)
 */
export async function deleteUserAccount() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id) throw new Error("No autorizado");

  await createAuditLog('ACCOUNT_DELETION_REQUESTED', 'Usuario solicitó la eliminación permanente de su cuenta.');

  // This will cascade delete projects, leads, chats, messages, campaigns, etc.
  await prisma.client.delete({
    where: { id: session.user.id }
  });

  return { success: true };
}
