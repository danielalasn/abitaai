import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'roofball', mode: 'insensitive' } },
        { name: { contains: 'hera', mode: 'insensitive' } },
        { name: { contains: 'melto', mode: 'insensitive' } },
        { email: { contains: 'roofball', mode: 'insensitive' } },
        { email: { contains: 'hera', mode: 'insensitive' } },
        { email: { contains: 'melto', mode: 'insensitive' } },
      ]
    },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          whatsappPhoneId: true,
          whatsappBusinessId: true,
          whatsappToken: true,
        }
      }
    }
  });

  console.log(JSON.stringify(clients, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
