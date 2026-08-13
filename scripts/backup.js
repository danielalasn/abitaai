const { execSync } = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables correctly
dotenv.config();

const dbUrl = process.env.DIRECT_URL;
if (!dbUrl) {
  console.error("❌ Error: No se encontró DIRECT_URL en el archivo .env");
  process.exit(1);
}

// Create backups directory if it doesn't exist
if (!fs.existsSync('backups')) {
  fs.mkdirSync('backups');
}

// Generate filename with timestamp
const pad = (n) => n.toString().padStart(2, '0');
const d = new Date();
const timestamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const backupFile = `backups/supabase_backup_${timestamp}.sql`;

console.log("⏳ Iniciando backup de la base de datos de Supabase...");

// Ruta directa al pg_dump de la aplicación Postgres.app que acabas de instalar
const pgDumpPath = '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump';

try {
  if (fs.existsSync(pgDumpPath)) {
    execSync(`"${pgDumpPath}" --clean --if-exists --quote-all-identifiers -d "${dbUrl}" -f "${backupFile}"`, { stdio: 'inherit' });
    console.log(`\n✅ Backup completado exitosamente: ${backupFile}`);
  } else {
    // Fallback por si la aplicación se movió o no está en la ruta estándar
    console.log("⚠️ No se encontró Postgres.app, intentando usar pg_dump global...");
    execSync(`pg_dump --clean --if-exists --quote-all-identifiers -d "${dbUrl}" -f "${backupFile}"`, { stdio: 'inherit' });
    console.log(`\n✅ Backup completado exitosamente: ${backupFile}`);
  }
} catch (error) {
  console.error("\n❌ Error durante el backup. Detalles arriba.");
  process.exit(1);
}
