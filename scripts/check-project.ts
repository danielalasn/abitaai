import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, whatsappPhoneId: true }
  });
  console.dir(projects, { depth: null });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
