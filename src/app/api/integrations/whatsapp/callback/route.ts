import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { encrypt } from '@/lib/encryption'

const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'

/**
 * POST — Embedded Signup (popup flow)
 * 
 * El frontend manda: { code, waba_id, phone_number_id, business_id }
 * Estos vienen directamente del sessionInfoListener del FB SDK.
 * 
 * 1. Intercambia code → short-lived token → long-lived token
 * 2. Suscribe app a los webhooks de la WABA del cliente (usando SYSTEM_USER_TOKEN)
 * 3. Guarda credenciales cifradas en DB
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { code, waba_id, phone_number_id, business_id } = body

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const APP_ID     = process.env.META_APP_ID!
  const APP_SECRET = process.env.META_APP_SECRET!
  const SYSTEM_USER_TOKEN = process.env.SYSTEM_USER_TOKEN!

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json({ error: 'Meta App credentials not configured' }, { status: 500 })
  }

  try {
    console.log('[WA Embedded Signup] code:', code?.substring(0, 20) + '...')
    console.log('[WA Embedded Signup] waba_id:', waba_id, '| phone_number_id:', phone_number_id)

    // 1. Intercambiar code por short-lived token
    const tokenUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('code', code)

    const tokenRes  = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[WA Embedded Signup] Token exchange error:', tokenData)
      return NextResponse.json({ 
        error: 'Failed to exchange token', 
        errorMessage: 'No se pudo obtener el token de acceso. Inténtalo de nuevo.' 
      }, { status: 400 })
    }

    const shortLivedToken = tokenData.access_token

    // 2. Intercambiar por long-lived token (~60 días)
    const llUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`)
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes  = await fetch(llUrl.toString())
    const llData = await llRes.json()
    const longLivedToken = llData.access_token || shortLivedToken
    console.log('[WA Embedded Signup] Long-lived token OK:', !!llData.access_token)

    // 3. Suscribir la WABA del cliente a los webhooks de Abita
    //    Usamos el SYSTEM_USER_TOKEN (no el del cliente) para suscribir
    if (waba_id && SYSTEM_USER_TOKEN) {
      const subRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${waba_id}/subscribed_apps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SYSTEM_USER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })
      const subData = await subRes.json()
      console.log('[WA Embedded Signup] Webhook subscription:', JSON.stringify(subData))
    } else {
      console.warn('[WA Embedded Signup] waba_id or SYSTEM_USER_TOKEN missing — skipping webhook subscription')
    }

    // 4. Buscar proyecto del cliente y guardar credenciales
    const project = await prisma.project.findFirst({ where: { clientId: user.id } })

    if (!project) {
      return NextResponse.json({ 
        error: 'No project found', 
        errorMessage: 'No se encontró un proyecto asociado a tu cuenta.' 
      }, { status: 404 })
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        whatsappToken:      encrypt(longLivedToken),
        whatsappPhoneId:    phone_number_id || '',
        whatsappBusinessId: waba_id || business_id || '',
      },
    })

    await prisma.integration.upsert({
      where: { clientId_provider: { clientId: user.id, provider: 'meta_whatsapp' } },
      create: { clientId: user.id, provider: 'meta_whatsapp', status: 'active' },
      update: { status: 'active', oauthState: null },
    })

    console.log('[WA Embedded Signup] Credenciales guardadas. Project:', project.id, '| Phone:', phone_number_id, '| WABA:', waba_id)
    return NextResponse.json({ success: true, phoneId: phone_number_id, wabaId: waba_id })

  } catch (err: any) {
    console.error('[WA Embedded Signup] Error:', err.message)
    return NextResponse.json({ 
      error: err.message, 
      errorMessage: 'Ocurrió un error inesperado al conectar WhatsApp.' 
    }, { status: 500 })
  }
}
