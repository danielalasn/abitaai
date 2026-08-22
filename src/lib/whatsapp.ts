/** 
 * WhatsApp Cloud API helpers.
 * Reads credentials from the BotConfig stored in DB so each project 
 * can have its own number/token — no hardcoded .env needed for clients.
 */

// ──────────────────────────────────────────────
// Result type for all WA send operations
// ──────────────────────────────────────────────
export interface WaSendResult {
  success: boolean
  messageId: string | null
  /** WhatsApp billing category: SERVICE (free within 24h), MARKETING, UTILITY */
  category: 'SERVICE' | 'MARKETING' | 'UTILITY' | null
  friendlyError?: string
  raw: any
}

// Detecta el tipo de media de WhatsApp según MIME type
export function getWaMediaType(mimeType: string): 'image' | 'document' | 'video' | 'audio' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export function translateWaError(error: any): string {
  if (!error) return 'Error desconocido de conexión';
  
  const code = error.code;
  const subcode = error.error_subcode;
  const message = error.message || '';

  // Diccionario de errores comunes de Meta
  const errorMap: Record<number, string> = {
    133010: "El número de teléfono no está registrado o verificado en Meta. Ve a Facebook Developers y asegúrate de que el estado sea 'Registrado'.",
    131030: "Ventana de 24 horas cerrada. No puedes enviar un mensaje libre, debes usar una Plantilla para iniciar la conversación.",
    132000: "El método de pago de tu cuenta de WhatsApp no es válido o no tiene fondos.",
    130429: "Has superado el límite de mensajes permitidos para este número (Rate limit).",
    131026: "El mensaje no fue entregado porque el número de destino es inválido o no existe en WhatsApp.",
    190: "Tu Access Token ha expirado o es inválido. Ve a Configuración y actualiza el Token.",
    100: "Error en los datos enviados. Verifica que el número de teléfono tenga el formato internacional (ej: 50377770000).",
  };

  return errorMap[code] || `WhatsApp Error (${code}): ${message}`;
}

// ──────────────────────────────────────────────
// Send a FREE-TEXT message (only valid inside a 24h session window)
// These are always categorised as SERVICE by Meta
// ──────────────────────────────────────────────
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  phoneNumberId: string,
  accessToken: string
): Promise<WaSendResult> {
  if (!accessToken || !phoneNumberId) {
    console.error('[WA] Missing credentials — skipping send')
    return { success: false, messageId: null, category: null, raw: null }
  }

  const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`
  const cleanTo = to.replace(/[^0-9]/g, '');

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { body: text },
    };
    console.log('[WA] Sending text to:', cleanTo);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[WA] ERROR DETECTADO:', {
        status: res.status,
        message: data.error?.message,
        code: data.error?.code,
        subcode: data.error?.error_subcode
      })
      return { 
        success: false, 
        messageId: null, 
        category: null, 
        friendlyError: translateWaError(data.error),
        raw: data 
      }
    } else {
      const msgId = data.messages?.[0]?.id || null
      console.log('[WA] Mensaje enviado correctamente. ID:', msgId)
      // Text messages within 24h window are always SERVICE
      return { success: true, messageId: msgId, category: 'SERVICE', raw: data }
    }
  } catch (err) {
    console.error('[WA] sendTextMessage network error:', err)
    return { success: false, messageId: null, category: null, raw: null }
  }
}

// ──────────────────────────────────────────────
// Send a MEDIA message (image, document, video, audio)
// mediaUrl must be a publicly accessible URL
// ──────────────────────────────────────────────
export type WaMediaType = 'image' | 'document' | 'video' | 'audio'

// ──────────────────────────────────────────────
// Upload media to WhatsApp Media API and return the media ID.
// This is required to send Voice Notes (audio as voice note, not audio file).
// ──────────────────────────────────────────────
async function uploadMediaToWhatsApp(
  mediaUrl: string,
  mimeType: string,
  phoneNumberId: string,
  accessToken: string
): Promise<string | null> {
  const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';
  try {
    // Descargar el archivo desde Supabase
    const fileRes = await fetch(mediaUrl);
    if (!fileRes.ok) {
      console.error('[WA Upload] Error descargando archivo:', mediaUrl);
      return null;
    }
    const fileBuffer = await fileRes.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', fileBlob, 'voice-note.ogg');

    const uploadRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.id) {
      console.error('[WA Upload] Error al subir media a Meta:', uploadData);
      return null;
    }
    console.log('[WA Upload] Media subida a Meta con ID:', uploadData.id);
    return uploadData.id as string;
  } catch (err) {
    console.error('[WA Upload] Network error:', err);
    return null;
  }
}

export async function sendWhatsAppMedia(
  to: string,
  mediaUrl: string,
  mediaType: WaMediaType,
  phoneNumberId: string,
  accessToken: string,
  caption?: string,
  filename?: string
): Promise<WaSendResult> {
  if (!accessToken || !phoneNumberId) {
    return { success: false, messageId: null, category: null, raw: null }
  }

  const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`
  const cleanTo = to.replace(/[^0-9]/g, '');

  const mediaPayload: any = {}
  if (mediaType === 'audio') {
    // Para que WhatsApp muestre como Voice Note, subir primero a Meta Media API y enviar por ID
    const mediaId = await uploadMediaToWhatsApp(mediaUrl, 'audio/ogg', phoneNumberId, accessToken);
    if (mediaId) {
      mediaPayload.id = mediaId;
    } else {
      console.warn('[WA] No se pudo subir audio a Meta, enviando por link como fallback.');
      mediaPayload.link = mediaUrl;
    }
    mediaPayload.voice = true; // CLAVE: sin esto WhatsApp lo trata como audio basico
  } else {
    mediaPayload.link = mediaUrl;
    if (caption && (mediaType === 'image' || mediaType === 'video')) mediaPayload.caption = caption;
    if (filename && mediaType === 'document') mediaPayload.filename = filename;
  }

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: mediaType,
      [mediaType]: mediaPayload,
    };
    console.log('[WA] Sending media to:', cleanTo, 'Type:', mediaType, 'URL:', mediaUrl);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[WA] MEDIA ERROR:', data.error)
      return {
        success: false,
        messageId: null,
        category: null,
        friendlyError: translateWaError(data.error),
        raw: data,
      }
    }
    const msgId = data.messages?.[0]?.id || null
    console.log('[WA] Media enviado. ID:', msgId)
    return { success: true, messageId: msgId, category: 'SERVICE', raw: data }
  } catch (err) {
    console.error('[WA] sendMedia network error:', err)
    return { success: false, messageId: null, category: null, raw: null }
  }
}


