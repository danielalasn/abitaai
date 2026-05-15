import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { encrypt } from '@/lib/encryption'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || process.env.META_APP_ID
    const APP_SECRET = process.env.META_APP_SECRET
    const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/callback`

    if (!APP_ID || !APP_SECRET) {
      return NextResponse.json({ error: 'Meta App credentials not configured' }, { status: 500 })
    }

    console.log('[WA OAuth DEBUG] ============================================')
    console.log('[WA OAuth DEBUG] code recibido:', code?.substring(0, 20) + '...')
    console.log('[WA OAuth DEBUG] APP_ID:', APP_ID)
    console.log('[WA OAuth DEBUG] REDIRECT_URI:', REDIRECT_URI)
    console.log('[WA OAuth DEBUG] ============================================')

    // 1. Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[WhatsApp OAuth] Short-lived token error:', tokenData)
      return NextResponse.json({ error: 'Failed to exchange token', detail: tokenData }, { status: 400 })
    }

    const shortLivedToken = tokenData.access_token
    console.log('[WhatsApp OAuth] Short-lived token OK, expires_in:', tokenData.expires_in)

    // 2. Exchange for long-lived token
    const llUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes = await fetch(llUrl.toString())
    const llData = await llRes.json()

    const longLivedToken = llData.access_token || shortLivedToken
    console.log('[WhatsApp OAuth] Long-lived token OK:', !!llData.access_token, 'expires_in:', llData.expires_in)

    // 3. Fetch user's WABAs
    const bizRes = await fetch(`https://graph.facebook.com/v22.0/me/businesses?access_token=${longLivedToken}`)
    const bizData = await bizRes.json()
    console.log('[WhatsApp OAuth] Businesses:', JSON.stringify(bizData?.data?.map((b: any) => b.id)))

    if (!bizData.data || bizData.data.length === 0) {
      return NextResponse.json({ error: 'No businesses found', detail: bizData }, { status: 400 })
    }

    const bizId = bizData.data[0].id

    const wabaRes = await fetch(`https://graph.facebook.com/v22.0/${bizId}/owned_whatsapp_business_accounts?access_token=${longLivedToken}`)
    const wabaData = await wabaRes.json()
    console.log('[WhatsApp OAuth] WABAs:', JSON.stringify(wabaData?.data?.map((w: any) => w.id)))

    if (!wabaData.data || wabaData.data.length === 0) {
      return NextResponse.json({ error: 'No WhatsApp Business Accounts found', detail: wabaData }, { status: 400 })
    }

    const waba = wabaData.data[0]
    const wabaId = waba.id

    // 4. Fetch phone numbers
    const phoneRes = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`)
    const phoneData = await phoneRes.json()
    console.log('[WhatsApp OAuth] Phones:', JSON.stringify(phoneData?.data?.map((p: any) => p.id)))

    if (!phoneData.data || phoneData.data.length === 0) {
      return NextResponse.json({ error: 'No phone numbers found in WABA', detail: phoneData }, { status: 400 })
    }

    const phone = phoneData.data[0]
    const phoneId = phone.id

    // 5. Subscribe app to webhooks
    const subRes = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      body: new URLSearchParams({ access_token: longLivedToken })
    })
    const subData = await subRes.json()
    console.log('[WhatsApp OAuth] Subscribed apps:', subData)

    // 6. En el futuro registrar el phone (post /{phoneId}/register con pin) - requiere el PIN desde el cliente, pero para simplificar ahora solo guardamos el token
    
    // Buscar el primer proyecto del usuario
    const project = await prisma.project.findFirst({
      where: { clientId: user.id }
    })

    if (project) {
      // Guardar en la BD cifrado
      await prisma.project.update({
        where: { id: project.id },
        data: {
          whatsappToken: encrypt(longLivedToken),
          whatsappPhoneId: phoneId,
          whatsappBusinessId: wabaId
        }
      })
    }

    return NextResponse.json({ success: true, phoneId, wabaId })

  } catch (error: any) {
    console.error('[WhatsApp OAuth] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
