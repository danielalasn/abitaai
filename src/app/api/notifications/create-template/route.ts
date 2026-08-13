import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProject } from '@/lib/auth-server';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

const TEMPLATE_NAME = 'handoff_notif_abita';

export async function POST(req: NextRequest) {
  try {
    const project = await getCurrentProject();
    if (!project) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (project as any).whatsappBusinessId;
    const rawToken = (project as any).whatsappToken;

    if (!businessId || !rawToken) {
      return NextResponse.json(
        { error: 'Configura el WhatsApp Business ID y el Token en Ajustes antes de crear la plantilla.' },
        { status: 400 }
      );
    }

    const token = decrypt(rawToken) || rawToken;

    // Check if the template already exists
    const checkRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/message_templates?name=${TEMPLATE_NAME}&fields=name,status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const checkData = await checkRes.json();
    const existing = checkData.data?.[0];

    if (existing) {
      const status = existing.status; // APPROVED, PENDING, REJECTED, etc.
      await prisma.project.update({
        where: { id: project.id },
        data: { handoffTemplateStatus: status },
      });
      return NextResponse.json({ status, alreadyExisted: true });
    }

    // Create the template with URL button
    const body = {
      name: TEMPLATE_NAME,
      language: 'es',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: '*HANDOFF Abita AI*\nUn cliente requiere atención.\n\nCliente: {{1}}\nNúmero de teléfono: {{2}}\nPuntos de lead score: {{3}}\nHora de la solicitud: {{4}}\n\nPor favor ingresa al panel de control para dar seguimiento a la conversación.',
          example: {
            body_text: [['Juan Pérez', '+50378901234', '15', '14:30']],
          },
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: 'Ver conversación',
              url: 'https://platform.abitaai.com/inbox?chatId={{1}}',
              example: ['cmo96o9860001fat2yu9ivivk'],
            },
          ],
        },
      ],
    };

    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/message_templates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const createData = await createRes.json();
    console.log('[DEBUG] Meta create template response:', JSON.stringify(createData, null, 2));

    if (!createRes.ok || createData.error) {
      const msg = createData.error?.message || 'Error al crear la plantilla en Meta.';
      console.error('[DEBUG] Meta error object:', createData.error);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Meta returns status in the create response
    const status = createData.status || 'PENDING';
    await prisma.project.update({
      where: { id: project.id },
      data: { handoffTemplateStatus: status },
    });

    return NextResponse.json({ status, id: createData.id });
  } catch (err: any) {
    console.error('[create-template] Error:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
