'use client';

import Link from 'next/link';
import { Monitor, Inbox, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

/**
 * Muestra un banner en móvil indicando que la sección está optimizada para escritorio.
 * En desktop no renderiza nada (solo muestra los children).
 */
export function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
