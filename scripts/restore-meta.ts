import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/lib/encryption'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const client = await prisma.client.findUnique({
    where: { email: 'melto@abitaai.com' },
    include: { projects: true }
  })

  if (!client || !client.projects[0]) {
    console.log("No se encontro proyecto Melto")
    return
  }

  const systemToken = process.env.SYSTEM_USER_TOKEN
  const wabaId = '2192832414784722' // WABA ID from debug script
  
  if (!systemToken) {
    console.log("No SYSTEM_USER_TOKEN")
    return
  }

  // Get phone number from Meta API
  const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${systemToken}`)
  const data = await res.json()
  const phone = data.data?.[0]?.id

  if (!phone) {
    console.log("No se pudo obtener el telefono de Meta:", data)
  }

  const encryptedToken = encrypt(systemToken)

  await prisma.project.update({
    where: { id: client.projects[0].id },
    data: {
      whatsappBusinessId: wabaId,
      whatsappToken: encryptedToken,
      whatsappPhoneId: phone || ''
    }
  })

  console.log("✅ WABA ID restaurado:", wabaId)
  console.log("✅ Token de WhatsApp restaurado (System Token)")
  console.log("✅ Phone ID restaurado:", phone)
}

main().catch(console.error).finally(() => prisma.$disconnect())
