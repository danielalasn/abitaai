'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentProject } from '@/lib/auth-server'
import { decrypt } from '@/lib/encryption'
import { getCurrentMonthUsage } from '@/lib/subscription'
import { getCachedJson, setCachedJson } from '@/lib/cache'
import { withTiming } from '@/lib/perf'

async function getMetaTier(projectId: string): Promise<{ tierLimit: number; tierName: string }> {
  try {
    const botConfig = await prisma.botConfig.findUnique({
      where: { projectId },
      select: { whatsappPhoneId: true, whatsappToken: true }
    });

    if (!botConfig?.whatsappPhoneId || !botConfig?.whatsappToken) {
      return { tierLimit: 250, tierName: "Tier 0" };
    }

    const cacheKey = `wa:tier:${botConfig.whatsappPhoneId}`;
    const cached = await getCachedJson<{ tierLimit: number; tierName: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    const decryptedToken = decrypt(botConfig.whatsappToken);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://graph.facebook.com/v26.0/${botConfig.whatsappPhoneId}?fields=whatsapp_business_manager_messaging_limit`,
      {
        headers: { Authorization: `Bearer ${decryptedToken}` },
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId));

    let tierLimit = 250;
    let tierName = "Tier 0";

    if (res.ok) {
      const apiData = await res.json();
      if (apiData?.whatsapp_business_manager_messaging_limit) {
        const raw = apiData.whatsapp_business_manager_messaging_limit;
        const tierStr = typeof raw === 'string' ? raw : (raw.tier || '');

        if (tierStr.includes('250')) { tierLimit = 250; tierName = 'Tier 0'; }
        else if (tierStr.includes('2K') || tierStr.includes('2000')) { tierLimit = 2000; tierName = 'Tier 1'; }
        else if (tierStr.includes('10K') || tierStr.includes('10000')) { tierLimit = 10000; tierName = 'Tier 2'; }
        else if (tierStr.includes('100K') || tierStr.includes('100000')) { tierLimit = 100000; tierName = 'Tier 3'; }
        else if (tierStr.includes('UNLIMITED') || tierStr.includes('unlimited')) { tierLimit = 999999; tierName = 'Tier 4'; }
        else if (typeof raw === 'object' && raw.messaging_limit) {
          tierLimit = raw.messaging_limit;
          tierName = `Tier ${raw.messaging_limit.toLocaleString()}`;
        }

        // Cachear en Redis por 1 hora (3600 segundos)
        await setCachedJson(cacheKey, { tierLimit, tierName }, 3600);
      }
    }

    return { tierLimit, tierName };
  } catch (e: any) {
    console.error("[getMetaTier] Error fetching WA limit (usando fallback Tier 0):", e?.message || e);
    return { tierLimit: 250, tierName: "Tier 0" };
  }
}

