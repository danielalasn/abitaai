import { redisConnection } from '@/lib/queue';

const DEFAULT_TIMEOUT_MS = 300;

function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis command timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Obtiene un valor JSON de Redis con fail-open y timeout estricto.
 * Si Redis falla o tarda más de timeoutMs, retorna null sin lanzar error.
 */
export async function getCachedJson<T>(key: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  try {
    const raw = await withTimeout(redisConnection.get(key), timeoutMs);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    console.error(`[RedisCache] getCachedJson fallo para key '${key}':`, err?.message || err);
    return null;
  }
}

/**
 * Guarda un valor serializado en JSON en Redis con expiración (TTL en segundos).
 * Falla de forma silenciosa pero con log claro si Redis no responde.
 */
export async function setCachedJson(key: string, value: any, ttlSeconds: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value);
    await withTimeout(redisConnection.set(key, serialized, 'EX', ttlSeconds), timeoutMs);
    return true;
  } catch (err: any) {
    console.error(`[RedisCache] setCachedJson fallo para key '${key}':`, err?.message || err);
    return false;
  }
}

/**
 * Elimina una o más claves de Redis.
 */
export async function deleteCachedKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await withTimeout(redisConnection.del(...keys), DEFAULT_TIMEOUT_MS);
  } catch (err: any) {
    console.error(`[RedisCache] deleteCachedKeys fallo para keys [${keys.join(', ')}]:`, err?.message || err);
  }
}
