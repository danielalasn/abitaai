import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const messageQueue = new Queue('whatsapp-messages', { connection: redisConnection });

async function checkJobs() {
  const failed = await messageQueue.getFailed();
  console.log(`Failed jobs: ${failed.length}`);
  for (const job of failed.slice(-5)) {
    console.log(`Job ${job.id}:`, job.failedReason);
  }
  process.exit(0);
}

checkJobs();
