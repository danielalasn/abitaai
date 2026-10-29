import { clearMemoryInbox } from './inbox-memory';

const STORAGE_PREFIX = 'abita:cache:v1:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

interface PersistedItem {
  data: any;
  timestamp: number;
}

function shouldPersistKey(key: string): boolean {
  // Solo persistir métricas globales del dashboard y datos del sidebar (uso y avatar)
  // NUNCA persistir chats, mensajes, números de teléfono ni PII
  if (key.includes('chats') || key.includes('message') || key.includes('phone') || key.includes('lead')) {
    return false;
  }
  return key.includes('sidebar') || key.includes('analytics');
}

/**
 * Crea o recupera el proveedor de caché SWR asociado a un usuario específico.
 */
export function createStorageProvider(userId: string) {
  const storageKey = `${STORAGE_PREFIX}${userId}`;

  return () => {
    const map = new Map<string, any>();

    // 1. Hidratar desde localStorage si existe
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, PersistedItem>;
          const now = Date.now();
          for (const [k, item] of Object.entries(parsed)) {
            if (item && item.timestamp && now - item.timestamp < MAX_AGE_MS) {
              map.set(k, item.data);
            }
          }
        }
      } catch (e) {
        console.error('[client-cache] Error al leer caché local:', e);
      }

      // 2. Escuchar cambios y sincronizar persistencia antes de salir
      const syncToLocalStorage = () => {
        try {
          const objToSave: Record<string, PersistedItem> = {};
          const now = Date.now();

          for (const [k, v] of map.entries()) {
            if (shouldPersistKey(String(k)) && v !== undefined) {
              objToSave[String(k)] = {
                data: v,
                timestamp: now,
              };
            }
          }

          localStorage.setItem(storageKey, JSON.stringify(objToSave));
        } catch (e) {
          console.error('[client-cache] Error al guardar caché en localStorage:', e);
        }
      };

      window.addEventListener('beforeunload', syncToLocalStorage);
      window.addEventListener('pagehide', syncToLocalStorage);
    }

    return map;
  };
}

/**
 * Limpia la caché persistida y la memoria del cliente (usado al cerrar sesión o cambiar de cuenta).
 */
export function clearClientCache(userId?: string): void {
  clearMemoryInbox();

  if (typeof window === 'undefined') return;

  try {
    if (userId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    } else {
      // Limpiar todas las claves que comiencen con el prefijo
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (e) {
    console.error('[client-cache] Error al limpiar caché local:', e);
  }
}
