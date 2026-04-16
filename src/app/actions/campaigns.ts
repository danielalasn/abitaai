'use server';

import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getApprovedTemplates } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { getCurrentProject } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { after } from 'next/server';

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

  // BACKGROUND TASK: Using after() to ensure Vercel doesn't kill the process
  after(async () => {
    console.log(`[Campaign] Iniciando procesamiento en segundo plano para campaña: ${campaign.id}`);
    await processCampaign(
      campaign.id,
      project.id,
      templateName,
      templateText,
      languageCode,
      variableMapping,
      leadsData,
      project.whatsappPhoneId!,
      project.whatsappToken!,
      headerUrl,
      botActive
    ).catch(err => {
      console.error(`[Campaign] Error en procesamiento background:`, err);
    });
  });

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
  const batchSize = 5; // Batches de 5 para seguridad
  for (let i = 0; i < leadsData.length; i += batchSize) {
    const batch = leadsData.slice(i, i + batchSize);
    console.log(`[Campaign] Procesando batch de ${batch.length} leads... (${i + 1}/${leadsData.length})`);

    await Promise.all(batch.map(async (leadData) => {
      try {
        const rawPhone = leadData['#'];
        if (!rawPhone) return;

        const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
        if (cleanPhone.length < 8) return;

        // 1. Build components y preview
        const paramEntries = Object.entries(variableMapping).sort(([a], [b]) => Number(a) - Number(b));
        const bodyParams = paramEntries.map(([, colName]) => ({
          type: 'text' as const,
          text: String(leadData[colName] ?? ''),
        }));

        const components: any[] = bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];
        let realUrl: string | undefined = undefined;
        if (headerUrl) {
          const isMapping = headerUrl.startsWith('{{') && headerUrl.endsWith('}}');
          realUrl = isMapping ? String(leadData[headerUrl.replace(/[{}]/g, '')] ?? '') : headerUrl;
          if (realUrl && realUrl.startsWith('http')) {
            components.unshift({ type: 'header', parameters: [{ type: 'image', image: { link: realUrl } }] });
          }
        }

        let previewText = templateText;
        paramEntries.forEach(([k, col]) => {
            const val = leadData[col] ?? '';
            previewText = previewText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
        });
        if (!previewText) previewText = `Plantilla: ${templateName}`;

        // 2. Transacción de DB: Upsert Lead + Chat + Message en menos viajes
        const metadataToSave = { ...leadData };
        delete metadataToSave['#'];
        const nameKey = Object.keys(leadData).find(k => ['nombre', 'name'].includes(k.toLowerCase()));
        const leadName = nameKey ? String(leadData[nameKey]).trim() : cleanPhone;

        const lead = await prisma.lead.upsert({
          where: { phone_projectId: { phone: cleanPhone, projectId } },
          update: { 
            latestCampaignId: campaignId,
            metadata: metadataToSave,
            name: (leadName && leadName !== cleanPhone) ? leadName : undefined 
          },
          create: { phone: cleanPhone, projectId, name: leadName, latestCampaignId: campaignId, metadata: metadataToSave }
        });

        const chat = await prisma.chat.upsert({
          where: { leadId: lead.id },
          update: { botActive: botActive, lastActiveAt: new Date() },
          create: { leadId: lead.id, botActive: botActive }
        });

        // 3. Envío Meta
        const waResult = await sendWhatsAppTemplate(cleanPhone, templateName, languageCode, components, phoneNumberId, accessToken);

        // 4. Guardar mensaje
        await prisma.message.create({
          data: { 
            chatId: chat.id, role: 'agent', content: previewText, 
            waCategory: waResult.category || 'MARKETING', imageUrl: realUrl 
          }
        });

      } catch (err) {
        console.error(`[Campaign] Error procesando lead individual:`, err);
      }
    }));

    // Delay de seguridad de 1 segundo entre batches
    if (i + batchSize < leadsData.length) {
      await new Promise(r => setTimeout(r, 1000));
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
