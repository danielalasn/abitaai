// Migration Script: BotConfig -> Agent
// This script copies all data from BotConfig to the new Agent model
// and moves WhatsApp credentials to the Project level.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migración Multi-Agente...\n');

  // 1. Get all existing BotConfigs
  const botConfigs = await prisma.botConfig.findMany();
  console.log(`📦 Encontrados ${botConfigs.length} BotConfig(s) para migrar.\n`);

  for (const config of botConfigs) {
    console.log(`--- Migrando proyecto: ${config.projectId} ---`);

    // 2. Move WhatsApp credentials to the Project
    if (config.whatsappToken || config.whatsappPhoneId || config.whatsappBusinessId) {
      await prisma.project.update({
        where: { id: config.projectId },
        data: {
          whatsappToken: config.whatsappToken,
          whatsappPhoneId: config.whatsappPhoneId,
          whatsappBusinessId: config.whatsappBusinessId,
        },
      });
      console.log('  ✅ Credenciales de WhatsApp movidas al Proyecto.');
    }

    // 3. Create Agent with the same intelligence data
    const agent = await prisma.agent.create({
      data: {
        projectId: config.projectId,
        name: 'Agente Principal',
        description: 'Agente migrado automáticamente desde la configuración original.',
        isActive: true,
        identity: config.identity,
        instructions: config.instructions,
        knowledgeData: config.knowledgeData,
        knowledgeRaw: config.knowledgeRaw,
        faq: config.faq,
        leadScoringRules: config.leadScoringRules,
      },
    });
    console.log(`  ✅ Agente "${agent.name}" creado (ID: ${agent.id}).`);

    // 4. Assign this agent to all existing leads of this project
    const leadsUpdated = await prisma.lead.updateMany({
      where: { projectId: config.projectId },
      data: { agentId: agent.id },
    });
    console.log(`  ✅ ${leadsUpdated.count} lead(s) asignados al agente.`);

    // 5. Assign this agent to all existing campaigns
    const campaignsUpdated = await prisma.campaign.updateMany({
      where: { projectId: config.projectId },
      data: { agentId: agent.id },
    });
    console.log(`  ✅ ${campaignsUpdated.count} campaña(s) asignadas al agente.`);

    // 6. Assign this agent to all unanswered questions
    const questionsUpdated = await prisma.unansweredQuestion.updateMany({
      where: { projectId: config.projectId },
      data: { agentId: agent.id },
    });
    console.log(`  ✅ ${questionsUpdated.count} pregunta(s) sin contestar asignadas al agente.\n`);
  }

  console.log('🎉 ¡Migración completada con éxito!');
  console.log('📌 Nota: La tabla BotConfig aún existe. Puedes eliminarla del schema cuando estés listo.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
