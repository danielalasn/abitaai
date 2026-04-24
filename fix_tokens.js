const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const adminClient = await prisma.client.findFirst({
    where: { email: 'info@abitaai.com' }
  });
  if (adminClient) {
   const updated = await prisma.project.updateMany({
       where: { clientId: adminClient.id },
       data: { whatsappToken: process.env.WHATSAPP_SYSTEM_TOKEN || "EAANJtIVY0OIBOyfTj2h81yIofb1cZCrlSnt0N0G3yS12BqIfR2l84b6uQdYg2oQZBhYVZA8F0sM8y9l7ZAScZA8BwI2V80uI9gD0mYQ" } 
    });
    console.log("Updated projects:", updated.count);
  }
}
run();
