import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { encrypt } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const BASE_URL   = process.env.NEXTAUTH_URL!
  const APP_ID     = process.env.META_APP_ID!
  const APP_SECRET = process.env.META_APP_SECRET!
  const REDIRECT_URI = `${BASE_URL}/api/integrations/whatsapp/callback`

  if (error) {
    console.error('[WhatsApp OAuth] Error from Meta:', error)
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=whatsapp_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=invalid_callback`)
  }

  // Validar CSRF state
  if (state) {
    const integration = await prisma.integration.findFirst({
      where: { oauthState: state, provider: 'meta_whatsapp', status: 'pending' }
    })
    if (!integration) {
      console.error('[WhatsApp OAuth] Invalid or expired state:', state)
      return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=invalid_state`)
    }
  }

  try {
    console.log('[WA OAuth GET] code recibido:', code?.substring(0, 20) + '...')
    console.log('[WA OAuth GET] REDIRECT_URI:', REDIRECT_URI)

    // 1. Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code)

    const tokenRes  = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[WA OAuth GET] Short-lived token error:', tokenData)
      return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=token_failed`)
    }

    const shortLivedToken = tokenData.access_token
    console.log('[WA OAuth GET] Short-lived token OK')

    // 2. Exchange for long-lived token
    const llUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes  = await fetch(llUrl.toString())
    const llData = await llRes.json()
    const longLivedToken = llData.access_token || shortLivedToken
    console.log('[WA OAuth GET] Long-lived token OK:', !!llData.access_token)

    // 3. Fetch WABAs via /me/businesses
    const bizRes  = await fetch(`https://graph.facebook.com/v22.0/me/businesses?access_token=${longLivedToken}`)
    const bizData = await bizRes.json()
    console.log('[WA OAuth GET] Businesses:', JSON.stringify(bizData?.data?.map((b: any) => b.id)))

    let wabaId: string | null = null
    let phoneId: string | null = null

    if (bizData.data && bizData.data.length > 0) {
      const bizId = bizData.data[0].id
      const wabaRes  = await fetch(`https://graph.facebook.com/v22.0/${bizId}/owned_whatsapp_business_accounts?access_token=${longLivedToken}`)
      const wabaData = await wabaRes.json()
      console.log('[WA OAuth GET] WABAs:', JSON.stringify(wabaData?.data?.map((w: any) => w.id)))

      if (wabaData.data && wabaData.data.length > 0) {
        wabaId = wabaData.data[0].id
        const phoneRes  = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`)
        const phoneData = await phoneRes.json()
        console.log('[WA OAuth GET] Phones:', JSON.stringify(phoneData?.data?.map((p: any) => p.id)))
        if (phoneData.data && phoneData.data.length > 0) {
          phoneId = phoneData.data[0].id
        }
      }
    }

    // 4. Buscar proyecto del usuario via state
    if (state) {
      const integration = await prisma.integration.findFirst({
        where: { oauthState: state, provider: 'meta_whatsapp' }
      })
      if (integration) {
        const project = await prisma.project.findFirst({ where: { clientId: integration.clientId } })
        if (project) {
          await prisma.project.update({
            where: { id: project.id },
            data: {
              whatsappToken: encrypt(longLivedToken),
              whatsappPhoneId: phoneId || '',
              whatsappBusinessId: wabaId || '',
            }
          })
          await prisma.integration.update({
            where: { id: integration.id },
            data: { status: 'active', oauthState: null }
          })
          console.log('[WA OAuth GET] Credenciales guardadas para proyecto:', project.id)
        }
      }
    }

    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&success=whatsapp`)
  } catch (err: any) {
    console.error('[WA OAuth GET] Error:', err.message)
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=oauth_failed`)
  }
}

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
