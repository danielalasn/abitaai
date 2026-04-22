'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function getClientId(): Promise<string> {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) throw new Error('Not authenticated')
  return user.id
}

export async function getIntegrationStatus(provider: string) {
  const clientId = await getClientId()
  const integration = await prisma.integration.findUnique({
    where: { clientId_provider: { clientId, provider } },
    select: {
      id: true,
      status: true,
      instagramAccountId: true,
      pageId: true,
      createdAt: true,
    }
  })
  return integration || null
}

export async function disconnectIntegration(provider: string) {
  const clientId = await getClientId()
  await prisma.integration.delete({
    where: { clientId_provider: { clientId, provider } }
  }).catch(() => {}) // ignore if not found
  revalidatePath('/settings')
  return { success: true }
}
