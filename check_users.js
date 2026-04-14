const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const clients = await prisma.client.findMany();
    console.log('CLIENTS IN DB:', clients.map(c => ({ name: c.name, email: c.email })));
  } catch (err) {
    console.error('ERROR CHECKING DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
