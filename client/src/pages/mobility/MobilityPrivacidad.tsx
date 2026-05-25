import { useLocation } from "wouter";
import { ArrowLeft, ShieldCheck, ExternalLink, Mail } from "lucide-react";

/**
 * ============================================================================
 * MOBILITY PRIVACIDAD — Aviso de Privacidad LFPDPPP
 * ============================================================================
 * Versión: 2026-05
 * Ruta: /privacidad-mobility
 *
 * IMPORTANTE: documento legal LFPDPPP-compliant. NO modificar sin revisión.
 * ============================================================================
 */

export const PRIVACY_VERSION = "2026-05";

export default function MobilityPrivacidad() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              LFPDPPP · Datos personales
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
            Aviso de Privacidad
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-300">
              de Mobility
            </span>
          </h1>
          <p className="text-xs text-slate-500">Última actualización: Mayo 2026 · Versión {PRIVACY_VERSION}</p>
        </header>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 lg:p-9 mb-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <p>
            CyberPiezas, con domicilio operativo en Cuernavaca, Morelos, México, es
            responsable del tratamiento de los datos personales recabados a través de
            Mobility.
          </p>
          <p>Para cualquier asunto relacionado con privacidad y derechos ARCO puedes contactarnos en:</p>
          <p className="font-mono text-emerald-300 bg-white/5 inline-flex items-center gap-2 px-4 py-2 rounded-lg">
            <Mail className="w-3.5 h-3.5" />
            privacidad@cyberpiezas.com
          </p>

          <Section number="1" title="Datos personales que recabamos">
            <p>Dependiendo del uso del servicio, Mobility puede recabar:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nombre.</li>
              <li>Correo electrónico.</li>
              <li>Número de WhatsApp.</li>
              <li>Ciudad base.</li>
              <li>Identificación oficial.</li>
              <li>Selfie sosteniendo identificación.</li>
              <li>Historial de viajes.</li>
              <li>Reseñas.</li>
              <li>Reportes.</li>
              <li>Dirección IP aproximada.</li>
              <li>Información básica del dispositivo.</li>
              <li>Fecha y hora de actividad.</li>
              <li>Información relacionada con verificaciones.</li>
            </ul>
          </Section>

          <Section number="2" title="Finalidades del tratamiento">
            <p>Utilizamos los datos personales para:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Operar Mobility.</li>
              <li>Crear y administrar cuentas.</li>
              <li>Verificar identidad.</li>
              <li>Facilitar contacto entre usuarios.</li>
              <li>Revisar reportes.</li>
              <li>Moderar conductas.</li>
              <li>Prevenir fraude.</li>
              <li>Investigar incidentes.</li>
              <li>Cumplir obligaciones legales.</li>
              <li>Mantener integridad operativa del sistema.</li>
            </ul>
          </Section>

          <Section number="3" title="Datos sensibles">
            <p>
              La información utilizada para verificación de identidad, incluyendo INE y
              selfie sosteniendo identificación, es tratada con medidas reforzadas de
              protección.
            </p>
            <p>Estos datos:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>No son visibles para otros usuarios.</li>
              <li>No se utilizan para entrenamiento de inteligencia artificial.</li>
              <li>No se venden.</li>
              <li>No se comparten con terceros con fines comerciales.</li>
            </ul>
            <p>
              El acceso está restringido únicamente a personal autorizado para tareas de
              verificación y moderación.
            </p>
          </Section>

          <Section number="4" title="Transferencias de datos">
            <p>CyberPiezas no vende datos personales.</p>
            <p>
              CyberPiezas no comparte datos personales con terceros para fines publicitarios
              o comerciales.
            </p>
            <p>Los datos únicamente podrán compartirse:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cuando exista obligación legal.</li>
              <li>Cuando una autoridad competente lo solicite conforme a derecho.</li>
              <li>Cuando sea necesario para proteger derechos, integridad o seguridad de personas.</li>
            </ul>
          </Section>

          <Section number="5" title="Derechos ARCO">
            <p>Tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Acceder a tus datos.</li>
              <li>Rectificar información incorrecta.</li>
              <li>Solicitar cancelación.</li>
              <li>Oponerte a ciertos tratamientos.</li>
            </ul>
            <p>Para ejercer derechos ARCO debes enviar solicitud a:</p>
            <p className="font-mono text-emerald-300 bg-white/5 inline-block px-3 py-1 rounded-lg">
              privacidad@cyberpiezas.com
            </p>
            <p>La solicitud deberá incluir:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nombre asociado a la cuenta.</li>
              <li>Medio de contacto.</li>
              <li>Descripción clara de la solicitud.</li>
            </ul>
            <p>
              Responderemos dentro de los plazos establecidos por la LFPDPPP, incluyendo un
              máximo de 20 días hábiles para respuesta.
            </p>
          </Section>

          <Section number="6" title="Medidas de seguridad">
            <p>CyberPiezas implementa medidas razonables de seguridad, incluyendo:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cifrado en reposo.</li>
              <li>Acceso restringido.</li>
              <li>Registros internos de acceso a verificaciones.</li>
              <li>Separación de datos sensibles.</li>
              <li>Revisión humana limitada.</li>
            </ul>
            <p>
              Ningún sistema es absolutamente invulnerable, pero buscamos reducir riesgos
              razonablemente.
            </p>
          </Section>

          <Section number="7" title="Política de retención">
            <Subsection number="7.1" title="INE y selfie">
              <p>
                Se conservan durante la vida activa de la cuenta y hasta 1 año después de
                su cierre.
              </p>
              <p>Posteriormente son eliminados automáticamente.</p>
            </Subsection>

            <Subsection number="7.2" title="WhatsApp">
              <p>
                Se conserva durante la vida activa de la cuenta y hasta 30 días después de
                su cierre.
              </p>
            </Subsection>

            <Subsection number="7.3" title="Reportes">
              <p>Los reportes resueltos se conservan internamente hasta por 3 años.</p>
              <p>
                Posteriormente pueden permanecer únicamente de forma anonimizada para fines
                históricos y de integridad operativa.
              </p>
            </Subsection>

            <Subsection number="7.4" title="Reseñas">
              <p>Las reseñas pueden permanecer de forma permanente anonimizadas.</p>
              <p>
                Cuando una persona elimina su cuenta, las reseñas asociadas pueden mostrarse
                como:
              </p>
              <p className="italic text-slate-400 pl-3 border-l-2 border-blue-400/30">
                "Persona que ya no está en Mobility".
              </p>
            </Subsection>
          </Section>

          <Section number="8" title="Cookies y tecnologías similares">
            <p>Mobility utiliza cookies y tecnologías similares mínimas necesarias para:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Mantener sesión.</li>
              <li>Recordar preferencias básicas.</li>
              <li>Mejorar estabilidad técnica.</li>
            </ul>
            <p>No utilizamos cookies para vender perfiles publicitarios.</p>
          </Section>

          <Section number="9" title="Cambios al aviso de privacidad">
            <p>CyberPiezas puede actualizar este aviso cuando:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cambie la operación del servicio.</li>
              <li>Existan cambios legales.</li>
              <li>Se modifiquen procesos relevantes.</li>
            </ul>
            <p>Los cambios importantes serán notificados a los usuarios.</p>
          </Section>
        </div>

        <div className="bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5 mb-6 text-xs text-amber-200/80 leading-relaxed">
          Este documento es un punto de partida operativo para el piloto de Mobility y será
          revisado profesionalmente conforme el servicio crezca. Si tienes dudas o necesitas
          ejercer tus derechos, escríbenos a <span className="font-mono">privacidad@cyberpiezas.com</span>.
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-400">Documento complementario:</p>
          <button
            onClick={() => setLocation("/terms-mobility")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-full text-sm font-bold text-blue-300 transition-colors"
          >
            Términos y Condiciones <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-6 first:pt-0 border-t first:border-t-0 border-white/10">
      <h2 className="text-base lg:text-lg font-bold text-white mb-4 flex items-baseline gap-2">
        <span className="text-emerald-400 font-mono">{number}.</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Subsection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-baseline gap-2">
        <span className="text-emerald-400/80 font-mono text-xs">{number}</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  );
}
