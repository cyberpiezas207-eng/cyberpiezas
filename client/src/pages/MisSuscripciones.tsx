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
  RotateCcw,
  Gift,
  Shield,
} from "lucide-react";

// ============================================================================
// CATALOGO DE POS - homologado al CyberPiezas Design Standard v2
// Paleta consistente entre todas las pantallas (single source of truth).
// ============================================================================
const POS_INFO: Record<string, { name: string; icon: string; color: string }> = {
  boutique: { name: "Boutique", icon: "👗", color: "from-purple-500 to-pink-500" },
  abarrotes: { name: "Abarrotes", icon: "🛒", color: "from-orange-500 to-red-500" },
  veterinaria: { name: "Veterinaria", icon: "🐾", color: "from-emerald-500 to-cyan-500" },
  verduleria: { name: "Verdulería", icon: "🥕", color: "from-emerald-500 to-green-600" },
  tarima: { name: "Tarima", icon: "🎤", color: "from-fuchsia-600 to-purple-600" },
  taqueria: { name: "Taquería", icon: "🌮", color: "from-amber-500 to-rose-600" },
  papeleria: { name: "Papelería", icon: "📓", color: "from-sky-500 to-blue-600" },
};

const POS_LINKS: Record<string, string> = {
  boutique: "/dashboard",
  abarrotes: "/abarrotes-pos",
  veterinaria: "/veterinaria-pos",
  verduleria: "/verduleria",
  tarima: "/mi-tarima",
  taqueria: "/taqueria",
  papeleria: "/papeleria",
};

// ============================================================================
// HELPERS de fechas relativas
// ============================================================================

// Devuelve texto humano sobre vencimiento.
// "Vence en X dias" / "Vence hoy" / "Vencio hace X dias" / "Vigente por X meses"
function getRelativeExpiration(endDate: Date | null): {
  text: string;
  daysLeft: number;
  urgency: "expired" | "today" | "soon" | "normal" | "far";
} {
  if (!endDate) return { text: "Sin fecha", daysLeft: 0, urgency: "normal" };

  const now = Date.now();
  const diffMs = endDate.getTime() - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return { text: "Venció ayer", daysLeft: days, urgency: "expired" };
    return {
      text: `Venció hace ${absDays} días`,
      daysLeft: days,
      urgency: "expired",
    };
  }

  if (days === 0) return { text: "Vence hoy", daysLeft: 0, urgency: "today" };
  if (days === 1) return { text: "Vence mañana", daysLeft: 1, urgency: "soon" };
  if (days <= 7) return { text: `Vence en ${days} días`, daysLeft: days, urgency: "soon" };
  if (days <= 30) return { text: `Vence en ${days} días`, daysLeft: days, urgency: "normal" };

  // Mas de 30 dias: mostrar en meses
  const months = Math.floor(days / 30);
  if (months === 1) return { text: "Vigente por 1 mes más", daysLeft: days, urgency: "far" };
  return { text: `Vigente por ${months} meses más`, daysLeft: days, urgency: "far" };
}

