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
  const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/callback`

  if (!APP_ID) {
    return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 })
  }

  // CSRF state
  const state = crypto.randomBytes(32).toString('hex')

  // Guardar state en DB para validación posterior
  await prisma.integration.upsert({
    where: { clientId_provider: { clientId: user.id, provider: 'meta_whatsapp' } },
    create: { clientId: user.id, provider: 'meta_whatsapp', status: 'pending', oauthState: state },
    update: { status: 'pending', oauthState: state },
  })

  const authUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth')
  authUrl.searchParams.set('client_id', APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging')

  console.log('[WA Connect] Redirecting to Meta OAuth:', authUrl.toString())

  return NextResponse.redirect(authUrl.toString())
}
