const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purgeAllLeadsAndMessages() {
  console.log('--- INICIANDO PURGA DE DATOS DE CONTACTO ---');
  
  try {
    // 1. Borrar mensajes (están vinculados a Chat)
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ ${messages.count} mensajes eliminados.`);

    // 2. Borrar chats (están vinculados a Lead)
    const chats = await prisma.chat.deleteMany({});
    console.log(`✅ ${chats.count} chats eliminados.`);

    // 3. Borrar campañas (están vinculadas a Project)
    const campaigns = await prisma.campaign.deleteMany({});
    console.log(`✅ ${campaigns.count} campañas eliminadas.`);

    // 4. Borrar preguntas no contestadas
    const questions = await prisma.unansweredQuestion.deleteMany({});
    console.log(`✅ ${questions.count} preguntas no contestadas eliminadas.`);

    // 5. Borrar leads (el corazón de la data de contactos)
    const leads = await prisma.lead.deleteMany({});
    console.log(`✅ ${leads.count} leads eliminados.`);

    console.log('--- PURGA COMPLETADA CON ÉXITO ---');
  } catch (error) {
    console.error('❌ Error durante la purga:', error);
  } finally {
    await prisma.$disconnect();
  }
}

purgeAllLeadsAndMessages();
