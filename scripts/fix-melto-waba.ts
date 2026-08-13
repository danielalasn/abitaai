import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/lib/encryption'
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
  
  const systemToken = process.env.SYSTEM_USER_TOKEN;
  if (!systemToken) return console.log("NO SYSTEM TOKEN IN .ENV");

  await prisma.project.update({
    where: { id: p.id },
    data: {
      whatsappBusinessId: '2192832414784722',
      whatsappPhoneId: '1002474766287038',
      whatsappToken: encrypt(systemToken)
    }
  })
  
  console.log("✅ WABA ID, Phone ID y Token actualizados para Melto.");
}

main().catch(console.error).finally(() => prisma.$disconnect())
