'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentProject } from '@/lib/auth-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getLeads() {
  const project = await getCurrentProject();
  if (!project) return [];

  const leads = await prisma.lead.findMany({
    where: { projectId: project.id },
    include: {
      latestCampaign: { select: { name: true } },
      chat: {
        include: {
          messages: {
            select: { role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return leads.map((lead) => {
    const messages = lead.chat?.messages || [];
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const lastMessageAt = messages[0]?.createdAt || null;

    return {
      id: lead.id,
      phone: lead.phone,
      name: lead.name,
      email: lead.email,
      status: lead.status,
      score: lead.score,
      heat: lead.heat,
      aiSummary: lead.aiSummary,
      latestCampaignName: lead.latestCampaign?.name || null,
      createdAt: lead.createdAt,
      lastMessageAt,
      userMessageCount: userMessages,
    };
  });
}

export async function updateLeadAISummary(chatId: string, force: boolean = false) {
  const project = await getCurrentProject();
  if (!project) return null;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { lead: true },
  });

  if (!chat || !chat.lead || chat.lead.projectId !== project.id) return null;

  return updateLeadAISummaryInternal(chatId, force);
}

export async function updateLeadAISummaryInternal(chatId: string, force: boolean = false) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!chat || !chat.lead) return null;

  const userMessages = chat.messages.filter((m) => m.role === 'user');
  const count = userMessages.length;

  // Generate summary on 3rd user message, then every 5 after
  const shouldUpdate = force || count === 3 || (count > 3 && (count - 3) % 5 === 0);
  if (!shouldUpdate) return chat.lead.aiSummary;

  // Build conversation transcript
  const transcript = chat.messages
    .map((m) => {
      const role = m.role === 'user' ? 'Cliente' : 'Asistente';
      return `${role}: ${m.content}`;
    })
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Analiza esta conversación entre un cliente y un asistente virtual. 
Genera un resumen de máximo 2 oraciones que explique:
1. Qué preguntó o buscaba el cliente
2. En qué punto se detuvo la conversación o cuál fue el momento clave

Responde SOLO el resumen, sin introducción ni explicación adicional. Usa español.

CONVERSACIÓN:
${transcript}`,
        },
      ],
    });

    const summary =
      response.content[0].type === 'text' ? response.content[0].text.trim() : null;
    if (!summary) return;

    await prisma.lead.update({
      where: { id: chat.lead.id },
      data: { aiSummary: summary },
    });

    return summary;
  } catch (e) {
    console.error('[AI Summary] Claude Error, intentando fallback con Gemini:', e);
    
    try {
      if (!process.env.GEMINI_API_KEY) return null;
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Analiza esta conversación entre un cliente y un asistente virtual. 
Genera un resumen de máximo 2 oraciones que explique:
1. Qué preguntó o buscaba el cliente
2. En qué punto se detuvo la conversación o cuál fue el momento clave

Responde SOLO el resumen, sin introducción ni explicación adicional. Usa español.

CONVERSACIÓN:
${transcript}`;

      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();

      if (summary) {
        await prisma.lead.update({
          where: { id: chat.lead.id },
          data: { aiSummary: summary },
        });
        return summary;
      }
    } catch (geminiError) {
      console.error('[AI Summary] Gemini Fallback Error:', geminiError);
    }
    return null;
  }
}
