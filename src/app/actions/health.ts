'use server';

import prisma from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from '@/lib/models';

export async function checkAIModelsConnections() {
  const details = [];

  // Check Claude
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const claudeModel = AI_MODELS.CLAUDE_MAIN || 'claude-3-haiku-20240307';
    await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
    details.push({ name: `Claude (${claudeModel})`, status: 'success', message: 'Conectado' });
  } catch (error: any) {
    details.push({ name: `Claude (${AI_MODELS.CLAUDE_MAIN || 'claude-3-haiku-20240307'})`, status: 'error', message: error.message || 'Error de conexión' });
  }

  // Check Gemini
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const geminiModel = AI_MODELS.GEMINI_FALLBACK || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: geminiModel });
    await model.generateContent('ping');
    details.push({ name: `Gemini (${geminiModel})`, status: 'success', message: 'Conectado' });
  } catch (error: any) {
    details.push({ name: `Gemini (${AI_MODELS.GEMINI_FALLBACK || 'gemini-1.5-flash'})`, status: 'error', message: error.message || 'Error de conexión' });
  }

  const hasError = details.some(d => d.status === 'error');
  return {
    status: hasError ? 'error' : 'success',
    message: hasError ? 'Algunos modelos fallaron' : 'Todos conectados',
    details
  };
}

export async function checkDatabaseConnection() {
  const details = [];
  
  // Prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    details.push({ name: 'Postgres (Prisma)', status: 'success', message: 'Conectado' });
  } catch (error: any) {
    details.push({ name: 'Postgres (Prisma)', status: 'error', message: error.message || 'Error de conexión' });
  }

  // Redis
  try {
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
      await redis.ping();
      redis.disconnect();
      details.push({ name: 'Redis Cache', status: 'success', message: 'Conectado' });
    } else {
      details.push({ name: 'Redis Cache', status: 'error', message: 'REDIS_URL no configurado' });
    }
  } catch (error: any) {
    details.push({ name: 'Redis Cache', status: 'error', message: error.message || 'Error de conexión' });
  }

  // Supabase
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      // test connectivity by listing buckets
      const { error } = await supabase.storage.listBuckets();
      if (error) throw error;
      details.push({ name: 'Supabase Storage', status: 'success', message: 'Conectado' });
    } else {
      details.push({ name: 'Supabase Storage', status: 'error', message: 'Credenciales de Supabase faltantes' });
    }
  } catch (error: any) {
    details.push({ name: 'Supabase Storage', status: 'error', message: error.message || 'Error de conexión' });
  }

  const hasError = details.some(d => d.status === 'error');
  return { 
    status: hasError ? 'error' : 'success', 
    message: hasError ? 'Algunas bases fallaron' : 'Todos los servicios DB conectados',
    details
  };
}

export async function checkWhatsAppConnections() {
  try {
    const { decrypt } = await import('@/lib/encryption');
    const { verifyWhatsappConnection } = await import('@/app/actions/settings');

    const projects = await prisma.project.findMany({
      where: {
        whatsappToken: { not: null },
        whatsappPhoneId: { not: null }
      },
      select: { id: true, name: true, whatsappToken: true, whatsappPhoneId: true, client: { select: { name: true } } }
    });

    if (projects.length === 0) {
      return { status: 'success', message: 'No hay proyectos con tokens de WA', details: [] };
    }

    const details = [];
    for (const project of projects) {
      const displayName = project.client?.name || project.name;
      try {
        const decryptedToken = decrypt(project.whatsappToken) || '';
        if (!decryptedToken) {
          details.push({ name: displayName, status: 'error', message: 'Token no pudo ser descifrado' });
          continue;
        }

        const verifyResult = await verifyWhatsappConnection(project.whatsappPhoneId || undefined, decryptedToken);
        
        if (!verifyResult.success) {
          details.push({ name: displayName, status: 'error', message: verifyResult.message });
        } else {
          details.push({ name: displayName, status: 'success', message: verifyResult.message });
        }
      } catch (err: any) {
        details.push({ name: displayName, status: 'error', message: 'Error de red' });
      }
    }

    const hasError = details.some(d => d.status === 'error');
    return { 
      status: hasError ? 'error' : 'success', 
      message: hasError ? 'Algunos tokens fallaron' : `${projects.length} tokens válidos`,
      details 
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al checar tokens', details: [] };
  }
}

export async function checkMasterMetaConnection() {
  const details = [];
  try {
    const { verifyWhatsappConnection } = await import('@/app/actions/settings');
    const token = process.env.SYSTEM_USER_TOKEN || '';
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    
    if (!token) {
      details.push({ name: 'Abita Master Account', status: 'error', message: 'SYSTEM_USER_TOKEN no configurado' });
    } else {
      const verifyResult = await verifyWhatsappConnection(phoneId, token);
      if (!verifyResult.success) {
        details.push({ name: 'Abita Master Account', status: 'error', message: verifyResult.message });
      } else {
        details.push({ name: 'Abita Master Account', status: 'success', message: verifyResult.message });
      }
    }

    const hasError = details.some(d => d.status === 'error');
    return { 
      status: hasError ? 'error' : 'success', 
      message: hasError ? 'El Master Token falló' : 'Master Token válido',
      details 
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al checar Master Token', details: [] };
  }
}

export async function checkToolsConnections() {
  const details = [];

  // Resend
  try {
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      });
      // Just checking if unauthorized
      if (response.status === 401 || response.status === 403) {
        throw new Error('API Key de Resend inválida');
      }
      details.push({ name: 'Resend (Emails)', status: 'success', message: 'Conectado' });
    } else {
      details.push({ name: 'Resend (Emails)', status: 'error', message: 'RESEND_API_KEY no configurado' });
    }
  } catch (error: any) {
    details.push({ name: 'Resend (Emails)', status: 'error', message: error.message || 'Error de conexión' });
  }

  // Nango
  try {
    if (process.env.NANGO_SECRET_KEY) {
      const response = await fetch('https://api.nango.dev/connection', {
        headers: { Authorization: `Bearer ${process.env.NANGO_SECRET_KEY}` }
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Secret Key de Nango inválida');
      }
      details.push({ name: 'Nango (Integraciones)', status: 'success', message: 'Conectado' });
    } else {
      details.push({ name: 'Nango (Integraciones)', status: 'error', message: 'NANGO_SECRET_KEY no configurado' });
    }
  } catch (error: any) {
    details.push({ name: 'Nango (Integraciones)', status: 'error', message: error.message || 'Error de conexión' });
  }

  const hasError = details.some(d => d.status === 'error');
  return { 
    status: hasError ? 'error' : 'success', 
    message: hasError ? 'Algunas herramientas fallaron' : 'Todas las herramientas conectadas',
    details
  };
}
