'use server';

import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

export async function createCampaign(name: string, templateMessage: string, leadsData: any[]) {
  const project = await prisma.project.findFirst();
  if (!project) throw new Error("No se encontró el proyecto base.");

  // Crear la campaña en la base de datos
  const campaign = await prisma.campaign.create({
    data: {
      projectId: project.id,
      name,
      status: 'RUNNING',
      leadCount: leadsData.length,
      csvData: JSON.stringify(leadsData)
    }
  });

  // Idealmente, esto se enviaría a una cola (como BullMQ) para procesar
  // en segundo plano y no bloquear la respuesta HTTP.  
  // Para MVP, procesaremos de forma asíncrona pero sin queue manager.
  
  // Procesamos en modo "fire and forget" para que el Server Action retorne rápido
  processCampaign(campaign.id, project.id, templateMessage, leadsData).catch(console.error);

  revalidatePath('/campaigns');
  return campaign;
}

export async function getCampaigns() {
  const project = await prisma.project.findFirst();
  if (!project) return [];

  return await prisma.campaign.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' }
  });
}

// Worker improvisado
async function processCampaign(campaignId: string, projectId: string, templateMessage: string, leadsData: any[]) {
  let successCount = 0;

  for (const leadData of leadsData) {
    const rawPhone = leadData['#'];
    if (!rawPhone) continue;
      
    // 1. Limpiar el número (remover espacios, sumar código de país si es necesario)
    const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) continue; // Número inválido muy corto

    // Reemplazar dinámicamente las variables en el mensaje
    let personalizedMessage = templateMessage;
    
    // Buscar todas las variables como @nombre_columna en el texto
    const variableMap = Object.keys(leadData);
    
    for (const key of variableMap) {
        // Reemplazar la variante @Nombre (case-insensitive para mayor flexibilidad, si se puede)
        // Pero usamos un simple split/join para evitar regex complicados al escapar caracteres
        const searchPattern = `@${key}`;
        personalizedMessage = personalizedMessage.split(searchPattern).join(leadData[key]);
    }
      
    // 2. Buscar o crear el Lead en la DB
    let lead = await prisma.lead.findFirst({
      where: { phone: cleanPhone, projectId }
    });

    if (!lead) {
      // Si la tabla tiene la columna 'nombre', la usamos para crear el lead con nombre
      // Buscamos 'nombre' ignorando mayúsculas/minúsculas
      const nameKey = Object.keys(leadData).find(k => k.toLowerCase() === 'nombre');
      const leadName = nameKey ? leadData[nameKey] : `Lead Campaña ${campaignId.slice(-4)}`;
        
      lead = await prisma.lead.create({
        data: {
          phone: cleanPhone,
          projectId,
          name: leadName
        }
      });
    }

    // 3. Obtener o crear Chat
    let chat = await prisma.chat.findUnique({
      where: { leadId: lead.id }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { leadId: lead.id }
      });
    }

    // 4. Enviar mensaje por WhatsApp
    // Como es MVP, intentamos enviarlo, fallará silenciomente si no hay token real
    await sendWhatsAppMessage(cleanPhone, personalizedMessage);

    // 5. Guardar el mensaje enviado en la BD para que aparezca en el Inbox
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: personalizedMessage
      }
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastActiveAt: new Date() }
    });

    successCount++;
    
    // Pequeño delay de 1 segundo entre envíos para no hacer rate limit a Meta API
    await new Promise(r => setTimeout(r, 1000));
  }

  // Marcar campaña como finalizada
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' }
  });
}
