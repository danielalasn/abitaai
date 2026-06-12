'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DEFAULT_PROMPT_BLOCKS } from '@/lib/prompt-blocks-default';

// ─────────────────────────────────────────────────────────────
// SEED & RESET
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

// Borra todo y re-inserta los defaults (preserva bloques custom)
export async function resetToDefaultBlocks() {
  // Borrar solo los bloques no-custom (isDeletable: false con key conocido)
  const defaultKeys = DEFAULT_PROMPT_BLOCKS.map(b => b.key);
  await prisma.promptBlock.deleteMany({ where: { key: { in: defaultKeys } } });

  await prisma.promptBlock.createMany({
    data: DEFAULT_PROMPT_BLOCKS,
    skipDuplicates: true,
  });

  revalidatePath('/admin');
  return { reset: true };
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
  previouslyRewarded?: string[];
}) {
  const { agentConfig, clientName, projectName, metadata, scoringText, leadScoringEnabled, previouslyRewarded } = params;

  await ensureBlocksExist();
  const blocks = await prisma.promptBlock.findMany({
    where: { isEnabled: true },
    orderBy: { order: 'asc' },
  });

  const parts: string[] = [];

  for (const block of blocks) {
    let content = '';

    if (block.source === 'runtime') {
      content = buildRuntimeBlock(block.key, { clientName, projectName, metadata, scoringText, leadScoringEnabled, previouslyRewarded });
      if (!content) continue;
    } else if (block.source === 'agent') {
      const fieldValue = block.agentField ? agentConfig?.[block.agentField] : null;
      content = fieldValue || block.content;
    } else {
      content = block.content;
    }

    if (!content?.trim()) continue;

    parts.push(`<${block.xmlTag}>\n${content}\n</${block.xmlTag}>`);
  }

  return parts.join('\n\n');
}

function buildRuntimeBlock(key: string, ctx: any): string {
  switch (key) {
    case 'client_context': {
      let out = `Nombre del cliente: ${ctx.clientName}\nProyecto Interesado: ${ctx.projectName}`;
      if (ctx.metadata) {
        out += `\n\nInformación previa del CRM (campañas, intereses, etc.):\n${JSON.stringify(ctx.metadata, null, 2)}\nREGLA: Usa esta info para personalizar tu respuesta y no preguntar datos que ya tienes.`;
      }
      return out;
    }

    case 'client_scoring': {
      if (!ctx.leadScoringEnabled) return '';
      let text = `Reglas de calificación de interés del lead (definidas por el negocio):\n${ctx.scoringText || 'No hay reglas de calificación configuradas.'}`;
      if (ctx.previouslyRewarded && ctx.previouslyRewarded.length > 0) {
        text += `\n\n[IMPORTANTE: REGLAS YA PREMIADAS EN ESTA CONVERSACIÓN - NO VOLVER A PREMIAR ESTAS MISMAS RAZONES]:\n- ` + ctx.previouslyRewarded.join('\n- ');
      }
      return text;
    }

    // Legacy keys por compatibilidad
    case 'heatmap_scoring':
      if (!ctx.leadScoringEnabled) return '';
      return `Reglas de calificación de interés del lead:\n${ctx.scoringText || 'No hay reglas de calificación configuradas.'}`;

    case 'crm_metadata':
      if (!ctx.metadata) return '';
      return `Información previa del CRM:\n${JSON.stringify(ctx.metadata, null, 2)}`;

    default:
      return '';
  }
}

async function ensureBlocksExist() {
  const count = await prisma.promptBlock.count();
  if (count === 0) await seedPromptBlocks();
}
