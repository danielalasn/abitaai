import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.client.findFirst({ where: { email: 'melto@abitaai.com' }, include: { projects: true } });
  if (user && user.projects[0]) {
    await prisma.project.update({ where: { id: user.projects[0].id }, data: { handoffTemplateStatus: null } });
    console.log("Reset successful for melto");
  }
}
main();
