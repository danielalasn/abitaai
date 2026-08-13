'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface SheetTable {
  id: string;
  name?: string;
  type?: 'strict' | 'flexible';
  spreadsheetId: string;
  sheetName: string;
  instructions: string;
  queryColumn: string;
  readColumns: string[];
}

async function getProjectId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('No autorizado');
  const client = await prisma.client.findUnique({
    where: { email: session.user.email },
    include: { projects: { take: 1 } },
  });
  const projectId = client?.projects?.[0]?.id;
  if (!projectId) throw new Error('Proyecto no encontrado');
  return projectId;
}

export async function getSheetsConfig(): Promise<SheetTable[]> {
  const projectId = await getProjectId();
  const config = await prisma.sheetsConfig.findUnique({ where: { projectId } });
  return (config?.tables as unknown as SheetTable[]) || [];
}

export async function saveSheetsConfig(tables: SheetTable[]): Promise<void> {
  const projectId = await getProjectId();
  await prisma.sheetsConfig.upsert({
    where: { projectId },
    update: { tables: tables as any },
    create: { projectId, tables: tables as any },
  });
}