// ──────────────────────────────────────────────
// Send a TEMPLATE message (required for campaigns / >24h sessions)
// components: array of parameter objects for each component of the template
// ──────────────────────────────────────────────
export interface TemplateComponent {
  type: 'body' | 'header' | 'button'
  sub_type?: string
  index?: number | string
  parameters: (
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'video'; video: { link: string } }
    | { type: 'document'; document: { link: string; filename?: string } }
  )[]
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'es',
  components: TemplateComponent[],
  phoneNumberId: string,
  accessToken: string,
  /** Override the default category. Templates are MARKETING by default. */
  templateCategory: 'MARKETING' | 'UTILITY' = 'MARKETING'
): Promise<WaSendResult> {
  if (!accessToken || !phoneNumberId) {
    console.error('[WA] Missing credentials — skipping template send')
    return { success: false, messageId: null, category: null, raw: null }
  }

  const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`
  const cleanTo = to.replace(/[^0-9]/g, '');

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components.length > 0 ? components : undefined,
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[WA] ERROR EN PLANTILLA:', {
        status: res.status,
        message: data.error?.message,
        code: data.error?.code,
        subcode: data.error?.error_subcode
      })
      return { 
        success: false, 
        messageId: null, 
        category: null, 
        friendlyError: translateWaError(data.error),
        raw: data 
      }
    } else {
      const msgId = data.messages?.[0]?.id || null
      console.log('[WA] Plantilla enviada con éxito. ID:', msgId)
      return { success: true, messageId: msgId, category: templateCategory, raw: data }
    }
  } catch (err) {
    console.error('[WA] sendTemplate network error:', err)
    return { success: false, messageId: null, category: null, raw: null }
  }
}

// ──────────────────────────────────────────────
// Fetch approved templates for a WABID
// ──────────────────────────────────────────────
export async function getApprovedTemplates(
  businessId: string,
  accessToken: string
) {
  if (!businessId || !accessToken) return []

  try {
  const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${businessId}/message_templates?status=APPROVED&fields=name,components,language,category&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    )
    const data = await res.json()
    if (!res.ok) {
      console.error('[WA] getTemplates error:', data)
      return []
    }
    return (data.data as any[]) ?? []
  } catch (err) {
    console.error('[WA] getTemplates network error:', err)
    return []
  }
}
