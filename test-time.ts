import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const messages = await prisma.message.findMany({
    where: { role: 'assistant', createdAt: { gte: new Date('2026-09-10T00:00:00Z') } },
    select: { content: true, createdAt: true, chat: { select: { lead: { select: { project: { select: { client: { select: { name: true } } } } } } } } }
  });
  for(const m of messages) {
    console.log(`[${m.createdAt.toISOString()}] [${m.chat?.lead?.project?.client?.name}]`);
  }
}
main().finally(() => prisma.$disconnect());
