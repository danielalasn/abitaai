import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const BASE_URL    = process.env.NEXTAUTH_URL!
  const APP_ID      = process.env.META_APP_ID!
  const APP_SECRET  = process.env.META_APP_SECRET!
  const REDIRECT_URI = `${BASE_URL}/api/integrations/instagram/callback`

  // ── User denied / error ──────────────────────────────────────────────────
  if (error) {
    console.error('[Instagram OAuth] Error from Meta:', error, errorDescription)
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
    // ── Exchange code → short-lived user token ────────────────────────────
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code)

    const tokenRes  = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    console.log('[Instagram OAuth] Short-lived token response:', JSON.stringify(tokenData))

    if (!tokenData.access_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`)
    }

    const shortLivedToken = tokenData.access_token

    // ── Exchange short-lived → long-lived user token (60 days) ───────────
    const llUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes  = await fetch(llUrl.toString())
    const llData = await llRes.json()

    console.log('[Instagram OAuth] Long-lived token response:', JSON.stringify(llData))

    const longLivedToken  = llData.access_token || shortLivedToken
    const expiresInSec    = llData.expires_in || 5183944 // ~60 days
    const tokenExpiresAt  = new Date(Date.now() + expiresInSec * 1000)

    // ── Fetch connected Facebook Pages ────────────────────────────────────
    const pagesRes  = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
    )
    const pagesData = await pagesRes.json()

    console.log('[Instagram OAuth] Pages response:', JSON.stringify(pagesData))

    if (pagesData.error) {
      throw new Error(`Pages fetch failed: ${JSON.stringify(pagesData.error)}`)
    }

    const page = pagesData.data?.[0]

    if (!page) {
      throw new Error(
        'No Facebook Pages found for this account. ' +
        'Make sure: 1) You have a Facebook Page, 2) The Page has an Instagram Business/Creator account linked.'
      )
    }

    const pageAccessToken = page.access_token
    const pageId          = page.id

    console.log(`[Instagram OAuth] Using page: ${page.name} (${pageId})`)

    // ── Fetch Instagram Business/Creator Account linked to the page ───────
    const igRes  = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    )
    const igData = await igRes.json()

    console.log('[Instagram OAuth] IG account response:', JSON.stringify(igData))

    const instagramAccountId = igData.instagram_business_account?.id || null

    if (!instagramAccountId) {
      console.warn(
        '[Instagram OAuth] No instagram_business_account found on page. ' +
        'The Instagram account must be a Business or Creator account linked to the Facebook Page.'
      )
    }

    // ── Subscribe page to our app webhooks ────────────────────────────────
    const subRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        body: new URLSearchParams({
          subscribed_fields: 'messages,messaging_postbacks,feed',
          access_token: pageAccessToken,
        }),
      }
    )
    const subData = await subRes.json()
    console.log('[Instagram OAuth] Subscription response:', JSON.stringify(subData))

    // ── Save integration ──────────────────────────────────────────────────
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status:            'active',
        oauthState:        null,
        accessToken:       encrypt(pageAccessToken),
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

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  const session = await (await import('next-auth')).getServerSession((await import('@/lib/auth')).authOptions)
  const user = session?.user as any

  if (!user?.id || !code) return NextResponse.json({ error: 'Unauthorized or missing code' }, { status: 401 })

  const BASE_URL    = process.env.NEXTAUTH_URL!
  const APP_ID      = process.env.META_APP_ID!
  const APP_SECRET  = process.env.META_APP_SECRET!
  const REDIRECT_URI = `${BASE_URL}/api/integrations/instagram/callback`

  try {
    // 1. Exchange code
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', APP_ID)
    tokenUrl.searchParams.set('client_secret', APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code)

    const tokenRes  = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`)

    const shortLivedToken = tokenData.access_token

    // 2. Exchange for long-lived token
    const llUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', APP_ID)
    llUrl.searchParams.set('client_secret', APP_SECRET)
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const llRes  = await fetch(llUrl.toString())
    const llData = await llRes.json()
    const longLivedToken  = llData.access_token || shortLivedToken
    const tokenExpiresAt  = new Date(Date.now() + (llData.expires_in || 5183944) * 1000)

    // 3. Get Pages
    const pagesRes  = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`)
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]
    if (!page) throw new Error('No Facebook Pages found')

    const pageAccessToken = page.access_token
    const pageId          = page.id

    // 4. Get IG Account
    const igRes  = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`)
    const igData = await igRes.json()
    const instagramAccountId = igData.instagram_business_account?.id || null

    // 5. Subscribe
    await fetch(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`, {
      method: 'POST',
      body: new URLSearchParams({ subscribed_fields: 'messages,messaging_postbacks,feed', access_token: pageAccessToken }),
    })

    // 6. Save/Upsert integration
    await prisma.integration.upsert({
      where: { clientId_provider: { clientId: user.id, provider: 'meta_instagram' } },
      create: { clientId: user.id, provider: 'meta_instagram', status: 'active', accessToken: encrypt(pageAccessToken), tokenExpiresAt, pageId, instagramAccountId },
      update: { status: 'active', accessToken: encrypt(pageAccessToken), tokenExpiresAt, pageId, instagramAccountId, oauthState: null }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[IG Popup Callback] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
