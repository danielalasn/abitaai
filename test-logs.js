const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const logs = await prisma.campaignLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log(logs.map(l => ({ phone: l.phone, status: l.status, wamid: l.wamid })))
}
main()
