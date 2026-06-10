import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '1fa3a959d13049daf546269f34fd1fc8f6c434e449e02f0d06b0ff7762fbc8d1';
function decrypt(text: string) {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: 'cmq74zrbm0001nqxjs0d4evv6' }
  });
  
  if (!project || !project.whatsappToken) {
    console.log("No token found");
    return;
  }
  
  const token = decrypt(project.whatsappToken);
  console.log("Token decrypted");

  // Debug Businesses
  const resB = await fetch(`https://graph.facebook.com/v25.0/me/businesses?access_token=${token}`);
  const dataB = await resB.json();
  console.log("Businesses:", JSON.stringify(dataB, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
