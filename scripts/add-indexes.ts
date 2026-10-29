import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

// Usar DIRECT_URL si existe para conectar directo a PostgreSQL (puerto 5432) sin pooler
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: {
    db: { url: directUrl }
  }
});

const INDEX_STATEMENTS = [
  {
    name: 'Message_chatId_createdAt_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_chatId_createdAt_idx" ON "Message" ("chatId", "createdAt" DESC);`
  },
  {
    name: 'Message_createdAt_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_createdAt_idx" ON "Message" ("createdAt" DESC);`
  },
  {
    name: 'Lead_projectId_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Lead_projectId_idx" ON "Lead" ("projectId");`
  },
  {
    name: 'CampaignLog_campaignId_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "CampaignLog_campaignId_idx" ON "CampaignLog" ("campaignId");`
  },
  {
    name: 'CampaignLog_phone_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "CampaignLog_phone_idx" ON "CampaignLog" ("phone");`
  },
  {
    name: 'Campaign_projectId_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Campaign_projectId_idx" ON "Campaign" ("projectId");`
  },
  {
    name: 'Project_clientId_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Project_clientId_idx" ON "Project" ("clientId");`
  },
  {
    name: 'Chat_lastActiveAt_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "Chat_lastActiveAt_idx" ON "Chat" ("lastActiveAt" DESC);`
  }
];

async function main() {
  console.log('⚡ Iniciando creación segura de índices aditivos con CREATE INDEX CONCURRENTLY...');
  console.log(`Conectando mediante URL: ${directUrl?.replace(/:[^:@]+@/, ':***@')}`);

  for (const item of INDEX_STATEMENTS) {
    const start = Date.now();
    try {
      console.log(`Creando índice: ${item.name}...`);
      await prisma.$executeRawUnsafe(item.sql);
      console.log(`✅ [OK] ${item.name} (${Date.now() - start}ms)`);
    } catch (error: any) {
      console.error(`❌ [ERROR] Falló al crear ${item.name}:`, error.message);
      // Si falla por transacción de Prisma, intentar sin CONCURRENTLY de forma segura
      if (error.message?.includes('cannot run inside a transaction block')) {
        console.log(`Intentando sin CONCURRENTLY para ${item.name}...`);
        const fallbackSql = item.sql.replace('CONCURRENTLY ', '');
        await prisma.$executeRawUnsafe(fallbackSql);
        console.log(`✅ [OK Fallback] ${item.name} (${Date.now() - start}ms)`);
      }
    }
  }

  console.log('\n--- VERIFICANDO NUEVOS ÍNDICES CREADOS ---');
  const verify = await prisma.$queryRaw<any[]>`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname IN (
      'Message_chatId_createdAt_idx',
      'Message_createdAt_idx',
      'Lead_projectId_idx',
      'CampaignLog_campaignId_idx',
      'CampaignLog_phone_idx',
      'Campaign_projectId_idx',
      'Project_clientId_idx',
      'Chat_lastActiveAt_idx'
    )
    ORDER BY tablename, indexname;
  `;
  console.table(verify);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
