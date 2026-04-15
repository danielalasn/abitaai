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
          agents: true,
          _count: {
            select: { leads: true, campaigns: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as any[];
  
  // Agregar conteos de mensajes (EXCLUYENDO SIMULADOR)
  for (const client of clients) {
    if (client.projects) {
      for (const project of client.projects) {
        // Mensajes del BOT (Auto-respuestas) - Filtramos el teléfono del simulador
        project.botMessagesCount = await prisma.message.count({
          where: {
            role: 'assistant',
            chat: { 
              lead: { 
                projectId: project.id,
                phone: { not: 'SIMULADOR_TEST' }
              } 
            }
          }
        });

        // Contactos NUESTROS (Campañas, Individuales, Manuales)
        project.agentMessagesCount = await prisma.message.count({
          where: {
            role: 'agent',
            chat: { 
              lead: { 
                projectId: project.id,
                phone: { not: 'SIMULADOR_TEST' }
              } 
            }
          }
        });

        // Fecha de ÚLTIMO USO (último mensaje nuestro real)
        const lastMsg = await prisma.message.findFirst({
          where: {
            role: { in: ['assistant', 'agent'] },
            chat: { 
              lead: { 
                projectId: project.id,
                phone: { not: 'SIMULADOR_TEST' }
              } 
            }
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
          agents: {
            create: {
              name: 'Agente Principal',
              identity: 'You are a helpful and polite virtual assistant.',
              instructions: 'Answer concisely and guide users to buy our products.',
            }
          }
        }
      }
    }
  });
  
  revalidatePath('/admin');
  return client;
}

export async function updateBotConfig(projectId: string, configData: any) {
  // Find the first agent for this project
  let agent = await prisma.agent.findFirst({ where: { projectId } });
  
  if (agent) {
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: configData
    });
    revalidatePath('/admin');
    return updated;
  } else {
    const created = await prisma.agent.create({
      data: { projectId, ...configData }
    });
    revalidatePath('/admin');
    return created;
  }
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

// ──────────────────────────────────────────────
// Consumption & Cost Tracking
// ──────────────────────────────────────────────

// Precios Claude Sonnet 4.5 (USD por 1M tokens) — actualizar si cambian
const AI_PRICING = {
  inputPerMillion: 3.00,    // $3.00 / 1M input tokens
  outputPerMillion: 15.00,  // $15.00 / 1M output tokens
}

// Precios Meta WhatsApp Business API (LATAM / El Salvador approx, USD por conversación)
const WA_PRICING = {
  MARKETING: 0.0520,
  UTILITY: 0.0080,
  SERVICE: 0.0000,  // Gratis en las primeras 1,000 conversaciones/mes
}

export interface ProjectUsageStats {
  // AI (Claude)
  totalInputTokens: number
  totalOutputTokens: number
  estimatedAiCostUsd: number

  // WhatsApp
  waServiceMessages: number
  waMarketingMessages: number
  waUtilityMessages: number
  estimatedWaCostUsd: number

  // Totals
  totalEstimatedCostUsd: number
}

export async function getUsageStats(projectId: string): Promise<ProjectUsageStats> {
  // Common where clause to exclude simulator
  const notSimulator = { phone: { not: 'SIMULADOR_TEST' } };

  // AI Token aggregation — sum all assistant messages' inputTokens & outputTokens
  const tokenAgg = await prisma.message.aggregate({
    where: {
      role: 'assistant',
      chat: { lead: { projectId, ...notSimulator } }
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    }
  });

  const totalInputTokens = tokenAgg._sum.inputTokens || 0;
  const totalOutputTokens = tokenAgg._sum.outputTokens || 0;
  const estimatedAiCostUsd = 
    (totalInputTokens / 1_000_000) * AI_PRICING.inputPerMillion +
    (totalOutputTokens / 1_000_000) * AI_PRICING.outputPerMillion;

  // WhatsApp message counts by category
  const waServiceExplicit = await prisma.message.count({
    where: {
      waCategory: 'SERVICE',
      role: { in: ['assistant', 'agent'] },
      chat: { lead: { projectId, ...notSimulator } }
    }
  });

  const waServiceNull = await prisma.message.count({
    where: {
      waCategory: null,
      role: { in: ['assistant', 'agent'] },
      chat: { lead: { projectId, ...notSimulator } }
    }
  });

  const waServiceMessages = waServiceExplicit + waServiceNull;

  const waMarketingMessages = await prisma.message.count({
    where: {
      waCategory: 'MARKETING',
      role: { in: ['assistant', 'agent'] },
      chat: { lead: { projectId, ...notSimulator } }
    }
  });

  const waUtilityMessages = await prisma.message.count({
    where: {
      waCategory: 'UTILITY',
      role: { in: ['assistant', 'agent'] },
      chat: { lead: { projectId, ...notSimulator } }
    }
  });

  const estimatedWaCostUsd = 
    (waMarketingMessages * WA_PRICING.MARKETING) +
    (waUtilityMessages * WA_PRICING.UTILITY) +
    (waServiceMessages * WA_PRICING.SERVICE);

  const totalEstimatedCostUsd = estimatedAiCostUsd + estimatedWaCostUsd;

  return {
    totalInputTokens,
    totalOutputTokens,
    estimatedAiCostUsd,
    waServiceMessages,
    waMarketingMessages,
    waUtilityMessages,
    estimatedWaCostUsd,
    totalEstimatedCostUsd,
  };
}
