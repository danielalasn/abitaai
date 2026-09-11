import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    where: {
      role: 'assistant',
      createdAt: { gte: new Date('2026-09-11T00:00:00Z') }
    },
    select: { content: true, createdAt: true, chat: { select: { lead: { select: { project: { select: { client: { select: { name: true } } } } } } } } }
  });
  console.log("Total assistant messages today (UTC):", messages.length);
  console.log("Messages starting with [Sistema]:", messages.filter(m => m.content.startsWith('[Sistema]')).length);
  
  // Show all contents to verify
  for(const m of messages) {
    console.log(`- [${m.chat?.lead?.project?.client?.name}] ${m.content.substring(0, 50)}`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
