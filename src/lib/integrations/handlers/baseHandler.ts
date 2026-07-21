/**
 * Contrato base que todos los handlers de integración deben implementar.
 *
 * Para agregar un nuevo proveedor (ej. HubSpot):
 * 1. Crea un archivo `handlers/hubspot.ts`
 * 2. Implementa la interfaz `IntegrationHandler`
 * 3. Regístralo en `integrationFactory.ts`
 *
 * @see handlers/README.md para guía completa
 */
export interface IntegrationHandler {
  /**
   * Ejecuta una acción del proveedor.
   * @param action - Nombre de la acción (ej. 'CHECK_AVAILABILITY')
   * @param payload - Datos de entrada específicos de la acción
   * @param connectionId - ID de conexión en Nango (mapeado al projectId del cliente)
   * @returns Resultado normalizado listo para inyectar en el prompt de Claude
   */
  execute(
    action: string,
    payload: Record<string, unknown>,
    connectionId: string
  ): Promise<IntegrationResult>;
}

export interface IntegrationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
