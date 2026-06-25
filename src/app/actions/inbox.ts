'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage, sendWhatsAppTemplate, sendWhatsAppMedia, WaMediaType } from '@/lib/whatsapp';
import { getCurrentProject, resolveProjectCredentials } from '@/lib/auth-server';
import { updateLeadAISummaryInternal } from '@/app/actions/leads';
import { unstable_noStore as noStore } from 'next/cache';
import { decrypt } from '@/lib/encryption';
import { sendHandoffNotification } from '@/lib/email';

// Obtiene todos los chats con el último mensaje para la lista de la izquierda
export async function getActiveChats(_timestamp?: number) {
  noStore();
  const project = await getCurrentProject();
  if (!project) return [];

  // 1. Obtener los chats activos
  const chats = await prisma.chat.findMany({
    where: {
      isArchived: false,
      lead: { 
        projectId: project.id,
        NOT: { channel: 'simulator' }
      }
    },
    include: { 
      lead: {
        include: {
          project: { select: { leadScoringEnabled: true } }
        }
      } 
    },
    orderBy: { lastActiveAt: 'desc' }
  });

  if (chats.length === 0) return [];

  // 2. Obtener el último mensaje de cada chat de forma eficiente
  const chatsWithMessages = await Promise.all(chats.map(async chat => {
    const lastMessage = await prisma.message.findFirst({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' }
    });
    return {
      ...chat,
      messages: lastMessage ? [lastMessage] : []
    };
  }));

  return chatsWithMessages;
}

export async function getChatMessages(chatId: string) {
  noStore();
  const project = await getCurrentProject();
  if (!project) return null;

  // 1. Obtener el chat base
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      lead: {
        include: { project: true }
      }
    }
  });

  if (!chat || chat.lead.projectId !== project.id) return null;

  if (!chat) return null;

  // 2. Obtener TODAS las conversaciones de este chat (Bypass de cache de include)
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' }
  });

  return {
    ...chat,
    messages
  };
}

// Versión paginada: carga solo los últimos `limit` mensajes de forma rápida
export async function getChatMessagesPaginated(chatId: string, limit = 30) {
  noStore();
  const project = await getCurrentProject();
  if (!project) return null;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { lead: { include: { project: true } } }
  });

  if (!chat || chat.lead.projectId !== project.id) return null;

  if (!chat) return null;

  const [total, messages] = await Promise.all([
    prisma.message.count({ where: { chatId } }),
    prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  ]);

  // Devolvemos en orden cronológico (asc) para renderizar correctamente
  return {
    ...chat,
    messages: messages.reverse(),
    totalMessages: total,
    hasMore: total > limit
  };
}

// Carga mensajes más antiguos (infinite scroll hacia arriba)
// cursor = createdAt del mensaje más antiguo actualmente visible
export async function loadMoreMessages(chatId: string, beforeDate: string, limit = 30) {
  noStore();
  const project = await getCurrentProject();
  if (!project) return [];

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { lead: true }
  });

  if (!chat || chat.lead.projectId !== project.id) return [];

  const messages = await prisma.message.findMany({
    where: {
      chatId,
      createdAt: { lt: new Date(beforeDate) }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return messages.reverse();
}

// Apaga o enciende la IA (Handover manual)
export async function toggleBotActive(chatId: string, botActive: boolean) {
  const project = await getCurrentProject();
  if (!project) {
    console.error(`[toggleBotActive] No project found for current session`);
    throw new Error("No project found");
  }
  const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
  if (!chatToVerify) {
    console.error(`[toggleBotActive] Chat not found: ${chatId}`);
    throw new Error("Chat not found");
  }
  if (chatToVerify.lead.projectId !== project.id) {
    console.error(`[toggleBotActive] Project mismatch. Chat project: ${chatToVerify.lead.projectId}, Session project: ${project.id}`);
    throw new Error("Project mismatch");
  }

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { botActive, lastActiveAt: new Date() },
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

export async function toggleAutoWakeBot(chatId: string, autoWakeBot: boolean) {
  const project = await getCurrentProject();
  if (!project) throw new Error("No project found");
  
  const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
  if (!chatToVerify || chatToVerify.lead.projectId !== project.id) {
    throw new Error("Chat not found or project mismatch");
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: { autoWakeBot }
  });
}

// Apaga la IA automáticamente y marca como prioridad roja
export async function requestHandoff(chatId: string, skipAuth = false) {
  if (!skipAuth) {
    const project = await getCurrentProject();
    if (!project) return;
    const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
    if (!chatToVerify || chatToVerify.lead.projectId !== project.id) return;
  }

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { botActive: false, lastActiveAt: new Date() },
    select: { leadId: true }
  });

  if (chat?.leadId) {
    const lead = await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'NEEDS_AGENT' },
      include: { project: true }
    });

    // Send email notifications
    const notificationEmails = (lead.project as any).notificationEmails as string[] | undefined;
    if (notificationEmails && notificationEmails.length > 0) {
      sendHandoffNotification(notificationEmails, {
        leadName: lead.name,
        leadPhone: lead.phone,
        leadScore: lead.score,
        projectName: lead.project.name,
        channel: lead.channel,
      }).catch((e) => console.error('[Email] Error enviando notificación de handoff:', e));
    }
  }

  try { revalidatePath('/') } catch (e) {};
}

