const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log(messages);
}
main().catch(console.error).finally(() => prisma.$disconnect());
