import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TrialExpiringNotification } from "@/components/TrialExpiringNotification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Share2,
} from "lucide-react";

// Datos de ejemplo - En producción vendrían de la BD
const mockSubscriptions = [
  {
    id: 1,
    plan: "Pro",
    price: 599,
    status: "active",
    startDate: "2026-03-15",
    renewalDate: "2026-05-15",
    referralCode: "DEIVID2024",
    referrals: 2,
  },
];

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  active: { color: "bg-green-100 text-green-800", label: "Activa", icon: <CheckCircle className="h-4 w-4" /> },
  trialing: { color: "bg-blue-100 text-blue-800", label: "En prueba", icon: <Clock className="h-4 w-4" /> },
  pending: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente", icon: <AlertCircle className="h-4 w-4" /> },
  canceled: { color: "bg-red-100 text-red-800", label: "Cancelada", icon: <AlertCircle className="h-4 w-4" /> },
};

export function SubscriptionPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Notificación de prueba gratis */}
        <TrialExpiringNotification
          trialStartDate={mockSubscriptions[0]?.startDate}
          trialDays={30}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mi Suscripción</h1>
          <p className="text-slate-600">Gestiona tu plan, renovaciones y referidos</p>
        </div>

        {/* Suscripción Activa */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {mockSubscriptions.map((sub) => (
            <Card key={sub.id} className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plan {sub.plan}</CardTitle>
                    <CardDescription>Suscripción mensual</CardDescription>
                  </div>
                  <Badge className={statusConfig[sub.status].color}>
                    {statusConfig[sub.status].icon}
                    <span className="ml-1">{statusConfig[sub.status].label}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-600">Precio mensual</p>
                    <p className="text-2xl font-bold text-purple-600">${sub.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Próxima renovación</p>
                    <p className="text-lg font-semibold">{formatDate(sub.renewalDate)}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm text-slate-600">Fecha de inicio</p>
                  <p className="text-sm">{formatDate(sub.startDate)}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/pricing")}
                    className="flex-1"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Cambiar plan
                  </Button>
                  <Button variant="ghost" className="flex-1">
                    Cancelar suscripción
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Referidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-600" />
                Referidos
              </CardTitle>
              <CardDescription>Gana 1 mes gratis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {mockSubscriptions[0].referrals}
                </p>
                <p className="text-sm text-slate-600">Referidos exitosos</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Tu código:</p>
                <div className="flex items-center gap-2 bg-slate-100 p-2 rounded border">
                  <code className="text-sm font-mono flex-1">
                    {mockSubscriptions[0].referralCode}
                  </code>
                  <button
                    onClick={() => handleCopyReferralCode(mockSubscriptions[0].referralCode)}
                    className="p-1 hover:bg-slate-200 rounded text-sm"
                  >
                    {copied === mockSubscriptions[0].referralCode ? "✓" : "Copiar"}
                  </button>
                </div>
              </div>

              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => setLocation("/referrals")}
              >
                Ver panel de referidos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Historial de pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>15 de abril, 2026</TableCell>
                  <TableCell>Plan Pro - Mes 2</TableCell>
                  <TableCell>$599</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">Pagado</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>15 de marzo, 2026</TableCell>
                  <TableCell>Plan Pro - Mes 1 (Prueba)</TableCell>
                  <TableCell>$0</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">Prueba gratis</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Información de Pago */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Información de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-blue-900">
                <strong>Método de pago:</strong> Transferencia bancaria
              </p>
              <p className="text-sm text-blue-900">
                Recibirás un recordatorio 3 días antes de tu próxima renovación con los datos para transferir.
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Actualizar método de pago
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SubscriptionPanel;
