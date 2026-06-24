import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Permitir que este endpoint sea llamado por un cron externo
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Si necesitas protegerlo, puedes revisar un header como authorization
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 1. Obtener proyectos que tengan la opción de auto-wake encendida
    const projects = await prisma.project.findMany({
      where: {
        botAutoWakeHours: { not: null }
      }
    });

    let totalWoken = 0;

    for (const project of projects) {
      const hours = project.botAutoWakeHours;
      if (!hours) continue;

      // Calcular la fecha límite de inactividad
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      // 2. Encontrar chats apagados, con permiso de encenderse y que expiraron
      const chatsToWake = await prisma.chat.findMany({
        where: {
          lead: { projectId: project.id },
          botActive: false,
          autoWakeBot: true,
          lastActiveAt: { lt: cutoffDate }
        }
      });

      if (chatsToWake.length === 0) continue;

      const chatIds = chatsToWake.map(c => c.id);

      // 3. Reactivar los bots (silent wake up)
      await prisma.chat.updateMany({
        where: { id: { in: chatIds } },
        data: { botActive: true }
      });

      // 4. Agregar mensaje interno de sistema para que el agente sepa qué pasó
      const systemMessages = chatIds.map(chatId => ({
        chatId,
        role: 'system',
        content: `El bot se ha reactivado automáticamente tras ${hours} horas de inactividad.`,
        status: 'DELIVERED',
      }));

      await prisma.message.createMany({
        data: systemMessages
      });

      totalWoken += chatIds.length;
      console.log(`[Cron Wake Bots] Reactivados ${chatIds.length} bots para el proyecto ${project.id}`);
    }

    return NextResponse.json({ success: true, totalWoken });

  } catch (error) {
    console.error('[Cron Wake Bots] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
