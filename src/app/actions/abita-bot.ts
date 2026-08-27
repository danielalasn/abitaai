'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTestMessage } from './chat';

const ABITA_BOT_EMAIL = 'abita-bot@abitaai.com';

async function getAbitaProject() {
  const client = await prisma.client.findUnique({
    where: { email: ABITA_BOT_EMAIL },
    include: {
      projects: {
        include: { agents: true }
      }
    }
  });

  if (!client || !client.projects || client.projects.length === 0) {
    return null;
  }
  return client.projects[0];
}

export async function getAbitaBotChat() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.email) {
    return { messages: [], error: 'Not authenticated' };
  }

  const project = await getAbitaProject();
  if (!project) return { messages: [], error: 'Abita Bot not initialized' };

  const leadPhone = session.user.email; // Use email as unique identifier for this client's chat

  const lead = await prisma.lead.findFirst({
    where: { projectId: project.id, phone: leadPhone },
    include: {
      chat: {
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      }
    }
  });

  if (!lead) return { messages: [] };

  return {
    messages: (lead.chat?.messages || []).map(m => ({
      ...m,
      agentName: m.agentName
    }))
  };
}

export async function sendAbitaBotMessage(message: string) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.email) {
    throw new Error('Not authenticated');
  }

  const project = await getAbitaProject();
  if (!project) throw new Error('Abita Bot not initialized');

  const leadPhone = session.user.email;
  const leadName = session.user.name || 'Cliente de Abita';

  // Obtener o crear el Lead
  let lead = await prisma.lead.findFirst({
    where: { projectId: project.id, phone: leadPhone },
    include: { chat: { include: { messages: true } } }
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        projectId: project.id,
        phone: leadPhone,
        name: leadName,
        channel: 'abita_bot',
        chat: { create: { channel: 'abita_bot' } }
      },
      include: { chat: { include: { messages: true } } }
    });
  }

  if (!lead.chat) {
    throw new Error('Failed to create chat');
  }

  // Guardar mensaje del usuario
  await prisma.message.create({
    data: {
      chatId: lead.chat.id,
      role: 'user',
      content: message,
      status: 'DELIVERED',
    }
  });

  // Re-obtener historial para pasarlo a la IA
  const chatHistory = await prisma.message.findMany({
    where: { chatId: lead.chat.id },
    orderBy: { createdAt: 'asc' }
  });

  // Excluir el último (que es el actual) para pasarlo como history
  const historyForAI = chatHistory.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content
  }));

  const agent = project.agents[0];

  try {
    // Usar la función principal de chat de prueba para procesar (ésta usa Claude, RAG, y Tools)
    const result = await sendTestMessage(
      message,
      historyForAI,
      leadName,
      project.id,
      agent?.id
    );

    // Guardar la respuesta del bot
    await prisma.message.create({
      data: {
        chatId: lead.chat.id,
        role: 'assistant',
        content: result.reply || "Hubo un error de conexión con la inteligencia de Abita.",
        status: 'DELIVERED',
        agentName: result.agentName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      }
    });

    if (result.isHandoff) {
      const { requestHandoff } = await import('./inbox');
      await requestHandoff(lead.chat.id, true); // true for skipAuth
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error Abita Bot Chat:", err);
    
    // Guardar error
    await prisma.message.create({
      data: {
        chatId: lead.chat.id,
        role: 'assistant',
        content: "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
        status: 'DELIVERED',
        agentName: 'Error',
      }
    });
    return { success: false, error: err.message };
  }
}

export async function resetAbitaBotChat() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.email) return;

  const project = await getAbitaProject();
  if (!project) return;

  const lead = await prisma.lead.findFirst({
    where: { projectId: project.id, phone: session.user.email },
    include: { chat: true }
  });

  if (lead && lead.chat) {
    await prisma.message.deleteMany({ where: { chatId: lead.chat.id } });
  }
}
