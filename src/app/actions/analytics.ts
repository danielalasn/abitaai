'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentProject } from '@/lib/auth-server'
import { decrypt } from '@/lib/encryption'
export async function getAnalyticsData(dateRange?: { start?: string, end?: string }) {
  const project = await getCurrentProject()
  if (!project) return null

  const botConfig = await prisma.botConfig.findUnique({
    where: { projectId: project.id }
  })

  let tierLimit = 250;
  let tierName = "Tier 1";
  if (botConfig?.whatsappPhoneId && botConfig?.whatsappToken) {
    try {
      const decryptedToken = decrypt(botConfig.whatsappToken);
      const res = await fetch(`https://graph.facebook.com/v20.0/${botConfig.whatsappPhoneId}?fields=whatsapp_business_manager_messaging_limit`, {
        headers: { Authorization: `Bearer ${decryptedToken}` }
      })
      const data = await res.json()
      if (data && data.whatsapp_business_manager_messaging_limit) {
        const t = data.whatsapp_business_manager_messaging_limit;
        if (t.messaging_limit) tierLimit = t.messaging_limit;
        if (t.tier) {
          tierName = t.tier.replace('_', ' ').toLowerCase();
          tierName = tierName.charAt(0).toUpperCase() + tierName.slice(1);
        }
      }
    } catch (e) {
      console.error("Error fetching WA limit", e)
    }
  }

  const yesterday24h = new Date()
  yesterday24h.setHours(yesterday24h.getHours() - 24)
  const uniqueChats24h = await prisma.message.findMany({
    where: {
      createdAt: { gte: yesterday24h },
      role: { in: ['agent', 'assistant'] },
      chat: { lead: { projectId: project.id, channel: 'whatsapp' } }
    },
    select: { chatId: true },
    distinct: ['chatId']
  })
  const tierUsage = uniqueChats24h.length

  // Construir filtro de fecha si se proporciona
  const dateQuery: any = {}
  if (dateRange?.start) dateQuery.gte = new Date(dateRange.start)
  if (dateRange?.end) {
    const endDate = new Date(dateRange.end)
    endDate.setHours(23, 59, 59, 999) // Incluir todo el último día
    dateQuery.lte = endDate
  }

  const dateFilter = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {}

  const totalLeads = await prisma.lead.count({
    where: { projectId: project.id }
  })

  // Leads handed off to human
  const handedOffLeads = await prisma.lead.count({
    where: { projectId: project.id, status: 'NEEDS_AGENT' }
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
  const whatsappLeads = await prisma.lead.count({ where: { projectId: project.id, channel: 'whatsapp' } })
  const instagramLeads = await prisma.lead.count({ where: { projectId: project.id, channel: 'instagram' } })

  // Heatmap calculations (Current state, not filtered by date)
  const hotLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'CALIENTE' } })
  const warmLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'TIBIO' } })
  const coldLeads = await prisma.lead.count({ where: { projectId: project.id, heat: { in: ['FRIO', ''] } } })

  // Bot Active / Agent status (Current state, not filtered by date)
  const botActiveLeads = await prisma.chat.count({ where: { lead: { projectId: project.id }, botActive: true } })
  const needsAgentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: 'NEEDS_AGENT' }, botActive: false } })
  const agentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: { not: 'NEEDS_AGENT' } }, botActive: false } })

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
      // Gemini 1.5 Flash: $0.075 / 1M input, $0.30 / 1M output
      estimatedInputCostUsd += (input / 1_000_000) * 0.075;
      estimatedOutputCostUsd += (output / 1_000_000) * 0.30;
    } else {
      // Claude Sonnet 4.5: $3.00 / 1M input, $15.00 / 1M output
      estimatedInputCostUsd += (input / 1_000_000) * 3.00;
      estimatedOutputCostUsd += (output / 1_000_000) * 15.00;
    }
  });

  const estimatedAiCostUsd = estimatedInputCostUsd + estimatedOutputCostUsd;

  return {
    totalLeads,
    handedOffLeads,
    messagesSaved,
    unresolvedQuestions,
    totalCampaigns,
    campaignMessagesCount,
    humanMessagesCount,
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
    dailyTrends: [],
    tierLimit,
    tierName,
    tierUsage
  };
}

