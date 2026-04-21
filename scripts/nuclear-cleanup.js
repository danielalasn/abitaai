const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanData() {
  console.log('🚀 Iniciando limpieza total de base de datos...');

  try {
    // 1. Identificar al admin
    const adminEmail = 'info@abitaai.com';
    
    // 2. Borrar todos los proyectos (esto detonará cascada en Leads, Chats, Mensajes, Campañas, BotConfigs)
    const deleteProjects = await prisma.project.deleteMany({});
    console.log(`✅ ${deleteProjects.count} Proyectos eliminados (y toda su data relacionada).`);

    // 3. Borrar todos los clientes excepto el admin
    const deleteClients = await prisma.client.deleteMany({
      where: {
        NOT: {
          email: adminEmail
        }
      }
    });
    console.log(`✅ ${deleteClients.count} Clientes eliminados.`);

    console.log('✨ Base de datos limpia. Solo queda el usuario admin listo para usar.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
