import { Nango } from '@nangohq/node';
import dotenv from 'dotenv';
dotenv.config();

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });

// El connection_id REAL asignado por Nango (de la respuesta anterior)
const CONNECTION_ID = 'b37b51ea-3dab-4303-a739-18ded7df4c9c';
const PROVIDER = 'google-calendar';

async function testToken() {
  try {
    const token = await nango.getToken(PROVIDER, CONNECTION_ID);
    console.log('✅ Token obtenido correctamente!');
    console.log('Access Token (primeros 50 chars):', String(token).substring(0, 50) + '...');

    // Prueba real: traer eventos de Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=3&orderBy=startTime&singleEvents=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    console.log('\n--- Proximos 3 eventos del calendario ---');
    if (data.items?.length) {
      data.items.forEach((ev: any) => {
        console.log(`- ${ev.summary} | ${ev.start?.dateTime || ev.start?.date}`);
      });
    } else {
      console.log('Sin eventos próximos:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('❌ Error:', err?.response?.data || err.message);
  }
}

testToken();
