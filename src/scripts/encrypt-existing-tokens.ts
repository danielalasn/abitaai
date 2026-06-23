import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../lib/encryption';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migración de tokens a formato encriptado AES-256-GCM...');
  
  // 1. Migrar tokens de Project
  const projects = await prisma.project.findMany({
    where: { whatsappToken: { not: null } }
  });

  let projectCount = 0;
  for (const project of projects) {
    if (project.whatsappToken) {
      // Intentamos desencriptarlo. Si falla, el decrypt() de lib/encryption
      // actualmente retorna el hash original (fallback legacy).
      // Si el formato no tiene ':' o al desencriptar no funciona, es texto plano.
      const isAlreadyEncrypted = project.whatsappToken.includes(':') && project.whatsappToken.split(':').length === 3;
      if (!isAlreadyEncrypted) {
        const encrypted = encrypt(project.whatsappToken);
        await prisma.project.update({
          where: { id: project.id },
          data: { whatsappToken: encrypted }
        });
        projectCount++;
      }
    }
  }

  // 2. Migrar tokens de BotConfig
  const botConfigs = await prisma.botConfig.findMany({
    where: { whatsappToken: { not: null } }
  });

  let botConfigCount = 0;
  for (const config of botConfigs) {
    if (config.whatsappToken) {
      const isAlreadyEncrypted = config.whatsappToken.includes(':') && config.whatsappToken.split(':').length === 3;
      if (!isAlreadyEncrypted) {
        const encrypted = encrypt(config.whatsappToken);
        await prisma.botConfig.update({
          where: { id: config.id },
          data: { whatsappToken: encrypted }
        });
        botConfigCount++;
      }
    }
  }

  // 3. Migrar tokens de Integration (Instagram/Meta)
  const integrations = await prisma.integration.findMany({
    where: { accessToken: { not: null } }
  });

  let integrationCount = 0;
  for (const integration of integrations) {
    if (integration.accessToken) {
      const isAlreadyEncrypted = integration.accessToken.includes(':') && integration.accessToken.split(':').length === 3;
      if (!isAlreadyEncrypted) {
        const encrypted = encrypt(integration.accessToken);
        await prisma.integration.update({
          where: { id: integration.id },
          data: { accessToken: encrypted }
        });
        integrationCount++;
      }
    }
  }

  console.log('✅ Migración completada exitosamente.');
  console.log(`- Proyectos migrados: ${projectCount}`);
  console.log(`- BotConfigs migrados: ${botConfigCount}`);
  console.log(`- Integraciones migradas: ${integrationCount}`);
}

main()
  .catch(e => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
