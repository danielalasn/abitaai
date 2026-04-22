import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Webhook verification (Meta sends a GET to verify the endpoint) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verified')
    return new Response(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  return new Response('Forbidden', { status: 403 })
}

/** Incoming events (DMs, story mentions, etc.) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Instagram Webhook] Incoming:', JSON.stringify(body))

    const entry = body.entry?.[0]
    if (!entry) return NextResponse.json({ status: 'no_entry' })

    // ── Instagram DM flow ──────────────────────────────────────────────────
    const messaging = entry.messaging?.[0]
    if (messaging) {
      const senderId   = messaging.sender?.id    // Instagram sender IGSID
      const recipientId = messaging.recipient?.id // Our instagram_business_account_id
      const text       = messaging.message?.text

      if (!recipientId || !text) {
        return NextResponse.json({ status: 'ignored' })
      }

      // Route to the right tenant
      const integration = await prisma.integration.findFirst({
        where: { instagramAccountId: recipientId, provider: 'meta_instagram', status: 'active' },
        include: { client: { include: { projects: true } } }
      })

      if (!integration) {
        console.warn('[Instagram Webhook] No tenant found for recipientId:', recipientId)
        return NextResponse.json({ status: 'no_tenant' })
      }

      console.log(
        `[Instagram Webhook] DM from ${senderId} → tenant: ${integration.client.name} | msg: "${text}"`
      )

      // TODO: pipe to AI agent and reply back via instagram_replies API using integration.accessToken
      // Example reply:
      // await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     recipient: { id: senderId },
      //     message: { text: 'Hola, recibí tu mensaje.' },
      //     access_token: integration.accessToken,
      //   })
      // })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[Instagram Webhook] Error:', err.message)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
