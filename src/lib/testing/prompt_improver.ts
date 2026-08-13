import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function suggestPromptImprovements(
  testResults: any[],
  currentPrompt: string
) {
  // Extract all critical issues from the test results
  const allIssues: any[] = [];
  
  testResults.forEach(r => {
    if (r.evaluation && r.evaluation.critical_issues) {
      r.evaluation.critical_issues.forEach((issue: any) => {
        allIssues.push({
          issue: issue.issue,
          severity: issue.severity,
          profile: r.conversation.profile,
          intent: r.conversation.intent
        });
      });
    }
  });

  if (allIssues.length === 0) {
    return {
      summary: "No se encontraron problemas críticos. El prompt parece funcionar bien.",
      suggested_changes: [],
      new_full_prompt: currentPrompt
    };
  }

  const improverPrompt = `
Sos un experto en prompt engineering para bots conversacionales.
Te paso:
1. El prompt ACTUAL del bot (que es el contexto del sistema).
2. Los problemas críticos detectados en un testing automatizado con clientes simulados.

Tu tarea: proponer cambios CONCRETOS al prompt para resolver los problemas y mejorar el comportamiento del bot.

Reglas:
- Sé específico: en vez de "mejorar el tono", decí "agregar al final del prompt: 'Usá tono cercano pero profesional, nunca uses jerga corporativa'"
- Priorizá cambios por severidad de los problemas que resuelven (high, medium).
- NO reescribas todo el prompt si no es necesario, mantené la estructura original.
- Cada cambio sugerido debe ser INCREMENTAL y lógico.
- Si el prompt actual ya cubre algo pero el bot no lo cumple, sugerí REFORZAR esa sección (ej: "IMPORTANTE: NUNCA INVENTES PRECIOS").
- Generá el prompt completo resultante incluyendo tus mejoras.

Formato de respuesta (JSON estricto):
{
  "summary": "<análisis general en 2-3 oraciones>",
  "suggested_changes": [
    {
      "priority": "high|medium|low",
      "problem_addressed": "<qué problema resuelve>",
      "change_type": "add|modify|remove|reinforce",
      "specific_text_to_add": "<texto exacto sugerido>",
      "expected_improvement": "<qué métrica/criterio debería mejorar>"
    }
  ],
  "new_full_prompt": "<el prompt completo con todos los cambios aplicados>"
}
`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.CLAUDE_MAIN,
      max_tokens: 3000,
      system: improverPrompt,
      messages: [{
        role: "user",
        content: `
Prompt actual del bot:
---
${currentPrompt}
---

Problemas críticos detectados (JSON):
${JSON.stringify(allIssues, null, 2)}

Por favor, analizá y devolvé el JSON con tus sugerencias.`
      }]
    });

    const textBlock = response.content.find((block: any) => block.type === 'text');
    let responseText = (textBlock as any)?.text || "";
    
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0];
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0];
    }

    const firstBrace = responseText.indexOf("{");
    const lastBrace = responseText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Error suggesting prompt improvements con Claude, intentando fallback con Gemini:", error);
    try {
      if (process.env.GEMINI_API_KEY) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: AI_MODELS.GEMINI_FALLBACK,
          systemInstruction: improverPrompt
        });
        const result = await model.generateContent(`Prompt actual del bot:
---
${currentPrompt}
---

Problemas críticos detectados (JSON):
${JSON.stringify(allIssues, null, 2)}

Por favor, analizá y devolvé el JSON con tus sugerencias.`);
        let responseText = result.response.text();
        if (responseText.includes("```json")) {
          responseText = responseText.split("```json")[1].split("```")[0];
        } else if (responseText.includes("```")) {
          responseText = responseText.split("```")[1].split("```")[0];
        }
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          responseText = responseText.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(responseText.trim());
      }
    } catch (geminiError) {
      console.error("Error suggesting prompt improvements con Gemini Fallback:", geminiError);
    }
    return {
      summary: "Error generando sugerencias de mejora.",
      suggested_changes: [],
      new_full_prompt: currentPrompt
    };
  }
}
