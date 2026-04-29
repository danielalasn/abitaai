'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    return { 
      reply: "No se encontró el proyecto. Verifica tu sesión.", 
      isHandoff: false, 
      scoreBump: 0, 
      scoreReason: "",
      inputTokens: 0, 
      outputTokens: 0,
      agentName: "Error",
      debugPrompt: ""
    };
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
    return { 
      reply: "No se ha configurado ningun agente. Por favor entra a Settings y crea un agente primero.", 
      isHandoff: false, 
      scoreBump: 0, 
      scoreReason: "",
      inputTokens: 0, 
      outputTokens: 0,
      agentName: "Error",
      debugPrompt: ""
    };
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

  const systemConfig = await prisma.systemConfig.findUnique({
    where: { id: "default" }
  });

  // Si systemConfig existe, usamos sus valores (aunque estén vacíos).
  // Si no existe el registro en DB, usamos los mínimos necesarios.
  const guardrails = systemConfig?.globalGuardrails ?? GLOBAL_SYSTEM_GUARDRAILS;
  const naming = systemConfig?.namingRules ?? "";
  const business = systemConfig?.businessRules ?? "";
  const pricing = systemConfig?.pricingRules ?? "";
  const handoff = systemConfig?.handoffRules ?? "";
  const visual = systemConfig?.visualRules ?? "";
  const learning = systemConfig?.learningRules ?? "";
  const scoringBase = systemConfig?.scoringBaseRules ?? "";

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
${naming}
</critical_rules_mentioning_names>

<knowledge_base>
${config.knowledgeData || "{}"}
</knowledge_base>

<frequently_asked_questions>
SI EL CLIENTE PREGUNTA ALGO RELACIONADO A ESTAS PREGUNTAS FRECUENTES, CÓPIALES ESTA RESPUESTA TEXTUALMENTE:
${config.faq || "No hay preguntas frecuentes."}
</frequently_asked_questions>

<global_system_guardrails>
${guardrails}
</global_system_guardrails>

<critical_instructions_and_rules>
ESTAS REGLAS DEL NEGOCIO DEBEN SEGUIRSE AL PIE DE LA LETRA BAJO CUALQUIER CIRCUNSTANCIA:
${config.instructions || ""}

<master_business_rules>
${business}
</master_business_rules>

<strict_pricing_rules>
${pricing}
</strict_pricing_rules>

<handoff_instructions>
${handoff}
</handoff_instructions>

<visual_format_rules>
${visual}
PROHIBICIÓN ESTRICTA: NO USES EMOJIS bajo ninguna circunstancia. Tu respuesta debe ser solo texto plano y profesional.
</visual_format_rules>

${project?.leadScoringEnabled ? `
<heatmap_scoring_system>
Tu trabajo en segundo plano también es calificar el interés del cliente ("Heatmap"). Revisa estas reglas dadas por el dueño:
REGLAS DE EVENTOS (Suma 100 en total):
${scoringText}

${scoringBase}
</heatmap_scoring_system>
` : ''}

<learning_system>
${learning}
</learning_system>

<data_collection>
Si el usuario proporciona su correo electrónico, incluye obligatoriamente este comando al final de tu respuesta: [ACTION: UPDATE_EMAIL "correo@ejemplo.com"]
</data_collection>
</critical_instructions_and_rules>

<strict_reminder>
RECUERDA: No uses emojis. Tu tono debe ser profesional y directo.
</strict_reminder>

