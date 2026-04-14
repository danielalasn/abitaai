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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const client = await prisma.client.findUnique({
            where: { email: credentials.email },
          }) as any

          if (!client) {
            return null
          }

          if (!client.password) {
            return null
          }

          const passwordValid = await bcrypt.compare(credentials.password, client.password)
          
          if (!passwordValid) {
            return null
          }

          return {
            id:    client.id,
            name:  client.name,
            email: client.email,
            theme: client.theme,
          }
        } catch (error: any) {
          console.error('DATABASE ERROR during login:', error)
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
