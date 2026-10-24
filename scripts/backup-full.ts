/**
 * Respaldo completo de la base de datos (todas las tablas) a formato JSON.
 * Solo lectura: no modifica ni borra ningún registro.
 *
 * Uso:
 *   npx tsx scripts/backup-full.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Iniciando respaldo completo de la base de datos...\n');
  const startTime = Date.now();

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = new Date();
  const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const backupFile = path.join(backupDir, `db_full_backup_${timestamp}.json`);

  // Extraer todas las tablas con conteos
  const tables = [
    { name: 'clients', fetch: () => prisma.client.findMany() },
    { name: 'projects', fetch: () => prisma.project.findMany() },
    { name: 'agents', fetch: () => prisma.agent.findMany() },
    { name: 'botConfigs', fetch: () => prisma.botConfig.findMany() },
    { name: 'integrations', fetch: () => prisma.integration.findMany() },
    { name: 'leads', fetch: () => prisma.lead.findMany() },
    { name: 'chats', fetch: () => prisma.chat.findMany() },
    { name: 'messages', fetch: () => prisma.message.findMany() },
    { name: 'campaigns', fetch: () => prisma.campaign.findMany() },
    { name: 'campaignLogs', fetch: () => prisma.campaignLog.findMany() },
    { name: 'unansweredQuestions', fetch: () => prisma.unansweredQuestion.findMany() },
    { name: 'promptBlocks', fetch: () => prisma.promptBlock.findMany() },
    { name: 'webhookEvents', fetch: () => prisma.webhookEvent.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }) },
    { name: 'auditLogs', fetch: () => prisma.auditLog.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }) },
    { name: 'botTestSuites', fetch: () => prisma.botTestSuite.findMany() },
    { name: 'nangoConnections', fetch: () => prisma.nangoConnection.findMany() },
    { name: 'calendarConfigs', fetch: () => prisma.calendarConfig.findMany() },
    { name: 'sheetsConfigs', fetch: () => prisma.sheetsConfig.findMany() },
    { name: 'userBookings', fetch: () => prisma.userBooking.findMany() },
    { name: 'botFiles', fetch: () => prisma.botFile.findMany() },
    { name: 'pushSubscriptions', fetch: () => prisma.pushSubscription.findMany() },
    { name: 'systemErrors', fetch: () => prisma.systemError.findMany() },
  ];

  const fullData: Record<string, any> = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
  };

  let totalRecords = 0;

  for (const table of tables) {
    try {
      const records = await table.fetch();
      fullData[table.name] = records;
      totalRecords += records.length;
      console.log(`  ✓ ${table.name.padEnd(22)} : ${records.length} registros`);
    } catch (err: any) {
      console.error(`  ✗ Error leyendo tabla ${table.name}:`, err.message);
      fullData[table.name] = [];
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(fullData, null, 2), 'utf-8');

  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=============================================================');
  console.log(`✅ Respaldo completo finalizado con éxito.`);
  console.log(`📁 Archivo: ${backupFile}`);
  console.log(`📊 Total de registros: ${totalRecords}`);
  console.log(`💾 Tamaño: ${sizeMB} MB`);
  console.log(`⏱️  Tiempo: ${durationSec}s`);
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error fatal en el respaldo:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
