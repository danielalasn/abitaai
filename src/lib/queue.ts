
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

/**
 * REDIS CONNECTION
 * Para SaaS 2026, usamos Redis para manejar la idempotencia y el debounce de mensajes
 * de forma asíncrona y escalable.
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: REDIS_URL.startsWith('rediss') ? {} : undefined,
});

redisConnection.on('error', (err) => {
  console.error('❌ [Redis] Error de conexión:', err.message);
});

// 1. Definimos la Cola
export const messageQueue = new Queue('whatsapp-messages', {
  connection: redisConnection,
});

/**
 * Esta función encola un mensaje para ser procesado después de un delay (debounce).
 * Usamos Redis para acumular los mensajes mientras esperamos el delay.
 */
export async function enqueueMessage(from: string, data: any) {
  const delay = 6000;
  const listKey = `buffer:${from}`;
  const metadataKey = `metadata:${from}`;

  // 1. Acumular el mensaje en una lista de Redis
  await redisConnection.lpush(listKey, JSON.stringify(data));
  
  // 2. Guardar metadata (nombre, etc)
  if (data.profileName || data.phoneId) {
    await redisConnection.hset(metadataKey, {
      profileName: data.profileName || '',
      phoneId: data.phoneId || ''
    });
  }

  // 3. Establecer expiración de seguridad por si algo falla
  await redisConnection.expire(listKey, 60);
  await redisConnection.expire(metadataKey, 60);

  // 4. Implementar Debounce Real (Sliding Window)
  // Si ya hay un trabajo pendiente de procesar para este usuario, lo eliminamos
  // para "reiniciar" el contador de 6 segundos.
  const existingJob = await messageQueue.getJob(`debounce-${from}`);
  if (existingJob) {
    try {
      await existingJob.remove();
    } catch (e) {
      // Si ya se estaba procesando, no podemos removerlo, pero no importa
    }
  }

  console.log(`[Queue] Re-encolando job con delay de 6s para ${from}...`);
  const job = await messageQueue.add('process-buffer', 
    { from }, 
    { 
      jobId: `debounce-${from}`, 
      delay: 6000, // <--- ESPERA 6 SEGUNDOS DE SILENCIO
      removeOnComplete: true,
      removeOnFail: true
    }
  );
  console.log(`[Queue] Job programado con ID: ${job.id}`);
}
