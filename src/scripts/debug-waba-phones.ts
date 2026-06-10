import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const wabaId = "2192832414784722";
  const systemUserToken = process.env.SYSTEM_USER_TOKEN;
  
  if (!systemUserToken) {
    console.log("No SYSTEM_USER_TOKEN found");
    return;
  }
  
  const res = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?access_token=${systemUserToken}`);
  const data = await res.json();
  console.log("Phone Numbers:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
