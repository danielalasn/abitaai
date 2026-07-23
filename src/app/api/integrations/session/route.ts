import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nango } from '@/lib/integrations/nangoClient';

/**
 * POST /api/integrations/session
 *
 * Genera un token de sesión de Nango (Connect Session) para el frontend.
 * Body: { projectId }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const connectionId = body.projectId || session.user.id || 'default_user';

    // Generar la sesión Connect en Nango usando la Secret Key y el ID del cliente
    const sessionToken = await nango.createConnectSession({
      end_user: {
        id: connectionId,
      },
    });
    console.log('[Nango Session Token Response]:', sessionToken);

    // La respuesta de Nango SDK tiene la estructura: { data: { token, connect_link, expires_at } }
    const token = sessionToken?.data?.token || (sessionToken as any)?.token;
    const connectLink = sessionToken?.data?.connect_link || (sessionToken as any)?.connect_link;

    if (!token) {
      throw new Error(`Token no encontrado en la respuesta de Nango: ${JSON.stringify(sessionToken)}`);
    }

    return NextResponse.json({ success: true, token, connectLink });
  } catch (err: any) {
    console.error('[Nango Session Error]:', err?.response?.data || err.message);
    return NextResponse.json(
      { error: 'Error al generar sesión de Nango' },
      { status: 500 }
    );
  }
}
