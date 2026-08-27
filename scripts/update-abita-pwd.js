require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const email = 'abita-bot@abitaai.com'
  const password = await bcrypt.hash('Abita2026', 10)
  
  await prisma.client.update({
    where: { email },
    data: { password }
  })
  console.log("Password updated successfully for " + email)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
