'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function verifyCurrentPassword(password: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false }

  const client = await prisma.client.findUnique({ where: { id: (session.user as any).id } })
  if (!client?.password) return { success: false }

  const isValid = await bcrypt.compare(password, client.password)
  return { success: isValid }
}

export async function updateProfile(data: {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { success: false, message: 'No session found' }
  }

  const clientId = (session.user as any).id

  // 1. Validar que el nuevo correo no esté tomado por otro (si cambió)
  if (data.email !== session.user.email) {
    const existing = await prisma.client.findUnique({ where: { email: data.email } })
    if (existing) {
      return { success: false, message: 'El correo electrónico ya está en uso por otra cuenta.' }
    }
  }

  // 2. Si quiere cambiar contraseña, validar la actual
  let passwordHash = undefined
  if (data.newPassword) {
    if (!data.currentPassword) {
      return { success: false, message: 'Debes proporcionar tu contraseña actual para cambiarla.' }
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client?.password) {
      return { success: false, message: 'Error de cuenta: No se encontró contraseña base.' }
    }

    const isValid = await bcrypt.compare(data.currentPassword, client.password)
    if (!isValid) {
      return { success: false, message: 'La contraseña actual no es correcta.' }
    }

    // Hashear la nueva
    passwordHash = await bcrypt.hash(data.newPassword, 10)
  }

  try {
    // 3. Actualizar
    await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email,
        ...(passwordHash ? { password: passwordHash } : {})
      }
    })

    revalidatePath('/')
    return { success: true, message: 'Perfil actualizado correctamente.' }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { success: false, message: 'Error interno al actualizar el perfil.' }
  }
}
