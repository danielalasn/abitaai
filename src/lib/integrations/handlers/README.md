# Guía para Agregar Nuevos Handlers de Integración

## Estructura de un handler

Crea un archivo `handlers/nombreProveedor.ts` e implementa la interfaz `IntegrationHandler`:

```typescript
import { nango } from '../nangoClient';
import type { IntegrationHandler, IntegrationResult } from './baseHandler';

export class HubSpotHandler implements IntegrationHandler {
  async execute(
    action: string,
    payload: Record<string, unknown>,
    connectionId: string
  ): Promise<IntegrationResult> {
    switch (action) {
      case 'GET_CONTACTS':
        return this.getContacts(payload, connectionId);
      // ... más acciones
      default:
        return { success: false, error: `Acción no reconocida: ${action}` };
    }
  }

  private async getContacts(payload: Record<string, unknown>, connectionId: string) {
    const response = await nango.get({
      providerConfigKey: 'hubspot',
      connectionId,
      baseUrlOverride: 'https://api.hubapi.com',
      endpoint: '/crm/v3/objects/contacts',
    });
    return { success: true, data: response.data };
  }
}
```

## Registrar el handler en la fábrica

En `integrationFactory.ts`, agrega el nuevo handler:

```typescript
import { HubSpotHandler } from './handlers/hubspot';

const handlers: Record<string, IntegrationHandler> = {
  'google-calendar': new GoogleCalendarHandler(),
  'hubspot': new HubSpotHandler(), // <-- Agregar aquí
};
```

## Configurar Nango Dashboard

1. En [nango.dev](https://app.nango.dev), crea una nueva "Integration" con el `providerConfigKey` correcto.
2. Configura el Client ID y Secret del proveedor OAuth.
3. Agrega los scopes necesarios.

## El `connectionId` de Nango

El `connectionId` en Nango mapea **uno a uno** con el `projectId` de Abita AI. Esto permite que cada proyecto tenga su propia conexión OAuth sin que interfieran entre sí.

## Acciones disponibles por proveedor

| Proveedor | Action | Descripción |
|-----------|--------|-------------|
| `google-calendar` | `CHECK_AVAILABILITY` | Lista eventos de un día |
| `google-calendar` | `CREATE_BOOKING` | Crea un evento en el calendario |
| `google-calendar` | `CANCEL_BOOKING` | Cancela un evento por ID |
| `hubspot` | _(pendiente)_ | - |
| `salesforce` | _(pendiente)_ | - |
