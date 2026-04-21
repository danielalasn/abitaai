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
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Abril 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Uso de la Plataforma</h2>
            <p className="text-[#6F6F6F]">Abita AI proporciona herramientas de automatización de mensajería integradas con WhatsApp Cloud API. Al usar el servicio, aceptas no utilizarlo para spam, mensajes masivos no solicitados (sin opt-in) o contenido prohibido por las políticas de comercio de Meta.</p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Responsabilidad de Contenido</h2>
            <p className="text-[#6F6F6F]">El usuario asume la responsabilidad total y exclusiva de todo el contenido enviado a través de la plataforma. Abita AI actúa como interfaz tecnológica y no asume responsabilidad por las respuestas generadas por los modelos de Inteligencia Artificial (LLMs) configurados por el usuario.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Suspensión de Servicio</h2>
            <p className="text-[#6F6F6F]">Nos reservamos el derecho de suspender o inhabilitar inmediatamente cualquier cuenta que viole las políticas comerciales de Meta, que acumule altos niveles de bloqueos por parte de los destinatarios, o que intente eludir las pausas de seguridad implementadas en la plataforma.</p>
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
