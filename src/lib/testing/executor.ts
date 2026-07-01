import { sendTestMessage } from '@/app/actions/chat';

export async function runConversationWithBot(
  projectId: string,
  conversation: any
) {
  const history: { role: string, content: string, scoreReason?: string | null }[] = [];
  const botResponses: any[] = [];

  for (const clientMsg of conversation.client_messages) {
    // El bot responde usando la funcion exacta de produccion
    const result = await sendTestMessage(
      clientMsg,
      history,
      "Cliente Simulado",
      projectId,
      undefined, // Agente por defecto
      {}
    );

    // Agregar al historial local
    history.push({ role: 'user', content: clientMsg });
    
    if (result.reply) {
      history.push({ 
        role: 'assistant', 
        content: result.reply, 
        scoreReason: result.scoreReason 
      });
    }

    botResponses.push({
      client_said: clientMsg,
      bot_responded: result.reply,
      metadata: {
        isHandoff: result.isHandoff,
        scoreBump: result.scoreBump,
        scoreReason: result.scoreReason,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      }
    });

    // Si el bot hace handoff, la conversacion termina para el bot (en la vida real)
    // Para el simulador, podriamos cortar aca.
    if (result.isHandoff) {
      break;
    }
  }

  return {
    conversation_id: conversation.id,
    profile: conversation.profile,
    intent: conversation.intent,
    turns: botResponses
  };
}
