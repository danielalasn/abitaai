const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.project.findFirst({
     where: { whatsappPhoneId: "148782064972236" },
     select: { whatsappToken: true }
  });
  console.log(p?.whatsappToken?.substring(0,25));
}
main().catch(console.error).finally(() => prisma.$disconnect());
