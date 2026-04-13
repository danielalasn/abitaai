'use client';

import React from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-[#09090b] font-sans selection:bg-purple-500/20">
      <header className="h-20 flex items-center justify-between px-8 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
             <span className="text-white dark:text-zinc-900 font-bold text-lg italic">a</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100 block">abita.ai</span>
            <span className="text-xs text-purple-600 font-medium uppercase tracking-wider">Panel de Administración</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* User Profile */}
          <div className="flex items-center gap-3 pr-6 border-r border-zinc-200 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shadow-sm">
              {userInitial}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                {session?.user?.name || 'Administrador'}
              </span>
              <span className="text-xs text-zinc-500">
                {session?.user?.email || 'admin@abitaai.com'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 p-2 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
            title="Cerrar Sesión"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-medium">Salir</span>
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
