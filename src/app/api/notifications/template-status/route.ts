import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProject } from '@/lib/auth-server';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

const TEMPLATE_NAME = 'handoff_notif_abita';

export async function GET(req: NextRequest) {
  try {
    const project = await getCurrentProject();
    if (!project) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (project as any).whatsappBusinessId;
    const rawToken = (project as any).whatsappToken;

    if (!businessId || !rawToken) {
      return NextResponse.json({ status: null });
    }

    const token = decrypt(rawToken) || rawToken;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/message_templates?name=${TEMPLATE_NAME}&fields=name,status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    const template = data.data?.[0];

    if (!template) {
      // Template doesn't exist in Meta — reset local status
      await prisma.project.update({
        where: { id: project.id },
        data: { handoffTemplateStatus: null },
      });
      return NextResponse.json({ status: null });
    }

    const status = template.status;

    // Sync to DB
    await prisma.project.update({
      where: { id: project.id },
      data: { handoffTemplateStatus: status },
    });

    return NextResponse.json({ status });
  } catch (err: any) {
    console.error('[template-status] Error:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
