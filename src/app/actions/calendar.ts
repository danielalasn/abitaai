'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentProject } from '@/lib/auth-server'

export async function getCalendarConfig() {
  const project = await getCurrentProject();
  if (!project) return null;

  const config = await prisma.calendarConfig.findUnique({
    where: { projectId: project.id }
  });

  return config;
}

export async function saveCalendarConfig(
  fieldsToCollect: string[],
  eventTitle: string,
  eventDescription: string,
  durationMinutes: number,
  confirmationMessage: string
) {
  const project = await getCurrentProject();
  if (!project) throw new Error('Project not found');

  const config = await prisma.calendarConfig.upsert({
    where: { projectId: project.id },
    update: {
      fieldsToCollect,
      eventTitle,
      eventDescription,
      durationMinutes,
      confirmationMessage
    },
    create: {
      projectId: project.id,
      fieldsToCollect,
      eventTitle,
      eventDescription,
      durationMinutes,
      confirmationMessage
    }
  });

  revalidatePath('/settings');
  return { success: true, config };
}
