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
            OR: [
              { role: 'agent' },
              { waCategory: { in: ['MARKETING', 'UTILITY'] } }
            ],
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

export async function createClient(data: { name: string, email: string, password?: string, templateGroup?: string }) {
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
  
  const client = await prisma.client.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      templateGroup: data.templateGroup || null,
      projects: {
        create: {
          name: 'Proyecto Principal',
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
    whatsappToken, whatsappPhoneId, whatsappBusinessId, leadScoringEnabled, defaultBotActive,
    ...agentData 
  } = configData;

  // 1. Actualizar el Proyecto (WhatsApp Config)
  if (whatsappToken !== undefined || whatsappPhoneId !== undefined || whatsappBusinessId !== undefined || leadScoringEnabled !== undefined || defaultBotActive !== undefined) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        whatsappToken,
        whatsappPhoneId,
        whatsappBusinessId,
        ...(leadScoringEnabled !== undefined ? { leadScoringEnabled } : {}),
        ...(defaultBotActive !== undefined ? { defaultBotActive } : {})
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

  const waMarketing = await prisma.message.count({ where: { waCategory: 'MARKETING', chat: { lead: notSimulator } } });
  const waUtility = await prisma.message.count({ where: { waCategory: 'UTILITY', chat: { lead: notSimulator } } });
  
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
  
  const adminClient = await prisma.client.findFirst({
    where: { email: 'info@abitaai.com' },
    include: { projects: { include: { agents: true } } }
  });

  if (!adminClient) {
    console.error("[Groups] ERROR: No se encontró el usuario info@abitaai.com");
    return [];
  }

  const project = adminClient?.projects?.[0];
  const config = project; // Ahora las credenciales están en el Proyecto

  if (!config?.whatsappBusinessId || !config?.whatsappToken) {
    console.warn("[Groups] ADVERTENCIA: Faltan credenciales en la Configuración Global.");
    console.log("[Groups] WABA ID:", config?.whatsappBusinessId ? "PRESENT" : "MISSING");
    console.log("[Groups] Token:", config?.whatsappToken ? "PRESENT" : "MISSING");
    return [];
  }

  console.log("[Groups] Usando WABA ID:", config.whatsappBusinessId);

  try {
    const templates = await getApprovedTemplates(config.whatsappBusinessId, config.whatsappToken);
    
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
  const adminClient = await prisma.client.findFirst({
    where: { email: 'info@abitaai.com' },
    include: { projects: true }
  });

  const project = adminClient?.projects?.[0];
  return {
    whatsappBusinessId: project?.whatsappBusinessId || '',
    whatsappToken: project?.whatsappToken || '',
    projectId: project?.id || null
  };
}

export async function updateMasterConfig(data: { whatsappBusinessId: string, whatsappToken: string }) {
  let adminClient = await prisma.client.findFirst({
    where: { email: 'info@abitaai.com' },
    include: { projects: true }
  });

  if (!adminClient) throw new Error("No se encontró el usuario administrador info@abitaai.com");

  let project = adminClient.projects?.[0];
  
  // Si el admin no tiene proyecto, crearlo ahora
  if (!project) {
    console.log("[Admin] Creando proyecto faltante para el administrador...");
    project = await prisma.project.create({
      data: {
        name: 'Admin Master Project',
        client: { connect: { id: adminClient.id } },
        agents: {
          create: {
            name: 'Master Agent',
            identity: 'Master Admin Agent',
            instructions: 'System configuration agent'
          }
        }
      },
      include: { agents: true }
    });
  }

  const projectId = project.id;
  
  // Reusar la función existente para actualizar la config del bot
  return updateBotConfig(projectId, {
    whatsappBusinessId: data.whatsappBusinessId,
    whatsappToken: data.whatsappToken
  });
}

