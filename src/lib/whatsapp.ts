/** 
 * WhatsApp Cloud API helpers.
 * Reads credentials from the BotConfig stored in DB so each project 
 * can have its own number/token — no hardcoded .env needed for clients.
 */

// ──────────────────────────────────────────────
// Send a FREE-TEXT message (only valid inside a 24h session window)
// ──────────────────────────────────────────────
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  phoneNumberId: string,
  accessToken: string
) {
  if (!accessToken || !phoneNumberId) {
    console.error('[WA] Missing credentials — skipping send')
    return null
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
    if (!res.ok) console.error('[WA] sendTextMessage error:', data)
    return data
  } catch (err) {
    console.error('[WA] sendTextMessage network error:', err)
    return null
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
  parameters: { type: 'text'; text: string }[]
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'es',
  components: TemplateComponent[],
  phoneNumberId: string,
  accessToken: string
) {
  if (!accessToken || !phoneNumberId) {
    console.error('[WA] Missing credentials — skipping template send')
    return null
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
    if (!res.ok) console.error('[WA] sendTemplate error:', data)
    return data
  } catch (err) {
    console.error('[WA] sendTemplate network error:', err)
    return null
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
      `https://graph.facebook.com/v19.0/${businessId}/message_templates?status=APPROVED&fields=name,components,language&limit=100`,
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
