<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Reglas del Proyecto (Abita AI)

## Mantenimiento Obligatorio de `PLATFORM_CONTEXT.md`
- **Sincronización de Arquitectura y Lógica:** Cada vez que se realice un cambio importante en la plataforma (nuevas características, modificaciones en la base de datos o Prisma schema, cambios en la orquestación de IA, nuevas acciones de herramientas/tools, cambios en webhooks/Redis/BullMQ, o flujos de mensajería), es **OBLIGATORIO** actualizar inmediatamente el archivo [`PLATFORM_CONTEXT.md`](file:///c:/Users/danie/Desktop/Antigravity/abitaai/PLATFORM_CONTEXT.md).
- **Prohibición de desactualización:** Nunca des por finalizada una tarea con impacto arquitectónico o funcional sin haber reflejado las modificaciones en la sección correspondiente de [`PLATFORM_CONTEXT.md`](file:///c:/Users/danie/Desktop/Antigravity/abitaai/PLATFORM_CONTEXT.md).
