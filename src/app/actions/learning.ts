'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import { getCurrentProject } from '@/lib/auth-server'

export async function getUnansweredQuestions() {
  const project = await getCurrentProject();
  if (!project) return [];

  return await prisma.unansweredQuestion.findMany({
    where: { 
      resolved: false,
      projectId: project.id
    },
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

export async function deleteQuestion(id: string) {
  await prisma.unansweredQuestion.delete({
    where: { id }
  });
  revalidatePath('/learning');
  return { success: true };
}

export async function answerAndTrain(id: string, answer: string) {
  const questionRecord = await prisma.unansweredQuestion.findUnique({
    where: { id }
  });

  if (!questionRecord) return { success: false, message: 'Pregunta no encontrada' };

  const project = await prisma.project.findUnique({
    where: { id: questionRecord.projectId },
    include: { botConfig: true }
  });

  if (!project?.botConfig) return { success: false, message: 'Configuración de bot no encontrada' };

  const currentFaq = project.botConfig.faq || "";
  const newFaqEntry = `\nP: ${questionRecord.question}\nR: ${answer}`;
  const updatedFaq = currentFaq + newFaqEntry;

  // Actualizar FAQ
  await prisma.botConfig.update({
    where: { id: project.botConfig.id },
    data: { faq: updatedFaq }
  });

  // Marcar como resuelta
  await prisma.unansweredQuestion.update({
    where: { id },
    data: { resolved: true }
  });

  revalidatePath('/learning');
  revalidatePath('/settings');
  return { success: true };
}
