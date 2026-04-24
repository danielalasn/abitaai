# Abita AI - Plataforma de Agentes de IA Inteligentes

Abita AI es una plataforma SaaS de vanguardia diseñada para automatizar la atención al cliente y la calificación de leads mediante agentes de inteligencia artificial avanzados (Claude 4.5). Está diseñada específicamente para industrias con flujos de ventas consultivos (como el sector inmobiliario) que requieren una comunicación fluida, omnicanal y altamente personalizada.

## 🚀 Características Principales

### 1. Omni-Channel Inbox
*   **WhatsApp e Instagram:** Gestión centralizada de conversaciones provenientes de Meta.
*   **Identidad Visual:** Diferenciación clara de canales y estados de mensajes.
*   **Control Híbrido:** Un switch de "IA Activa" permite alternar instantáneamente entre respuesta automática del bot y atención humana manual.

### 2. Sistema de Scoring Dinámico (Heatmap)
*   **Calificación Automática:** La IA analiza el sentimiento y la intención del cliente en tiempo real.
*   **Triggers Personalizables:** Configuración de reglas (ej: "+10 pts si pregunta por precios") desde el panel administrativo.
*   **Visibilidad en Inbox:** Clasificación térmica de leads (Frío ❄️, Tibio 📈, Caliente 🔥) según su nivel de interés.

### 3. Knowledge Base Inteligente
*   **Compilación Natural:** Los administradores pueden entrenar al bot subiendo información en lenguaje natural (ej: un PDF o texto simple).
*   **Procesador AI-to-JSON:** Un sistema interno convierte el texto de entrenamiento en una base de conocimientos estructurada para que la IA nunca alucine datos.

### 4. Gestión de Campañas y Templates
*   **Re-apertura de Ventana (24h):** Interfaz para enviar plantillas aprobadas por Meta cuando la ventana de conversación se ha cerrado.
*   **Detección de Intención:** La IA sabe cuándo transferir a un humano basándose en reglas de negocio estrictas.

### 5. Panel Administrativo (Master Control)
*   **Gestión Multi-Cliente:** Creación y control de sub-cuentas de clientes con bases de datos aisladas.
*   **Monitoreo de Costos:** Rastreo detallado de consumo de tokens de AI y costos de mensajes de WhatsApp.
*   **Guardrails Globales:** Definición de reglas maestras inquebrantables para todos los bots de la plataforma.

## 🏗️ Arquitectura Técnica

El proyecto está construido bajo una arquitectura moderna y escalable:

*   **Frontend:** [Next.js 15+](https://nextjs.org/) con App Router para una interfaz rápida y SEO-friendly.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/) con un sistema de diseño premium, soporte para modo oscuro y animaciones fluidas (Framer Motion).
*   **Base de Datos:** [PostgreSQL](https://www.postgresql.org/) hospedado en **Supabase**, gestionado mediante **Prisma ORM**.
*   **Cerebro IA:** [Anthropic Claude 4.5 (Sonnet)](https://www.anthropic.com/claude) para un razonamiento superior, seguimiento de instrucciones complejas y tono humano.
*   **Mensajería:** Integración directa con las APIs oficiales de **Meta Graph API** (WhatsApp Business API & Instagram Graph API).
*   **Autenticación:** [NextAuth.js](https://next-auth.js.org/) con seguridad basada en roles (Admin vs. Cliente).

## 🛠️ Flujo de Operación

1.  **Entrada:** Un mensaje llega vía Webhook desde Meta.
2.  **Procesamiento:** El sistema recupera el contexto del lead, las reglas del negocio y la base de conocimientos.
3.  **Razonamiento:** Claude 4.5 decide si debe responder, sumar puntos de scoring o solicitar la intervención de un humano.
4.  **Acción:** Se envía la respuesta vía API y se actualizan los dashboards en tiempo real mediante sincronización de base de datos.
5.  **Aprendizaje:** Las preguntas que el bot no sabe responder se guardan en un registro especial para que el administrador actualice el conocimiento.

## 📦 Instalación y Desarrollo

1.  **Clonar el repositorio:** `git clone https://github.com/alnovu/aiAgent.git`
2.  **Instalar dependencias:** `npm install`
3.  **Configurar variables de entorno:** Crear un archivo `.env` basado en `.env.example` con las API Keys de Anthropic, Supabase y Meta.
4.  **Migrar DB:** `npx prisma db push`
5.  **Correr local:** `npm run dev`

---
*Desarrollado por el equipo de Abita AI con un enfoque en excelencia visual y potencia analítica.*