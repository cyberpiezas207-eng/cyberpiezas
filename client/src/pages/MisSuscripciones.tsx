import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
  ListChecks,
  PlusCircle,
} from "lucide-react";

const POS_INFO: Record<string, { name: string; icon: string; color: string }> = {
  boutique: { name: "Boutique", icon: "👗", color: "from-rose-500 to-pink-600" },
  abarrotes: { name: "Abarrotes", icon: "🛒", color: "from-amber-500 to-orange-600" },
  veterinaria: { name: "Veterinaria", icon: "🐾", color: "from-emerald-500 to-teal-600" },
  verduleria: { name: "Verdulería", icon: "🥕", color: "from-green-500 to-emerald-600" },
  tarima: { name: "Tarima", icon: "🎤", color: "from-fuchsia-500 to-purple-600" },
};

const POS_LINKS: Record<string, string> = {
  boutique: "/dashboard",
  abarrotes: "/abarrotes-pos",
  veterinaria: "/veterinaria-pos",
  verduleria: "/verduleria",
  tarima: "/mi-tarima",
};

export default function MisSuscripciones() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const subscriptions = trpc.pagos.subscriptions.listMine.useQuery();
  const myRequests = trpc.pagos.requests.listMine.useQuery();

  const active = (subscriptions.data ?? []).filter((s: any) => s.status === "active");
  const expired = (subscriptions.data ?? []).filter((s: any) => s.status !== "active");
  const pending = (myRequests.data ?? []).filter((r: any) => r.status === "pending");
  const history = (myRequests.data ?? []).filter((r: any) => r.status !== "pending");

  const cancelMutation = trpc.pagos.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      utils.pagos.requests.listMine.invalidate();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleCancel = (id: number) => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    cancelMutation.mutate({ id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setLocation("/cyberpiezas")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Inicio</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/sistemas")}
              className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5"
            >
              Mi Panel
            </button>
            <button
              onClick={() => setLocation("/pricing")}
              className="text-xs sm:text-sm bg-slate-900 text-white rounded-full px-3 py-1.5 hover:bg-slate-800 font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Suscribirme a otro</span>
              <span className="sm:hidden">Más</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* HERO */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-600 uppercase tracking-[0.2em] mb-3">
            <ListChecks className="w-3 h-3" />
            <span>Tus suscripciones</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
            Mis Suscripciones
          </h1>
          <p className="text-base text-slate-500">
            Gestiona tus planes activos y revisa el estado de tus solicitudes
          </p>
        </div>

        {/* STATS RÁPIDAS */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 border-2 border-emerald-200">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{active.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Activas</div>
          </div>
          <div
            className={
              "bg-white rounded-2xl p-4 border-2 " +
              (pending.length > 0 ? "border-amber-200" : "border-slate-200")
            }
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{pending.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pendientes</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {history.length + expired.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Histórico</div>
          </div>
        </div>

        {subscriptions.isLoading && (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3" />
            <p className="text-sm">Cargando...</p>
          </div>
        )}

        {/* SUSCRIPCIONES ACTIVAS */}
        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Activas ({active.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {active.map((sub: any) => (
                <ActiveSubCard key={sub.id} subscription={sub} setLocation={setLocation} />
              ))}
            </div>
          </section>
        )}

        {/* PENDIENTES */}
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              En revisión ({pending.length})
            </h2>
            <div className="space-y-2">
              {pending.map((req: any) => (
                <PendingCard
                  key={req.id}
                  request={req}
                  onCancel={() => handleCancel(req.id)}
                  loading={cancelMutation.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {/* HISTÓRICO */}
        {history.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Histórico
            </h2>
            <div className="space-y-2">
              {history.map((req: any) => (
                <HistoryCard key={req.id} request={req} />
              ))}
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {!subscriptions.isLoading &&
          active.length === 0 &&
          pending.length === 0 &&
          history.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Aún no tienes suscripciones
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Descubre los sistemas de CyberPiezas y suscríbete al que mejor se adapte a tu
                negocio.
              </p>
              <Button
                onClick={() => setLocation("/pricing")}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-full px-6 h-11 font-semibold shadow-lg"
              >
                Ver planes <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

        {/* CTA al final si tiene activas */}
        {active.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-800 to-fuchsia-900 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative">
              <Sparkles className="w-8 h-8 text-fuchsia-300 mx-auto mb-3" />
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                ¿Necesitas más sistemas?
              </h3>
              <p className="text-sm text-slate-300 mb-5">
                Cada negocio es único. Agrega los sistemas que necesites por separado.
              </p>
              <Button
                onClick={() => setLocation("/pricing")}
                className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 h-11 font-semibold"
              >
                Ver catálogo completo <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CARD: SUSCRIPCIÓN ACTIVA
// =============================================================================
function ActiveSubCard({
  subscription,
  setLocation,
}: {
  subscription: any;
  setLocation: (p: string) => void;
}) {
  const pos = POS_INFO[subscription.posCode] || {
    name: subscription.posCode,
    icon: "📦",
    color: "from-slate-500 to-slate-700",
  };
  const link = POS_LINKS[subscription.posCode] || "/sistemas";
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const daysLeft = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;

  return (
    <div
      className={
        "rounded-2xl p-5 text-white relative overflow-hidden bg-gradient-to-br shadow-lg " +
        pos.color
      }
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{pos.icon}</div>
          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            ✓ Activa
          </span>
        </div>
        <h3 className="text-xl font-bold mb-1">{pos.name}</h3>
        <p className="text-xs text-white/80 mb-4">
          {subscription.planType === "monthly" ? "Plan Mensual" : "Plan Anual"}
          {" · $"}
          {parseFloat(subscription.amountPaid).toLocaleString("es-MX")} MXN
        </p>
        {endDate && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">
              Vence
            </div>
            <div className="text-sm font-semibold">
              {endDate.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
            {isExpiringSoon && (
              <div className="flex items-center gap-1 text-[10px] text-yellow-200 mt-1">
                <AlertCircle className="w-3 h-3" />
                Vence en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setLocation(link)}
          className="w-full bg-white/95 hover:bg-white text-slate-900 rounded-full h-9 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          Entrar a {pos.name} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// CARD: PENDIENTE
// =============================================================================
function PendingCard({
  request,
  onCancel,
  loading,
}: {
  request: any;
  onCancel: () => void;
  loading: boolean;
}) {
  const pos = POS_INFO[request.posCode] || {
    name: request.posCode,
    icon: "📦",
    color: "from-slate-500 to-slate-700",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-amber-200 flex items-center gap-4">
      <div
        className={
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-sm flex-shrink-0 " +
          pos.color
        }
      >
        {pos.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="font-bold text-sm text-slate-900">
              {pos.name}{" "}
              <span className="text-slate-500 font-normal">
                · {request.planType === "monthly" ? "Mensual" : "Anual"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              ${parseFloat(request.finalAmount).toLocaleString("es-MX")} ·{" "}
              {new Date(request.createdAt).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            En revisión
          </span>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <X className="w-3 h-3" /> Cancelar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CARD: HISTORIA
// =============================================================================
function HistoryCard({ request }: { request: any }) {
  const pos = POS_INFO[request.posCode] || {
    name: request.posCode,
    icon: "📦",
    color: "from-slate-500 to-slate-700",
  };
  const statusConfig = {
    approved: { label: "Aprobada", bg: "bg-emerald-100", text: "text-emerald-700" },
    rejected: { label: "Rechazada", bg: "bg-rose-100", text: "text-rose-700" },
    cancelled: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-700" },
  };
  const status =
    statusConfig[request.status as keyof typeof statusConfig] || statusConfig.cancelled;

  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
        {pos.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">
              {pos.name}{" "}
              <span className="text-slate-500 font-normal text-xs">
                · ${parseFloat(request.finalAmount).toLocaleString("es-MX")}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {new Date(request.createdAt).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          <span
            className={
              "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full " +
              status.bg +
              " " +
              status.text
            }
          >
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
