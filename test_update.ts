import { updateEvent } from './src/lib/calendar';

async function run() {
  const projectId = "cmo96o9860001fat2yu9ivivk";
  const eventId = "ed4f4ffk842i4tsi9uvot4g68s";
  const dateStr = "2026-08-01";
  const startTime = "10:00";
  const endTime = "10:10";
  const updatedDesc = "--- Asistentes (1) ---\n1. Jaime\n\n(Updated for testing)";
  
  const res = await updateEvent(projectId, eventId, dateStr, startTime, endTime, undefined, updatedDesc);
  console.log("RESULT:", res);
}
run();
