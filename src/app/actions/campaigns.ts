'use server';

import { prisma } from '@/lib/prisma';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getApprovedTemplates } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { getCurrentProject } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

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
export async function launchCampaignAction(
  name: string,
  templateName: string,
  templateText: string, // Nuevo: texto base de la plantilla
  languageCode: string,
  variableMapping: Record<string, string>, // { "1": "colCSV", "2": "colCSV2" }
  leadsData: any[],
  headerUrl?: string, // Nuevo: URL de imagen o nombre de columna CSV
  botActive: boolean = true
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
    project.whatsappToken,
    headerUrl,
    botActive
  ).catch(console.error);

  revalidatePath('/campaigns');
  return campaign;
}

export async function fetchCampaigns() {
  const project = await getProjectWithCredentials();
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
  accessToken: string,
  headerUrl?: string,
  botActive: boolean = true
) {
  for (let i = 0; i < leadsData.length; i++) {
    const leadData = leadsData[i];
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

    const components: any[] = bodyParams.length > 0
      ? [{ type: 'body', parameters: bodyParams }]
      : [];
    
    // Add image header if present
    let realUrl: string | undefined = undefined;
    if (headerUrl) {
      // Determine if headerUrl is a column mapping or a static URL
      const isMapping = headerUrl.startsWith('{{') && headerUrl.endsWith('}}');
      realUrl = isMapping 
        ? String(leadData[headerUrl.replace(/[{}]/g, '')] ?? '')
        : headerUrl;

      if (realUrl && realUrl.startsWith('http')) {
        components.unshift({
          type: 'header',
          parameters: [
            { type: 'image', image: { link: realUrl } }
          ]
        });
      }
    }

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
      // Intentar encontrar el nombre en columnas comunes
      const nameKey = Object.keys(leadData).find(k => ['nombre', 'name'].includes(k.toLowerCase()));
      const leadName = nameKey ? String(leadData[nameKey]).trim() : cleanPhone;

      lead = await prisma.lead.create({
        data: {
          phone: cleanPhone,
          projectId,
          name: leadName,
          latestCampaignId: campaignId,
          metadata: metadataToSave
        }
      });
    } else {
      // Si el lead ya existe, actualizamos metadata y nombre si no tenía uno decente
      const existingMetadata = (lead.metadata as Record<string, any>) || {};
      const nameKey = Object.keys(leadData).find(k => ['nombre', 'name'].includes(k.toLowerCase()));
      const newName = nameKey ? String(leadData[nameKey]).trim() : null;

      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { 
          latestCampaignId: campaignId,
          name: (newName && (lead.name?.includes('Lead') || lead.name === lead.phone)) ? newName : lead.name,
          metadata: { ...existingMetadata, ...metadataToSave }
        }
      });
    }

    // Upsert Chat
    let chat = await prisma.chat.findUnique({ where: { leadId: lead.id } });
    if (!chat) {
      chat = await prisma.chat.create({ 
        data: { 
          leadId: lead.id,
          botActive: botActive
        } 
      });
    } else {
      chat = await prisma.chat.update({
        where: { id: chat.id },
        data: { botActive: botActive }
      });
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

    // Store message in DB for Inbox (with WA billing category and optional image)
    await prisma.message.create({
      data: { 
        chatId: chat.id, 
        role: 'agent', 
        content: previewText, 
        waCategory: waResult.category || 'MARKETING',
        imageUrl: realUrl
      }
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastActiveAt: new Date() }
    });

    // LÓGICA DE BATCHES: Cada 25 mensajes, esperar 5 segundos (si no es el último)
    const processedCount = i + 1;
    if (processedCount % 25 === 0 && processedCount < leadsData.length) {
      console.log(`[Campaign] Batch de 25 alcanzado (${processedCount}/${leadsData.length}). Esperando 5 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      // Pequeño delay de 500ms entre mensajes individuales para estabilidad
      await new Promise(r => setTimeout(r, 500));
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' }
  });
}

/**
 * Upload an image to Supabase Storage and return the public URL.
 */
export async function uploadCampaignImage(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No se proporcionó ningún archivo.');

  // 1. Ensure bucket exists
  const bucketName = 'campaign-media';
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.find(b => b.name === bucketName);
  
  if (!exists) {
    await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  }

  // 2. Upload file
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `campaigns/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  // 3. Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrl;
}
