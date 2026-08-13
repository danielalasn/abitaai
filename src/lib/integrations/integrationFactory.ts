import type { IntegrationHandler, IntegrationResult } from './handlers/baseHandler';
import { GoogleCalendarHandler } from './handlers/googleCalendar';
import { GoogleSheetsHandler } from './handlers/googleSheets';

/**
 * Registro de handlers disponibles.
 * Para agregar un nuevo proveedor, importa su handler y agrégalo aquí.
 */
const handlers: Record<string, IntegrationHandler> = {
  'google-calendar': new GoogleCalendarHandler(),
  'google-sheet': new GoogleSheetsHandler(),
  // 'hubspot': new HubSpotHandler(),
  // 'salesforce': new SalesforceHandler(),
};

/**
 * Fábrica de integraciones.
 * Enruta la acción al handler correcto según el proveedor.
 */
export async function executeIntegration(
  provider: string,
  action: string,
  payload: Record<string, unknown>,
  connectionId: string
): Promise<IntegrationResult> {
  const handler = handlers[provider];

  if (!handler) {
    return {
      success: false,
      error: `Proveedor "${provider}" no está soportado. Proveedores disponibles: ${Object.keys(handlers).join(', ')}`,
    };
  }

  return handler.execute(action, payload, connectionId);
}

export const SUPPORTED_PROVIDERS = Object.keys(handlers);
