import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface HandoffEmailData {
  leadName?: string | null;
  leadPhone: string;
  leadScore?: number;
  projectName?: string;
  channel?: string;
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

  const { leadName, leadPhone, leadScore, projectName, channel = 'WhatsApp' } = data;
  const displayName = leadName || leadPhone;
  const time = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; overflow: hidden;">
      <div style="background: #F36A2D; padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Handoff requerido</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Un cliente necesita atención humana</p>
      </div>
      <div style="padding: 28px 32px; background: white;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; font-size: 14px; width: 130px;">Cliente</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111; font-size: 14px;">${displayName}</td>
          </tr>
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; color: #666; font-size: 14px;">Teléfono</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111; font-size: 14px;">${leadPhone}</td>
          </tr>
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; color: #666; font-size: 14px;">Canal</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111; font-size: 14px;">${channel}</td>
          </tr>
          ${leadScore !== undefined ? `
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; color: #666; font-size: 14px;">Lead Score</td>
            <td style="padding: 10px 0; font-weight: bold; color: #F36A2D; font-size: 14px;">${leadScore} pts</td>
          </tr>` : ''}
          ${projectName ? `
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; color: #666; font-size: 14px;">Proyecto</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111; font-size: 14px;">${projectName}</td>
          </tr>` : ''}
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; color: #666; font-size: 14px;">Hora</td>
            <td style="padding: 10px 0; color: #111; font-size: 14px;">${time}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding: 14px 18px; background: #FFF4EE; border-left: 4px solid #F36A2D; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #333;">Entra a tu plataforma y atiende este cliente a la brevedad.</p>
        </div>
      </div>
      <div style="padding: 16px 32px; background: #f9f9f9; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #aaa;">Abita AI — Notificación automática</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Abita AI <info@alnovu.com>',
      to: notificationEmails,
      subject: `Handoff: ${displayName} necesita un agente`,
      html: htmlBody,
    });
    console.log(`[Email] Notificación de handoff enviada a: ${notificationEmails.join(', ')}`);
  } catch (err) {
    console.error('[Email] Error al enviar notificación de handoff:', err);
  }
}
