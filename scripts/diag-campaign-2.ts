/** SOLO LECTURA. Segundo nivel de diagnóstico de la campaña Boda Ortega Delgado. */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const mask = (p: string) => (p.length > 4 ? `***${p.slice(-4)}` : p);

async function main() {
  const c = await prisma.campaign.findFirst({ where: { name: { contains: 'Ortega Delgado', mode: 'insensitive' } } });
  if (!c) throw new Error('Campaña no encontrada');
  const leads: any[] = JSON.parse(c.csvData || '[]');

  // 1) Formatos de teléfono en el CSV (cómo los normaliza processCampaignLead)
  const fmt: Record<string, number> = {};
  leads.forEach((l) => {
    const p = String(l['#'] ?? '').replace(/[^0-9]/g, '');
    const k = `len${p.length}${p.length === 12 ? '-' + p.slice(0, 2) : p.length === 13 ? '-' + p.slice(0, 3) : p.length === 10 ? '-10dig' : ''}`;
    fmt[k] = (fmt[k] || 0) + 1;
  });
  console.log('Formatos de teléfono en CSV:', JSON.stringify(fmt));
  console.log('Columnas CSV:', Object.keys(leads[0] || {}).join(', '));
  const rawPhones = leads.map((l) => String(l['#'] ?? '').replace(/[^0-9]/g, ''));
  const dups = rawPhones.filter((p, i) => rawPhones.indexOf(p) !== i);
  console.log('Teléfonos duplicados en CSV:', dups.map(mask).join(',') || 'ninguno');

  // 2) Índice 20 (el primero sin log) y su estado en BD
  const p20 = rawPhones[20];
  const lead20 = await prisma.lead.findFirst({ where: { projectId: c.projectId, phone: p20 }, include: { chat: { include: { messages: { orderBy: { createdAt: 'desc' }, take: 3 } } } } });
  console.log(`\nLead índice 20 (${mask(p20)}): ${lead20 ? `existe, latestCampaignId=${lead20.latestCampaignId === c.id ? 'ESTA' : lead20.latestCampaignId}, msgs=${lead20.chat?.messages.length ?? 0}` : 'NO existe en BD'}`);

  // 3) Mensajes fallidos: error guardado + eventos de webhook de Meta
  const failedMsgs = await prisma.message.findMany({
    where: { status: 'FAILED', chat: { lead: { latestCampaignId: c.id } }, role: 'agent', createdAt: { gte: c.createdAt } },
    include: { chat: { include: { lead: true } } },
  });
  console.log(`\nMensajes FAILED: ${failedMsgs.length}`);
  for (const m of failedMsgs) {
    console.log(`- ${mask(m.chat.lead.phone)} sendError="${m.sendError}" wamid=${m.wamid}`);
    const evs = await prisma.webhookEvent.findMany({ where: { id: { startsWith: `${m.wamid}-` } } });
    evs.forEach((e) => {
      const st = (e.payload as any)?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
      console.log(`    evento ${e.id} -> status=${st?.status} errors=${JSON.stringify(st?.errors)}`);
    });
  }

  // 3b) Mensaje de ejemplo y wamids ordenados (¿hay huecos?)
  const total = await prisma.message.count({ where: { chat: { lead: { latestCampaignId: c.id } }, role: 'agent', createdAt: { gte: c.createdAt } } });
  console.log(`\nTotal mensajes agent de la campaña: ${total}`);

  // 4) Otras campañas de hera con envíos en las últimas 48h (¿otro envío simultáneo?)
  const recent = await prisma.campaignLog.groupBy({ by: ['campaignId'], where: { createdAt: { gte: new Date(Date.now() - 48 * 3600e3) } }, _count: true });
  console.log('\nCampaignLogs últimas 48h por campaña:', JSON.stringify(recent));

  // 5) Mensajes entrantes de respuesta desde la campaña (para el chat 521/52)
  const resp = await prisma.message.count({ where: { role: 'user', createdAt: { gte: c.createdAt }, chat: { lead: { latestCampaignId: c.id } } } });
  console.log(`Respuestas de usuarios en leads de esta campaña: ${resp}`);

  // 6) Estado de la imagen de header
  const m = JSON.parse(c.variableMapping || '{}');
  console.log('\nHeader URL:', m.__headerUrl);
  console.log('Hora actual UTC:', new Date().toISOString());
}

main().catch((e) => { console.error('Fallo:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
