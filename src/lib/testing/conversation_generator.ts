import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CUSTOMER_PROFILES = [
  {
    name: "Cliente directo",
    description: "Va al grano, hace preguntas concretas, espera respuestas claras y no da muchas vueltas."
  },
  {
    name: "Cliente confundido",
    description: "No sabe bien qué quiere, hace preguntas vagas, necesita mucha guía y que le ofrezcan opciones."
  },
  {
    name: "Cliente apurado",
    description: "Quiere todo rápido, escribe corto, se impacienta si el bot rodea mucho la respuesta."
  },
  {
    name: "Cliente exigente",
    description: "Hace muchas preguntas detalladas, quiere información completa y clara antes de tomar cualquier decisión."
  },
  {
    name: "Cliente difícil",
    description: "Se queja, está molesto o a la defensiva, pone a prueba la paciencia del agente, exige descuentos."
  },
  {
    name: "Cliente curioso",
    description: "Pregunta cosas fuera del alcance normal, cambia de tema frecuentemente y le gusta indagar."
  },
  {
    name: "Cliente nuevo",
    description: "Es la primera vez que contacta a la empresa, no conoce nada del negocio y hace preguntas muy básicas."
  },
  {
    name: "Cliente recurrente",
    description: "Ya conoce el negocio, va directo a hacer pedidos o agendar, no necesita mucha introducción."
  }
];

export const INTENT_CATEGORIES: Record<string, string[]> = {
  "default": [
    "Consultar precios",
    "Agendar cita",
    "Preguntar ubicación",
    "Preguntar horarios",
    "Pedir hablar con humano",
    "Quejarse del servicio",
    "Hacer un pedido",
    "Confirmar detalles"
  ]
};

export async function generateConversation(
  industry: string,
  businessInfo: any,
  profile: { name: string, description: string },
  intent: string,
  numTurns: number = 3
): Promise<string[]> {
  const systemPrompt = `
Eres un cliente potencial de un negocio que opera por WhatsApp.
Tu perfil: ${profile.description}
Tu intención principal: ${intent}
Negocio: ${businessInfo.name}

Genera UNA conversación realista de ${numTurns} turnos donde TÚ eres el cliente enviando mensajes de WhatsApp.

Reglas:
- Cada mensaje debe ser natural, como si lo escribieras en WhatsApp desde tu celular.
- NO uses formato robótico.
- Incluye errores de tipeo ocasionales si tu perfil lo permitiría.
- Usa expresiones informales LATAM si aplica.
- Empieza con un saludo natural.
- Lleva la conversación hacia tu intención paso a paso.
- Si eres un cliente difícil, sé realista (no exageres al punto de ser absurdo).
- Devuelve SOLO un JSON con un array de strings bajo la propiedad "messages".
- NUNCA agregues texto adicional fuera del JSON.

Formato de respuesta:
{
  "messages": [
    "Hola buenas, una consulta",
    "Cuanto cuesta?",
    "Y horario tienen?"
  ]
}
`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.CLAUDE_MAIN, // using main for speed/cost if available
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Genera la conversación de ${numTurns} turnos en JSON estricto.`
      }]
    });

    const textBlock = response.content.find((block: any) => block.type === 'text');
    let responseText = (textBlock as any)?.text || "";
    
    // Parse JSON
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

    const data = JSON.parse(responseText.trim());
    return data.messages || [];

  } catch (error) {
    console.error("Error generating conversation con Claude, intentando fallback con Gemini:", error);
    try {
      if (process.env.GEMINI_API_KEY) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: AI_MODELS.GEMINI_FALLBACK,
          systemInstruction: systemPrompt
        });
        const result = await model.generateContent(`Genera la conversación de ${numTurns} turnos en JSON estricto.`);
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
        const data = JSON.parse(responseText.trim());
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          return data.messages;
        }
      }
    } catch (geminiError) {
      console.error("Error generating conversation con Gemini Fallback:", geminiError);
    }
    return ["Hola"]; // Fallback
  }
}

export async function generateTestSuite(
  workspaceId: string,
  businessInfo: any,
  numConversations: number = 5
) {
  const intents = INTENT_CATEGORIES["default"];
  const suite = [];

  for (let i = 0; i < numConversations; i++) {
    const profile = CUSTOMER_PROFILES[i % CUSTOMER_PROFILES.length];
    const intent = intents[i % intents.length];

    const messages = await generateConversation(
      "general", 
      businessInfo, 
      profile, 
      intent, 
      Math.floor(Math.random() * 2) + 3 // 3 a 4 turnos
    );

    suite.push({
      id: `conv_${Date.now()}_${i}`,
      profile: profile.name,
      intent: intent,
      client_messages: messages
    });
  }

  return suite;
}
