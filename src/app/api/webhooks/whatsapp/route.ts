import { NextRequest, NextResponse } from 'next/server';
import { simulateIncomingMessage, saveAssistantReply, getChatMessages } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';
import { downloadAndUploadMetaMedia } from '@/app/actions/storage';

// ─── Debounce Store (Global) ──────────────────────────────────────────────────
// Usamos globalThis para evitar que Next.js Dev Mode (HMR) borre los mapas en cada request
const DEBOUNCE_MS = 6000;

const globalAny = global as any;
if (!globalAny.messageBuffers) globalAny.messageBuffers = new Map<string, any[]>();
if (!globalAny.activeTimers) globalAny.activeTimers = new Map<string, NodeJS.Timeout>();
if (!globalAny.bufferMetadata) globalAny.bufferMetadata = new Map<string, { profileName?: string; phoneId?: string }>();

const messageBuffers: Map<string, any[]> = globalAny.messageBuffers;
const activeTimers: Map<string, NodeJS.Timeout> = globalAny.activeTimers;
const bufferMetadata: Map<string, { profileName?: string; phoneId?: string }> = globalAny.bufferMetadata;

async function processFinalBuffer(from: string) {
  const messages = messageBuffers.get(from) || [];
  const metadata = bufferMetadata.get(from);
  
  // Limpiar todo antes de procesar
  messageBuffers.delete(from);
  activeTimers.delete(from);
  bufferMetadata.delete(from);

  if (messages.length === 0) return;

  const combinedText = messages.map(m => m.text).filter(Boolean).join('\n');
  const firstMedia = messages.find(m => m.mediaUrl);
  
  console.log(`[DEBOUNCE] Procesando ${messages.length} mensajes de ${from}.`);

  try {
    const chatId = await simulateIncomingMessage(
      from,
      combinedText || '[Archivo]',
      metadata?.profileName,
      metadata?.phoneId,
      'whatsapp',
      undefined,
      firstMedia?.mediaUrl,
      firstMedia?.mediaFilename,
      firstMedia?.mediaType
    );

    const chatDetails = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { lead: { include: { project: true } }, messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (chatDetails?.botActive) {
      const history = chatDetails.messages.slice(0, -1);
      const botData = await sendTestMessage(
        combinedText,
        history.map(m => ({ role: m.role, content: m.content })),
        chatDetails.lead.name || metadata?.profileName,
        chatDetails.lead.projectId
      );

      if (botData && typeof botData !== 'string' && botData.reply) {
        const phoneId = (chatDetails as any)?.lead?.project?.whatsappPhoneId;
        const projectToken = (chatDetails as any)?.lead?.project?.whatsappToken;
        let waMessageId;
        let waCategory = 'SERVICE';

        if (phoneId && projectToken) {
          const waResult = await sendWhatsAppMessage(from, botData.reply, phoneId, projectToken);
          waCategory = waResult.category || 'SERVICE';
          waMessageId = waResult.messageId;
        }

        await saveAssistantReply(
          chatId,
          botData.reply,
          botData.scoreBump,
          botData.inputTokens,
          botData.outputTokens,
          waCategory,
          botData.agentName,
          botData.scoreReason,
          waMessageId || undefined
        );
      } else {
        // Si no hay respuesta (error de IA), desactivamos el bot para este chat
        await prisma.chat.update({
          where: { id: chatId },
          data: { botActive: false }
        });
        console.log(`[BOT] Desactivado automáticamente por error de IA en chat ${chatId}`);
      }
    }
  } catch (err) {
    console.error("[DEBOUNCE ERROR]", err);
  }
}
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
    const body = await req.json();
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const status = value?.statuses?.[0];
    const phoneId = value?.metadata?.phone_number_id;

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

    // Media processing
    let mediaData: any = {};
    const mediaTypes = ['image', 'document', 'audio', 'video'];
    if (mediaTypes.includes(message.type)) {
      const mediaObj = message[message.type];
      const project = await prisma.project.findFirst({ where: { whatsappPhoneId: phoneId } });
      if (project?.whatsappToken) {
        const file = await downloadAndUploadMetaMedia(mediaObj.id, project.whatsappToken, mediaObj.mime_type, mediaObj.filename);
        if (file) mediaData = { mediaUrl: file.url, mediaType: file.mediaType, mediaFilename: file.filename };
      }
      if (mediaObj.caption) text = mediaObj.caption;
    }

    // ─── DEBOUNCE LOGIC ───
    // 1. Cancelar timer existente
    if (activeTimers.has(from)) {
      clearTimeout(activeTimers.get(from));
      console.log(`[DEBOUNCE] Timer cancelado para ${from}.`);
    }

    // 2. Acumular mensaje
    const currentMsgs = messageBuffers.get(from) || [];
    currentMsgs.push({ text, ...mediaData });
    messageBuffers.set(from, currentMsgs);
    bufferMetadata.set(from, { profileName, phoneId });

    // 3. Programar nuevo timer
    const timer = setTimeout(() => processFinalBuffer(from), DEBOUNCE_MS);
    activeTimers.set(from, timer);

    console.log(`[DEBOUNCE] Mensaje recibido de ${from}. Esperando ${DEBOUNCE_MS/1000}s... (Total: ${currentMsgs.length})`);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error Webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
