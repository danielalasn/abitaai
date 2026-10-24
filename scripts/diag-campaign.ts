/**
 * DIAGNÓSTICO SOLO LECTURA de una campaña. No envía mensajes ni modifica datos.
 * Uso: npx tsx scripts/diag-campaign.ts "boda ortega"
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const mask = (p: string) => (p.length > 4 ? `***${p.slice(-4)}` : p);

async function main() {
  const q = process.argv[2] || 'boda ortega';
  const campaigns = await prisma.campaign.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    include: { project: { include: { client: { select: { name: true, email: true, messageLimit: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Campañas que coinciden con "${q}": ${campaigns.length}`);

  for (const c of campaigns) {
    console.log('\n==================================================');
    console.log(`ID: ${c.id} | Nombre: ${c.name}`);
    console.log(`Proyecto: ${c.project.name} | Cliente: ${c.project.client.name} <${c.project.client.email}> | límite mensual: ${c.project.client.messageLimit}`);
    console.log(`Estado: ${c.status} | leadCount: ${c.leadCount} | plantilla: ${c.templateName} (${c.templateCategory}, ${c.languageCode}) | creada: ${c.createdAt.toISOString()}`);
    const mapping = JSON.parse(c.variableMapping || '{}');
    console.log(`Mapping: botActive=${mapping.__botActive} isDryRun=${mapping.__isDryRun} headerUrl=${mapping.__headerUrl ? 'sí' : 'no'} mediaType=${mapping.__headerMediaType} vars=${Object.keys(mapping).filter((k) => !k.startsWith('__')).join(',')}`);

    const leads: any[] = JSON.parse(c.csvData || '[]');
    const logs = await prisma.campaignLog.findMany({ where: { campaignId: c.id }, orderBy: { createdAt: 'asc' } });

    const byStatus: Record<string, number> = {};
    logs.forEach((l) => (byStatus[l.status] = (byStatus[l.status] || 0) + 1));
    console.log(`\nCampaignLogs: ${logs.length} -> ${JSON.stringify(byStatus)}`);
    if (logs.length) {
      console.log(`Primer log: ${logs[0].createdAt.toISOString()} | Último log: ${logs[logs.length - 1].createdAt.toISOString()}`);
    }

    const errors: Record<string, number> = {};
    logs.filter((l) => l.error).forEach((l) => (errors[l.error!] = (errors[l.error!] || 0) + 1));
    console.log('Errores en logs:', JSON.stringify(errors, null, 2));

    // Normalización idéntica al código de envío
    const norm = (raw: any) => {
      if (!raw) return null;
      let p = String(raw).replace(/[^0-9]/g, '');
      if (p.length < 8) return null;
      if (p.length === 8) p = '503' + p;
      return p;
    };
    const processed = new Set(logs.filter((l) => l.status !== 'FAILED').map((l) => l.phone));
    const failedPhones = new Set(logs.filter((l) => l.status === 'FAILED').map((l) => l.phone));

    let pending = 0, skippedDup = 0, invalid = 0;
    const seen = new Set<string>(processed);
    const pendingList: string[] = [];
    leads.forEach((l) => {
      const p = norm(l['#']);
      if (!p) { invalid++; pendingList.push('(sin teléfono válido)'); return; }
      if (seen.has(p)) { skippedDup++; return; }
      seen.add(p);
      pending++;
      pendingList.push(mask(p));
    });
    console.log(`\nLeads en CSV: ${leads.length} | ya procesados (no-FAILED): ${processed.size} | FALLIDOS: ${failedPhones.size}`);
    console.log(`AL REANUDAR se enviarían ~${pending} mensajes (+${invalid} filas sin teléfono válido se "intentan" y quedan FAILED). Omitidos por ya procesados/duplicados: ${skippedDup}`);
    console.log(`Pendientes (enmascarados): ${pendingList.join(', ')}`);

    // Mensajes reales creados en el chat dentro de la ventana de la campaña
    const sentPhones = logs.map((l) => l.phone);
    const dbLeads = await prisma.lead.findMany({
      where: { projectId: c.projectId, latestCampaignId: c.id },
      include: { chat: { include: { messages: { where: { role: 'agent', createdAt: { gte: c.createdAt } }, orderBy: { createdAt: 'asc' } } } } },
    });
    const msgs = dbLeads.flatMap((l) => (l.chat?.messages ?? []).map((m) => ({ phone: l.phone, ...m })));
    const msgStatus: Record<string, number> = {};
    msgs.forEach((m) => (msgStatus[m.status] = (msgStatus[m.status] || 0) + 1));
    console.log(`\nLeads con latestCampaignId=campaña: ${dbLeads.length} | mensajes 'agent' desde la creación: ${msgs.length} -> ${JSON.stringify(msgStatus)}`);

    // Inconsistencias: mensaje guardado sin log, o log sin mensaje
    const logPhones = new Set(logs.map((l) => l.phone));
    const msgPhones = new Set(msgs.map((m) => m.phone));
    const msgNoLog = [...msgPhones].filter((p) => !logPhones.has(p)).map(mask);
    const logNoMsg = [...logPhones].filter((p) => !msgPhones.has(p) && !failedPhones.has(p)).map(mask);
    console.log(`Mensajes SIN CampaignLog: ${msgNoLog.length} ${msgNoLog.join(',')}`);
    console.log(`Logs no-FAILED SIN mensaje: ${logNoMsg.length} ${logNoMsg.join(',')}`);

    // Fallidos que en realidad tienen mensaje enviado (riesgo de duplicado al reanudar)
    const failedButSent = [...failedPhones].filter((p) => {
      const n = norm(p);
      return n && msgPhones.has(n);
    }).map(mask);
    console.log(`FAILED con mensaje ya guardado/enviado (DUPLICARÍA al reanudar): ${failedButSent.length} ${failedButSent.join(',')}`);

    // Cronología de logs
    console.log('\nCronología (hora, estado, tel, error):');
    logs.forEach((l, i) => console.log(`${String(i + 1).padStart(3)} ${l.createdAt.toISOString()} ${l.status.padEnd(9)} ${mask(l.phone)} ${l.error ?? ''}`));
  }

  // Otras campañas RUNNING/PAUSED del mismo proyecto (por si hay otras)
  const open = await prisma.campaign.findMany({
    where: { status: { in: ['RUNNING', 'PAUSED'] }, project: { client: { OR: [{ name: { contains: 'hera', mode: 'insensitive' } }, { email: { contains: 'hera', mode: 'insensitive' } }] } } },
    select: { id: true, name: true, status: true, leadCount: true, createdAt: true },
  });
  console.log('\nCampañas RUNNING/PAUSED de hera:', JSON.stringify(open, null, 2));
}

main()
  .catch((e) => { console.error('Fallo:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
