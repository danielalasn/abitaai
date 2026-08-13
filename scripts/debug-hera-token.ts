import { PrismaClient } from '@prisma/client'
import { decrypt } from '../src/lib/encryption'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'hera@abitaai.com' },
    include: { projects: true }
  })
  if (!user || !user.projects[0]) return console.log("No hera");
  
  const p = user.projects[0];
  const token = decrypt(p.whatsappToken!);
  
  console.log("WABA ID:", p.whatsappBusinessId);
  console.log("Phone ID:", p.whatsappPhoneId);
  console.log("Token length:", token?.length || 0);

  if (!token) return console.log("No token");
  
  // Verificar si el token es válido
  const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
  const data = await res.json();
  
  console.log("\nToken debug info:");
  console.dir(data?.data || data, { depth: null });
  
  // También probar templates
  if (p.whatsappBusinessId) {
    const tRes = await fetch(`https://graph.facebook.com/v19.0/${p.whatsappBusinessId}/message_templates?limit=5&access_token=${token}`);
    const tData = await tRes.json();
    console.log("\nTemplates test:");
    if (tData.error) console.log("ERROR:", tData.error.message);
    else console.log("Templates count:", tData.data?.length || 0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
