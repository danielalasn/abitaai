import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const token = process.env.SYSTEM_USER_TOKEN;
  if (!token) return console.log("NO SYSTEM TOKEN");

  // Get businesses accessible by this user
  const url = `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,client_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}},owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`;
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  
  console.dir(data, { depth: null });
}

main().catch(console.error)
