import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/encryption'

const prisma = new PrismaClient()

async function main() {
  const email = 'radar@abitaai.com'
  
  const token = 'EAAG2zZA9ZCv9UBO4B56PZBa0IIdZByyI7O7Xp7A5ZBmR0uR8Miz8QpWp8uO4N1o8QpWp8uO4N1o8QpWp8uO4N1o' 
  
  const phoneId = '1037952669409790'
  const businessId = '760683746638158'

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
