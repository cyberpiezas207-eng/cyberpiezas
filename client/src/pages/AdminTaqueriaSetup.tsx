import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Gift,
  Calendar,
  Users,
} from "lucide-react";

export default function AdminTaqueriaSetup() {
  const [, setLocation] = useLocation();
  const [granting, setGranting] = useState(false);
  const [grantingOther, setGrantingOther] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");
  const [otherMonths, setOtherMonths] = useState("12");

  // Verificar si ya tiene acceso
  const accessQuery = trpc.taqueria.hasAccess.useQuery();
  const hasAccess = accessQuery.data?.hasAccess ?? false;

  // Mutations
  const grantMyself = trpc.taqueria.admin.grantMyselfAccess.useMutation({
    onSuccess: (data) => {
      toast.success("Acceso activado: " + data.message);
      setGranting(false);
      accessQuery.refetch();
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setGranting(false);
    },
  });

  const grantOther = trpc.taqueria.admin.grantFreeAccess.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setGrantingOther(false);
      setOtherUserId("");
      setOtherMonths("12");
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setGrantingOther(false);
    },
  });

  const handleGrantMyself = () => {
    setGranting(true);
    grantMyself.mutate();
  };

  const handleGrantOther = () => {
    const userId = parseInt(otherUserId);
    const months = parseInt(otherMonths);

    if (!userId || isNaN(userId)) {
      toast.error("Ingresa un userId valido");
      return;
    }
    if (!months || isNaN(months) || months < 1 || months > 24) {
      toast.error("Meses debe ser entre 1 y 24");
      return;
    }

    setGrantingOther(true);
    grantOther.mutate({ userId, months, reason: "Beta tester / cortesia" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setLocation("/cyberpiezas")}
            className="flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Inicio</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Setup Taquería</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Admin only</div>
            </div>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* HERO */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-600 uppercase tracking-[0.2em] mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Panel de configuración</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
            Setup Taquería POS 🌮
          </h1>
          <p className="text-base text-slate-500">
            Activa tu acceso o regala acceso a beta testers para probar el sistema.
          </p>
        </div>

        {/* ESTADO ACTUAL */}
        <div
          className={
            "rounded-2xl p-5 mb-6 border-2 " +
            (hasAccess
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200")
          }
        >
          <div className="flex items-start gap-3">
            <div
              className={
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 " +
                (hasAccess ? "bg-emerald-100" : "bg-amber-100")
              }
            >
              {hasAccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Calendar className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-slate-900">
                {hasAccess ? "✓ Tienes acceso activo" : "Sin acceso aún"}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {hasAccess
                  ? "Ya puedes usar el POS de Taquería normalmente."
                  : "Activa tu acceso con un click para empezar a probar."}
              </p>
              {hasAccess && (
                <Button
                  onClick={() => setLocation("/taqueria")}
                  size="sm"
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                >
                  Ir al POS de Taquería →
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* CARD: ACTIVAR MI ACCESO */}
        {!hasAccess && (
          <div className="bg-white rounded-3xl p-6 border-2 border-fuchsia-200 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-200/30 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">Activar mi acceso</h2>
                  <p className="text-xs text-slate-500">12 meses gratis para testing</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5">
                Como admin, puedes activar tu propio acceso al POS de Taquería sin pasar
                por el flujo de pago. Ideal para construir y probar el sistema.
              </p>
              <Button
                onClick={handleGrantMyself}
                disabled={granting}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-full h-11 font-semibold shadow-md"
              >
                {granting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Activar mi acceso ahora
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* CARD: OTORGAR ACCESO A OTROS */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Regalar acceso</h2>
              <p className="text-xs text-slate-500">Activa cuenta gratis para beta testers</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-5">
            Activa acceso a cualquier usuario por X meses. Útil para clientes que están
            probando, beta testers, o regalos especiales.
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                User ID
              </label>
              <input
                type="number"
                value={otherUserId}
                onChange={(e) => setOtherUserId(e.target.value)}
                placeholder="Ej: 5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                Meses de acceso
              </label>
              <select
                value={otherMonths}
                onChange={(e) => setOtherMonths(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-slate-400"
              >
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses (1 año)</option>
                <option value="24">24 meses (2 años)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleGrantOther}
            disabled={grantingOther || !otherUserId}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 font-semibold"
          >
            {grantingOther ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Otorgando...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Otorgar acceso
              </>
            )}
          </Button>
        </div>

        {/* INFO ADICIONAL */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2">
            ℹ️ Información
          </h3>
          <ul className="text-xs text-blue-800 space-y-1.5">
            <li>• Esta página es solo para admin (tú).</li>
            <li>• Los accesos otorgados se crean como suscripciones aprobadas.</li>
            <li>• El monto pagado se registra como $0 (free grant).</li>
            <li>• Los accesos se pueden ver en "Pagos por aprobar" como históricos.</li>
            <li>• Después de activar, ve a /taqueria para empezar a construir tu menú.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
