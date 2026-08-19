import { prisma } from './prisma';

/**
 * Obtiene el uso mensual de mensajes automatizados (bot y campañas) para un cliente.
 */
export async function getCurrentMonthUsage(clientId: string): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { subscriptionResetDay: true }
  });

  const resetDay = client?.subscriptionResetDay || 1;
  const now = new Date();
  const startOfMonth = new Date();
  
  if (now.getDate() >= resetDay) {
    // We are currently in the billing cycle for this month
    startOfMonth.setDate(resetDay);
  } else {
    // We are in the billing cycle that started last month
    startOfMonth.setMonth(startOfMonth.getMonth() - 1);
    startOfMonth.setDate(resetDay);
  }
  
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.message.count({
    where: {
      createdAt: {
        gte: startOfMonth
      },
      OR: [
        {
          role: 'assistant',
          content: { not: { startsWith: '[Sistema]' } }
        },
        {
          role: 'agent',
          waCategory: { in: ['MARKETING', 'UTILITY', 'AUTHENTICATION'] }
        }
      ],
      chat: {
        lead: {
          phone: { not: 'SIMULADOR_TEST' },
          project: {
            clientId
          }
        }
      }
    }
  });

  return count;
}

/**
 * Verifica si un cliente ha excedido su límite de mensajes.
 */
export async function hasExceededLimit(clientId: string): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { messageLimit: true }
  });

  if (!client) return true; // Fail safe

  const currentUsage = await getCurrentMonthUsage(clientId);
  
  return currentUsage >= client.messageLimit;
}
