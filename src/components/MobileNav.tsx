'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  Inbox, Megaphone, LayoutTemplate, BarChart3, 
  Menu, X, Files, UserCheck, BrainCircuit, MessageSquareCode, Settings, LogOut,
  User, Bell, Globe, Puzzle, Bot, ArrowLeft, Sun, Moon
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import ThemeSwitch from '@/components/ui/theme-switch'

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'modules' | 'settings'>('modules')

  const mainNavItems = [
    { icon: Inbox, label: 'Bandeja', href: '/inbox' },
    { icon: Megaphone, label: 'Campañas', href: '/campaigns' },
    { icon: LayoutTemplate, label: 'Templates', href: '/templates' },
    { icon: BarChart3, label: 'Dashboard', href: '/analytics' },
  ]

  const allNavItems = [
    { icon: Inbox, label: 'Bandeja', href: '/inbox', group: 'Principal' },
    { icon: Megaphone, label: 'Campañas', href: '/campaigns', group: 'Principal' },
    { icon: LayoutTemplate, label: 'Templates', href: '/templates', group: 'Principal' },
    { icon: BarChart3, label: 'Dashboard', href: '/analytics', group: 'Principal' },
    { icon: UserCheck, label: 'Leads', href: '/leads', group: 'Gestión' },
    { icon: BrainCircuit, label: 'Aprendizaje', href: '/learning', group: 'Gestión' },
    { icon: MessageSquareCode, label: 'Simulador', href: '/test-chat', group: 'Gestión' },
    { icon: Files, label: 'Archivos', href: '/files', group: 'Gestión' },
  ]

  const settingsItems = [
    { icon: User, label: 'Mi Perfil', href: '/settings?section=profile' },
    { icon: Bell, label: 'Notificaciones', href: '/settings?section=notifications' },
    { icon: Globe, label: 'Conexiones', href: '/settings?section=connections' },
    { icon: Puzzle, label: 'Herramientas', href: '/settings?section=tools' },
    { icon: Bot, label: 'Asistente IA', href: '/settings?section=botConfig' },
  ]

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
    <>
      {/* Bottom Navigation Bar — Se esconde automáticamente cuando el Drawer está abierto o en Configuración */}
      {!isMenuOpen && pathname !== '/settings' && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe animate-in fade-in duration-200">
          <nav className="pointer-events-auto flex items-center justify-around h-13 w-full max-w-xs px-2 rounded-full bg-[#EBE4D6]/25 dark:bg-[#1C1815]/25 backdrop-blur-2xl border border-[#8A8172]/20 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_36px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 active:scale-90 ${
                    isActive
                      ? 'bg-black/10 dark:bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'text-[#FF4D00]' : 'text-[#8A8172] dark:text-[#A3A3A3]'}
                  />
                </Link>
              )
            })}
            
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              title="Todos los módulos"
              aria-label="Todos los módulos"
              className="flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90"
            >
              <Menu size={21} className="text-[#8A8172] dark:text-[#A3A3A3]" />
            </button>
          </nav>
        </div>
      )}

      {/* Drawer Menu Overlay */}
      {isMenuOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 right-0 z-[70] w-64 max-w-[80vw] bg-[#FAF6EE] dark:bg-[#161412] shadow-[-10px_0_30px_rgba(0,0,0,0.4)] border-l border-[#8A8172]/20 dark:border-white/10 flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex flex-col h-full overflow-hidden">
            
              {/* Header con Isotipo puro sin cuadro */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#8A8172]/15 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="894.02 80 377.93 336.06"
                      className="h-6 w-6 text-[#FF4D00]"
                      fill="currentColor"
                      aria-label="Abita AI"
                    >
                      <path d="M1184.09 248.293L1183.07 246.366C1177.73 236.181 1165.53 231.612 1165.04 231.419C1163.3 230.814 1160.5 230.043 1156.95 229.74C1156.17 229.658 1155.35 229.63 1154.41 229.63C1153.48 229.63 1152.57 229.658 1151.66 229.713H1151.25L1099.75 229.575H1038.17L1066.72 175.129L1092.87 125.28L1116.48 80H1037.21L1015.33 121.922L970.43 207.472H970.541L949.07 248.43C943.951 258.752 944.088 270.561 949.456 280.773C954.796 290.958 964.375 297.729 975.716 299.408C977.147 299.601 978.661 299.738 980.367 299.738H982.074L1050.09 299.656L1131.76 299.904L1158.05 350.028L1186.1 403.483C1186.1 403.483 1188.63 408.218 1192.73 415.98H1271.95L1206.05 290.325C1200.79 280.388 1192.73 265.056 1184.03 248.265L1184.09 248.293Z"/>
                      <path d="M996.69 356.607C996.69 349.34 993.167 342.651 987.442 339.018L959.751 321.456C950.97 315.896 939.739 315.896 930.959 321.456L903.268 339.018C897.543 342.651 894.019 349.34 894.019 356.607V398.253C893.936 400.07 894.019 404.254 896.496 408.41C897.818 410.585 899.276 411.906 899.854 412.401C904.176 416.062 909.324 416.062 911.14 415.98C922.508 415.457 930.931 415.98 942.602 415.842C943.042 415.842 944.859 415.842 948.465 415.842C963.742 415.787 971.367 415.842 973.376 415.842C975.055 415.842 978.165 415.842 979.789 415.842C980.478 415.842 989.451 415.897 994.185 408.41C996.8 404.254 996.773 399.96 996.663 398.253V356.607H996.69Z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-base tracking-tight text-[#111111] dark:text-[#EDE9E0] flex items-center gap-1.5">
                      Abita <span className="text-[#FF4D00]">AI</span>
                    </h2>
                    <p className="text-[11px] text-[#8A8172] dark:text-[#8E8B85] font-medium truncate max-w-[180px]">
                      {session?.user?.name || session?.user?.email || 'Panel Principal'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-[#8A8172] hover:text-[#111111] dark:hover:text-[#EDE9E0] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                  aria-label="Cerrar menú"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista interna del Drawer (Módulos o Configuración) */}
              {drawerTab === 'modules' ? (
                <>
                  <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#FF4D00]">
                      Módulos y Herramientas
                    </div>

                    {allNavItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            isActive 
                              ? 'bg-[#FF4D00]/15 text-[#FF4D00] font-semibold border border-[#FF4D00]/25' 
                              : 'text-[#3E3C38] dark:text-[#D5D0C7] hover:bg-black/5 dark:hover:bg-white/[.06]'
                          }`}
                        >
                          <item.icon 
                            size={18} 
                            strokeWidth={isActive ? 2.4 : 1.9}
                            className={isActive ? 'text-[#FF4D00]' : 'text-[#8A8172] dark:text-[#8E8B85]'} 
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D00] shadow-[0_0_6px_rgba(255,77,0,.8)]" />
                          )}
                        </Link>
                      )
                    })}

                    {/* Botón directo a Configuración que cambia la vista interna del mismo drawer */}
                    <button
                      type="button"
                      onClick={() => setDrawerTab('settings')}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        pathname === '/settings'
                          ? 'bg-[#FF4D00]/15 text-[#FF4D00] font-semibold border border-[#FF4D00]/25'
                          : 'text-[#3E3C38] dark:text-[#D5D0C7] hover:bg-black/5 dark:hover:bg-white/[.06]'
                      }`}
                    >
                      <Settings 
                        size={18} 
                        strokeWidth={pathname === '/settings' ? 2.4 : 1.9}
                        className={pathname === '/settings' ? 'text-[#FF4D00]' : 'text-[#8A8172] dark:text-[#8E8B85]'} 
                      />
                      <span className="flex-1 text-left truncate">Configuración</span>
                      <span className="text-[10px] text-[#8A8172] font-semibold">›</span>
                    </button>
                  </div>

                  {/* Footer con Cerrar Sesión */}
                  <div className="p-3 border-t border-[#8A8172]/15 dark:border-white/10 shrink-0">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 active:scale-[0.98] transition-all"
                    >
                      <LogOut size={15} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Vista interna de Configuración */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-1">
                    <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#FF4D00]">
                      Configuración General
                    </div>

                    {settingsItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#3E3C38] dark:text-[#D5D0C7] hover:bg-black/5 dark:hover:bg-white/[.06] transition-all"
                      >
                        <item.icon size={18} strokeWidth={1.9} className="text-[#8A8172] dark:text-[#8E8B85]" />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    ))}

                    {/* Switch de Apariencia */}
                    <div className="mt-4 pt-3 border-t border-[#8A8172]/15 dark:border-white/10 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[#FF4D00]/10 rounded-lg">
                          <Sun size={14} className="text-[#FF4D00] dark:hidden" />
                          <Moon size={14} className="text-[#FF4D00] hidden dark:block" />
                        </div>
                        <span className="text-xs font-semibold text-[#111111] dark:text-[#EDE9E0]">Apariencia</span>
                      </div>
                      <div className="scale-90 origin-right">
                        <ThemeSwitch />
                      </div>
                    </div>

                    {/* Botón de regreso a Módulos (abajo, encima de la línea que separa Cerrar Sesión) */}
                    <div className="pt-2 px-1">
                      <button
                        type="button"
                        onClick={() => setDrawerTab('modules')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#FF4D00] hover:text-[#E55A1D] hover:bg-[#FF4D00]/10 transition-all text-left"
                      >
                        <ArrowLeft size={14} strokeWidth={2.5} />
                        <span>Módulos</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer con Cerrar Sesión */}
                  <div className="p-3 border-t border-[#8A8172]/15 dark:border-white/10 shrink-0">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 active:scale-[0.98] transition-all"
                    >
                      <LogOut size={15} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </>
      )}
    </>
  )
}
