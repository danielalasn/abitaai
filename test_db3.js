const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.project.findFirst({
      select: { whatsappPhoneId: true, whatsappToken: true }
  });
  console.log("Phone_ID:", p?.whatsappPhoneId);
  console.log("Token:", p?.whatsappToken?.substring(0,25));
}
main().catch(console.error).finally(() => prisma.$disconnect());
