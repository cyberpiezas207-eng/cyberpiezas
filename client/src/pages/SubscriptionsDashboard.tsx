import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Layers3,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";

type SubscriptionPlan = "Básica" | "Normal" | "Premium";
type SubscriptionStatus = "active" | "expired" | "pending" | "past_due";
type BillingCycle = "Mensual" | "Anual";

type ProgramCode = "boutique" | "abarrotes" | "celine";

interface ProgramSubscription {
  id: string;
  programCode: ProgramCode;
  programName: string;
  pointName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  subscriptionDate: string;
  nextPaymentDate: string;
  monthlyEquivalent: number;
  nextChargeAmount: number;
  transactions: number;
  revenue: number;
  activeUsers: number;
}

const mockSubscriptions: ProgramSubscription[] = [
  {
    id: "sub-001",
    programCode: "boutique",
    programName: "Boutique POS",
    pointName: "Centro",
    plan: "Premium",
    status: "active",
    billingCycle: "Mensual",
    subscriptionDate: "2026-01-15",
    nextPaymentDate: "2026-05-15",
    monthlyEquivalent: 250,
    nextChargeAmount: 250,
    transactions: 1240,
    revenue: 45800,
    activeUsers: 12,
  },
  {
    id: "sub-002",
    programCode: "boutique",
    programName: "Boutique POS",
    pointName: "Sucursal Norte",
    plan: "Normal",
    status: "active",
    billingCycle: "Mensual",
    subscriptionDate: "2026-02-01",
    nextPaymentDate: "2026-05-01",
    monthlyEquivalent: 189,
    nextChargeAmount: 189,
    transactions: 680,
    revenue: 28500,
    activeUsers: 8,
  },
  {
    id: "sub-003",
    programCode: "abarrotes",
    programName: "Abarrotes POS",
    pointName: "Principal",
    plan: "Básica",
    status: "pending",
    billingCycle: "Mensual",
    subscriptionDate: "2026-03-10",
    nextPaymentDate: "2026-05-10",
    monthlyEquivalent: 100,
    nextChargeAmount: 100,
    transactions: 320,
    revenue: 12400,
    activeUsers: 4,
  },
  {
    id: "sub-004",
    programCode: "celine",
    programName: "CELINE",
    pointName: "Compra de PC",
    plan: "Normal",
    status: "active",
    billingCycle: "Anual",
    subscriptionDate: "2026-01-20",
    nextPaymentDate: "2027-01-20",
    monthlyEquivalent: 158,
    nextChargeAmount: 1900,
    transactions: 450,
    revenue: 18900,
    activeUsers: 6,
  },
  {
    id: "sub-005",
    programCode: "boutique",
    programName: "Boutique POS",
    pointName: "Outlet Morelos",
    plan: "Básica",
    status: "past_due",
    billingCycle: "Mensual",
    subscriptionDate: "2026-02-25",
    nextPaymentDate: "2026-04-30",
    monthlyEquivalent: 100,
    nextChargeAmount: 100,
    transactions: 210,
    revenue: 8600,
    activeUsers: 3,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "Activo";
    case "expired":
      return "Vencido";
    case "pending":
      return "Pendiente";
    case "past_due":
      return "Próximo a vencer";
    default:
      return status;
  }
}

