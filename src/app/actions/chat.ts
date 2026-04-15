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
  agentId?: string,
  metadata?: any
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

<crm_metadata>
Aquí tienes información previa que ya conocemos del cliente (datos de campañas o CRM):
${metadata ? JSON.stringify(metadata, null, 2) : "No hay información previa."}

REGLA DE CONTEXTO: Usa esta información para personalizar tu respuesta y evitar preguntar datos que ya aparecen aquí. Por ejemplo, si el cliente ya indicó su interés o presupuesto, hazle saber que ya lo sabes (ej: "He visto que te interesan x habitaciones...").
</crm_metadata>

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

INSTRUCCIONES DE MARCADO:
- En CADA respuesta, analiza si el cliente ha cumplido alguna de estas condiciones (revisa el historial para ver si ya se premió o no).
- Si detectas que se ha cumplido una condición que AÚN NO ha sido premiada en el chat, agrega esta etiqueta exacta al final de tu respuesta:
  [ACTION: SCORE_BUMP +X REASON: "Escribe aquí la razón corta"]
- Puedes agregar MÚLTIPLES etiquetas si se cumplen varias condiciones simultáneamente.
- Importante: Solo premia cada regla UNA VEZ en toda la conversación. Si ya viste un tag de esa regla en el historial, no lo repitas. 

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

    // Check for Score Bumps (Multiplex y con razones)
    let scoreBump = 0;
    let scoreReason = "";
    
    // Regex para capturar [ACTION: SCORE_BUMP +10 REASON: "Razón"]
    const scoreMatches = Array.from(rawReply.matchAll(/\[ACTION: SCORE_BUMP ([+-]?\d+)(?:\s+REASON:\s*"([^"]+)")?\]/gi));
    
    if (scoreMatches.length > 0) {
      const reasons: string[] = [];
      scoreMatches.forEach(match => {
        scoreBump += parseInt(match[1]);
        if (match[2]) reasons.push(match[2]);
      });
      scoreReason = reasons.join("; ");
      console.log(`Heatmap Score Detectado: +${scoreBump} (${scoreReason})`);
    }

    return { 
      reply, 
      isHandoff, 
      scoreBump, 
      scoreReason, // Devolvemos la razón
      inputTokens, 
      outputTokens,
      agentName: config.name
    };

  } catch (error: any) {
    console.error("AI Error:", error);
    return { 
      reply: `Error conectando con la IA: ${error.message}`, 
      isHandoff: false, 
      scoreBump: 0, 
      inputTokens: 0, 
      outputTokens: 0,
      agentName: "Error"
    };
  }
}

/**
 * SIMULADOR PERSISTENTE
 * Estas funciones manejan un "Lead" especial de prueba por proyecto
 */

const SIMULATOR_PHONE = "SIMULADOR_TEST";

export async function getSimulatorChat(projectId: string) {
  const lead = await prisma.lead.findFirst({
    where: { projectId, phone: SIMULATOR_PHONE },
    include: {
      chat: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    }
  });

  if (!lead) return { messages: [], score: 0, heat: 'FRIO' };

  return {
    messages: (lead.chat?.messages || []).map(m => ({
      ...m,
      agentName: m.agentName,
      scoreBump: m.scoreBump,
      scoreReason: m.scoreReason
    })),
    score: lead.score,
    heat: lead.heat
  };
}

export async function resetSimulatorChat(projectId: string) {
  const lead = await prisma.lead.findFirst({
    where: { projectId, phone: SIMULATOR_PHONE },
    include: { chat: true }
  });

  if (lead && lead.chat) {
    // Borrar mensajes y resetear score
    await prisma.message.deleteMany({ where: { chatId: lead.chat.id } });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: 0, heat: 'FRIO', status: 'PENDING' }
    });
  }
}

export async function sendSimulatorMessage(
  message: string,
  projectId: string,
  agentId?: string
) {
  // 1. Obtener o crear el Lead del Simulador
  let lead = await prisma.lead.findFirst({
    where: { projectId, phone: SIMULATOR_PHONE },
    include: { chat: true }
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        projectId,
        phone: SIMULATOR_PHONE,
        name: "Usuario de Prueba",
        chat: { create: {} }
      },
      include: { chat: true }
    });
  }

  const chatId = lead.chat!.id;

  // 2. Guardar mensaje del usuario
  await prisma.message.create({
    data: {
      chatId,
      role: 'user',
      content: message
    }
  });

  // 3. Obtener historial para la IA
  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    take: 20 // últimos 20 para contexto
  });

  // 4. Llamar a la lógica de IA existente
  const result = await sendTestMessage(
    message,
    history.map(m => ({ role: m.role, content: m.content })),
    "Usuario de Prueba",
    projectId,
    agentId,
    lead.metadata // Pasamos la info previa (habitaciones, presupuesto, etc.)
  );

  // 5. Guardar respuesta de la IA (incluyendo el nombre del agente)
  await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: result.reply,
      agentName: result.agentName, // Guardamos quién respondió
      scoreBump: result.scoreBump > 0 ? result.scoreBump : null, // Solo guardamos si sumó
      scoreReason: result.scoreReason || null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens
    }
  });

  // 6. Actualizar Score si hubo bump
  let updatedScore = lead.score;
  let updatedHeat = lead.heat;

  if (result.scoreBump !== 0) {
    updatedScore = Math.min(100, Math.max(0, lead.score + result.scoreBump));
    updatedHeat = "FRIO";
    if (updatedScore >= 70) updatedHeat = "CALIENTE";
    else if (updatedScore >= 30) updatedHeat = "TIBIO";

    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: updatedScore, heat: updatedHeat }
    });
  }

  return {
    ...result,
    newScore: updatedScore,
    newHeat: updatedHeat
  };
}