// Simula la recepción de un mensaje a través del webhook guardándolo en BD (Chat + Mensajes)
export async function simulateIncomingMessage(
  phone: string, 
  text: string, 
  name?: string, 
  phoneId?: string, 
  channel: 'whatsapp' | 'instagram' = 'whatsapp',
  fallbackProjectId?: string,
  mediaUrl?: string,
  mediaFilename?: string,
  mediaType?: string
) {
  let project: any = null;

  if (phoneId) {
    project = await prisma.project.findFirst({ where: { whatsappPhoneId: phoneId } });
    if (!project && phoneId === (process.env.WHATSAPP_PHONE_ID || '1087380634460356')) {
      project = await prisma.project.findFirst({
        where: { client: { email: 'abita@abitaai.com' } }
      }) || await prisma.project.findFirst({
        where: { client: { email: 'info@abitaai.com' } }
      });
    }
  }

  if (!project && fallbackProjectId) {
    project = await prisma.project.findUnique({ where: { id: fallbackProjectId } });
  }

  if (!project) {
    console.error(`[Inbox] No se encontró el proyecto para PhoneID: ${phoneId}. El mensaje será ignorado para evitar asignación incorrecta.`);
    throw new Error("Proyecto no encontrado para el PhoneID proporcionado.");
  }

  project = resolveProjectCredentials(project);

  // Buscar todos los agentes activos del proyecto para decidir si auto-asignar
  const activeAgents = await prisma.agent.findMany({
    where: { projectId: project.id, isActive: true },
    select: { id: true }
  });

  // Prevent Duplicate Leads: Check for both '5037xxxxxxx' and '7xxxxxxx' formats
  const possiblePhones = [phone];
  if (phone.startsWith('503') && phone.length === 11) {
    possiblePhones.push(phone.substring(3)); // Add the 8-digit version without generic 503 prefix
  }

  // Buscar o crear Lead
  let currentLead = await prisma.lead.findFirst({
    where: { 
        projectId: project.id,
        phone: { in: possiblePhones }
    },
    include: { chat: true }
  });


  if (!currentLead) {
    currentLead = await prisma.lead.create({
      data: {
        phone,
        projectId: project.id,
        name: name || (channel === 'instagram' ? `@${phone}` : `+503 ${phone}`),
        channel
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
      data: { 
        leadId: currentLead.id, 
        channel,
        botActive: project.defaultBotActive ?? true,
        autoWakeBot: project.defaultBotActive ?? true
      }
    });
  }

  // Guardar mensaje entrante
  const isImage = mediaType === 'image';
  
  await prisma.message.create({
    data: {
      chatId: chat.id,
      role: 'user',
      content: text,
      imageUrl: isImage && mediaUrl ? mediaUrl : null,
      mediaUrl,
      mediaFilename,
      mediaType
    }
  });

  // Actualizar lastActiveAt y des-archivar si estaba archivado (volvió a escribir)
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastActiveAt: new Date(), isArchived: false }
  });

  try { try { revalidatePath('/') } catch (e) {}; } catch (e) {}
  return chat.id;
}

