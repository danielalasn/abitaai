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
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Abril 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Recolección de Datos</h2>
            <p className="text-[#6F6F6F]">Recopilamos números telefónicos e historial de mensajes exclusivamente para la operación técnica y contextual del bot. Estos datos se procesan a través de los servidores de Meta y los modelos de análisis (Claude) según la configuración elegida por el usuario de la plataforma.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Uso de la Información</h2>
            <p className="text-[#6F6F6F]">Sus datos y los datos de sus clientes <strong>nunca</strong> son vendidos, comercializados ni cedidos a terceros para fines publicitarios. Se utilizan estrictamente para facilitar la comunicación entre su empresa y sus clientes finales a través de WhatsApp Cloud API.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Seguridad de Datos</h2>
            <p className="text-[#6F6F6F]">Implementamos medidas de seguridad técnicas para proteger sus tokens de acceso y la base de datos de contactos. Todas las conversaciones entre el usuario final y la plataforma se benefician de la seguridad nativa proporcionada por WhatsApp.</p>
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
