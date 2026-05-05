import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const chat = await prisma.chat.findFirst({
    include: { lead: true }
  });
  console.log("Chat before:", chat?.id, chat?.botActive);
  if (chat) {
    const updated = await prisma.chat.update({
      where: { id: chat.id },
      data: { botActive: !chat.botActive }
    });
    console.log("Chat after:", updated.botActive);
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
