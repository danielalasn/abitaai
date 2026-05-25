'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DEFAULT_PROMPT_BLOCKS } from '@/lib/prompt-blocks-default';

// ─────────────────────────────────────────────────────────────
// SEED — poblar los bloques por primera vez
// ─────────────────────────────────────────────────────────────

export async function seedPromptBlocks() {
  const existing = await prisma.promptBlock.count();
  if (existing > 0) return { seeded: false, count: existing };

  await prisma.promptBlock.createMany({
    data: DEFAULT_PROMPT_BLOCKS,
    skipDuplicates: true,
  });

  return { seeded: true, count: DEFAULT_PROMPT_BLOCKS.length };
}

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────
export async function getPromptBlocks() {
  await ensureBlocksExist();
  return prisma.promptBlock.findMany({ orderBy: { order: 'asc' } });
}

export async function updatePromptBlock(id: string, data: {
  label?: string;
  description?: string;
  xmlTag?: string;
  content?: string;
  isEnabled?: boolean;
}) {
  const block = await prisma.promptBlock.update({ where: { id }, data });
  revalidatePath('/admin');
  return block;
}

export async function reorderPromptBlocks(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.promptBlock.update({ where: { id }, data: { order: index + 1 } })
    )
  );
  revalidatePath('/admin');
}

export async function createPromptBlock(data: {
  label: string;
  description?: string;
  xmlTag: string;
  content: string;
  source: string;
}) {
  const maxOrder = await prisma.promptBlock.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order || 0) + 1;

  const key = `custom_${Date.now()}`;
  const block = await prisma.promptBlock.create({
    data: { ...data, key, order: nextOrder, isDeletable: true },
  });
  revalidatePath('/admin');
  return block;
}

export async function deletePromptBlock(id: string) {
  const block = await prisma.promptBlock.findUnique({ where: { id } });
  if (!block?.isDeletable) throw new Error('Este bloque no se puede eliminar.');
  await prisma.promptBlock.delete({ where: { id } });
  revalidatePath('/admin');
}

// ─────────────────────────────────────────────────────────────
// PROMPT BUILDER ENGINE
// ─────────────────────────────────────────────────────────────
export async function buildSystemPrompt(params: {
  agentConfig: any;
  clientName: string;
  projectName: string;
  metadata?: any;
  scoringText?: string;
  leadScoringEnabled?: boolean;
}) {
  const { agentConfig, clientName, projectName, metadata, scoringText, leadScoringEnabled } = params;

  await ensureBlocksExist();
  const blocks = await prisma.promptBlock.findMany({
    where: { isEnabled: true },
    orderBy: { order: 'asc' },
  });

  const parts: string[] = [];

  for (const block of blocks) {
    let content = '';

    if (block.source === 'runtime') {
      content = buildRuntimeBlock(block.key, { clientName, projectName, metadata, scoringText, leadScoringEnabled });
      if (!content) continue; // skip empty runtime blocks
    } else if (block.source === 'agent') {
      // Use agent's value if set, otherwise fall back to block.content
      const fieldValue = block.agentField ? agentConfig?.[block.agentField] : null;
      content = fieldValue || block.content;
    } else {
      // global
      content = block.content;
    }

    if (!content?.trim()) continue;

    parts.push(`<${block.xmlTag}>\n${content}\n</${block.xmlTag}>`);
  }

  return parts.join('\n\n');
}

function buildRuntimeBlock(key: string, ctx: any): string {
  switch (key) {
    case 'client_context':
      return `Nombre: ${ctx.clientName}\nProyecto Interesado: ${ctx.projectName}`;

    case 'crm_metadata':
      if (!ctx.metadata) return '';
      return `Aquí tienes información previa que ya conocemos del cliente (datos de campañas o CRM):\n${JSON.stringify(ctx.metadata, null, 2)}\n\nREGLA DE CONTEXTO: Usa esta información para personalizar tu respuesta y evitar preguntar datos que ya aparecen aquí.`;

    case 'heatmap_scoring':
      if (!ctx.leadScoringEnabled) return '';
      return `Tu trabajo en segundo plano también es calificar el interés del cliente ("Heatmap"). Revisa estas reglas dadas por el dueño:\nREGLAS DE EVENTOS (Suma 100 en total):\n${ctx.scoringText || 'No hay reglas de calificación definidas.'}`;

    default:
      return '';
  }
}

// Garantiza que los bloques existan (auto-seed en primer uso)
async function ensureBlocksExist() {
  const count = await prisma.promptBlock.count();
  if (count === 0) await seedPromptBlocks();
}
