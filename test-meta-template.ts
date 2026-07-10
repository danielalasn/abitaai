import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const token = process.env.SYSTEM_USER_TOKEN;
  if (!token) return console.error('No hay token');
  
  const exUrl = "https://lndqwnxodozquindlqzo.supabase.co/storage/v1/object/public/media/uploads/44a8903b-60db-45c9-8f98-64d514abc5ae-WhatsApp_Image_2026-04-15_at_5.34.08_PM.jpeg";
  const fileRes = await fetch(exUrl);
  const blob = await fileRes.blob();
  
  console.log("Blob type:", blob.type, "size:", blob.size);
  
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  // Usamos el constructor File para forzar nombre y tipo
  const file = new File([blob], 'example.jpeg', { type: blob.type || 'image/jpeg' });
  formData.append('file', file);
  
  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/1087380634460356/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  
  const mediaData = await uploadRes.json();
  console.log("Media Upload Response:", mediaData);
  
  if (!mediaData.id) return;
  
  const components = [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: [mediaData.id]
      }
    },
    {
      type: "BODY",
      text: "Este es un mensaje para que apartes la fecha de nuestra boda {{1}}",
      example: {
        body_text: [["Daniel"]]
      }
    }
  ];
  
  const payload = {
    name: "prueba_boda_test_456_" + Math.floor(Math.random()*1000),
    category: "MARKETING",
    language: "es",
    components
  };
  
  console.log("Sending Template Payload:", JSON.stringify(payload, null, 2));
  
  const res = await fetch(`https://graph.facebook.com/v20.0/2178386092973067/message_templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  console.log("Template Create Response:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
