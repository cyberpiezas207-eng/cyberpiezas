// ============================================================================
// PANEL "Flujo General" - vista combinada PREMIUM (solo lectura)
// ----------------------------------------------------------------------------
// Cruza visualmente negocio + gastos personales SIN MEZCLAR tablas.
// Diseño premium: gradientes por card, iconos en circulos tinted,
// agrupacion negocio | personal con sutil divider, orbs blur en header.
//
// Verde   = ingresos (entra al negocio)
// Indigo  = utilidad (lo que queda del negocio)
// Coral   = gastos personales (sale del hogar)
// Sky/Rose = balance (utilidad - gastos personales)
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DebtsFlowSection from "@/components/admin/DebtsFlowSection";
import {
  TrendingUp,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Gem,
  Banknote,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  onOpenMisGastos?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
};

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const mi = parseInt(m, 10) - 1;
  if (mi < 0 || mi > 11) return ym;
  return MONTHS_ES[mi] + " " + y.slice(2);
}

// Tooltip oscuro premium
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl p-3 shadow-2xl">
      <p className="text-xs font-bold text-slate-200 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-bold text-slate-100 ml-auto">
              {fmt(Number(p.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FlujoGeneralPanel({ onOpenMisGastos }: Props) {
  const overviewQuery = trpc.personalFinanceOverview.getOverview.useQuery();

  const data = overviewQuery.data;
  const current = data?.currentMonth;
  const trend = data?.trend ?? [];

  // Preparar data para el AreaChart
  const chartData = trend.map((t) => ({
    label: monthLabel(t.ym),
    Ingresos: t.businessRevenue,
    Utilidad: t.businessProfit,
    "Gastos personales": t.personalExpenses,
    Balance: t.balance,
  }));

  const hasAnyData =
    trend.length > 0 &&
    trend.some(
      (t) =>
        t.businessRevenue > 0 ||
        t.businessProfit > 0 ||
        t.personalExpenses > 0,
    );

  const balancePositive = (current?.balanceAfterExpenses ?? 0) >= 0;

  return (
    <div className="space-y-5">
      {/* ============================================================
           HEADER PREMIUM con orbs blur de fondo
           ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 shadow-2xl">
        {/* Orbs de fondo - dan profundidad tipo iPhone */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl" />

        <div className="relative p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                Vista combinada
              </span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Flujo General
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 max-w-md">
              Negocio + gastos personales en un solo lugar. Sin mezclar cuentas.
            </p>
          </div>
          {onOpenMisGastos && (
            <Button
              onClick={onOpenMisGastos}
              className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-slate-100 shadow-lg shrink-0"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Mis Gastos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================
           CARDS DE STATS (agrupadas: Negocio | Personal)
           ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* GRUPO NEGOCIO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-300/80">
              Negocio
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Ingresos */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-800/90 border border-emerald-500/40 shadow-lg hover:border-emerald-400/60 hover:shadow-emerald-500/10 transition-all duration-200">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-emerald-300" />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Ingresos
                </p>
                <div className="text-2xl font-black text-emerald-300 tracking-tight leading-tight">
                  {fmt(current?.businessRevenue ?? 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Entra al negocio</p>
              </CardContent>
            </Card>

            {/* Utilidad */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-800 to-slate-800/90 border border-indigo-500/40 shadow-lg hover:border-indigo-400/60 hover:shadow-indigo-500/10 transition-all duration-200">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center">
                    <Gem className="w-4 h-4 text-indigo-300" />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Utilidad
                </p>
                <div className="text-2xl font-black text-indigo-200 tracking-tight leading-tight">
                  {fmt(current?.businessProfit ?? 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Lo que queda</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* GRUPO PERSONAL */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-300/80">
              Personal
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-orange-500/20 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Gastos personales */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-950/60 via-slate-800 to-slate-800/90 border border-orange-500/40 shadow-lg hover:border-orange-400/60 hover:shadow-orange-500/10 transition-all duration-200">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-orange-300" />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Gastos
                </p>
                <div className="text-2xl font-black text-orange-300 tracking-tight leading-tight">
                  {fmt(current?.personalExpenses ?? 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Sale del hogar</p>
              </CardContent>
            </Card>

            {/* Balance neto - HERO card (cambia color segun positivo/negativo) */}
            <Card
              className={`relative overflow-hidden bg-gradient-to-br ${
                balancePositive
                  ? "from-sky-950/60 via-slate-800 to-slate-800/90 border-sky-500/40 hover:border-sky-400/60 hover:shadow-sky-500/10"
                  : "from-rose-950/60 via-slate-800 to-slate-800/90 border-rose-500/40 hover:border-rose-400/60 hover:shadow-rose-500/10"
              } border shadow-lg transition-all duration-200`}
            >
              <div
                className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${
                  balancePositive ? "bg-sky-500/10" : "bg-rose-500/10"
                }`}
              />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center ${
                      balancePositive
                        ? "bg-sky-500/20 ring-sky-400/30"
                        : "bg-rose-500/20 ring-rose-400/30"
                    }`}
                  >
                    {balancePositive ? (
                      <ArrowUpRight className="w-4 h-4 text-sky-300" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-300" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Balance
                </p>
                <div
                  className={`text-2xl font-black tracking-tight leading-tight ${
                    balancePositive ? "text-sky-300" : "text-rose-300"
                  }`}
                >
                  {fmt(current?.balanceAfterExpenses ?? 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Utilidad − gastos
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ============================================================
           MICROCOPY INTELIGENTE (insight del mes)
           ============================================================ */}
      {data?.insight && (
        <div className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-800/60 to-slate-800/60 backdrop-blur-sm">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="relative p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <p className="text-sm text-slate-100 font-medium leading-relaxed">
              {data.insight}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
           GRAFICA FLUJO 6 MESES
           ============================================================ */}
      <Card className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 shadow-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-700/60 ring-1 ring-slate-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                  Flujo mensual
                </h3>
                <p className="text-[11px] text-slate-400">
                  Últimos 6 meses · Ingresos · Utilidad · Gastos · Balance
                </p>
              </div>
            </div>
            {!hasAnyData && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                Esperando datos
              </span>
            )}
          </div>

          {hasAnyData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    opacity={0.4}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                    stroke="#475569"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    stroke="#475569"
                    tickFormatter={fmtShort}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#cbd5e1", paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="Ingresos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#gIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Utilidad"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fill="url(#gUtilidad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Gastos personales"
                    stroke="#fb923c"
                    strokeWidth={2.5}
                    fill="url(#gGastos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Balance"
                    stroke="#7dd3fc"
                    strokeWidth={2.5}
                    fill="url(#gBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">
                Todavía no hay suficiente historial
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Captura operaciones y gastos para ver tu flujo mensual.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aclaracion legal/conceptual */}
      <p className="text-[10px] text-slate-600 text-center px-2 leading-relaxed">
        Las cifras de negocio (ingresos / utilidad / inventario) NO se ven
        afectadas por tus gastos personales. Esta vista es solo referencia.
      </p>
      {/* Seccion de deudas integrada en flujo general */}
      <DebtsFlowSection />
    </div>
  );
}
