/**
 * Utilidad liviana para medición de performance en servidor.
 * Registra tiempos en consola con formato [perf] <label> <ms>ms
 */
export async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const elapsed = Math.round(performance.now() - start);
    console.log(`[perf] ${label}: ${elapsed}ms`);
    return result;
  } catch (error) {
    const elapsed = Math.round(performance.now() - start);
    console.error(`[perf] ${label} [FAILED]: ${elapsed}ms`, error);
    throw error;
  }
}
