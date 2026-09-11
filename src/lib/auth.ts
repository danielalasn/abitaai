import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { redisConnection } from '@/lib/queue'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        console.log('[AUTH DEBUG] Intento de login para:', credentials?.email)
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH DEBUG] Faltan credenciales')
          return null
        }

        // Validación de Turnstile
        if (process.env.TURNSTILE_SECRET_KEY) {
          if (!credentials.turnstileToken) {
            console.log('[AUTH DEBUG] Intento de login sin Turnstile token');
            throw new Error('Por favor, completa la verificación de seguridad.');
          }
          try {
            const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${credentials.turnstileToken}`
            });
            const outcome = await verifyResponse.json();
            if (!outcome.success) {
              console.log('[AUTH DEBUG] Turnstile Token Inválido', outcome);
              throw new Error('Verificación de seguridad fallida. Eres un bot?');
            }
          } catch (e: any) {
            console.error('[AUTH DEBUG] Error validando Turnstile', e);
            throw new Error(e.message || 'Error validando seguridad.');
          }
        } else if (process.env.NODE_ENV === 'production' && !credentials.turnstileToken) {
           console.log('[AUTH DEBUG] Intento de login sin token en producción');
           // Opcional: throw new Error('Validación de seguridad requerida.');
        }

        try {
          const client = await prisma.client.findFirst({
            where: {
              email: {
                equals: credentials.email,
                mode: 'insensitive'
              }
            },
          }) as any

          if (!client) {
            console.log('[AUTH DEBUG] Cliente no encontrado en DB:', credentials.email)
            return null
          }

          if (client.subscriptionStatus === 'BLOCKED') {
            console.log('[AUTH DEBUG] Intento de login en cuenta bloqueada:', credentials.email)
            throw new Error('Tu cuenta ha sido bloqueada por demasiados intentos. Por favor, contacta al equipo de abitaai para desbloquearla.');
          }

          if (!client.password) {
            console.log('[AUTH DEBUG] El cliente no tiene contraseña configurada')
            return null
          }

          const passwordValid = await bcrypt.compare(credentials.password, client.password)
          
          if (!passwordValid) {
            console.log('[AUTH DEBUG] Contraseña INVALIDA para:', credentials.email)
            const updatedAttempts = (client.failedLoginAttempts || 0) + 1;
            
            if (updatedAttempts >= 5) {
              await prisma.client.update({
                where: { id: client.id },
                data: { failedLoginAttempts: updatedAttempts, subscriptionStatus: 'BLOCKED' }
              });
              console.warn(`[Auth] Bloqueando cuenta por intentos fallidos: ${credentials.email}`);
              throw new Error('Tu cuenta ha sido bloqueada por demasiados intentos. Por favor, contacta al equipo de abitaai para desbloquearla.');
            } else {
              await prisma.client.update({
                where: { id: client.id },
                data: { failedLoginAttempts: updatedAttempts }
              });
            }
            return null
          }

          // Restablecer si login es exitoso
          if (client.failedLoginAttempts > 0) {
            await prisma.client.update({
              where: { id: client.id },
              data: { failedLoginAttempts: 0 }
            });
          }

          console.log('[AUTH DEBUG] Login exitoso:', credentials.email)
          return {
            id:    client.id,
            name:  client.name,
            email: client.email,
            theme: client.theme,
            role:  client.role,
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
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
