import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Calendar, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

export default function MySubscription() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Datos simulados del plan (en producción vendrían del backend)
  const subscriptionData = {
    plan: "Profesional",
    price: 170,
    currency: "MXN",
    startDate: new Date(2024, 0, 15), // 15 de enero 2024
    renewalDate: new Date(2024, 1, 15), // 15 de febrero 2024
    status: "active",
    features: [
      "Gestión de inventario ilimitado",
      "Múltiples sucursales",
      "Reportes avanzados",
      "Tienda pública",
      "Soporte prioritario",
    ],
  };

  const today = new Date();
  const daysRemaining = Math.ceil(
    (subscriptionData.renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-white">Mi Suscripción</h1>
          <p className="text-slate-400 mt-2">Gestiona tu plan y renovación</p>
        </div>

        {/* Plan Actual */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white">{subscriptionData.plan}</CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Plan activo
                </CardDescription>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Activo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-white">
              ${subscriptionData.price}
              <span className="text-lg text-slate-400 ml-2">/{subscriptionData.currency}/mes</span>
            </div>

            {/* Información de Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Fecha de inicio</span>
                </div>
                <p className="text-white font-medium">{formatDate(subscriptionData.startDate)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Próxima renovación</span>
                </div>
                <p className="text-white font-medium">{formatDate(subscriptionData.renewalDate)}</p>
              </div>
            </div>

            {/* Días Restantes */}
            <div className="bg-slate-700/50 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Días restantes</span>
                <span className="text-2xl font-bold text-primary">{daysRemaining} días</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2 mt-3">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${Math.max(0, (daysRemaining / 30) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Características del Plan */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Características incluidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {subscriptionData.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => setLocation("/")}
            className="bg-primary hover:bg-primary/90 text-white h-12 text-base"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Renovar o cambiar plan
          </Button>

          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-12 text-base"
            onClick={() => setLocation("/gestion-acceso")}
          >
            Ver detalles de acceso
          </Button>
        </div>

        {/* Información adicional */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                <p>
                  Si tienes preguntas sobre tu suscripción o necesitas cambiar tu plan, contacta a nuestro equipo de soporte.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
