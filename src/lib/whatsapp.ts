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

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
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
// Send a TEMPLATE message (required for campaigns / >24h sessions)
// components: array of parameter objects for each component of the template
// ──────────────────────────────────────────────
export interface TemplateComponent {
  type: 'body' | 'header' | 'button'
  sub_type?: string
  index?: number
  parameters: (
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
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

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
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
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/message_templates?status=APPROVED&fields=name,components,language,category&limit=100`,
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
