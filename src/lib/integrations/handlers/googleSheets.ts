import { nango } from '../nangoClient';
import type { IntegrationHandler, IntegrationResult } from './baseHandler';

const PROVIDER_CONFIG_KEY = 'google-sheet';

/**
 * Handler de Google Sheets.
 * Todas las peticiones pasan por el proxy de Nango para usar el token OAuth refrescado.
 */
export class GoogleSheetsHandler implements IntegrationHandler {
  async execute(
    action: string,
    payload: Record<string, unknown>,
    connectionId: string
  ): Promise<IntegrationResult> {
    switch (action) {
      case 'QUERY_SHEET':
        return this.querySheet(payload, connectionId);
      default:
        return { success: false, error: `Acción no reconocida en Sheets: ${action}` };
    }
  }

  /**
   * Obtiene los datos de una hoja de cálculo.
   * Payload: { spreadsheetId: string, range: string }
   */
  private async querySheet(
    payload: Record<string, unknown>,
    connectionId: string
  ): Promise<IntegrationResult> {
    const spreadsheetId = payload.spreadsheetId as string;
    const range = payload.range as string; // Ej: 'Hoja1!A1:D100'

    if (!spreadsheetId || !range) {
      return { success: false, error: 'Se requiere "spreadsheetId" y "range"' };
    }

    try {
      const response = await nango.get({
        providerConfigKey: PROVIDER_CONFIG_KEY,
        connectionId,
        baseUrlOverride: 'https://sheets.googleapis.com',
        endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      });

      return {
        success: true,
        data: {
          values: response.data?.values || [],
          message: 'Datos de la hoja obtenidos exitosamente.'
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Error al consultar Google Sheets: ${message}` };
    }
  }
}
