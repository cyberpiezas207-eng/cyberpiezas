import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CreditCard, CheckCircle2, Calendar, Stethoscope, Mail, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

export default function VeterinariaSubscription() {
  const { user } = useAuth() as any;

  const accessQuery = trpc.programAccess.getMyAccess.useQuery(undefined, {
    retry: false,
  });

  const myAccess: any = accessQuery.data;
  const vetAccess = myAccess?.programAccesses?.veterinaria ?? null;
  const isActive = vetAccess?.status === "active";

  const startDate = vetAccess?.startsAt ? new Date(vetAccess.startsAt) : null;
  const endDate = vetAccess?.endsAt ? new Date(vetAccess.endsAt) : null;

  const planLabel = (plan?: string) => {
    switch (plan) {
      case "free": return "Gratis";
      case "basic": return "Basico";
      case "professional": return "Profesional";
      case "premium": return "Premium";
      case "annual": return "Anual";
      default: return plan ?? "Sin plan";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            Mi Suscripcion - Veterinaria
          </h1>
          <p className="text-slate-300 mt-1">
            Detalles de tu acceso al modulo de Veterinaria.
          </p>
        </div>

        {accessQuery.isLoading ? (
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="pt-12 pb-12 text-center text-slate-300">
              Cargando informacion de tu suscripcion...
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={
              isActive
                ? "bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 border-emerald-500/50 shadow-xl"
                : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl"
            }>
              <CardContent className="pt-8 pb-8">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                  <div className="flex items-center gap-3">
                    <div className={
                      "w-14 h-14 rounded-2xl flex items-center justify-center " +
                      (isActive ? "bg-emerald-500/30" : "bg-slate-700")
                    }>
                      <Stethoscope className={"w-7 h-7 " + (isActive ? "text-emerald-200" : "text-slate-400")} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Modulo Veterinaria</h2>
                      <p className="text-slate-300 text-sm">Sistema POS para clinicas</p>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-500/50 gap-1.5 font-bold text-sm px-3 py-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      ACTIVO
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 gap-1.5 font-bold text-sm px-3 py-1.5">
                      <Clock className="w-4 h-4" />
                      INACTIVO
                    </Badge>
                  )}
                </div>

                {isActive ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Plan</p>
                      <p className="text-lg font-bold text-white">{planLabel(user?.subscriptionPlan)}</p>
                    </div>
                    <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Fuente</p>
                      <p className="text-lg font-bold text-white capitalize">
                        {vetAccess?.accessSource?.replace("_", " ") ?? "-"}
                      </p>
                    </div>
                    {startDate && (
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Inicio
                        </p>
                        <p className="text-lg font-bold text-white">
                          {format(startDate, "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                    {endDate && (
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Vence
                        </p>
                        <p className="text-lg font-bold text-white">
                          {format(endDate, "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-700/50 text-center">
                    <p className="text-slate-200">Tu acceso al modulo Veterinaria no esta activo.</p>
                    <p className="text-slate-400 text-sm mt-1">Contacta a soporte para activarlo.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features incluidas */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="pt-6 pb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Lo que incluye tu plan
                </h3>
                <ul className="space-y-2.5">
                  {[
                    "Punto de venta completo con productos y servicios",
                    "Registro ilimitado de mascotas y clientes",
                    "Expediente clinico (visitas y vacunas)",
                    "Configuracion de la clinica con logo y datos",
                    "Inventario con descuento automatico al vender",
                    "Soporte por correo",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Próximamente: gestión de pagos */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-purple-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">Gestion de pagos - Proximamente</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      Pronto podras renovar tu plan, descargar tus comprobantes y gestionar tu metodo de pago directamente aqui.
                    </p>
                    <Button
                      onClick={() => {
                        const subject = encodeURIComponent("[Cyberpiezas] Renovar suscripcion Veterinaria");
                        window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject;
                      }}
                      variant="outline"
                      className="border-purple-500/40 text-purple-100 hover:bg-purple-500/20 gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Contactar para renovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
