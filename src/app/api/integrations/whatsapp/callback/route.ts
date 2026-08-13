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
    console.log('[WA Embedded Signup] ═══════ INICIO ═══════')
    console.log('[WA Embedded Signup] Usuario:', user?.id, '| email:', user?.email)
    console.log('[WA Embedded Signup] Body recibido del frontend:', JSON.stringify({ code: code?.substring(0, 20) + '...', waba_id, phone_number_id, business_id }))

    // BACKEND FALLBACK: Si el frontend no pudo capturar waba_id o phone_number_id
    let finalWabaId = waba_id;
    let finalPhoneId = phone_number_id;

    if (!finalWabaId || !finalPhoneId) {
      console.log('[WA Embedded Signup] Fallback: Intentando recuperar IDs...');
      if (!finalWabaId) {
        // Buscar el webhook PARTNER_APP_INSTALLED más reciente (últimos 5 min)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentWebhooks = await prisma.webhookEvent.findMany({
          where: { provider: 'whatsapp', createdAt: { gte: fiveMinsAgo } },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
        for (const wh of recentWebhooks) {
          const payload = wh.payload as any;
          const wabaInfo = payload?.entry?.[0]?.changes?.[0]?.value?.waba_info;
          if (payload?.entry?.[0]?.changes?.[0]?.value?.event === 'PARTNER_APP_INSTALLED' && wabaInfo?.waba_id) {
            finalWabaId = wabaInfo.waba_id;
            console.log('[WA Embedded Signup] waba_id recuperado del webhook:', finalWabaId);
            break;
          }
        }
      }

      if (finalWabaId && !finalPhoneId && SYSTEM_USER_TOKEN) {
        try {
          const phonesRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${finalWabaId}/phone_numbers?access_token=${SYSTEM_USER_TOKEN}`);
          const phonesData = await phonesRes.json();
          if (phonesData.data && phonesData.data.length > 0) {
            phonesData.data.sort((a: any, b: any) => new Date(b.last_onboarded_time || 0).getTime() - new Date(a.last_onboarded_time || 0).getTime());
            finalPhoneId = phonesData.data[0].id;
            console.log('[WA Embedded Signup] phone_number_id recuperado de la API:', finalPhoneId);
          }
        } catch (e) {
          console.error('[WA Embedded Signup] Error recuperando phone_number_id:', e);
        }
      }
    }

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
    if (!llData.access_token) {
      console.warn('[WA Embedded Signup] ADVERTENCIA: No se obtuvo long-lived token, se usará el short-lived. llData:', JSON.stringify(llData))
    }

    // 3. Suscribir la WABA del cliente a los webhooks de Abita
    //    Usamos el SYSTEM_USER_TOKEN (no el del cliente) para suscribir
    if (finalWabaId && SYSTEM_USER_TOKEN) {
      console.log('[WA Embedded Signup] Suscribiendo webhooks para WABA:', finalWabaId)
      const subRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${finalWabaId}/subscribed_apps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SYSTEM_USER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })
      const subData = await subRes.json()
      console.log('[WA Embedded Signup] Webhook subscription result:', JSON.stringify(subData))
    } else {
      console.warn('[WA Embedded Signup] ⚠️ waba_id o SYSTEM_USER_TOKEN faltante — se omite suscripción de webhooks. finalWabaId:', finalWabaId, '| hasSystemToken:', !!SYSTEM_USER_TOKEN)
    }

    // 4. Buscar proyecto del cliente y guardar credenciales
    const project = await prisma.project.findFirst({ where: { clientId: user.id } })

    if (!project) {
      return NextResponse.json({ 
        error: 'No project found', 
        errorMessage: 'No se encontró un proyecto asociado a tu cuenta.' 
      }, { status: 404 })
    }

    console.log('[WA Embedded Signup] ─── Resumen de IDs capturados ───')
    console.log('[WA Embedded Signup] finalWabaId:', finalWabaId || '(vacío)')
    console.log('[WA Embedded Signup] finalPhoneId:', finalPhoneId || '(vacío)')
    console.log('[WA Embedded Signup] business_id (del frontend):', business_id || '(vacío)')
    console.log('[WA Embedded Signup] Proyecto actual en DB → phoneId:', project.whatsappPhoneId || '(vacío)', '| wabaId:', project.whatsappBusinessId || '(vacío)')

    const updateData: any = {
      whatsappToken: encrypt(longLivedToken),
    };
    // Solo sobreescribir IDs si se capturaron — nunca reemplazar con string vacío
    if (finalPhoneId) updateData.whatsappPhoneId = finalPhoneId;
    else if (!project.whatsappPhoneId) updateData.whatsappPhoneId = '';

    if (finalWabaId || business_id) updateData.whatsappBusinessId = finalWabaId || business_id;
    else if (!project.whatsappBusinessId) updateData.whatsappBusinessId = '';

    console.log('[WA Embedded Signup] Datos que SE GUARDARÁN en DB:', JSON.stringify(updateData).replace(updateData.whatsappToken, '[TOKEN_CIFRADO]'))

    await prisma.project.update({
      where: { id: project.id },
      data: updateData,
    })

    await prisma.integration.upsert({
      where: { clientId_provider: { clientId: user.id, provider: 'meta_whatsapp' } },
      create: { clientId: user.id, provider: 'meta_whatsapp', status: 'active' },
      update: { status: 'active', oauthState: null },
    })

    console.log('[WA Embedded Signup] ✅ Credenciales guardadas. Project:', project.id, '| Phone:', finalPhoneId || '(no capturado)', '| WABA:', finalWabaId || '(no capturado)')
    console.log('[WA Embedded Signup] ═══════ FIN ═══════')
    
    // Invalidate the cache for the settings page so loadProject fetches fresh data
    const { revalidatePath } = require('next/cache');
    revalidatePath('/settings');

    return NextResponse.json({ success: true, phoneId: finalPhoneId, wabaId: finalWabaId })

  } catch (err: any) {
    console.error('[WA Embedded Signup] Error:', err.message)
    return NextResponse.json({ 
      error: err.message, 
      errorMessage: 'Ocurrió un error inesperado al conectar WhatsApp.' 
    }, { status: 500 })
  }
}
