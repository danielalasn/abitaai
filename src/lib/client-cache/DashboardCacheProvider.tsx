'use client';

import React, { useMemo } from 'react';
import { SWRConfig } from 'swr';
import { createStorageProvider } from './storage-provider';

interface DashboardCacheProviderProps {
  userId: string;
  children: React.ReactNode;
}

export function DashboardCacheProvider({ userId, children }: DashboardCacheProviderProps) {
  const provider = useMemo(() => createStorageProvider(userId), [userId]);

  return (
    <SWRConfig
      value={{
        provider,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 3000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
