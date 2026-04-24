'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getWaMediaType } from '@/lib/whatsapp';

export async function uploadFileAction(formData: FormData) {

  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No se proporcionó ningún archivo');

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) throw new Error('El archivo no puede superar 20MB');

    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = `uploads/${fileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let { data, error } = await supabaseAdmin
      .storage
      .from('media')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (error && (error.message.includes('not found') || (error as any).status === 404)) {
      await supabaseAdmin.storage.createBucket('media', {
        public: true,
        fileSizeLimit: MAX_SIZE,
      });
      const retry = await supabaseAdmin.storage.from('media').upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      mediaType: getWaMediaType(file.type),
      filename: file.name,
      mimeType: file.type,
    };
  } catch (error: any) {
    console.error('[Storage Error]', error);
    return { success: false, error: error.message };
  }
}

/**
 * @deprecated Usa uploadFileAction.
 */
export async function uploadImageAction(formData: FormData) {
  return uploadFileAction(formData);
}

/**
 * Descarga un archivo multimedia desde los servidores de Meta (Wa Cloud API)
 * usando el ID del media y el Bearer token, y lo sube permanentemente a Supabase.
 */
export async function downloadAndUploadMetaMedia(
  mediaId: string,
  accessToken: string,
  mimeTypeFallback: string = 'application/octet-stream',
  filenameFallback: string = 'adjunto'
) {
  try {
    // 1. Obtener la URL temporal del archivo en Meta
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'curl/7.81.0' 
      }
    });
    const metaData = await metaRes.json();
    if (!metaRes.ok || !metaData.url) {
      console.error('[Meta Media Error] No se pudo obtener la URL de Meta:', metaData);
      return null;
    }

    const { url: downloadUrl, mime_type: actualMimeType } = metaData;
    const finalMimeType = actualMimeType || mimeTypeFallback;

    // 2. Descargar los bytes binarios usando el mismo token
    const fileRes = await fetch(downloadUrl, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'curl/7.81.0'
      }
    });
    if (!fileRes.ok) {
      console.error('[Meta Media Error] Fallo al descargar el archivo desde la URL temporal');
      return null;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Subir a Supabase
    // Buscar extensión a partir del mimetype para el nombre de archivo si no traía extensión
    const extMatch = finalMimeType.match(/\/(.*?)(;|$)/);
    const fallbackExt = extMatch ? `.${extMatch[1]}` : '';
    const safeFilename = filenameFallback.includes('.') ? filenameFallback : `${filenameFallback}${fallbackExt}`;
    
    // Limpiar nombre
    const cleanName = safeFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileName = `${uuidv4()}-${cleanName}`;
    const filePath = `uploads/${fileName}`;

    let { data, error } = await supabaseAdmin
      .storage
      .from('media')
      .upload(filePath, buffer, { contentType: finalMimeType, upsert: false });

    // Intentar crear bucket si no existe (raro, pero como fallback seguro)
    if (error && (error.message.includes('not found') || (error as any).status === 404)) {
      await supabaseAdmin.storage.createBucket('media', { public: true });
      const retry = await supabaseAdmin.storage.from('media').upload(filePath, buffer, {
        contentType: finalMimeType,
        upsert: false,
      });
      error = retry.error;
    }

    if (error) {
      console.error('[Supabase Media Error] No se pudo subir:', error);
      return null;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(filePath);

    return {
      url: publicUrl,
      mediaType: getWaMediaType(finalMimeType),
      filename: cleanName,
      mimeType: finalMimeType
    };

  } catch (err) {
    console.error('[downloadAndUploadMetaMedia] Catch Error:', err);
    return null;
  }
}
