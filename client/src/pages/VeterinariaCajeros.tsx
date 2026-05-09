import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, Mail, CheckCircle2, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function VeterinariaCajeros() {
  const features = [
    "Agregar empleados (recepcionistas, asistentes, doctores)",
    "Asignar permisos por rol (vender, ver reportes, editar inventario)",
    "Registro de quien atendio cada venta",
    "Control de horarios y turnos de trabajo",
    "Auditoria de actividad de cada usuario",
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            Cajeros y Usuarios
          </h1>
          <p className="text-slate-300 mt-1">
            Gestiona los empleados de tu clinica veterinaria.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border-emerald-500/40 shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-white">Proximamente</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-500/40">
                    EN DESARROLLO
                  </span>
                </div>
                <p className="text-slate-300">
                  Esta funcionalidad estara disponible pronto, especifica para tu clinica veterinaria.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-700/50">
              <p className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Lo que vas a poder hacer
              </p>
              <ul className="space-y-2.5">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-slate-200">
                    <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 p-5 rounded-xl bg-slate-900/60 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <p className="font-semibold text-white">Mientras tanto</p>
              </div>
              <p className="text-sm text-slate-300 mb-4">
                Si necesitas agregar empleados ahora, contactanos directamente. Te ayudamos a configurar tu equipo manualmente.
              </p>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("[Cyberpiezas] Solicitud de cajeros para Veterinaria");
                  window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject;
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
              >
                <Mail className="w-4 h-4" />
                Contactar a soporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
