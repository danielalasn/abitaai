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
  console.log(`[Campaign] Procesando ${leadsData.length} contactos con cadencia de seguridad...`);

  for (let i = 0; i < leadsData.length; i++) {
    const leadData = leadsData[i];
    try {
      const rawPhone = leadData['#'];
      if (!rawPhone) continue;

      const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) continue;

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

      // 2. Transacción de DB: Upsert Lead + Chat + Message
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

      // 4. Guardar mensaje y LOG de campaña
      await prisma.message.create({
        data: { 
          chatId: chat.id, role: 'agent', content: previewText, 
          waCategory: waResult.category || 'MARKETING', imageUrl: realUrl,
          wamid: waResult.messageId // Rastreo de estado para el inbox
        }
      });

      await prisma.campaignLog.create({
        data: {
          campaignId,
          wamid: waResult.messageId,
          phone: cleanPhone,
          status: 'SENT'
        }
      });
      console.log(`[Campaign] (${i+1}/${leadsData.length}) Enviado a ${cleanPhone}. WAMID: ${waResult.messageId}`);

    } catch (err: any) {
      console.error(`[Campaign] Error procesando lead individual #${i}:`, err);
      try {
        const rawPhone = leadData['#'];
        await prisma.campaignLog.create({
          data: {
            campaignId,
            phone: rawPhone ? String(rawPhone) : 'Unknown',
            status: 'FAILED',
            error: err?.message || 'Error desconocido'
          }
        });
      } catch (logErr) {
        console.error("No se pudo guardar el log de error:", logErr);
      }
    }

    // 5. CADENCIA DE SEGURIDAD (Delays)
    if (i < leadsData.length - 1) {
      let delayTime = 500; // Base: 500ms
      if ((i + 1) % 21 === 0) {
        delayTime = 3000; // Cada 21: 3000ms
        console.log(`[Campaign] Pausa larga de 3s (limite de 21 mensajes)`);
      } else if ((i + 1) % 3 === 0) {
        delayTime = 1000; // Cada 3: 1000ms
        console.log(`[Campaign] Pausa corta de 1s (bloque de 3)`);
      }
      await new Promise(r => setTimeout(r, delayTime));
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

import { unstable_noStore as noStore } from 'next/cache';

export async function fetchCampaignLogs(campaignId: string) {
  noStore();
  return await prisma.campaignLog.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' }
  });
}
