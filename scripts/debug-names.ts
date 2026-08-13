import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'hera@abitaai.com' },
    include: { projects: true }
  })
  
  if (!user || !user.projects[0]) return
  const projectId = user.projects[0].id

  const leads = await prisma.lead.findMany({
    where: { projectId }
  })

  const badLeads = leads.filter(l => l.name?.includes('Jubis') || l.name?.includes('Hasfura') || l.name?.includes('Wauthion') || l.name?.includes('Zarzar'))
  console.log("Leads a arreglar:", badLeads.map(l => l.name))

  const campaigns = await prisma.campaign.findMany({
    where: { projectId }
  })
  
  console.log("Todas las campañas en DB:", campaigns.map(c => c.name))
}

main().catch(console.error).finally(() => prisma.$disconnect())
