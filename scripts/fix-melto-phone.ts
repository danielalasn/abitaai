import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Primero veamos cuál es el proyecto de Melto
  const user = await prisma.client.findFirst({
    where: { email: 'melto@abitaai.com' },
    include: { projects: true }
  });

  if (!user || !user.projects[0]) {
    console.log("No encontré a Melto");
    return;
  }

  const proj = user.projects[0];
  console.log("Antes:", proj.whatsappBusinessId, proj.whatsappPhoneId);

  // Actualizar al nuevo phoneId
  await prisma.project.update({
    where: { id: proj.id },
    data: { whatsappPhoneId: '1002474766287038' }
  });

  console.log("✅ PhoneId actualizado con éxito a 1002474766287038");
}

main().catch(console.error).finally(() => prisma.$disconnect());
