import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Check,
  X,
  Eye,
  Loader2,
  DollarSign,
  Clock,
  TrendingUp,
  Calendar,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

const POS_INFO: Record<string, { name: string; icon: string }> = {
  boutique: { name: "Boutique", icon: "👗" },
  abarrotes: { name: "Abarrotes", icon: "🛒" },
  veterinaria: { name: "Veterinaria", icon: "🐾" },
  verduleria: { name: "Verdulería", icon: "🥕" },
  tarima: { name: "Tarima", icon: "🎤" },
};

const METHOD_INFO: Record<string, { label: string; icon: string }> = {
  transferencia: { label: "Transferencia", icon: "🏦" },
  efectivo: { label: "Efectivo", icon: "💵" },
  mercadopago: { label: "MercadoPago", icon: "💳" },
};

export default function AdminPagosPanel() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const utils = trpc.useUtils();
  const requests = trpc.pagos.admin.listAll.useQuery({
    status: filter === "all" ? undefined : filter,
    limit: 100,
  });
  const stats = trpc.pagos.admin.stats.useQuery();

  const items = requests.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            💰 Solicitudes de Pago
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aprueba o rechaza las suscripciones que llegan
          </p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Pendientes"
            value={stats.data?.pendingCount ?? 0}
            icon={<Clock className="w-4 h-4" />}
            color="amber"
          />
          <StatCard
            label="Revenue del mes"
            value={"$" + (stats.data?.monthRevenue ?? "0.00")}
            icon={<DollarSign className="w-4 h-4" />}
            color="emerald"
          />
          <StatCard
            label="Aprobadas este mes"
            value={stats.data?.monthApprovedCount ?? 0}
            icon={<Check className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Total solicitudes mes"
            value={stats.data?.monthRequestsCount ?? 0}
            icon={<TrendingUp className="w-4 h-4" />}
            color="purple"
          />
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={
                "h-9 px-4 rounded-full text-xs font-bold transition-all " +
                (filter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200")
              }
            >
              {status === "pending" && "⏳ Pendientes"}
              {status === "approved" && "✅ Aprobadas"}
              {status === "rejected" && "❌ Rechazadas"}
              {status === "all" && "📋 Todas"}
            </button>
          ))}
        </div>

        {/* LISTA */}
        {requests.isLoading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-bold">No hay solicitudes {filter !== "all" ? filter : ""}</p>
            <p className="text-xs text-slate-500 mt-1">
              Cuando alguien quiera comprar un plan, aparecerá aquí
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((req: any) => (
              <RequestCard
                key={req.id}
                request={req}
                onView={() => setSelectedRequest(req)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onActionComplete={() => {
            setSelectedRequest(null);
            utils.pagos.admin.listAll.invalidate();
            utils.pagos.admin.stats.invalidate();
          }}
        />
      )}
    </DashboardLayout>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  color: string;
}) {
  const gradients: Record<string, string> = {
    amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-700",
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700",
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-700",
  };
  return (
    <div
      className={
        "bg-gradient-to-br border rounded-2xl p-4 " + (gradients[color] || gradients.blue)
      }
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

// =============================================================================
// REQUEST CARD
// =============================================================================
function RequestCard({
  request,
  onView,
}: {
  request: any;
  onView: () => void;
}) {
  const pos = POS_INFO[request.posCode] || { name: request.posCode, icon: "📦" };
  const method = METHOD_INFO[request.paymentMethod] || { label: request.paymentMethod, icon: "💰" };

  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: "⏳ Pendiente", bg: "bg-amber-100", text: "text-amber-800" },
    approved: { label: "✅ Aprobada", bg: "bg-emerald-100", text: "text-emerald-800" },
    rejected: { label: "❌ Rechazada", bg: "bg-rose-100", text: "text-rose-800" },
    cancelled: { label: "🚫 Cancelada", bg: "bg-slate-100", text: "text-slate-700" },
  };
  const badge = statusBadges[request.status] || statusBadges.pending;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-fuchsia-300 hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Icono POS */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
          {pos.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">{pos.name}</h3>
            <span className="text-xs text-slate-500">
              {request.planType === "monthly" ? "Mensual" : "Anual"}
            </span>
            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + badge.bg + " " + badge.text}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-medium">{request.customerName}</span>
            <span className="text-slate-400"> · {request.customerEmail}</span>
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span>{method.icon} {method.label}</span>
            <span>·</span>
            <span>
              <Calendar className="w-3 h-3 inline" />{" "}
              {new Date(request.createdAt).toLocaleDateString("es-MX")}
            </span>
          </div>
        </div>

        {/* Precio */}
        <div className="text-right flex-shrink-0">
          {request.discountApplied ? (
            <>
              <p className="text-xs text-slate-400 line-through">
                ${parseFloat(request.originalAmount).toFixed(0)}
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                ${parseFloat(request.finalAmount).toFixed(0)}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold">
                🎁 -{request.discountPercentage}%
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              ${parseFloat(request.finalAmount).toFixed(0)}
            </p>
          )}
        </div>

        {/* Acciones */}
        <Button
          onClick={onView}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 px-5 text-xs font-bold flex-shrink-0"
        >
          <Eye className="w-4 h-4 mr-1" />
          Ver detalle
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MODAL DE DETALLE - aprobar o rechazar
// =============================================================================
function RequestDetailModal({
  request,
  onClose,
  onActionComplete,
}: {
  request: any;
  onClose: () => void;
  onActionComplete: () => void;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pos = POS_INFO[request.posCode] || { name: request.posCode, icon: "📦" };
  const method = METHOD_INFO[request.paymentMethod] || { label: request.paymentMethod, icon: "💰" };

  const approve = trpc.pagos.admin.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Solicitud aprobada. Suscripción activada.");
      onActionComplete();
    },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.pagos.admin.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      onActionComplete();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApprove = () => {
    if (confirm("¿Aprobar este pago y activar la suscripción?")) {
      approve.mutate({
        requestId: request.id,
        adminNotes: adminNotes || undefined,
      });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Debes explicar por qué rechazas");
      return;
    }
    reject.mutate({
      requestId: request.id,
      adminNotes: rejectReason,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                {pos.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{pos.name}</h2>
                <p className="text-white/80 text-sm">
                  {request.planType === "monthly" ? "Plan Mensual" : "Plan Anual"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          {/* Datos del cliente */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              👤 Cliente
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-bold text-slate-900">{request.customerName}</p>
              <p className="text-sm text-slate-600">{request.customerEmail}</p>
            </div>
          </section>

          {/* Precio */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              💰 Monto a cobrar
            </h3>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              {request.discountApplied ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-emerald-700">
                      ${parseFloat(request.finalAmount).toFixed(2)}
                    </span>
                    <span className="text-lg text-slate-400 line-through">
                      ${parseFloat(request.originalAmount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    🎁 Descuento del {request.discountPercentage}% aplicado
                  </p>
                </>
              ) : (
                <p className="text-3xl font-bold text-emerald-700">
                  ${parseFloat(request.finalAmount).toFixed(2)}
                </p>
              )}
            </div>
          </section>

          {/* Método de pago */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              💳 Método de pago
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-bold text-slate-900">
                {method.icon} {method.label}
              </p>
            </div>
          </section>

          {/* Comprobante */}
          {request.proofUrl && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                📎 Comprobante
              </h3>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={request.proofUrl}
                  alt="Comprobante"
                  className="w-full max-h-96 object-contain bg-slate-50"
                />
              </div>
              <a
                href={request.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-fuchsia-600 hover:text-fuchsia-700 font-bold mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                Ver tamaño completo
              </a>
            </section>
          )}

          {/* Notas del cliente */}
          {request.customerNotes && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                💬 Notas del cliente
              </h3>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {request.customerNotes}
                </p>
              </div>
            </section>
          )}

          {/* Fecha */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              📅 Fecha de solicitud
            </h3>
            <p className="text-sm text-slate-700">
              {new Date(request.createdAt).toLocaleString("es-MX", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </section>

          {/* Si ya está procesada */}
          {request.status !== "pending" && (
            <section className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {request.status === "approved" ? "✅ Aprobada" : "❌ Rechazada"}
              </h3>
              {request.adminNotes && (
                <p className="text-sm text-slate-700 mt-2">
                  <span className="font-bold">Notas:</span> {request.adminNotes}
                </p>
              )}
              {request.reviewedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(request.reviewedAt).toLocaleString("es-MX")}
                </p>
              )}
            </section>
          )}

          {/* ACCIONES - solo si está pending */}
          {request.status === "pending" && (
            <>
              {!showRejectForm ? (
                <section className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                      📝 Notas (opcional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Ej: Confirmado por transferencia BBVA..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={approve.isPending}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full h-12 font-bold shadow-lg shadow-emerald-500/30"
                    >
                      {approve.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Aprobar y activar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowRejectForm(true)}
                      className="flex-1 bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-300 text-rose-600 rounded-full h-12 font-bold"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </section>
              ) : (
                <section className="space-y-3 pt-2 border-t border-slate-200 bg-rose-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-3xl">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2 block">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Motivo del rechazo *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ej: El comprobante no es legible, no se ve el monto..."
                      rows={3}
                      className="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
                    />
                    <p className="text-xs text-rose-600 mt-1">
                      El cliente recibirá este mensaje
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full h-11 font-bold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={reject.isPending || !rejectReason.trim()}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full h-11 font-bold"
                    >
                      {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar rechazo"}
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
