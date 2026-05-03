import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TermsAndConditions() {
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setScrolledToBottom(isAtBottom);
  };

  const handleAccept = () => {
    if (!accepted) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }
    localStorage.setItem("boutique-pos-terms-accepted", "true");
    toast.success("Términos y condiciones aceptados");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-primary">Términos y Condiciones</h1>
          <p className="mt-2 text-muted-foreground">
            Por favor, lee cuidadosamente estos términos antes de usar Boutique POS
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Acuerdo Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Terms Content */}
            <div
              className="max-h-96 overflow-y-auto border rounded-lg p-6 bg-muted/50 space-y-6 text-sm leading-relaxed"
              onScroll={handleScroll}
            >
              <section className="space-y-3">
                <h3 className="font-bold text-base">1. ACEPTACIÓN DE TÉRMINOS</h3>
                <p>
                  Al acceder y utilizar Boutique POS, aceptas estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes usar el servicio.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">2. PROPIEDAD INTELECTUAL Y DERECHOS DE AUTOR</h3>
                <p className="font-semibold text-blue-700">
                  © 2026 CyberPiezas. Todos los derechos reservados.
                </p>
                <p>
                  Boutique POS es propiedad exclusiva de CyberPiezas. El software, código fuente, diseño, interfaz de usuario y toda su estructura son propiedad intelectual protegida. No puedes copiar, reproducir, modificar o distribuir ninguna parte del software sin autorización explícita por escrito.
                </p>
                <p>
                  Este software será registrado formalmente en el Instituto Nacional del Derecho de Autor (INDAUTOR) de México.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">3. LICENCIA DE USO</h3>
                <p>
                  Se te otorga una licencia limitada, no exclusiva, no transferible y revocable para usar Boutique POS únicamente con fines comerciales legales. Esta licencia es personal y está vinculada a tu cuenta de usuario.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">4. RESTRICCIONES DE USO</h3>
                <p className="font-semibold text-red-700">
                  Expresamente se prohíbe:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>No Revender:</strong> No puedes revender, redistribuir o comercializar el acceso a Boutique POS a terceros sin autorización escrita previa.</li>
                  <li><strong>No Compartir Cuenta:</strong> Tu cuenta es personal e intransferible. No puedes compartir tu usuario, contraseña o credenciales con otras personas. Eres responsable de toda actividad en tu cuenta.</li>
                  <li><strong>Solo Uso Comercial Autorizado:</strong> Boutique POS está diseñado exclusivamente para uso comercial legítimo. No puedes usar el sistema para actividades ilícitas, fraudulentas o contrarias a la ley.</li>
                  <li><strong>No Modificar:</strong> No puedes modificar, descompilar, desensamblar o intentar obtener el código fuente del sistema.</li>
                  <li><strong>No Acceso No Autorizado:</strong> No puedes intentar acceder a áreas restringidas o a cuentas de otros usuarios.</li>
                  <li><strong>No Interferencia:</strong> No puedes interferir con el funcionamiento normal del sistema o sobrecargar los servidores.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">4. RESPONSABILIDAD DEL USUARIO</h3>
                <p>
                  Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">5. DATOS Y PRIVACIDAD</h3>
                <p>
                  Tus datos se almacenan en servidores seguros. Nos comprometemos a proteger tu información de acuerdo con las leyes de protección de datos aplicables. No compartiremos tus datos con terceros sin tu consentimiento, excepto cuando sea requerido por ley.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">6. LIMITACIÓN DE RESPONSABILIDAD</h3>
                <p>
                  Boutique POS se proporciona "tal cual". No garantizamos que el servicio sea ininterrumpido, libre de errores o que cumpla con tus requisitos específicos. En ningún caso seremos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar el servicio.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">7. SUSPENSIÓN DE CUENTA</h3>
                <p>
                  Nos reservamos el derecho de suspender o cancelar tu cuenta si:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Violas estos términos y condiciones</li>
                  <li>Intentas compartir tu cuenta con otros usuarios</li>
                  <li>Intentas revender el acceso al sistema</li>
                  <li>Realizas actividades ilícitas o fraudulentas</li>
                  <li>No pagas tu suscripción en la fecha vencida</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">8. SUSCRIPCIÓN Y PAGOS</h3>
                <p>
                  Tu suscripción se renueva automáticamente según el plan seleccionado. Puedes cancelar en cualquier momento. Los pagos se procesan de manera segura a través de transferencia bancaria. No reembolsamos pagos por uso parcial del servicio.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">9. LICENCIAS GRATUITAS O ESPECIALES</h3>
                <p>
                  Las licencias gratuitas, promocionales o especiales otorgadas por razones ecológicas, sociales o comerciales quedan sujetas a validación administrativa previa y pueden revocarse si dejan de cumplirse sus condiciones.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Debes suscribirte al canal de YouTube de CyberPiezas.</li>
                  <li>Debes seguir la página de Facebook de CyberPiezas.</li>
                  <li>Debes compartir ambos perfiles cuando así se solicite como parte de la promoción o convenio.</li>
                  <li>El administrador puede solicitar evidencia y verificar manualmente estos requisitos antes de autorizar o renovar la licencia.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">10. CAMBIOS EN LOS TÉRMINOS</h3>
                <p>
                  Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados por correo electrónico. El uso continuado del servicio constituye aceptación de los términos modificados.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">11. CONTACTO</h3>
                <p>
                  Si tienes preguntas sobre estos términos, contáctanos en:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>WhatsApp: +52 735 494 6224</li>
                  <li>Correo: cyberpiezas207@gmail.com</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">12. LEY APLICABLE</h3>
                <p>
                  Estos términos se rigen por las leyes de México. Cualquier disputa será resuelta en los juzgados competentes de Morelos, México.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-base">13. ACEPTACIÓN FINAL</h3>
                <p className="font-semibold text-emerald-700">
                  Al hacer clic en "Aceptar", reconoces que has leído, entendido y aceptas estar vinculado por estos Términos y Condiciones.
                </p>
              </section>
            </div>

            {/* Scroll Indicator */}
            {!scrolledToBottom && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded">
                <AlertCircle className="h-4 w-4" />
                Desplázate hacia abajo para ver todos los términos
              </div>
            )}

            {/* Acceptance Checkbox */}
            <div className="space-y-4 pt-4 border-t">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  className="mt-1"
                />
                <span className="text-sm leading-relaxed">
                  Acepto los Términos y Condiciones de Boutique POS. Entiendo las restricciones de uso, incluyendo que no puedo revender el servicio, no puedo compartir mi cuenta con otros usuarios y que, si recibo una licencia gratuita o especial, debo cumplir los requisitos de YouTube, Facebook y compartición definidos por CyberPiezas.
                </span>
              </label>

              <Button
                onClick={handleAccept}
                disabled={!accepted || !scrolledToBottom}
                className="w-full"
                size="lg"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aceptar Términos y Condiciones
              </Button>

              {!scrolledToBottom && (
                <p className="text-xs text-muted-foreground text-center">
                  Debes leer todos los términos antes de aceptar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
