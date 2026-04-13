'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function getClients() {
  const clients = await prisma.client.findMany({
    where: {
      email: { not: 'info@abitaai.com' } // Excluir al master admin
    },
    include: {
      projects: {
        include: {
          botConfig: true,
          _count: {
            select: { leads: true, campaigns: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as any[];
  
  // Agregar conteos de mensajes
  for (const client of clients) {
    if (client.projects) {
      for (const project of client.projects) {
        // Mensajes del BOT (Auto-respuestas)
        project.botMessagesCount = await prisma.message.count({
          where: {
            role: 'assistant',
            chat: { lead: { projectId: project.id } }
          }
        });

        // Contactos NUESTROS (Campañas, Individuales, Manuales)
        project.agentMessagesCount = await prisma.message.count({
          where: {
            role: 'agent',
            chat: { lead: { projectId: project.id } }
          }
        });

        // Fecha de ÚLTIMO USO (último mensaje nuestro)
        const lastMsg = await prisma.message.findFirst({
          where: {
            role: { in: ['assistant', 'agent'] },
            chat: { lead: { projectId: project.id } }
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        project.lastUseAt = lastMsg?.createdAt || null;
      }
    }
  }
  
  return clients;
}

export async function createClient(data: { name: string, email: string, password?: string }) {
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
  
  const client = await prisma.client.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      projects: {
        create: {
          name: 'Proyecto Principal',
          botConfig: {
            create: {} // config inicial vacía
          }
        }
      }
    }
  });
  
  revalidatePath('/admin');
  return client;
}

export async function updateBotConfig(projectId: string, configData: any) {
  const updated = await prisma.botConfig.upsert({
    where: { projectId },
    update: configData,
    create: {
      projectId,
      ...configData
    }
  });
  revalidatePath('/admin');
  return updated;
}

export async function updateClient(clientId: string, data: { name?: string, email?: string, password?: string }) {
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: updateData
  });
  
  revalidatePath('/admin');
  return updated;
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({
    where: { id: clientId }
  });
  revalidatePath('/admin');
  return true;
}
