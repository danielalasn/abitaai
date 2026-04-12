'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

// Inicializador temporal MVP (Para no tener Auth por ahora)
export async function getOrCreateDefaultConfig() {
  let project = await prisma.project.findFirst({
    include: { botConfig: true }
  });

  if (!project) {
    // Crear cliente y proyecto paracaidas 
    const client = await prisma.client.create({
      data: {
        name: "Acme Corp",
        email: "admin@acme.com"
      }
    });

    project = await prisma.project.create({
      data: {
        name: "Acme Main Support",
        clientId: client.id,
      },
      include: { botConfig: true }
    });
  }

  if (!project.botConfig) {
    await prisma.botConfig.create({
      data: {
        projectId: project.id,
        identity: "You are a helpful and polite virtual assistant.",
        instructions: "Answer concisely and guide users to buy our products.",
        faq: "P: ¿Cuáles son sus horarios?\nR: Estamos abiertos de 9am a 5pm."
      }
    });
    
    // Recargar con el botconfig recien creado
    project = await prisma.project.findFirst({
      where: { id: project.id },
      include: { botConfig: true }
    });
  }

  return project!.botConfig;
}

export async function saveBotConfig(
  projectId: string, 
  identity: string, 
  instructions: string, 
  knowledgeData: string,
  knowledgeRaw: string,
  faq: string,
  leadScoringRules: string,
  whatsappToken: string,
  whatsappPhoneId: string,
  whatsappBusinessId: string
) {
  await prisma.botConfig.update({
    where: { projectId },
    data: { 
      identity, 
      instructions, 
      knowledgeData, 
      knowledgeRaw, 
      faq, 
      leadScoringRules,
      whatsappToken,
      whatsappPhoneId,
      whatsappBusinessId
    }
  });
  
  revalidatePath('/settings');
  return { success: true };
}

export async function compileKnowledgeWithAI(text: string) {
  if (!text.trim()) return "{}";
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307", // We can use haiku for this structural generation to save cost, since it's just formatting
    max_tokens: 4000,
    system: `You are an expert Data Engineer. 
Your ONLY job is to take the unstructured text provided by the user and convert it into a clean, highly structured JSON object. 
Identify the main categories and their attributes. 

CRITICAL CATEGORIES:
- "proyectos": Array of project objects.
- "amenidades": ONLY positive features (piscina, gym, etc.).
- "reglas": Prohibitions, schedules, and restrictions (No AirBnB, no pets, noise limits). NEVER put rules inside "amenidades".
- "modelos": Pricing and specs of units.

CRITICAL RULE: You MUST use Spanish keys for the JSON (e.g., "proyectos", "modelos", "baños", "precio", "reglas").
Output ONLY a valid JSON string without any markdown wrappers or explanations.
`,
    messages: [
      { role: "user", content: text }
    ]
  });

  const rawJson = response.content[0].type === 'text' ? response.content[0].text : "{}";
  return rawJson.trim();
}

export async function verifyWhatsappConnection(
  whatsappPhoneId: string,
  whatsappToken: string
): Promise<{ success: boolean; message: string }> {
  if (!whatsappPhoneId || !whatsappToken) {
    return { success: false, message: 'Faltan credenciales. Ingresa el Phone Number ID y el Access Token.' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${whatsappPhoneId}?fields=display_phone_number,verified_name,quality_rating&access_token=${whatsappToken}`,
      { method: 'GET', cache: 'no-store' }
    )
    const data = await res.json()

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || 'Token o Phone ID inválido.'
      return { success: false, message: errMsg }
    }

    const phone = data.display_phone_number || 'desconocido'
    const name = data.verified_name || 'Sin nombre'
    return { success: true, message: `✓ Conectado: ${name} (${phone})` }
  } catch (e) {
    return { success: false, message: 'Error de red al contactar Meta.' }
  }
}
