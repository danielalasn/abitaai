import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando limpieza de datos de prueba...');

  try {
    // El orden importa si no hay cascade completo, pero aquí Lead tiene cascade a Chat y Message
    
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ Mensajes eliminados: ${messages.count}`);

    const chats = await prisma.chat.deleteMany({});
    console.log(`✅ Chats eliminados: ${chats.count}`);

    const leads = await prisma.lead.deleteMany({});
    console.log(`✅ Leads eliminados: ${leads.count}`);

    const unanswered = await prisma.unansweredQuestion.deleteMany({});
    console.log(`✅ Preguntas sin responder eliminadas: ${unanswered.count}`);

    // También limpiamos campañas si existen, ya que suelen ser de prueba
    const campaigns = await prisma.campaign.deleteMany({});
    console.log(`✅ Campañas eliminadas: ${campaigns.count}`);

    console.log('✨ Limpieza completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
