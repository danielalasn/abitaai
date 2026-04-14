'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Inbox, Settings, Megaphone, MessageSquareCode, BrainCircuit, BarChart3, LogOut, UserCheck } from 'lucide-react'
import ThemeSwitch from '@/components/ui/theme-switch'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'

  return (
    <aside className="w-64 border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8] dark:bg-[#1A1714] flex flex-col p-4 shrink-0 transition-colors duration-200">
      
      {/* Logo Abita AI */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="h-9 w-9 bg-[#111111] dark:bg-[#E9E4D8] rounded-xl flex items-center justify-center shadow-md shrink-0">
          <span className="text-[#F36A2D] font-bold text-base tracking-tight">a</span>
        </div>
        <span className="font-semibold text-xl tracking-tight text-[#111111] dark:text-[#EDE9E0]">
          abita.ai
        </span>
      </div>
      
      <nav className="flex-1 space-y-0.5">
        {[
          { icon: Inbox,             label: 'Bandeja de entrada', href: '/' },
          { icon: BarChart3,         label: 'Dashboard',          href: '/analytics' },
          { icon: UserCheck,         label: 'Base de Leads',      href: '/leads' },
          { icon: Megaphone,         label: 'Campañas',           href: '/campaigns' },
          { icon: BrainCircuit,      label: 'Mejora Continua',    href: '/learning' },
          { icon: Settings,          label: 'Configuración Bot',  href: '/settings' },
          { icon: MessageSquareCode, label: 'Probar Simulador',   href: '/test-chat' },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-white dark:bg-[#111111]/60 text-[#111111] dark:text-[#EDE9E0] shadow-sm' 
                  : 'text-[#6F6F6F] hover:bg-white/60 dark:hover:bg-white/5 hover:text-[#111111] dark:hover:text-[#EDE9E0]'
              }`}
            >
              <item.icon
                size={16}
                className={isActive ? 'text-[#F36A2D]' : 'opacity-60'}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="space-y-1 mb-2">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-[#6F6F6F] uppercase tracking-wider">Tema</span>
          <ThemeSwitch />
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-[#6F6F6F] hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-150"
        >
          <LogOut size={16} className="opacity-70" />
          Cerrar Sesión
        </button>
      </div>

      {/* User */}
      <div className="border-t border-[#DEDAD0] dark:border-zinc-800/60 pt-4 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2 w-full rounded-xl">
          <div className="h-8 w-8 rounded-full bg-[#111111] dark:bg-[#E9E4D8] flex items-center justify-center text-[#F36A2D] text-xs font-bold shadow-sm shrink-0">
            {userInitial}
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <span className="text-sm font-medium text-[#111111] dark:text-[#EDE9E0] truncate">
              {session?.user?.name || 'Usuario'}
            </span>
            <span className="text-[10px] text-[#6F6F6F] truncate">
              {session?.user?.email || 'email@ejemplo.com'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
