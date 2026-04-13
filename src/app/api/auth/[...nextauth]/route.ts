import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

console.log('NEXTAUTH_SECRET check:', !!process.env.NEXTAUTH_SECRET)

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Login attempt for:', credentials?.email)
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        try {
          const client = await prisma.client.findUnique({
            where: { email: credentials.email },
          }) as any

          if (!client) {
            console.log('Client not found in DB')
            return null
          }

          if (!client.password) {
            console.log('Client has no password set')
            return null
          }

          const passwordValid = await bcrypt.compare(credentials.password, client.password)
          
          if (!passwordValid) {
            console.log('Invalid password for:', credentials.email)
            return null
          }

          console.log('Login successful for:', credentials.email)
          return {
            id:    client.id,
            name:  client.name,
            email: client.email,
          }
        } catch (error: any) {
          console.error('DATABASE ERROR during login:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.id
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
