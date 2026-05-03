import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Leaf, Recycle, RotateCcw, Mail, Phone, CheckCircle2 } from "lucide-react";

interface WelcomeMessageProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export function WelcomeMessage({ isOpen, onClose, userName }: WelcomeMessageProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-8">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-300 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-300 rounded-full blur-3xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 space-y-6">
            {/* Subscription Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                <CheckCircle2 className="h-5 w-5" />
                ¡SUSCRIPCIÓN CONFIRMADA!
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-900 to-teal-900 bg-clip-text text-transparent">
                ¡Bienvenido a Boutique POS!
              </h2>
              {userName && (
                <p className="text-xl text-emerald-700">
                  Hola, <span className="font-bold text-emerald-900">{userName}</span>
                </p>
              )}
              <div className="pt-2">
                <p className="text-lg font-semibold text-emerald-600">
                  Tu suscripción está activa y lista para transformar tu negocio
                </p>
              </div>
            </div>

            {/* Main Message */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border-2 border-emerald-300 space-y-4 shadow-lg">
              <h3 className="text-2xl font-bold text-emerald-900 text-center">
                ¡Gracias por tu confianza!
              </h3>
              <p className="text-emerald-900 leading-relaxed text-center">
                Acabas de unirte a una comunidad de emprendedores comprometidos con la sostenibilidad. Tu suscripción te da acceso completo a todas las herramientas de Boutique POS para gestionar tu negocio de manera profesional y responsable con el medio ambiente.
              </p>
              <p className="text-emerald-800 font-semibold text-center text-lg">
                Tu viaje hacia la transformación digital comienza aquí.
              </p>
            </div>

            {/* Subscription Benefits */}
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-6 border border-emerald-300 space-y-3">
              <h3 className="font-bold text-emerald-900 text-center text-lg">
                Lo que incluye tu suscripción:
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Punto de venta completo</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Gestión de inventario</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Múltiples sucursales</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Sincronización offline</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Reportes y análisis</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-900">Soporte prioritario</span>
                </div>
              </div>
            </div>

            {/* 3R Section */}
            <div className="space-y-3">
              <p className="text-emerald-800 font-semibold text-center">
                Creemos en las <span className="text-emerald-600">3R de la Sostenibilidad:</span>
              </p>

              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-white/80 border-emerald-200 p-4 text-center space-y-2 hover:shadow-lg transition">
                  <RotateCcw className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900">Reducir</h4>
                  <p className="text-sm text-emerald-700">Minimiza residuos en tu operación</p>
                </Card>

                <Card className="bg-white/80 border-emerald-200 p-4 text-center space-y-2 hover:shadow-lg transition">
                  <Recycle className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900">Reutilizar</h4>
                  <p className="text-sm text-emerald-700">Extiende la vida útil de productos</p>
                </Card>

                <Card className="bg-white/80 border-emerald-200 p-4 text-center space-y-2 hover:shadow-lg transition">
                  <Leaf className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900">Reciclar</h4>
                  <p className="text-sm text-emerald-700">Cierra el ciclo de vida de materiales</p>
                </Card>
              </div>
            </div>

            {/* Sustainable Business Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-emerald-200 space-y-3">
              <p className="text-emerald-900 leading-relaxed">
                Si tu negocio es de ropa reutilizada, bazar ecológico, o cualquier iniciativa que contribuya a la sostenibilidad ambiental, nos encantaría conocer más sobre tu proyecto.
              </p>

              <p className="text-emerald-800 font-semibold">
                Podemos explorar convenios especiales y soluciones personalizadas para tu modelo de negocio.
              </p>
            </div>

            {/* Contact Section */}
            <div className="bg-emerald-100/50 rounded-lg p-6 border border-emerald-300 space-y-4">
              <h3 className="font-bold text-emerald-900 text-center">
                ¿Interesado en convenios sostenibles?
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => window.open(`https://wa.me/527354946224?text=Hola, me gustaría conocer sobre convenios sostenibles para mi negocio.`, "_blank")}
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => window.location.href = "mailto:cyberpiezas207@gmail.com?subject=Interés en Convenio Sostenible"}
                >
                  <Mail className="h-4 w-4" />
                  Correo
                </Button>
              </div>

              <p className="text-xs text-emerald-700 text-center">
                WhatsApp: +52 735 494 6224 | Email: cyberpiezas207@gmail.com
              </p>
            </div>

            {/* Footer */}
            <div className="text-center space-y-4">
              <p className="text-sm text-emerald-700">
                Juntos estamos construyendo un futuro más verde. ¡Gracias por ser parte del cambio!
              </p>

              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-6 text-lg"
              >
                Comenzar a usar Boutique POS
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
