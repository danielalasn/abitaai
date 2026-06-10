'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#E9E4D8] text-[#111111] font-sans selection:bg-[#F36A2D]/20 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-[#DEDAD0]/60 sticky top-0 z-50 bg-[#E9E4D8]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#111111] rounded-xl flex items-center justify-center">
              <span className="text-[#F36A2D] font-bold text-xl">a</span>
            </div>
            <span className="text-2xl font-semibold tracking-tighter text-[#111111]">abita.ai</span>
          </div>
          <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-[#F36A2D] transition-colors">Volver al Login</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-20 flex-1">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-[#111111] leading-[1.1] mb-6">
            Política de <span className="italic text-[#F36A2D]">Privacidad</span>
          </h1>
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Junio 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Recolección de Datos y Credenciales</h2>
            <p className="text-[#6F6F6F]">
              Al utilizar el flujo de registro de WhatsApp (Meta Embedded Signup), recopilamos y almacenamos de forma encriptada las credenciales de acceso de su cuenta de Meta (tokens de acceso de larga duración, IDs de cuenta comercial de WhatsApp y números de teléfono vinculados). Asimismo, recolectamos números telefónicos, nombres de contactos e historial de mensajes exclusivamente para la operación técnica, la visualización en la bandeja de entrada y el entrenamiento y contexto del bot de Inteligencia Artificial.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Procesamiento de Mensajes y Plantillas</h2>
            <p className="text-[#6F6F6F]">
              Los mensajes enviados y recibidos se procesan a través de los servidores de Meta Cloud API y los modelos de análisis avanzados de Inteligencia Artificial (por ejemplo, Claude) para generar respuestas automáticas. También administramos y almacenamos la estructura de sus plantillas de mensajes (templates) enviadas a revisión ante Meta para la correcta ejecución de campañas y flujos interactivos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Compartición e Integridad de la Información</h2>
            <p className="text-[#6F6F6F]">
              Sus datos comerciales, tokens de autenticación y los chats de sus clientes finales <strong>nunca</strong> son vendidos, compartidos con terceros con fines comerciales ni utilizados para publicidad externa. La información fluye estrictamente de manera segura entre su plataforma de WhatsApp vinculada, nuestra base de datos segura y los proveedores de infraestructura de IA indicados en su configuración de proyecto.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">4. Medidas de Seguridad</h2>
            <p className="text-[#6F6F6F]">
              Implementamos protocolos avanzados de cifrado y aislamiento de datos para salvaguardar sus credenciales de Meta. Todos los webhooks entrantes están validados con firmas oficiales para asegurar la procedencia y privacidad de cada interacción recibida de sus clientes.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DEDAD0]/60 py-10 bg-[#E9E4D8]">
        <div className="max-w-4xl mx-auto px-8">
          <p className="text-center text-[10px] text-[#6F6F6F] tracking-widest uppercase font-bold">
            © 2026 ABITA AI — TODOS LOS DERECHOS RESERVADOS
          </p>
        </div>
      </footer>
    </div>
  );
}
