'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  Inbox, Megaphone, LayoutTemplate, BarChart3, 
  Menu, X, Files, UserCheck, BrainCircuit, MessageSquareCode, Settings, LogOut
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const mainNavItems = [
    { icon: Inbox, label: 'Bandeja', href: '/inbox' },
    { icon: Megaphone, label: 'Campañas', href: '/campaigns' },
    { icon: LayoutTemplate, label: 'Templates', href: '/templates' },
    { icon: BarChart3, label: 'Dashboard', href: '/analytics' },
  ]

  const moreNavItems = [
    { icon: UserCheck, label: 'Leads', href: '/leads' },
    { icon: BrainCircuit, label: 'Aprendizaje', href: '/learning' },
    { icon: MessageSquareCode, label: 'Simulador', href: '/test-chat' },
    { icon: Files, label: 'Archivos', href: '/files' },
    { icon: Settings, label: 'Configuración', href: '/settings' },
  ]

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed bottom nav */}
      <div className="h-16 md:hidden shrink-0" />

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#E9E4D8] dark:bg-[#1A1714] border-t border-[#DEDAD0] dark:border-zinc-800/60 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white dark:bg-[#111111]/60 shadow-sm' : ''}`}>
                  <item.icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`${isActive ? 'text-[#F36A2D]' : 'text-[#6F6F6F]'}`}
                  />
                </div>
                <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-[#111111] dark:text-[#EDE9E0]' : 'text-[#6F6F6F]'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
          >
            <div className="p-1.5 rounded-xl">
              <Menu size={22} className="text-[#6F6F6F]" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight text-[#6F6F6F]">
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#E9E4D8] dark:bg-[#1A1714] flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex flex-col h-full overflow-y-auto pb-6">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#DEDAD0] dark:border-zinc-800/60">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#111111] dark:bg-[#E9E4D8] rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-[#F36A2D] font-bold text-lg tracking-tight">a</span>
                </div>
                <div>
                  <h2 className="font-semibold text-lg tracking-tight text-[#111111] dark:text-[#EDE9E0]">
                    Abita <span className="text-[#F36A2D]">AI</span>
                  </h2>
                  <p className="text-xs text-[#6F6F6F] font-medium truncate max-w-[200px]">
                    {session?.user?.name || 'Usuario'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-[#111111] dark:text-[#EDE9E0] active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-6 space-y-2">
              <p className="text-[10px] font-black text-[#F36A2D] uppercase tracking-[0.2em] mb-4 pl-2">Más Herramientas</p>
              
              {moreNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-95 ${
                      isActive 
                        ? 'bg-white dark:bg-[#111111]/60 text-[#111111] dark:text-[#EDE9E0] shadow-sm border border-[#DEDAD0]/50 dark:border-zinc-800/50' 
                        : 'text-[#6F6F6F] bg-transparent'
                    }`}
                  >
                    <item.icon size={22} className={`${isActive ? 'text-[#F36A2D]' : 'text-[#6F6F6F]'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Logout */}
            <div className="px-6 mt-auto pt-6 border-t border-[#DEDAD0]/50 dark:border-zinc-800/50">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold bg-rose-500/10 text-rose-600 active:scale-95 transition-transform"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  )
}
