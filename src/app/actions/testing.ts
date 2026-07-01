'use server';

import { prisma } from '@/lib/prisma';
import { generateTestSuite } from '@/lib/testing/conversation_generator';
import { runConversationWithBot } from '@/lib/testing/executor';
import { evaluateConversation } from '@/lib/testing/evaluator';
import { suggestPromptImprovements } from '@/lib/testing/prompt_improver';
import { buildSystemPrompt } from '@/app/actions/prompt-builder';

// Helper function to run the simulation in the background
async function runTestSimulationBackground(
  testSuiteId: string,
  projectId: string,
  projectName: string,
  numConversations: number
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { agents: true }
    });

    if (!project) throw new Error("Project not found");

    // 2. Generar conversaciones
    await prisma.botTestSuite.update({
      where: { id: testSuiteId },
      data: { progress: 'Generando conversaciones simuladas...' }
    });
    const suite = await generateTestSuite(projectId, { name: projectName }, numConversations);

    // Construir el prompt real del agente UNA VEZ para usarlo como fuente de verdad en la evaluación
    const agentConfig = project.agents?.[0];
    let systemPrompt = "";
    if (agentConfig) {
      systemPrompt = await buildSystemPrompt({
        agentConfig,
        clientName: "Cliente Simulado",
        projectName: project.name,
        metadata: null,
        scoringText: "",
        leadScoringEnabled: false,
        previouslyRewarded: []
      });
    }

    const results = [];
    let totalScore = 0;
    let criticalIssuesCount = 0;

    // 3. Ejecutarlas contra el bot y evaluarlas
    for (let idx = 0; idx < suite.length; idx++) {
      const conversation = suite[idx];
      
      // Actualizar progreso
      await prisma.botTestSuite.update({
        where: { id: testSuiteId },
        data: { progress: `Corriendo y evaluando conversación ${idx + 1} de ${numConversations}...` }
      });

      // 3.1 Ejecutar
      const executed = await runConversationWithBot(projectId, conversation);
      
      // 3.2 Evaluar — le pasamos el system prompt real como fuente de verdad
      const evaluation = await evaluateConversation(executed, { name: projectName, systemPrompt });
      
      results.push({
        conversation: executed,
        evaluation: evaluation
      });

      totalScore += (evaluation.overall_score || 0);
      criticalIssuesCount += (evaluation.critical_issues?.length || 0);
    }

    const averageScore = totalScore / (results.length || 1);

    // 4. Mejorar el Prompt (si aplica)
    await prisma.botTestSuite.update({
      where: { id: testSuiteId },
      data: { progress: 'Generando sugerencias de mejora al prompt...' }
    });
    
    let suggestedImprovements = null;
    if (systemPrompt) {
      suggestedImprovements = await suggestPromptImprovements(results, systemPrompt);
    }

    // 5. Guardar resultados
    await prisma.botTestSuite.update({
      where: { id: testSuiteId },
      data: {
        status: 'COMPLETED',
        progress: 'Completado',
        averageScore: averageScore,
        criticalIssues: criticalIssuesCount,
        resultsRaw: JSON.stringify(results, null, 2),
        suggestedPrompt: suggestedImprovements ? JSON.stringify(suggestedImprovements, null, 2) : null
      }
    });

  } catch (error: any) {
    console.error("Error in background test simulation:", error);
    await prisma.botTestSuite.update({
      where: { id: testSuiteId },
      data: { 
        status: 'FAILED',
        progress: `Error: ${error.message}`
      }
    });
  }
}

export async function runTestSimulation(projectId: string, numConversations: number = 3) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) throw new Error("Project not found");

    // 1. Crear el registro de la suite
    const testSuite = await prisma.botTestSuite.create({
      data: {
        projectId,
        totalConversations: numConversations,
        status: 'RUNNING',
        progress: 'Iniciando simulación...'
      }
    });

    // Disparar en background y resolver inmediatamente
    runTestSimulationBackground(testSuite.id, projectId, project.name, numConversations);

    return { 
      success: true, 
      suiteId: testSuite.id
    };

  } catch (error: any) {
    console.error("Error initiating test simulation:", error);
    return { success: false, error: error.message };
  }
}

export async function getTestSuiteStatus(suiteId: string) {
  try {
    const suite = await prisma.botTestSuite.findUnique({
      where: { id: suiteId },
      select: {
        id: true,
        status: true,
        progress: true
      }
    });
    return { success: true, suite };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTestSuiteResults(suiteId: string) {
  try {
    const suite = await prisma.botTestSuite.findUnique({
      where: { id: suiteId }
    });

    if (!suite) throw new Error("Suite not found");

    const results = suite.resultsRaw ? JSON.parse(suite.resultsRaw) : [];
    const suggestedImprovements = suite.suggestedPrompt ? JSON.parse(suite.suggestedPrompt) : null;

    return {
      success: true,
      results,
      averageScore: suite.averageScore,
      criticalIssues: suite.criticalIssues,
      suggestedImprovements
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTestSuites(projectId: string) {
  return await prisma.botTestSuite.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
}
