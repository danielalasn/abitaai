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
import { getSubscriptionUsageAction, getProfileWithMeta } from '@/app/actions/settings'
import { AbitaBotBubble } from '@/components/AbitaBotBubble'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [usageData, setUsageData] = useState<{ limit: number | null, usage: number } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsage = () => {
      getSubscriptionUsageAction().then(res => {
        if (res) setUsageData(res)
      }).catch(console.error)
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);

    // Load avatar
    getProfileWithMeta().then(p => {
      if (p.avatarUrl) setAvatarUrl(p.avatarUrl)
    }).catch(() => {})

    return () => clearInterval(interval);
  }, [pathname])

  const usagePct = usageData && usageData.limit ? Math.round((usageData.usage / usageData.limit) * 100) : 0;
  
  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'

  const handleLogout = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/notifications/push-unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
          await sub.unsubscribe()
        }
      } catch (e) {
        console.error('Error unsubscribing from push:', e)
      }
    }
    signOut({ callbackUrl: '/login' })
  }

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#EBE4D6] dark:bg-[#1A1714] shadow-[1px_0_0_rgba(138,129,114,.18),8px_0_32px_rgba(66,54,36,.05)] dark:shadow-[1px_0_0_rgba(255,255,255,.06)] flex flex-col pt-6 pb-4 px-4 shrink-0 transition-[width] duration-300 ease-in-out relative z-50`}>
      
      {/* Header Container */}
      <div className="flex flex-col mb-8 shrink-0">
        <div className="flex items-center gap-4 px-3">
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="h-8 w-8 relative flex items-center justify-center shrink-0 transition-transform hover:scale-110">
              <img src="/assets/logos/logo-dark.png" alt="Abita AI" className="w-full h-full object-contain rounded-xl dark:hidden" />
              <img src="/assets/logos/logo-light.png" alt="Abita AI" className="w-full h-full object-contain rounded-xl hidden dark:block" />
            </div>
          </div>
          <span className={`font-semibold text-xl tracking-tight text-[#111111] dark:text-[#EDE9E0] whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            Abita <span className="text-[#FF4D00]">AI</span>
          </span>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#FF4D00] mt-5 px-3 flex w-fit group"
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
              className={`flex items-center gap-4 px-3 py-2 rounded-full text-sm tracking-tight transition-all duration-200 group relative ${
                isActive
                  ? 'bg-black/5 dark:bg-white/[.08] border border-black/5 dark:border-white/10 font-semibold text-[#111111] dark:text-[#EDE9E0]'
                  : 'font-medium text-[#5C5C5C] dark:text-[#A3A3A3] hover:bg-black/[0.04] dark:hover:bg-white/[.04] hover:text-[#111111] dark:hover:text-[#EDE9E0]'
              }`}
            >
              <div className="w-6 flex items-center justify-center shrink-0">
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  className={`transition-colors ${isActive ? 'text-[#FF4D00]' : 'opacity-60 group-hover:opacity-90'}`}
                />
              </div>
              <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-16 glass-dark text-[11px] font-semibold tracking-tight px-3 py-1.5 rounded-full opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100]">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="space-y-1 mt-4 border-t border-[#8A8172]/15 dark:border-white/5 pt-4 shrink-0">
        
        {/* Usage Progress Bar */}
        {usageData?.limit !== null && (
          <div className={`h-10 group relative cursor-pointer flex items-center transition-all duration-300 ${isCollapsed ? 'px-[14px]' : 'px-3'}`}>
            <div className="flex-1 bg-[#8A8172]/20 dark:bg-white/10 shadow-[inset_0_1px_2px_rgba(66,54,36,.12)] rounded-full h-1.5 transition-all duration-300 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-[width] duration-500 ${usagePct >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_10px_rgba(220,38,38,.45)]' : 'bg-gradient-to-r from-[#FF8A4C] via-[#FF4D00] to-[#E64500] shadow-[0_0_10px_rgba(255,77,0,.4)]'}`}
                style={{ width: `${Math.min(usagePct, 100)}%` }}
              />
            </div>
            
            <span className={`text-[10px] font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-8 ml-3'} ${usagePct >= 100 ? 'text-red-500' : usagePct >= 80 ? 'text-[#FF4D00]' : 'text-[#6F6F6F]'}`}>
              {usagePct}%
            </span>
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-16 glass-dark text-[11px] font-semibold tracking-tight px-3 py-1.5 rounded-full opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100]">
                Uso de suscripción: {usagePct}%
              </div>
            )}
          </div>
        )}

        <AbitaBotBubble isCollapsed={isCollapsed} />
        <div className="h-2"></div> {/* Separator */}

      </div>

      {/* User */}
      <div className="shrink-0 relative">
        {isProfileMenuOpen && (
          <div className="absolute bottom-14 left-0 w-52 glass-dark rounded-2xl z-[100] p-1.5 overflow-hidden animate-in fade-in zoom-in-95">
            <Link
              href="/settings"
              onClick={() => setIsProfileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium tracking-tight text-[#EDE9E0] hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings size={16} className="text-[#FF4D00]" />
              Mi Perfil
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium tracking-tight text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors text-left"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-4 px-3 py-2 w-full rounded-full hover:bg-white/45 dark:hover:bg-white/5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.6)] transition-all text-left group relative"
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#1A1714] dark:bg-[#EBE4D6] flex items-center justify-center text-[#FF4D00] text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_4px_12px_rgba(66,54,36,.22)] shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                userInitial
              )}
            </div>
          </div>
          <div className={`flex flex-col justify-center text-left transition-all duration-300 ${isCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}`}>
            <span className="text-sm font-bold text-[#111111] dark:text-[#EDE9E0] truncate whitespace-nowrap">
              {session?.user?.name?.split(' ')[0] || 'Usuario'}
            </span>
          </div>
          {isCollapsed && (
            <div className="absolute left-16 glass-dark text-[11px] font-semibold tracking-tight px-3 py-1.5 rounded-full opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100]">
              Perfil
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
