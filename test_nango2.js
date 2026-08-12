import fetch from 'node-fetch';

async function run() {
  const nangoSecret = '872b36c6-521b-42ce-8917-89c441d85453';
  const connectionId = '95f62272-d57f-4d08-9d60-26c957400912';
  
  const nangoRes = await fetch(`https://api.nango.dev/connection/${connectionId}?provider_config_key=google-calendar`, {
    headers: { 'Authorization': `Bearer ${nangoSecret}` }
  });
  if (!nangoRes.ok) {
    console.log(await nangoRes.text());
    return;
  }
  const nangoData = await nangoRes.json();
  const token = nangoData.credentials?.access_token || nangoData.connection?.credentials?.access_token;
  
  if (!token) {
    console.log("No token:", nangoData);
    return;
  }
  
  const eventId = 'ed4f4ffk842i4tsi9uvot4g68s';
  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const evData = await evRes.json();
  console.log("CURRENT DESCRIPTION:", evData.description);
}
run();
