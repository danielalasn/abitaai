'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt } from '@/lib/encryption';

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
        const [stats, lastMsg] = await Promise.all([
          getUsageStats(project.id),
          prisma.message.findFirst({
            where: {
              chat: { 
                lead: { 
                  projectId: project.id,
                  phone: { not: 'SIMULADOR_TEST' }
                } 
              }
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          })
        ]);

        project.botMessagesCount = stats.botMessagesCount;
        project.agentMessagesCount = stats.agentMessagesCount;
        project.automatedMessagesCount = stats.automatedMessagesCount;
        project.templateMessagesCount = stats.templateMessagesCount;
        project.manualMessagesCount = stats.manualMessagesCount;
        project.usageStats = stats;
        project.lastUseAt = lastMsg?.createdAt || null;
      }
    }
  }
  
  return clients;
}

export async function createClient(data: { name: string, email: string, password?: string, templateGroup?: string, numberType?: 'abita' | 'embedded' }) {
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
  
  // Si es número de abita, asignamos las credenciales globales, de lo contrario quedan null
  const defaultToken = data.numberType === 'abita' && process.env.SYSTEM_USER_TOKEN ? encrypt(process.env.SYSTEM_USER_TOKEN) : null;
  const defaultBusinessId = data.numberType === 'abita' ? (process.env.WHATSAPP_BUSINESS_ID || '2178386092973067') : null;

  const client = await prisma.client.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      templateGroup: data.numberType === 'abita' ? (data.templateGroup || null) : null,
      projects: {
        create: {
          name: 'Proyecto Principal',
          whatsappToken: defaultToken,
          whatsappBusinessId: defaultBusinessId,
          whatsappPhoneId: null,
          agents: {
            create: {
              name: 'Agente Principal',
              identity: '',
              instructions: '',
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
  // Separar datos para Agente y Proyecto
  const { 
    whatsappToken, whatsappPhoneId, whatsappBusinessId, leadScoringEnabled, defaultBotActive, botAutoWakeHours,
    ...agentData 
  } = configData;

  // 1. Actualizar el Proyecto (WhatsApp Config)
  if (whatsappToken !== undefined || whatsappPhoneId !== undefined || whatsappBusinessId !== undefined || leadScoringEnabled !== undefined || defaultBotActive !== undefined || botAutoWakeHours !== undefined) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        whatsappToken: whatsappToken !== undefined ? encrypt(whatsappToken) : undefined,
        whatsappPhoneId,
        whatsappBusinessId,
        ...(leadScoringEnabled !== undefined ? { leadScoringEnabled } : {}),
        ...(defaultBotActive !== undefined ? { defaultBotActive } : {}),
        ...(botAutoWakeHours !== undefined ? { botAutoWakeHours } : {})
      }
    });
  }

  // 2. Actualizar o Crear el Agente (Bot Config)
  let agent = await prisma.agent.findFirst({ where: { projectId } });
  
  if (agent) {
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: agentData
    });
    revalidatePath('/admin');
    return updated;
  } else {
    const created = await prisma.agent.create({
      data: { 
        projectId, 
        name: 'Agente Principal', 
        ...agentData 
      }
    });
    revalidatePath('/admin');
    return created;
  }
}

export async function updateClient(clientId: string, data: { name?: string, email?: string, password?: string, templateGroup?: string, subscriptionStatus?: string, subscriptionEndsAt?: Date | null }) {
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.templateGroup !== undefined) updateData.templateGroup = data.templateGroup;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }
  if (data.subscriptionStatus) updateData.subscriptionStatus = data.subscriptionStatus;
  if (data.subscriptionEndsAt !== undefined) updateData.subscriptionEndsAt = data.subscriptionEndsAt;

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

// Precios Claude Sonnet 4.6 (USD por 1M tokens) — actualizar si cambian
const AI_PRICING = {
  inputPerMillion: 2.00,    // $2.00 / 1M input tokens
  outputPerMillion: 10.00,  // $10.00 / 1M output tokens
}

// Precios Meta WhatsApp Business API (LATAM / El Salvador approx, USD por conversación)
const WA_PRICING = {
  MARKETING: 0.0520,
  UTILITY: 0.0080,
  SERVICE: 0.0000,  // Gratis en las primeras 1,000 conversaciones/mes
}

