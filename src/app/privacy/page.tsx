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
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-[#F36A2D] transition-colors">Términos</Link>
            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-[#F36A2D] transition-colors">Volver al Login</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-20 flex-1">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-[#111111] leading-[1.1] mb-6">
            Política de <span className="italic text-[#F36A2D]">Privacidad</span>
          </h1>
          <p className="text-[#6F6F6F] text-lg font-light">Última actualización: Septiembre 2026</p>
        </div>

        <div className="space-y-12 text-[#111111] leading-relaxed">

          <section className="space-y-4">
            <h2 className="text-2xl font-display">1. Introducción</h2>
            <p className="text-[#6F6F6F]">
              En Abita AI nos tomamos muy en serio la privacidad de los datos. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información personal de los usuarios de nuestra plataforma (&quot;el Servicio&quot;). Al utilizar Abita AI, usted acepta las prácticas descritas en este documento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">2. Información que Recopilamos</h2>
            <p className="text-[#6F6F6F]">Recopilamos los siguientes tipos de información:</p>
            <ul className="space-y-3 text-[#6F6F6F] list-none">
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Información de cuenta:</strong> Nombre, correo electrónico y contraseña cifrada proporcionados al registrarse.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Datos de uso:</strong> Configuración de agentes, instrucciones del bot, bases de conocimiento y archivos multimedia cargados en la plataforma.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Datos de clientes finales (leads):</strong> Nombres, números de teléfono, correos electrónicos e historial de conversaciones de WhatsApp e Instagram. Estos datos pertenecen a su empresa y son procesados en su nombre.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Credenciales de integración:</strong> Tokens de acceso de Meta (WhatsApp/Instagram), cifrados antes de ser almacenados, necesarios para operar el Servicio.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Datos de facturación:</strong> Historial de transacciones procesadas a través de Wompi. No almacenamos datos de tarjetas de crédito directamente.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Datos técnicos:</strong> Dirección IP, tipo de navegador y registros de auditoría para fines de seguridad y diagnóstico.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">3. Cómo Usamos la Información</h2>
            <p className="text-[#6F6F6F]">Utilizamos la información recopilada para los siguientes propósitos:</p>
            <ul className="space-y-3 text-[#6F6F6F] list-none">
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Proveer, operar y mejorar el Servicio.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Procesar los mensajes de sus clientes a través de los modelos de IA configurados (Claude, Gemini).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Gestionar su suscripción y procesar pagos recurrentes.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Enviarle notificaciones del sistema y comunicaciones relacionadas con su cuenta.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Detectar y prevenir fraudes, abusos o actividades que infrinjan nuestros Términos de Servicio.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span>Cumplir con obligaciones legales aplicables.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">4. Procesamiento de Mensajes e IA</h2>
            <p className="text-[#6F6F6F]">
              Los mensajes enviados y recibidos se procesan a través de los servidores de la API de Cloud de Meta y los modelos de inteligencia artificial (Claude de Anthropic y/o Gemini de Google) para generar respuestas automáticas. El contenido de los mensajes puede incluir información personal de sus clientes finales. Estos proveedores de IA tienen sus propias políticas de privacidad y de no entrenamiento sobre datos de clientes vía API.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">5. Proveedores de Servicios y Terceros</h2>
            <p className="text-[#6F6F6F]">
              Para operar el Servicio, trabajamos con los siguientes proveedores que pueden procesar sus datos:
            </p>
            <ul className="space-y-3 text-[#6F6F6F] list-none">
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Anthropic / Google:</strong> Modelos de IA para generación de respuestas automáticas.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Meta (WhatsApp / Instagram):</strong> Plataformas de mensajería a través de las cuales fluyen los mensajes.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Supabase / AWS:</strong> Almacenamiento seguro de datos y archivos en servidores en Estados Unidos.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Wompi:</strong> Procesador de pagos para suscripciones. No compartimos datos de conversaciones con Wompi.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Nango:</strong> Gestión de integraciones OAuth (Google Calendar, Google Sheets). Los tokens son cifrados antes de almacenarse.</span>
              </li>
            </ul>
            <p className="text-[#6F6F6F]">
              No vendemos, alquilamos ni compartimos su información personal con terceros para fines de marketing o publicidad.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">6. Compartición e Integridad de la Información</h2>
            <p className="text-[#6F6F6F]">
              Sus datos comerciales, tokens de autenticación y los chats de sus clientes finales <strong>nunca</strong> son vendidos ni compartidos con terceros con fines comerciales. La información fluye de forma segura exclusivamente entre su plataforma de WhatsApp vinculada, nuestra base de datos y los proveedores de infraestructura indicados en su configuración de proyecto.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">7. Seguridad de los Datos</h2>
            <p className="text-[#6F6F6F]">
              Implementamos las siguientes medidas de seguridad: cifrado de tokens y credenciales sensibles (AES-256), transmisión de datos mediante HTTPS/TLS, controles de acceso basados en sesiones autenticadas, validación de firmas en todos los webhooks entrantes de Meta y Wompi, y registros de auditoría para detectar accesos no autorizados. Sin embargo, ningún sistema es 100% infalible, por lo que le recomendamos mantener segura su contraseña de acceso y no compartirla.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">8. Datos de Clientes Finales</h2>
            <p className="text-[#6F6F6F]">
              Usted actúa como responsable del tratamiento de los datos de sus clientes finales. Abita AI actúa como encargado del tratamiento en su nombre. Es su responsabilidad obtener el consentimiento apropiado de sus clientes para procesar sus datos a través de herramientas de automatización con IA, conforme a las leyes de protección de datos aplicables en su país.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">9. Retención de Datos</h2>
            <p className="text-[#6F6F6F]">
              Conservamos su información personal mientras su cuenta esté activa. El historial de conversaciones se conserva de manera indefinida para que usted pueda acceder al contexto completo de sus clientes en cualquier momento. Si desea eliminar su cuenta y todos los datos asociados, puede solicitarlo en <a href="mailto:info@abitaai.com" className="text-[#F36A2D] hover:underline">info@abitaai.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">10. Sus Derechos</h2>
            <p className="text-[#6F6F6F]">Usted tiene los siguientes derechos respecto a su información personal:</p>
            <ul className="space-y-3 text-[#6F6F6F] list-none">
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Acceso:</strong> Solicitar una copia de los datos personales que poseemos sobre usted.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Rectificación:</strong> Corregir información inexacta desde el panel de configuración de su cuenta.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Eliminación:</strong> Solicitar la eliminación permanente de su cuenta y datos asociados.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Portabilidad:</strong> Solicitar sus datos en un formato estructurado y de uso común.</span>
              </li>
            </ul>
            <p className="text-[#6F6F6F]">
              Para ejercer cualquiera de estos derechos, contáctenos en <a href="mailto:info@abitaai.com" className="text-[#F36A2D] hover:underline">info@abitaai.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">11. Política de Cookies</h2>
            <p className="text-[#6F6F6F]">
              Utilizamos cookies y tecnologías similares para garantizar el correcto funcionamiento de la plataforma y mejorar la experiencia del usuario. A continuación detallamos los tipos de cookies que utilizamos:
            </p>
            <ul className="space-y-3 text-[#6F6F6F] list-none">
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Cookies Esenciales (Estrictamente Necesarias):</strong> Son indispensables para el funcionamiento del Servicio, como mantener su sesión iniciada de forma segura. Sin estas cookies, la plataforma no puede funcionar. <br/><em className="text-sm">Duración: Sesión (se eliminan al cerrar el navegador) o máximo 30 días para recordar la sesión.</em></span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Cookies Analíticas (Rendimiento):</strong> Nos ayudan a entender cómo los usuarios interactúan con la plataforma, qué páginas visitan más y si encuentran errores. Utilizamos esta información agregada y anónima para mejorar continuamente el diseño y la funcionalidad. <br/><em className="text-sm">Duración: Hasta 1 año.</em></span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F36A2D] mt-1">—</span>
                <span><strong className="text-[#111111]">Cookies de Marketing (Publicidad):</strong> Actualmente, <strong>no</strong> utilizamos cookies de marketing ni compartimos datos de navegación con redes publicitarias de terceros para fines de retargeting o publicidad cruzada.</span>
              </li>
            </ul>
            <p className="text-[#6F6F6F]">
              Usted puede configurar su navegador para rechazar todas las cookies o para que le avise cuando se envíe una cookie; sin embargo, es posible que algunas funciones del Servicio no funcionen correctamente si deshabilita las cookies esenciales.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">12. Transferencias Internacionales de Datos</h2>
            <p className="text-[#6F6F6F]">
              Los datos son almacenados y procesados principalmente en servidores ubicados en Estados Unidos. Al utilizar el Servicio, usted consiente dicha transferencia. Tomamos las medidas contractuales apropiadas para garantizar que las transferencias de datos cumplan con la normativa aplicable.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">13. Cambios a esta Política</h2>
            <p className="text-[#6F6F6F]">
              Podemos actualizar esta Política periódicamente. Le notificaremos de cambios materiales mediante correo electrónico o un aviso en el panel de control con al menos 15 días de anticipación. El uso continuado del Servicio tras la notificación constituye su aceptación de los cambios.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display">14. Contacto</h2>
            <p className="text-[#6F6F6F]">
              Si tiene preguntas sobre esta Política de Privacidad, puede contactarnos en: <a href="mailto:info@abitaai.com" className="text-[#F36A2D] hover:underline">info@abitaai.com</a>
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
            <Link href="/terms" className="text-[10px] text-[#6F6F6F] hover:text-[#F36A2D] tracking-widest uppercase font-bold transition-colors">Términos</Link>
            <Link href="/privacy" className="text-[10px] text-[#F36A2D] tracking-widest uppercase font-bold">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
