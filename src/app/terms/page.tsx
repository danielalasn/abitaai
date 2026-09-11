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
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-[#F36A2D] transition-colors">Privacidad</Link>
            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-[#F36A2D] transition-colors">Volver al Login</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-20 flex-1">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-[#111111] leading-[1.1] mb-6">
            Términos de <span className="italic text-[#F36A2D]">Servicio</span>
          </h1>
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Septiembre 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Aceptación de los Términos</h2>
            <p className="text-[#6F6F6F]">
              Al acceder o utilizar Abita AI (en adelante &quot;el Servicio&quot;), usted acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio. Estos términos aplican a todos los usuarios, incluyendo empresas y sus representantes autorizados.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Descripción del Servicio</h2>
            <p className="text-[#6F6F6F]">
              Abita AI es una plataforma SaaS que permite a empresas automatizar la atención al cliente mediante agentes de inteligencia artificial conectados a WhatsApp e Instagram. El Servicio incluye funcionalidades de automatización de mensajes, gestión de leads, campañas de mensajería, integración con calendarios y hojas de cálculo, y análisis de conversaciones.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Integración con Meta y Cuentas Vinculadas</h2>
            <p className="text-[#6F6F6F]">
              Abita AI ofrece capacidades de automatización conectándose directamente con la API de WhatsApp Cloud de Meta. Para utilizar el servicio, debe vincular su propia cuenta comercial de WhatsApp (WABA). Al vincularla, acepta cumplir con las políticas comerciales de Meta. Usted es el único responsable de cualquier costo o tarifa facturada por Meta en relación con el uso de su WABA.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-display">4. Envío de Campañas y Gestión de Plantillas</h2>
            <p className="text-[#6F6F6F]">
              Al utilizar el módulo de campañas y la creación de plantillas de mensajes, se compromete a enviar mensajes únicamente a usuarios que hayan proporcionado un consentimiento explícito (opt-in). No se permite el uso del servicio para spam, fraudes o envío de contenido inapropiado que infrinja las políticas de WhatsApp o Instagram de Meta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">5. Responsabilidad de la Automatización con Inteligencia Artificial</h2>
            <p className="text-[#6F6F6F]">
              El usuario es responsable exclusivo de la configuración del agente de IA, los datos de entrenamiento cargados y las instrucciones del bot. Abita AI actúa como proveedor técnico de la interfaz y no asume responsabilidad alguna por las respuestas generadas de manera autónoma por los modelos de lenguaje (LLMs) ni por los compromisos acordados con sus clientes mediante el chat automatizado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">6. Planes de Suscripción y Pagos</h2>
            <p className="text-[#6F6F6F]">
              El acceso al Servicio puede estar sujeto a planes de pago con límites de mensajes mensuales. Al suscribirse, autoriza el cobro recurrente del plan seleccionado. Los pagos son procesados por Wompi, un procesador de pagos externo, y están sujetos a sus propios términos. El límite de mensajes incluido en su plan se restablece mensualmente en la fecha de renovación de su suscripción. Los mensajes no utilizados no se acumulan para el siguiente periodo. Existe la posibilidad de adquirir mensajes adicionales según el plan contratado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">7. Confidencialidad de los Datos</h2>
            <p className="text-[#6F6F6F]">
              Toda la información de sus clientes finales (leads) procesada a través del Servicio es de su exclusiva propiedad. Abita AI no utilizará dichos datos para fines comerciales propios ni los compartirá con terceros, salvo cuando sea requerido por ley. Los datos son almacenados de forma segura en servidores ubicados en Estados Unidos bajo proveedores certificados (Supabase/AWS). Para más información, consulte nuestra <Link href="/privacy" className="text-[#F36A2D] hover:underline">Política de Privacidad</Link>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">8. Propiedad Intelectual</h2>
            <p className="text-[#6F6F6F]">
              El Servicio, incluyendo su código, diseño, logotipos y contenido propio, es propiedad de Abita AI y está protegido por las leyes de propiedad intelectual aplicables. No se concede ninguna licencia para reproducir, distribuir o crear obras derivadas sin autorización previa y por escrito.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">9. Suspensión de la Cuenta</h2>
            <p className="text-[#6F6F6F]">
              Nos reservamos el derecho de suspender la cuenta de forma temporal o definitiva si detectamos un índice elevado de reportes de spam por parte de los destinatarios finales, si su WABA es inhabilitada por Meta, si detectamos un uso que infrinja estos términos, o ante cualquier acción que comprometa la estabilidad de nuestra plataforma de mensajería. En caso de suspensión por incumplimiento, no se realizarán reembolsos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">10. Limitación de Responsabilidad</h2>
            <p className="text-[#6F6F6F]">
              En ningún caso Abita AI será responsable por daños indirectos, incidentales, especiales, emergentes o punitivos, incluyendo pero no limitado a: pérdida de ingresos, pérdida de datos o interrupción del negocio, derivados del uso o la imposibilidad de usar el Servicio. La responsabilidad total máxima de Abita AI hacia usted no excederá el monto pagado por el Servicio en los últimos 3 meses.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">11. Modificaciones a los Términos</h2>
            <p className="text-[#6F6F6F]">
              Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos de cambios materiales mediante correo electrónico o un aviso en el panel de control. El uso continuado del Servicio después de dicha notificación constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">12. Ley Aplicable</h2>
            <p className="text-[#6F6F6F]">
              Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de El Salvador, sin dar efecto a ningún principio de conflicto de leyes. Cualquier disputa derivada de estos términos se someterá a la jurisdicción de los tribunales competentes de El Salvador.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">13. Contacto</h2>
            <p className="text-[#6F6F6F]">
              Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos en: <a href="mailto:info@abitaai.com" className="text-[#F36A2D] hover:underline">info@abitaai.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DEDAD0]/60 py-10 bg-[#E9E4D8]">
        <div className="max-w-4xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-[#6F6F6F] tracking-widest uppercase font-bold">
            © 2026 ABITA AI — TODOS LOS DERECHOS RESERVADOS
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-[10px] text-[#F36A2D] tracking-widest uppercase font-bold">Términos</Link>
            <Link href="/privacy" className="text-[10px] text-[#6F6F6F] hover:text-[#F36A2D] tracking-widest uppercase font-bold transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
