import { withAuth } from "next-auth/middleware"

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
})

export const config = {
  matcher: [
    /*
     * Protege todas las rutas EXCEPTO:
     * - /login
     * - /terms, /privacy (Documentos Legales)
     * - /api/auth/* (NextAuth callbacks)
     * - /api/webhooks/* (webhooks externos de WhatsApp)
     * - Archivos estáticos (_next, favicon, etc.)
     */
    '/((?!login|terms|privacy|api/auth|api/webhooks|api/cron|api/seed|_next/static|_next/image|favicon.ico|manifest.json|sw.js|$).*)',
  ],
}
