import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConnection() {
  const client = await prisma.client.findUnique({
    where: { email: 'abita@abitaai.com' },
    include: { 
      projects: { include: { botConfig: true } },
    }
  });
  
  if (!client || !client.projects[0]) return;
  
  const project = client.projects[0];
  const botConfig = project.botConfig;
  
  console.log('--- BotConfig ---');
  console.log('Phone ID:', botConfig?.whatsappPhoneId);
  console.log('Token Length:', botConfig?.whatsappToken?.length || 0);
  
  const tokenToUse = project.whatsappToken || botConfig?.whatsappToken;
  const phoneIdToUse = project.whatsappPhoneId || botConfig?.whatsappPhoneId;
  
  if (!tokenToUse || !phoneIdToUse) {
    console.log('Aún no hay token ni en project ni en botConfig');
    return;
  }
  
  console.log('\n--- Probando Token ---');
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneIdToUse}`, {
    headers: { 'Authorization': `Bearer ${tokenToUse}` }
  });
  
  const data = await res.json();
  console.dir(data, { depth: null });
  console.log('Status HTTP:', res.status);
  
  process.exit(0);
}

checkConnection().catch(console.error);
