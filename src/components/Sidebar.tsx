'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  Inbox, Settings, Megaphone, MessageSquareCode, BrainCircuit, 
  BarChart3, LogOut, UserCheck, ChevronLeft, ChevronRight,
  Sun, Moon
} from 'lucide-react'
import ThemeSwitch from '@/components/ui/theme-switch'
import { ProfileModal } from '@/components/ProfileModal'
import { useState } from 'react'
import { useTheme } from 'next-themes'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8] dark:bg-[#1A1714] flex flex-col pt-6 pb-4 px-4 shrink-0 transition-[width] duration-300 ease-in-out relative overflow-hidden`}>
      
      {/* Header Container */}
      <div className="flex flex-col mb-8 overflow-hidden shrink-0">
        <div className="flex items-center gap-4 px-2.5">
          <div className="h-9 w-9 bg-[#111111] dark:bg-[#E9E4D8] rounded-xl flex items-center justify-center shadow-md shrink-0 transition-transform hover:rotate-12">
            <span className="text-[#F36A2D] font-bold text-base tracking-tight">a</span>
          </div>
          <span className={`font-semibold text-xl tracking-tight text-[#111111] dark:text-[#EDE9E0] whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            abita.ai
          </span>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#F36A2D] hover:scale-125 transition-all p-1 w-fit mt-5 ml-4"
          title={isCollapsed ? "Expandir" : "Colapsar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {[
          { icon: Inbox,             label: 'Bandeja',          href: '/inbox' },
          { icon: BarChart3,         label: 'Dashboard',        href: '/analytics' },
          { icon: UserCheck,         label: 'Leads',            href: '/leads' },
          { icon: Megaphone,         label: 'Campañas',         href: '/campaigns' },
          { icon: BrainCircuit,      label: 'Aprendizaje',      href: '/learning' },
          { icon: Settings,          label: 'Configuración',    href: '/settings' },
          { icon: MessageSquareCode, label: 'Simulador',        href: '/test-chat' },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-white dark:bg-[#111111]/60 text-[#111111] dark:text-[#EDE9E0] shadow-sm' 
                  : 'text-[#6F6F6F] hover:bg-white/60 dark:hover:bg-white/5 hover:text-[#111111] dark:hover:text-[#EDE9E0]'
              }`}
            >
              <div className="w-6 flex items-center justify-center shrink-0">
                <item.icon
                  size={20}
                  className={`transition-transform group-hover:scale-110 ${isActive ? 'text-[#F36A2D]' : 'opacity-60'}`}
                />
              </div>
              <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-16 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-zinc-800">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="space-y-1 mt-4 border-t border-[#DEDAD0]/50 dark:border-zinc-800/50 pt-4 shrink-0">
        {/* Theme Toggle */}
        <div className="flex items-center gap-4 px-3 py-2">
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="scale-[0.7] transition-none origin-center">
              <ThemeSwitch />
            </div>
          </div>
          <span className={`text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest transition-all duration-300 whitespace-nowrap ml-6 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            Tema
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-4 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-[#6F6F6F] hover:bg-rose-500/10 hover:text-rose-600 transition-all group"
          title={isCollapsed ? "Cerrar Sesión" : undefined}
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <LogOut size={18} className="opacity-70 group-hover:scale-110 transition-transform" />
          </div>
          <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            Cerrar Sesión
          </span>
        </button>
      </div>

      {/* User */}
      <div className="mt-4 pt-2 shrink-0">
        <button 
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-4 p-2 w-full rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left group"
        >
          <div className="h-9 w-9 rounded-xl bg-[#111111] dark:bg-[#E9E4D8] flex items-center justify-center text-[#F36A2D] text-sm font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform ml-0.5">
            {userInitial}
          </div>
          <div className={`flex flex-col text-left overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate whitespace-nowrap">
              {session?.user?.name?.split(' ')[0] || 'Usuario'}
            </span>
            <span className="text-[10px] text-[#6F6F6F] truncate whitespace-nowrap">
              {session?.user?.email}
            </span>
          </div>
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </aside>
  )
}
