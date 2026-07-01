import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const EVALUATION_CRITERIA = {
  "tone_appropriate": "¿El tono es profesional y encaja con un negocio?",
  "accuracy": "¿La información dada es correcta y NO inventa datos (precios, horarios, links)?",
  "helpfulness": "¿Resuelve la necesidad o duda del usuario directamente?",
  "conciseness": "¿Es claro sin ser excesivamente largo o dar demasiados rodeos?",
  "handoff_correct": "¿Cuando debió pasar a humano (ej. solicitud explícita, enojo, pregunta compleja), lo hizo?",
  "no_hallucination": "¿Se mantuvo dentro de los límites del prompt sin alucinar características?",
  "language_natural": "¿Suena humano o demasiado robótico?",
  "follows_business_rules": "¿Respeta las reglas de negocio (ej. no dar descuentos si no está permitido)?"
};

export async function evaluateConversation(
  executedConversation: any,
  businessInfo: any
) {
  const systemPromptSection = businessInfo.systemPrompt
    ? `\nSISTEMA/PROMPT REAL DEL BOT (fuente de verdad absoluta de lo que el bot puede y no puede decir):\n---\n${businessInfo.systemPrompt.substring(0, 4000)}\n---\n\nREGLA CRÍTICA: Si el bot dice algo que ESTÁ en el sistema prompt de arriba, NO es una alucinación. Solo marqués como alucinación cosas que el bot dice y que claramente NO están respaldadas por el sistema prompt. Cuando tengas duda, NO marques como error.`
    : '';

  const evaluatorPrompt = `
Sos un evaluador experto de bots conversacionales para negocios por WhatsApp.
Tu trabajo es analizar UNA conversación y darle un score riguroso.

Negocio evaluado: ${businessInfo.name}
${systemPromptSection}

Criterios de evaluación (cada uno se puntúa del 1 al 10):
${JSON.stringify(EVALUATION_CRITERIA, null, 2)}

También identificá:
- Problemas críticos (alucinaciones REALES, información que NO está en el sistema prompt del bot, tono inapropiado, ignorar al usuario, fallar handoff).
- Oportunidades de mejora (cosas que podría hacer mejor o más fluidamente).
- Lo que hizo bien (para mantener).

Sé RIGUROSO pero JUSTO. No infles los scores. Un score de 7 es "bueno", 8 es "muy bueno", 9-10 es "excelente".
NO marques como hallucination algo que el bot dijo si eso está en su prompt o knowledge base.
Solo baja puntos en "accuracy" y "no_hallucination" si el bot inventó datos que claramente no tiene de ninguna fuente.

Formato de respuesta (JSON estricto):
{
  "overall_score": 8.5,
  "criteria_scores": {
    "tone_appropriate": 9,
    "accuracy": 10,
    ...
  },
  "critical_issues": [
    { "turn": 2, "issue": "Inventó el precio del producto X que no está en el sistema prompt", "severity": "high" },
    { "turn": 3, "issue": "Mensaje demasiado largo", "severity": "medium" }
  ],
  "improvement_opportunities": [
    "Resumir las descripciones de los productos."
  ],
  "what_was_good": [
    "Saludó rápido y detectó la intención correctamente."
  ],
  "summary": "El bot respondió bien al inicio pero alucinó un precio en el turno 2."
}
`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.CLAUDE_MAIN,
      max_tokens: 2000,
      system: evaluatorPrompt,
      messages: [{
        role: "user",
        content: `Conversación a evaluar:
Perfil del cliente: ${executedConversation.profile}
Intención: ${executedConversation.intent}

Turnos:
${JSON.stringify(executedConversation.turns, null, 2)}

Evaluá rigurosamente en formato JSON.`
      }]
    });

    let responseText = response.content[0].type === 'text' ? response.content[0].text : "";
    
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0];
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0];
    }

    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Error evaluating conversation:", error);
    return {
      overall_score: 0,
      criteria_scores: {},
      critical_issues: [{ turn: 0, issue: "Error en la evaluación de la IA", severity: "high" }],
      improvement_opportunities: [],
      what_was_good: [],
      summary: "Error de evaluación."
    };
  }
}
