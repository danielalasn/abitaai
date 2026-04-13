import { withAuth } from "next-auth/middleware"

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
})

export const config = {
  matcher: [
    /*
     * Protege todas las rutas EXCEPTO:
     * - /login
     * - /api/auth/* (NextAuth callbacks)
     * - /api/webhooks/* (webhooks externos de WhatsApp)
     * - Archivos estáticos (_next, favicon, etc.)
     */
    '/((?!login|api/auth|api/webhooks|_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
