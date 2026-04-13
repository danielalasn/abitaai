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
  });
  
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
