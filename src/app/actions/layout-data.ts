'use server';

import { getCurrentProject } from '@/lib/auth-server';
import { getCurrentMonthUsage } from '@/lib/subscription';
import { withTiming } from '@/lib/perf';

export interface SidebarData {
  usage: {
    limit: number | null;
    usage: number;
  };
  avatarUrl: string | null;
}

export async function getSidebarData(): Promise<SidebarData | null> {
  return withTiming('getSidebarData', async () => {
    const project = await getCurrentProject();
    if (!project || !project.clientId || !project.client) {
      return null;
    }

    const client = project.client;
    const usage = await getCurrentMonthUsage(client.id, client.subscriptionResetDay);

    return {
      usage: {
        limit: client.messageLimit ?? null,
        usage,
      },
      avatarUrl: client.avatarUrl ?? null,
    };
  });
}
