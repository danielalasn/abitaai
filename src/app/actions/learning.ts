'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getUnansweredQuestions() {
  return await prisma.unansweredQuestion.findMany({
    where: { resolved: false },
    orderBy: { createdAt: 'desc' }
  });
}

export async function resolveQuestion(id: string) {
  await prisma.unansweredQuestion.update({
    where: { id },
    data: { resolved: true }
  });
  revalidatePath('/learning');
  return { success: true };
}
