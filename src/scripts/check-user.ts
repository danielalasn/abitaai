import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.client.findMany({
    where: { email: { in: ['melto@abitaai.com', 'mexicangrill@abitaai.com'] } },
    include: { projects: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
