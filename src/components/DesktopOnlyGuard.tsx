'use client';

import Link from 'next/link';
import { Monitor, Inbox, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

/**
 * Muestra un banner en móvil indicando que la sección está optimizada para escritorio.
 * En desktop no renderiza nada (solo muestra los children).
 */
export function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Banner visible solo en móvil */}
      <div className="flex md:hidden h-full flex-col items-center justify-center bg-[#E9E4D8] dark:bg-[#1A1714] p-8 text-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-[#111111] dark:bg-[#E9E4D8] flex items-center justify-center shadow-xl">
          <Monitor size={40} className="text-[#F36A2D]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#111111] dark:text-[#EDE9E0]">
            Usa un escritorio
          </h2>
          <p className="text-sm text-[#6F6F6F] max-w-xs leading-relaxed">
            Esta sección está optimizada para pantallas grandes. Desde el celular puedes acceder al inbox para contestar mensajes.
          </p>
        </div>
        <Link
          href="/inbox"
          className="flex items-center gap-2 bg-[#F36A2D] hover:bg-[#F36A2D]/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
        >
          <Inbox size={18} />
          Ir al Inbox
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-[#6F6F6F] hover:text-rose-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido normal: solo visible en desktop */}
      <div className="hidden md:flex h-full flex-col">
        {children}
      </div>
    </>
  );
}
