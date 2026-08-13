import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const tempPassword = 'AbitaTemp2024!'
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const client = await prisma.client.upsert({
    where: { email: 'melto@abitaai.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Melto',
      email: 'melto@abitaai.com',
      password: hashedPassword,
      role: 'CLIENT',
      projects: {
        create: {
          name: 'Proyecto Principal',
          botConfig: {
            create: {
              identity: 'Asistente Virtual',
              instructions: 'Eres un asistente amable.'
            }
          }
        }
      }
    },
    include: { projects: true }
  })

  console.log('✅ Usuario recreado:', client.email)
  console.log('✅ Proyectos:', client.projects.map(p => p.name).join(', '))
  console.log(`🔑 Contraseña temporal: ${tempPassword}`)
  console.log('⚠️  Cambia la contraseña después de loguearte.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
