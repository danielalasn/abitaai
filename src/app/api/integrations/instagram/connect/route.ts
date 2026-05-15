import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const APP_ID = process.env.META_APP_ID
  const CONFIG_ID = process.env.META_CONFIG_ID || '975039465239632'
  const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/integrations/instagram/callback`

  if (!APP_ID) {
    return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 })
  }

  // Generate CSRF state
  const state = crypto.randomBytes(32).toString('hex')

  // Upsert a pending integration with the state for CSRF validation
  await prisma.integration.upsert({
    where: { clientId_provider: { clientId: user.id, provider: 'meta_instagram' } },
    create: { clientId: user.id, provider: 'meta_instagram', status: 'pending', oauthState: state },
    update: { status: 'pending', oauthState: state },
  })

  // PARA DEBUG: Usamos Login Clásico con scopes explícitos en lugar de config_id.
  // Esto obligará a Meta a mostrar un error detallado (ej. "URL Blocked", "Invalid Scope")
  // en lugar de la pantalla genérica de "App no disponible".
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  // Scopes requeridos para Instagram/WhatsApp
  authUrl.searchParams.set('scope', 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_messaging')

  return NextResponse.redirect(authUrl.toString())
}
