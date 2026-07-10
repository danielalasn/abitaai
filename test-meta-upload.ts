import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const token = process.env.SYSTEM_USER_TOKEN;
  const appId = process.env.META_APP_ID;
  if (!token || !appId) return console.error('No env');
  
  const exUrl = "https://lndqwnxodozquindlqzo.supabase.co/storage/v1/object/public/media/uploads/44a8903b-60db-45c9-8f98-64d514abc5ae-WhatsApp_Image_2026-04-15_at_5.34.08_PM.jpeg";
  const fileRes = await fetch(exUrl);
  const blob = await fileRes.blob();
  const buffer = await blob.arrayBuffer();
  
  console.log("Blob type:", blob.type, "size:", blob.size);
  
  // 1. Create upload session
  const createSessionUrl = `https://graph.facebook.com/v20.0/${appId}/uploads?file_length=${blob.size}&file_type=${blob.type || 'image/jpeg'}`;
  console.log("Create session URL:", createSessionUrl);
  
  const sessionRes = await fetch(createSessionUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const sessionData = await sessionRes.json();
  console.log("Session Data:", sessionData);
  
  if (!sessionData.id) return;
  const sessionId = sessionData.id;
  
  // 2. Upload file
  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${sessionId}`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      file_offset: '0'
    },
    body: buffer
  });
  
  const uploadData = await uploadRes.json();
  console.log("Resumable Upload Response:", uploadData);
  
  if (!uploadData.h) return;
  
  // 3. Create Template
  const components = [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: [uploadData.h]
      }
    },
    {
      type: "BODY",
      text: "Prueba Resumable Upload boda {{1}}",
      example: {
        body_text: [["Daniel"]]
      }
    }
  ];
  
  const payload = {
    name: "prueba_boda_test_resumable_" + Math.floor(Math.random()*1000),
    category: "MARKETING",
    language: "es",
    components
  };
  
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
