'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getCurrentProject } from '@/lib/auth-server';
import { updateLeadAISummary } from '@/app/actions/leads';

// Obtiene todos los chats con el último mensaje para la lista de la izquierda
export async function getActiveChats() {
  const project = await getCurrentProject();
  if (!project) return [];

  const chats = await prisma.chat.findMany({
    where: {
      isArchived: false,
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
          project: true
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
    project = await prisma.project.findFirst({ where: { whatsappPhoneId: phoneId } });
  }

  if (!project) {
    project = await getCurrentProject();
  }

  if (!project) {
    project = await prisma.project.findFirst(); // Fallback for backwards compatibility if needed
  }
  
  if (!project) throw new Error("No se encontró ningún proyecto.");

  // Buscar todos los agentes activos del proyecto para decidir si auto-asignar
  const activeAgents = await prisma.agent.findMany({
    where: { projectId: project.id, isActive: true },
    select: { id: true }
  });

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

  // REGLA DE NEGOCIO: Si el lead no tiene agente y solo hay uno disponible, asignarlo de inmediato
  if (!currentLead.agentId && activeAgents.length === 1) {
    currentLead = await prisma.lead.update({
      where: { id: currentLead.id },
      data: { agentId: activeAgents[0].id },
      include: { chat: true }
    });
    console.log(`[Simulate] Auto-asignado único agente (${activeAgents[0].id}) al lead ${currentLead.id}`);
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

  // Actualizar lastActiveAt y des-archivar si estaba archivado (volvió a escribir)
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastActiveAt: new Date(), isArchived: false }
  });

  revalidatePath('/');
  return chat.id;
}

// Guarda la respuesta generada por la IA en la BD
export async function saveAssistantReply(chatId: string, text: string, scoreBump: number = 0, inputTokens: number = 0, outputTokens: number = 0, waCategory: string = 'SERVICE') {
  // Forzar valores explícitos para evitar undefined/null que Prisma convierte a NULL
  const safeInputTokens = inputTokens ?? 0;
  const safeOutputTokens = outputTokens ?? 0;
  const safeWaCategory = waCategory || 'SERVICE';
  
  console.log(`[saveAssistantReply] chatId=${chatId} inputTokens=${safeInputTokens} outputTokens=${safeOutputTokens} waCategory=${safeWaCategory} (raw: ${inputTokens}/${outputTokens}/${waCategory})`);
  
  await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: text,
      inputTokens: safeInputTokens,
      outputTokens: safeOutputTokens,
      waCategory: safeWaCategory,
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

  // Disparar resumen IA de forma asíncrona (no bloquea el mensaje)
  updateLeadAISummary(chatId).catch((e) =>
    console.error('[AI Summary] Error en disparo asíncrono:', e)
  );

  revalidatePath('/');
}

// Guarda respuestas y acciones del Agente Humano en el frontend (bot desactivado)
// Retorna { success, error } para que el UI muestre errores de envío al usuario
export async function saveAgentMessage(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { lastActiveAt: new Date() },
    include: { 
      lead: { 
        include: {           project: true
        } 
      } 
    }
  });

  let waCategory: string | null = null;
  let waSendSuccess = true;
  let waSendError: string | undefined;

  if (chat?.leadId) {
    // Si un agente habla, ya no es "NEEDS_AGENT", pasa a "IN_PROGRESS"
    await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'IN_PROGRESS' }
    });

    // 2. Enviar mensaje REAL a WhatsApp vía Meta API
    const phone = chat.lead.phone;
    const phoneId = chat.lead.project?.whatsappPhoneId;
    const token = chat.lead.project?.whatsappToken;

    if (phone && phoneId && token) {
        const result = await sendWhatsAppMessage(phone, text, phoneId, token);
        waSendSuccess = result.success;
        waCategory = result.category;

        if (!result.success) {
          const errMsg = result.raw?.error?.message || 'Error desconocido al enviar mensaje';
          const errCode = result.raw?.error?.code || '';
          waSendError = `WhatsApp Error${errCode ? ` (${errCode})` : ''}: ${errMsg}`;
          console.error(`[Manual Agent] FALLO al enviar a ${phone}: ${waSendError}`);
        } else {
          console.log(`[Manual Agent] Mensaje enviado a ${phone} (categoría: ${waCategory})`);
        }
    } else {
        waSendSuccess = false;
        waSendError = 'No hay credenciales de WhatsApp configuradas. Ve a Ajustes y configura el Phone Number ID y el Token.';
        console.error('[Manual Agent] No hay credenciales de WhatsApp configuradas en los ajustes del bot para este proyecto.');
    }
  }

  // Guardar en BD local — el mensaje se guarda siempre para que quede en el historial
  await prisma.message.create({
    data: { chatId, role: 'agent', content: text, waCategory }
  });

  revalidatePath('/');
  return { success: waSendSuccess, error: waSendError };
}

// Archiva el chat de la bandeja (NO borra el lead, mensajes ni datos de métricas)
export async function deleteChat(chatId: string) {
  await prisma.chat.update({
    where: { id: chatId },
    data: { isArchived: true }
  });
  revalidatePath('/');
}

// --- ACCIONES EN MASA ---

// Archiva múltiples chats
export async function bulkArchiveChats(chatIds: string[]) {
  await prisma.chat.updateMany({
    where: { id: { in: chatIds } },
    data: { isArchived: true }
  });
  revalidatePath('/');
}

// Desactiva la IA SOLO en chats donde actualmente está activa
export async function bulkDisableBot(chatIds: string[]) {
  await prisma.chat.updateMany({
    where: { id: { in: chatIds }, botActive: true },
    data: { botActive: false }
  });
}

// Activa la IA en todos los chats seleccionados
export async function bulkEnableBot(chatIds: string[]) {
  await prisma.chat.updateMany({
    where: { id: { in: chatIds }, botActive: false },
    data: { botActive: true }
  });
  
  // También reiniciamos los leads a PENDING
  const chats = await prisma.chat.findMany({
    where: { id: { in: chatIds } },
    select: { leadId: true }
  });

  const leadIds = chats.map(c => c.leadId).filter(Boolean) as string[];
  if (leadIds.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { status: 'PENDING' }
    });
  }
}
// Envía una plantilla de Meta a un contacto individual (Inicia nuevo chat)
export async function startIndividualChatAction(
  phone: string,
  templateName: string,
  languageCode: string,
  variables: Record<string, string>,
  templateText: string
) {
  const project = await getCurrentProject();
  if (!project) throw new Error('No se encontró el proyecto base.');
  
  if (!project.whatsappPhoneId || !project.whatsappToken) {
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
  const waResult = await sendWhatsAppTemplate(
    cleanPhone,
    templateName,
    languageCode,
    components as any,
    project.whatsappPhoneId!,
    project.whatsappToken!
  );

  // Si el envío falló, lanzar error para que el UI lo muestre al usuario
  if (!waResult.success) {
    const errMsg = waResult.raw?.error?.message || 'Error desconocido al enviar plantilla';
    const errCode = waResult.raw?.error?.code || '';
    throw new Error(`WhatsApp Error${errCode ? ` (${errCode})` : ''}: ${errMsg}`);
  }

  // 4. Guardar mensaje en el historial (como agente ya que es una acción proactiva nuestra)
  await prisma.message.create({
    data: { 
      chatId: chat.id, 
      role: 'agent', 
      content: previewText,
      waCategory: waResult.category || 'MARKETING'
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
