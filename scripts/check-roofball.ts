import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: { name: { contains: 'roofball', mode: 'insensitive' } },
    include: { projects: true }
  });
  console.log('Clients:', JSON.stringify(clients, null, 2));

  const projects = await prisma.project.findMany({
    where: { name: { contains: 'roofball', mode: 'insensitive' } },
  });
  console.log('Projects:', JSON.stringify(projects, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
