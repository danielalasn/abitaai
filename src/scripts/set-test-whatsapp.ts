import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/encryption'

const prisma = new PrismaClient()

async function main() {
  const email = 'radar@abitaai.com'
  
  const token = 'EAANJtIVY0OIBRTDZArkDFMyoiQEFTcLn0k6GVmqZAuhO4F61LOwtgYl84vyqV4mrI7wNkcvzqT4SalqFQHctgT8Tkz08GCwOwh1LYRcEz12vwMDh6DuT45iNeKTbKyJmEn8PiH1ZAICob8U4ZCZBanp2uneKI7DZARONoqBrXkZAeuJpDiQ98OLh94Kbdb5R03T7ZALfnprYREOR1ygbs86D3IOJAXPCftkiR1ZBpKorrwr9ZCNKLGJIMK8oASXae1gNNQfcIHSzMcnZB1PZAzCV9qVUG3ZChjVOAsvRbvk1c' 
  
  const phoneId = '1037952669409790'
  const businessId = '2192832414784722'

  const client = await prisma.client.findUnique({
    where: { email },
    include: { projects: true }
  })

  if (!client || client.projects.length === 0) {
    console.log(`❌ Usuario ${email} o su proyecto no encontrado. Asegúrate de haber iniciado sesión al menos una vez para que se cree la cuenta.`)
    process.exit(1)
  }

  const projectId = client.projects[0].id

  // Guardamos el token cifrado como lo espera el resto del sistema
  await prisma.project.update({
    where: { id: projectId },
    data: {
      whatsappToken: encrypt(token),
      whatsappPhoneId: phoneId,
      whatsappBusinessId: businessId
    }
  })

  console.log(`✅ Credenciales de prueba configuradas exitosamente para ${email}`)
  console.log(`Ahora puedes probar el envío y recepción de mensajes desde el Inbox usando este usuario.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
