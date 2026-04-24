const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n');
const envMap = {};
for (const line of env) {
  if (line && line.includes('=')) {
    const [key, ...rest] = line.split('=');
    envMap[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

const supabase = createClient(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.storage.updateBucket('media', {
    allowedMimeTypes: null, 
    fileSizeLimit: 20 * 1024 * 1024,
  });
  if (error) {
    console.error("Error updating bucket:", error);
  } else {
    console.log("Bucket updated successfully");
  }
}
main();