<language_instruction>
STRICT RULE: Detect the user's language and respond in the SAME language. 
- If the user writes in English, respond in English.
- If the user writes in Spanish, respond in Spanish.
- If the user ASKS to speak in a specific language (e.g., "Can we speak in English?"), you MUST agree enthusiastically (e.g., "Yes, of course!", "¡Claro que sí, con gusto!") and switch to that language immediately.
Maintaining the same language as the customer is your TOP priority.
</language_instruction>
  `;

  console.log("\n" + "=".repeat(60));
  console.log("🚀 [CLAUDE REQUEST DEBUG]");
  console.log("-".repeat(60));
  console.log("SYSTEM PROMPT:");
  console.log(systemPrompt); 
  console.log("-".repeat(60));
  console.log("CONVERSATION HISTORY:");
  history.forEach((h, i) => console.log(`  [${i}] ${h.role.toUpperCase()}: ${h.content.substring(0, 100)}${h.content.length > 100 ? '...' : ''}`));
  console.log("-".repeat(60));
  console.log("USER MESSAGE:");
  console.log(`  ${message}`);
  console.log("=".repeat(60) + "\n");

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

    // Check for Email extraction
    const emailMatch = rawReply.match(/\[ACTION: UPDATE_EMAIL "(.*?)"\]/);
    const extractedEmail = emailMatch ? emailMatch[1].trim() : null;

    return { 
      reply, 
      isHandoff, 
      scoreBump, 
      scoreReason, // Devolvemos la razón
      inputTokens, 
      outputTokens,
      agentName: config.name,
      extractedEmail,
      debugPrompt: systemPrompt
    };

  } catch (error: any) {
    console.error("Claude Error, intentando fallback con Gemini:", error.message || error);
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY no configurado para fallback");
      }
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: systemPrompt 
      });
      
      const geminiHistory = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));
      
      const chat = model.startChat({
        history: geminiHistory,
      });
      
      const result = await chat.sendMessage(message);
      const rawReply = result.response.text();
      
      // Capturar uso de tokens para monitoreo de costos
      const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
      console.log(`[GEMINI TOKENS] Input: ${inputTokens} | Output: ${outputTokens}`);

      // Clean up reply from tags
      const reply = rawReply.replace(/\[ACTION: .+?\]/g, "").trim();
      const isHandoff = rawReply.includes("[ACTION: HANDOFF]");

      let scoreBump = 0;
      let scoreReason = "";
      const scoreMatches = Array.from(rawReply.matchAll(/\[ACTION: SCORE_BUMP ([+-]?\d+)(?:\s+REASON:\s*"([^"]+)")?\]/gi));
      if (scoreMatches.length > 0) {
        const reasons: string[] = [];
        scoreMatches.forEach(match => {
          scoreBump += parseInt(match[1]);
          if (match[2]) reasons.push(match[2]);
        });
        scoreReason = reasons.join("; ");
        console.log(`Heatmap Score Detectado (Gemini): +${scoreBump} (${scoreReason})`);
      }

      const emailMatch = rawReply.match(/\[ACTION: UPDATE_EMAIL "(.*?)"\]/);
      const extractedEmail = emailMatch ? emailMatch[1].trim() : null;

      return { 
        reply, 
        isHandoff, 
        scoreBump, 
        scoreReason,
        inputTokens, 
        outputTokens,
        agentName: config.name + " (Gemini)",
        extractedEmail,
        debugPrompt: systemPrompt
      };

    } catch (geminiError: any) {
      console.error("Gemini Fallback Error:", geminiError);
      return { 
        reply: null, // No enviar nada al cliente
        isHandoff: false, 
        scoreBump: 0, 
        scoreReason: "AI_ERROR",
        inputTokens: 0, 
        outputTokens: 0,
        agentName: "Error",
        debugPrompt: ""
      };
    }
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

  if (lead && lead.channel !== "simulator") {
    await prisma.lead.update({ where: { id: lead.id }, data: { channel: "simulator" } });
    if (lead.chat) await prisma.chat.update({ where: { id: lead.chat.id }, data: { channel: "simulator" } });
  }

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        projectId,
        phone: SIMULATOR_PHONE,
        name: "Usuario de Prueba",
        channel: "simulator",
        chat: { create: { channel: "simulator" } }
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

  // 5. Guardar respuesta de la IA (solo si no hubo error)
  if (result.reply) {
    await prisma.message.create({
      data: {
        chatId,
        role: 'assistant',
        content: result.reply,
        agentName: result.agentName, 
        scoreBump: result.scoreBump > 0 ? result.scoreBump : null,
        scoreReason: result.scoreReason || null,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      }
    });
  } else {
    // Desactivar bot si falla la IA
    await prisma.chat.update({
      where: { id: chatId },
      data: { botActive: false }
    });
  }

  // 6. Actualizar Score si hubo bump o email
  let updatedScore = lead.score;
  let updatedHeat = lead.heat;
  let updatedEmail = lead.email;

  if (result.scoreBump !== 0 || (result.extractedEmail && lead.email !== result.extractedEmail)) {
    updatedScore = Math.min(100, Math.max(0, lead.score + result.scoreBump));
    updatedHeat = "FRIO";
    if (updatedScore >= 70) updatedHeat = "CALIENTE";
    else if (updatedScore >= 30) updatedHeat = "TIBIO";
    
    updatedEmail = result.extractedEmail || lead.email;

    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: updatedScore, heat: updatedHeat, email: updatedEmail }
    });
  }

  return {
    ...result,
    newScore: updatedScore,
    newHeat: updatedHeat
  };
}
