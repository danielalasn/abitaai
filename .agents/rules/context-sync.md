---
trigger: always_on
description: Regla de sincronización obligatoria con PLATFORM_CONTEXT.md ante cualquier cambio arquitectónico o funcional
---

# Sincronización Obligatoria con `PLATFORM_CONTEXT.md`

Siempre que se implemente un cambio importante en la plataforma:
1. **Nuevos modelos o campos de base de datos:** Actualizar el diagrama ER o la sección del modelo Prisma.
2. **Nuevas herramientas o acciones de IA:** Si se agregan o cambian tags como `[ACTION: ...]`, documentar su sintaxis y comportamiento en la sección del motor agéntico.
3. **Flujo de mensajes y backend:** Si se modifican webhooks, colas Redis, BullMQ o el worker, registrarlo en el ciclo de vida del mensaje.
4. **Nuevas integraciones o variables de entorno:** Agregar las dependencias, servicios o variables en sus respectivas tablas.
5. **Nuevos módulos o interfaces:** Describir su propósito y flujo en la sección de módulos.

**Regla de cierre de tarea:** No considerar concluida ninguna tarea con impacto estructural sin antes haber reflejado los cambios en [`PLATFORM_CONTEXT.md`](file:///c:/Users/danie/Desktop/Antigravity/abitaai/PLATFORM_CONTEXT.md).
