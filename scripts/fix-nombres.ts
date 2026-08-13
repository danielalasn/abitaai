import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const CLIENT_EMAIL = 'hera@abitaai.com'
  const CORRECT_CAMPAIGN_NAME = 'Safie Rivera'

  const user = await prisma.client.findFirst({
    where: { email: CLIENT_EMAIL },
    include: { projects: true }
  })

  if (!user || !user.projects[0]) return
  const projectId = user.projects[0].id

  // 1. Obtener o crear la campaña correcta
  let correctCampaign = await prisma.campaign.findFirst({
    where: { projectId, name: CORRECT_CAMPAIGN_NAME }
  })

  if (!correctCampaign) {
    correctCampaign = await prisma.campaign.create({
      data: { projectId, name: CORRECT_CAMPAIGN_NAME, status: 'SENT', leadCount: 0 }
    })
  }

  // Las combinaciones de nombres correctos a arreglar (incluyendo las comillas accidentales)
  const corrections = [
    { startsWith: '"Sr. Mauricio Jubis', correctName: 'Sr. Mauricio Jubis, Sra e hijos' },
    { startsWith: '"Sr. Ivan Hasfura', correctName: 'Sr. Ivan Hasfura, Sra e hija.' },
    { startsWith: '"Sr.Ricardo Wauthion', correctName: 'Sr.Ricardo Wauthion, Sra e hija.' },
    { startsWith: '"Sr. Alberto Zarzar', correctName: 'Sr. Alberto Zarzar, Sra. Eileen de Zarzar e hija' }
  ]

  for (const corr of corrections) {
    // Encontrar al lead afectado
    const badLead = await prisma.lead.findFirst({
      where: {
        projectId,
        name: { startsWith: corr.startsWith }
      }
    })

    if (badLead) {
      console.log(`Corrigiendo: ${badLead.name} -> ${corr.correctName}`)
      
      // 2. Corregir nombre y asignarlo a Safie Rivera
      await prisma.lead.update({
        where: { id: badLead.id },
        data: {
          name: corr.correctName,
          latestCampaignId: correctCampaign.id
        }
      })

      // 3. Crear log de campaña en Safie Rivera (si no existe)
      const existingLog = await prisma.campaignLog.findFirst({
        where: { campaignId: correctCampaign.id, phone: badLead.phone }
      })

      if (!existingLog) {
        await prisma.campaignLog.create({
          data: {
            campaignId: correctCampaign.id,
            phone: badLead.phone,
            status: "SENT"
          }
        })
      }
    }
  }

  // 4. Borrar las campañas creadas por error (las partes después de la coma)
  const badCampaigns = await prisma.campaign.findMany({
    where: {
      projectId,
      name: {
        in: [
          'Sra e hijos"', 
          'Sra e hija."', 
          'Sra. Eileen de Zarzar e hija"',
          ' Sra e hijos"',
          ' Sra e hija."',
          ' Sra. Eileen de Zarzar e hija"'
        ]
      }
    }
  })

  for (const badCamp of badCampaigns) {
    console.log(`Borrando campaña fantasma: "${badCamp.name}"`)
    // Borrarla eliminará también los CampaignLog falsos en cascada
    await prisma.campaign.delete({ where: { id: badCamp.id } })
  }

  console.log("✅ Limpieza de la base de datos terminada con éxito.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
