'use server';

import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getApprovedTemplates } from '@/lib/whatsapp';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';
import { getCurrentProject } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { after } from 'next/server';
import { getCurrentMonthUsage } from '@/lib/subscription';

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
  noStore();
  try {
    const project = await getProjectWithCredentials() as any;
    console.log("[fetchMetaTemplates] Project fetched:", project.id, "WABA ID:", project.whatsappBusinessId);
    
    if (!project.whatsappBusinessId || !project.whatsappToken) {
      console.log("[fetchMetaTemplates] Missing credentials, returning empty.");
      return { error: 'Configura el WhatsApp Business ID y el Access Token en Configuración.', templates: [] };
    }
    const decryptedToken = decrypt(project.whatsappToken);
    let templates = await getApprovedTemplates(project.whatsappBusinessId, decryptedToken!);
    
    // Filtro por Grupo de Plantillas (Prefijo) - solo si el cliente tiene uno configurado
    const prefix = project.client?.templateGroup;
    if (prefix) {
      console.log(`[Templates] Filtrando plantillas para grupo: ${prefix}`);
      templates = templates.filter((t: any) => t.name.startsWith(prefix));
    } else {
      console.log(`[Templates] Sin grupo configurado, mostrando todas las plantillas aprobadas.`);
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
  templateCategory: string, // MARKETING o UTILITY
  headerUrl?: string, // Nuevo: URL de imagen o nombre de columna CSV
  botActive: boolean = true,
  headerMediaType?: string // NEW: 'IMAGE' | 'VIDEO' | 'DOCUMENT'
) {
  const project = await getProjectWithCredentials();

  if (!project.whatsappPhoneId || !project.whatsappToken) {
    throw new Error('Configura el Phone Number ID y el Access Token en Configuración antes de lanzar campañas.');
  }

  // --- Verificación de Límite de Suscripción ---
  if (project.clientId) {
    const client = await prisma.client.findUnique({ where: { id: project.clientId }, select: { messageLimit: true } });
    if (client && client.messageLimit !== null) {
      const currentUsage = await getCurrentMonthUsage(project.clientId);
      if (currentUsage + leadsData.length > client.messageLimit) {
        throw new Error(`Límite mensual excedido. Límite: ${client.messageLimit}. Uso actual: ${currentUsage}. Intentas enviar: ${leadsData.length} mensajes.`);
      }
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      projectId: project.id,
      name,
      status: 'RUNNING',
      leadCount: leadsData.length,
      csvData: JSON.stringify(leadsData),
      templateName,
      templateCategory,
      languageCode,
      variableMapping: JSON.stringify({
        ...variableMapping,
        __headerUrl: headerUrl || '',
        __headerMediaType: headerMediaType || 'IMAGE',
        __templateText: templateText || '',
        __botActive: botActive ? 'true' : 'false'
      }),
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
  if (campaign.projectId !== project.id) throw new Error("Acceso denegado");
  if (!project.whatsappPhoneId || !project.whatsappToken) throw new Error("Credenciales de WhatsApp faltantes");

  const leadsData = JSON.parse(campaign.csvData);
  const leadData = leadsData[leadIndex];
  if (!leadData) throw new Error("Lead no encontrado en el índice proporcionado");

  // Recurso: extraer variables en un formato seguro si ya no las pasan directo del form
  const templateName = campaign.templateName;
  
  const rawMapping = JSON.parse(campaign.variableMapping || '{}');
  const variableMapping: Record<string, string> = {};
  let headerUrl = customHeaderUrl;
  let templateText = customTemplateText;
  let realBotActive = botActive;
  let realIsDryRun = isDryRun;
  let buttonsConfigJson: string | undefined = undefined;

  Object.entries(rawMapping).forEach(([k, v]) => {
    if (k === '__headerUrl' && !headerUrl) headerUrl = v as string;
    if (k === '__templateText' && !templateText) templateText = v as string;
    if (k === '__botActive') realBotActive = v === 'true';
    if (k === '__isDryRun') realIsDryRun = v === 'true';
    if (k === '__buttonsConfig') buttonsConfigJson = v as string;
    if (!k.startsWith('__')) {
      variableMapping[k] = v as string;
    }
  });

  if (!templateText) templateText = "Plantilla WhatsApp";
  const languageCode = campaign.languageCode || "es";

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
    const bodyEntries = Object.entries(variableMapping)
      .filter(([k]) => !k.startsWith('button_'))
      .sort(([a], [b]) => Number(a) - Number(b));

    const bodyParams = bodyEntries.map(([, colName]) => ({
      type: 'text' as const,
      text: String(leadData[colName] ?? ''),
    }));

    const components: any[] = bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];

    // Process button URL parameters
    const buttonParamsMap: Record<string, string> = {};
    Object.entries(variableMapping).forEach(([k, colName]) => {
      if (k.startsWith('button_')) {
        const btnIdx = k.replace('button_', '');
        buttonParamsMap[btnIdx] = String(leadData[colName] ?? '');
      }
    });

    Object.entries(buttonParamsMap).forEach(([btnIdxStr, val]) => {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: btnIdxStr,
        parameters: [
          {
            type: 'text',
            text: val,
          },
        ],
      });
    });

    let realUrl: string | undefined = undefined;
    // Detect header media type from variableMapping
    const headerMediaTypeStored = rawMapping.__headerMediaType as string | undefined;
    if (headerUrl) {
      const isMapping = headerUrl.startsWith('{{') && headerUrl.endsWith('}}');
      realUrl = isMapping ? String(leadData[headerUrl.replace(/[{}]/g, '')] ?? '') : headerUrl;
      if (realUrl && realUrl.startsWith('http')) {
        // Determine the media type: default to 'image' for backward compat
        const mediaType = headerMediaTypeStored === 'VIDEO' ? 'video' :
                          headerMediaTypeStored === 'DOCUMENT' ? 'document' : 'image';
        const mediaParam: any = mediaType === 'video'
          ? { type: 'video', video: { link: realUrl } }
          : mediaType === 'document'
            ? { type: 'document', document: { link: realUrl } }
            : { type: 'image', image: { link: realUrl } };
        components.unshift({ type: 'header', parameters: [mediaParam] });
      }
    }

    let previewText = templateText;
    bodyEntries.forEach(([k, col]) => {
        const val = leadData[col] ?? '';
        previewText = previewText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
    });
    if (!previewText) previewText = `Plantilla: ${templateName}`;

    // 2. Transacción de DB: Upsert Lead + Chat + Message
    const metadataToSave = { ...leadData };
    delete metadataToSave['#'];
    const nameKey = Object.keys(leadData).find(k => ['nombre', 'nombres', 'name', 'names'].includes(k.toLowerCase().trim()));
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
      update: { botActive: realBotActive, autoWakeBot: realBotActive, lastActiveAt: new Date() },
      create: { leadId: lead.id, botActive: realBotActive, autoWakeBot: realBotActive }
    });

    // 3. Envío Meta o Simulacro
    let waResult;
    if (realIsDryRun) {
      console.log(`[DRY-RUN] Simulando envío a ${cleanPhone}`);
      waResult = { 
        success: true, 
        messageId: `dry_run_${Math.random().toString(36).substring(7)}`, 
        category: 'MARKETING' as const 
      };
      // Pequeño delay extra para simular latencia de red
      await new Promise(r => setTimeout(r, 100));
    } else {
      waResult = await sendWhatsAppTemplate(
        cleanPhone, 
        templateName!, 
        languageCode, 
        components, 
        project.whatsappPhoneId!, 
        decrypt(project.whatsappToken)!,
        (campaign.templateCategory as any) || 'MARKETING'
      );
    }

    if (!waResult.success) {
        throw new Error((waResult as any).raw?.error?.message || 'Error en Meta Cloud API');
    }

    // 4. Guardar mensaje y LOG de campaña
    await prisma.message.create({
      data: { 
        chatId: chat.id, role: 'agent', content: previewText, 
        waCategory: waResult.category || 'MARKETING', imageUrl: realUrl,
        wamid: waResult.messageId, // Rastreo de estado para el inbox
        buttonsConfig: buttonsConfigJson || null
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
  const project = await getCurrentProject();
  if (!project) throw new Error("Unauthenticated");
  
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.projectId !== project.id) throw new Error("Acceso denegado");

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
  const project = await getCurrentProject();
  if (!project) return [];
  
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.projectId !== project.id) return [];

  const logs = await prisma.campaignLog.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' }
  });

  const phones = logs.map(l => l.phone);
  const leads = await prisma.lead.findMany({
    where: { projectId: project.id, phone: { in: phones } },
    select: { 
      phone: true, 
      name: true,
      chat: {
        select: {
          messages: {
            where: {
              role: 'user',
              mediaType: 'button_reply',
              createdAt: { gt: campaign.createdAt }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    }
  });

  const leadMap = new Map(leads.map(l => [l.phone, {
    name: l.name,
    buttonReplies: l.chat?.messages?.map(m => m.content) || []
  }]));

  return logs.map(l => {
    const leadInfo = leadMap.get(l.phone);
    return {
      ...l,
      leadName: leadInfo?.name || null,
      buttonReplies: leadInfo?.buttonReplies || []
    };
  });
}

export async function updateCampaignStatus(campaignId: string, status: string) {
  const project = await getCurrentProject();
  if (!project) throw new Error("Unauthenticated");
  
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.projectId !== project.id) throw new Error("Acceso denegado");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status }
  });
  revalidatePath('/campaigns');
}

export async function prepareRetryFailed(campaignId: string) {
  const project = await getCurrentProject();
  if (!project) throw new Error("Unauthenticated");
  
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.projectId !== project.id) throw new Error("Acceso denegado");

  // Eliminar los logs fallidos de esta campaña
  await prisma.campaignLog.deleteMany({
    where: {
      campaignId,
      status: 'FAILED'
    }
  });

  // Poner el estado de la campaña en RUNNING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING' }
  });

  revalidatePath('/campaigns');
}
