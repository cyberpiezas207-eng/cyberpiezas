import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Boxes,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Zap,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#9333ea", "#f97316", "#10b981", "#3b82f6", "#f59e0b"];

function EmptyChartState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 px-6 text-center">
      <div className="mb-4 rounded-full bg-primary/15 p-4 text-primary animate-bounce-gentle">
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  color = "primary",
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string | number;
  description: string;
  trend?: number;
  color?: "primary" | "accent" | "green" | "blue";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-accent/5 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className={`rounded-lg p-2.5 ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          {trend !== undefined && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [noMovementDays, setNoMovementDays] = useState(30);

  const todayStats = trpc.dashboard.todayStats.useQuery();
  const planUsage = trpc.dashboard.planUsage.useQuery();
  const topProducts = trpc.dashboard.topProducts.useQuery({ limit: 5 });
  const lowStockAlerts = trpc.dashboard.lowStockAlerts.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Analytics queries
  const topProductsMonth = trpc.dashboard.topProductsMonth.useQuery({ limit: 5 });
  const salesByVariant = trpc.dashboard.salesByVariant.useQuery({ days: 30 });
  const productsWithoutMovement = trpc.dashboard.productsWithoutMovement.useQuery({ days: noMovementDays });
  const periodComparison = trpc.dashboard.periodComparison.useQuery();
  const returnsOfMonth = trpc.dashboard.returnsOfMonth.useQuery();

  const totalRevenue = Number.parseFloat(todayStats.data?.totalRevenue || "0");
  const totalSales = todayStats.data?.totalSales || 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const cmp = periodComparison.data;
  const weekPct = cmp ? pctChange(cmp.thisWeek, cmp.lastWeek) : 0;
  const monthPct = cmp ? pctChange(cmp.thisMonth, cmp.lastMonth) : 0;
  const weekRevPct = cmp ? pctChange(cmp.thisWeekRevenue, cmp.lastWeekRevenue) : 0;
  const monthRevPct = cmp ? pctChange(cmp.thisMonthRevenue, cmp.lastMonthRevenue) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-purple-800/40 bg-slate-900 p-8 md:p-12 shadow-lg">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-700/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900/30 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Centro de control
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-white">Dashboard operativo</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/90">
                Bienvenido, <span className="font-semibold">{user?.name}</span>. Aquí tienes una vista rápida de ventas, uso del plan y alertas críticas.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg hover:bg-white/15 transition-all">
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">Ventas hoy</p>
                <p className="mt-2 text-3xl font-bold text-white">{totalSales}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg hover:bg-white/15 transition-all">
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">Ingresos</p>
                <p className="mt-2 text-3xl font-bold text-white">${totalRevenue.toFixed(0)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg hover:bg-white/15 transition-all sm:col-span-1 col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">Ticket promedio</p>
                <p className="mt-2 text-3xl font-bold text-white">${averageTicket.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            icon={ShoppingCart}
            label="Ventas del día"
            value={totalSales}
            description={`${todayStats.data?.totalItems || 0} artículos vendidos`}
            color="primary"
          />
          <StatCard
            icon={DollarSign}
            label="Ingresos diarios"
            value={`$${totalRevenue.toFixed(2)}`}
            description="Total acumulado hoy"
            color="accent"
          />
          <StatCard
            icon={BarChart3}
            label="Promedio por venta"
            value={`$${averageTicket.toFixed(2)}`}
            description="Ritmo comercial"
            color="blue"
          />
        </div>

        {/* Plan Usage */}
        {planUsage.data ? (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-primary">Uso de productos</CardTitle>
                    <CardDescription className="mt-1">
                      {planUsage.data.limits.products === null
                        ? `${planUsage.data.usage.products} productos activos`
                        : `${planUsage.data.usage.products} de ${planUsage.data.limits.products}`}
                    </CardDescription>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{
                      width: `${planUsage.data.limits.products === null ? 100 : Math.min(100, (planUsage.data.usage.products / Math.max(planUsage.data.limits.products, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Controla si estás cerca del límite de tu plan</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-primary">Uso de sucursales</CardTitle>
                    <CardDescription className="mt-1">
                      {planUsage.data.limits.branches === null
                        ? "Sin límite"
                        : `${planUsage.data.usage.branches} de ${planUsage.data.limits.branches}`}
                    </CardDescription>
                  </div>
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                    style={{
                      width: `${planUsage.data.limits.branches === null ? 100 : Math.min(100, (planUsage.data.usage.branches / Math.max(planUsage.data.limits.branches, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Anticipa cuándo ampliar capacidad</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-primary">Ventas del mes</CardTitle>
                    <CardDescription className="mt-1">
                      {planUsage.data.limits.monthlySales === null
                        ? "Sin límite"
                        : `${planUsage.data.usage.monthlySales} de ${planUsage.data.limits.monthlySales}`}
                    </CardDescription>
                  </div>
                  <div className="rounded-lg bg-blue-100 p-2.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500"
                    style={{
                      width: `${planUsage.data.limits.monthlySales === null ? 100 : Math.min(100, (planUsage.data.usage.monthlySales / Math.max(planUsage.data.limits.monthlySales, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Alerta temprana de límites</p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {/* Low Stock Alert */}
        {user?.role === "admin" && lowStockAlerts.data && lowStockAlerts.data.length > 0 && (
          <Alert className="border-destructive/30 bg-gradient-to-r from-destructive/10 to-destructive/5 shadow-md">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDescription className="ml-2">
              <strong className="text-destructive">{lowStockAlerts.data.length} productos</strong> tienen stock bajo. Conviene revisar inventario y reposición cuanto antes.
            </AlertDescription>
          </Alert>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Productos más vendidos
              </CardTitle>
              <CardDescription>Resumen comercial del día para detectar tracción inmediata</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.isLoading ? (
                <div className="flex h-80 items-center justify-center text-muted-foreground">
                  <div className="animate-pulse">Cargando métricas...</div>
                </div>
              ) : topProducts.data && topProducts.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="productName" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <YAxis stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="quantity" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  title="Sin datos de ventas"
                  description="Cuando registres tus primeras ventas del día, aquí aparecerán los productos con mayor movimiento."
                  icon={BarChart3}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
            <CardHeader>
              <CardTitle className="text-accent flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Distribución de ingresos
              </CardTitle>
              <CardDescription>Participación de los productos en el ingreso del día</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.isLoading ? (
                <div className="flex h-80 items-center justify-center text-muted-foreground">
                  <div className="animate-pulse">Cargando métricas...</div>
                </div>
              ) : topProducts.data && topProducts.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProducts.data}
                      dataKey="revenue"
                      nameKey="productName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {topProducts.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState
                  title="Sin distribución de ingresos"
                  description="La gráfica circular se activará automáticamente cuando existan ventas registradas durante la jornada."
                  icon={DollarSign}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== ANALYTICS SECTION ===== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Análisis del mes
          </h2>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* Widget 1 — Top 5 productos del mes */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Top productos del mes
                </CardTitle>
                <CardDescription>Los 5 artículos más vendidos en el mes actual</CardDescription>
              </CardHeader>
              <CardContent>
                {topProductsMonth.isLoading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse">Cargando...</div>
                ) : topProductsMonth.data && topProductsMonth.data.length > 0 ? (
                  <div className="space-y-3">
                    {topProductsMonth.data.map((item, idx) => {
                      const maxQty = Number(topProductsMonth.data![0].totalQuantity) || 1;
                      const pct = Math.round((Number(item.totalQuantity) / maxQty) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                              <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}.</span>
                              {item.productName}
                            </span>
                            <span className="text-xs text-muted-foreground">{Number(item.totalQuantity)} uds · ${Number(item.totalRevenue).toFixed(0)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                    <Boxes className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Sin ventas registradas este mes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget 2 — Ventas por talla y color */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-accent flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Ventas por variante (30 días)
                </CardTitle>
                <CardDescription>Tallas y colores con mayor demanda en el último mes</CardDescription>
              </CardHeader>
              <CardContent>
                {salesByVariant.isLoading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse">Cargando...</div>
                ) : (
                  <div className="space-y-4">
                    {salesByVariant.data && salesByVariant.data.bySizes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Por talla</p>
                        <div className="flex flex-wrap gap-2">
                          {salesByVariant.data.bySizes.map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              {s.size} <span className="text-primary/70">·</span> {s.totalQuantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {salesByVariant.data && salesByVariant.data.byColors.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Por color</p>
                        <div className="flex flex-wrap gap-2">
                          {salesByVariant.data.byColors.map((c, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                              {c.color} <span className="text-accent/70">·</span> {c.totalQuantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {salesByVariant.data && salesByVariant.data.bySizes.length === 0 && salesByVariant.data.byColors.length === 0 && (
                      <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                        <Tag className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Sin datos de variantes en los últimos 30 días</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget 4 — Comparativa de períodos */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-blue-500 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Comparativa de períodos
                </CardTitle>
                <CardDescription>Esta semana / este mes vs el período anterior</CardDescription>
              </CardHeader>
              <CardContent>
                {periodComparison.isLoading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse">Cargando...</div>
                ) : cmp ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Ventas semana", current: cmp.thisWeek, prev: cmp.lastWeek, pct: weekPct },
                      { label: "Ingresos semana", current: `$${cmp.thisWeekRevenue.toFixed(0)}`, prev: `$${cmp.lastWeekRevenue.toFixed(0)}`, pct: weekRevPct },
                      { label: "Ventas mes", current: cmp.thisMonth, prev: cmp.lastMonth, pct: monthPct },
                      { label: "Ingresos mes", current: `$${cmp.thisMonthRevenue.toFixed(0)}`, prev: `$${cmp.lastMonthRevenue.toFixed(0)}`, pct: monthRevPct },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-xl font-bold text-foreground">{item.current}</p>
                        <div className="flex items-center gap-1">
                          {item.pct > 0 ? (
                            <ArrowUp className="h-3 w-3 text-green-500" />
                          ) : item.pct < 0 ? (
                            <ArrowDown className="h-3 w-3 text-red-500" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={`text-xs font-semibold ${item.pct > 0 ? "text-green-500" : item.pct < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {item.pct > 0 ? "+" : ""}{item.pct}%
                          </span>
                          <span className="text-xs text-muted-foreground">vs anterior ({item.prev})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                    <TrendingDown className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Sin datos de comparativa disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget 5 — Devoluciones del mes */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-orange-500 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Devoluciones del mes
                </CardTitle>
                <CardDescription>Total de devoluciones y cambios registrados este mes</CardDescription>
              </CardHeader>
              <CardContent>
                {returnsOfMonth.isLoading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse">Cargando...</div>
                ) : returnsOfMonth.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-orange-100 dark:bg-orange-900/20 p-4">
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{returnsOfMonth.data.total}</p>
                        <p className="text-xs text-orange-500 mt-1">devoluciones</p>
                      </div>
                      {returnsOfMonth.data.total === 0 && (
                        <p className="text-sm text-muted-foreground">Sin devoluciones registradas este mes.</p>
                      )}
                    </div>
                    {returnsOfMonth.data.byReason.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Por motivo</p>
                        <div className="space-y-2">
                          {returnsOfMonth.data.byReason.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm text-foreground">{r.reason}</span>
                              <span className="text-sm font-semibold text-orange-500">{r.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Sin datos de devoluciones</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Widget 3 — Productos sin movimiento (full width) */}
          <Card className="mt-6 border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-yellow-500 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos sin movimiento
                  </CardTitle>
                  <CardDescription>Artículos que no han tenido ventas en el período seleccionado</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Período:</span>
                  {[30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setNoMovementDays(d)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${noMovementDays === d ? "bg-yellow-500 text-white border-yellow-500" : "border-border text-muted-foreground hover:border-yellow-400 hover:text-yellow-400"}`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {productsWithoutMovement.isLoading ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground animate-pulse">Cargando...</div>
              ) : productsWithoutMovement.data && productsWithoutMovement.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {productsWithoutMovement.data.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                      <Package className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-sm text-foreground truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <p className="text-sm text-green-600 dark:text-green-400">¡Todos los productos tuvieron movimiento en los últimos {noMovementDays} días!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Products */}
        {user?.role === "admin" && lowStockAlerts.data && lowStockAlerts.data.length > 0 && (
          <Card className="border-border/50 shadow-md overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Artículos con stock bajo
              </CardTitle>
              <CardDescription>Prioriza reposición de inventario con base en existencia crítica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockAlerts.data.slice(0, 5).map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="font-medium text-foreground">{product.product.name}</span>
                    <span className="text-sm font-semibold text-destructive">{product.variant.stock} unidades</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === "admin" && (!lowStockAlerts.data || lowStockAlerts.data.length === 0) && (
          <Card className="border-border/50 shadow-md bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Inventario en condición saludable</p>
                  <p className="text-sm text-green-600 dark:text-green-500">No hay productos con stock bajo en este momento.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
