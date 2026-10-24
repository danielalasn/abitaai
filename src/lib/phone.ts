/**
 * Normaliza números de teléfono entrantes.
 *
 * Meta devuelve los móviles mexicanos como 521 + 10 dígitos (13 dígitos),
 * pero las campañas se envían/registran como 52 + 10 dígitos (12 dígitos).
 * Regla: si empieza con "521" y mide 13 dígitos, se elimina el "1" (posición 2).
 */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) {
    return '52' + digits.slice(3);
  }
  return phone;
}
