import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log("CLIENTS:", clients);

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, clientId: true }
  });
  console.log("PROJECTS:", projects);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
