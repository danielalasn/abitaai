import { NextRequest, NextResponse } from 'next/server';
import { simulateIncomingWhatsApp, saveAssistantReply, getChatMessages } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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

    // Validar que sea un mensaje de WhatsApp
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const status = value?.statuses?.[0];
    const metadataPhoneId = value?.metadata?.phone_number_id;

    // Caso A: Notificación de ESTADO (sent, delivered, failed, read)
    if (status) {
        if (status.status === 'failed') {
            const error = status.errors?.[0];
            console.error(`❌ [WA STATUS] Falló el mensaje a ${status.recipient_id}.`);
            console.error(`   Error Code: ${error?.code} - ${error?.title}`);
            console.error(`   Detalle: ${error?.message}`);
        } else {
            console.log(`✅ [WA STATUS] Mensaje ${status.id} a ${status.recipient_id} está: ${status.status}`);
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
            chatDetails.lead.projectId // Pasamos el ID del proyecto explícitamente
        );
        
        if (botData && typeof botData !== 'string') {
            // 4. Guardar respuesta y actualizar score
            await saveAssistantReply(chatId, botData.reply, botData.scoreBump);
            
            // 5. Enviar mensaje REAL a WhatsApp vía Meta API
            // En un sistema SaaS, estas credenciales DEBEN venir de la base de datos (BotConfig)
            const phoneId = (chatDetails as any)?.lead?.project?.botConfig?.whatsappPhoneId;
            const token = (chatDetails as any)?.lead?.project?.botConfig?.whatsappToken;

            if (phoneId && token) {
                await sendWhatsAppMessage(from, botData.reply, phoneId, token);
                console.log(`Respuesta enviada a ${from} vía WhatsApp Cloud API`);
            } else {
                console.error(`[Webhook] No hay credenciales configuradas para el proyecto del chat ${chatId}`);
            }

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
