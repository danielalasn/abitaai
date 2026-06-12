import { NextRequest, NextResponse } from 'next/server';
import { simulateIncomingMessage, saveAssistantReply, getChatMessages } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';
import { downloadAndUploadMetaMedia } from '@/app/actions/storage';
import crypto from 'crypto';
import { decrypt } from '@/lib/encryption';
import { enqueueMessage } from '@/lib/queue';
// Lógica de procesamiento movida al Worker en src/lib/worker.ts
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-hub-signature-256');
    const rawBody = await req.text();
    const appSecret = process.env.META_APP_SECRET;

    // ─── VERIFICACIÓN DE FIRMA (HMAC-SHA256) ───
    if (appSecret && signature) {
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.warn('[Webhook WhatsApp] Firma inválida. Posible intento de inyección.');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    } else if (!signature && process.env.NODE_ENV === 'production') {
      console.warn('[Webhook WhatsApp] Falta firma x-hub-signature-256 en entorno de producción.');
      return new NextResponse('Missing signature', { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const status = value?.statuses?.[0];
    const phoneId = value?.metadata?.phone_number_id;

    // ─── IDEMPOTENCIA ───
    let eventId = message?.id || status?.id;
    if (!eventId && body.entry?.[0]?.id) {
      // Para eventos a nivel app (ej. PARTNER_APP_INSTALLED), el ID es el del App, por lo que agregamos el time para que sea único
      eventId = `${body.entry[0].id}-${body.entry[0].time || Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    }
    if (eventId) {
      const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
      if (existing) {
        console.log(`[Webhook WhatsApp] Evento duplicado detectado y omitido: ${eventId}`);
        return NextResponse.json({ status: 'ok', duplicated: true });
      }
      try {
        await prisma.webhookEvent.upsert({
          where: { id: eventId },
          update: {},
          create: { id: eventId, provider: 'whatsapp', payload: body }
        });
      } catch (err: any) {
        console.error('[Webhook WhatsApp] Error guardando evento de idempotencia:', err);
      }
    }

    if (status) {
      // Lógica de actualización de estados (simplificada para el ejemplo, pero mantenemos la funcionalidad)
      const currentStatus = status.status.toUpperCase();
      await prisma.message.updateMany({ where: { wamid: status.id }, data: { status: currentStatus } });
      await prisma.campaignLog.updateMany({ where: { wamid: status.id }, data: { status: currentStatus } });
      return NextResponse.json({ status: 'ok' });
    }

    if (!message) return NextResponse.json({ status: 'ok' });

    const from = message.from;
    const profileName = value?.contacts?.[0]?.profile?.name;
    let text = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;

    // Handle reply context
    if (message.context?.id) {
      const repliedMsg = await prisma.message.findUnique({ where: { wamid: message.context.id } });
      if (repliedMsg && repliedMsg.content) {
        text = `[En respuesta a: "${repliedMsg.content}"]\n${text || ''}`;
      }
    }

    // Media processing
    let mediaData: any = {};
    const mediaTypes = ['image', 'document', 'audio', 'video', 'voice'];
    if (mediaTypes.includes(message.type)) {
      const mediaObj = message[message.type];
      const project = await prisma.project.findFirst({ where: { whatsappPhoneId: phoneId } });
      const decryptedToken = decrypt(project?.whatsappToken);
      if (decryptedToken) {
        const file = await downloadAndUploadMetaMedia(mediaObj.id, decryptedToken, mediaObj.mime_type, mediaObj.filename);
        if (file) mediaData = { mediaUrl: file.url, mediaType: file.mediaType, mediaFilename: file.filename };
      }
      if (mediaObj.caption) text = mediaObj.caption;
    }

    // ─── CHECK BOT ACTIVE STATUS ───
    let isBotActive = true;
    if (phoneId) {
      const project = await prisma.project.findFirst({ where: { whatsappPhoneId: phoneId } });
      if (project) {
        const possiblePhones = [from];
        if (from.startsWith('503') && from.length === 11) {
          possiblePhones.push(from.substring(3));
        }
        const lead = await prisma.lead.findFirst({
          where: { projectId: project.id, phone: { in: possiblePhones } },
          include: { chat: true }
        });
        if (lead?.chat) {
          isBotActive = lead.chat.botActive;
        } else {
          isBotActive = project.defaultBotActive ?? true;
        }
      }
    }

    // ─── ASYNC QUEUE LOGIC (Redis + BullMQ) ───
    await enqueueMessage(from, { 
      text, 
      profileName, 
      phoneId, 
      ...mediaData 
    }, isBotActive);

    console.log(`[Webhook WhatsApp] Mensaje encolado para ${from} (Bot Activo: ${isBotActive}).`);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error Webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
