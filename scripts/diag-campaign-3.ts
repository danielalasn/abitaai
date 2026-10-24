/** SOLO LECTURA. Cruce país/estado de la campaña Boda Ortega Delgado. */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.campaign.findFirst({ where: { name: { contains: 'Ortega Delgado', mode: 'insensitive' } } });
  if (!c) throw new Error('no encontrada');
  const leads: any[] = JSON.parse(c.csvData || '[]');
  const logs = await prisma.campaignLog.findMany({ where: { campaignId: c.id } });
  const statusByPhone = new Map(logs.map((l) => [l.phone, l.status]));

  const country = (p: string) => (p.startsWith('52') && p.length === 12 ? 'MX(52)' : p.startsWith('1') && p.length === 11 ? 'US/CA(+1)' : `otro(len${p.length})`);
  const sent: Record<string, Record<string, number>> = {};
  const pend: Record<string, number> = {};
  const seen = new Set<string>();
  leads.forEach((l, i) => {
    const p = String(l['#'] ?? '').replace(/[^0-9]/g, '');
    const k = country(p);
    const st = statusByPhone.get(p);
    if (st) { sent[k] = sent[k] || {}; sent[k][st] = (sent[k][st] || 0) + 1; }
    else if (!seen.has(p)) { pend[k] = (pend[k] || 0) + 1; }
    seen.add(p);
  });
  console.log('Procesados por país/estado:', JSON.stringify(sent, null, 1));
  console.log('Pendientes (sin log) por país:', JSON.stringify(pend));
  const us = leads.map((l) => String(l['#'] ?? '').replace(/[^0-9]/g, '')).filter((p) => p.startsWith('1') && p.length === 11);
  const areas = new Set(us.map((p) => p.slice(1, 4)));
  console.log('Lada(s) +1 presentes:', [...areas].join(','));
  console.log('Total leads CSV:', leads.length, '| Índices 0-19 país:', leads.slice(0, 20).map((l) => country(String(l['#']).replace(/[^0-9]/g, ''))).join(' '));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
