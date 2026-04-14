'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { GLOBAL_SYSTEM_GUARDRAILS } from '@/lib/guardrails';
import { getCurrentProject } from '@/lib/auth-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function sendTestMessage(
  message: string, 
  history: { role: string, content: string }[], 
  clientName?: string,
  projectId?: string,
  agentId?: string
) {
  // Get project
  let project = null;
  
  if (projectId) {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { agents: true }
    });
  } else {
    project = await getCurrentProject();
  }

  if (!project) {
    return "No se encontró el proyecto. Verifica tu sesión.";
  }

  // Find the right agent
  let config = null;
  if (agentId) {
    config = project.agents?.find((a: any) => a.id === agentId && a.isActive);
  }
  if (!config) {
    config = project.agents?.find((a: any) => a.isActive);
  }

  if (!config) {
    return "No se ha configurado ningun agente. Por favor entra a Settings y crea un agente primero.";
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
1. DETECCIÓN DE INTENCIÓN: Si el cliente solicita hablar con una persona, asesor, agente, o humano por PRIMERA vez:
   - NO actives la transferencia de inmediato.
   - PREGUNTA obligatoriamente: "¿Te gustaría que te transfiera con un asesor humano para que te ayude personalmente?"
2. DETECCIÓN DE CONFIRMACIÓN (¡CRÍTICO — LEE ESTO CON MÁXIMA PRIORIDAD!):
   Revisa TODO el historial de conversación. Si en CUALQUIER turno anterior TÚ (assistant) ya hiciste la pregunta de transferencia (mencionaste "asesor", "transferir", "humano", "persona real"):
   - Y el cliente responde CUALQUIER cosa afirmativa (ej: "Sí", "Dale", "Por favor", "Ok", "Bueno", "Quiero", "Claro", "Ya", "Pues sí", incluso un simple "sí"):
   - DEBES activar la transferencia DE INMEDIATO incluyendo la etiqueta [ACTION: HANDOFF] al final de tu respuesta.
   - Di algo como: "Perfecto, te estoy transfiriendo ahora mismo con un asesor especialista. Un momento por favor."
   - TIENES PROHIBIDO volver a preguntar "¿quieres que te transfiera?" si ya lo preguntaste antes. Eso irrita al cliente.
3. ANTI-REPETICIÓN (¡IMPORTANTÍSIMO!): Revisa el historial. Si ya ofreciste la transferencia en algún mensaje previo, NO vuelvas a ofrecer la transferencia. Si el cliente continúa chateando sin confirmar, simplemente sigue ayudándole normalmente.
4. CIERRE NATURAL: Si el flujo llega a un punto donde prometes contacto humano (ej: "Un asesor te contactará"), DEBES incluir [ACTION: HANDOFF] al final.
REGLA DE ORO: Si prometes que alguien lo atenderá o confirmas la transferencia, la etiqueta [ACTION: HANDOFF] es OBLIGATORIA. NUNCA preguntes dos veces si quiere la transferencia.

REGLA DE FORMATO VISUAL (¡MANDATORIA!): 
- NUNCA uses doble asteriscos (**texto**) para negritas. WhatsApp NO los reconoce.
- USA SIEMPRE un solo asterisco (*texto*) para poner palabras en negrita.

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
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    // Capturar uso de tokens para monitoreo de costos
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    console.log(`[TOKENS] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);

    const rawReply = response.content[0].type === 'text' ? response.content[0].text : "No hubo respuesta de texto";
    
    // Clean up reply from tags early so we can store it
    const reply = rawReply.replace(/\[ACTION: .+?\]/g, "").trim();

    // Check if the AI generated the handoff tag
    const isHandoff = rawReply.includes("[ACTION: HANDOFF]");
    
    // Check for Unanswered Questions
    const unansweredMatch = rawReply.match(/\[ACTION: UNANSWERED_QUESTION "(.*?)"\]/);
    if (unansweredMatch && unansweredMatch[1]) {
      const question = unansweredMatch[1].trim();
      
      // Deduplicación: Revisar si la misma pregunta ya se guardó hace poco
      const existing = await prisma.unansweredQuestion.findFirst({
        where: {
          projectId: project.id,
          question: question,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // últimos 5 minutos
          }
        }
      });

      if (!existing) {
        console.log(`[DEBUG] Intentando guardar PREGUNTA: "${question}" con RESPUESTA: "${reply}"`);
        await prisma.unansweredQuestion.create({
          data: {
            projectId: project.id,
            agentId: config.id,
            question: question,
            botAnswer: reply || rawReply
          }
        });
        console.log(`[DEBUG] Guardado exitoso en DB.`);
      }
    }

    // Check for Score Bumps
    let scoreBump = 0;
    const scoreMatch = rawReply.match(/\[ACTION: SCORE_BUMP ([+-]?\d+)\]/);
    if (scoreMatch && scoreMatch[1]) {
      scoreBump = parseInt(scoreMatch[1]);
      console.log(`Heatmap Score Detectado: ${scoreBump}`);
    }

    return { reply, isHandoff, scoreBump, inputTokens, outputTokens };

  } catch (error: any) {
    console.error("AI Error:", error);
    return { reply: `Error conectando con la IA: ${error.message}`, isHandoff: false, scoreBump: 0, inputTokens: 0, outputTokens: 0 };
  }
}
