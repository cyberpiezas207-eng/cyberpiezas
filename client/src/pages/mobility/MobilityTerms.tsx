import { useLocation } from "wouter";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";

/**
 * ============================================================================
 * MOBILITY TERMS — Términos y Condiciones de Uso
 * ============================================================================
 * Versión: 2026-05
 * Ruta: /terms-mobility
 *
 * IMPORTANTE: el contenido es legal. NO modificar sin revisión.
 * ============================================================================
 */

export const TERMS_VERSION = "2026-05";

export default function MobilityTerms() {
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
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Documento legal
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
            Términos y Condiciones
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
              de uso de Mobility
            </span>
          </h1>
          <p className="text-xs text-slate-500">Última actualización: Mayo 2026 · Versión {TERMS_VERSION}</p>
        </header>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 lg:p-9 mb-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <p>
            Estos Términos y Condiciones regulan el acceso y uso de Mobility, una plataforma
            operada por CyberPiezas en Cuernavaca, Morelos, México.
          </p>
          <p>
            Al crear una cuenta o utilizar Mobility, aceptas estos términos.
          </p>

          <Section number="1" title="Naturaleza del servicio">
            <Subsection number="1.1" title="Qué es Mobility">
              <p>
                Mobility es una plataforma digital de conexión comunitaria que facilita el
                contacto entre personas que desean compartir trayectos.
              </p>
              <p>
                CyberPiezas no opera vehículos, no asigna conductores, no administra rutas y
                no presta servicios de transporte.
              </p>
              <p>
                Mobility funciona como facilitador de contacto entre personas que libremente
                deciden coordinar un viaje entre ellas.
              </p>
            </Subsection>

            <Subsection number="1.2" title="Lo que Mobility no es">
              <p>Mobility:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-slate-300">
                <li>No es empresa transportista.</li>
                <li>No es taxi.</li>
                <li>No es plataforma de chofer privado.</li>
                <li>No es intermediario de pagos.</li>
                <li>No es aseguradora.</li>
                <li>No garantiza disponibilidad.</li>
                <li>No garantiza comportamiento humano.</li>
              </ul>
              <p>
                CyberPiezas implementa herramientas para ayudar a las personas a tomar
                decisiones más informadas y reducir riesgos, pero no puede controlar las
                decisiones, acciones o conductas de los usuarios fuera de la plataforma.
              </p>
            </Subsection>

            <Subsection number="1.3" title="Piloto cerrado">
              <p>
                Durante esta etapa, Mobility opera bajo un modelo de piloto cerrado por
                invitación.
              </p>
              <p>
                CyberPiezas puede limitar temporalmente el acceso a nuevas cuentas mientras
                se desarrolla y evalúa la operación del sistema.
              </p>
            </Subsection>
          </Section>

          <Section number="2" title="Quién puede usar Mobility">
            <Subsection number="2.1" title="Requisitos mínimos">
              <p>Para usar Mobility debes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Tener al menos 18 años.</li>
                <li>Residir en México.</li>
                <li>Contar con identificación oficial vigente.</li>
                <li>Proporcionar información verdadera y actualizada.</li>
                <li>Aceptar estos términos y el Aviso de Privacidad.</li>
              </ul>
            </Subsection>

            <Subsection number="2.2" title="Conductores">
              <p>
                Las personas que publiquen viajes como conductoras deberán completar el
                proceso de verificación solicitado por Mobility.
              </p>
              <p>La verificación puede incluir:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>INE o identificación oficial.</li>
                <li>Selfie sosteniendo la identificación.</li>
                <li>Verificación telefónica.</li>
                <li>Revisión humana por parte del equipo de CyberPiezas.</li>
              </ul>
              <p>
                La verificación de identidad no constituye garantía de conducta, seguridad
                ni confiabilidad absoluta.
              </p>
            </Subsection>

            <Subsection number="2.3" title="Información falsa">
              <p>
                Crear cuentas con información falsa, alterada o perteneciente a otra persona
                puede resultar en suspensión o cancelación de la cuenta.
              </p>
            </Subsection>
          </Section>

          <Section number="3" title="Cuenta de usuario">
            <Subsection number="3.1" title="Creación de cuenta">
              <p>
                Para acceder a Mobility necesitas crear una cuenta con información básica.
              </p>
              <p>Algunas funciones pueden requerir verificaciones adicionales.</p>
            </Subsection>

            <Subsection number="3.2" title="Responsabilidad sobre la cuenta">
              <p>Cada usuario es responsable de:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Mantener la confidencialidad de su acceso.</li>
                <li>Proteger sus dispositivos.</li>
                <li>No compartir cuentas.</li>
                <li>Notificar accesos sospechosos.</li>
              </ul>
            </Subsection>

            <Subsection number="3.3" title="Verificación progresiva">
              <p>Mobility utiliza un modelo de identidad progresiva.</p>
              <p>
                No todas las verificaciones son obligatorias desde el inicio. Algunas
                funciones requieren niveles adicionales de verificación.
              </p>
            </Subsection>

            <Subsection number="3.4" title="Suspensión temporal">
              <p>CyberPiezas puede suspender temporalmente una cuenta mientras investiga:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Reportes de conducta.</li>
                <li>Posible fraude.</li>
                <li>Suplantación de identidad.</li>
                <li>Riesgo para otros usuarios.</li>
              </ul>
              <p>La suspensión será explicada al usuario en lenguaje claro.</p>
            </Subsection>
          </Section>

          <Section number="4" title="Reglas de conducta">
            <Subsection number="4.1" title="Conductas prohibidas">
              <p>Está prohibido:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Acosar.</li>
                <li>Amenazar.</li>
                <li>Discriminar.</li>
                <li>Estafar.</li>
                <li>Compartir datos personales de terceros sin autorización.</li>
                <li>Suplantar identidad.</li>
                <li>Publicar contenido sexual no consentido.</li>
                <li>Solicitar favores sexuales a cambio de viajes.</li>
                <li>Utilizar la plataforma para actividades ilícitas.</li>
                <li>Publicar información falsa sobre viajes.</li>
                <li>Manipular reseñas o reportes.</li>
                <li>Coordinar reseñas falsas.</li>
              </ul>
            </Subsection>

            <Subsection number="4.2" title="Cultura comunitaria">
              <p>
                Mobility opera bajo la Constitución Cultural CyberPiezas y sus lineamientos
                de moderación.
              </p>
              <p className="italic text-slate-400">
                No moderamos modales. Moderamos daño.
              </p>
            </Subsection>

            <Subsection number="4.3" title="Viajes solo mujeres">
              <p>
                Mobility puede permitir que algunas conductoras publiquen viajes dirigidos
                únicamente a mujeres y que algunas pasajeras filtren este tipo de viajes.
              </p>
              <p>
                Estas herramientas existen para ayudar a las personas a tomar decisiones
                más informadas y reducir riesgos.
              </p>
              <p>No constituyen garantía de seguridad.</p>
            </Subsection>
          </Section>

          <Section number="5" title="Responsabilidades del conductor">
            <Subsection number="5.1" title="Vehículo y documentación">
              <p>La persona conductora es completamente responsable de:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Su vehículo.</li>
                <li>Su licencia.</li>
                <li>Su seguro.</li>
                <li>El cumplimiento de las leyes de tránsito.</li>
                <li>Las condiciones mecánicas del automóvil.</li>
                <li>Las decisiones tomadas durante el trayecto.</li>
              </ul>
            </Subsection>

            <Subsection number="5.2" title="Información del viaje">
              <p>El conductor debe proporcionar información razonablemente precisa sobre:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ruta.</li>
                <li>Horarios.</li>
                <li>Punto de salida.</li>
                <li>Espacios disponibles.</li>
                <li>Cambios relevantes.</li>
              </ul>
            </Subsection>

            <Subsection number="5.3" title="Conducta durante el viaje">
              <p>
                El conductor debe mantener conducta respetuosa y razonable hacia las
                personas pasajeras.
              </p>
            </Subsection>
          </Section>

          <Section number="6" title="Responsabilidades del pasajero">
            <Subsection number="6.1" title="Conducta">
              <p>La persona pasajera es responsable de:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Su propia conducta.</li>
                <li>Llegar al punto acordado.</li>
                <li>Respetar acuerdos razonables.</li>
                <li>No poner en riesgo a otras personas.</li>
              </ul>
            </Subsection>

            <Subsection number="6.2" title="Pertenencias">
              <p>Cada persona es responsable de sus pertenencias durante el viaje.</p>
              <p>CyberPiezas no responde por pérdidas, daños o robos.</p>
            </Subsection>
          </Section>

          <Section number="7" title="Lo que CyberPiezas no garantiza">
            <Subsection number="7.1" title="Conducta humana">
              <p>CyberPiezas no puede garantizar:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Conducta humana.</li>
                <li>Compatibilidad entre usuarios.</li>
                <li>Puntualidad.</li>
                <li>Honestidad.</li>
                <li>Ausencia de conflictos.</li>
                <li>Disponibilidad continua.</li>
              </ul>
              <p>
                Implementamos herramientas para ayudar a las personas a tomar decisiones más
                informadas y reducir riesgos, incluyendo:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Verificación de identidad.</li>
                <li>Moderación humana.</li>
                <li>Historial de reseñas.</li>
                <li>Reportes comunitarios.</li>
                <li>Revisión manual de casos.</li>
              </ul>
            </Subsection>

            <Subsection number="7.2" title="Responsabilidad limitada">
              <p>CyberPiezas no será responsable por:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Accidentes.</li>
                <li>Lesiones.</li>
                <li>Delitos.</li>
                <li>Conductas indebidas.</li>
                <li>Pérdidas económicas.</li>
                <li>Daños indirectos.</li>
                <li>Conflictos entre usuarios.</li>
              </ul>
              <p>
                Excepto en los casos donde la ley mexicana aplicable establezca
                responsabilidad no renunciable.
              </p>
            </Subsection>
          </Section>

          <Section number="8" title="Pagos">
            <Subsection number="8.1" title="Pagos fuera de la plataforma">
              <p>Mobility no procesa pagos.</p>
              <p>
                Cualquier intercambio económico ocurre directamente entre usuarios por
                medios externos, incluyendo efectivo o transferencias.
              </p>
              <p>CyberPiezas:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>No retiene dinero.</li>
                <li>No cobra comisiones por viaje durante el piloto.</li>
                <li>No garantiza pagos.</li>
                <li>
                  No interviene en disputas económicas privadas salvo para efectos de
                  moderación.
                </li>
              </ul>
            </Subsection>
          </Section>

          <Section number="9" title="Cancelaciones y no-shows">
            <Subsection number="9.1" title="Cancelaciones">
              <p>Las cancelaciones deben comunicarse lo antes posible.</p>
              <p>La comunicación temprana forma parte de la cultura operativa de Mobility.</p>
            </Subsection>

            <Subsection number="9.2" title="Historial contextual">
              <p>Mobility puede registrar patrones repetidos de:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Cancelaciones tardías.</li>
                <li>Ausencias injustificadas.</li>
                <li>Incumplimientos reiterados.</li>
              </ul>
              <p>
                Estos patrones pueden influir en decisiones de moderación o visibilidad
                interna.
              </p>
            </Subsection>

            <Subsection number="9.3" title="No-shows">
              <p>
                Los casos de ausencia injustificada pueden ser reportados y revisados por el
                equipo.
              </p>
            </Subsection>
          </Section>

          <Section number="10" title="Sistema de reportes y moderación">
            <Subsection number="10.1" title="Moderación humana">
              <p>La moderación de Mobility es realizada por personas reales.</p>
              <p>No utilizamos decisiones automáticas para suspensiones permanentes.</p>
            </Subsection>

            <Subsection number="10.2" title="Reportes">
              <p>Los usuarios pueden reportar:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Acoso.</li>
                <li>Fraude.</li>
                <li>Discriminación.</li>
                <li>Conductas riesgosas.</li>
                <li>Spam.</li>
                <li>Doxxing.</li>
                <li>Incumplimientos graves.</li>
              </ul>
            </Subsection>

            <Subsection number="10.3" title="Investigación">
              <p>CyberPiezas puede:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Revisar reportes.</li>
                <li>Solicitar contexto adicional.</li>
                <li>Revisar historiales.</li>
                <li>Suspender temporalmente cuentas.</li>
                <li>Aplicar medidas proporcionales.</li>
              </ul>
            </Subsection>

            <Subsection number="10.4" title="Casos sin apelación">
              <p>
                Los siguientes casos pueden derivar en cancelación inmediata sin proceso
                de apelación:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Violencia física comprobable.</li>
                <li>Fraude documentado.</li>
                <li>Conducta sexual hacia menores.</li>
              </ul>
            </Subsection>
          </Section>

          <Section number="11" title="Suspensión y cancelación de cuentas">
            <Subsection number="11.1" title="Explicación obligatoria">
              <p>
                Cuando Mobility suspenda o cancele una cuenta, explicará el motivo en
                lenguaje claro.
              </p>
            </Subsection>

            <Subsection number="11.2" title="Derecho de apelación">
              <p>
                Salvo las excepciones del apartado 10.4, toda persona puede presentar una
                apelación única dentro de los 7 días posteriores a la notificación.
              </p>
              <p>Las apelaciones deberán enviarse a:</p>
              <p className="font-mono text-blue-300 bg-white/5 inline-block px-3 py-1 rounded-lg">
                moderacion@cyberpiezas.com
              </p>
            </Subsection>

            <Subsection number="11.3" title="Revisión">
              <p>
                Las apelaciones serán revisadas por una persona distinta, cuando sea
                posible, de quien tomó la decisión inicial.
              </p>
            </Subsection>
          </Section>

          <Section number="12" title="Modificaciones a estos términos">
            <p>CyberPiezas puede actualizar estos términos cuando:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cambie la operación del servicio.</li>
              <li>Existan cambios legales.</li>
              <li>Se modifiquen procesos importantes.</li>
            </ul>
            <p>Los cambios relevantes serán notificados a los usuarios.</p>
            <p>
              La continuación en el uso del servicio después de la entrada en vigor de
              cambios implica aceptación de los nuevos términos.
            </p>
          </Section>

          <Section number="13" title="Resolución de disputas">
            <p>Estos términos se rigen por las leyes aplicables en México.</p>
            <p>
              Cualquier controversia relacionada con Mobility será atendida ante las
              autoridades competentes de Cuernavaca, Morelos, salvo disposición legal
              distinta.
            </p>
          </Section>

          <Section number="14" title="Vigencia">
            <p>
              Estos términos permanecen vigentes mientras la persona utilice Mobility o
              mantenga una cuenta activa.
            </p>
          </Section>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-400">Documento complementario:</p>
          <button
            onClick={() => setLocation("/privacidad-mobility")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-full text-sm font-bold text-blue-300 transition-colors"
          >
            Aviso de Privacidad <ExternalLink className="w-3.5 h-3.5" />
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
        <span className="text-blue-400 font-mono">{number}.</span>
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
        <span className="text-blue-400/80 font-mono text-xs">{number}</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  );
}
