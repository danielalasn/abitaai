'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública.
 */
export async function uploadImageAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No se proporcionó ningún archivo");

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        throw new Error("El archivo debe ser una imagen");
    }

    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = `uploads/${fileName}`;

    // Convertir File a ArrayBuffer para Supabase
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir al bucket 'media'
    let { data, error } = await supabaseAdmin
      .storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    // Si falló por falta de bucket, intentamos crearlo
    if (error && (error.message.includes('not found') || (error as any).status === 404)) {
      console.log('Bucket "media" no encontrado, intentando crear...');
      await supabaseAdmin.storage.createBucket('media', { 
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

      // Re-intentar subida una vez más
      const retry = await supabaseAdmin.storage.from('media').upload(filePath, buffer, { 
        contentType: file.type,
        upsert: false
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Obtener la URL pública
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('media')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('[Storage Error]', error);
    return { success: false, error: error.message };
  }
}
