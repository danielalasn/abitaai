import { PrismaClient } from '@prisma/client';
import { decrypt } from '../lib/encryption';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'melto@abitaai.com' },
    include: { projects: true }
  });

  if (!user || !user.projects[0]) {
    console.log("No se encontró el usuario Melto o no tiene proyectos");
    return;
  }

  const project = user.projects[0];
  const wabaId = project.whatsappBusinessId;
  const token = decrypt(project.whatsappToken!);

  console.log("WABA ID:", wabaId);
  
  const API_VERSION = 'v20.0'; // Probamos con la versión de API activa
  const url = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score,rejected_reason&limit=100`;

  console.log("Consultando templates a Meta...");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  console.log("Respuesta Meta:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
