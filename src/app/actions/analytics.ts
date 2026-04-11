'use server'

import { prisma } from '@/lib/prisma'

export async function getAnalyticsData() {
  const project = await prisma.project.findFirst()
  if (!project) return null

  const totalLeads = await prisma.lead.count({
    where: { projectId: project.id }
  })

  // Leads handed off to human
  const handedOffLeads = await prisma.lead.count({
    where: { projectId: project.id, status: 'NEEDS_AGENT' }
  })

  const messagesSaved = await prisma.message.count({
    where: { 
      role: 'assistant',
      chat: {
        lead: {
          projectId: project.id
        }
      }
    }
  })

  const unresolvedQuestions = await prisma.unansweredQuestion.count({
    where: { projectId: project.id, resolved: false }
  })

  const totalCampaigns = await prisma.campaign.count({
    where: { projectId: project.id }
  })

  // Calculamos la tasa de conversión (handoff) // Leads listos que querian hablar vs curiosos
  const conversionRate = totalLeads > 0 ? Math.round((handedOffLeads / totalLeads) * 100) : 0

  return {
    totalLeads,
    handedOffLeads,
    messagesSaved,
    unresolvedQuestions,
    totalCampaigns,
    conversionRate
  }
}
