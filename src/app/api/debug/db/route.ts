import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const questions = await prisma.unansweredQuestion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    return NextResponse.json({
      message: "Debug: Últimas 10 preguntas no contestadas",
      count: questions.length,
      data: questions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
