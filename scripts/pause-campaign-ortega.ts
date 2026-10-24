/**
 * Marca como PAUSED la campaña "Boda Ortega Delgado" (solo si está RUNNING).
 * Solo actualiza el campo status. NO envía mensajes ni toca logs/leads/mensajes.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CAMPAIGN_ID = 'cmvl63spc009xqbp7hn2z1iza';

async function main() {
  const before = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID }, select: { name: true, status: true } });
  console.log('Antes:', before);
  if (!before) throw new Error('Campaña no encontrada');
  const res = await prisma.campaign.updateMany({ where: { id: CAMPAIGN_ID, status: 'RUNNING' }, data: { status: 'PAUSED' } });
  const after = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID }, select: { name: true, status: true } });
  console.log(`Filas actualizadas: ${res.count} | Después:`, after);
}

main().catch((e) => { console.error('Fallo:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