export async function getAnalyticsData(dateRange?: { start?: string, end?: string }) {
  return withTiming('getAnalyticsData', async () => {
    const project = await getCurrentProject();
    if (!project) return null;

    // Fechas y filtros
    const yesterday24h = new Date();
    yesterday24h.setHours(yesterday24h.getHours() - 24);

    const dateQuery: any = {};
    if (dateRange?.start) {
      dateQuery.gte = dateRange.start.includes('T') ? new Date(dateRange.start) : new Date(dateRange.start + 'T00:00:00');
    }
    if (dateRange?.end) {
      dateQuery.lte = dateRange.end.includes('T') ? new Date(dateRange.end) : new Date(dateRange.end + 'T23:59:59.999');
    }

    const dateFilter = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};
    const notSimulator = { phone: { not: 'SIMULADOR_TEST' }, channel: { not: 'simulator' } };

    // Preparar SQL crudo para dailyTrends
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

    const trendsQuery = `
      SELECT 
        TO_CHAR(m."createdAt", 'YYYY-MM-DD') as date,
        CAST(SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) AS INTEGER) as ai_messages,
        CAST(SUM(CASE WHEN m.role = 'agent' AND (m."waCategory" = 'SERVICE' OR m."waCategory" IS NULL) THEN 1 ELSE 0 END) AS INTEGER) as agent_messages,
        CAST(SUM(CASE WHEN m."waCategory" IN ('MARKETING', 'UTILITY', 'AUTHENTICATION') AND m.status != 'FAILED' THEN 1 ELSE 0 END) AS INTEGER) as template_messages,
        CAST(SUM(CASE WHEN m.role = 'assistant' AND m.status = 'FAILED' THEN 1 ELSE 0 END) AS INTEGER) as failed_ai_messages,
        CAST(SUM(CASE WHEN m."waCategory" IN ('MARKETING', 'UTILITY', 'AUTHENTICATION') AND m.status = 'FAILED' THEN 1 ELSE 0 END) AS INTEGER) as failed_template_messages
      FROM "Message" m
      INNER JOIN "Chat" c ON m."chatId" = c.id
      INNER JOIN "Lead" l ON c."leadId" = l.id
      WHERE l.phone != 'SIMULADOR_TEST' ${dateFilterSql} ${projectFilterSql}
      GROUP BY TO_CHAR(m."createdAt", 'YYYY-MM-DD')
      ORDER BY TO_CHAR(m."createdAt", 'YYYY-MM-DD') ASC
    `;

    // Reutilizar cliente ya cargado en getCurrentProject
    const abitaMessageLimit = project.client?.messageLimit ?? 1000;
    const clientResetDay = project.client?.subscriptionResetDay ?? 1;

    // Ejecución 100% paralela de todas las consultas independientes
    const [
      tierData,
      bicChats24h,
      totalLeads,
      handedOffLeads,
      planUsageAllTime,
      abitaMessageUsage,
      messagesSaved,
      unresolvedQuestions,
      totalCampaigns,
      campaignMessagesCount,
      proactiveMessagesCount,
      humanMessagesCount,
      logsStatusCount,
      whatsappLeads,
      instagramLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      botActiveLeads,
      needsAgentLeads,
      agentLeads,
      tokenGroups,
      dailyTrendsResult
    ] = await Promise.all([
      getMetaTier(project.id),
      prisma.message.findMany({
        where: {
          createdAt: { gte: yesterday24h },
          role: 'agent',
          waCategory: { in: ['MARKETING', 'UTILITY'] },
          status: { not: 'FAILED' },
          chat: { lead: { projectId: project.id, channel: 'whatsapp' } }
        },
        select: { chatId: true },
        distinct: ['chatId']
      }),
      prisma.lead.count({
        where: { projectId: project.id, ...notSimulator }
      }),
      prisma.lead.count({
        where: { projectId: project.id, status: 'NEEDS_AGENT', ...notSimulator }
      }),
      prisma.message.count({
        where: {
          status: { not: 'FAILED' },
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
      }),
      project.clientId ? getCurrentMonthUsage(project.clientId, clientResetDay) : Promise.resolve(0),
      prisma.message.count({
        where: { 
          role: 'assistant',
          content: { not: { startsWith: '[Sistema]' } },
          chat: {
            lead: {
              projectId: project.id,
              phone: { not: 'SIMULADOR_TEST' }
            }
          },
          ...dateFilter
        }
      }),
      prisma.unansweredQuestion.count({
        where: { projectId: project.id, resolved: false, ...dateFilter }
      }),
      prisma.campaign.count({
        where: { projectId: project.id, ...dateFilter }
      }),
      prisma.campaignLog.count({
        where: { campaign: { projectId: project.id }, status: { not: 'FAILED' }, ...dateFilter }
      }),
      prisma.message.count({
        where: {
          role: 'agent',
          status: { not: 'FAILED' },
          waCategory: { in: ['MARKETING', 'UTILITY', 'AUTHENTICATION'] },
          chat: { lead: { projectId: project.id, phone: { not: 'SIMULADOR_TEST' } } },
          ...dateFilter
        }
      }),
      prisma.message.count({
        where: { 
          role: 'agent',
          waCategory: 'SERVICE',
          chat: { lead: { projectId: project.id, phone: { not: 'SIMULADOR_TEST' } } },
          ...dateFilter
        }
      }),
      prisma.campaignLog.groupBy({
        by: ['status'],
        where: { campaign: { projectId: project.id }, ...dateFilter },
        _count: true
      }),
      prisma.lead.count({ where: { projectId: project.id, channel: 'whatsapp', phone: { not: 'SIMULADOR_TEST' } } }),
      prisma.lead.count({ where: { projectId: project.id, channel: 'instagram', phone: { not: 'SIMULADOR_TEST' } } }),
      prisma.lead.count({ where: { projectId: project.id, heat: 'CALIENTE', ...notSimulator } }),
      prisma.lead.count({ where: { projectId: project.id, heat: 'TIBIO', ...notSimulator } }),
      prisma.lead.count({ where: { projectId: project.id, heat: { in: ['FRIO', ''] }, ...notSimulator } }),
      prisma.chat.count({ where: { lead: { projectId: project.id, ...notSimulator }, botActive: true } }),
      prisma.chat.count({ where: { lead: { projectId: project.id, status: 'NEEDS_AGENT', ...notSimulator }, botActive: false } }),
      prisma.chat.count({ where: { lead: { projectId: project.id, status: { not: 'NEEDS_AGENT' }, ...notSimulator }, botActive: false } }),
      prisma.message.groupBy({
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
      }),
      prisma.$queryRawUnsafe<any[]>(trendsQuery, ...params).catch((e) => {
        console.error("[getAnalyticsData] Error fetching daily trends:", e);
        return [] as any[];
      })
    ]);

    const tierUsage = bicChats24h.length;
    const { tierLimit, tierName } = tierData;

    // Total de respuestas y tiempo ahorrado
    const totalResponses = messagesSaved + humanMessagesCount + proactiveMessagesCount;
    const timeSavedMinutes = messagesSaved * 2;

    // Tasas de WhatsApp (Apertura / Entrega)
    let totalLogs = 0;
    let deliveredLogs = 0;
    let readLogs = 0;

    logsStatusCount.forEach(l => {
      totalLogs += l._count;
      if (l.status === 'DELIVERED') deliveredLogs += l._count;
      if (l.status === 'READ') readLogs += l._count;
    });

    const whatsappDeliveryRate = totalLogs > 0 ? Math.round(((deliveredLogs + readLogs) / totalLogs) * 100) : 0;
    const whatsappReadRate = totalLogs > 0 ? Math.round((readLogs / totalLogs) * 100) : 0;

    // Tasas de conversión y autonomía
    const conversionRate = totalLeads > 0 ? Math.round((handedOffLeads / totalLeads) * 100) : 0;
    const autonomyRate = totalLeads > 0 ? Math.round((botActiveLeads / totalLeads) * 100) : 0;

    // Consumo de tokens y costos
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
        estimatedInputCostUsd += (input / 1_000_000) * 0.75;
        estimatedOutputCostUsd += (output / 1_000_000) * 3.75;
      } else {
        estimatedInputCostUsd += (input / 1_000_000) * 2.00;
        estimatedOutputCostUsd += (output / 1_000_000) * 10.00;
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
      sentByUsCount: humanMessagesCount,
      proactiveMessagesCount,
      planUsageAllTime,
      dailyTrends: dailyTrendsResult,
      tierLimit,
      tierName,
      tierUsage,
      abitaMessageLimit,
      abitaMessageUsage
    };
  });
}
