'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentProject } from '@/lib/auth-server'
import { encrypt, decrypt } from '@/lib/encryption'
import { AI_MODELS } from '@/lib/models'

// ──────────────────────────────────────────────
// Project-level: WhatsApp Config & Agents list
// ──────────────────────────────────────────────

export async function getProjectConfig() {
  const project = await getCurrentProject();
  if (!project) throw new Error('Project not found for current session.');

  let whatsappToken = decrypt(project.whatsappToken) || '';
  let whatsappBusinessId = project.whatsappBusinessId || '';

  if (!whatsappToken || !whatsappBusinessId) {
    const adminClient = await prisma.client.findFirst({
      where: { email: 'info@abitaai.com' },
      include: { projects: true }
    });
    const masterProject = adminClient?.projects?.[0];
    
    if (!whatsappToken) {
      whatsappToken = decrypt(masterProject?.whatsappToken) || process.env.SYSTEM_USER_TOKEN || '';
    }
    if (!whatsappBusinessId) {
      whatsappBusinessId = masterProject?.whatsappBusinessId || '2178386092973067';
    }
  }

  return {
    projectId: project.id,
    whatsappToken,
    whatsappPhoneId: project.whatsappPhoneId || '',
    whatsappBusinessId,
    defaultBotActive: project.defaultBotActive,
    botAutoWakeHours: project.botAutoWakeHours,
    agents: project.agents || [],
    client: project.client,
  };
}

export async function saveProjectWhatsApp(
  projectId: string,
  whatsappToken: string,
  whatsappPhoneId: string,
  whatsappBusinessId: string
) {
  await prisma.project.update({
    where: { id: projectId },
    data: { 
      whatsappToken: encrypt(whatsappToken), 
      whatsappPhoneId, 
      whatsappBusinessId 
    }
  });
  revalidatePath('/settings');
  return { success: true };
}

export async function updateDefaultBotActive(projectId: string, defaultBotActive: boolean) {
  await prisma.project.update({
    where: { id: projectId },
    data: { defaultBotActive }
  });
  revalidatePath('/settings');
  return { success: true };
}

export async function updateBotAutoWakeHours(projectId: string, botAutoWakeHours: number | null) {
  await prisma.project.update({
    where: { id: projectId },
    data: { botAutoWakeHours }
  });
  revalidatePath('/settings');
  return { success: true };
}

// ──────────────────────────────────────────────
// Agent-level: CRUD & Config
// ──────────────────────────────────────────────

export async function getAgentConfig(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error('Agent not found.');
  return agent;
}

export async function createAgent(projectId: string, name: string, description?: string) {
  const agent = await prisma.agent.create({
    data: {
      projectId,
      name,
      description: description || '',
      isActive: true,
      identity: "Eres un asistente virtual amigable y profesional.",
      instructions: "Responde de forma concisa y guía a los usuarios.",
      faq: "",
    }
  });
  revalidatePath('/settings');
  return agent;
}

export async function deleteAgent(agentId: string) {
  await prisma.agent.delete({ where: { id: agentId } });
  revalidatePath('/settings');
  return { success: true };
}

export async function saveAgentConfig(
  agentId: string,
  name: string,
  description: string,
  identity: string,
  instructions: string,
  knowledgeData: string,
  knowledgeRaw: string,
  faq: string,
  leadScoringRules: string
) {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      name,
      description,
      identity,
      instructions,
      knowledgeData,
      knowledgeRaw,
      faq,
      leadScoringRules,
    }
  });

  revalidatePath('/settings');
  return { success: true };
}

export async function toggleAgent(agentId: string, isActive: boolean) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { isActive }
  });
  revalidatePath('/settings');
  return { success: true };
}

// ──────────────────────────────────────────────
// Legacy compatibility wrapper
// (For pages that haven't been refactored yet)
// ──────────────────────────────────────────────

