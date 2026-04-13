'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getCurrentProject } from '@/lib/auth-server';

// Obtiene todos los chats con el último mensaje para la lista de la izquierda
export async function getActiveChats() {
  const project = await getCurrentProject();
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
export async function simulateIncomingWhatsApp(phone: string, text: string, name?: string, phoneId?: string) {
  let project: any = null;

  if (phoneId) {
    const config = await prisma.botConfig.findFirst({ where: { whatsappPhoneId: phoneId } });
    if (config) {
      project = await prisma.project.findUnique({ where: { id: config.projectId } });
    }
  }

  if (!project) {
    project = await getCurrentProject();
  }

  if (!project) {
    project = await prisma.project.findFirst(); // Fallback for backwards compatibility if needed
  }
  
  if (!project) throw new Error("No se encontró ningún proyecto.");

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
// Envía una plantilla de Meta a un contacto individual (Inicia nuevo chat)
export async function startIndividualChatAction(
  phone: string,
  templateName: string,
  languageCode: string,
  variables: Record<string, string>,
  templateText: string
) {
  const project = await prisma.project.findFirst({
    include: { botConfig: true }
  });
  if (!project) throw new Error('No se encontró el proyecto base.');
  const config = project.botConfig;
  
  if (!config?.whatsappPhoneId || !config?.whatsappToken) {
    throw new Error('Configura el Phone Number ID y el CRM Token en Ajustes antes de iniciar chats.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7) throw new Error('El número de teléfono es demasiado corto.');

  // Construir parámetros del cuerpo
  const paramEntries = Object.entries(variables).sort(([a], [b]) => Number(a) - Number(b));
  const bodyParams = paramEntries.map(([, val]) => ({
    type: 'text' as const,
    text: val,
  }));

  const components = bodyParams.length > 0
    ? [{ type: 'body' as const, parameters: bodyParams }]
    : [];

  // Texto amigable para el historial del chat
  let previewText = templateText;
  paramEntries.forEach(([k, val]) => {
    previewText = previewText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
  });

  // 1. Upsert Lead
  let lead = await prisma.lead.findFirst({ where: { phone: cleanPhone, projectId: project.id } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        phone: cleanPhone,
        projectId: project.id,
        name: `Lead ${cleanPhone.slice(-4)}`,
      }
    });
  }

  // 2. Upsert Chat
  let chat = await prisma.chat.findUnique({ where: { leadId: lead.id } });
  if (!chat) {
    chat = await prisma.chat.create({ data: { leadId: lead.id } });
  }

  // 3. Enviar vía WhatsApp Cloud API
  await sendWhatsAppTemplate(
    cleanPhone,
    templateName,
    languageCode,
    components as any,
    config.whatsappPhoneId,
    config.whatsappToken
  );

  // 4. Guardar mensaje en el historial (como agente ya que es una acción proactiva nuestra)
  await prisma.message.create({
    data: { 
      chatId: chat.id, 
      role: 'agent', 
      content: previewText 
    }
  });

  // 5. Actualizar última actividad y desactivar bot para que el humano siga la conversación
  await prisma.chat.update({
    where: { id: chat.id },
    data: { 
      lastActiveAt: new Date(),
      botActive: false // Desactivamos el bot para atención manual tras el primer contacto
    }
  });

  revalidatePath('/');
  return chat.id;
}
