import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const BASE_URL    = process.env.NEXTAUTH_URL!
  const APP_ID      = process.env.META_APP_ID!
  const APP_SECRET  = process.env.META_APP_SECRET!
  const REDIRECT_URI = `${BASE_URL}/api/integrations/instagram/callback`

  // ── User denied / error ──────────────────────────────────────────────────
  if (error) {
    console.error('[Instagram OAuth] Error from Meta:', error)
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=instagram_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=invalid_callback`)
  }

  // ── Validate CSRF state ──────────────────────────────────────────────────
  const integration = await prisma.integration.findFirst({
    where: { oauthState: state, provider: 'meta_instagram', status: 'pending' }
  })

  if (!integration) {
    console.error('[Instagram OAuth] Invalid or expired state:', state)
    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=invalid_state`)
  }

  try {
    // ── Exchange code → short-lived token ────────────────────────────────
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code)

    const tokenRes  = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`)
    }

    // ── Exchange short-lived → long-lived token (60 days) ────────────────
    const llUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const llRes  = await fetch(llUrl.toString())
    const llData = await llRes.json()

    const longLivedToken  = llData.access_token || tokenData.access_token
    const expiresInSec    = llData.expires_in || 5183944 // ~60 days
    const tokenExpiresAt  = new Date(Date.now() + expiresInSec * 1000)

    // ── Fetch connected pages ─────────────────────────────────────────────
    const pagesRes  = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    )
    const pagesData = await pagesRes.json()
    const page      = pagesData.data?.[0]

    if (!page) {
      throw new Error('No Facebook Pages found for this account. Make sure the page is connected to Instagram.')
    }

    const pageAccessToken = page.access_token
    const pageId          = page.id

    // ── Fetch Instagram Business Account linked to the page ───────────────
    const igRes  = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    )
    const igData = await igRes.json()
    const instagramAccountId = igData.instagram_business_account?.id || null

    // ── Subscribe page to our app's webhooks ─────────────────────────────
    if (instagramAccountId && process.env.META_APP_ID) {
      await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`,
        {
          method: 'POST',
          body: new URLSearchParams({
            subscribed_fields: 'messages,messaging_postbacks',
            access_token: pageAccessToken,
          }),
        }
      )
    }

    // ── Save integration ──────────────────────────────────────────────────
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status:            'active',
        oauthState:        null, // clear state after use
        accessToken:       pageAccessToken, // use page token, never user token
        tokenExpiresAt,
        pageId,
        instagramAccountId,
      }
    })

    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&success=instagram`)

  } catch (err: any) {
    console.error('[Instagram OAuth] Callback error:', err.message)
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: 'error', oauthState: null }
    }).catch(() => {})

    return NextResponse.redirect(`${BASE_URL}/settings?tab=connections&error=oauth_failed`)
  }
}
