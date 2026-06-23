# Plan de Recuperación Ante Desastres (Disaster Recovery Plan)

## 1. Copias de Seguridad (Backups)

### 1.1 Base de Datos (Supabase)
- **Frecuencia**: Supabase realiza backups diarios automáticos de forma predeterminada.
- **Restauración (Point-in-Time Recovery)**: Supabase permite restaurar a cualquier punto específico en los últimos 7 días.
- **Acción Manual**: En caso de un desastre crítico, el administrador puede ir al panel de Supabase -> `Database` -> `Backups` y seleccionar la fecha/hora de restauración deseada.

### 1.2 Código Fuente (GitHub)
- Todo el código se aloja en GitHub.
- Si el servidor de Render se cae o el repositorio se borra localmente, el código se puede recuperar íntegramente mediante un `git clone`.

## 2. Plan de Respuesta ante Fugas de Seguridad (Data Breach)

### 2.1 Fuga de Tokens de Acceso (Meta/WhatsApp)
Si sospechas que los tokens de WhatsApp han sido expuestos:
1. Revocar los tokens afectados en el panel de **Meta for Developers**.
2. Actualizar el `.env` con un nuevo `SYSTEM_USER_TOKEN`.
3. Informar a los clientes si la fuga afectó a sus tokens individuales.
4. Reiniciar los servidores en Render para que los nuevos valores del `.env` tomen efecto.

### 2.2 Fuga de Claves de Encriptación
Si la variable `ENCRYPTION_KEY` del servidor es vulnerada o expuesta:
1. Generar una nueva clave de 32 bytes (`openssl rand -hex 32`).
2. Actualizar la variable de entorno `ENCRYPTION_KEY` en Render.
3. Desplegar los cambios y alertar a los usuarios que deben volver a conectar sus cuentas de WhatsApp en `Configuración > Conexiones`, ya que los tokens anteriores no podrán desencriptarse.

## 3. Caída de Servicios Externos

### 3.1 Caída de OpenAI / Anthropic
- **Impacto**: Los bots no generarán nuevas respuestas o resúmenes.
- **Acción**: La aplicación cuenta con un sistema híbrido que enrutará a los leads a agentes humanos si la IA no responde o entra en un "fail-loop".

### 3.2 Caída de Render
- **Impacto**: La plataforma principal estará inaccesible. Los webhooks de WhatsApp fallarán, pero Meta reintentará enviarlos por un período de hasta 7 días.
- **Acción**: En caso de caída regional de Render, se debe considerar tener un despliegue de emergencia (`fallback server`) preconfigurado en otra plataforma (por ejemplo, Vercel o AWS) sincronizado con el mismo repositorio de GitHub y las mismas variables de entorno.

### 3.3 Caída de Redis (Upstash/Render)
- **Impacto**: El rate-limiting, la gestión de colas y la idempotencia fallarán. Los mensajes podrían duplicarse o perder su enrutamiento óptimo.
- **Acción**: Monitorear los logs de Redis. Si el servicio se interrumpe permanentemente, modificar `REDIS_URL` para que apunte a un clúster de respaldo y reiniciar la aplicación.

## 4. Políticas de Retención de Logs
- Los `AuditLogs` críticos (eliminación de cuentas, exportación de datos) se almacenarán de forma permanente.
- Los logs operativos de webhooks (`WebhookEvent`) se conservarán para el análisis de idempotencia y luego serán purgados asíncronamente para evitar desbordamiento de la base de datos (se recomienda un cron-job mensual).
