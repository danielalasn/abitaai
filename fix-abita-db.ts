import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const client = await prisma.client.findUnique({
    where: { email: 'abita@abitaai.com' },
    include: { projects: true }
  });
  
  const project = client?.projects[0];
  if (!project) return;
  
  console.log('Project current:', {
    businessId: project.whatsappBusinessId,
    phoneId: project.whatsappPhoneId
  });
  
  await prisma.project.update({
    where: { id: project.id },
    data: { 
      whatsappBusinessId: '2178386092973067',
      whatsappPhoneId: '1087380634460356'
    }
  });
  
  console.log('Project updated successfully.');
  process.exit(0);
}

fix().catch(console.error);
