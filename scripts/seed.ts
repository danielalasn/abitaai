import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed empezando...')

  const hashedPassword = await bcrypt.hash('abita_test', 12)

  const client = await prisma.client.upsert({
    where: { email: 'test@test.com' },
    update: { password: hashedPassword },
    create: {
      name: 'test_user',
      email: 'test@test.com',
      password: hashedPassword,
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

  console.log('✅ Usuario creado/actualizado:', client.name)
  console.log('✅ Email:', client.email)
  console.log('✅ Contraseña hasheada lista')
  console.log('🚀 ¡Listo! Ya puedes loguearte con test@test.com / abita_test')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
