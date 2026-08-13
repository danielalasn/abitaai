import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'hera@abitaai.com' },
    include: { projects: true }
  })
  if (!user || !user.projects[0]) return console.log("No hera");
  
  const p = user.projects[0];
  console.log("WABA ID:", p.whatsappBusinessId);
  console.log("Phone ID:", p.whatsappPhoneId);
  console.log("Token length:", p.whatsappToken?.length || 0);
}

main().catch(console.error).finally(() => prisma.$disconnect())
