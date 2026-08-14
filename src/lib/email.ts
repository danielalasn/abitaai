import { Resend } from 'resend';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { decrypt } from '@/lib/encryption';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface HandoffEmailData {
  leadName?: string | null;
  leadPhone: string;
  leadScore?: number;
  projectName?: string;
  channel?: string;
  chatId: string;
}

export async function sendHandoffNotification(
  notificationEmails: string[],
  data: HandoffEmailData
): Promise<void> {
  if (!notificationEmails || notificationEmails.length === 0) return;
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY no configurado. No se enviaron notificaciones.');
    return;
  }

  const { leadName, leadPhone, leadScore, projectName, channel = 'WhatsApp', chatId } = data;
  const displayName = leadName || leadPhone;
  const time = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const link = `https://abitaai.com/inbox?chatId=${chatId}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; overflow: hidden; border: 1px solid #eee;">
      <div style="padding: 24px 32px; background: white;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111;">*HANDOFF Abita AI*</h2>
        <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>Cliente:</strong> ${displayName}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>Numero:</strong> ${leadPhone}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>lead score:</strong> ${leadScore || 0}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>hora:</strong> ${time}</p>
        <p style="margin: 16px 0 0 0; font-size: 14px; color: #333;"><strong>link:</strong> <a href="${link}" style="color: #F36A2D;">${link}</a></p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Abita AI <info@alnovu.com>',
      to: notificationEmails,
      subject: `Handoff: ${displayName} necesita un asesor`,
      html: htmlBody,
    });
    console.log(`[Email] Notificación de handoff enviada a: ${notificationEmails.join(', ')}`);
  } catch (err) {
    console.error('[Email] Error al enviar notificación de handoff:', err);
  }
}

// ──────────────────────────────────────────────
// WhatsApp Handoff Notification
// ──────────────────────────────────────────────

export interface HandoffWhatsAppData {
  leadName?: string | null;
  leadPhone: string;
  leadScore?: number;
  chatId: string;
  project: {
    whatsappPhoneId?: string | null;
    whatsappToken?: string | null;
  };
}

const HANDOFF_TEMPLATE_NAME = 'handoff_notif_abitaai';

export async function sendHandoffWhatsAppNotification(
  notificationPhones: string[],
  data: HandoffWhatsAppData
): Promise<void> {
  if (!notificationPhones || notificationPhones.length === 0) return;

  const { leadName, leadPhone, leadScore, chatId, project } = data;
  const displayName = leadName || leadPhone;
  const time = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const phoneNumberId = project.whatsappPhoneId;
  const rawToken = project.whatsappToken;

  if (!phoneNumberId || !rawToken) {
    console.warn('[WA Handoff] Sin credenciales WA en el proyecto. Saltando notificación.');
    return;
  }

  const accessToken = decrypt(rawToken) || rawToken;

  for (const phone of notificationPhones) {
    try {
      await sendWhatsAppTemplate(
        phone,
        HANDOFF_TEMPLATE_NAME,
        'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: displayName },
              { type: 'text', text: leadPhone },
              { type: 'text', text: leadScore !== undefined ? leadScore.toString() : '0' },
              { type: 'text', text: time },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: chatId },
            ],
          },
        ],
        phoneNumberId,
        accessToken,
        'UTILITY'
      );
      console.log(`[WA Handoff] Notificación enviada a ${phone}`);
    } catch (err) {
      console.error(`[WA Handoff] Error enviando a ${phone}:`, err);
    }
  }
}
