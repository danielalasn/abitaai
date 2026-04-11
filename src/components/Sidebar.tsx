'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, Settings, Megaphone, MessageSquareCode, BrainCircuit, BarChart3 } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col p-4 shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="h-9 w-9 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-md">
          <span className="text-white dark:text-black font-bold text-base">C</span>
        </div>
        <span className="font-semibold text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
          Chat <span className="opacity-70 font-normal">AI</span>
        </span>
      </div>
      
      <nav className="flex-1 space-y-1">
        {[
          { icon: Inbox, label: 'Bandeja de entrada', href: '/' },
          { icon: BarChart3, label: 'Dashboard', href: '/analytics' },
          { icon: Megaphone, label: 'Campañas', href: '/campaigns' },
          { icon: BrainCircuit, label: 'Mejora Continua', href: '/learning' },
          { icon: Settings, label: 'Configuración Bot', href: '/settings' },
          { icon: MessageSquareCode, label: 'Probar Simulador', href: '/test-chat' },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm dark:bg-zinc-900/80 dark:text-zinc-100' 
                  : 'text-zinc-600 hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200'
              }`}
            >
              <item.icon size={18} className={isActive ? 'opacity-100' : 'opacity-70'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Element Mockup */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-auto">
        <button className="flex items-center gap-3 px-2 py-2 w-full rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            AD
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Administrador</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Agencia Real Estate</span>
          </div>
        </button>
      </div>
    </aside>
  )
}
