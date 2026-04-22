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
  try {
    const project = await getProjectWithCredentials() as any;
    if (!project.whatsappBusinessId || !project.whatsappToken) {
      return { error: 'Configura el WhatsApp Business ID y el Access Token en Configuración.', templates: [] };
    }
    let templates = await getApprovedTemplates(project.whatsappBusinessId, project.whatsappToken);
    
    // Filtro por Grupo de Plantillas (Prefijo)
    const prefix = project.client?.templateGroup;
    if (prefix) {
      console.log(`[Templates] Filtrando plantillas para grupo: ${prefix}`);
      templates = templates.filter((t: any) => t.name.startsWith(prefix));
    }

    return { templates, prefix, error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al cargar plantillas', templates: [] };
  }
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

  revalidatePath('/campaigns');
  return { 
    id: campaign.id,
    leadsCount: leadsData.length
  };
}

export async function fetchCampaigns() {
  const project = await getProjectWithCredentials();
  return await prisma.campaign.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' }
  });
}

// ──────────────────────────────────────────────
// Client-driven worker — sends one message per call to avoid timeouts
// ──────────────────────────────────────────────
export async function processCampaignLead(
  campaignId: string,
  leadIndex: number,
  botActive: boolean = false,
  customTemplateText?: string,
  customHeaderUrl?: string,
  isDryRun: boolean = false
) {
  const project = await getProjectWithCredentials();
  
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId }
  });

  if (!campaign || !campaign.csvData) throw new Error("Campaña no encontrada o sin datos");
  if (!project.whatsappPhoneId || !project.whatsappToken) throw new Error("Credenciales de WhatsApp faltantes");

  const leadsData = JSON.parse(campaign.csvData);
  const leadData = leadsData[leadIndex];
  if (!leadData) throw new Error("Lead no encontrado en el índice proporcionado");

  // Recurso: extraer variables en un formato seguro si ya no las pasan directo del form
  const templateName = campaign.templateName;
  const templateText = customTemplateText || "Plantilla WhatsApp";
  const languageCode = "es";
  const variableMapping: Record<string, string> = JSON.parse(campaign.variableMapping || '{}');
  const headerUrl = customHeaderUrl;

  try {
    const rawPhone = leadData['#'];
    if (!rawPhone) return { success: false, log: 'Sin número' };

    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) return { success: false, log: 'Número inválido' };

    // NORMALIZACIÓN DE TELÉFONO: Forzar prefijo 503 si el número tiene 8 dígitos y no lo incluyeron en el CSV
    if (cleanPhone.length === 8) {
       cleanPhone = '503' + cleanPhone;
    }

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
      where: { phone_projectId: { phone: cleanPhone, projectId: project.id } },
      update: { 
        latestCampaignId: campaignId,
        metadata: metadataToSave,
        name: (leadName && leadName !== cleanPhone) ? leadName : undefined 
      },
      create: { phone: cleanPhone, projectId: project.id, name: leadName, latestCampaignId: campaignId, metadata: metadataToSave }
    });

    const chat = await prisma.chat.upsert({
      where: { leadId: lead.id },
      update: { botActive: botActive, lastActiveAt: new Date() },
      create: { leadId: lead.id, botActive: botActive }
    });

    // 3. Envío Meta o Simulacro
    let waResult;
    if (isDryRun) {
      console.log(`[DRY-RUN] Simulando envío a ${cleanPhone}`);
      waResult = { 
        success: true, 
        messageId: `dry_run_${Math.random().toString(36).substring(7)}`, 
        category: 'MARKETING' as const 
      };
      // Pequeño delay extra para simular latencia de red
      await new Promise(r => setTimeout(r, 100));
    } else {
      waResult = await sendWhatsAppTemplate(cleanPhone, templateName!, languageCode, components, project.whatsappPhoneId, project.whatsappToken);
    }

    if (!waResult.success) {
        throw new Error((waResult as any).raw?.error?.message || 'Error en Meta Cloud API');
    }

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

    return { success: true, phone: cleanPhone, wamid: waResult.messageId };

  } catch (err: any) {
    console.error(`[Campaign] Error procesando lead individual #${leadIndex}:`, err);
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
    return { success: false, error: err?.message };
  }
}

export async function finalizeCampaign(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' }
  });
  revalidatePath('/campaigns');
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
