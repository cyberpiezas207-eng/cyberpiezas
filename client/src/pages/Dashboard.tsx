import BoutiqueShell from "@/layouts/BoutiqueShell";
import AccessDeniedScreen from "@/components/AccessDeniedScreen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
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
  Loader2,
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
  // Estilos premium estilo Apple - gradient sombras coloridas
  const styles = {
    primary: {
      iconBg: "bg-gradient-to-br from-purple-500 to-pink-500",
      iconShadow: "shadow-lg shadow-purple-500/30",
      cardShadow: "hover:shadow-xl hover:shadow-purple-500/10",
    },
    accent: {
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      iconShadow: "shadow-lg shadow-amber-500/30",
      cardShadow: "hover:shadow-xl hover:shadow-amber-500/10",
    },
    green: {
      iconBg: "bg-gradient-to-br from-emerald-500 to-cyan-500",
      iconShadow: "shadow-lg shadow-emerald-500/30",
      cardShadow: "hover:shadow-xl hover:shadow-emerald-500/10",
    },
    blue: {
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      iconShadow: "shadow-lg shadow-blue-500/30",
      cardShadow: "hover:shadow-xl hover:shadow-blue-500/10",
    },
  };

  const s = styles[color];

  return (
    <Card className={"bg-white border border-slate-200/80 " + s.cardShadow + " hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"}>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          </div>
          <div className={"w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 " + s.iconBg + " " + s.iconShadow}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600 font-medium">{description}</p>
          {trend !== undefined && (
            <span className={"text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-0.5 " + (trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {Math.abs(trend)}%
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
  // ========================================================================
  // HOOKS - todos agrupados arriba para respetar Rules of Hooks de React
  // ========================================================================
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [noMovementDays, setNoMovementDays] = useState(30);

  // SUBSCRIPTION CORE V1: validar acceso via fuente canonica (subscriptions)
  // con fallback a userProgramAccess legacy. Patron consistente con
  // Veterinaria, Abarrotes y Verduleria.
  const { data: access, isLoading: isLoadingAccess } =
    trpc.pagos.subscriptions.hasAccess.useQuery({ posCode: "boutique" });

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

  // ========================================================================
  // GUARD DE ACCESO (despues de todos los hooks, antes de computed)
  // ------------------------------------------------------------------------
  // Antes el guard era externo (ProtectedRoute requiredProgram="boutique" en
  // App.tsx) y bloqueaba con pantalla pelona sin sidebar.
  //
  // Ahora: el Dashboard valida internamente y si NO hay acceso, muestra
  // AccessDeniedScreen embedded dentro del BoutiqueShell. Patron unificado
  // con Veterinaria, Abarrotes y Verduleria.
  // ========================================================================
  if (isLoadingAccess) {
    return (
      <BoutiqueShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-slate-400">Validando tu suscripcion...</p>
          </div>
        </div>
      </BoutiqueShell>
    );
  }

  if (access && !access.hasAccess) {
    return (
      <BoutiqueShell>
        <AccessDeniedScreen
          posCode="boutique"
          description="El sistema Boutique te da inventario por variantes (talla, color), control de cajeros, ventas con devoluciones y reportes ejecutivos."
          benefits={[
            "Inventario por variantes (talla, color)",
            "Punto de venta con devoluciones",
            "Control de cajeros y permisos",
            "Reportes ejecutivos y graficas",
            "$300 al mes o $3,000 al ano",
          ]}
          onViewPlans={() => navigate("/pricing?posCode=boutique")}
          onBack={() => navigate("/sistemas")}
          mode="embedded"
        />
      </BoutiqueShell>
    );
  }

  const totalRevenue = Number.parseFloat(todayStats.data?.totalRevenue || "0");
  const totalSales = todayStats.data?.totalSales || 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const cmp = periodComparison.data;
  const weekPct = cmp ? pctChange(cmp.thisWeek, cmp.lastWeek) : 0;
  const monthPct = cmp ? pctChange(cmp.thisMonth, cmp.lastMonth) : 0;
  const weekRevPct = cmp ? pctChange(cmp.thisWeekRevenue, cmp.lastWeekRevenue) : 0;
  const monthRevPct = cmp ? pctChange(cmp.thisMonthRevenue, cmp.lastMonthRevenue) : 0;

  // ========================================================================
  // FORMATEO DE FECHA Y NOMBRE (para el header del dashboard)
  // ========================================================================
  const firstName = user?.name?.split(" ")[0] || "Usuario";
  const today = new Date();
  const dateLabel = today.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Sparkline data: usa periodComparison si existe, sino placeholder visual
  // En commit futuro se conecta a query real de ventas por dia
  const sparkPoints = [
    { x: 10,  y: 60 },
    { x: 130, y: 48 },
    { x: 250, y: 55 },
    { x: 370, y: 32 },
    { x: 490, y: 38 },
    { x: 610, y: 22 },
    { x: 790, y: 12 },
  ];
  const sparkPath = sparkPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ");
  const sparkArea = sparkPath + " L 790,95 L 10,95 Z";

  const weekRevenue = cmp?.thisWeekRevenue ?? 0;
  const weekRevenueLabel =
    weekRevenue >= 1000
      ? `$${(weekRevenue / 1000).toFixed(1)}k`
      : `$${weekRevenue.toFixed(0)}`;

  return (
    <BoutiqueShell>
      {/* ===================================================================
        DASHBOARD PREMIUM - Sub-commit 2B
        - Header personalizado (saludo + fecha)
        - Card NEGRA destacada "Ventas hoy" + 2 cards laterales
        - Hero magenta "Comenzar venta"
        - Mini grafica animada de 7 dias (sparkline SVG)
        - Microanimaciones: hover lift, line draw, pulse
        =================================================================== */}
      <style>{BQ_DASHBOARD_STYLES}</style>

      <div className="bq-dash" data-fade-in>
        {/* HEADER - saludo personalizado */}
        <header className="bq-dash-header">
          <div>
            <h1 className="bq-dash-greeting">
              Hola <em>{firstName}</em>
            </h1>
            <p className="bq-dash-greeting-sub">{dateLabel}</p>
          </div>
        </header>

        {/* STATS ROW - card NEGRA + 2 cards crema */}
        <div className="bq-dash-stats">
          <div className="bq-dash-stat bq-dash-stat-featured">
            <p className="bq-dash-stat-label">Ventas hoy</p>
            <p className="bq-dash-stat-value">${totalRevenue.toFixed(0)}</p>
            <p className="bq-dash-stat-delta">
              {totalSales} {totalSales === 1 ? "venta" : "ventas"}
            </p>
          </div>
          <div className="bq-dash-stat">
            <p className="bq-dash-stat-label">Semana</p>
            <p className="bq-dash-stat-value">{weekRevenueLabel}</p>
            <p
              className={`bq-dash-stat-delta ${
                weekRevPct >= 0 ? "is-up" : "is-down"
              }`}
            >
              {weekRevPct >= 0 ? "+" : ""}
              {weekRevPct}% vs anterior
            </p>
          </div>
          <div className="bq-dash-stat">
            <p className="bq-dash-stat-label">Ticket promedio</p>
            <p className="bq-dash-stat-value">${averageTicket.toFixed(0)}</p>
            <p className="bq-dash-stat-delta">{todayStats.data?.totalItems || 0} articulos</p>
          </div>
        </div>

        {/* HERO ACTION - magenta "Comenzar venta" */}
        <button
          type="button"
          className="bq-dash-hero"
          onClick={() => navigate("/pos")}
          aria-label="Iniciar nueva venta"
        >
          <div className="bq-dash-hero-text">
            <h3>Comenzar venta</h3>
            <p>Escanea o busca productos, cobra en pocos toques</p>
          </div>
          <div className="bq-dash-hero-cta">
            <ArrowUp className="bq-dash-hero-arrow" />
            <span>Vender</span>
          </div>
        </button>

        {/* MINI GRAFICA SPARKLINE animada */}
        <div className="bq-dash-chart">
          <div className="bq-dash-chart-head">
            <div>
              <p className="bq-dash-chart-title">Ventas ultimos 7 dias</p>
              <p className="bq-dash-chart-sub">Tendencia semanal</p>
            </div>
            <p className="bq-dash-chart-amount">{weekRevenueLabel}</p>
          </div>
          <svg
            className="bq-spark"
            viewBox="0 0 800 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bq-spark-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBEAF0" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FBEAF0" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={sparkArea} fill="url(#bq-spark-gradient)" className="bq-spark-area" />
            <path d={sparkPath} className="bq-spark-line" />
            <circle cx="790" cy="12" r="4" className="bq-spark-dot" />
            <circle cx="790" cy="12" r="8" className="bq-spark-dot-pulse" />
          </svg>
          <div className="bq-spark-days">
            <span>Dom</span>
            <span>Lun</span>
            <span>Mar</span>
            <span>Mie</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sab</span>
          </div>
        </div>

        {/* Plan Usage */}
        {planUsage.data ? (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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

            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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

            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
          <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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

          <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
                      <div key={i} className="rounded-xl border border-slate-200/80 bg-muted/20 p-3 space-y-1">
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
            <Card className="border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
          <Card className="mt-6 border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden">
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
          <Card className="border-slate-200/80 shadow-md overflow-hidden">
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
          <Card className="border-slate-200/80 shadow-md bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800/30">
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
    </BoutiqueShell>
  );
}

// =============================================================================
// ESTILOS PREMIUM DEL DASHBOARD (Sub-commit 2B)
// -----------------------------------------------------------------------------
// Paleta Atelier: magenta + negro + crema.
// Microanimaciones: hover lift, line draw, pulse en sparkline.
// =============================================================================

const BQ_DASHBOARD_STYLES = `
.bq-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: bqDashFade 0.5s ease;
}
@keyframes bqDashFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.bq-dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 2px 2px;
}
.bq-dash-greeting {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28px;
  font-weight: 500;
  color: #1A1A1A;
  margin: 0;
  letter-spacing: -0.01em;
}
.bq-dash-greeting em {
  color: #E91E63;
  font-style: normal;
}
.bq-dash-greeting-sub {
  font-size: 13px;
  color: #6B6B6B;
  margin: 3px 0 0;
  text-transform: capitalize;
}
.bq-dash-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .bq-dash-stats {
    grid-template-columns: 1fr 1fr;
  }
  .bq-dash-stat-featured {
    grid-column: span 2;
  }
}
.bq-dash-stat {
  background: #FAF7F2;
  border-radius: 14px;
  padding: 16px 18px;
  transition: all 0.25s ease;
  cursor: default;
}
.bq-dash-stat:hover {
  transform: translateY(-2px);
}
.bq-dash-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #6B6B6B;
  margin: 0 0 6px;
  font-weight: 500;
}
.bq-dash-stat-value {
  font-size: 30px;
  font-weight: 500;
  color: #1A1A1A;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.01em;
  line-height: 1.05;
}
.bq-dash-stat-delta {
  font-size: 12px;
  color: #6B6B6B;
  margin: 6px 0 0;
  font-weight: 500;
}
.bq-dash-stat-delta.is-up {
  color: #1D9E75;
}
.bq-dash-stat-delta.is-down {
  color: #C2185B;
}
.bq-dash-stat-featured {
  background: #1A1A1A;
  color: white;
}
.bq-dash-stat-featured .bq-dash-stat-label {
  color: rgba(255,255,255,0.65);
}
.bq-dash-stat-featured .bq-dash-stat-value {
  color: white;
}
.bq-dash-stat-featured .bq-dash-stat-delta {
  color: #ED93B1;
}
.bq-dash-hero {
  background: #E91E63;
  border-radius: 16px;
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
  width: 100%;
  text-align: left;
  color: white;
  font-family: inherit;
}
.bq-dash-hero:hover {
  background: #C2185B;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(233,30,99,0.32);
}
.bq-dash-hero:active {
  transform: translateY(0);
}
.bq-dash-hero-text {
  flex: 1;
  min-width: 0;
}
.bq-dash-hero-text h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
  color: white;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.01em;
}
.bq-dash-hero-text p {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255,255,255,0.88);
}
.bq-dash-hero-cta {
  background: white;
  color: #C2185B;
  padding: 11px 18px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  transition: transform 0.2s ease;
}
.bq-dash-hero:hover .bq-dash-hero-cta {
  transform: scale(1.04);
}
.bq-dash-hero-arrow {
  width: 16px;
  height: 16px;
  transform: rotate(45deg);
}
.bq-dash-chart {
  background: #FAF7F2;
  border-radius: 14px;
  padding: 16px 20px;
}
.bq-dash-chart-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.bq-dash-chart-title {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  margin: 0;
}
.bq-dash-chart-sub {
  font-size: 11px;
  color: #6B6B6B;
  margin: 2px 0 0;
}
.bq-dash-chart-amount {
  font-size: 22px;
  font-weight: 500;
  color: #E91E63;
  font-family: Georgia, "Times New Roman", serif;
  margin: 0;
  letter-spacing: -0.01em;
}
.bq-spark {
  width: 100%;
  height: 100px;
  display: block;
  overflow: visible;
}
.bq-spark-area {
  animation: bqSparkAreaIn 1.2s 0.3s ease both;
}
.bq-spark-line {
  fill: none;
  stroke: #E91E63;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 1200;
  stroke-dashoffset: 1200;
  animation: bqSparkDraw 1.6s 0.2s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
.bq-spark-dot {
  fill: #E91E63;
  opacity: 0;
  animation: bqSparkDotIn 0.35s 1.7s ease both;
}
.bq-spark-dot-pulse {
  fill: #E91E63;
  opacity: 0.35;
  animation: bqSparkPulse 2.2s 1.9s ease-out infinite;
  transform-origin: 790px 12px;
}
@keyframes bqSparkDraw {
  to { stroke-dashoffset: 0; }
}
@keyframes bqSparkAreaIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bqSparkDotIn {
  from { opacity: 0; transform: scale(0.4); transform-origin: 790px 12px; }
  to { opacity: 1; transform: scale(1); transform-origin: 790px 12px; }
}
@keyframes bqSparkPulse {
  0% { transform: scale(1); opacity: 0.55; transform-origin: 790px 12px; }
  70% { transform: scale(2.6); opacity: 0; transform-origin: 790px 12px; }
  100% { transform: scale(2.6); opacity: 0; transform-origin: 790px 12px; }
}
.bq-spark-days {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #6B6B6B;
  margin-top: 6px;
  padding: 0 2px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
`;
