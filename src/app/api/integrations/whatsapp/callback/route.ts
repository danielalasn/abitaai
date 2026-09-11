import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'

/**
 * POST — Embedded Signup (popup flow)
 * 
 * El frontend manda: { code, waba_id, phone_number_id, business_id }
 * Estos vienen directamente del sessionInfoListener del FB SDK.
 * 
 * 1. Intercambia code → short-lived token → long-lived token (ya NO se guarda en DB)
 * 2. Suscribe app a los webhooks de la WABA del cliente (usando SYSTEM_USER_TOKEN)
 * 3. Guarda solo phone_number_id y waba_id en DB — los envíos usan SYSTEM_USER_TOKEN siempre
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

  console.log('[WA Embedded Signup] ═══════ INICIO ═══════')
  console.log('[WA Embedded Signup] ENV CHECK → APP_ID:', !!APP_ID, '| APP_SECRET:', !!APP_SECRET, '| SYSTEM_USER_TOKEN:', !!SYSTEM_USER_TOKEN)

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json({ error: 'Meta App credentials not configured' }, { status: 500 })
  }

  try {
    console.log('[WA Embedded Signup] Usuario:', user?.id, '| email:', user?.email)
    console.log('[WA Embedded Signup] Body recibido del frontend:', JSON.stringify({ code: code?.substring(0, 20) + '...', waba_id, phone_number_id, business_id }))

    // BACKEND FALLBACK: Si el frontend no pudo capturar waba_id o phone_number_id
    let finalWabaId = waba_id;
    let finalPhoneId = phone_number_id;

    console.log('[WA Embedded Signup] IDs iniciales → waba_id:', finalWabaId || '(vacío)', '| phone_number_id:', finalPhoneId || '(vacío)')

    if (!finalWabaId || !finalPhoneId) {
      console.log('[WA Embedded Signup] Fallback: Intentando recuperar IDs...');
      if (!finalWabaId) {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentWebhooks = await prisma.webhookEvent.findMany({
          where: { provider: 'whatsapp', createdAt: { gte: fiveMinsAgo } },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
        console.log('[WA Embedded Signup] Webhooks recientes encontrados:', recentWebhooks.length)
        for (const wh of recentWebhooks) {
          const payload = wh.payload as any;
          const wabaInfo = payload?.entry?.[0]?.changes?.[0]?.value?.waba_info;
          if (payload?.entry?.[0]?.changes?.[0]?.value?.event === 'PARTNER_APP_INSTALLED' && wabaInfo?.waba_id) {
            finalWabaId = wabaInfo.waba_id;
            console.log('[WA Embedded Signup] waba_id recuperado del webhook:', finalWabaId);
            break;
          }
        }
        if (!finalWabaId) {
          console.warn('[WA Embedded Signup] No se pudo recuperar waba_id del webhook fallback.')
        }
      }

      if (finalWabaId && !finalPhoneId && SYSTEM_USER_TOKEN) {
        try {
          console.log('[WA Embedded Signup] Buscando phone_number_id via API para WABA:', finalWabaId)
          const phonesRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${finalWabaId}/phone_numbers?access_token=${SYSTEM_USER_TOKEN}`);
          const phonesData = await phonesRes.json();
          console.log('[WA Embedded Signup] Respuesta phone_numbers API:', JSON.stringify(phonesData))
          if (phonesData.data && phonesData.data.length > 0) {
            phonesData.data.sort((a: any, b: any) => new Date(b.last_onboarded_time || 0).getTime() - new Date(a.last_onboarded_time || 0).getTime());
            finalPhoneId = phonesData.data[0].id;
            console.log('[WA Embedded Signup] phone_number_id recuperado de la API:', finalPhoneId);
          } else {
            console.warn('[WA Embedded Signup] API no devolvió phone_numbers. phonesData:', JSON.stringify(phonesData))
          }
        } catch (e) {
          console.error('[WA Embedded Signup] Error recuperando phone_number_id:', e);
        }
      }
    }

    // 1. Intercambiar code por short-lived token
    console.log('[WA Embedded Signup] PASO 1: Intercambiando code por short-lived token...')
    const tokenUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()
    console.log('[WA Embedded Signup] Respuesta short-lived token → status:', tokenRes.status, '| has_token:', !!tokenData.access_token, '| error:', tokenData.error || 'ninguno')

    if (!tokenData.access_token) {
      console.error('[WA Embedded Signup] Token exchange error:', tokenData)
      return NextResponse.json({ 
        error: 'Failed to exchange token', 
        errorMessage: 'No se pudo obtener el token de acceso. Inténtalo de nuevo.' 
      }, { status: 400 })
    }

    const shortLivedToken = tokenData.access_token
    console.log('[WA Embedded Signup] Short-lived token OK. expires_in:', tokenData.expires_in || 'N/A')

    // 2. Intercambiar por long-lived token (~60 días) — solo para verificar, ya NO se guarda en DB
    console.log('[WA Embedded Signup] PASO 2: Intercambiando por long-lived token...')
    const llUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`)
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes = await fetch(llUrl.toString())
    const llData = await llRes.json()
    console.log('[WA Embedded Signup] Respuesta long-lived token → status:', llRes.status, '| has_token:', !!llData.access_token, '| expires_in:', llData.expires_in || 'N/A', '| error:', llData.error || 'ninguno')
    if (!llData.access_token) {
      console.warn('[WA Embedded Signup] ADVERTENCIA: No se obtuvo long-lived token. llData:', JSON.stringify(llData))
    } else {
      console.log('[WA Embedded Signup] Long-lived token OK. NOTA: Este token NO se guarda en DB — se usa SYSTEM_USER_TOKEN para todos los envíos.')
    }

    // 3. Suscribir la WABA del cliente a los webhooks de Abita
    console.log('[WA Embedded Signup] PASO 3: Suscripción de webhooks → finalWabaId:', finalWabaId || '(vacío)', '| hasSystemToken:', !!SYSTEM_USER_TOKEN)
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
      console.log('[WA Embedded Signup] Webhook subscription → status:', subRes.status, '| result:', JSON.stringify(subData))
    } else {
      console.warn('[WA Embedded Signup] SKIP webhook subscription — falta waba_id o SYSTEM_USER_TOKEN')
    }

    // 4. Buscar proyecto del cliente y guardar credenciales (crear si no existe)
    console.log('[WA Embedded Signup] PASO 4: Buscando proyecto del cliente...')
    let project = await prisma.project.findFirst({ where: { clientId: user.id } })
    console.log('[WA Embedded Signup] Proyecto encontrado:', project ? project.id : 'NINGUNO')

    if (!project) {
      const clientExists = await prisma.client.findUnique({ where: { id: user.id } })
      if (!clientExists) {
        console.error('[WA Embedded Signup] El clientId de sesión no existe en DB:', user.id)
        return NextResponse.json({ 
          error: 'Client not found', 
          errorMessage: 'Tu sesión es inválida. Por favor cierra sesión e inicia de nuevo.' 
        }, { status: 404 })
      }

      console.log('[WA Embedded Signup] Creando proyecto automáticamente para usuario:', user.id)
      project = await prisma.project.create({
        data: {
          clientId: user.id,
          name: 'Proyecto Principal',
          whatsappToken: null,
          whatsappBusinessId: null,
          whatsappPhoneId: null,
          agents: {
            create: {
              name: 'Agente Principal',
              identity: '',
              instructions: '',
            }
          }
        }
      })
      console.log('[WA Embedded Signup] Proyecto creado:', project.id)
    }

    console.log('[WA Embedded Signup] ─── Resumen de IDs capturados ───')
    console.log('[WA Embedded Signup] finalWabaId:', finalWabaId || '(vacío)')
    console.log('[WA Embedded Signup] finalPhoneId:', finalPhoneId || '(vacío)')
    console.log('[WA Embedded Signup] business_id (del frontend):', business_id || '(vacío)')
    console.log('[WA Embedded Signup] Proyecto actual en DB → phoneId:', project.whatsappPhoneId || '(vacío)', '| wabaId:', project.whatsappBusinessId || '(vacío)')

    // Solo guardamos phone_number_id y waba_id — el token lo proveemos nosotros (SYSTEM_USER_TOKEN)
    const updateData: any = {};
    if (finalPhoneId) updateData.whatsappPhoneId = finalPhoneId;
    if (finalWabaId || business_id) updateData.whatsappBusinessId = finalWabaId || business_id;

    console.log('[WA Embedded Signup] PASO 5: Guardando en DB → updateData:', JSON.stringify(updateData))

    await prisma.project.update({
      where: { id: project.id },
      data: updateData,
    })

    await prisma.integration.upsert({
      where: { clientId_provider: { clientId: user.id, provider: 'meta_whatsapp' } },
      create: { clientId: user.id, provider: 'meta_whatsapp', status: 'active' },
      update: { status: 'active', oauthState: null },
    })

    console.log('[WA Embedded Signup] ✅ ÉXITO. Project:', project.id, '| Phone guardado:', finalPhoneId || '(no capturado)', '| WABA guardado:', finalWabaId || business_id || '(no capturado)')
    console.log('[WA Embedded Signup] ═══════ FIN ═══════')

    const { revalidatePath } = require('next/cache');
    revalidatePath('/settings');

    return NextResponse.json({ success: true, phoneId: finalPhoneId, wabaId: finalWabaId })

  } catch (err: any) {
    console.error('[WA Embedded Signup] ❌ ERROR NO CONTROLADO:', err.message, err.stack)
    return NextResponse.json({ 
      error: err.message, 
      errorMessage: 'Ocurrió un error inesperado al conectar WhatsApp.' 
    }, { status: 500 })
  }
}
