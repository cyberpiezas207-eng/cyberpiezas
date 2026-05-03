import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Download,
  DollarSign,
  Layers3,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

type ProgramCode = "boutique" | "abarrotes" | "celine";

interface ProgramUsageReport {
  id: string;
  programCode: ProgramCode;
  programName: string;
  subscriptionLabel: string;
  transactions: number;
  revenue: number;
  activeUsers: number;
  productsSold: number;
  averageTicket: number;
  monthlyData: Array<{
    month: string;
    transactions: number;
    revenue: number;
    activeUsers: number;
  }>;
}

const mockReports: ProgramUsageReport[] = [
  {
    id: "usage-001",
    programCode: "boutique",
    programName: "Boutique POS",
    subscriptionLabel: "Centro · Premium",
    transactions: 1240,
    revenue: 45800,
    activeUsers: 12,
    productsSold: 3420,
    averageTicket: 36.9,
    monthlyData: [
      { month: "Ene", transactions: 280, revenue: 9800, activeUsers: 8 },
      { month: "Feb", transactions: 310, revenue: 11200, activeUsers: 10 },
      { month: "Mar", transactions: 320, revenue: 12400, activeUsers: 11 },
      { month: "Abr", transactions: 330, revenue: 12400, activeUsers: 12 },
    ],
  },
  {
    id: "usage-002",
    programCode: "boutique",
    programName: "Boutique POS",
    subscriptionLabel: "Sucursal Norte · Normal",
    transactions: 680,
    revenue: 28500,
    activeUsers: 8,
    productsSold: 1890,
    averageTicket: 41.9,
    monthlyData: [
      { month: "Ene", transactions: 140, revenue: 6200, activeUsers: 5 },
      { month: "Feb", transactions: 160, revenue: 6800, activeUsers: 6 },
      { month: "Mar", transactions: 190, revenue: 7900, activeUsers: 7 },
      { month: "Abr", transactions: 190, revenue: 7600, activeUsers: 8 },
    ],
  },
  {
    id: "usage-003",
    programCode: "abarrotes",
    programName: "Abarrotes POS",
    subscriptionLabel: "Principal · Básica",
    transactions: 320,
    revenue: 12400,
    activeUsers: 4,
    productsSold: 890,
    averageTicket: 38.75,
    monthlyData: [
      { month: "Ene", transactions: 60, revenue: 2400, activeUsers: 2 },
      { month: "Feb", transactions: 70, revenue: 2800, activeUsers: 3 },
      { month: "Mar", transactions: 95, revenue: 3600, activeUsers: 3 },
      { month: "Abr", transactions: 95, revenue: 3600, activeUsers: 4 },
    ],
  },
  {
    id: "usage-004",
    programCode: "celine",
    programName: "CELINE",
    subscriptionLabel: "Compra de PC · Normal",
    transactions: 450,
    revenue: 18900,
    activeUsers: 6,
    productsSold: 240,
    averageTicket: 42,
    monthlyData: [
      { month: "Ene", transactions: 100, revenue: 4200, activeUsers: 4 },
      { month: "Feb", transactions: 110, revenue: 4600, activeUsers: 5 },
      { month: "Mar", transactions: 120, revenue: 5100, activeUsers: 5 },
      { month: "Abr", transactions: 120, revenue: 5000, activeUsers: 6 },
    ],
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function UsageReports() {
  const [, setLocation] = useLocation();
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");

  const programFilteredReports = useMemo(() => {
    if (selectedProgram === "all") return mockReports;
    return mockReports.filter((item) => item.programCode === selectedProgram);
  }, [selectedProgram]);

  const availableSubscriptions = useMemo(() => {
    return programFilteredReports.map((item) => ({ id: item.id, label: `${item.programName} · ${item.subscriptionLabel}` }));
  }, [programFilteredReports]);

  const filteredReports = useMemo(() => {
    if (selectedSubscription === "all") return programFilteredReports;
    return programFilteredReports.filter((item) => item.id === selectedSubscription);
  }, [programFilteredReports, selectedSubscription]);

  const totalTransactions = filteredReports.reduce((sum, item) => sum + item.transactions, 0);
  const totalRevenue = filteredReports.reduce((sum, item) => sum + item.revenue, 0);
  const totalUsers = filteredReports.reduce((sum, item) => sum + item.activeUsers, 0);
  const totalProducts = filteredReports.reduce((sum, item) => sum + item.productsSold, 0);
  const totalSubscriptions = filteredReports.length;

  const comparisonData = filteredReports.map((item) => ({
    name: `${item.programName}\n${item.subscriptionLabel.split(" · ")[0]}`,
    transactions: item.transactions,
    revenue: item.revenue / 1000,
  }));

  const trendData = filteredReports[0]?.monthlyData ?? [];

  const distributionData = filteredReports.map((item) => ({
    name: `${item.programName} · ${item.subscriptionLabel.split(" · ")[0]}`,
    value: item.revenue,
  }));

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/cyberpiezas")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Reportes por Programa</h1>
          <p className="text-slate-600">
            Aquí puedes revisar el uso por cada suscripción independiente. Cada programa conserva sus propias métricas, renovaciones y comportamiento operativo.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="mb-2 block">Programa</Label>
                <Select value={selectedProgram} onValueChange={(value) => {
                  setSelectedProgram(value);
                  setSelectedSubscription("all");
                }}>
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
                <Label className="mb-2 block">Suscripción</Label>
                <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las suscripciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las suscripciones</SelectItem>
                    {availableSubscriptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Período</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                    <SelectItem value="quarter">Último trimestre</SelectItem>
                    <SelectItem value="year">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={() => alert("Exportar reporte por programa") }>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-6 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Suscripciones analizadas</p>
                  <p className="text-3xl font-bold text-slate-900">{totalSubscriptions}</p>
                </div>
                <Layers3 className="h-8 w-8 text-indigo-600" />
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
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Ingresos</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Usuarios activos</p>
                  <p className="text-3xl font-bold text-slate-900">{totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-violet-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Productos vendidos</p>
                  <p className="text-3xl font-bold text-slate-900">{totalProducts.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Comparación entre suscripciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="transactions" fill="#3b82f6" name="Transacciones" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Ingresos (miles)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {trendData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tendencia mensual de la suscripción seleccionada</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="transactions" stroke="#8b5cf6" name="Transacciones" />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Ingresos" />
                    <Line type="monotone" dataKey="activeUsers" stroke="#f59e0b" name="Usuarios activos" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Distribución de ingresos por suscripción</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalle de uso por suscripción independiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Programa</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Suscripción</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Transacciones</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ingresos</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuarios</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Productos</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ticket promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.programName}</td>
                      <td className="px-4 py-3 text-slate-700">{item.subscriptionLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{item.transactions.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(item.revenue)}</td>
                      <td className="px-4 py-3 text-slate-700">{item.activeUsers}</td>
                      <td className="px-4 py-3 text-slate-700">{item.productsSold.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(item.averageTicket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default UsageReports;
