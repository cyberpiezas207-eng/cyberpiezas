import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";

const POS_INFO: Record<string, { name: string; icon: string }> = {
  boutique: { name: "Boutique", icon: "👗" },
  abarrotes: { name: "Abarrotes", icon: "🛒" },
  veterinaria: { name: "Veterinaria", icon: "🐾" },
  verduleria: { name: "Verdulería", icon: "🥕" },
  tarima: { name: "Tarima", icon: "🎤" },
};

export default function MisSuscripciones() {
  const utils = trpc.useUtils();
  const subscriptions = trpc.pagos.subscriptions.listMine.useQuery();
  const requests = trpc.pagos.requests.listMine.useQuery();

  const cancelRequest = trpc.pagos.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      utils.pagos.requests.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const subs = subscriptions.data ?? [];
  const reqs = requests.data ?? [];

  const activeSubs = subs.filter((s: any) => s.status === "active");
  const pendingReqs = reqs.filter((r: any) => r.status === "pending");
  const otherReqs = reqs.filter((r: any) => r.status !== "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              💎 Mis Suscripciones
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestiona tus accesos a los sistemas CyberPiezas
            </p>
          </div>
          <Link href="/pricing">
            <Button className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-full h-11 px-6 font-bold shadow-lg shadow-fuchsia-500/30">
              <Plus className="w-4 h-4 mr-1" />
              Suscribir nuevo sistema
            </Button>
          </Link>
        </div>

        {/* SUSCRIPCIONES ACTIVAS */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            ✅ Activas ({activeSubs.length})
          </h2>
          {subscriptions.isLoading ? (
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
          ) : activeSubs.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-600 font-bold mb-2">No tienes suscripciones activas</p>
              <p className="text-xs text-slate-500 mb-4">
                Suscríbete a un sistema para empezar a usarlo
              </p>
              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-10 px-5 font-bold">
                  Ver planes
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {activeSubs.map((sub: any) => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))}
            </div>
          )}
        </section>

        {/* SOLICITUDES PENDIENTES */}
        {pendingReqs.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              ⏳ Pendientes de aprobación ({pendingReqs.length})
            </h2>
            <div className="space-y-2">
              {pendingReqs.map((req: any) => (
                <PendingRequestCard
                  key={req.id}
                  request={req}
                  onCancel={() => {
                    if (confirm("¿Cancelar esta solicitud?")) {
                      cancelRequest.mutate({ id: req.id });
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* HISTORIAL */}
        {otherReqs.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              📋 Historial
            </h2>
            <div className="space-y-2">
              {otherReqs.slice(0, 10).map((req: any) => (
                <HistoryCard key={req.id} request={req} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

// =============================================================================
// SUBSCRIPTION CARD (activa)
// =============================================================================
function SubscriptionCard({ sub }: { sub: any }) {
  const pos = POS_INFO[sub.posCode] || { name: sub.posCode, icon: "📦" };
  const endDate = new Date(sub.endDate);
  const today = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft <= 7;

  return (
    <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 hover:shadow-lg transition-all">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
          {pos.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-900">{pos.name}</h3>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ACTIVA
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Plan {sub.planType === "monthly" ? "Mensual" : "Anual"} · ${parseFloat(sub.amountPaid).toFixed(0)}
          </p>
          <div className="text-xs space-y-1">
            <p className={"flex items-center gap-1 " + (isExpiringSoon ? "text-amber-700 font-bold" : "text-slate-600")}>
              <Calendar className="w-3 h-3" />
              {isExpiringSoon ? "⚠️ Expira pronto: " : "Vence: "}
              {endDate.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              {isExpiringSoon && " (" + daysLeft + " días)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PENDING REQUEST CARD
// =============================================================================
function PendingRequestCard({
  request,
  onCancel,
}: {
  request: any;
  onCancel: () => void;
}) {
  const pos = POS_INFO[request.posCode] || { name: request.posCode, icon: "📦" };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl flex-shrink-0">
          {pos.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{pos.name}</h3>
            <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ⏳ EN REVISIÓN
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Plan {request.planType === "monthly" ? "Mensual" : "Anual"} · ${parseFloat(request.finalAmount).toFixed(0)} ·{" "}
            {new Date(request.createdAt).toLocaleDateString("es-MX")}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 rounded-full hover:bg-rose-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// HISTORY CARD (aprobada/rechazada)
// =============================================================================
function HistoryCard({ request }: { request: any }) {
  const pos = POS_INFO[request.posCode] || { name: request.posCode, icon: "📦" };
  const isApproved = request.status === "approved";
  const isRejected = request.status === "rejected";
  const isCancelled = request.status === "cancelled";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
        {pos.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">{pos.name}</h3>
          {isApproved && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✅ Aprobada
            </span>
          )}
          {isRejected && (
            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ❌ Rechazada
            </span>
          )}
          {isCancelled && (
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🚫 Cancelada
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          ${parseFloat(request.finalAmount).toFixed(0)} ·{" "}
          {new Date(request.createdAt).toLocaleDateString("es-MX")}
        </p>
        {request.adminNotes && isRejected && (
          <p className="text-xs text-rose-700 mt-1 italic">
            Motivo: {request.adminNotes}
          </p>
        )}
      </div>
    </div>
  );
}
