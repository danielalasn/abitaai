const http = require('http');

const payload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "123456789",
    changes: [{
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "50376003378", phone_number_id: "7000j4du1q1k184ck" },
        contacts: [{ profile: { name: "Test User" }, wa_id: "50376003378" }],
        messages: [{
          from: "50376003378",
          id: "wamid.HBgL...",
          timestamp: "123456789",
          type: "image",
          image: {
            mime_type: "image/jpeg",
            sha256: "HASH",
            id: "test_media_id_123"
          }
        }]
      },
      field: "messages"
    }]
  }]
};

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', console.error);
req.write(JSON.stringify(payload));
req.end();
