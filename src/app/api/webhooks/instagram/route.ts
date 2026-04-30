import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { simulateIncomingMessage } from '@/app/actions/inbox'
import crypto from 'crypto'
import { enqueueMessage } from '@/lib/queue'

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
    const signature = req.headers.get('x-hub-signature-256');
    const rawBody = await req.text();
    const appSecret = process.env.META_APP_SECRET;

    // ─── VERIFICACIÓN DE FIRMA (HMAC-SHA256) ───
    if (appSecret && signature) {
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.warn('[Instagram Webhook] Firma inválida.');
        return new Response('Invalid signature', { status: 401 });
      }
    } else if (!signature && process.env.NODE_ENV === 'production') {
      return new Response('Missing signature', { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log('[Instagram Webhook] Incoming:', JSON.stringify(body))

    const entry = body.entry?.[0]
    if (!entry) return NextResponse.json({ status: 'no_entry' })

    // ─── IDEMPOTENCIA ───
    const messaging = entry.messaging?.[0];
    const eventId = messaging?.message?.mid || entry.id;
    if (eventId) {
      const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
      if (existing) {
        console.log(`[Instagram Webhook] Evento duplicado omitido: ${eventId}`);
        return NextResponse.json({ status: 'ok', duplicated: true });
      }
      await prisma.webhookEvent.create({
        data: { id: eventId, provider: 'instagram', payload: body }
      }).catch(() => {});
    }

    // ── Instagram DM flow ──────────────────────────────────────────────────
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
        `[Instagram Webhook] DM from ${senderId} → Encolando para procesamiento asíncrono`
      )

      // Encolar mensaje en lugar de procesar directamente
      await enqueueMessage(senderId, {
        text,
        profileName: `@${senderId}`,
        phoneId: recipientId,
        channel: 'instagram'
      });

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
