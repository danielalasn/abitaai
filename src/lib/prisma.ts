import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'], // Enable query logging if debugging is needed: 'query', 'warn', 'error'
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// Preserve the connection pool during Next.js Hot Reloads
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export { prisma }
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