export async function getOrCreateDefaultConfig() {
  const project = await getCurrentProject();
  if (!project) throw new Error('Project not found for current session.');

  // Return the first agent as the "default" config
  const agent = project.agents?.[0];
  
  if (!agent) {
    // Create a default agent if none exists
    const newAgent = await prisma.agent.create({
      data: {
        projectId: project.id,
        name: 'Agente Principal',
        identity: "You are a helpful and polite virtual assistant.",
        instructions: "Answer concisely and guide users to buy our products.",
        faq: "P: ¿Cuáles son sus horarios?\nR: Estamos abiertos de 9am a 5pm."
      }
    });
    
    return {
      ...newAgent,
      projectId: project.id,
      whatsappToken: decrypt(project.whatsappToken) || '',
      whatsappPhoneId: project.whatsappPhoneId || '',
      whatsappBusinessId: project.whatsappBusinessId || '',
    };
  }

  return {
    ...agent,
    projectId: project.id,
    whatsappToken: decrypt(project.whatsappToken) || '',
    whatsappPhoneId: project.whatsappPhoneId || '',
    whatsappBusinessId: project.whatsappBusinessId || '',
  };
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
  // Save WhatsApp at project level cifrado
  await prisma.project.update({
    where: { id: projectId },
    data: { 
      whatsappToken: encrypt(whatsappToken), 
      whatsappPhoneId, 
      whatsappBusinessId 
    }
  });

  // Save agent config on the first agent
  const agents = await prisma.agent.findMany({ where: { projectId } });
  if (agents.length > 0) {
    await prisma.agent.update({
      where: { id: agents[0].id },
      data: { identity, instructions, knowledgeData, knowledgeRaw, faq, leadScoringRules }
    });
  }

  revalidatePath('/settings');
  return { success: true };
}

// ──────────────────────────────────────────────
// AI Knowledge Compilation
// ──────────────────────────────────────────────

export async function compileKnowledgeWithAI(text: string) {
  if (!text.trim()) return "{}";
  
  console.log("[AI KNOWLEDGE COMPILE] Input text length:", text.length);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: AI_MODELS.CLAUDE_MAIN, 
    max_tokens: 8192,
    system: `You are an expert Data Engineer. 
Your ONLY job is to take the unstructured text provided by the user and convert it into a clean, highly structured JSON object. 
RETAIN ALL IMPORTANT DETAILS. Create logical categories and arrays based on the provided text (for example: "empresa", "horarios", "productos", "servicios", "precios", "reglas", etc.).
Do not summarize unless explicitly asked. If there are prices, specific schedules, or nested details, INCLUDE THEM in a well-structured way.

CRITICAL RULE: You MUST use Spanish keys for the JSON.
Output ONLY a valid JSON string. Do not include markdown wrappers or explanations.`,
    messages: [
      { role: "user", content: text }
    ]
  });

  let rawJson = response.content[0].type === 'text' ? response.content[0].text : "{}";
  console.log("[AI KNOWLEDGE COMPILE] Raw output:", rawJson);
  
  // Clean up potential markdown wrappers robustly
  const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    rawJson = jsonMatch[1];
  } else {
    // Attempt to extract from first { to last }
    const firstBrace = rawJson.indexOf('{');
    const lastBrace = rawJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawJson = rawJson.substring(firstBrace, lastBrace + 1);
    }
  }

  const result = rawJson.trim();
  console.log("[AI KNOWLEDGE COMPILE] Final cleaned JSON:", result);
  return result;
}

// ──────────────────────────────────────────────
// WhatsApp Connection Verification
// ──────────────────────────────────────────────

