import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash('@gent2026Ai503', 10)
    const adminEmail = 'info@abitaai.com'
    
    let admin = await prisma.client.findUnique({
      where: { email: adminEmail }
    })
    
    if (!admin) {
      admin = await prisma.client.create({
        data: {
          name: 'Master Admin',
          email: adminEmail,
          password: hashedPassword,
        }
      })
      return NextResponse.json({ status: 'success', message: 'Admin created locally', admin })
    } else {
      admin = await prisma.client.update({
        where: { email: adminEmail },
        data: { password: hashedPassword }
      })
      return NextResponse.json({ status: 'success', message: 'Admin updated locally', admin })
    }
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
