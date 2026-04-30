
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const email = 'radar@abitaai.com'
  const client = await prisma.client.findUnique({
    where: { email },
    include: {
      projects: true
    }
  })

  if (!client) {
    console.log(`User ${email} not found.`)
    return
  }

  console.log(`User: ${client.email} (ID: ${client.id})`)
  client.projects.forEach(p => {
    console.log(`  Project: ${p.name} (ID: ${p.id})`)
    console.log(`    whatsappPhoneId: ${p.whatsappPhoneId}`)
    console.log(`    whatsappToken (exists): ${!!p.whatsappToken}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
