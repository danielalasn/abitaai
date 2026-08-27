'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt } from '@/lib/encryption';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function checkAdminAuth() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function getClients() {
  await checkAdminAuth();
  
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
    // No exponer contraseñas en el frontend
    delete client.password;

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
  
  // Mover abita-bot al principio
  clients.sort((a, b) => {
    if (a.email === 'abita-bot@abitaai.com') return -1;
    if (b.email === 'abita-bot@abitaai.com') return 1;
    return 0;
  });
  
  return clients;
}

export async function createClient(data: { 
  name: string, 
  email: string, 
  password?: string, 
  templateGroup?: string, 
  numberType?: 'abita' | 'embedded',
  initialBotConfig?: any
}) {
  await checkAdminAuth();
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
  
  // Si es número de abita, asignamos las credenciales globales, de lo contrario quedan null
  const defaultToken = data.numberType === 'abita' && process.env.SYSTEM_USER_TOKEN ? encrypt(process.env.SYSTEM_USER_TOKEN) : null;
  const defaultBusinessId = data.numberType === 'abita' ? (process.env.WHATSAPP_BUSINESS_ID || '') : null;

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
              identity: data.initialBotConfig?.identity || '',
              instructions: data.initialBotConfig?.instructions || '',
              handoffRules: data.initialBotConfig?.handoffRules || null,
              knowledgeData: data.initialBotConfig?.knowledgeData || null,
              knowledgeRaw: data.initialBotConfig?.knowledgeRaw || null,
              faq: data.initialBotConfig?.faq || null,
              leadScoringRules: data.initialBotConfig?.leadScoringRules || null,
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
  await checkAdminAuth();
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

export async function updateClient(clientId: string, data: { name?: string, email?: string, password?: string, templateGroup?: string, subscriptionStatus?: string, subscriptionEndsAt?: Date | null, resetFailedLogins?: boolean, messageLimit?: number | null, subscriptionResetDay?: number }) {
  await checkAdminAuth();
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.templateGroup !== undefined) updateData.templateGroup = data.templateGroup;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }
  if (data.subscriptionStatus) updateData.subscriptionStatus = data.subscriptionStatus;
  if (data.subscriptionEndsAt !== undefined) updateData.subscriptionEndsAt = data.subscriptionEndsAt;
  if (data.resetFailedLogins) updateData.failedLoginAttempts = 0;
  if (data.messageLimit !== undefined) updateData.messageLimit = data.messageLimit;
  if (data.subscriptionResetDay !== undefined) updateData.subscriptionResetDay = data.subscriptionResetDay;

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: updateData
  });
  
  revalidatePath('/admin');
  return updated;
}

export async function deleteClient(clientId: string) {
  await checkAdminAuth();
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
  handoffsCount: number
  botMessagesCount: number
  agentMessagesCount: number
  automatedMessagesCount: number
  templateMessagesCount: number
  manualMessagesCount: number

  // AI (Claude)
  claudeInputTokens: number
  claudeOutputTokens: number
  claudeEstimatedCostUsd: number

  // AI (Gemini)
  geminiInputTokens: number
  geminiOutputTokens: number
  geminiEstimatedCostUsd: number

  totalInputTokens: number
  totalOutputTokens: number
  estimatedAiCostUsd: number

  // AI Simulator
  simulatorClaudeInputTokens: number
  simulatorClaudeOutputTokens: number
  simulatorClaudeEstimatedCostUsd: number
  simulatorGeminiInputTokens: number
  simulatorGeminiOutputTokens: number
  simulatorGeminiEstimatedCostUsd: number
  totalSimulatorInputTokens: number
  totalSimulatorOutputTokens: number
  simulatorEstimatedCostUsd: number

  // WhatsApp
  waServiceMessages: number
  waMarketingMessages: number
  waUtilityMessages: number
  estimatedWaCostUsd: number

  // Totals
  totalEstimatedCostUsd: number
}

