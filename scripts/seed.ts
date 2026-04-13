import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed empezando...')
  
  const client = await prisma.client.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: {
      name: 'test_user',
      email: 'test@test.com',
      projects: {
        create: {
          name: 'Proyecto Inicial',
          botConfig: {
            create: {
              identity: 'Asistente Virtual',
              instructions: 'Eres un asistente amable.'
            }
          }
        }
      }
    },
    include: {
      projects: true
    }
  })

  console.log('✅ Usuario creado:', client.name)
  console.log('✅ Proyecto creado:', client.projects[0].name)
  console.log('🚀 ¡Listo! Ya puedes loguearte con test@test.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