// Guarda la respuesta generada por la IA en la BD
export async function saveAssistantReply(
  chatId: string, 
  text: string, 
  scoreBump: number = 0, 
  inputTokens: number = 0, 
  outputTokens: number = 0, 
  waCategory: string = 'SERVICE',
  agentName?: string,
  scoreReason?: string,
  wamid?: string,
  extractedEmail?: string | null,
  sendError?: string | null
) {
  // Forzar valores explícitos para evitar undefined/null que Prisma convierte a NULL
  const safeInputTokens = inputTokens ?? 0;
  const safeOutputTokens = outputTokens ?? 0;
  const safeWaCategory = waCategory || 'SERVICE';
  
  console.log(`[saveAssistantReply] chatId=${chatId} inputTokens=${safeInputTokens} outputTokens=${safeOutputTokens} waCategory=${safeWaCategory} (agent: ${agentName})`);
  
  if (wamid) {
    const existing = await prisma.message.findUnique({ where: { wamid } });
    if (existing) {
      console.log(`[saveAssistantReply] Mensaje con wamid ${wamid} ya existe. Omitiendo creación duplicada.`);
      return;
    }
  }

  await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: text,
      inputTokens: safeInputTokens,
      outputTokens: safeOutputTokens,
      waCategory: safeWaCategory,
      agentName: agentName || null,
      scoreBump: scoreBump > 0 ? scoreBump : null,
      scoreReason: scoreReason || null,
      wamid: wamid || null,
      status: wamid ? "SENT" : "failed",
      sendError: sendError || null
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

    if (finalScoreBump !== 0 || (extractedEmail && chat.lead.email !== extractedEmail)) {
      let newScore = (chat.lead.score || 0) + finalScoreBump;
      newScore = Math.max(0, Math.min(100, newScore));
      
      let newHeat = "FRIO";
      if (newScore >= 80) newHeat = "CALIENTE";
      else if (newScore >= 40) newHeat = "TIBIO";

      await prisma.lead.update({
        where: { id: chat.lead.id },
        data: { 
          score: newScore, 
          heat: newHeat,
          email: extractedEmail || chat.lead.email
        }
      });
    }
  }

  // Disparar resumen IA de forma asíncrona (no bloquea el mensaje)
  updateLeadAISummaryInternal(chatId).catch((e) =>
    console.error('[AI Summary] Error en disparo asíncrono:', e)
  );

  try { revalidatePath('/') } catch (e) {};
}

// Guarda respuestas y acciones del Agente Humano en el frontend (bot desactivado)
// Retorna { success, error } para que el UI muestre errores de envío al usuario
export async function saveAgentMessage(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  const project = await getCurrentProject();
  if (!project) return { success: false, error: "No autorizado" };
  const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
  if (!chatToVerify || chatToVerify.lead.projectId !== project.id) return { success: false, error: "No autorizado" };

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
  let wamid: string | null = null;

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

    const resolvedToken = token ? decrypt(token) : process.env.SYSTEM_USER_TOKEN;
    if (phone && phoneId && resolvedToken) {
        const result = await sendWhatsAppMessage(phone, text, phoneId, resolvedToken);
        waSendSuccess = result.success;
        waCategory = result.category;
        wamid = result.messageId;

        if (!result.success) {
          waSendError = result.friendlyError || 'Error desconocido al enviar mensaje';
          console.error(`[Manual Agent] FALLO al enviar a ${phone}: ${waSendError}`);
        } else {
          console.log(`[Manual Agent] Mensaje enviado a ${phone} (categoría: ${waCategory})`);
        }
    } else {
        waSendSuccess = false;
        waSendError = 'Configura el Phone Number ID y el CRM Token en Ajustes antes de enviar mensajes.';
        console.error('[Manual Agent] No hay credenciales de WhatsApp configuradas.');
    }
  }

  if (wamid) {
    const existing = await prisma.message.findUnique({ where: { wamid } });
    if (existing) {
      console.log(`[Manual Agent] Mensaje con wamid ${wamid} ya existe. Omitiendo duplicado.`);
      return { success: waSendSuccess, error: waSendError };
    }
  }

  // Guardar en BD local — el mensaje se guarda siempre para que quede en el historial
  await prisma.message.create({
    data: { chatId, role: 'agent', content: text, waCategory, wamid }
  });

  try { revalidatePath('/') } catch (e) {};
  return { success: waSendSuccess, error: waSendError };
}

