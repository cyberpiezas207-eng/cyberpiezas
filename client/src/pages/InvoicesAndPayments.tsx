import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatMoney(value?: string | number | null, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function downloadReceipt(payment: {
  id: number;
  planName: string | null;
  amount: string | number;
  currency: string | null;
  status: string;
  paymentProvider: string | null;
  externalReference: string | null;
  paidAt: Date | string | null;
  billingPeriodStart: Date | string | null;
  billingPeriodEnd: Date | string | null;
}) {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Recibo ${payment.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
        .wrap { max-width: 720px; margin: 0 auto; }
        h1 { margin-bottom: 8px; }
        .muted { color: #6b7280; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
        td:first-child { font-weight: 700; width: 40%; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>Recibo de pago</h1>
        <p class="muted">Boutique POS · comprobante generado desde el panel del cliente</p>
        <table>
          <tr><td>Folio</td><td>${payment.id}</td></tr>
          <tr><td>Plan</td><td>${payment.planName ?? "Plan"}</td></tr>
          <tr><td>Importe</td><td>${formatMoney(payment.amount, payment.currency ?? "MXN")}</td></tr>
          <tr><td>Estatus</td><td>${payment.status}</td></tr>
          <tr><td>Proveedor</td><td>${payment.paymentProvider ?? "manual_transfer"}</td></tr>
          <tr><td>Referencia</td><td>${payment.externalReference ?? "—"}</td></tr>
          <tr><td>Fecha de pago</td><td>${formatDate(payment.paidAt)}</td></tr>
          <tr><td>Periodo</td><td>${formatDate(payment.billingPeriodStart)} — ${formatDate(payment.billingPeriodEnd)}</td></tr>
        </table>
      </div>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `recibo-${payment.id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function InvoicesAndPayments() {
  const paymentHistory = trpc.paypal.getPaymentHistory.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-primary">Facturas e historial de pagos</h1>
          <p className="max-w-3xl text-muted-foreground">
            Revisa tus pagos aprobados, consulta periodos de vigencia y descarga un comprobante básico desde el sistema.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pagos registrados
            </CardTitle>
            <CardDescription>
              Historial cronológico de cobros validados para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando historial de pagos...
              </div>
            ) : (paymentHistory.data?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.data?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.id}</TableCell>
                        <TableCell>{formatDate(payment.paidAt ?? payment.createdAt)}</TableCell>
                        <TableCell>{payment.planName ?? "Plan"}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "succeeded" ? "default" : "outline"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatMoney(payment.amount, payment.currency ?? "MXN")}</TableCell>
                        <TableCell>
                          {formatDate(payment.billingPeriodStart)} — {formatDate(payment.billingPeriodEnd)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              downloadReceipt(payment);
                              toast.success("Recibo descargado");
                            }}
                          >
                            <Download className="h-4 w-4" />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no existen pagos validados para tu cuenta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
