import fetch from 'node-fetch';

async function run() {
  const nangoSecret = '872b36c6-521b-42ce-8917-89c441d85453';
  const connectionId = '95f62272-d57f-4d08-9d60-26c957400912';
  
  // 1. Get Google Token from Nango
  const nangoRes = await fetch(`https://api.nango.dev/connection/google-calendar/${connectionId}?force_refresh=false`, {
    headers: { 'Authorization': `Bearer ${nangoSecret}` }
  });
  const nangoData = await nangoRes.json();
  const token = nangoData.credentials?.access_token;
  
  if (!token) {
    console.log("No token:", nangoData);
    return;
  }
  
  // 2. Fetch the event to see its current description
  const eventId = 'ed4f4ffk842i4tsi9uvot4g68s';
  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const evData = await evRes.json();
  console.log("CURRENT DESCRIPTION:", evData.description);
  
  // 3. Patch the event
  const updatedDesc = "--- Asistentes (1) ---\n1. Jaime\n\n(Prueba manual)";
  const patchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: updatedDesc })
  });
  
  const patchData = await patchRes.json();
  console.log("PATCH RESPONSE:", patchRes.status, patchData.description);
}
run();
