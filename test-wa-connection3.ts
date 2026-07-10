import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConnection() {
  const client = await prisma.client.findUnique({
    where: { email: 'abita@abitaai.com' },
    include: { 
      integrations: true 
    }
  });
  
  if (!client) return;
  console.log('Integrations:', client.integrations);
  
  process.exit(0);
}

checkConnection().catch(console.error);