// Envia un archivo multimedia (imagen, PDF, video) como agente humano
export async function sendAgentMedia(
  chatId: string,
  mediaUrl: string,
  mediaType: WaMediaType,
  filename: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  const project = await getCurrentProject();
  if (!project) return { success: false, error: "No autorizado" };
  const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
  if (!chatToVerify || chatToVerify.lead.projectId !== project.id) return { success: false, error: "No autorizado" };

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { lastActiveAt: new Date() },
    include: { lead: { include: { project: true } } }
  });

  let waSendSuccess = true;
  let waSendError: string | undefined;
  let wamid: string | null = null;
  let waCategory: string | null = null;

  if (chat?.leadId) {
    await prisma.lead.update({
      where: { id: chat.leadId },
      data: { status: 'IN_PROGRESS' }
    });

    const phone = chat.lead.phone;
    const phoneId = chat.lead.project?.whatsappPhoneId;
    const token = chat.lead.project?.whatsappToken;

    const resolvedToken = token ? decrypt(token) : process.env.SYSTEM_USER_TOKEN;
    if (phone && phoneId && resolvedToken) {
      const result = await sendWhatsAppMedia(
        phone, mediaUrl, mediaType, phoneId, resolvedToken, caption, filename
      );
      waSendSuccess = result.success;
      waCategory = result.category;
      wamid = result.messageId;
      if (!result.success) waSendError = result.friendlyError || 'Error al enviar media';
    } else {
      waSendSuccess = false;
      waSendError = 'Configura el Phone Number ID y el Token en Ajustes.';
    }
  }

  // Determinar si es imagen para mostrarla en el chat
  const isImage = mediaType === 'image';

  if (wamid) {
    const existing = await prisma.message.findUnique({ where: { wamid } });
    if (existing) {
      console.log(`[sendAgentMedia] Mensaje con wamid ${wamid} ya existe. Omitiendo duplicado.`);
      return { success: waSendSuccess, error: waSendError };
    }
  }

  await prisma.message.create({
    data: {
      chatId,
      role: 'agent',
      content: caption || filename,
      imageUrl: isImage ? mediaUrl : null,
      mediaUrl,
      mediaFilename: filename,
      mediaType,
      waCategory,
      wamid
    }
  });

  try { revalidatePath('/') } catch (e) {};
  return { success: waSendSuccess, error: waSendError };
}

// Archiva el chat de la bandeja (NO borra el lead, mensajes ni datos de métricas)
export async function deleteChat(chatId: string) {
  const project = await getCurrentProject();
  if (!project) return;
  const chatToVerify = await prisma.chat.findUnique({ where: { id: chatId }, include: { lead: true } });
  if (!chatToVerify || chatToVerify.lead.projectId !== project.id) return;

  await prisma.chat.update({
    where: { id: chatId },
    data: { isArchived: true }
  });
  try { revalidatePath('/') } catch (e) {};
}

// --- ACCIONES EN MASA ---

// Archiva múltiples chats
export async function bulkArchiveChats(chatIds: string[]) {
  const project = await getCurrentProject();
  if (!project || chatIds.length === 0) return;

  const validChats = await prisma.chat.findMany({
    where: { id: { in: chatIds }, lead: { projectId: project.id } },
    select: { id: true }
  });
  const validIds = validChats.map(c => c.id);

  if (validIds.length > 0) {
    await prisma.chat.updateMany({
      where: { id: { in: validIds } },
      data: { isArchived: true }
    });
  }
  try { revalidatePath('/') } catch (e) {};
}

// Desactiva la IA SOLO en chats donde actualmente está activa
export async function bulkDisableBot(chatIds: string[]) {
  const project = await getCurrentProject();
  if (!project || chatIds.length === 0) return;

  const validChats = await prisma.chat.findMany({
    where: { id: { in: chatIds }, lead: { projectId: project.id } },
    select: { id: true }
  });
  const validIds = validChats.map(c => c.id);

  if (validIds.length > 0) {
    await prisma.chat.updateMany({
      where: { id: { in: validIds }, botActive: true },
      data: { botActive: false }
    });
  }
}

