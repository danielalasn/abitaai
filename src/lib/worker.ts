
import { Worker, Job } from 'bullmq';
import { redisConnection } from './queue';
import { simulateIncomingMessage, saveAssistantReply } from '@/app/actions/inbox';
import { sendTestMessage } from '@/app/actions/chat';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendInstagramMessage } from '@/lib/instagram';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

/**
 * WORKER DE PROCESAMIENTO
 * Este componente es el corazón asíncrono del sistema.
 * Se encarga de procesar los mensajes acumulados en la cola después del debounce.
 */

const globalAny = global as any;

export function initWorker() {
  if (globalAny.messageWorker) return;

  console.log('🤖 [Worker] Inicializando procesador de mensajes...');

  globalAny.messageWorker = new Worker('whatsapp-messages', async (job: Job) => {
    const { from } = job.data;
    const listKey = `buffer:${from}`;
    const metadataKey = `metadata:${from}`;

    // 1. Obtener todos los mensajes acumulados y metadata
    const [rawMessages, metadata] = await Promise.all([
      redisConnection.lrange(listKey, 0, -1),
      redisConnection.hgetall(metadataKey)
    ]);

    if (!rawMessages || rawMessages.length === 0) return;

    // 2. Limpiar Redis inmediatamente para evitar procesamientos duplicados
    await Promise.all([
      redisConnection.del(listKey),
      redisConnection.del(metadataKey)
    ]);

    // 3. Reversar (porque usamos lpush) y consolidar
    const messages = rawMessages.map(m => JSON.parse(m)).reverse();
    const combinedText = messages.map(m => m.text).filter(Boolean).join('\n');
    const firstMedia = messages.find(m => m.mediaUrl);

    console.log(`🤖 [Worker] Procesando ${messages.length} mensajes acumulados de ${from}`);

    try {
      // 4. Determinar proyecto y canal
      let projectId = undefined;
      const channel = messages[0].channel || 'whatsapp';

      if (channel === 'instagram') {
        const integration = await prisma.integration.findFirst({
          where: { instagramAccountId: metadata.phoneId, provider: 'meta_instagram', status: 'active' },
          include: { client: { include: { projects: true } } }
        });
        projectId = integration?.client?.projects?.[0]?.id;
      }

      // 5. Simular entrada en base de datos
      const chatId = await simulateIncomingMessage(
        from,
        combinedText || '[Archivo]',
        metadata.profileName || undefined,
        metadata.phoneId || undefined,
        channel,
        projectId,
        firstMedia?.mediaUrl,
        firstMedia?.mediaFilename,
        firstMedia?.mediaType
      );

      // 2. Obtener contexto del chat
      const chatDetails = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { 
          lead: { include: { project: true } }, 
          messages: { orderBy: { createdAt: 'asc' }, take: 15 } 
        }
      });

      if (chatDetails?.botActive) {
        // 3. Llamar a la IA (Claude/Gemini con PII redactado ya integrado en la acción)
        const history = chatDetails.messages.slice(0, -1);
        const botData = await sendTestMessage(
          combinedText || '[Archivo]',
          history.map(m => ({ role: m.role, content: m.content })),
          chatDetails.lead.name || metadata.profileName || 'Desconocido',
          chatDetails.lead.projectId
        );

        if (botData && botData.reply) {
          let waMessageId;
          let waCategory = 'SERVICE';

          // 4. Enviar respuesta por el canal correspondiente
          if (channel === 'whatsapp') {
            const projectPhoneId = chatDetails.lead.project?.whatsappPhoneId;
            const projectToken = decrypt(chatDetails.lead.project?.whatsappToken);
            if (projectPhoneId && projectToken) {
              const waResult = await sendWhatsAppMessage(from, botData.reply, projectPhoneId, projectToken);
              waCategory = waResult.category || 'SERVICE';
              waMessageId = waResult.messageId;
            }
          } else if (channel === 'instagram') {
            const integration = await prisma.integration.findFirst({
              where: { instagramAccountId: metadata.phoneId, provider: 'meta_instagram', status: 'active' }
            });
            const accessToken = decrypt(integration?.accessToken);
            if (accessToken) {
              const igResult = await sendInstagramMessage(from, botData.reply, accessToken);
              waMessageId = igResult.messageId;
            }
          }

          // 5. Guardar respuesta en el inbox
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
        }
      }
    } catch (err) {
      console.error(`❌ [Worker Error] Error procesando job ${job.id}:`, err);
      throw err; // Permite que BullMQ reintente según configuración
    }
  }, { 
    connection: redisConnection,
    concurrency: 5 // Procesa hasta 5 mensajes simultáneamente
  });

  globalAny.messageWorker.on('completed', (job: Job) => {
    console.log(`✅ [Worker] Job ${job.id} completado con éxito.`);
  });

  globalAny.messageWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`❌ [Worker] Job ${job?.id} falló:`, err.message);
  });
}
