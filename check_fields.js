const { prisma } = require('./src/lib/prisma');

async function check() {
  try {
    const fields = Object.keys(prisma.message.fields || {});
    console.log('Fields in message:', fields);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
