import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2, Eye, Download } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function AdminPaymentReview() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: pendingRequests, isLoading, refetch } = trpc.paypal.getPendingTransferRequests.useQuery();
  const approveMutation = trpc.paypal.approveTransferRequest.useMutation();
  const rejectMutation = trpc.paypal.rejectTransferRequest.useMutation();

  // Verificar que el usuario es admin
  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-semibold text-foreground">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Solo los administradores pueden acceder a este panel de revisión de pagos.
          </p>
        </div>
      </div>
    );
  }

  const handleApprove = async (requestId: number) => {
    try {
      await approveMutation.mutateAsync({ requestId });
      toast.success("Pago aprobado y suscripción activada.");
      refetch();
      setSelectedRequest(null);
    } catch (error) {
      console.error(error);
      toast.error("No fue posible aprobar el pago.");
    }
  };

  const handleReject = async (requestId: number) => {
    if (!rejectReason.trim()) {
      toast.error("Ingresa un motivo para rechazar el pago.");
      return;
    }

    setIsRejecting(true);
    try {
      await rejectMutation.mutateAsync({
        requestId,
        reason: rejectReason,
      });
      toast.success("Pago rechazado. Se notificó al usuario.");
      refetch();
      setSelectedRequest(null);
      setRejectReason("");
    } catch (error) {
      console.error(error);
      toast.error("No fue posible rechazar el pago.");
    } finally {
      setIsRejecting(false);
    }
  };

  const currentRequest = pendingRequests?.find((item) => item.request.id === selectedRequest)?.request;
  const currentUser = pendingRequests?.find((item) => item.request.id === selectedRequest)?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Panel de Revisión de Pagos</h1>
        <p className="mt-2 text-muted-foreground">
          Revisa y aprueba solicitudes de pago por transferencia para activar suscripciones.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !pendingRequests || pendingRequests.length === 0 ? (
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Sin solicitudes pendientes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Todas las solicitudes de pago han sido procesadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((item) => (
            <Card key={item.request.id} className="border-border/60 bg-card/80 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-foreground">
                      {item.user.name || "Usuario sin nombre"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{item.user.email}</p>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-700">Pendiente</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Plan
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{item.request.planName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Monto
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      ${item.request.amount} {item.request.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Referencia
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{item.request.transferReference}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Titular
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{item.request.payerName}</p>
                  </div>
                </div>

                {item.request.notes && (
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Notas
                    </p>
                    <p className="mt-2 text-sm text-foreground">{item.request.notes}</p>
                  </div>
                )}

                {item.request.proofUrl && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <a
                      href={item.request.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Ver comprobante
                    </a>
                    <a
                      href={item.request.proofUrl}
                      download
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      Descargar
                    </a>
                  </div>
                )}

                <div className="flex gap-2 pt-2 sm:flex-row">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(item.request.id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(item.request.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rechazar solicitud de pago</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{currentUser?.name}</span> solicitó el plan{" "}
                <span className="font-medium text-foreground">{currentRequest?.planName}</span> por{" "}
                <span className="font-medium text-foreground">
                  ${currentRequest?.amount} {currentRequest?.currency}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Motivo del rechazo</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. Comprobante ilegible, monto incorrecto, datos no coinciden..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setRejectReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleReject(selectedRequest!)}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
