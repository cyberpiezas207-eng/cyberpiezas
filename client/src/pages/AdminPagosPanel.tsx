import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
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
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Inbox,
  Search,
} from "lucide-react";

const POS_INFO: Record<string, { name: string; icon: string; color: string }> = {
  boutique: { name: "Boutique", icon: "👗", color: "from-rose-500 to-pink-600" },
  abarrotes: { name: "Abarrotes", icon: "🛒", color: "from-amber-500 to-orange-600" },
  veterinaria: { name: "Veterinaria", icon: "🐾", color: "from-emerald-500 to-teal-600" },
  verduleria: { name: "Verdulería", icon: "🥕", color: "from-green-500 to-emerald-600" },
  tarima: { name: "Tarima", icon: "🎤", color: "from-fuchsia-500 to-purple-600" },
};

const METHOD_INFO: Record<string, { label: string; icon: string }> = {
  transferencia: { label: "Transferencia", icon: "🏦" },
  efectivo: { label: "Efectivo", icon: "💵" },
  mercadopago: { label: "MercadoPago", icon: "💳" },
};

export default function AdminPagosPanel() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const utils = trpc.useUtils();
  const requests = trpc.pagos.admin.listAll.useQuery({
    status: filter === "all" ? undefined : filter,
    limit: 100,
  });
  const stats = trpc.pagos.admin.stats.useQuery();

  const items = (requests.data ?? []).filter((item: any) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      item.customerName?.toLowerCase().includes(lower) ||
      item.customerEmail?.toLowerCase().includes(lower) ||
      item.posCode?.toLowerCase().includes(lower)
    );
  });

  const handleRefresh = () => {
    requests.refetch();
    stats.refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* NAVBAR ADMIN */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/cyberpiezas")}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Inicio</span>
            </button>
            <div className="h-5 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">Panel Admin</div>
                <div className="text-[10px] text-slate-400 -mt-0.5">Pagos y suscripciones</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title="Recargar"
            >
              <RefreshCw className={"w-3.5 h-3.5 " + (requests.isFetching ? "animate-spin" : "")} />
            </button>
            <button
              onClick={() => setLocation("/admin-cyberpiezas")}
              className="text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-slate-800"
            >
              Usuarios
            </button>
            <button
              onClick={() => setLocation("/sistemas")}
              className="text-xs sm:text-sm bg-white text-slate-900 rounded-full px-3 py-1.5 hover:bg-slate-100 font-semibold"
            >
              Mi Panel
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* HERO */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-[0.2em] mb-3">
            <DollarSign className="w-3 h-3" />
            <span>Administración de cobros</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
            Solicitudes de pago
          </h1>
          <p className="text-base text-slate-500">
            Revisa y aprueba las suscripciones que llegan de tus clientes
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="Pendientes"
            value={stats.data?.pendingCount ?? 0}
            icon={Clock}
            color="amber"
            highlight={(stats.data?.pendingCount ?? 0) > 0}
          />
          <StatCard
            label="Revenue del mes"
            value={`$${parseFloat(stats.data?.monthRevenue ?? "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Aprobadas (mes)"
            value={stats.data?.monthApprovedCount ?? 0}
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            label="Total del mes"
            value={stats.data?.monthRequestsCount ?? 0}
            icon={Calendar}
            color="purple"
          />
        </div>

        {/* TOOLBAR: Filtros + Búsqueda */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Filtros */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm overflow-x-auto">
            {([
              { key: "pending", label: "Pendientes", icon: Clock, color: "amber" },
              { key: "approved", label: "Aprobadas", icon: CheckCircle2, color: "emerald" },
              { key: "rejected", label: "Rechazadas", icon: XCircle, color: "rose" },
              { key: "all", label: "Todas", icon: Inbox, color: "slate" },
            ] as const).map((f) => {
              const Icon = f.icon;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={
                    "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap " +
                    (active
                      ? "bg-slate-900 text-white shadow"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, email o sistema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* LISTA */}
        {requests.isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
            <p className="text-sm">Cargando solicitudes...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {searchTerm ? "Sin resultados" : `Sin solicitudes ${filter === "pending" ? "pendientes" : filter}`}
            </h3>
            <p className="text-sm text-slate-500">
              {searchTerm
                ? "Intenta con otra búsqueda"
                : filter === "pending"
                ? "Cuando llegue una solicitud, aparecerá aquí"
                : "Cambia el filtro para ver otros estados"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {items.map((item: any) => (
              <RequestCard
                key={item.id}
                item={item}
                onView={() => setSelectedRequest(item)}
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
          onAction={() => {
            setSelectedRequest(null);
            utils.pagos.admin.listAll.invalidate();
            utils.pagos.admin.stats.invalidate();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: "amber" | "emerald" | "blue" | "purple" | "rose";
  highlight?: boolean;
}) {
  const colorMap = {
    amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
    blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
    rose: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200" },
  };
  const c = colorMap[color];
  return (
    <div
      className={
        "bg-white rounded-2xl p-4 border-2 transition-all " +
        (highlight ? c.border + " shadow-md" : "border-slate-200")
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + c.bg}>
          <Icon className={"w-4 h-4 " + c.text} />
        </div>
        {highlight && (
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// =============================================================================
// REQUEST CARD
// =============================================================================
function RequestCard({ item, onView }: { item: any; onView: () => void }) {
  const pos = POS_INFO[item.posCode] || { name: item.posCode, icon: "📦", color: "from-slate-500 to-slate-700" };
  const statusConfig = {
    pending: { label: "Pendiente", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
    approved: { label: "Aprobada", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
    rejected: { label: "Rechazada", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
    cancelled: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  };
  const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <button
      onClick={onView}
      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-sm flex-shrink-0 " +
            pos.color
          }
        >
          {pos.icon}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 truncate">
                {pos.name}
                <span className="text-slate-500 font-normal ml-1">
                  · {item.planType === "monthly" ? "Mensual" : "Anual"}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {item.customerName || item.customerEmail || "Cliente"}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-slate-900">
                ${parseFloat(item.finalAmount).toLocaleString("es-MX", { minimumFractionDigits: 0 })}
              </div>
              {item.discountApplied && (
                <div className="text-[10px] text-emerald-600 font-bold">
                  -{item.discountPercentage}%
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={
                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border " +
                status.bg +
                " " +
                status.text +
                " " +
                status.border
              }
            >
              {status.label}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(item.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
            </span>
            <span className="text-[10px] text-slate-400 ml-auto group-hover:text-slate-700 flex items-center gap-1">
              Ver <Eye className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// MODAL DE DETALLE
// =============================================================================
function RequestDetailModal({
  request,
  onClose,
  onAction,
}: {
  request: any;
  onClose: () => void;
  onAction: () => void;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);

  const pos = POS_INFO[request.posCode] || { name: request.posCode, icon: "📦", color: "from-slate-500 to-slate-700" };
  const method = METHOD_INFO[request.paymentMethod] || { label: request.paymentMethod, icon: "💰" };

  const approveMutation = trpc.pagos.admin.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Suscripción activada");
      setActionLoading(null);
      onAction();
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setActionLoading(null);
    },
  });

  const rejectMutation = trpc.pagos.admin.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      setActionLoading(null);
      onAction();
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setActionLoading(null);
    },
  });

  const handleApprove = () => {
    if (!confirm("¿Confirmar aprobación? Se activará la suscripción del cliente.")) return;
    setActionLoading("approve");
    approveMutation.mutate({ requestId: request.id, adminNotes: adminNotes || undefined });
  };

  const handleReject = () => {
    if (!adminNotes) {
      toast.error("Escribe el motivo del rechazo");
      return;
    }
    if (!confirm("¿Confirmar rechazo? Se notificará al cliente.")) return;
    setActionLoading("reject");
    rejectMutation.mutate({ requestId: request.id, adminNotes });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div
              className={
                "w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br shadow-sm " +
                pos.color
              }
            >
              {pos.icon}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {pos.name} {request.planType === "monthly" ? "Mensual" : "Anual"}
              </h2>
              <p className="text-xs text-slate-500">Solicitud #{request.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Cliente */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              👤 Cliente
            </h3>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              <div className="text-sm font-bold text-slate-900">
                {request.customerName || "Sin nombre"}
              </div>
              <div className="text-xs text-slate-600">{request.customerEmail}</div>
            </div>
          </section>

          {/* Monto */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              💵 Monto
            </h3>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-700">
                  ${parseFloat(request.finalAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-emerald-600 font-medium">MXN</span>
              </div>
              {request.discountApplied && (
                <div className="text-xs text-emerald-700 mt-1">
                  <span className="line-through opacity-60">
                    ${parseFloat(request.originalAmount).toLocaleString("es-MX")}
                  </span>{" "}
                  con descuento de {request.discountPercentage}%
                </div>
              )}
              <div className="text-xs text-emerald-700 mt-1">
                {method.icon} Pagado vía {method.label}
              </div>
            </div>
          </section>

          {/* Comprobante */}
          {request.proofUrl && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                📎 Comprobante
              </h3>
              <a
                href={request.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative rounded-xl overflow-hidden border-2 border-slate-200 hover:border-slate-400 transition-colors group"
              >
                <img
                  src={request.proofUrl}
                  alt="Comprobante"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-white text-slate-900 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" />
                    Ver completo
                  </span>
                </div>
              </a>
            </section>
          )}

          {/* Notas del cliente */}
          {request.customerNotes && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                💬 Notas del cliente
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900">
                {request.customerNotes}
              </div>
            </section>
          )}

          {/* Notas previas */}
          {request.adminNotes && request.status !== "pending" && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                📝 Tus notas
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 italic">
                {request.adminNotes}
              </div>
            </section>
          )}

          {/* Fecha */}
          <section className="text-xs text-slate-500 text-center">
            Recibida el{" "}
            {new Date(request.createdAt).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </section>

          {/* ACCIONES (solo si pending) */}
          {request.status === "pending" && (
            <>
              <div className="border-t border-slate-100 -mx-6 px-6 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  📝 Notas (opcional para aprobar / OBLIGATORIO para rechazar)
                </h3>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Comentarios para el cliente..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full h-11 font-semibold"
                >
                  {actionLoading === "reject" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1.5" /> Rechazar
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full h-11 font-semibold shadow-md"
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Aprobar y activar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {request.status !== "pending" && (
            <div className="bg-slate-100 rounded-xl p-3 text-center">
              <AlertCircle className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-600">
                Esta solicitud ya fue procesada el{" "}
                {request.reviewedAt
                  ? new Date(request.reviewedAt).toLocaleDateString("es-MX")
                  : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
