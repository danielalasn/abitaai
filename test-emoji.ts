import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const chat = await prisma.chat.findFirst();
  if (!chat) {
    console.log("No chat found");
    return;
  }
  
  const testMsg = await prisma.message.create({
    data: {
      chatId: chat.id,
      role: 'user',
      content: '👍 emoji test',
      status: 'SENT'
    }
  });
  console.log("Inserted successfully:", testMsg);
  
  // Clean up
  await prisma.message.delete({ where: { id: testMsg.id } });
}

run().catch(console.error);
