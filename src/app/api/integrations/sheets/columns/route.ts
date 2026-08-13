import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nango } from '@/lib/integrations/nangoClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const spreadsheetId = searchParams.get('spreadsheetId');
  const sheetName = searchParams.get('sheetName') || 'Sheet1';

  if (!projectId || !spreadsheetId) {
    return NextResponse.json({ error: 'projectId y spreadsheetId son requeridos' }, { status: 400 });
  }

  // Get Nango connection for this project
  const conn = await prisma.nangoConnection.findFirst({
    where: { projectId, providerConfigKey: 'google-sheet', status: 'CONNECTED' },
  });

  if (!conn) {
    return NextResponse.json({ error: 'No hay conexión de Google Sheets para este proyecto' }, { status: 404 });
  }

  try {
    // Fetch only first row (headers)
    const range = `${sheetName}!1:1`;
    const response = await nango.get({
      providerConfigKey: 'google-sheet',
      connectionId: conn.connectionId,
      baseUrlOverride: 'https://sheets.googleapis.com',
      endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    });

    const headers: string[] = response.data?.values?.[0] || [];
    return NextResponse.json({ success: true, columns: headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