// Label visual del sourceType (cuando NO es payment normal)
function getSourceBadge(sourceType: string | undefined): { text: string; icon: any } | null {
  if (!sourceType || sourceType === "payment") return null;
  if (sourceType === "courtesy") return { text: "Cortesía", icon: Gift };
  if (sourceType === "admin_grant") return { text: "Acceso manual", icon: Shield };
  if (sourceType === "migration") return { text: "Migrada", icon: RotateCcw };
  return null;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function MisSuscripciones() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  // confirmacion inline: guardamos el id que esta esperando confirmacion
  const [confirmingCancelId, setConfirmingCancelId] = useState<number | null>(null);

  const subscriptions = trpc.pagos.subscriptions.listMine.useQuery();
  const myRequests = trpc.pagos.requests.listMine.useQuery();

  // Particionar suscripciones por status real
  const allSubs = subscriptions.data ?? [];
  const active = allSubs.filter((s: any) => s.status === "active");
  const expired = allSubs.filter((s: any) => s.status === "expired");
  const cancelled = allSubs.filter((s: any) => s.status === "cancelled");

  // Particionar solicitudes de pago por status
  const allRequests = myRequests.data ?? [];
  const pending = allRequests.filter((r: any) => r.status === "pending");
  const history = allRequests.filter((r: any) => r.status !== "pending");

  const cancelMutation = trpc.pagos.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      utils.pagos.requests.listMine.invalidate();
      setConfirmingCancelId(null);
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setConfirmingCancelId(null);
    },
  });

  const isLoading = subscriptions.isLoading || myRequests.isLoading;

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
            Gestiona tus planes activos y revisa cuándo vence cada uno.
          </p>
        </div>

        {/* STATS RAPIDAS */}
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
          <div
            className={
              "bg-white rounded-2xl p-4 border-2 " +
              (expired.length > 0 ? "border-rose-200" : "border-slate-200")
            }
          >
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center mb-3">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{expired.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Vencidas</div>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-5 bg-slate-100 animate-pulse h-48"
              />
            ))}
          </div>
        )}

        {/* SECCION: ACTIVAS */}
        {!isLoading && active.length > 0 && (
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

        {/* SECCION: VENCIDAS - CTA renovar */}
        {!isLoading && expired.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Vencidas ({expired.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expired.map((sub: any) => (
                <ExpiredSubCard key={sub.id} subscription={sub} setLocation={setLocation} />
              ))}
            </div>
          </section>
        )}

        {/* SECCION: PENDIENTES */}
        {!isLoading && pending.length > 0 && (
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
                  isConfirming={confirmingCancelId === req.id}
                  onAskCancel={() => setConfirmingCancelId(req.id)}
                  onConfirmCancel={() => cancelMutation.mutate({ id: req.id })}
                  onDismissCancel={() => setConfirmingCancelId(null)}
                  loading={cancelMutation.isPending && confirmingCancelId === req.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECCION: CANCELADAS (poco frecuente, mostrarlas si existen) */}
        {!isLoading && cancelled.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <X className="w-3.5 h-3.5 text-slate-400" />
              Canceladas
            </h2>
            <div className="space-y-2">
              {cancelled.map((sub: any) => (
                <CancelledSubCard key={sub.id} subscription={sub} />
              ))}
            </div>
          </section>
        )}

        {/* SECCION: HISTORICO de pagos */}
        {!isLoading && history.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Histórico de pagos
            </h2>
            <div className="space-y-2">
              {history.map((req: any) => (
                <HistoryCard key={req.id} request={req} />
              ))}
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {!isLoading &&
          active.length === 0 &&
          pending.length === 0 &&
          expired.length === 0 &&
          cancelled.length === 0 &&
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

        {/* CTA final - solo si tiene al menos una activa */}
        {!isLoading && active.length > 0 && (
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
// CARD: SUSCRIPCION ACTIVA
// Muestra POS activo con vencimiento relativo y boton para entrar.
// Si esta por vencer (urgency soon/today), tambien muestra CTA renovar.
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
  const expiration = getRelativeExpiration(endDate);
  const sourceBadge = getSourceBadge(subscription.sourceType);
  const isUrgent = expiration.urgency === "today" || expiration.urgency === "soon";

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
          <div className="flex flex-col items-end gap-1">
            <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
              ✓ Activa
            </span>
            {sourceBadge && (
              <span className="bg-white/15 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <sourceBadge.icon className="w-2.5 h-2.5" />
                {sourceBadge.text}
              </span>
            )}
          </div>
        </div>
        <h3 className="text-xl font-bold mb-1">{pos.name}</h3>
        <p className="text-xs text-white/80 mb-4">
          {subscription.planType === "monthly" ? "Plan Mensual" : "Plan Anual"}
        </p>

        {endDate && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">
              Vencimiento
            </div>
            <div className="text-sm font-semibold">
              {endDate.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div
              className={
                "flex items-center gap-1 text-[11px] mt-1 " +
                (isUrgent ? "text-yellow-200" : "text-white/80")
              }
            >
              {isUrgent && <AlertCircle className="w-3 h-3" />}
              {expiration.text}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => setLocation(link)}
            className="w-full bg-white/95 hover:bg-white text-slate-900 rounded-full h-9 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            Entrar a {pos.name} <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {isUrgent && (
            <button
              onClick={() => setLocation(`/pricing?posCode=${subscription.posCode}`)}
              className="w-full bg-yellow-300/90 hover:bg-yellow-300 text-slate-900 rounded-full h-9 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Renovar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CARD: SUSCRIPCION VENCIDA
// Misma estructura visual pero en grises, con CTA destacado para renovar.
// =============================================================================
function ExpiredSubCard({
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
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const expiration = getRelativeExpiration(endDate);

  return (
    <div className="rounded-2xl p-5 bg-white border-2 border-rose-200 relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl grayscale opacity-70">{pos.icon}</div>
        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          Vencida
        </span>
      </div>
      <h3 className="text-xl font-bold mb-1 text-slate-900">{pos.name}</h3>
      <p className="text-xs text-slate-500 mb-4">
        {subscription.planType === "monthly" ? "Plan Mensual" : "Plan Anual"}
      </p>

      {endDate && (
        <div className="bg-rose-50 rounded-xl p-3 mb-4 border border-rose-100">
          <div className="text-[10px] text-rose-700 uppercase tracking-wider mb-0.5">
            Estado
          </div>
          <div className="text-sm font-semibold text-rose-900 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {expiration.text}
          </div>
        </div>
      )}

      <button
        onClick={() => setLocation(`/pricing?posCode=${subscription.posCode}`)}
        className={
          "w-full text-white rounded-full h-10 font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-md bg-gradient-to-r active:scale-[0.98] " +
          pos.color
        }
      >
        <RotateCcw className="w-4 h-4" />
        Renovar suscripción
      </button>
    </div>
  );
}

// =============================================================================
// CARD: PENDIENTE (solicitud de pago esperando revision)
// Incluye confirmacion inline en vez de confirm() nativo.
// =============================================================================
function PendingCard({
  request,
  isConfirming,
  onAskCancel,
  onConfirmCancel,
  onDismissCancel,
  loading,
}: {
  request: any;
  isConfirming: boolean;
  onAskCancel: () => void;
  onConfirmCancel: () => void;
  onDismissCancel: () => void;
  loading: boolean;
}) {
  // Extraer posCode del notes JSON si existe (legacy compat)
  let posCode: string | undefined;
  try {
    const notes = request.notes ? JSON.parse(request.notes) : {};
    posCode = notes.posCode;
  } catch {
    posCode = undefined;
  }
  const pos = posCode ? POS_INFO[posCode] : null;

  return (
    <div className="bg-white border-2 border-amber-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{pos?.icon ?? "⏳"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">
              {pos?.name ?? "Solicitud"}
            </h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Pendiente
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            ${parseFloat(request.amount ?? "0").toLocaleString("es-MX")} MXN ·{" "}
            {request.billingType === "monthly" ? "Mensual" : "Anual"}
          </p>
          <p className="text-[11px] text-slate-400">
            Enviada el{" "}
            {new Date(request.createdAt).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
            })}
            . Te avisamos cuando se apruebe.
          </p>

          {/* CONFIRMACION INLINE en vez de confirm() nativo */}
          {!isConfirming ? (
            <button
              onClick={onAskCancel}
              disabled={loading}
              className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Cancelar solicitud
            </button>
          ) : (
            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-xs text-rose-900 font-medium mb-2">
                ¿Cancelar esta solicitud?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onConfirmCancel}
                  disabled={loading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full h-8 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Sí, cancelar"
                  )}
                </button>
                <button
                  onClick={onDismissCancel}
                  disabled={loading}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full h-8 text-xs font-bold disabled:opacity-50"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CARD: CANCELADA (suscripcion cancelada por admin o por el propio cliente)
// =============================================================================
function CancelledSubCard({ subscription }: { subscription: any }) {
  const pos = POS_INFO[subscription.posCode] || {
    name: subscription.posCode,
    icon: "📦",
    color: "from-slate-500 to-slate-700",
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="text-2xl grayscale opacity-60">{pos.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-slate-700">{pos.name}</h3>
        <p className="text-xs text-slate-400">Suscripción cancelada</p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Cancelada
      </span>
    </div>
  );
}

// =============================================================================
// CARD: HISTORICO (solicitudes ya procesadas: aprobadas o rechazadas)
// =============================================================================
function HistoryCard({ request }: { request: any }) {
  let posCode: string | undefined;
  try {
    const notes = request.notes ? JSON.parse(request.notes) : {};
    posCode = notes.posCode;
  } catch {
    posCode = undefined;
  }
  const pos = posCode ? POS_INFO[posCode] : null;
  const isApproved = request.status === "approved";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className={"text-2xl " + (isApproved ? "" : "grayscale opacity-60")}>
        {pos?.icon ?? "📄"}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-slate-900">
          {pos?.name ?? "Solicitud"}
        </h3>
        <p className="text-xs text-slate-500">
          ${parseFloat(request.amount ?? "0").toLocaleString("es-MX")} MXN ·{" "}
          {new Date(request.createdAt).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <span
        className={
          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full " +
          (isApproved
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500")
        }
      >
        {isApproved ? "Aprobada" : "Rechazada"}
      </span>
    </div>
  );
}
