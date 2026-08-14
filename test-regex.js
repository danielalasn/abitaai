const rawReply = 'Aquí tiene: <send_file id="Luces" /> y [ACTION: SEND_FILE id="Fachada"]';
const fileMatches = Array.from(rawReply.matchAll(/(?:\[ACTION:\s*SEND_FILE\s+(?:id=)?["']?([^"'\]]+?)["']?\s*\]|<send_file\s+id=["']([^"']+)["']\s*\/>)/gi));
const ids = fileMatches.map(m => m[1] || m[2]);
console.log("IDs:", ids);

const stripped = rawReply.replace(/(?:\[ACTION: [\s\S]+?\]|<send_file\s+id=["'][^"']+["']\s*\/>)/gi, "").trim();
console.log("Stripped:", stripped);
