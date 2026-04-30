
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWorker } = await import('./lib/worker');
    initWorker();
  }
}
