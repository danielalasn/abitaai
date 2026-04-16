const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.$queryRaw`SELECT status, wamid, "createdAt" FROM "CampaignLog" WHERE phone = '50376003378' ORDER BY "createdAt" DESC LIMIT 5`
  console.log("Raw query result:", result)
}
main()
