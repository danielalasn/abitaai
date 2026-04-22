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

  const APP_ID     = process.env.META_APP_ID
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

  // Permissions needed for Instagram Messaging
  const scopes = [
    'public_profile',
    'email',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
