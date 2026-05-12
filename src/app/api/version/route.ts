import { NextResponse } from 'next/server';

// Generamos un ID único cuando el servidor (Node process) arranca
// Esto asegura que cada vez que Render despliega una nueva versión o reinicia, este ID cambia.
const SERVER_STARTUP_ID = Date.now().toString();

export async function GET() {
  return NextResponse.json(
    { version: SERVER_STARTUP_ID },
    { 
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
}
