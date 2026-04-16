const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.$queryRaw`SELECT status, wamid, "createdAt" FROM "CampaignLog" WHERE wamid = 'wamid.HBgLNTAzNzYwMDMzNzgVAgARGBJBMjRGNTMzQkY5RUJFRTAxQ0EA'`
  console.log("Raw query result:", result)
}
main()
