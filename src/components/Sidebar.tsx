'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  Inbox, Settings, Megaphone, MessageSquareCode, BrainCircuit, 
  BarChart3, LogOut, UserCheck, ChevronLeft, ChevronRight,
  Sun, Moon, LayoutTemplate, Files, AlertTriangle, Activity
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { getSubscriptionUsageAction } from '@/app/actions/settings'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [usageData, setUsageData] = useState<{ limit: number, usage: number } | null>(null)

  useEffect(() => {
    const fetchUsage = () => {
      getSubscriptionUsageAction().then(res => {
        if (res) setUsageData(res)
      }).catch(console.error)
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 30000); // Refrescar cada 30 segundos

    return () => clearInterval(interval);
  }, [pathname])

  const usagePct = usageData ? Math.round((usageData.usage / usageData.limit) * 100) : 0;
  
  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-[#DEDAD0] dark:border-zinc-800/60 bg-[#E9E4D8] dark:bg-[#1A1714] flex flex-col pt-6 pb-4 px-4 shrink-0 transition-[width] duration-300 ease-in-out relative z-50`}>
      
      {/* Header Container */}
      <div className="flex flex-col mb-8 shrink-0 overflow-hidden">
        <div className="flex items-center gap-4 px-3">
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="h-8 w-8 bg-[#111111] dark:bg-[#E9E4D8] rounded-xl flex items-center justify-center shadow-md shrink-0 transition-transform hover:rotate-12">
              <span className="text-[#F36A2D] font-bold tracking-tight">a</span>
            </div>
          </div>
          <span className={`font-semibold text-xl tracking-tight text-[#111111] dark:text-[#EDE9E0] whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            Abita <span className="text-[#F36A2D]">AI</span>
          </span>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#F36A2D] mt-5 px-3 flex w-fit group"
          title={isCollapsed ? "Expandir" : "Colapsar"}
        >
          <div className="w-6 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-125">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </div>
        </button>
      </div>
      
      <nav className={`flex-1 space-y-1.5 no-scrollbar ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
        {[
          { icon: Inbox,             label: 'Bandeja',          href: '/inbox' },
          { icon: Megaphone,         label: 'Campañas',         href: '/campaigns' },
          { icon: LayoutTemplate,    label: 'Templates',        href: '/templates' },
          { icon: Files,             label: 'Archivos',         href: '/files' },
          { icon: BarChart3,         label: 'Dashboard',        href: '/analytics' },
          { icon: UserCheck,         label: 'Leads',            href: '/leads' },
          { icon: BrainCircuit,      label: 'Aprendizaje',      href: '/learning' },
          { icon: MessageSquareCode, label: 'Simulador',        href: '/test-chat' },
          { icon: Settings,          label: 'Configuración',    href: '/settings' },
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
        
        {/* Usage Progress Bar */}
        <div className={`h-10 group relative cursor-pointer flex items-center transition-all duration-300 ${isCollapsed ? 'px-[14px]' : 'px-3'}`}>
          <div className="flex-1 bg-black/10 dark:bg-white/10 rounded-full h-1.5 transition-all duration-300">
            <div 
              className={`h-1.5 rounded-full ${usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-orange-500' : 'bg-[#111111]/30 dark:bg-white/30'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          
          <span className={`text-[10px] font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-8 ml-3'} ${usagePct >= 100 ? 'text-red-500' : usagePct >= 80 ? 'text-orange-500' : 'text-[#6F6F6F]'}`}>
            {usagePct}%
          </span>
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-16 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-zinc-800">
              Uso de suscripción: {usagePct}%
            </div>
          )}
        </div>

      </div>

      {/* User */}
      <div className="shrink-0 relative">
        {isProfileMenuOpen && (
          <div className="absolute bottom-14 left-0 w-48 bg-white dark:bg-[#1A1714] border border-[#DEDAD0] dark:border-zinc-800 rounded-xl shadow-xl z-[100] py-1 overflow-hidden animate-in fade-in zoom-in-95">
            <Link 
              href="/settings"
              onClick={() => setIsProfileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-[#EDE9E0] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Settings size={16} />
              Mi Perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-4 px-3 py-2 w-full rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left group relative overflow-hidden"
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="h-8 w-8 rounded-xl bg-[#111111] dark:bg-[#E9E4D8] flex items-center justify-center text-[#F36A2D] text-sm font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
          </div>
          <div className={`flex flex-col justify-center text-left transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate whitespace-nowrap">
              {session?.user?.name?.split(' ')[0] || 'Usuario'}
            </span>
          </div>
          {isCollapsed && (
            <div className="absolute left-16 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-zinc-800">
              Perfil
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
