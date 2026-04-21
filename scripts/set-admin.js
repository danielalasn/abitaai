const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAdminRole() {
  try {
    const updatedUser = await prisma.client.update({
      where: { email: 'info@abitaai.com' },
      data: { role: 'ADMIN' }
    });
    console.log('✅ Usuario admin actualizado exitosamente:', updatedUser.email, updatedUser.role);
  } catch (error) {
    console.error('❌ Error actualizando admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminRole();