export async function verifyWhatsappConnection(
  explicitPhoneId?: string,
  explicitToken?: string
): Promise<{ success: boolean; message: string }> {
  let phoneId = explicitPhoneId;
  let token = explicitToken;

  // Si no se pasan credenciales explícitas, usamos las del proyecto actual (con fallback)
  if (!phoneId || !token) {
    const project = await getCurrentProject();
    if (!project) return { success: false, message: 'No se encontró el proyecto.' };
    
    phoneId = phoneId || project.whatsappPhoneId || '';
    token = token || decrypt(project.whatsappToken) || '';
  }

  if (!phoneId || !token) {
    return { success: false, message: 'Faltan credenciales. Ingresa el Phone Number ID y el Access Token.' }
  }

  console.log(`[WA_VERIFY] Iniciando verificación para PhoneId: ${phoneId}`);

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}?fields=display_phone_number,verified_name,status&access_token=${token}`,
      { method: 'GET', cache: 'no-store' }
    )
    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('[WA_VERIFY_ERROR] Detalle completo de Meta:', JSON.stringify(data.error, null, 2));
      
      const error = data.error;
      let detailedMsg = error?.message || 'Error desconocido de Meta API.';
      
      if (error?.code === 190) detailedMsg = "🔑 El Access Token ha expirado o es inválido. Por favor genera uno nuevo en Meta Developers.";
      if (error?.code === 100) detailedMsg = "📱 El Phone Number ID parece ser incorrecto o no tienes permiso para verlo.";
      if (error?.code === 33) detailedMsg = "🚫 API Blocked: Tu cuenta de WhatsApp Business tiene restricciones o el número no está bien configurado en el Business Manager.";
      if (error?.code === 200) detailedMsg = "🔒 Permisos insuficientes. Asegúrate de que el token tenga 'whatsapp_business_management' y 'whatsapp_business_messaging'.";
      
      return { 
        success: false, 
        message: `Error (${error?.code || '??'}): ${detailedMsg}` 
      }
    }

    const phone = data.display_phone_number || 'desconocido'
    const name = data.verified_name || 'Sin nombre'
    const status = data.status || 'UNKNOWN'
    
    console.log(`[WA_VERIFY_SUCCESS] Conectado a: ${name}`);

    return { 
      success: true, 
      message: `✅ ¡Conexión Exitosa!\n• Nombre: ${name}\n• Número: ${phone}\n• Estado: ${status}` 
    }
  } catch (e: any) {
    console.error('[WA_VERIFY_CRITICAL] Error de red:', e);
    return { success: false, message: `Error de red: ${e.message || 'No se pudo contactar con Meta.'}` }
  }
}

// ──────────────────────────────────────────────
// User Theme
// ──────────────────────────────────────────────

export async function updateUserTheme(userId: string, theme: 'light' | 'dark') {
  await prisma.client.update({
    where: { id: userId },
    data: { theme }
  });
  return { success: true };
}

export async function updateUserProfile(userId: string, name: string, email: string) {
  // Check if email already exists for another user
  const existing = await prisma.client.findFirst({
    where: { 
      email,
      id: { not: userId }
    }
  });
  if (existing) throw new Error('El correo electrónico ya está en uso.');

  await prisma.client.update({
    where: { id: userId },
    data: { name, email }
  });

  const { createAuditLog } = await import('@/app/actions/compliance');
  await createAuditLog('PROFILE_UPDATED', `Nombre/Correo actualizado a ${name} / ${email}`);

  revalidatePath('/settings');
  return { success: true };
}

export async function updateUserPassword(userId: string, oldPassword: string, newPassword: string) {
  const bcrypt = await import('bcryptjs');
  
  const user = await prisma.client.findUnique({ where: { id: userId } });
  if (!user || !user.password) throw new Error('Usuario no encontrado o sin contraseña configurada.');

  const isOldPasswordCorrect = await bcrypt.default.compare(oldPassword, user.password);
  if (!isOldPasswordCorrect) throw new Error('La contraseña anterior es incorrecta.');

  const hashedPassword = await bcrypt.default.hash(newPassword, 10);
  
  await prisma.client.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  const { createAuditLog } = await import('@/app/actions/compliance');
  await createAuditLog('PASSWORD_UPDATED', 'El usuario actualizó su contraseña.');

  return { success: true };
}

// ──────────────────────────────────────────────
// Notification Emails
// ──────────────────────────────────────────────

export async function getNotificationEmails(): Promise<string[]> {
  const project = await getCurrentProject();
  if (!project) return [];
  return (project as any).notificationEmails || [];
}

export async function saveNotificationEmails(emails: string[]): Promise<{ success: boolean }> {
  const project = await getCurrentProject();
  if (!project) throw new Error('Proyecto no encontrado.');
  await (prisma.project as any).update({
    where: { id: project.id },
    data: { notificationEmails: emails }
  });
  revalidatePath('/settings');
  return { success: true };
}

// ──────────────────────────────────────────────
// Disconnect WhatsApp
// ──────────────────────────────────────────────

export async function disconnectWhatsApp(): Promise<{ success: boolean }> {
  const project = await getCurrentProject();
  if (!project) throw new Error('Proyecto no encontrado.');

  await prisma.project.update({
    where: { id: project.id },
    data: { 
      whatsappToken: null,
      whatsappPhoneId: null,
      whatsappBusinessId: null
    }
  });

  revalidatePath('/settings');
  return { success: true };
}
