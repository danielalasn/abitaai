import { PrismaClient } from '@prisma/client';
import { decrypt } from '../lib/encryption';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'melto@abitaai.com' },
    include: { projects: true }
  });

  if (!user || !user.projects[0]) {
    console.log("No se encontró el usuario Melto");
    return;
  }

  const project = user.projects[0];
  const wabaId = project.whatsappBusinessId;
  const token = decrypt(project.whatsappToken!);

  console.log("Comprobando detalles del token / WABA ID:", wabaId);
  
  // Consultar información del token en debug_token
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();
  console.log("Debug Token Info:", JSON.stringify(debugData, null, 2));

  // Consultar información del WABA directamente
  const wabaUrl = `https://graph.facebook.com/v20.0/${wabaId}?access_token=${token}`;
  const wabaRes = await fetch(wabaUrl);
  const wabaData = await wabaRes.json();
  console.log("WABA Info:", JSON.stringify(wabaData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