export async function getUsageStats(projectId: string, startDate?: string, endDate?: string): Promise<ProjectUsageStats> {
  await checkAdminAuth();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { whatsappBusinessId: true }
  });

  const defaultWabaId = process.env.WHATSAPP_BUSINESS_ID || '';
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
    waMarketingMessages,
    waUtilityMessages,
    waAuthMessages,
    waServiceMessages,
    tokenAgg,
    handoffsCount,
    simulatorTokenAgg
  ] = await Promise.all([
    prisma.lead.count({ where: { projectId, ...notSimulator, ...dateFilter } }),
    prisma.campaign.count({ where: { projectId, ...dateFilter } }),
    prisma.message.count({ // botMessagesCount
      where: {
        role: 'assistant',
        content: { not: { startsWith: '[Sistema]' } },
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({ // waMarketingMessages
      where: {
        role: 'agent',
        waCategory: 'MARKETING',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({ // waUtilityMessages
      where: {
        role: 'agent',
        waCategory: 'UTILITY',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({ // waAuthMessages
      where: {
        role: 'agent',
        waCategory: 'AUTHENTICATION',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.count({ // waServiceMessages / manualMessagesCount
      where: {
        role: 'agent',
        waCategory: 'SERVICE',
        chat: { lead: { projectId, ...notSimulator } },
        ...dateFilter
      }
    }),
    prisma.message.groupBy({ // tokenAgg
      by: ['agentName'],
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
    prisma.lead.count({ where: { projectId, status: 'NEEDS_AGENT', ...notSimulator, ...dateFilter } }), // handoffsCount
    prisma.message.groupBy({ // simulatorTokenAgg
      by: ['agentName'],
      where: {
        role: 'assistant',
        chat: { lead: { projectId, phone: 'SIMULADOR_TEST' } },
        ...dateFilter
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      }
    })
  ]);

  const templateMessagesCount = waMarketingMessages + waUtilityMessages + waAuthMessages;
  const manualMessagesCount = waServiceMessages;
  const agentMessagesCount = templateMessagesCount + manualMessagesCount;
  const automatedMessagesCount = botMessagesCount + templateMessagesCount;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let claudeInputTokens = 0;
  let claudeOutputTokens = 0;
  let claudeEstimatedCostUsd = 0;
  let geminiInputTokens = 0;
  let geminiOutputTokens = 0;
  let geminiEstimatedCostUsd = 0;

  let simulatorClaudeInputTokens = 0;
  let simulatorClaudeOutputTokens = 0;
  let simulatorClaudeEstimatedCostUsd = 0;
  let simulatorGeminiInputTokens = 0;
  let simulatorGeminiOutputTokens = 0;
  let simulatorGeminiEstimatedCostUsd = 0;

  tokenAgg.forEach(group => {
    const input = group._sum.inputTokens || 0;
    const output = group._sum.outputTokens || 0;
    
    totalInputTokens += input;
    totalOutputTokens += output;

    const isGemini = group.agentName?.endsWith('(Gemini)') || false;
    
    if (isGemini) {
      geminiInputTokens += input;
      geminiOutputTokens += output;
      geminiEstimatedCostUsd += (input / 1_000_000) * 0.75 + (output / 1_000_000) * 3.75;
    } else {
      claudeInputTokens += input;
      claudeOutputTokens += output;
      claudeEstimatedCostUsd += (input / 1_000_000) * AI_PRICING.inputPerMillion + (output / 1_000_000) * AI_PRICING.outputPerMillion;
    }
  });

  simulatorTokenAgg.forEach(group => {
    const input = group._sum.inputTokens || 0;
    const output = group._sum.outputTokens || 0;
    const isGemini = group.agentName?.endsWith('(Gemini)') || false;
    
    if (isGemini) {
      simulatorGeminiInputTokens += input;
      simulatorGeminiOutputTokens += output;
      simulatorGeminiEstimatedCostUsd += (input / 1_000_000) * 0.75 + (output / 1_000_000) * 3.75;
    } else {
      simulatorClaudeInputTokens += input;
      simulatorClaudeOutputTokens += output;
      simulatorClaudeEstimatedCostUsd += (input / 1_000_000) * AI_PRICING.inputPerMillion + (output / 1_000_000) * AI_PRICING.outputPerMillion;
    }
  });

  const estimatedAiCostUsd = claudeEstimatedCostUsd + geminiEstimatedCostUsd;

  const estimatedWaCostUsd = isAbita ? (
    (waMarketingMessages * WA_PRICING.MARKETING) +
    (waUtilityMessages * WA_PRICING.UTILITY) +
    (waServiceMessages * WA_PRICING.SERVICE)
  ) : 0;

  const simulatorEstimatedCostUsd = simulatorClaudeEstimatedCostUsd + simulatorGeminiEstimatedCostUsd;
  const totalEstimatedCostUsd = estimatedAiCostUsd + estimatedWaCostUsd + simulatorEstimatedCostUsd;

  return {
    leadsCount,
    campaignsCount,
    handoffsCount,
    botMessagesCount,
    agentMessagesCount,
    automatedMessagesCount,
    templateMessagesCount,
    manualMessagesCount,
    totalInputTokens,
    totalOutputTokens,
    claudeInputTokens,
    claudeOutputTokens,
    claudeEstimatedCostUsd,
    geminiInputTokens,
    geminiOutputTokens,
    geminiEstimatedCostUsd,
    estimatedAiCostUsd,
    simulatorClaudeInputTokens,
    simulatorClaudeOutputTokens,
    simulatorClaudeEstimatedCostUsd,
    simulatorGeminiInputTokens,
    simulatorGeminiOutputTokens,
    simulatorGeminiEstimatedCostUsd,
    totalSimulatorInputTokens: simulatorClaudeInputTokens + simulatorGeminiInputTokens,
    totalSimulatorOutputTokens: simulatorClaudeOutputTokens + simulatorGeminiOutputTokens,
    simulatorEstimatedCostUsd,
    waServiceMessages,
    waMarketingMessages,
    waUtilityMessages,
    estimatedWaCostUsd,
    totalEstimatedCostUsd,
  };
}

export async function getGlobalStats(startDate?: Date, endDate?: Date) {
  await checkAdminAuth();
  const notSimulator = { 
    phone: { not: 'SIMULADOR_TEST' },
    project: { client: { email: { notIn: ['info@abitaai.com', 'abita-bot@abitaai.com'] } } }
  };
  
  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};
  
  const [
    totalClients,
    activeClients,
    botMessages,
    agentMessages,
    templateMessages,
    handoffs,
    totalLeads
  ] = await Promise.all([
    prisma.client.count({ where: { email: { notIn: ['info@abitaai.com', 'abita-bot@abitaai.com'] } } }),
    prisma.client.count({ 
      where: { 
        email: { notIn: ['info@abitaai.com', 'abita-bot@abitaai.com'] }, 
        subscriptionStatus: 'ACTIVE',
        projects: {
          some: {
            leads: {
              some: {
                phone: { not: 'SIMULADOR_TEST' },
                chat: {
                  messages: {
                    some: {
                      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                  }
                }
              }
            }
          }
        }
      } 
    }),
    prisma.message.count({ where: { role: 'assistant', chat: { lead: notSimulator }, ...dateFilter } }),
    prisma.message.count({ where: { 
      role: 'agent',
      chat: { lead: notSimulator },
      ...dateFilter
    }}),
    prisma.message.count({ where: { 
      waCategory: { in: ['MARKETING', 'UTILITY'] },
      chat: { lead: notSimulator },
      ...dateFilter
    }}),
    prisma.lead.count({ where: { status: 'NEEDS_AGENT', ...notSimulator, ...dateFilter } }),
    prisma.lead.count({ where: { ...notSimulator, ...dateFilter } })
  ]);

  const tokenAgg = await prisma.message.groupBy({
    by: ['agentName'],
    where: { role: 'assistant', chat: { lead: notSimulator }, ...dateFilter },
    _sum: { inputTokens: true, outputTokens: true }
  });
  
  let estimatedAiCostUsd = 0;
  tokenAgg.forEach(group => {
    const input = group._sum.inputTokens || 0;
    const output = group._sum.outputTokens || 0;
    const isGemini = group.agentName?.endsWith('(Gemini)') || false;
    if (isGemini) {
      estimatedAiCostUsd += (input / 1_000_000) * 0.75 + (output / 1_000_000) * 3.75;
    } else {
      estimatedAiCostUsd += (input / 1_000_000) * AI_PRICING.inputPerMillion + (output / 1_000_000) * AI_PRICING.outputPerMillion;
    }
  });

  const defaultWabaId = process.env.WHATSAPP_BUSINESS_ID || '';
  
  const waMarketing = await prisma.message.count({ 
    where: { 
      waCategory: 'MARKETING', 
      chat: { 
        lead: { 
          phone: { not: 'SIMULADOR_TEST' }, 
          project: { 
            whatsappBusinessId: defaultWabaId,
            client: { email: { notIn: ['info@abitaai.com', 'abita-bot@abitaai.com'] } }
          } 
        } 
      },
      ...dateFilter
    } 
  });
  const waUtility = await prisma.message.count({ 
    where: { 
      waCategory: 'UTILITY', 
      chat: { 
        lead: { 
          phone: { not: 'SIMULADOR_TEST' }, 
          project: { 
            whatsappBusinessId: defaultWabaId,
            client: { email: { notIn: ['info@abitaai.com', 'abita-bot@abitaai.com'] } }
          } 
        } 
      },
      ...dateFilter
    } 
  });
  
  const estimatedWaCostUsd = (waMarketing * WA_PRICING.MARKETING) + (waUtility * WA_PRICING.UTILITY);
  const totalEstimatedCostUsd = estimatedAiCostUsd + estimatedWaCostUsd;

  return {
    totalClients,
    activeClients,
    botMessages,
    agentMessages,
    templateMessages,
    handoffs,
    totalLeads,
    totalEstimatedCostUsd
  };
}

export async function getMessageTimeSeries(startDate?: Date, endDate?: Date, projectId?: string) {
  await checkAdminAuth();
  try {
    let dateFilter = '';
    let projectFilter = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (startDate && endDate) {
      dateFilter = `AND m."createdAt" >= $${paramIndex} AND m."createdAt" <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    if (projectId) {
      projectFilter = `AND l."projectId" = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }
    
    // Convert to explicit strings for raw SQL safely, since prisma raw uses parameterized queries
    const query = `
      SELECT 
        TO_CHAR(m."createdAt", 'YYYY-MM-DD') as date,
        CAST(SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) AS INTEGER) as ai_messages,
        CAST(SUM(CASE WHEN m.role = 'agent' THEN 1 ELSE 0 END) AS INTEGER) as agent_messages,
        CAST(SUM(CASE WHEN m."waCategory" IN ('MARKETING', 'UTILITY') THEN 1 ELSE 0 END) AS INTEGER) as template_messages
      FROM "Message" m
      INNER JOIN "Chat" c ON m."chatId" = c.id
      INNER JOIN "Lead" l ON c."leadId" = l.id
      INNER JOIN "Project" p ON l."projectId" = p.id
      INNER JOIN "Client" cl ON p."clientId" = cl.id
      WHERE l.phone != 'SIMULADOR_TEST' AND cl.email NOT IN ('info@abitaai.com', 'abita-bot@abitaai.com') ${dateFilter} ${projectFilter}
      GROUP BY TO_CHAR(m."createdAt", 'YYYY-MM-DD')
      ORDER BY TO_CHAR(m."createdAt", 'YYYY-MM-DD') ASC
    `;
    
    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return results;
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return [];
  }
}

// ──────────────────────────────────────────────
// Template Groups Configurator
// ──────────────────────────────────────────────
import { getApprovedTemplates } from '@/lib/whatsapp';

export async function fetchAvailableTemplateGroups() {
  await checkAdminAuth();
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
  await checkAdminAuth();
  return {
    whatsappBusinessId: process.env.WHATSAPP_BUSINESS_ID || '',
    whatsappToken: process.env.SYSTEM_USER_TOKEN || '',
    projectId: null
  };
}

export async function updateMasterConfig(data: { whatsappBusinessId: string, whatsappToken: string }) {
  await checkAdminAuth();
  // Ahora la configuración maestra se lee de las variables de entorno,
  // por lo que no se actualiza en la base de datos de info@abitaai.com.
  console.log("[Admin] updateMasterConfig llamado. La configuración se maneja vía .env, ignorando actualización.");
  return { success: true };
}

