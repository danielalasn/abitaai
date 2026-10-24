/**
 * Backup JSON (solo lectura) de los leads 521 y sus pares 52, con chats, mensajes y reservas.
 * Sirve como respaldo previo a scripts/merge-mx-521-leads.ts --apply.
 *
 * Uso: npx tsx scripts/backup-mx-521-leads.ts [--client hera]
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { normalizePhone } from '../src/lib/phone';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--client');
  const clientFilter = idx >= 0 ? args[idx + 1] : undefined;

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
    include: { chat: { include: { messages: true } } },
  });
  const sources = leads521.filter((l) => normalizePhone(l.phone) !== l.phone);

  const pairs = [];
  for (const src of sources) {
    const dst = await prisma.lead.findUnique({
      where: { phone_projectId: { phone: normalizePhone(src.phone), projectId: src.projectId } },
      include: { chat: { include: { messages: true } } },
    });
    const bookings = await prisma.userBooking.findMany({
      where: { projectId: src.projectId, phone: src.phone },
    });
    pairs.push({ lead521: src, lead52: dst, bookings521: bookings });
  }

  fs.mkdirSync('backups', { recursive: true });
  const file = `backups/mx521_pairs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(file, JSON.stringify(pairs, null, 2));

  const msgs = pairs.reduce(
    (n, p) => n + (p.lead521.chat?.messages.length ?? 0) + (p.lead52?.chat?.messages.length ?? 0),
    0
  );
  console.log(`Backup OK: ${file}\nPares/leads: ${pairs.length} | mensajes respaldados: ${msgs}`);
}

main()
  .catch((e) => {
    console.error('Fallo en backup:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
