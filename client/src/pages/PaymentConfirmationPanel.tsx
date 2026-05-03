import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PaymentRequest {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  transferProof?: string;
  requestedAt: Date;
  confirmedAt?: Date;
  notes?: string;
}

// Mock data - en producción vendrá de la API
const mockPayments: PaymentRequest[] = [
  {
    id: "PAY001",
    userId: 1,
    userName: "Juan García",
    userEmail: "juan@example.com",
    planName: "Pro",
    amount: 599,
    status: "pending",
    transferProof: "Comprobante adjunto",
    requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PAY002",
    userId: 2,
    userName: "María López",
    userEmail: "maria@example.com",
    planName: "Business",
    amount: 999,
    status: "confirmed",
    transferProof: "Comprobante adjunto",
    requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    confirmedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PAY003",
    userId: 3,
    userName: "Carlos Rodríguez",
    userEmail: "carlos@example.com",
    planName: "Básico",
    amount: 299,
    status: "pending",
    transferProof: "Comprobante adjunto",
    requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

export default function PaymentConfirmationPanel() {
  const [payments, setPayments] = useState<PaymentRequest[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "rejected">("all");

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleConfirmPayment = (id: string) => {
    setPayments(
      payments.map((p) =>
        p.id === id
          ? { ...p, status: "confirmed" as const, confirmedAt: new Date() }
          : p
      )
    );
  };

  const handleRejectPayment = (id: string) => {
    setPayments(
      payments.map((p) =>
        p.id === id
          ? { ...p, status: "rejected" as const }
          : p
      )
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
    }
  };

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const confirmedCount = payments.filter((p) => p.status === "confirmed").length;
  const rejectedCount = payments.filter((p) => p.status === "rejected").length;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Confirmación de Pagos</h1>
        <p className="text-slate-600 mt-2">Revisa y confirma los pagos por transferencia bancaria</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Rechazados</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o ID de pago..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "confirmed", "rejected"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                onClick={() => setFilterStatus(status as any)}
                size="sm"
              >
                {status === "all" && "Todos"}
                {status === "pending" && "Pendientes"}
                {status === "confirmed" && "Confirmados"}
                {status === "rejected" && "Rechazados"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de pagos */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-600">No hay pagos que coincidan con los filtros</p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(payment.status)}
                      <div>
                        <h3 className="font-semibold text-slate-900">{payment.userName}</h3>
                        <p className="text-sm text-slate-600">{payment.userEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-600 uppercase">ID Pago</p>
                        <p className="font-mono text-sm font-semibold">{payment.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase">Plan</p>
                        <p className="font-semibold">{payment.planName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase">Monto</p>
                        <p className="font-semibold text-green-600">MX${payment.amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase">Solicitado</p>
                        <p className="text-sm">
                          {payment.requestedAt.toLocaleDateString("es-MX")}
                        </p>
                      </div>
                    </div>

                    {payment.confirmedAt && (
                      <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                        ✓ Confirmado el {payment.confirmedAt.toLocaleDateString("es-MX")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {getStatusBadge(payment.status)}

                    {payment.status === "pending" && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirmPayment(payment.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectPayment(payment.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
