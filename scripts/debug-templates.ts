import { PrismaClient } from '@prisma/client'
import { decrypt } from '../src/lib/encryption'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'melto@abitaai.com' },
    include: { projects: true }
  })
  if (!user || !user.projects[0]) return console.log("No melto");
  
  const p = user.projects[0];
  console.log("WABA ID:", p.whatsappBusinessId);
  const token = decrypt(p.whatsappToken!);
  
  const url = `https://graph.facebook.com/v19.0/${p.whatsappBusinessId}/message_templates?fields=id,name,status,category,language,components,quality_score,rejected_reason&limit=100`;
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log("TEMPLATES RESULT:");
  console.dir(data, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect())
