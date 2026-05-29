// ============================================================================
// PANEL "Flujo General" - vista combinada (solo lectura)
// ----------------------------------------------------------------------------
// Cruza visualmente negocio + gastos personales SIN MEZCLAR tablas.
// 4 cards arriba + grafica AreaChart 6 meses con 4 series + microcopy inteligente.
//
// Verde   = ingresos (entra al negocio)
// Indigo  = utilidad (lo que queda del negocio)
// Coral   = gastos personales (sale del hogar)
// Azul    = balance (utilidad - gastos personales)
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  if (Math.abs(n) >= 1000)
    return `$${Math.round(n / 1000)}k`;
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

// Tooltip oscuro para recharts (combina bien con slate)
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-xs font-bold text-slate-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-slate-100">
            {fmt(Number(p.value) || 0)}
          </span>
        </div>
      ))}
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
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-emerald-900/30 rounded-2xl p-5 border border-indigo-500/30 shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-indigo-300" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">
                Vista combinada
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">Flujo General</h2>
            <p className="text-xs text-slate-400 mt-1">
              Negocio + gastos personales, sin mezclar cuentas. Solo referencia
              visual.
            </p>
          </div>
          {onOpenMisGastos && (
            <Button
              onClick={onOpenMisGastos}
              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Mis Gastos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 4 CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Ingresos del negocio - VERDE */}
        <Card className="bg-slate-800 border border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Banknote className="w-4 h-4" /> Ingresos negocio
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {fmt(current?.businessRevenue ?? 0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
              Solo este mes
            </div>
          </CardContent>
        </Card>

        {/* Utilidad del negocio - INDIGO */}
        <Card className="bg-slate-800 border border-indigo-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Gem className="w-4 h-4" /> Utilidad negocio
            </div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">
              {fmt(current?.businessProfit ?? 0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
              Lo que queda
            </div>
          </CardContent>
        </Card>

        {/* Gastos personales - CORAL */}
        <Card className="bg-slate-800 border border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Wallet className="w-4 h-4" /> Gastos personales
            </div>
            <div className="text-2xl font-bold text-orange-400 mt-1">
              {fmt(current?.personalExpenses ?? 0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
              Hogar
            </div>
          </CardContent>
        </Card>

        {/* Balance neto - AZUL */}
        <Card
          className={`bg-slate-800 border ${
            balancePositive ? "border-sky-500/30" : "border-rose-500/30"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              {balancePositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              Balance neto
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${
                balancePositive ? "text-sky-300" : "text-rose-400"
              }`}
            >
              {fmt(current?.balanceAfterExpenses ?? 0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
              Utilidad - gastos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MICROCOPY INTELIGENTE */}
      {data?.insight && (
        <Card className="bg-slate-800/70 border border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-300 shrink-0" />
            <p className="text-sm text-slate-200">{data.insight}</p>
          </CardContent>
        </Card>
      )}

      {/* GRAFICA FLUJO 6 MESES */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Flujo mensual (ultimos 6 meses)
              </h3>
              <p className="text-xs text-slate-400">
                Ingresos · utilidad · gastos personales · balance
              </p>
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
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    stroke="#475569"
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    stroke="#475569"
                    tickFormatter={fmtShort}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="Ingresos"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Utilidad"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#gUtilidad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Gastos personales"
                    stroke="#fb923c"
                    strokeWidth={2}
                    fill="url(#gGastos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Balance"
                    stroke="#7dd3fc"
                    strokeWidth={2}
                    fill="url(#gBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                Todavia no hay suficiente historial
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Captura operaciones y gastos para ver tu flujo mensual.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aclaracion legal/conceptual */}
      <p className="text-[11px] text-slate-500 text-center px-2">
        Las cifras de negocio (ingresos / utilidad / inventario) NO se ven
        afectadas por tus gastos personales. Esta vista es solo referencia.
      </p>
    </div>
  );
}
