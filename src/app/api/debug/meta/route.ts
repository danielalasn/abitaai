import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phoneId = searchParams.get('phoneId');
  const token = searchParams.get('token');

  if (!phoneId || !token) {
    return NextResponse.json({ error: "Faltan parámetros phoneId y token" }, { status: 400 });
  }

  const results: any = {};

  try {
    // Prueba 1: Datos de la App (Para ver si el token sirve para identificarse)
    const appRes = await fetch(`https://graph.facebook.com/v21.0/app?access_token=${token}`);
    results.appInfo = await appRes.json();

    // Prueba 2: Datos del Usuario actual
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`);
    results.userInfo = await meRes.json();

    // Prueba 3: Intento de ver el Phone ID (El que está fallando)
    const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?access_token=${token}`);
    results.phoneId_Raw = await phoneRes.json();

    return NextResponse.json({
      success: true,
      diagnostics: results,
      advice: results.phoneId_Raw.error ? "Si phoneId_Raw tiene error 200, revisa que la APP esté vinculada a la cuenta de WhatsApp en el Business Manager." : "Todo parece normal."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
