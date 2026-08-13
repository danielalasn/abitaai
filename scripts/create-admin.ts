import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const tempPassword = 'AdminTemp2024!'
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const admin = await prisma.client.upsert({
    where: { email: 'info@abitaai.com' },
    update: { 
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      name: 'Admin Abita',
      email: 'info@abitaai.com',
      password: hashedPassword,
      role: 'ADMIN',
    }
  })

  console.log('✅ Usuario ADMIN recreado:', admin.email)
  console.log(`🔑 Contraseña temporal: ${tempPassword}`)
  console.log('⚠️  Recuerda cambiar la contraseña después de loguearte.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
