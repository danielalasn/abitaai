require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Abita Bot...")
  const email = 'abita-bot@abitaai.com'
  
  let client = await prisma.client.findUnique({ where: { email } })
  
  if (client) {
    console.log("Abita Bot Client already exists.")
  } else {
    client = await prisma.client.create({
      data: {
        name: "Abita AI Assistant",
        email: email,
        role: "ABITA_BOT", // Identifying role
        projects: {
          create: {
            name: "Internal Support Project",
            agents: {
              create: {
                name: "Abita Bot",
                identity: "Eres Abita, el asistente de soporte técnico interno para los clientes de la plataforma Abita AI SaaS. Eres amable, directo, y ayudas a los usuarios a navegar por la plataforma, entender cómo usar las funciones, y resolver sus dudas sobre el sistema.",
                instructions: "- Da respuestas cortas y claras.\n- Usa formato markdown cuando aplique.\n- Si no sabes algo, dile al usuario que contacte a info@abitaai.com.",
              }
            }
          }
        }
      }
    })
    console.log("Created Abita Bot Client and Project!")
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
