'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateUserTheme(theme: string) {
  const session = await getServerSession(authOptions) as any;
  const userId = session?.user?.id;
  
  if (!userId) {
    throw new Error('No autorizado');
  }

  await prisma.client.update({
    where: { id: userId },
    data: { theme }
  });

  revalidatePath('/');
}
