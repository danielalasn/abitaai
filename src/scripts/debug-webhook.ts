import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: '934708762679830' }
  });
  console.log(JSON.stringify(event, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
