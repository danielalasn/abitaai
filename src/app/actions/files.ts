'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentProject } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export interface CreateBotFileInput {
  name: string;
  description: string;
  url: string;
  filename?: string;
  mimeType?: string;
}

export interface UpdateBotFileInput {
  id: string;
  name?: string;
  description?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
}

export async function getBotFiles() {
  const project = await getCurrentProject();
  if (!project) return [];

  const files = await prisma.botFile.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
  });

  return files;
}

export async function createBotFile(input: CreateBotFileInput) {
  try {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    if (!input.name.trim() || !input.description.trim() || !input.url.trim()) {
      return { success: false, error: 'Nombre, instrucción y archivo son obligatorios' };
    }

    const file = await prisma.botFile.create({
      data: {
        projectId: project.id,
        name: input.name.trim(),
        description: input.description.trim(),
        url: input.url.trim(),
        filename: input.filename || null,
        mimeType: input.mimeType || null,
      },
    });

    try { revalidatePath('/files'); } catch (e) {}
    try { revalidatePath('/'); } catch (e) {}
    return { success: true, file };
  } catch (error: any) {
    console.error('[createBotFile] Error:', error);
    return { success: false, error: 'Ocurrió un error al guardar el archivo' };
  }
}

export async function updateBotFile(input: UpdateBotFileInput) {
  try {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const existing = await prisma.botFile.findFirst({
      where: { id: input.id, projectId: project.id },
    });

    if (!existing) {
      return { success: false, error: 'Archivo no encontrado o sin acceso' };
    }

    const updated = await prisma.botFile.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.url !== undefined ? { url: input.url.trim() } : {}),
        ...(input.filename !== undefined ? { filename: input.filename || null } : {}),
        ...(input.mimeType !== undefined ? { mimeType: input.mimeType || null } : {}),
      },
    });

    try { revalidatePath('/files'); } catch (e) {}
    try { revalidatePath('/'); } catch (e) {}
    return { success: true, file: updated };
  } catch (error: any) {
    console.error('[updateBotFile] Error:', error);
    return { success: false, error: 'Ocurrió un error al actualizar el archivo' };
  }
}

export async function deleteBotFile(id: string) {
  try {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const existing = await prisma.botFile.findFirst({
      where: { id, projectId: project.id },
    });

    if (!existing) {
      return { success: false, error: 'Archivo no encontrado' };
    }

    await prisma.botFile.delete({
      where: { id: existing.id },
    });

    try { revalidatePath('/files'); } catch (e) {}
    try { revalidatePath('/'); } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error('[deleteBotFile] Error:', error);
    return { success: false, error: 'Ocurrió un error al eliminar el archivo' };
  }
}
