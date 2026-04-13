import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-[#09090b] font-sans selection:bg-purple-500/20">
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center">
             <span className="text-white dark:text-zinc-900 font-bold text-sm">a</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Abita Admin Panel</span>
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full">
          Master Admin
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
