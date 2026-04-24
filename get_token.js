const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminClient = await prisma.client.findFirst({
    where: { email: 'info@abitaai.com' },
    include: { projects: true }
  });
  const token = adminClient?.projects?.[0]?.whatsappToken;
  console.log("Master Token:", token?.substring(0, 50));
}
main().catch(console.error).finally(() => prisma.$disconnect());