export interface ProjectUsageStats {
  // Counts
  leadsCount: number
  campaignsCount: number
  botMessagesCount: number
  agentMessagesCount: number
  automatedMessagesCount: number
  templateMessagesCount: number
  manualMessagesCount: number

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

export async function getUsageStats(projectId: string, startDate?: string, endDate?: string): Promise<ProjectUsageStats> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { whatsappBusinessId: true }
  });

  const defaultWabaId = process.env.WHATSAPP_BUSINESS_ID || '2178386092973067';
  const isAbita = project?.whatsappBusinessId === defaultWabaId;

  // Common where clause to exclude simulator
  const notSimulator = { phone: { not: 'SIMULADOR_TEST' } };

  const dateQuery: any = {};
  if (startDate) {
    dateQuery.gte = startDate.includes('T') ? new Date(startDate) : new Date(startDate + 'T00:00:00');
  }
  if (endDate) {
    dateQuery.lte = endDate.includes('T') ? new Date(endDate) : new Date(endDate + 'T23:59:59.999');
  }
  const dateFilter = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

  const [
    leadsCount,
    campaignsCount,
    botMessagesCount,
    agentMessagesCount,
    automatedMessagesCount,
    tokenAgg,
    waServiceExplicit,
    waServiceNull,
    waMarketingMessages,
    waUtilityMessages
  ] = await Promise.all([
    prisma.lead.count({ where: { projectId, ...notSimulator, ...dateFilter } }),
    prisma.campaign.count({ where: { projectId, ...dateFilter } }),
    prisma.message.count({
      where: {
        role: 'assistant',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({
      where: {
        OR: [
          { role: 'agent' },
          { waCategory: { in: ['MARKETING', 'UTILITY'] } }
        ],
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({
      where: {
        OR: [
          { role: 'assistant' },
          { waCategory: { in: ['MARKETING', 'UTILITY'] } }
        ],
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.aggregate({
      where: {
        role: 'assistant',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      }
    }),
    prisma.message.count({
      where: {
        waCategory: 'SERVICE',
        role: { in: ['assistant', 'agent'] },
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({
      where: {
        waCategory: null,
        role: { in: ['assistant', 'agent'] },
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({
      where: {
        waCategory: 'MARKETING',
        role: { in: ['assistant', 'agent'] },
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({
      where: {
        waCategory: 'UTILITY',
        role: { in: ['assistant', 'agent'] },
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    })
  ]);

  const templateMessagesCount = waMarketingMessages + waUtilityMessages;
  const manualMessagesCount = Math.max(0, agentMessagesCount - templateMessagesCount);

  const totalInputTokens = tokenAgg._sum.inputTokens || 0;
  const totalOutputTokens = tokenAgg._sum.outputTokens || 0;
  const estimatedAiCostUsd = 
    (totalInputTokens / 1_000_000) * AI_PRICING.inputPerMillion +
    (totalOutputTokens / 1_000_000) * AI_PRICING.outputPerMillion;

  const waServiceMessages = waServiceExplicit + waServiceNull;

  const estimatedWaCostUsd = isAbita ? (
    (waMarketingMessages * WA_PRICING.MARKETING) +
    (waUtilityMessages * WA_PRICING.UTILITY) +
    (waServiceMessages * WA_PRICING.SERVICE)
  ) : 0;

  const totalEstimatedCostUsd = estimatedAiCostUsd + estimatedWaCostUsd;

  return {
    leadsCount,
    campaignsCount,
    botMessagesCount,
    agentMessagesCount,
    automatedMessagesCount,
    templateMessagesCount,
    manualMessagesCount,
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

export async function getGlobalStats() {
  const notSimulator = { phone: { not: 'SIMULADOR_TEST' } };
  
  const [
    totalClients,
    activeClients,
    botMessages,
    agentMessages,
    handoffs,
  ] = await Promise.all([
    prisma.client.count({ where: { email: { not: 'info@abitaai.com' } } }),
    prisma.client.count({ where: { email: { not: 'info@abitaai.com' }, subscriptionStatus: 'ACTIVE' } }),
    prisma.message.count({ where: { role: 'assistant', chat: { lead: notSimulator } } }),
    prisma.message.count({ where: { 
      OR: [
        { role: 'agent' },
        { waCategory: { in: ['MARKETING', 'UTILITY'] } }
      ],
      chat: { lead: notSimulator } 
    }}),
    prisma.lead.count({ where: { status: 'NEEDS_AGENT', phone: { not: 'SIMULADOR_TEST' } } })
  ]);

  const tokenAgg = await prisma.message.aggregate({
    where: { role: 'assistant', chat: { lead: notSimulator } },
    _sum: { inputTokens: true, outputTokens: true }
  });
  
  const estimatedAiCostUsd = 
    ((tokenAgg._sum.inputTokens || 0) / 1_000_000) * AI_PRICING.inputPerMillion +
    ((tokenAgg._sum.outputTokens || 0) / 1_000_000) * AI_PRICING.outputPerMillion;

  const defaultWabaId = process.env.WHATSAPP_BUSINESS_ID || '2178386092973067';
  
  const waMarketing = await prisma.message.count({ 
    where: { 
      waCategory: 'MARKETING', 
      chat: { lead: { ...notSimulator, project: { whatsappBusinessId: defaultWabaId } } } 
    } 
  });
  const waUtility = await prisma.message.count({ 
    where: { 
      waCategory: 'UTILITY', 
      chat: { lead: { ...notSimulator, project: { whatsappBusinessId: defaultWabaId } } } 
    } 
  });
  
  const estimatedWaCostUsd = (waMarketing * WA_PRICING.MARKETING) + (waUtility * WA_PRICING.UTILITY);
  const totalEstimatedCostUsd = estimatedAiCostUsd + estimatedWaCostUsd;

  return {
    totalClients,
    activeClients,
    botMessages,
    agentMessages,
    handoffs,
    totalEstimatedCostUsd
  };
}

// ──────────────────────────────────────────────
// Template Groups Configurator
// ──────────────────────────────────────────────
import { getApprovedTemplates } from '@/lib/whatsapp';

export async function fetchAvailableTemplateGroups() {
  console.log("--------------------------------------------------");
  console.log("[Groups] INICIANDO ESCANEO DE PLANTILLAS...");
  
  const wabaId = process.env.WHATSAPP_BUSINESS_ID;
  const token = process.env.SYSTEM_USER_TOKEN;

  if (!wabaId || !token) {
    console.warn("[Groups] ADVERTENCIA: Faltan credenciales en .env (WHATSAPP_BUSINESS_ID o SYSTEM_USER_TOKEN).");
    return [];
  }

  console.log("[Groups] Usando WABA ID:", wabaId);

  try {
    const templates = await getApprovedTemplates(wabaId, token);
    
    console.log(`[Groups] Meta devolvió ${templates.length} plantillas.`);
    if (templates.length > 0) {
      console.log(`[Groups] Listado de nombres:`, templates.map((t: any) => t.name));
    } else {
      console.log("[Groups] No se encontraron plantillas aprobadas en esta cuenta.");
    }

    const groups = new Set<string>();
    for (const t of templates) {
      if (t.name.includes('_')) {
        const parts = t.name.split('_');
        groups.add(parts[0] + '_');
      }
    }

    const result = Array.from(groups).sort();
    console.log("[Groups] Grupos detectados finales:", result);
    console.log("--------------------------------------------------");
    return result;
  } catch (err: any) {
    console.error("[Groups] ERROR FATAL:", err.message);
    return [];
  }
}

export async function getMasterConfig() {
  return {
    whatsappBusinessId: process.env.WHATSAPP_BUSINESS_ID || '',
    whatsappToken: process.env.SYSTEM_USER_TOKEN || '',
    projectId: null
  };
}

export async function updateMasterConfig(data: { whatsappBusinessId: string, whatsappToken: string }) {
  // Ahora la configuración maestra se lee de las variables de entorno,
  // por lo que no se actualiza en la base de datos de info@abitaai.com.
  console.log("[Admin] updateMasterConfig llamado. La configuración se maneja vía .env, ignorando actualización.");
  return { success: true };
}

