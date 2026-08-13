import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const CLIENT_EMAIL = 'hera@abitaai.com'
  console.log(`Buscando el proyecto del cliente: ${CLIENT_EMAIL}...`)
  
  const user = await prisma.client.findFirst({
    where: { email: CLIENT_EMAIL },
    include: { projects: true }
  })

  if (!user || !user.projects[0]) {
    console.error(`❌ No se encontró el cliente o no tiene proyectos.`)
    return
  }

  const projectId = user.projects[0].id

  // Obtener todos los leads de este proyecto
  const leads = await prisma.lead.findMany({
    where: { projectId: projectId },
    select: { id: true }
  })

  const leadIds = leads.map(l => l.id)

  if (leadIds.length === 0) {
    console.log("No hay leads en este proyecto.")
    return
  }

  // Actualizar todos los chats asociados a estos leads
  const result = await prisma.chat.updateMany({
    where: {
      leadId: { in: leadIds }
    },
    data: {
      botActive: false,
      autoWakeBot: false
    }
  })

  console.log(`✅ ¡Listo! Se apagó el bot y la auto-reactivación en ${result.count} chats de Hera.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
