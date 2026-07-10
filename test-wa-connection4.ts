import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConnection() {
  const clients = await prisma.client.findMany({
    select: { email: true }
  });
  console.log('Clientes:', clients.map(c => c.email));
  
  const projects = await prisma.project.findMany({
    where: { whatsappToken: { not: null } },
    select: { name: true, whatsappToken: true, whatsappPhoneId: true, client: { select: { email: true } } }
  });
  console.log('\nProyectos con Token en Project:', projects.map(p => ({
    name: p.name,
    email: p.client.email,
    phoneId: p.whatsappPhoneId,
    token: p.whatsappToken ? p.whatsappToken.substring(0,10) + '...' : null
  })));
  
  const botConfigs = await prisma.botConfig.findMany({
    where: { whatsappToken: { not: null } },
    select: { project: { select: { name: true, client: { select: { email: true } } } }, whatsappToken: true, whatsappPhoneId: true }
  });
  console.log('\nProyectos con Token en BotConfig:', botConfigs.map(b => ({
    name: b.project.name,
    email: b.project.client.email,
    phoneId: b.whatsappPhoneId,
    token: b.whatsappToken ? b.whatsappToken.substring(0,10) + '...' : null
  })));
  
  const integrations = await prisma.integration.findMany({
    where: { provider: { in: ['whatsapp', 'meta_instagram'] } },
    select: { provider: true, accessToken: true, pageId: true, client: { select: { email: true } } }
  });
  console.log('\nIntegraciones:', integrations.map(i => ({
    provider: i.provider,
    email: i.client.email,
    pageId: i.pageId,
    token: i.accessToken ? i.accessToken.substring(0,10) + '...' : null
  })));

  process.exit(0);
}

checkConnection().catch(console.error);
