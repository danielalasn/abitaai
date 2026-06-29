import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0], 10) : 5;
  const projectName = args[1] || ''; // Opcional, para filtrar por proyecto

  console.log(`Auditing last ${limit} chats${projectName ? ` for project: ${projectName}` : ''}...\n`);

  const chats = await prisma.chat.findMany({
    where: projectName ? {
      lead: {
        project: {
          name: { contains: projectName, mode: 'insensitive' }
        },
        NOT: { channel: 'simulator' }
      }
    } : {
      lead: { NOT: { channel: 'simulator' } }
    },
    orderBy: { lastActiveAt: 'desc' },
    take: limit,
    include: {
      lead: {
        include: { project: true }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (chats.length === 0) {
    console.log('No chats found.');
    return;
  }

  for (const chat of chats) {
    console.log(`\n=============================================================`);
    console.log(`Chat ID: ${chat.id}`);
    console.log(`Lead: ${chat.lead.name} (${chat.lead.phone})`);
    console.log(`Project: ${chat.lead.project?.name}`);
    console.log(`Last Active: ${chat.lastActiveAt.toISOString()}`);
    console.log(`Status Bot: ${chat.botActive ? 'ACTIVO' : 'APAGADO'}`);
    console.log(`=============================================================`);

    for (const msg of chat.messages) {
      const time = msg.createdAt.toISOString();
      const role = msg.role.toUpperCase();
      console.log(`[${time}] [${role}] ${msg.content}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
