'use client';

import useSWR, { preload } from 'swr';
import { getSidebarData, SidebarData } from '@/app/actions/layout-data';
import { getAnalyticsData } from '@/app/actions/analytics';

const SIDEBAR_KEY = 'sidebar';

export function useSidebarData() {
  return useSWR<SidebarData | null>(
    SIDEBAR_KEY,
    () => getSidebarData(),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
}

export function prefetchSidebarData() {
  preload(SIDEBAR_KEY, () => getSidebarData());
}

export function getAnalyticsKey(range?: { start?: string; end?: string }) {
  return `analytics:${range?.start || ''}:${range?.end || ''}`;
}

export function useAnalytics(range?: { start?: string; end?: string }) {
  const key = getAnalyticsKey(range);
  return useSWR(
    key,
    () => getAnalyticsData(range),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 4000,
    }
  );
}

export function prefetchAnalytics(range?: { start?: string; end?: string }) {
  preload(getAnalyticsKey(range), () => getAnalyticsData(range));
}
