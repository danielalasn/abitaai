import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[AUTH DEBUG] Intento de login para:', credentials?.email)
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH DEBUG] Faltan credenciales')
          return null
        }

        try {
          const client = await prisma.client.findUnique({
            where: { email: credentials.email },
          }) as any

          if (!client) {
            console.log('[AUTH DEBUG] Cliente no encontrado en DB:', credentials.email)
            return null
          }

          if (!client.password) {
            console.log('[AUTH DEBUG] El cliente no tiene contraseña configurada')
            return null
          }

          const passwordValid = await bcrypt.compare(credentials.password, client.password)
          
          if (!passwordValid) {
            console.log('[AUTH DEBUG] Contraseña INVALIDA para:', credentials.email)
            return null
          }

          console.log('[AUTH DEBUG] Login exitoso:', credentials.email)
          return {
            id:    client.id,
            name:  client.name,
            email: client.email,
            theme: client.theme,
          }
        } catch (error: any) {
          console.error('[AUTH DEBUG] ERROR CRÍTICO DE BASE DE DATOS:', error)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' as any },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) (token as any).id = (user as any).id
      return token
    },
    async session({ session, token }: any) {
      if (session.user) (session.user as any).id = (token as any).id
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
