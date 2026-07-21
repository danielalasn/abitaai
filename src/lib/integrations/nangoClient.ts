import { Nango } from '@nangohq/node';

if (!process.env.NANGO_SECRET_KEY) {
  console.warn('[Nango] NANGO_SECRET_KEY not set. Integration calls will fail.');
}

/**
 * Singleton del cliente de Nango (server-side).
 * Usa NANGO_SECRET_KEY del entorno para autenticar peticiones proxy.
 */
export const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });
