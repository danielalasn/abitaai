import 'dotenv/config';
import { initWorker } from './lib/worker';

console.log('🚀 [Dedicated Worker Process] Arrancando...');

try {
  initWorker();
  console.log('✅ [Dedicated Worker Process] initWorker() llamado con éxito. El worker ahora escuchará indefinidamente en este proceso.');
} catch (e) {
  console.error('❌ [Dedicated Worker Process] Error fatal al iniciar:', e);
}

// Mantener el proceso vivo
process.on('SIGTERM', () => {
  console.log('🛑 [Dedicated Worker Process] Recibida señal de apagado (SIGTERM). Cerrando limpiamente...');
  process.exit(0);
});
