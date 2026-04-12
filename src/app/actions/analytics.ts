'use server'

import { prisma } from '@/lib/prisma'

export async function getAnalyticsData(dateRange?: { start?: string, end?: string }) {
  const project = await prisma.project.findFirst()
  if (!project) return null

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
    where: { projectId: project.id, ...dateFilter }
  })

  // Leads handed off to human
  const handedOffLeads = await prisma.lead.count({
    where: { projectId: project.id, status: 'NEEDS_AGENT', ...dateFilter }
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

  // Heatmap calculations
  const hotLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'CALIENTE', ...dateFilter } })
  const warmLeads = await prisma.lead.count({ where: { projectId: project.id, heat: 'TIBIO', ...dateFilter } })
  const coldLeads = await prisma.lead.count({ where: { projectId: project.id, heat: { in: ['FRIO', ''] }, ...dateFilter } })

  const botActiveLeads = await prisma.chat.count({ where: { lead: { projectId: project.id }, botActive: true, ...dateFilter } })
  const needsAgentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: 'NEEDS_AGENT' }, botActive: false, ...dateFilter } })
  const agentLeads = await prisma.chat.count({ where: { lead: { projectId: project.id, status: { not: 'NEEDS_AGENT' } }, botActive: false, ...dateFilter } })

  // Calculamos la tasa de conversión (handoff)
  const conversionRate = totalLeads > 0 ? Math.round((handedOffLeads / totalLeads) * 100) : 0
  
  // Tasa de Autonomía real: Leads que el bot maneja vs el total
  const autonomyRate = totalLeads > 0 ? Math.round((botActiveLeads / totalLeads) * 100) : 0

  return {
    totalLeads,
    handedOffLeads,
    messagesSaved,
    unresolvedQuestions,
    totalCampaigns,
    conversionRate,
    autonomyRate,
    hotLeads,
    warmLeads,
    coldLeads,
    botActiveLeads,
    needsAgentLeads,
    agentLeads
  }
}

