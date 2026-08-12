import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'lndqwnxodozquindlqzo';
async function run() {
  const q = `SELECT id, phone, title, "eventId" FROM "UserBooking" WHERE "eventId" = 'ed4f4ffk842i4tsi9uvot4g68s';`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q })
  });
  const text = await res.text();
  console.log(res.status, text);
}
run();
