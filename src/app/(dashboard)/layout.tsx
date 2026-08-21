import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  // Si el usuario es el administrador principal, no tiene proyectos de cliente comunes, lo enviamos a su panel
  if (session?.user?.email === 'info@abitaai.com') {
    redirect('/admin');
  }

  return (
    <div className="flex flex-col md:flex-row fixed inset-0 w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Sidebar solo visible en desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 min-h-0 bg-[#E9E4D8] dark:bg-[#1A1714]">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
