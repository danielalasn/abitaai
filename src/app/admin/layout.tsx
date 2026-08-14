'use client';

import React from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { updateUserTheme } from '@/app/actions/user';
import HealthCheckModal from '@/components/HealthCheckModal';
import { Activity } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = React.useState(false);
  
  React.useEffect(() => setMounted(true), []);
  
  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A';

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await updateUserTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-[#09090b] font-sans selection:bg-orange-500/20">
      <header className="h-20 flex items-center justify-between px-8 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
             <span className="text-white dark:text-zinc-900 font-bold text-lg italic">a</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100 block">abita.ai</span>
            <span className="text-xs text-orange-600 font-medium uppercase tracking-wider">Panel de Administración</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Health Check */}
          <button
            onClick={() => setIsHealthCheckOpen(true)}
            className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all border border-orange-200 dark:border-orange-900/30 flex items-center justify-center w-10 h-10"
            title="Chequeo de Salud del Sistema"
          >
            <Activity size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700 flex items-center justify-center w-10 h-10"
            title={mounted ? (theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') : 'Cambiar tema'}
          >
            {mounted ? (theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />) : <span className="w-[18px] h-[18px]" />}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pr-6 border-r border-zinc-200 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shadow-sm">
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

      {isHealthCheckOpen && (
        <HealthCheckModal onClose={() => setIsHealthCheckOpen(false)} />
      )}
    </div>
  );
}
