'use client';

import Link from 'next/link';

export default function TermsPage() {
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
            Términos de <span className="italic text-[#F36A2D]">Servicio</span>
          </h1>
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Junio 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Integración con Meta y Cuentas Vinculadas</h2>
            <p className="text-[#6F6F6F]">
              Abita AI ofrece capacidades de automatización conectándose directamente con la API de WhatsApp Cloud de Meta. Para utilizar el servicio, debe vincular su propia cuenta comercial de WhatsApp (WABA). Al vincularla, acepta cumplir con las políticas comerciales de Meta. Usted es el único responsable de cualquier costo o tarifa facturada por Meta en relación con el uso de su WABA.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Envío de Campañas y Gestión de Plantillas</h2>
            <p className="text-[#6F6F6F]">
              Al utilizar el módulo de campañas y la creación de plantillas de mensajes, se compromete a enviar mensajes únicamente a usuarios que hayan proporcionado un consentimiento explícito (opt-in). No se permite el uso del servicio para spam, fraudes o envío de contenido inapropiado que infrinja las políticas de WhatsApp.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Responsabilidad de la Automatización con Inteligencia Artificial</h2>
            <p className="text-[#6F6F6F]">
              El usuario es responsable exclusivo de la configuración del agente de IA, los datos de entrenamiento cargados y las instrucciones del bot. Abita AI actúa como proveedor técnico de la interfaz y no asume responsabilidad alguna por las respuestas generadas de manera autónoma por los modelos de lenguaje (LLMs) ni por los compromisos acordados con sus clientes mediante el chat automatizado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">4. Suspensión de la Cuenta</h2>
            <p className="text-[#6F6F6F]">
              Nos reservamos el derecho de suspender la cuenta de forma temporal o definitiva si detectamos un índice elevado de reportes de spam por parte de los destinatarios finales, si su WABA es inhabilitada por Meta, o ante cualquier acción que comprometa la estabilidad de nuestra plataforma de mensajería.
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
