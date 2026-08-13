import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 🔥 Cambia este correo por el que uses para iniciar sesión con la cuenta de Hera
const CLIENT_EMAIL = 'hera@abitaai.com'
// 🔥 Cambia este nombre si tu archivo se llama distinto
const CSV_FILENAME = 'leads.csv'

async function main() {
  console.log(`Buscando el proyecto del cliente: ${CLIENT_EMAIL}...`)
  
  const user = await prisma.client.findFirst({
    where: { email: CLIENT_EMAIL },
    include: { projects: true }
  })

  if (!user || !user.projects[0]) {
    console.error(`❌ No se encontró el cliente o no tiene proyectos. Asegúrate de haber creado la cuenta en la plataforma primero.`)
    return
  }

  const projectId = user.projects[0].id
  console.log(`✅ Proyecto encontrado. ID: ${projectId}`)

  const csvPath = path.join(__dirname, CSV_FILENAME)
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No se encontró el archivo: ${csvPath}`)
    console.log(`Asegúrate de guardar tu excel como "leads.csv" adentro de la carpeta "scripts/"`)
    return
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')
  
  // Asumimos que la primera línea son los encabezados (#, nombre, campania)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  let added = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    // Manejar comas dentro del CSV de forma sencilla o separar por comas simples
    const row = lines[i].split(',').map(item => item.trim())
    if (row.length < 3) continue

    // Extraer basándonos en el formato: #, nombre, campania
    // Limpiamos el número de teléfono para asegurar que solo haya números
    const rawPhone = row[0]
    const phone = rawPhone.replace(/\D/g, '') // Quita cualquier símbolo como + o espacios
    
    const name = row[1]
    const campaignName = row[2]

    if (!phone) {
      skipped++
      continue
    }

    // Buscar o crear la campaña para que funcione el filtro del Inbox
    let campaignRecord = await prisma.campaign.findFirst({
      where: {
        projectId: projectId,
        name: campaignName
      }
    })

    if (!campaignRecord) {
      campaignRecord = await prisma.campaign.create({
        data: {
          projectId: projectId,
          name: campaignName,
          status: "SENT",
          leadCount: 0
        }
      })
    }

    // Upsert para no duplicar si el lead ya existe
    const lead = await prisma.lead.upsert({
      where: {
        phone_projectId: {
          projectId: projectId,
          phone: phone
        }
      },
      update: {
        name: name,
        latestCampaignId: campaignRecord.id, // VINCULAR A LA CAMPAÑA
        metadata: {
          imported_at: new Date().toISOString()
        }
      },
      create: {
        projectId: projectId,
        phone: phone,
        name: name,
        latestCampaignId: campaignRecord.id, // VINCULAR A LA CAMPAÑA
        metadata: {
          imported_at: new Date().toISOString()
        }
      }
    })

    // Asegurarse de que el Lead tenga un Chat asociado para que aparezca en el Inbox
    await prisma.chat.upsert({
      where: {
        leadId: lead.id
      },
      update: {}, // Si ya tiene chat, no hacer nada
      create: {
        leadId: lead.id,
        botActive: false,
        autoWakeBot: false,
        channel: "whatsapp"
      }
    })

    // Asegurarse de que haya un CampaignLog (el Inbox usa esto para mostrar los filtros)
    const existingLog = await prisma.campaignLog.findFirst({
      where: { campaignId: campaignRecord.id, phone: phone }
    })
    
    if (!existingLog) {
      await prisma.campaignLog.create({
        data: {
          campaignId: campaignRecord.id,
          phone: phone,
          status: "SENT"
        }
      })
    }

    added++
  }

  console.log(`\n🎉 Importación finalizada con éxito!`)
  console.log(`✅ Leads insertados/actualizados: ${added}`)
  console.log(`⚠️ Filas ignoradas (sin número válido): ${skipped}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
