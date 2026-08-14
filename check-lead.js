const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { phone: 'SIMULATOR_PHONE' } // Wait, what is SIMULATOR_PHONE? I need to check the constant.
  })
  console.log(lead)
}
main()
