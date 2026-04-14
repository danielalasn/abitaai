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

  // Find the agent that couldn't answer (or fall back to the first agent)
  let agent = null;
  if (questionRecord.agentId) {
    agent = await prisma.agent.findUnique({ where: { id: questionRecord.agentId } });
  }
  if (!agent) {
    agent = await prisma.agent.findFirst({ where: { projectId: questionRecord.projectId } });
  }

  if (!agent) return { success: false, message: 'Agente no encontrado' };

  const currentFaq = agent.faq || "";
  const newFaqEntry = `\nP: ${questionRecord.question}\nR: ${answer}`;
  const updatedFaq = currentFaq + newFaqEntry;

  // Actualizar FAQ del agente
  await prisma.agent.update({
    where: { id: agent.id },
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
