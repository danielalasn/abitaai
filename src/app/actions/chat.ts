'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { GLOBAL_SYSTEM_GUARDRAILS } from '@/lib/guardrails';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function sendTestMessage(message: string, history: { role: string, content: string }[], clientName?: string) {
  // Get the default configuration
  const project = await prisma.project.findFirst({
    include: { botConfig: true },
  });

  const config = project?.botConfig;

  if (!config) {
    return "No se ha configurado el bot. Por favor entra a Settings y guarda la configuración primero.";
  }

  let scoringText = "No hay reglas de calificación definidas.";
  try {
    if (config.leadScoringRules) {
      const rules = JSON.parse(config.leadScoringRules);
      if (Array.isArray(rules) && rules.length > 0) {
        scoringText = rules.map((r: any) => `- Si el cliente: "${r.condition}" -> Otorga este puntaje exacto: +${r.score}`).join("\n");
      }
    }
  } catch (e) {
    // Falls back gracefully if JSON is invalid
  }

  const isRealName = clientName && !clientName.startsWith('+');
  const finalName = isRealName ? clientName : "Desconocido";

  // Create the system prompt
  const systemPrompt = `
<identity>
${config.identity || "Eres un asistente virtual"}
</identity>

<client_context>
Nombre: ${finalName}
Proyecto Interesado: ${project?.name || "Demo Test"}
</client_context>

<critical_rules_mentioning_names>
- Si el Nombre es "Desconocido", NO intentes adivinarlo ni uses el número de teléfono para saludar. Limítate a decir "Hola" o "Hola, bienvenido".
- Si el Nombre es un nombre real, puedes usarlo para personalizar el saludo.
</critical_rules_mentioning_names>

<knowledge_base>
${config.knowledgeData || "{}"}
</knowledge_base>

<frequently_asked_questions>
SI EL CLIENTE PREGUNTA ALGO RELACIONADO A ESTAS PREGUNTAS FRECUENTES, CÓPIALES ESTA RESPUESTA TEXTUALMENTE:
${config.faq || "No hay preguntas frecuentes."}
</frequently_asked_questions>

${GLOBAL_SYSTEM_GUARDRAILS}

<critical_instructions_and_rules>
ESTAS REGLAS DEL NEGOCIO DEBEN SEGUIRSE AL PIE DE LA LETRA BAJO CUALQUIER CIRCUNSTANCIA:
${config.instructions || ""}

REGLA DE ORO DE NEGOCIO: Si la información no está en la KNOWLEDGE BASE, di que es un detalle técnico y ofrece pasarle el chat a un asesor. NUNCA inventes precios ni datos.
¡VERIFICA LAS REGLAS DE NEGOCIO ANTES DE MOSTRAR PRECIOS O DATOS AL CLIENTE!

REGLA DE PROHIBICIÓN DE OFERTAS (CRÍTICA): TIENES PROHIBIDO ofrecer explicar procesos, opciones de crédito, o cualquier detalle (como el "proceso de compra", "cronograma de pagos", etc.) si NO están explícitamente detallados en la KNOWLEDGE BASE. Solo ofrece lo que puedes cumplir con datos reales en el siguiente paso.

REGLA ESTRICTA DE PRECIOS Y MODELOS (¡IMPORTANTE!):
A menos que el cliente haya preguntado EXPRESAMENTE por "precios", "costos", "cuánto vale", o "modelos":
1. TIENES PROHIBIDO listar todos los modelos de habitaciones y sus precios de golpe en tu primera respuesta.
2. Si piden "más información", limítate a mencionar la ubicación y las amenidades principales, y pregunta qué tipo de espacio buscan (estudio, suite, etc) ANTES de dar cualquier número.

INSTRUCCIÓN ESPECIAL DE TRANSFERENCIA A HUMANO:
1. DETECCIÓN: Si el cliente solicita hablar con una persona, asesor, agente, o humano (ej: "asesor", "quiero hablar con alguien"), NO actives la transferencia de inmediato.
2. PREGUNTA: Tu primera respuesta debe ser ofrecer la ayuda amablemente: "¿Te gustaría que te transfiera con un asesor humano para que te ayude personalmente?".
3. ACTIVACIÓN: DEBES incluir al final del mensaje la etiqueta exacta [ACTION: HANDOFF] en estos dos casos:
   a) Si el cliente responde afirmativamente (ej: "Sí", "Por favor", "claro") a tu pregunta de transferencia.
   b) Si el flujo de la conversación llega a un cierre natural donde prometes que un asesor contactará al cliente (ej: "Te contacto con un asesor para que veas la propiedad").
4. REGLA DE ORO: NUNCA menciones que "un asesor te contactará" sin poner [ACTION: HANDOFF] al final. Si lo prometes, debes activarlo.

SISTEMA DE CALIFICACIÓN (HEATMAP SCORE):
Tu trabajo en segundo plano también es calificar el interés del cliente ("Heatmap"). Revisa estas reglas dadas por el dueño:
REGLAS DE EVENTOS (Suma 100 en total):
${scoringText}

Si en el ÚLTIMO mensaje del cliente has detectado que acaba de cumplir una de estas condiciones POR PRIMERA VEZ, agrega esta etiqueta exacta al final de tu respuesta (reemplazando X por el número indicado en la regla):
Ejemplo: [ACTION: SCORE_BUMP +20]
(Importante: NO premies dos veces por la misma cosa. Solo envía la etiqueta si el hito de interés se acaba de cumplir en este exacto turno).

SISTEMA DE APRENDIZAJE:
Si el cliente te hace una pregunta que NO está contestada en las FAQs ni en la Knowledge Base, DEBES ser honesto, decirle amablemente que no tienes esa información a la mano, y agregar EXACTAMENTE esta etiqueta al final de tu mensaje:
[ACTION: UNANSWERED_QUESTION "Aquí pones la pregunta exacta que hizo el cliente"]
Esto nos ayudará a aprender y entrenarte para el futuro.
</critical_instructions_and_rules>
  `;

  try {
    // We filter history down to what anthropic expects: assistant and user
    // The previous python script used plain lists or tuples, the SDK accepts arrays of objects.
    const messages = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })) as Anthropic.MessageParam[];

    messages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const rawReply = response.content[0].type === 'text' ? response.content[0].text : "No hubo respuesta de texto";

    // Check if the AI generated the handoff tag
    const isHandoff = rawReply.includes("[ACTION: HANDOFF]");
    
    // Check for Unanswered Questions
    const unansweredMatch = rawReply.match(/\[ACTION: UNANSWERED_QUESTION "(.*?)"\]/);
    if (unansweredMatch && unansweredMatch[1]) {
      const question = unansweredMatch[1].trim();
      
      // Deduplicación: Revisar si la misma pregunta ya se guardó hace poco (evitar duplicados por re-renders o IA doble tag)
      const existing = await prisma.unansweredQuestion.findFirst({
        where: {
          projectId: config.projectId,
          question: question,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // últimos 5 minutos
          }
        }
      });

      if (!existing) {
        await prisma.unansweredQuestion.create({
          data: {
            projectId: config.projectId,
            question: question
          }
        });
        console.log(`Guardada pregunta sin respuesta: ${question}`);
      }
    }

    // Check for Score Bumps
    let scoreBump = 0;
    const scoreMatch = rawReply.match(/\[ACTION: SCORE_BUMP ([+-]?\d+)\]/);
    if (scoreMatch && scoreMatch[1]) {
      scoreBump = parseInt(scoreMatch[1]);
      console.log(`Heatmap Score Detectado: ${scoreBump}`);
    }

    const reply = rawReply.replace(/\[ACTION: .+?\]/g, "").trim();

    return { reply, isHandoff, scoreBump };

  } catch (error: any) {
    console.error("AI Error:", error);
    return { reply: `Error conectando con la IA: ${error.message}`, isHandoff: false, scoreBump: 0 };
  }
}
