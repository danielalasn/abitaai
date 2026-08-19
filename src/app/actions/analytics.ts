'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentProject } from '@/lib/auth-server'
import { decrypt } from '@/lib/encryption'
import { getCurrentMonthUsage } from '@/lib/subscription'
export async function getAnalyticsData(dateRange?: { start?: string, end?: string }) {
  const project = await getCurrentProject()
  if (!project) return null

  const botConfig = await prisma.botConfig.findUnique({
    where: { projectId: project.id }
  })

  let tierLimit = 250;
  let tierName = "Tier 0";
  if (botConfig?.whatsappPhoneId && botConfig?.whatsappToken) {
    try {
      const decryptedToken = decrypt(botConfig.whatsappToken);
      // v26+ devuelve whatsapp_business_manager_messaging_limit como STRING "TIER_250"
      const res = await fetch(`https://graph.facebook.com/v26.0/${botConfig.whatsappPhoneId}?fields=whatsapp_business_manager_messaging_limit`, {
        headers: { Authorization: `Bearer ${decryptedToken}` }
      })
      const apiData = await res.json()
      if (apiData?.whatsapp_business_manager_messaging_limit) {
        const raw = apiData.whatsapp_business_manager_messaging_limit;
        // Puede ser string ("TIER_250") o el objeto antiguo
        const tierStr = typeof raw === 'string' ? raw : (raw.tier || '');
        // Mapear al límite numérico
        if (tierStr.includes('250')) { tierLimit = 250; tierName = 'Tier 0'; }
        else if (tierStr.includes('2K') || tierStr.includes('2000')) { tierLimit = 2000; tierName = 'Tier 1'; }
        else if (tierStr.includes('10K') || tierStr.includes('10000')) { tierLimit = 10000; tierName = 'Tier 2'; }
        else if (tierStr.includes('100K') || tierStr.includes('100000')) { tierLimit = 100000; tierName = 'Tier 3'; }
        else if (tierStr.includes('UNLIMITED') || tierStr.includes('unlimited')) { tierLimit = 999999; tierName = 'Tier 4'; }
        else if (typeof raw === 'object' && raw.messaging_limit) {
          // fallback: objeto antiguo con messaging_limit numérico
          tierLimit = raw.messaging_limit;
          tierName = `Tier ${raw.messaging_limit.toLocaleString()}`;
        }
      }
    } catch (e) {
      console.error("Error fetching WA limit", e)
    }
  }

  // Tier usage: Business-Initiated Conversations en las últimas 24h
  // Meta solo cuenta conversaciones donde NOSOTROS iniciamos con un template
  // fuera de la ventana de 24h del usuario (MARKETING o UTILITY).
  // Respuestas dentro de la ventana activa NO cuentan.
  const yesterday24h = new Date()
  yesterday24h.setHours(yesterday24h.getHours() - 24)

  // Chats únicos donde enviamos un template (BIC) en las últimas 24h
  const bicChats24h = await prisma.message.findMany({
    where: {
      createdAt: { gte: yesterday24h },
      role: 'agent',
      waCategory: { in: ['MARKETING', 'UTILITY'] },
      chat: { lead: { projectId: project.id, channel: 'whatsapp' } }
    },
    select: { chatId: true },
    distinct: ['chatId']
  })
  const tierUsage = bicChats24h.length

  // Construir filtro de fecha si se proporciona
  // IMPORTANTE: Añadir T00:00:00 para que la fecha se interprete en hora LOCAL
  // y no como UTC medianoche (lo que causaría que mensajes de madrugada local no aparezcan)
  const dateQuery: any = {}
  if (dateRange?.start) {
    dateQuery.gte = dateRange.start.includes('T') ? new Date(dateRange.start) : new Date(dateRange.start + 'T00:00:00')
  }
  if (dateRange?.end) {
    dateQuery.lte = dateRange.end.includes('T') ? new Date(dateRange.end) : new Date(dateRange.end + 'T23:59:59.999')
  }

  const dateFilter = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {}

  const notSimulator = { phone: { not: 'SIMULADOR_TEST' }, channel: { not: 'simulator' } };

  const totalLeads = await prisma.lead.count({
    where: { projectId: project.id, ...notSimulator }
  })

  // Leads handed off to human
  const handedOffLeads = await prisma.lead.count({
    where: { projectId: project.id, status: 'NEEDS_AGENT', ...notSimulator }
  })

  // Uso del plan de todo el tiempo: Mensajes de IA (assistant) + Mensajes de plantilla proactivos (MARKETING/UTILITY)
  const planUsageAllTime = await prisma.message.count({
    where: {
      chat: {
        lead: {
          projectId: project.id
        }
      },
      OR: [
        { role: 'assistant' },
        { role: 'agent', waCategory: { in: ['MARKETING', 'UTILITY'] } }
      ]
    }
  })

  let abitaMessageLimit: number | null = 1000;
  let abitaMessageUsage = 0;
  if (project.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: project.clientId },
      select: { messageLimit: true }
    });
    if (client) abitaMessageLimit = client.messageLimit;
    abitaMessageUsage = await getCurrentMonthUsage(project.clientId);
  }

  const messagesSaved = await prisma.message.count({
    where: { 
      role: 'assistant',
      chat: {
        lead: {
          projectId: project.id
        }
      },
      ...dateFilter
    }
  })

  const unresolvedQuestions = await prisma.unansweredQuestion.count({
    where: { projectId: project.id, resolved: false, ...dateFilter }
  })

  const totalCampaigns = await prisma.campaign.count({
    where: { projectId: project.id, ...dateFilter }
  })

  // Nuevas métricas: Campañas y Mensajes Humanos
  const campaignMessagesCount = await prisma.campaignLog.count({
    where: { campaign: { projectId: project.id }, ...dateFilter }
  })

  // Mensajes iniciales (proactivos): todas las plantillas (campañas + WhatsApp Directo)
  const proactiveMessagesCount = await prisma.message.count({
    where: {
      role: 'agent',
      waCategory: { in: ['MARKETING', 'UTILITY'] },
      chat: { lead: { projectId: project.id } },
      ...dateFilter
    }
  })

  const rawAgentMessages = await prisma.message.count({
    where: { 
      role: 'agent',
      chat: { lead: { projectId: project.id } },
      ...dateFilter
    }
  })
  const humanMessagesCount = Math.max(0, rawAgentMessages - proactiveMessagesCount)
  // Total de todas las respuestas enviadas: IA + manuales + proactivas (templates)
  const totalResponses = messagesSaved + humanMessagesCount + proactiveMessagesCount

  const timeSavedMinutes = messagesSaved * 2

  // Tasas de WhatsApp (Apertura / Entrega) para campañas
  const logsStatusCount = await prisma.campaignLog.groupBy({
    by: ['status'],
    where: { campaign: { projectId: project.id }, ...dateFilter },
    _count: true
  })
  
  let totalLogs = 0;
  let deliveredLogs = 0;
  let readLogs = 0;
  
  logsStatusCount.forEach(l => {
    totalLogs += l._count;
    if (l.status === 'DELIVERED') deliveredLogs += l._count;
    if (l.status === 'READ') readLogs += l._count;
  });
  // 'READ' implicitly means delivered too in WhatsApp
  const whatsappDeliveryRate = totalLogs > 0 ? Math.round(((deliveredLogs + readLogs) / totalLogs) * 100) : 0;
  const whatsappReadRate = totalLogs > 0 ? Math.round((readLogs / totalLogs) * 100) : 0;

  // Channel Distribution (Current state, not filtered by date)
  const whatsappLeads = await prisma.lead.count({ where: { projectId: project.id, channel: 'whatsapp', phone: { not: 'SIMULADOR_TEST' } } })
  const instagramLeads = await prisma.lead.count({ where: { projectId: project.id, channel: 'instagram', phone: { not: 'SIMULADOR_TEST' } } })

  // Heatmap calculations (Current state, not filtered by date)
  const hotLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'CALIENTE', ...notSimulator } })
  const warmLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'TIBIO', ...notSimulator } })
  const coldLeads = await prisma.lead.count({ where: { projectId: project.id, heat: { in: ['FRIO', ''] }, ...notSimulator } })

  // Bot Active / Agent status (Current state, not filtered by date)
  const botActiveLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, ...notSimulator }, botActive: true } })
  const needsAgentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: 'NEEDS_AGENT', ...notSimulator }, botActive: false } })
  const agentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: { not: 'NEEDS_AGENT' }, ...notSimulator }, botActive: false } })

  // Calculamos la tasa de conversión (handoff)
  const conversionRate = totalLeads > 0 ? Math.round((handedOffLeads / totalLeads) * 100) : 0
  
  // Tasa de Autonomía real: Leads que el bot maneja vs el total
  const autonomyRate = totalLeads > 0 ? Math.round((botActiveLeads / totalLeads) * 100) : 0

  // Métricas de consumo de tokens y costo IA (Claude Sonnet 4.5 vs Gemini Fallback)
  const tokenGroups = await prisma.message.groupBy({
    by: ['agentName'],
    where: {
      role: 'assistant',
      chat: {
        lead: {
          projectId: project.id,
          phone: { not: 'SIMULADOR_TEST' }
        }
      },
      ...dateFilter
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    }
  });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let estimatedInputCostUsd = 0;
  let estimatedOutputCostUsd = 0;

  tokenGroups.forEach(group => {
    const input = group._sum.inputTokens || 0;
    const output = group._sum.outputTokens || 0;
    
    totalInputTokens += input;
    totalOutputTokens += output;

    const isGemini = group.agentName?.endsWith('(Gemini)') || false;
    
    if (isGemini) {
      // Gemini 3.7 Flash: $0.75 / 1M input, $3.75 / 1M output
      estimatedInputCostUsd += (input / 1_000_000) * 0.75;
      estimatedOutputCostUsd += (output / 1_000_000) * 3.75;
    } else {
      // Claude Sonnet 4.6: $2.00 / 1M input, $10.00 / 1M output
      estimatedInputCostUsd += (input / 1_000_000) * 2.00;
      estimatedOutputCostUsd += (output / 1_000_000) * 10.00;
    }
  });

  const estimatedAiCostUsd = estimatedInputCostUsd + estimatedOutputCostUsd;

  // Calculate time series for the chart
  let dateFilterSql = '';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (dateRange?.start && dateRange?.end) {
    const startIso = dateRange.start.includes('T') ? dateRange.start : dateRange.start + 'T00:00:00';
    const endIso = dateRange.end.includes('T') ? dateRange.end : dateRange.end + 'T23:59:59.999Z';
    dateFilterSql = `AND m."createdAt" >= $${paramIndex} AND m."createdAt" <= $${paramIndex + 1}`;
    params.push(new Date(startIso), new Date(endIso));
    paramIndex += 2;
  }
  
  const projectFilterSql = `AND l."projectId" = $${paramIndex}`;
  params.push(project.id);
  
  const query = `
    SELECT 
      TO_CHAR(m."createdAt", 'YYYY-MM-DD') as date,
      CAST(SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) AS INTEGER) as ai_messages,
      CAST(SUM(CASE WHEN m.role = 'agent' THEN 1 ELSE 0 END) AS INTEGER) as agent_messages,
      CAST(SUM(CASE WHEN m."waCategory" IN ('MARKETING', 'UTILITY') THEN 1 ELSE 0 END) AS INTEGER) as template_messages
    FROM "Message" m
    INNER JOIN "Chat" c ON m."chatId" = c.id
    INNER JOIN "Lead" l ON c."leadId" = l.id
    WHERE l.phone != 'SIMULADOR_TEST' ${dateFilterSql} ${projectFilterSql}
    GROUP BY TO_CHAR(m."createdAt", 'YYYY-MM-DD')
    ORDER BY TO_CHAR(m."createdAt", 'YYYY-MM-DD') ASC
  `;
  
  let dailyTrends: any[] = [];
  try {
    dailyTrends = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  } catch(e) {
    console.error("Error fetching daily trends", e);
  }

  return {
    totalLeads,
    handedOffLeads,
    messagesSaved,
    unresolvedQuestions,
    totalCampaigns,
    campaignMessagesCount,
    humanMessagesCount,
    totalResponses,
    timeSavedMinutes,
    whatsappDeliveryRate,
    whatsappReadRate,
    whatsappLeads,
    instagramLeads,
    conversionRate,
    autonomyRate,
    hotLeads,
    warmLeads,
    coldLeads,
    botActiveLeads,
    needsAgentLeads,
    agentLeads,
    totalInputTokens,
    totalOutputTokens,
    estimatedAiCostUsd,
    estimatedInputCostUsd,
    estimatedOutputCostUsd,
    sentByUsCount: rawAgentMessages,
    proactiveMessagesCount,
    planUsageAllTime,
    dailyTrends,
    tierLimit,
    tierName,
    tierUsage,
    abitaMessageLimit,
    abitaMessageUsage
  };
}

