'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCurrentProject } from '@/lib/auth-server';
import { redactPII } from '@/lib/pii';
import { buildSystemPrompt } from '@/app/actions/prompt-builder';
import { AI_MODELS } from '@/lib/models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function sendTestMessage(
  message: string,
  history: { role: string, content: string, scoreReason?: string | null }[],
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
      include: { 
        agents: true,
        calendarConfig: true,
        nangoConnections: { where: { providerConfigKey: 'google-calendar', status: 'CONNECTED' } }
      }
    });
  } else {
    const sessionProj = await getCurrentProject();
    if (sessionProj) {
      project = await prisma.project.findUnique({
        where: { id: sessionProj.id },
        include: { 
          agents: true,
          calendarConfig: true,
          nangoConnections: { where: { providerConfigKey: 'google-calendar', status: 'CONNECTED' } }
        }
      });
    }
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

  let scoringText = 'No hay reglas de calificación definidas.';
  try {
    if (config.leadScoringRules) {
      const rules = JSON.parse(config.leadScoringRules);
      if (Array.isArray(rules) && rules.length > 0) {
        scoringText = rules.map((r: any) => `- Si el cliente: "${r.condition}" -> Otorga este puntaje exacto: +${r.score}`).join('\n');
      }
    }
  } catch (e) {
    // Falls back gracefully if JSON is invalid
  }

  const isRealName = clientName && !clientName.startsWith('+');
  const finalName = isRealName ? clientName : 'Desconocido';

  // Extraer razones ya premiadas del historial
  const rewardedSet = new Set<string>();
  for (const msg of history) {
    if (msg.scoreReason) {
      msg.scoreReason.split(';').forEach(r => {
        const trimmed = r.trim();
        if (trimmed && trimmed !== 'AI_ERROR') rewardedSet.add(trimmed);
      });
    }
  }
  const previouslyRewarded = Array.from(rewardedSet);

  // Build the system prompt dynamically from PromptBlocks in DB
  const systemPrompt = await buildSystemPrompt({
    agentConfig: config,
    clientName: finalName,
    projectName: project?.name || 'Demo Test',
    metadata: metadata || null,
    scoringText,
    leadScoringEnabled: project?.leadScoringEnabled ?? true,
    previouslyRewarded
  });

  // Append Calendar Instructions if configured
  let calendarInstructions = '';
  const hasCalendar = (project as any)?.nangoConnections && (project as any).nangoConnections.length > 0;
  
  if (hasCalendar) {
    const calConfig = (project as any).calendarConfig || {
      durationMinutes: 60,
      fieldsToCollect: ['nombre_cliente'],
      eventTitle: 'Cita - {{nombre_cliente}}',
      eventDescription: 'Agendado vía IA',
      confirmationMessage: '¡Listo! Su cita ha sido agendada.'
    };
    
    const finalFields = calConfig?.fieldsToCollect?.length > 0 ? calConfig.fieldsToCollect : ['nombre_cliente'];
    const requiredFields = finalFields.join(', ');
    
    // Compute example end time for the prompt
    const exampleEndH = Math.floor((15 * 60 + calConfig.durationMinutes) / 60);
    const exampleEndM = (15 * 60 + calConfig.durationMinutes) % 60;
    const exampleEnd = `${String(exampleEndH).padStart(2, '0')}:${String(exampleEndM).padStart(2, '0')}`;

    calendarInstructions = `
<calendar_tools>
Tienes acceso a Google Calendar para gestionar reservas/citas del cliente.

CUÁNDO USARLO: Solo cuando el cliente solicite explícitamente agendar, consultar disponibilidad, modificar o cancelar una cita/reserva. Para preguntas generales del negocio (precios, ubicación, servicios, etc.) responde normalmente SIN usar ningún ACTION de calendario.

FLUJO OBLIGATORIO:
1. Cliente quiere reservar → usa [ACTION: CHECK_AVAILABILITY] inmediatamente.
2. Disponible → informa y recopila los datos faltantes (ver DATOS REQUERIDOS abajo). NO hagas CREATE_BOOKING aún.
3. Ocupado → informa que está ocupado. Si vas a sugerir otro horario, DEBES verificarlo primero con CHECK_AVAILABILITY antes de mencionarlo.
4. Tienes disponibilidad confirmada + todos los datos → ejecuta [ACTION: CREATE_BOOKING].
5. Cliente quiere modificar/cancelar → el sistema te proveerá sus reservas activas. Identifica la correcta y ejecuta [ACTION: UPDATE_BOOKING] o [ACTION: CANCEL_BOOKING] con el event_id exacto.

REGLAS DE SEGURIDAD:
- NUNCA digas "ya agendé", "ya cancelé" o "ya actualicé" sin haber recibido [SYSTEM DATA] con success:true.
- Solo puedes modificar/cancelar citas del cliente actual. El sistema te lista sus reservas con event_id exacto.
- Si el ACTION falla 2 veces seguidas, usa [ACTION: HANDOFF].
- Si necesitas modificar el calendario Y hacer HANDOFF, completa el ACTION del calendario primero, espera la confirmación, y LUEGO usa HANDOFF.
- VERIFICACIÓN PREVIA: Antes de ejecutar [ACTION: CHECK_AVAILABILITY], comprueba si la fecha u hora cae en un día o rango horario en que el negocio está CERRADO según tus instrucciones/conocimientos. Si está cerrado, NO ejecutes ninguna acción de calendario: responde directamente indicando que está cerrado y sugiere un horario de atención válido.
- Respeta los horarios de atención del negocio definidos en tu base de conocimientos. Solo ofrece o verifica slots dentro de ese rango horario.
- Si el cliente dice "mañana", "hoy" o un día de la semana, calcula la fecha ESTRICTAMENTE con la fecha_y_hora_actual del sistema. No uses fechas de conversaciones anteriores.
- Formato de hora: 24h ("3pm" = "15:00", "10am" = "10:00").
- El [ACTION: ...] va SIEMPRE al inicio de tu respuesta y SOLO UNO por mensaje.

CÁLCULO DE TIEMPO OBLIGATORIO:
- Duración por cita: ${calConfig.durationMinutes} minutos.
- 'end' = 'start' + ${calConfig.durationMinutes} minutos. Ejemplo: start="15:00" → end="${exampleEnd}". NUNCA omitas 'end'.

DATOS REQUERIDOS antes de CREATE_BOOKING: [ ${requiredFields} ]
Para CREATE_BOOKING, incluye cada dato recopilado como parámetro en el ACTION tag (ej: nombre_cliente="Daniel" tipo_servicio="Corte"). El sistema los usará para armar el evento en el calendario.
NOTA: Si ya conoces alguno de los datos requeridos (ej. por el historial o contexto), úsalo directamente sin volver a preguntarlo.

ACTIONS DISPONIBLES:
[ACTION: CHECK_AVAILABILITY date="YYYY-MM-DD" start="HH:MM" end="HH:MM"]
[ACTION: CREATE_BOOKING date="YYYY-MM-DD" start="HH:MM" end="HH:MM" VARIABLE_1="valor" VARIABLE_2="valor"]
[ACTION: UPDATE_BOOKING event_id="REAL_EVENT_ID" date="YYYY-MM-DD" start="HH:MM" end="HH:MM"]
[ACTION: CANCEL_BOOKING event_id="REAL_EVENT_ID"]
[ACTION: HANDOFF]

NOTA: Para UPDATE_BOOKING y CANCEL_BOOKING usa siempre el event_id EXACTO de la lista de reservas del cliente. NUNCA inventes un event_id.
</calendar_tools>
`;
  }
  
  const finalSystemPrompt = systemPrompt + (calendarInstructions ? '\n\n' + calendarInstructions : '');

  // Logs eliminados para limpiar consola
  console.log(`🚀 [AI REQUEST] Lead: ${finalName} | Proyecto: ${project?.name} | Calendar Active: ${!!hasCalendar}`);

  try {
    // We filter history down to what anthropic expects: assistant and user
    const messages = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: redactPII(h.content),
    })) as Anthropic.MessageParam[];

    messages.push({ role: 'user', content: redactPII(message) });

    let rawReply = '';
    let loopCount = 0;
    const maxLoops = 3;
    let currentInputTokens = 0;
    let currentOutputTokens = 0;

    // --- Inject active bookings for this phone into the system prompt (so AI knows what to update/cancel) ---
    let finalSystemPromptWithBookings = finalSystemPrompt;
    if (hasCalendar && metadata?.phone && metadata.phone !== 'unknown') {
      const activeBookings = await prisma.userBooking.findMany({
        where: { phone: metadata.phone, projectId: project.id },
        orderBy: { date: 'asc' },
        take: 10
      });
      if (activeBookings.length > 0) {
        const bookingList = activeBookings.map((b: any) =>
          `- event_id: "${b.eventId}" | Fecha: ${b.date} | Inicio: ${b.startTime} | Fin: ${b.endTime} | Título: ${b.title}`
        ).join('\n');
        finalSystemPromptWithBookings += `\n\n<reservas_activas_cliente>\nEl cliente tiene las siguientes reservas activas en el sistema:\n${bookingList}\nUsa el event_id exacto para UPDATE_BOOKING o CANCEL_BOOKING.\n</reservas_activas_cliente>`;
      }
    }

    // Agentic Loop para Calendar Actions
    while (loopCount < maxLoops) {
      loopCount++;
      const response = await anthropic.messages.create({
        model: AI_MODELS.CLAUDE_MAIN,
        max_tokens: 1024,
        system: finalSystemPromptWithBookings,
        messages: messages,
      });

      currentInputTokens += response.usage?.input_tokens || 0;
      currentOutputTokens += response.usage?.output_tokens || 0;

      rawReply = response.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      
      // Solo entrar al loop de acciones si hay calendario Y hay un ACTION tag
      if (!hasCalendar || !rawReply.includes('[ACTION: ')) {
        break;
      }

      // Procesar Calendar Actions
      let actionFound = false;
      let systemData = '';

      if (rawReply.includes('[ACTION: CHECK_AVAILABILITY')) {
        const match = rawReply.match(/\[ACTION:\s*CHECK_AVAILABILITY\s+date=["']?([^"'\]]+)["']?\s+start=["']?([^"'\]]+)["']?(?:\s+end=["']?([^"'\]]+)["']?)?.*?\]/i);
        if (match) {
          actionFound = true;
          const { checkAvailability } = await import('@/lib/calendar');
          const res = await checkAvailability(project.id, match[1], match[2], match[3] || '');
          systemData = `[SYSTEM DATA: CHECK_AVAILABILITY_RESULT]\n${JSON.stringify(res)}`;
          console.log(`[Agentic Loop] CHECK_AVAILABILITY date=${match[1]} start=${match[2]} end=${match[3]} → ${JSON.stringify(res)}`);
        }
      } 
      else if (rawReply.includes('[ACTION: CREATE_BOOKING')) {
        // Capture date/start/end + ALL extra key=value params dynamically
        const headerMatch = rawReply.match(/\[ACTION:\s*CREATE_BOOKING\s+date=["']?([^"'\]\s]+)["']?\s+start=["']?([^"'\]\s]+)["']?(?:\s+end=["']?([^"'\]\s]+)["']?)?/i);
        if (headerMatch) {
          actionFound = true;
          const [, bookDate, bookStart, bookEnd] = headerMatch;
          
          // Extract all key="value" pairs from the full ACTION tag
          const actionTagMatch = rawReply.match(/\[ACTION:\s*CREATE_BOOKING([^\]]+)\]/i);
          const extraParams: Record<string, string> = {};
          if (actionTagMatch) {
            const paramStr = actionTagMatch[1];
            const paramRegex = /([\w_]+)=["']([^"']*)["']/g;
            let pm;
            while ((pm = paramRegex.exec(paramStr)) !== null) {
              const key = pm[1].toLowerCase();
              if (!['date','start','end'].includes(key)) extraParams[key] = pm[2];
            }
          }

          const { createEvent } = await import('@/lib/calendar');

          // Build title and description replacing {{variable}} with collected params
          let title = (project as any).calendarConfig?.eventTitle || 'Cita';
          title = title.replace(/\{\{([^}]+)\}\}/g, (_: string, key: string) => extraParams[key.toLowerCase()] || clientName || 'Cliente');
          
          let description = (project as any).calendarConfig?.eventDescription || '';
          description = description.replace(/\{\{([^}]+)\}\}/g, (_: string, key: string) => extraParams[key.toLowerCase()] || '');

          const res = await createEvent(project.id, bookDate, bookStart, bookEnd || '', title, description);
          console.log(`[Agentic Loop] CREATE_BOOKING date=${bookDate} start=${bookStart} end=${bookEnd} → success=${res.success}`);
          
          if (res.success && res.event_id) {
            const phone = metadata?.phone || 'unknown';
            if (phone !== 'unknown') {
              try {
                await prisma.userBooking.create({
                  data: {
                    phone,
                    projectId: project.id,
                    eventId: res.event_id,
                    date: bookDate,
                    startTime: bookStart,
                    endTime: bookEnd || '',
                    title
                  }
                });
              } catch (err) {
                console.error('[Calendar] Error tracking UserBooking:', err);
              }
            }

            let confirmMsg = (project as any).calendarConfig?.confirmationMessage || 'Cita agendada exitosamente.';
            confirmMsg = confirmMsg
              .replace(/\{\{fecha\}\}/g, bookDate)
              .replace(/\{\{hora_inicio\}\}/g, bookStart)
              .replace(/\{\{hora_fin\}\}/g, bookEnd || '');
            
            systemData = `[SYSTEM DATA: CREATE_BOOKING_RESULT]\n{"success":true, "event_id":"${res.event_id}", "system_message":"Dile al cliente: ${confirmMsg}"}`;
          } else {
            systemData = `[SYSTEM DATA: CREATE_BOOKING_RESULT]\n${JSON.stringify(res)}`;
          }
        }
      }
      else if (rawReply.includes('[ACTION: UPDATE_BOOKING')) {
        const match = rawReply.match(/\[ACTION:\s*UPDATE_BOOKING\s+event_id=["']?([^"'\]\s]+)["']?\s+date=["']?([^"'\]\s]+)["']?\s+start=["']?([^"'\]\s]+)["']?(?:\s+end=["']?([^"'\]\s]+)["']?)?.*?\]/i);
        if (match) {
          actionFound = true;
          const eventId = match[1];
          const date = match[2];
          const start = match[3];
          const end = match[4] || '';

          // Verify ownership: event must belong to this phone
          const phone = metadata?.phone || 'unknown';
          const ownerBooking = phone !== 'unknown'
            ? await prisma.userBooking.findFirst({ where: { phone, projectId: project.id, eventId } })
            : null;

          if (!ownerBooking && phone !== 'unknown') {
            systemData = `[SYSTEM DATA: UPDATE_BOOKING_RESULT]\n{"success":false, "error":"No se encontró esa reserva para este cliente. Solo puedes modificar tus propias citas."}`;
          } else {
            const { updateEvent } = await import('@/lib/calendar');
            const res = await updateEvent(project.id, eventId, date, start, end);
            console.log(`[Agentic Loop] UPDATE_BOOKING eventId=${eventId} → success=${res.success}`);
            if (res.success) {
              await prisma.userBooking.updateMany({
                where: { eventId },
                data: { date, startTime: start, endTime: end }
              });
              systemData = `[SYSTEM DATA: UPDATE_BOOKING_RESULT]\n{"success":true, "system_message":"Cita actualizada exitosamente."}`;
            } else {
              systemData = `[SYSTEM DATA: UPDATE_BOOKING_RESULT]\n${JSON.stringify(res)}`;
            }
          }
        }
      }
      else if (rawReply.includes('[ACTION: CANCEL_BOOKING')) {
        const match = rawReply.match(/\[ACTION:\s*CANCEL_BOOKING\s+event_id=["']?([^"'\]\s]+)["']?.*?\]/i);
        if (match) {
          actionFound = true;
          const eventId = match[1];
          const phone = metadata?.phone || 'unknown';

          // Verify ownership
          const ownerBooking = phone !== 'unknown'
            ? await prisma.userBooking.findFirst({ where: { phone, projectId: project.id, eventId } })
            : null;

          if (!ownerBooking && phone !== 'unknown') {
            systemData = `[SYSTEM DATA: CANCEL_BOOKING_RESULT]\n{"success":false, "error":"No se encontró esa reserva para este cliente. Solo puedes cancelar tus propias citas."}`;
          } else {
            const { deleteEvent } = await import('@/lib/calendar');
            const res = await deleteEvent(project.id, eventId);
            console.log(`[Agentic Loop] CANCEL_BOOKING eventId=${eventId} → success=${res.success}`);
            if (res.success) {
              await prisma.userBooking.deleteMany({ where: { eventId } });
              systemData = `[SYSTEM DATA: CANCEL_BOOKING_RESULT]\n{"success":true, "system_message":"Cita cancelada exitosamente."}`;
            } else {
              systemData = `[SYSTEM DATA: CANCEL_BOOKING_RESULT]\n${JSON.stringify(res)}`;
            }
          }
        }
      }
      
      if (actionFound) {
        messages.push({ role: 'assistant', content: rawReply });
        messages.push({ role: 'user', content: systemData });
        console.log(`[Agentic Loop] Iteration ${loopCount}: SYSTEM DATA injected`);
      } else {
        break;
      }
    }

    const inputTokens = currentInputTokens;
    const outputTokens = currentOutputTokens;
    console.log(`[TOKENS] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);

    // Clean up reply from tags early so we can store it
    const reply = rawReply.replace(/\[ACTION: [\s\S]+?\]/g, "").trim();

    // Check if the AI generated the handoff tag
    const isHandoff = rawReply.includes("[ACTION: HANDOFF]");

    // Check for Unanswered Questions
    const unansweredMatch = rawReply.match(/\[ACTION:\s*UNANSWERED_QUESTION\s*["']?([^"\]]+)["']?\]/i);
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
    
    // Regex para capturar [ACTION: SCORE_BUMP +10 REASON: "Razón"] (soporta comillas simples o dobles)
    const scoreMatches = Array.from(rawReply.matchAll(/\[ACTION:\s*SCORE_BUMP\s+([+-]?\d+)(?:\s+REASON:\s*["']([^"']+)["'])?\s*\]/gi));
    
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
    const emailMatch = rawReply.match(/\[ACTION:\s*UPDATE_EMAIL\s+["'](.*?)["']\s*\]/i);
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
      debugPrompt: finalSystemPrompt
    };

  } catch (error: any) {
    console.error("Claude Error, intentando fallback con Gemini:", error.message || error);
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY no configurado para fallback");
      }
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: AI_MODELS.GEMINI_FALLBACK,
        systemInstruction: finalSystemPrompt 
      });
      
      const geminiHistory = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: redactPII(h.content) }],
      }));
      
      const chat = model.startChat({
        history: geminiHistory,
      });
      
      const result = await chat.sendMessage(redactPII(message));
      const rawReply = result.response.text();
      
      // Capturar uso de tokens para monitoreo de costos
      const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
      console.log(`[GEMINI TOKENS] Input: ${inputTokens} | Output: ${outputTokens}`);

      // Clean up reply from tags
      const reply = rawReply.replace(/\[ACTION: [\s\S]+?\]/g, "").trim();
      const isHandoff = rawReply.includes("[ACTION: HANDOFF]");

      // Check for Unanswered Questions
      const unansweredMatch = rawReply.match(/\[ACTION:\s*UNANSWERED_QUESTION\s*["']?([^"\]]+)["']?\]/i);
      if (unansweredMatch && unansweredMatch[1]) {
        const question = unansweredMatch[1].trim();
        const existing = await prisma.unansweredQuestion.findFirst({
          where: { projectId: project.id, question: question, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } }
        });
        if (!existing) {
          await prisma.unansweredQuestion.create({
            data: { projectId: project.id, agentId: config.id, question: question, botAnswer: reply || rawReply }
          });
        }
      }

      let scoreBump = 0;
      let scoreReason = "";
      const scoreMatches = Array.from(rawReply.matchAll(/\[ACTION:\s*SCORE_BUMP\s+([+-]?\d+)(?:\s+REASON:\s*["']([^"']+)["'])?\s*\]/gi));
      if (scoreMatches.length > 0) {
        const reasons: string[] = [];
        scoreMatches.forEach(match => {
          scoreBump += parseInt(match[1]);
          if (match[2]) reasons.push(match[2]);
        });
        scoreReason = reasons.join("; ");
        console.log(`Heatmap Score Detectado (Gemini): +${scoreBump} (${scoreReason})`);
      }

      const emailMatch = rawReply.match(/\[ACTION:\s*UPDATE_EMAIL\s+["'](.*?)["']\s*\]/i);
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
  const rawHistory = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: 21 // últimos para contexto, incluyendo el recién creado
  });
  
  // El mensaje recién creado está en la posición 0, lo ignoramos para no enviarlo duplicado
  const history = rawHistory.slice(1).reverse();

  // 4. Llamar a la lógica de IA existente
  const result = await sendTestMessage(
    message,
    history.map(m => ({ role: m.role, content: m.content, scoreReason: m.scoreReason })),
    "Usuario de Prueba",
    projectId,
    agentId,
    lead.metadata // Pasamos la info previa (habitaciones, presupuesto, etc.)
  );

  // 5. Guardar respuesta de la IA (solo si no hubo error)
  if (result.reply !== null) {
    if (result.reply.trim()) {
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
    }
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

  // 7. DESACTIVAR BOT SI HAY HANDOFF
  // Phrases that indicate an ACTIVE handoff action (declarative, not questions)
  const handoffKeywords = ['transfiriendo al equipo', 'conectando al equipo', 'conectando con el equipo', 'te paso con', 'pasándote con', 'connecting our team', 'connecting the team', 'transferring you'];
  const hasHandoffKeyword = handoffKeywords.some(k => result.reply?.toLowerCase().includes(k));

  if (result.isHandoff || hasHandoffKeyword) {
    console.log(`[HANDOFF] Desactivando bot para chatId: ${chatId}`);
    await prisma.chat.update({
      where: { id: chatId },
      data: { botActive: false }
    });
  }

  return {
    ...result,
    newScore: updatedScore,
    newHeat: updatedHeat
  };
}
