import { NextRequest, NextResponse } from 'next/server';
import { simulateIncomingWhatsApp, saveAssistantReply, getChatMessages } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado correctamente');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('--- [WEBHOOK INCOMING] ---', JSON.stringify(body));

    // Validar qué tipo de notificación es
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const status = value?.statuses?.[0];
    const metadataPhoneId = value?.metadata?.phone_number_id;

    if (message) console.log(`[Webhook] Tipo: MENSAJE de ${message.from} hacia PhoneID: ${metadataPhoneId}`);
    if (status) console.log(`[Webhook] Tipo: ESTATUS ${status.status} para ${status.id}`);

    // Caso A: Notificación de ESTADO (sent, delivered, failed, read)
    if (status) {
        console.log(`[DEBUG-WEBHOOK] Recibido status ${status.status} para WAMID: ${status.id}`);
        // Verificación extra para debug local
        const { prisma } = await import('@/lib/prisma');
        const logCount = await prisma.campaignLog.count({ where: { wamid: status.id } });
        console.log(`[DEBUG-WEBHOOK] Registros encontrados en CampaignLog para este ID: ${logCount}`);

        if (status.status === 'failed') {
            const error = status.errors?.[0];
            const recipientId = status.recipient_id;
            console.error(`❌ [WA STATUS] Falló a ${recipientId}. Código: ${error?.code} | Título: ${error?.title} | Detalle: ${error?.message}`);
            
            // Actualizar LOG de campaña si existe
            try {
                const { prisma } = await import('@/lib/prisma');
                const updated = await prisma.campaignLog.updateMany({
                    where: { wamid: status.id },
                    data: { 
                        status: 'FAILED',
                        error: `${error?.title}: ${error?.message}`
                    }
                });
                if (updated.count > 0) console.log(`[Webhook] CampaignLog ${status.id} actualizado a FAILED`);
            } catch (dbErr) {
                console.error("Error actualizando log de campaña (fallo):", dbErr);
            }
        } else {
            const currentStatus = status.status.toUpperCase();
            console.log(`✅ [WA STATUS] Mensaje ${status.id} a ${status.recipient_id} está: ${status.status}`);
            
            // Ignorar el status 'SENT' para no sobreescribir un DELIVERED o READ si Meta manda webhooks desordenados
            if (currentStatus !== 'SENT') {
                try {
                    const { prisma } = await import('@/lib/prisma');
                    
                    // Actualizar Logs de Campaña
                    const updatedCamp = await prisma.campaignLog.updateMany({
                        where: { wamid: status.id },
                        data: { status: currentStatus }
                    });
                    if (updatedCamp.count > 0) console.log(`[Webhook] CampaignLog ${status.id} actualizado a ${currentStatus}`);

                    // Actualizar Mensajes de Chat (Inbox)
                    const updatedMsg = await prisma.message.updateMany({
                        where: { wamid: status.id },
                        data: { status: currentStatus }
                    });
                    if (updatedMsg.count > 0) console.log(`[Webhook] Message chat ${status.id} actualizado a ${currentStatus}`);

                } catch (dbErr) {
                    console.error("Error actualizando status en BD:", dbErr);
                }
            }
        }
        return NextResponse.json({ status: 'ok' });
    }

    if (!message) {
      return NextResponse.json({ status: 'ok', detail: 'No message in payload' });
    }

    const from = message.from; // Número del cliente
    const text = message.text?.body; // Texto del mensaje
    const profileName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name;

    if (!text) {
        return NextResponse.json({ status: 'ok', detail: 'Empty text' });
    }

    console.log(`Mensaje recibido de ${from} (${profileName || 'Unknown'}): ${text}`);

    // 1. Procesar mensaje entrante (Lo guarda en BD y crea Chat/Lead si no existen)
    // Pasamos el profileName si es un lead nuevo y el metadataPhoneId para saber a qué proyecto pertenece
    const chatId = await simulateIncomingWhatsApp(from, text, profileName, metadataPhoneId);
    
    // 2. Obtener estado del chat (¿Bot activo?)
    const chatDetails = await getChatMessages(chatId);
    
    if (chatDetails?.botActive) {
        // 3. Generar respuesta de la IA
        const history = chatDetails.messages.slice(0, -1);
        const botData = await sendTestMessage(
            text, 
            history, 
            chatDetails.lead.name || profileName,
            chatDetails.lead.projectId,
            chatDetails.lead.agentId || undefined // Pass agent assignment if exists
        );
        
        if (botData && typeof botData !== 'string') {
            // 4. Guardar respuesta y actualizar score (incluye tokens para monitoreo de costos)
            // Nota: waCategory se determina al enviar a WA, default SERVICE para respuestas del bot
            let waCategory = 'SERVICE';
            
            // 5. Enviar mensaje REAL a WhatsApp vía Meta API
            // Buscar credenciales globales si el proyecto no tiene
            const adminClient = await prisma.client.findFirst({
                where: { email: 'info@abitaai.com' },
                include: { projects: true }
            });
            const masterToken = adminClient?.projects?.[0]?.whatsappToken;

            const phoneId = (chatDetails as any)?.lead?.project?.whatsappPhoneId;
            const projectToken = (chatDetails as any)?.lead?.project?.whatsappToken;
            const token = projectToken || masterToken;

            let waMessageId: string | undefined;

            if (phoneId && token) {
                const waResult = await sendWhatsAppMessage(from, botData.reply, phoneId, token);
                waCategory = waResult.category || 'SERVICE';
                waMessageId = waResult.messageId || undefined;
                console.log(`Respuesta enviada a ${from} vía WhatsApp Cloud API (categoría: ${waCategory}, wamid: ${waMessageId})`);
            } else {
                console.error(`[Webhook] No hay credenciales configuradas para el proyecto del chat ${chatId}`);
            }

            console.log(`[DEBUG Webhook] BEFORE saveAssistantReply: inputTokens=${botData.inputTokens} outputTokens=${botData.outputTokens} waCategory=${waCategory} scoreBump=${botData.scoreBump}`);
            await saveAssistantReply(
                chatId, 
                botData.reply, 
                botData.scoreBump, 
                botData.inputTokens, 
                botData.outputTokens, 
                waCategory,
                botData.agentName,
                botData.scoreReason,
                waMessageId
            );

            // 6. Si hubo un Handoff, desactivar el bot
            if (botData.isHandoff) {
                const { requestHandoff } = await import('@/app/actions/inbox');
                await requestHandoff(chatId);
                console.log(`Bot desactivado automáticamente por HandOff para el chat ${chatId}`);
            }
        }
    } else {
        console.log(`Bot desactivado para el chat ${chatId}. Handover manual.`);
    }

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Error en Webhook POST:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
