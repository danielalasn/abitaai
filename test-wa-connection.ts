import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConnection() {
  const client = await prisma.client.findUnique({
    where: { email: 'abita@abitaai.com' },
    include: { 
      projects: true,
      integrations: true 
    }
  });
  
  if (!client) {
    console.log('Cliente no encontrado');
    return;
  }
  
  const project = client.projects[0];
  if (!project) {
    console.log('El cliente no tiene proyectos');
    return;
  }
  
  console.log('Proyecto:', project.name);
  console.log('WA Phone ID:', project.whatsappPhoneId);
  console.log('WA Token (Project):', project.whatsappToken?.substring(0, 15) + '...');
  
  const waIntegration = client.integrations.find(i => i.provider === 'whatsapp' || i.provider === 'meta_instagram');
  if (waIntegration) {
    console.log('Integration Token:', waIntegration.accessToken?.substring(0, 15) + '...');
  }
  
  const tokenToUse = project.whatsappToken || waIntegration?.accessToken;
  const phoneIdToUse = project.whatsappPhoneId || waIntegration?.pageId;
  
  if (!tokenToUse || !phoneIdToUse) {
    console.log('Faltan credenciales (Token o PhoneID)');
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
