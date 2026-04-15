const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando limpieza de datos de prueba...');

  try {
    // El orden importa para evitar errores de llave foránea
    
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ Mensajes eliminados: ${messages.count}`);

    const chats = await prisma.chat.deleteMany({});
    console.log(`✅ Chats eliminados: ${chats.count}`);

    const leads = await prisma.lead.deleteMany({});
    console.log(`✅ Leads eliminados: ${leads.count}`);

    const unanswered = await prisma.unansweredQuestion.deleteMany({});
    console.log(`✅ Preguntas sin responder eliminadas: ${unanswered.count}`);

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
