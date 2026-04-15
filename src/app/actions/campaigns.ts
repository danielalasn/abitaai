'use server';

import { prisma } from '@/lib/prisma';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getApprovedTemplates } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { getCurrentProject } from '@/lib/auth-server';

// Helper: get project + credentials
async function getProjectWithCredentials() {
  const project = await getCurrentProject();
  if (!project) throw new Error('No se encontró el proyecto base.');
  return project;
}

/**
 * Fetch all Meta-approved templates for the project's WABID.
 */
export async function fetchMetaTemplates() {
  const project = await getProjectWithCredentials();
  if (!project.whatsappBusinessId || !project.whatsappToken) {
    return { error: 'Configura el WhatsApp Business ID y el Access Token en Configuración.', templates: [] };
  }
  const templates = await getApprovedTemplates(project.whatsappBusinessId, project.whatsappToken);
  return { templates, error: null };
}

/**
 * Launch a campaign using a Meta-approved template.
 * variableMapping: { "1": "nombre", "2": "empresa" }  (template {{1}} → CSV col "nombre")
 */
export async function createCampaign(
  name: string,
  templateName: string,
  templateText: string, // Nuevo: texto base de la plantilla
  languageCode: string,
  variableMapping: Record<string, string>, // { "1": "colCSV", "2": "colCSV2" }
  leadsData: any[]
) {
  const project = await getProjectWithCredentials();

  if (!project.whatsappPhoneId || !project.whatsappToken) {
    throw new Error('Configura el Phone Number ID y el Access Token en Configuración antes de lanzar campañas.');
  }

  const campaign = await prisma.campaign.create({
    data: {
      projectId: project.id,
      name,
      status: 'RUNNING',
      leadCount: leadsData.length,
      csvData: JSON.stringify(leadsData),
      templateName,
      variableMapping: JSON.stringify(variableMapping),
    }
  });

  // Fire-and-forget background worker
  processCampaign(
    campaign.id,
    project.id,
    templateName,
    templateText,
    languageCode,
    variableMapping,
    leadsData,
    project.whatsappPhoneId,
    project.whatsappToken
  ).catch(console.error);

  revalidatePath('/campaigns');
  return campaign;
}

export async function getCampaigns() {
  const project = await prisma.project.findFirst();
  if (!project) return [];
  return await prisma.campaign.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' }
  });
}

// ──────────────────────────────────────────────
// Background worker — sends one message per lead
// ──────────────────────────────────────────────
async function processCampaign(
  campaignId: string,
  projectId: string,
  templateName: string,
  templateText: string,
  languageCode: string,
  variableMapping: Record<string, string>,
  leadsData: any[],
  phoneNumberId: string,
  accessToken: string
) {
  for (const leadData of leadsData) {
    const rawPhone = leadData['#'];
    if (!rawPhone) continue;

    const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) continue;

    // Build template body components
    const paramEntries = Object.entries(variableMapping).sort(([a], [b]) => Number(a) - Number(b));
    const bodyParams = paramEntries.map(([, colName]) => ({
      type: 'text' as const,
      text: String(leadData[colName] ?? ''),
    }));

    const components = bodyParams.length > 0
      ? [{ type: 'body' as const, parameters: bodyParams }]
      : [];

    // Build a readable preview by replacing {{1}}, {{2}} with actual values
    let previewText = templateText;
    paramEntries.forEach(([k, col]) => {
        const val = leadData[col] ?? '';
        previewText = previewText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
    });
    
    // Si no hay variables o el texto está vacío, fallback al formato anterior
    if (!previewText) {
        previewText = `Plantilla: ${templateName} → ${paramEntries.map(([k, col]) => `{{${k}}}=${leadData[col] ?? ''}`).join(', ')}`;
    }

    // Upsert Lead
    let lead = await prisma.lead.findFirst({ where: { phone: cleanPhone, projectId } });
    
    // Preparar metadata (limpiar columnas técnicas)
    const metadataToSave = { ...leadData };
    delete metadataToSave['#'];

    if (!lead) {
      const nameKey = Object.keys(leadData).find(k => k.toLowerCase() === 'nombre');
      lead = await prisma.lead.create({
        data: {
          phone: cleanPhone,
          projectId,
          name: nameKey ? leadData[nameKey] : `Lead ${cleanPhone.slice(-4)}`,
          latestCampaignId: campaignId,
          metadata: metadataToSave
        }
      });
    } else {
      // Si el lead ya existe, actualizamos a la campaña más reciente y MERGE de metadata
      const existingMetadata = (lead.metadata as Record<string, any>) || {};
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { 
          latestCampaignId: campaignId,
          metadata: { ...existingMetadata, ...metadataToSave }
        }
      });
    }

    // Upsert Chat
    let chat = await prisma.chat.findUnique({ where: { leadId: lead.id } });
    if (!chat) {
      chat = await prisma.chat.create({ data: { leadId: lead.id } });
    }

    // Send via WhatsApp Cloud API
    const waResult = await sendWhatsAppTemplate(
      cleanPhone,
      templateName,
      languageCode,
      components,
      phoneNumberId,
      accessToken
    );

    // Store message in DB for Inbox (with WA billing category)
    await prisma.message.create({
      data: { chatId: chat.id, role: 'agent', content: previewText, waCategory: waResult.category || 'MARKETING' }
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastActiveAt: new Date() }
    });

    // Respect Meta's rate limits (~80 msg/min on Cloud API tier 1)
    await new Promise(r => setTimeout(r, 800));
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' }
  });
}