function getStatusColor(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "expired":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "past_due":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function getStatusIcon(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return <CheckCircle className="h-4 w-4" />;
    case "expired":
      return <AlertCircle className="h-4 w-4" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "past_due":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

export function SubscriptionsDashboard() {
  const [, setLocation] = useLocation();
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<ProgramSubscription | null>(null);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [newPlan, setNewPlan] = useState<string>("");

  const filteredSubscriptions = useMemo(() => {
    return mockSubscriptions.filter((item) => {
      const matchesProgram = filterProgram === "all" || item.programCode === filterProgram;
      const matchesPlan = filterPlan === "all" || item.plan === filterPlan;
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      return matchesProgram && matchesPlan && matchesStatus;
    });
  }, [filterPlan, filterProgram, filterStatus]);

  const activeCount = filteredSubscriptions.filter((item) => item.status === "active").length;
  const totalMonthlyEquivalent = filteredSubscriptions.reduce((sum, item) => sum + item.monthlyEquivalent, 0);
  const totalRevenue = filteredSubscriptions.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = filteredSubscriptions.reduce((sum, item) => sum + item.transactions, 0);
  const uniquePrograms = new Set(filteredSubscriptions.map((item) => item.programCode)).size;

  const handleChangePlan = () => {
    if (!selectedSubscription || !newPlan) return;
    alert(
      `La suscripción de ${selectedSubscription.programName} - ${selectedSubscription.pointName} cambiaría a ${newPlan}.`
    );
    setShowChangePlanDialog(false);
    setNewPlan("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/cyberpiezas")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Suscripciones por Programa</h1>
          <p className="text-slate-600">
            Cada sistema mantiene su propia suscripción. Puedes revisar por separado qué plan tiene Boutique POS, Abarrotes POS o CELINE en cada punto de venta.
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Suscripciones activas</p>
                  <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Programas cobrables</p>
                  <p className="text-3xl font-bold text-slate-900">{uniquePrograms}</p>
                </div>
                <Layers3 className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Mensual estimado</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalMonthlyEquivalent)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Transacciones</p>
                  <p className="text-3xl font-bold text-slate-900">{totalTransactions.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Ingresos operados</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="mb-2 block">Programa</Label>
                <Select value={filterProgram} onValueChange={setFilterProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los programas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los programas</SelectItem>
                    <SelectItem value="boutique">Boutique POS</SelectItem>
                    <SelectItem value="abarrotes">Abarrotes POS</SelectItem>
                    <SelectItem value="celine">CELINE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Plan</Label>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los planes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    <SelectItem value="Básica">Básica</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="past_due">Próximo a vencer</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterProgram("all");
                    setFilterPlan("all");
                    setFilterStatus("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suscripciones independientes ({filteredSubscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Programa</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Punto de venta</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Cobro</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Próxima renovación</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Monto</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition hover:bg-slate-50"
                      onClick={() => setSelectedSubscription(item)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.programName}</p>
                          <p className="text-sm text-slate-500">ID {item.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.pointName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.billingCycle}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {new Date(item.nextPaymentDate).toLocaleDateString("es-MX")}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(item.nextChargeAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedSubscription(item);
                              setNewPlan(item.plan);
                              setShowChangePlanDialog(true);
                            }}
                          >
                            Cambiar plan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              alert(`Renovar ${item.programName} - ${item.pointName}`);
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Renovar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredSubscriptions.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No hay suscripciones que coincidan con los filtros seleccionados.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {selectedSubscription ? (
        <Dialog open={Boolean(selectedSubscription)} onOpenChange={() => setSelectedSubscription(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedSubscription.programName} · {selectedSubscription.pointName}
              </DialogTitle>
              <DialogDescription>
                Esta vista muestra la suscripción independiente del programa seleccionado, separada de los demás sistemas.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de licencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between gap-4"><span>Programa</span><strong>{selectedSubscription.programName}</strong></div>
                  <div className="flex justify-between gap-4"><span>Punto de venta</span><strong>{selectedSubscription.pointName}</strong></div>
                  <div className="flex justify-between gap-4"><span>Plan</span><strong>{selectedSubscription.plan}</strong></div>
                  <div className="flex justify-between gap-4"><span>Ciclo</span><strong>{selectedSubscription.billingCycle}</strong></div>
                  <div className="flex justify-between gap-4"><span>Inicio</span><strong>{new Date(selectedSubscription.subscriptionDate).toLocaleDateString("es-MX")}</strong></div>
                  <div className="flex justify-between gap-4"><span>Próximo cobro</span><strong>{new Date(selectedSubscription.nextPaymentDate).toLocaleDateString("es-MX")}</strong></div>
                  <div className="flex justify-between gap-4"><span>Cobro siguiente</span><strong>{formatCurrency(selectedSubscription.nextChargeAmount)}</strong></div>
                  <div className="flex justify-between gap-4"><span>Equivalente mensual</span><strong>{formatCurrency(selectedSubscription.monthlyEquivalent)}</strong></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Uso ligado a esta suscripción</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-slate-600">Transacciones</p>
                      <p className="text-2xl font-bold text-blue-700">{selectedSubscription.transactions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <p className="text-sm text-slate-600">Ingresos</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedSubscription.revenue)}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-4">
                      <p className="text-sm text-slate-600">Usuarios activos</p>
                      <p className="text-2xl font-bold text-violet-700">{selectedSubscription.activeUsers}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Si cambias este plan, solo se afecta <strong>{selectedSubscription.programName}</strong> en <strong>{selectedSubscription.pointName}</strong>. Los demás programas conservan su propia suscripción.
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {showChangePlanDialog && selectedSubscription ? (
        <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar plan por programa</DialogTitle>
              <DialogDescription>
                Selecciona el nuevo plan para {selectedSubscription.programName} en {selectedSubscription.pointName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Nuevo plan</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básica">Básica - $100/mes</SelectItem>
                    <SelectItem value="Normal">Normal - $189/mes</SelectItem>
                    <SelectItem value="Premium">Premium - $250/mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
                Este cambio impactaría únicamente la suscripción de <strong>{selectedSubscription.programName}</strong> en <strong>{selectedSubscription.pointName}</strong>.
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowChangePlanDialog(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleChangePlan}>
                  Confirmar cambio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export default SubscriptionsDashboard;
