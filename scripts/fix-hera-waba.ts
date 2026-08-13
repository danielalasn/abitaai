import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.client.findFirst({
    where: { email: 'hera@abitaai.com' },
    include: { projects: true }
  })
  
  if (!user || !user.projects[0]) return console.log("No hera");
  
  const p = user.projects[0];

  await prisma.project.update({
    where: { id: p.id },
    data: {
      whatsappBusinessId: '1904825813528568',
      whatsappPhoneId: '1191842234017105',
      whatsappToken: '53799b67360c7618ba173ed8:2232cbb312e6501d9eb08a300d4f01f1:83a6a8c4dd1d2f587f2103e8003aaa25d10dc3dffc457b67ae9ed12e1da43b166aacf875b253a769027c3029a2d090b6049049aceb0677c6c9f18047609f252e2ae6bc3f74178b15e04b5f941df56a1844ca00ec2ddebe27960bdf6faeae332232505c957911ca3baadb2cb262ccc9d01afea1f3b93b78edf2bb91557ab7c812c2cde9065d6a23e309def7f2548d74ac24c070b55726e0eacaf1ae4a8d3fce1869331e226688664b37a83904e78ce8c68030e80f23a0db3c95c47723a276e232332652ece3a10491ddca533b18902cef22469acc286a97d5722a7ed0ef403ee426e4decbd486cae3245e3f00fc42a7d0b0ef6d85a952b21e1f559ce91fbc5e591650e9a6270af052785a996249ae5d6406663ef49b0532dfe1b7873a3a0f7b73a0099d3e6514e315243627d691ea6e55c7e00aaacad9a2910593eeb25f9a2483cf71a594e26a61b9b984a32e0b086bc7467345f36792e8a957fb93f1e789e31f5cc4b02af3bc9ecf81c54ff0df9add90d58c8d05d8c53fa5284c9ac89fc008338adf77370635937e6414f8f176e9d5eacaca7fc14167e3ef0555f5686cc7ed5cc265cbf1890674ab978a5bad7b805820719c01843ea7ec257a6a35087cb8af63e4df72c12e4793c0688f9a1c177fce8a50267341'
    }
  })
  
  console.log("✅ WABA ID, Phone ID y Token restaurados a HERA desde el backup!");
}

main().catch(console.error).finally(() => prisma.$disconnect())
