
/**
 * Utility to send messages via Instagram Graph API
 */
export async function sendInstagramMessage(recipientId: string, text: string, accessToken: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        access_token: accessToken,
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error('[Instagram API Error]', data.error);
      return { success: false, error: data.error };
    }

    return { success: true, messageId: data.message_id };
  } catch (err) {
    console.error('[Instagram API Exception]', err);
    return { success: false, error: err };
  }
}
