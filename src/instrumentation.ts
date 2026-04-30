export async function register() {
  console.log('🚀 [Instrumentation] Intentando registrar procesos de fondo...');
  
  const globalAny = global as any;
  if (globalAny.messageWorker) {
    console.log('⚠️ [Worker] Ya existe una instancia activa, saltando inicialización.');
    return;
  }

  console.log('🤖 [Worker] Iniciando motor de procesamiento BullMQ...');
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initWorker } = await import('./lib/worker');
      initWorker();
      console.log('✅ [Instrumentation] initWorker() llamado con éxito');
    } catch (e) {
      console.error('❌ [Instrumentation] Error al inicializar el worker:', e);
    }
  }
}
