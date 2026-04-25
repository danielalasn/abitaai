import { NextRequest, NextResponse } from 'next/server';
import { simulateIncomingMessage, saveAssistantReply, getChatMessages } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';
import { downloadAndUploadMetaMedia } from '@/app/actions/storage';

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
    let text = message.text?.body; // Texto del mensaje
    const profileName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name;

    // Procesamiento de Media (adjuntos)
    let finalMediaUrl: string | undefined;
    let finalMediaFilename: string | undefined;
    let finalMediaType: string | undefined;

    const mediaTypes = ['image', 'document', 'audio', 'video', 'sticker'];
    if (mediaTypes.includes(message.type)) {
      const mediaObj = message[message.type];
      const mediaId = mediaObj?.id;
      const mimeType = mediaObj?.mime_type;
      
      if (mediaId) {
        // Obtenemos token para descargar (prioridad: token del proyecto -> master token)
        const project = metadataPhoneId ? await prisma.project.findFirst({ where: { whatsappPhoneId: metadataPhoneId } }) : null;
        let token = project?.whatsappToken;

        if (!token) {
           console.error(`[Media Error] No hay token configurado para el proyecto o admin fallback removido por seguridad para PhoneID: ${metadataPhoneId}`);
        }

        if (token) {
           console.log(`[Media] Preparando descarga del mediaId=${mediaId} con token ${token.substring(0, 10)}...`);
           const fileData = await downloadAndUploadMetaMedia(
              mediaId, 
              token, 
              mimeType, 
              mediaObj?.filename || `adjunto_${message.type}`
           );
           
           if (fileData) {
              console.log(`[Media] ¡Cargado con éxito en Supabase! URL: ${fileData.url}`);
              finalMediaUrl = fileData.url;
              finalMediaType = fileData.mediaType;
              finalMediaFilename = fileData.filename;
           } else {
              console.error(`[Media Error] No se pudo descargar el archivo mediaId=${mediaId}. Revisar permisos del Token o de Meta App.`);
              text = '[Error descargando archivo adjunto de WhatsApp]';
           }
        } else {
           console.error(`[Media Error] No hay token válido para el proyecto ${metadataPhoneId}`);
           text = '[Error de Token: No se pudo descargar el adjunto]';
        }
      }
      
      // Si el media incluye un caption (ej. imagen con texto adjunto)
      if (mediaObj?.caption) {
         text = mediaObj.caption;
      }
    }

    if (!text && !finalMediaUrl) {
        console.log(`[Webhook Warning] Mensaje vacío y sin media procesada. Type: ${message.type}. Ignorando.`);
        return NextResponse.json({ status: 'ok', detail: 'Empty text and no media' });
    }

    const safeText = text || (finalMediaType === 'image' ? '📷 Imagen' : finalMediaType === 'document' ? '📄 Documento' : finalMediaType === 'video' ? '🎥 Video' : finalMediaType === 'audio' ? '🎵 Audio' : '📎 Archivo adjunto');

    console.log(`Mensaje recibido de ${from} (${profileName || 'Unknown'}): ${safeText}`);

    let chatId;
    try {
      chatId = await simulateIncomingMessage(
        from, 
        safeText, 
        profileName, 
        metadataPhoneId, 
        'whatsapp',
        undefined,
        finalMediaUrl,
        finalMediaFilename,
        finalMediaType
      );
    } catch (simError: any) {
      console.error('[Webhook] Error en simulateIncomingMessage (probablemente proyecto no encontrado/inactivo). Ignorando mensaje para evitar fugas:', simError);
      return NextResponse.json({ status: 'success', detail: 'Ignorado por seguridad o falta de proyecto' });
    }

    
    // 2. Obtener estado del chat (¿Bot activo?)
    const chatDetails = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        lead: { include: { project: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
    
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
            const phoneId = (chatDetails as any)?.lead?.project?.whatsappPhoneId;
            const projectToken = (chatDetails as any)?.lead?.project?.whatsappToken;
            const token = projectToken;

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
                await prisma.chat.update({
                  where: { id: chatId },
                  data: { botActive: false }
                });
                await prisma.lead.update({
                  where: { id: chatDetails.lead.id },
                  data: { status: 'NEEDS_AGENT' }
                });
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