// Activa la IA en todos los chats seleccionados
export async function bulkEnableBot(chatIds: string[]) {
  const project = await getCurrentProject();
  if (!project || chatIds.length === 0) return;

  const chats = await prisma.chat.findMany({
    where: { id: { in: chatIds }, lead: { projectId: project.id } },
    select: { id: true, leadId: true }
  });
  const validIds = chats.map(c => c.id);

  if (validIds.length > 0) {
    await prisma.chat.updateMany({
      where: { id: { in: validIds }, botActive: false },
      data: { botActive: true }
    });
  }
  
  // También reiniciamos los leads a PENDING

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
  templateText: string,
  templateCategory: string, // MARKETING o UTILITY
  headerImageUrl?: string,
  botActive: boolean = true,
  leadName?: string
): Promise<{ success: boolean; error?: string; chatId?: string }> {
  try {
    const project = await getCurrentProject();
    if (!project) return { success: false, error: 'No se encontró el proyecto base.' };
    
    if (!project.whatsappPhoneId || !project.whatsappToken) {
      return { success: false, error: 'Configura el Phone Number ID y el CRM Token en Ajustes antes de iniciar chats.' };
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 7) return { success: false, error: 'El número de teléfono es demasiado corto.' };

    // Construir parámetros del cuerpo
    const paramEntries = Object.entries(variables).sort(([a], [b]) => Number(a) - Number(b));
    const bodyParams = paramEntries.map(([, val]) => ({
      type: 'text' as const,
      text: val,
    }));

    const components: any[] = bodyParams.length > 0
      ? [{ type: 'body' as const, parameters: bodyParams }]
      : [];

    // Añadir imagen si se proporcionó
    if (headerImageUrl && headerImageUrl.startsWith('http')) {
      components.unshift({
        type: 'header',
        parameters: [
          { type: 'image', image: { link: headerImageUrl } }
        ]
      });
    }

    // Texto amigable para el historial del chat
    let previewText = templateText;
    paramEntries.forEach(([k, val]) => {
      previewText = previewText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
    });

    // 1. Upsert Lead
    let lead = await prisma.lead.findFirst({ where: { phone: cleanPhone, projectId: project.id } });
    const finalName = leadName?.trim() || cleanPhone;

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone: cleanPhone,
          projectId: project.id,
          name: finalName,
        }
      });
    } else if (leadName?.trim() && (lead.name?.includes('Lead') || lead.name === lead.phone)) {
      // Actualizar nombre si era genérico
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { name: leadName.trim() }
      });
    }

    // 2. Upsert Chat
    let chat = await prisma.chat.findUnique({ where: { leadId: lead.id } });
    if (!chat) {
      chat = await prisma.chat.create({ 
        data: { 
          leadId: lead.id,
          botActive: botActive,
          autoWakeBot: botActive
        } 
      });
    } else {
      chat = await prisma.chat.update({
        where: { id: chat.id },
        data: { botActive: botActive, autoWakeBot: botActive }
      });
    }

    const resolvedToken = project.whatsappToken ? decrypt(project.whatsappToken) : null;
    if (!resolvedToken) {
      return { success: false, error: 'Token de WhatsApp inválido o no configurado.' };
    }

    // 3. Enviar vía WhatsApp Cloud API
    const waResult = await sendWhatsAppTemplate(
      cleanPhone,
      templateName,
      languageCode,
      components as any,
      project.whatsappPhoneId!,
      resolvedToken,
      (templateCategory as any) || 'MARKETING'
    );

    // Si el envío falló, retornar error amigable
    if (!waResult.success) {
      return { success: false, error: waResult.friendlyError || 'Error desconocido al enviar plantilla' };
    }

    // 4. Guardar mensaje en el historial (como agente ya que es una acción proactiva nuestra)
    await prisma.message.create({
      data: { 
        chatId: chat.id, 
        role: 'agent', 
        content: previewText,
        waCategory: waResult.category || 'MARKETING',
        imageUrl: headerImageUrl
      }
    });

    // 5. Actualizar última actividad y estado del bot
    await prisma.chat.update({
      where: { id: chat.id },
      data: { 
        lastActiveAt: new Date(),
        botActive: botActive 
      }
    });

    try { try { revalidatePath('/') } catch (e) {}; } catch (e) {}
    return { success: true, chatId: chat.id };
  } catch (error: any) {
    console.error('[startIndividualChatAction] Error:', error);
    return { success: false, error: 'Ocurrió un error inesperado al iniciar el chat.' };
  }
}
