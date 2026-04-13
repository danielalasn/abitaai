import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando usuario en la base de datos...')
  
  const user = await prisma.client.findUnique({
    where: { email: 'test@test.com' }
  })

  if (user) {
    console.log('✅ ¡USUARIO ENCONTRADO!')
    console.log(`Nombre: ${user.name}`)
    console.log(`Email: ${user.email}`)
    console.log(`Hasheado de password: ${user.password.substring(0, 10)}... (escondido por seguridad)`)
  } else {
    console.log('❌ USUARIO NO ENCONTRADO.')
    console.log('Asegúrate de que tu .env local tenga la misma DATABASE_URL que Vercel y corre: npx tsx scripts/seed.ts')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error de conexión:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
