import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/encryption'

const prisma = new PrismaClient()

async function main() {
  const email = 'radar@abitaai.com'
  
  const token = 'EAANJtIVY0OIBRYV72KOxdQ0plMMbknvWq3tO0sJW4s0AmZC5yI3Lk6HplZCT9FEE12gQUlOoEXXljJfYdT9amD5JszJ2fZCq4q8iA2yrZBGiavtzsdFcanfZAMzLcRkbO55e3wbNQW9mZADoh3ikt7AHY0pM3nMDZABdpxRwG05IxVJoF6poSIMhYyrQ6zXp5tSshWGMSciZBFtZCzqVDEVcM1VwCPcekLL37eXEPuukzSsOliZCFJX4mS8ZAJZBY32BVwkEICjn2dCxWrp2YzU7EfeGweL0e2ldk3ZBWxMxQ' 
  
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
