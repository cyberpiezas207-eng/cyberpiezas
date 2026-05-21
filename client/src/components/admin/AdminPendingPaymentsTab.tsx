import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Receipt,
  AlertTriangle,
  Loader2,
  X as XIcon,
  Sparkles,
  RotateCcw,
  FilePlus,
  ArrowRight,
} from "lucide-react";
import { PROGRAMS } from "@/lib/adminPosCatalog";

// ============================================================================
// HELPERS LOCALES (presentacionales, no se usan en otros lados)
// ============================================================================

function getTimeAgo(dateStr: string | Date | undefined): string {
  if (!dateStr) return "-";
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return "Hace " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "Hace " + hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return "Hace " + days + "d";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function getUrgencyClass(dateStr: string | Date | undefined): string {
  if (!dateStr) return "text-slate-300";
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(date.getTime())) return "text-slate-300";
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hoursAgo >= 48) return "text-red-300 font-bold";
  if (hoursAgo >= 24) return "text-yellow-300 font-semibold";
  return "text-slate-300";
}

function getPosInfo(posCode: string) {
  const program = PROGRAMS.find((p) => p.code === posCode);
  return {
    name: program?.name ?? posCode,
    icon: program?.icon ?? "📦",
  };
}

function formatMoney(amount: string | number | undefined): string {
  if (amount === undefined || amount === null) return "$0";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "$0";
  return "$" + n.toLocaleString("es-MX");
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminPendingPaymentsTab() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Modal de aprobar: requestId seleccionado o null
  const [approveModalRequestId, setApproveModalRequestId] = useState<number | null>(null);
  // Modal de rechazar: requestId seleccionado o null
  const [rejectModalRequestId, setRejectModalRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pendingQuery = trpc.pagos.admin.listAll.useQuery({ status: "pending" });
  const pending = (pendingQuery.data ?? []) as any[];

  const invalidate = () => {
    utils.pagos.admin.listAll.invalidate();
    utils.personalOperations.listSubscribers.invalidate();
  };

  const approveMutation = trpc.pagos.admin.approve.useMutation({
    onSuccess: () => {
      toast.success("✓ Pago aprobado y suscripcion activada");
      setApproveModalRequestId(null);
      invalidate();
    },
    onError: (err) => {
      toast.error("Error al aprobar: " + err.message);
    },
  });

  const rejectMutation = trpc.pagos.admin.reject.useMutation({
    onSuccess: () => {
      toast.success("✓ Pago rechazado");
      setRejectModalRequestId(null);
      setRejectReason("");
      invalidate();
    },
    onError: (err) => {
      toast.error("Error al rechazar: " + err.message);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header con stats y link al panel completo */}
      <Card className="bg-gradient-to-r from-amber-900/30 via-orange-900/20 to-slate-900 border-amber-500/30 shadow-xl">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                  Pagos esperando revisión
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {pendingQuery.isLoading ? "..." : pending.length}{" "}
                  pendiente{pending.length === 1 ? "" : "s"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acción rápida: aprobar o rechazar. Para detalle completo abre /admin-pagos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => pendingQuery.refetch()}
                disabled={pendingQuery.isFetching}
                variant="outline"
                size="sm"
                className="border-slate-600 hover:bg-slate-800 text-slate-200"
              >
                <RefreshCw
                  className={
                    "w-3.5 h-3.5 mr-1.5 " +
                    (pendingQuery.isFetching ? "animate-spin" : "")
                  }
                />
                Refrescar
              </Button>
              <Button
                onClick={() => setLocation("/admin-pagos")}
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Ir al panel completo
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de solicitudes pending */}
      {pendingQuery.isLoading ? (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-12 pb-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Cargando solicitudes...
          </CardContent>
        </Card>
      ) : pending.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="text-lg font-bold text-white">Sin solicitudes pendientes</p>
            <p className="text-sm text-slate-400 mt-1">
              Cuando alguien registre un pago por transferencia, aparecera aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((item: any) => {
            const posInfo = getPosInfo(item.posCode);
            const urgencyClass = getUrgencyClass(item.createdAt);

            return (
              <Card
                key={item.id}
                className="bg-slate-800/60 border-slate-700 hover:border-amber-500/40 transition-all shadow-md"
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Icono del POS + tiempo */}
                    <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-center gap-3 sm:gap-1.5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl">
                        {posInfo.icon}
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Recibido
                        </div>
                        <div className={"text-xs " + urgencyClass}>
                          {getTimeAgo(item.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="text-lg font-bold text-white truncate">
                            {item.customerName || "Sin nombre"}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            {item.customerEmail || "Sin email"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <span className="text-lg font-bold text-emerald-300">
                            {formatMoney(item.finalAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        <span className="font-semibold">
                          {posInfo.name}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>
                          {item.planType === "monthly" ? "Plan mensual" : "Plan anual"}
                        </span>
                        {item.discountApplied && (
                          <>
                            <span className="text-slate-500">•</span>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40 text-[10px]">
                              -{item.discountPercentage}% descuento
                            </Badge>
                          </>
                        )}
                      </div>

                      {item.customerNotes && (
                        <div className="text-xs text-slate-400 italic bg-slate-900/40 rounded-lg p-2 border border-slate-700">
                          "{item.customerNotes}"
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {item.proofUrl && (
                          <Button
                            onClick={() => window.open(item.proofUrl, "_blank")}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-700 text-slate-200 gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Ver comprobante
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Button>
                        )}
                        <Button
                          onClick={() => setApproveModalRequestId(item.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => {
                            setRejectModalRequestId(item.id);
                            setRejectReason("");
                          }}
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-200 hover:bg-red-500/20 gap-1.5 font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de aprobar (con preview) */}
      {approveModalRequestId !== null && (
        <ApprovePaymentDialog
          requestId={approveModalRequestId}
          isLoading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate({ requestId: approveModalRequestId })}
          onClose={() => setApproveModalRequestId(null)}
        />
      )}

      {/* Modal de rechazar (con motivo obligatorio) */}
      {rejectModalRequestId !== null && (
        <RejectPaymentDialog
          isLoading={rejectMutation.isPending}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={() => {
            if (rejectReason.trim().length < 1) return;
            rejectMutation.mutate({
              requestId: rejectModalRequestId,
              adminNotes: rejectReason.trim(),
            });
          }}
          onClose={() => {
            setRejectModalRequestId(null);
            setRejectReason("");
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL: Aprobar pago (con preview de escenario)
// ============================================================================

function ApprovePaymentDialog({
  requestId,
  isLoading,
  onConfirm,
  onClose,
}: {
  requestId: number;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const previewQuery = trpc.pagos.admin.previewApproval.useQuery({ requestId });
  const preview = previewQuery.data;

  let scenarioIcon = <FilePlus className="w-5 h-5 text-emerald-600" />;
  let scenarioLabel = "Crear nueva";
  let scenarioColor = "bg-emerald-100 text-emerald-700 border-emerald-300";

  if (preview?.scenario === "renewal") {
    scenarioIcon = <RotateCcw className="w-5 h-5 text-blue-600" />;
    scenarioLabel = "Renovar";
    scenarioColor = "bg-blue-100 text-blue-700 border-blue-300";
  } else if (preview?.scenario === "reactivation") {
    scenarioIcon = <Sparkles className="w-5 h-5 text-purple-600" />;
    scenarioLabel = "Reactivar";
    scenarioColor = "bg-purple-100 text-purple-700 border-purple-300";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-5 relative">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <XIcon className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Aprobar pago
              </p>
              <h2 className="text-xl font-bold text-white">Confirmar accion</h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {previewQuery.isLoading ? (
            <div className="text-center py-6 text-slate-500">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
              Calculando vista previa...
            </div>
          ) : previewQuery.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {previewQuery.error.message || "No se pudo calcular preview"}
            </div>
          ) : preview ? (
            <>
              <div className={"rounded-xl border-2 p-3 " + scenarioColor}>
                <div className="flex items-center gap-2 mb-1">
                  {scenarioIcon}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Escenario: {scenarioLabel}
                  </span>
                </div>
                <p className="text-sm">{preview.message}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">POS</span>
                  <span className="font-semibold text-slate-900">{preview.posCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-900">
                    {preview.planType === "monthly" ? "Mensual" : "Anual"}
                  </span>
                </div>
                {preview.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vence actual</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(preview.currentPeriodEnd).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="text-slate-500">Vencera el</span>
                  <span className="font-bold text-emerald-700">
                    {new Date(preview.futurePeriodEnd).toLocaleDateString("es-MX")}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-white flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full h-11 border-slate-300 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || previewQuery.isLoading || !!previewQuery.error}
            className="flex-1 rounded-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Aprobando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Aprobar pago
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: Rechazar pago (con motivo obligatorio)
// ============================================================================

function RejectPaymentDialog({
  isLoading,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  isLoading: boolean;
  reason: string;
  onReasonChange: (s: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const canSubmit = reason.trim().length >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-br from-red-600 to-rose-600 px-6 py-5 relative">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <XIcon className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Rechazar pago
              </p>
              <h2 className="text-xl font-bold text-white">Motivo del rechazo</h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-600">
            El motivo se guarda en el historial. El cliente podra verlo al revisar su pago.
          </p>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={isLoading}
            placeholder="Ej: Comprobante no legible, monto incorrecto, transferencia no recibida..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-slate-400 disabled:opacity-50"
            maxLength={500}
            autoFocus
          />
          <p className="text-[10px] text-slate-400">
            {reason.trim().length} / 500 caracteres
          </p>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-white flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full h-11 border-slate-300 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canSubmit || isLoading}
            className="flex-1 rounded-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1.5" />
                Rechazar pago
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
