import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  const debugInfo = {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      META_APP_ID: process.env.META_APP_ID,
      // No mostramos el secret por seguridad, solo si existe
      HAS_META_APP_SECRET: !!process.env.META_APP_SECRET,
    },
    constructed: {
      REDIRECT_URI: `${process.env.NEXTAUTH_URL}/api/integrations/instagram/callback`,
    },
    session: {
      isLoggedIn: !!session,
      user: session?.user,
    }
  }

  const scopes = [
    'instagram_basic',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_messaging',
    'pages_manage_metadata',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID || '')
  authUrl.searchParams.set('redirect_uri', debugInfo.constructed.REDIRECT_URI)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.json({
    message: "Debug Instagram Auth",
    debugInfo,
    finalAuthUrl: authUrl.toString(),
    checkList: [
      "1. ¿El REDIRECT_URI coincide EXACTAMENTE con lo que pusiste en Meta?",
      "2. ¿El META_APP_ID es el mismo que en el Dashboard de Meta?",
      "3. Si estás en Vercel, ¿actualizaste las variables de entorno en el panel de control de Vercel y re-desplegaste?"
    ]
  })
}
