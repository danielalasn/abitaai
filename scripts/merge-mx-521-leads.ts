/**
 * Auditoría + merge de Leads duplicados 521XXXXXXXXXX -> 52XXXXXXXXXX.
 *
 * Uso:
 *   npx tsx scripts/merge-mx-521-leads.ts                 # DRY-RUN (solo reporta, todos los proyectos)
 *   npx tsx scripts/merge-mx-521-leads.ts --client hera   # DRY-RUN filtrando por cliente/proyecto (nombre o email)
 *   npx tsx scripts/merge-mx-521-leads.ts --apply         # Ejecuta el merge de verdad
 *   npx tsx scripts/merge-mx-521-leads.ts --client hera --apply
 */
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/lib/phone';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const clientIdx = args.indexOf('--client');
  const clientFilter = clientIdx >= 0 ? args[clientIdx + 1] : undefined;

  console.log(`Modo: ${apply ? 'APLICAR CAMBIOS' : 'DRY-RUN (no se modifica nada)'}${clientFilter ? ` | filtro: "${clientFilter}"` : ''}\n`);

  const leads521 = await prisma.lead.findMany({
    where: {
      phone: { startsWith: '521' },
      ...(clientFilter
        ? {
            project: {
              OR: [
                { name: { contains: clientFilter, mode: 'insensitive' } },
                { client: { name: { contains: clientFilter, mode: 'insensitive' } } },
                { client: { email: { contains: clientFilter, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    },
    include: { chat: { include: { _count: { select: { messages: true } } } }, project: true },
  });

  const candidates = leads521.filter((l) => normalizePhone(l.phone) !== l.phone);
  console.log(`Leads 521 (13 dígitos) encontrados: ${candidates.length}\n`);

  let merged = 0, skippedNoTarget = 0, failed = 0;

  for (const src of candidates) {
    const target52 = normalizePhone(src.phone);
    const dst = await prisma.lead.findUnique({
      where: { phone_projectId: { phone: target52, projectId: src.projectId } },
      include: { chat: true },
    });
    const label = `[${src.project.name}] ${src.phone} -> ${target52}`;

    if (!dst) {
      console.log(`${label}: sin lead 52 equivalente, se omite.`);
      skippedNoTarget++;
      continue;
    }

    const srcMsgs = src.chat?._count.messages ?? 0;
    console.log(`${label}: mover ${srcMsgs} mensajes (lead ${src.id} -> ${dst.id})`);
    if (!apply) continue;

    try {
      await prisma.$transaction(async (tx) => {
        let dstChat = dst.chat;
        if (!dstChat) {
          // El lead 52 no tiene chat: reasignamos el chat del 521 completo (conserva mensajes)
          if (src.chat) {
            dstChat = await tx.chat.update({ where: { id: src.chat.id }, data: { leadId: dst.id } });
          }
        } else if (src.chat) {
          await tx.message.updateMany({ where: { chatId: src.chat.id }, data: { chatId: dstChat.id } });
          const lastActiveAt = src.chat.lastActiveAt > dstChat.lastActiveAt ? src.chat.lastActiveAt : dstChat.lastActiveAt;
          await tx.chat.update({ where: { id: dstChat.id }, data: { lastActiveAt } });
          // El orden cronológico lo da Message.createdAt (el frontend ordena por esa fecha); no se alteran timestamps.
        }

        // Relaciones por teléfono
        await tx.userBooking.updateMany({
          where: { projectId: src.projectId, phone: src.phone },
          data: { phone: target52 },
        });

        // Completar datos faltantes del lead destino
        await tx.lead.update({
          where: { id: dst.id },
          data: {
            latestCampaignId: dst.latestCampaignId ?? src.latestCampaignId,
            agentId: dst.agentId ?? src.agentId,
            email: dst.email ?? src.email,
            score: Math.max(dst.score, src.score),
          },
        });

        // Verificación: el chat del 521 no debe tener mensajes antes de borrar el lead
        if (src.chat && dstChat && dstChat.id !== src.chat.id) {
          const remaining = await tx.message.count({ where: { chatId: src.chat.id } });
          if (remaining > 0) throw new Error(`Quedaron ${remaining} mensajes sin migrar en chat ${src.chat.id}`);
        }

        await tx.lead.delete({ where: { id: src.id } });
      });
      merged++;
    } catch (err) {
      failed++;
      console.error(`ERROR en ${label}:`, err);
    }
  }

  console.log(`\nResumen: fusionados=${merged}, sin destino=${skippedNoTarget}, errores=${failed}${apply ? '' : ' (dry-run)'}`);
}

main()
  .catch((e) => {
    console.error('Fallo general:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
