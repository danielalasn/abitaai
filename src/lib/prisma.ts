import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  console.log('Initializing Prisma Client...')
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export { prisma }
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
