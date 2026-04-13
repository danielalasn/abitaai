'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Obtiene todos los chats con el último mensaje para la lista de la izquierda
export async function getActiveChats() {
  const project = await prisma.project.findFirst();
  if (!project) return [];

  const chats = await prisma.chat.findMany({
    where: {
      lead: {
        projectId: project.id
      }
    },
    include: {
      lead: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: {
      lastActiveAt: 'desc'
    }
  });

  return chats;
}

// Obtiene todo el historial de un chat en particular
export async function getChatMessages(chatId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      lead: {
        include: {
          project: {
            include: {
              botConfig: true
            }
          }
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  return chat;
}

// Apaga o enciende la IA (Handover manual)
export async function toggleBotActive(chatId: string, botActive: boolean) {
  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { botActive },
    select: { leadId: true }
  });
  
  if (botActive && chat?.leadId) {
    // Si la IA vuelve a encenderse, el status se reinicia a PENDING
    await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'PENDING' }
    });
  }
  
  revalidatePath('/');
}

// Apaga la IA automáticamente y marca como prioridad roja
export async function requestHandoff(chatId: string) {
  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { botActive: false },
    select: { leadId: true }
  });

  if (chat?.leadId) {
    await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'NEEDS_AGENT' }
    });
  }

  revalidatePath('/');
}

// Simula la entrada de un mensaje por WhatsApp
export async function simulateIncomingWhatsApp(phone: string, text: string, name?: string) {
  const project = await prisma.project.findFirst();
  if (!project) throw new Error("No se encontró ningún proyecto en la base de datos.");

  // Buscar o crear Lead
  let currentLead = await prisma.lead.findFirst({
    where: { phone, projectId: project.id },
    include: { chat: true }
  });

  if (!currentLead) {
    currentLead = await prisma.lead.create({
      data: {
        phone,
        projectId: project.id,
        name: name || `+503 ${phone}`
      },
      include: { chat: true }
    });
  }

  // Buscar o crear Chat
  let chat = currentLead.chat;
  if (!chat) {
    chat = await prisma.chat.create({
      data: { leadId: currentLead.id }
    });
  }

  // Guardar mensaje entrante
  await prisma.message.create({
    data: {
      chatId: chat.id,
      role: 'user',
      content: text
    }
  });

  // Actualizar lastActiveAt
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastActiveAt: new Date() }
  });

  revalidatePath('/');
  return chat.id;
}

// Guarda la respuesta generada por la IA en la BD
export async function saveAssistantReply(chatId: string, text: string, scoreBump: number = 0) {
  await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: text
    }
  });
  
  await prisma.chat.update({
    where: { id: chatId },
    data: { lastActiveAt: new Date() }
  });

  // Lógica de puntuación
  const chat = await prisma.chat.findUnique({ 
    where: { id: chatId }, 
    include: { lead: true, _count: { select: { messages: true } } } 
  });

  if (chat?.lead) {
    let finalScoreBump = scoreBump;

    // Bono de Retención: +10 puntos si el chat dura más de 10 mensajes (5 vueltas)
    // Solo lo aplicamos una vez justo cuando llega al mensaje 11 (6 del bot o 5 del user + 6 del bot)
    if (chat._count.messages === 11) {
      finalScoreBump += 10;
      console.log("Bono de Retención detectado (+10 pts)");
    }

    if (finalScoreBump !== 0) {
      let newScore = (chat.lead.score || 0) + finalScoreBump;
      newScore = Math.max(0, Math.min(100, newScore));
      
      let newHeat = "FRIO";
      if (newScore >= 80) newHeat = "CALIENTE";
      else if (newScore >= 40) newHeat = "TIBIO";

      await prisma.lead.update({
        where: { id: chat.lead.id },
        data: { score: newScore, heat: newHeat }
      });
    }
  }

  revalidatePath('/');
}

// Guarda respuestas y acciones del Agente Humano en el frontend (bot desactivado)
export async function saveAgentMessage(chatId: string, text: string) {
  // 1. Guardar en BD local
  await prisma.message.create({
    data: { chatId, role: 'agent', content: text }
  });
  
  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { lastActiveAt: new Date() },
    include: { 
      lead: { 
        include: { 
          project: { 
            include: { botConfig: true } 
          } 
        } 
      } 
    }
  });

  if (chat?.leadId) {
    // Si un agente habla, ya no es "NEEDS_AGENT", pasa a "IN_PROGRESS"
    await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'IN_PROGRESS' }
    });

    // 2. Enviar mensaje REAL a WhatsApp vía Meta API
    const phone = chat.lead.phone;
    const phoneId = chat.lead.project?.botConfig?.whatsappPhoneId;
    const token = chat.lead.project?.botConfig?.whatsappToken;

    if (phone && phoneId && token) {
        await sendWhatsAppMessage(phone, text, phoneId, token);
        console.log(`[Manual Agent] Mensaje enviado a ${phone}`);
    } else {
        console.error('[Manual Agent] No hay credenciales de WhatsApp configuradas en los ajustes del bot para este proyecto.');
    }
  }

  revalidatePath('/');
}

// Elimina el chat completo y toda su historia/lead
export async function deleteChat(chatId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { leadId: true }
  });
  
  if (chat?.leadId) {
    // Al borrar el 'lead', la base de datos borrará en cascada el chat y los mensajes.
    await prisma.lead.delete({
      where: { id: chat.leadId }
    });
  }
  
  revalidatePath('/');
}
