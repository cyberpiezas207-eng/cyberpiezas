// ============================================================================
// DEBT KPIS PANEL - "Indicadores de salud de deuda"
// ----------------------------------------------------------------------------
// Tres KPIs jugosos:
//
//   1. MESES PARA QUEDAR LIBRE
//      Formula: totalCurrentBalance / expectedThisMonth (aproximacion)
//      Microcopy: "A este ritmo liquidas en X.Y meses"
//      Color: emerald si <12 meses, amber si 12-24, rose si >24
//
//   2. FLUJO LIBERABLE
//      Suma de installmentAmount de deudas con <= 3 cuotas restantes
//      Microcopy: "Si liquidas Coppel pronto liberas $950/mes"
//      Color: emerald (oportunidad)
//
//   3. ACTIVOS VENDIDOS CON DEUDA PENDIENTE
//      Detecta debts donde assetStatus === "sold" AND currentBalance > 0
//      Microcopy: "Tienes 1 activo vendido que sigues pagando ($2,500)"
//      Color: rose (zona de presion)
//
// REGLA CLAVE:
//   - Solo muestra cada KPI si TIENE valor accionable
//   - Si no aplica (sin deudas, sin activos vendidos), oculta esa tarjeta
//   - Si no hay ningun KPI relevante, oculta TODO el panel
//
// Comentarios SIN ACENTOS por convencion.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingDown,
  Zap,
  PackageX,
  Heart,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function formatMonths(months: number): string {
  if (months < 1) return "este mes";
  if (months < 12) {
    return `${months.toFixed(1).replace(".0", "")} ${months === 1 ? "mes" : "meses"}`;
  }
  const years = months / 12;
  return `${years.toFixed(1).replace(".0", "")} anos`;
}

// ----------------------------------------------------------------------------
// Mini KPI Card
// ----------------------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  microcopy,
  color = "slate",
}: {
  icon: any;
  label: string;
  value: string;
  microcopy: string;
  color?: "emerald" | "amber" | "rose" | "slate" | "indigo";
}) {
  const palette = {
    emerald: {
      bg: "bg-gradient-to-br from-emerald-950/40 via-slate-800 to-slate-800/80",
      border: "border-emerald-500/40",
      iconBg: "bg-emerald-500/20",
      iconRing: "ring-emerald-400/50",
      iconColor: "text-emerald-200",
      valueColor: "text-emerald-200",
      microcopyColor: "text-emerald-200/80",
      glow: "bg-emerald-500/10",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-950/40 via-slate-800 to-slate-800/80",
      border: "border-amber-500/40",
      iconBg: "bg-amber-500/20",
      iconRing: "ring-amber-400/50",
      iconColor: "text-amber-200",
      valueColor: "text-amber-200",
      microcopyColor: "text-amber-200/80",
      glow: "bg-amber-500/10",
    },
    rose: {
      bg: "bg-gradient-to-br from-rose-950/40 via-slate-800 to-slate-800/80",
      border: "border-rose-500/40",
      iconBg: "bg-rose-500/20",
      iconRing: "ring-rose-400/50",
      iconColor: "text-rose-200",
      valueColor: "text-rose-200",
      microcopyColor: "text-rose-200/80",
      glow: "bg-rose-500/10",
    },
    slate: {
      bg: "bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900",
      border: "border-slate-700",
      iconBg: "bg-slate-700",
      iconRing: "ring-slate-600",
      iconColor: "text-slate-200",
      valueColor: "text-slate-100",
      microcopyColor: "text-slate-400",
      glow: "bg-slate-500/5",
    },
    indigo: {
      bg: "bg-gradient-to-br from-indigo-950/40 via-slate-800 to-slate-800/80",
      border: "border-indigo-500/40",
      iconBg: "bg-indigo-500/20",
      iconRing: "ring-indigo-400/50",
      iconColor: "text-indigo-200",
      valueColor: "text-indigo-200",
      microcopyColor: "text-indigo-200/80",
      glow: "bg-indigo-500/10",
    },
  };
  const p = palette[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${p.bg} border ${p.border} p-3.5 shadow-md`}
    >
      <div
        className={`absolute -top-6 -right-6 w-20 h-20 ${p.glow} rounded-full blur-2xl`}
      />
      <div className="relative">
        {/* Header: icono + label */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-9 h-9 rounded-lg ${p.iconBg} ring-2 ${p.iconRing} flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-4 h-4 ${p.iconColor}`} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        </div>

        {/* Valor grande */}
        <p
          className={`text-xl font-black tabular-nums ${p.valueColor} leading-tight mb-1`}
        >
          {value}
        </p>

        {/* Microcopy */}
        <p className={`text-[11px] ${p.microcopyColor} leading-snug`}>
          {microcopy}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function DebtKPIsPanel({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });

  const debts = (debtsQuery.data ?? []) as any[];
  const sum = sumQuery.data;
  const isLoading = debtsQuery.isLoading || sumQuery.isLoading;

  // -------------------------------------------------------------
  // KPI 1: Meses para quedar libre
  // Aproximacion: totalDeuda / pago mensual estimado
  // -------------------------------------------------------------
  const totalDebt = Number(sum?.totalCurrentBalance ?? 0);
  const monthlyEstimate = Number(sum?.expectedThisMonth ?? 0);

  // Si no tengo expectedThisMonth (caso edge), aproximo con suma de installments
  let payRate = monthlyEstimate;
  if (payRate <= 0 && debts.length > 0) {
    payRate = debts.reduce(
      (acc, d) => acc + Number(d.installmentAmount ?? 0),
      0,
    );
  }

  const monthsToFree =
    payRate > 0 && totalDebt > 0 ? totalDebt / payRate : null;

  let monthsColor: "emerald" | "amber" | "rose" = "emerald";
  if (monthsToFree != null) {
    if (monthsToFree > 24) monthsColor = "rose";
    else if (monthsToFree > 12) monthsColor = "amber";
    else monthsColor = "emerald";
  }

  const showMonthsKpi = monthsToFree != null && totalDebt > 0;

  // -------------------------------------------------------------
  // KPI 2: Flujo liberable (deudas proximas a liquidar)
  // -------------------------------------------------------------
  const liquidableDebts = debts.filter((d) => {
    const total = Number(d.totalInstallments ?? 0);
    const current = Number(d.currentInstallment ?? 0);
    if (total <= 0) return false;
    const remaining = total - current;
    return remaining > 0 && remaining <= 3;
  });

  const liberableFlow = liquidableDebts.reduce(
    (acc, d) => acc + Number(d.installmentAmount ?? 0),
    0,
  );

  const showFlowKpi = liquidableDebts.length > 0 && liberableFlow > 0;
  const liquidableNames = liquidableDebts
    .map((d) => d.creditorName)
    .slice(0, 2)
    .join(" y ");
  const flowMicrocopy =
    liquidableDebts.length === 1
      ? `Si liquidas ${liquidableNames} pronto liberas ${fmt(liberableFlow)} al mes`
      : `Si liquidas ${liquidableNames}${liquidableDebts.length > 2 ? " y otras" : ""} liberas ${fmt(liberableFlow)}/mes`;

  // -------------------------------------------------------------
  // KPI 3: Activos vendidos con deuda pendiente
  // -------------------------------------------------------------
  const soldButOwe = debts.filter(
    (d) =>
      d.assetStatus === "sold" && Number(d.currentBalance ?? 0) > 0,
  );

  const soldOweBalance = soldButOwe.reduce(
    (acc, d) => acc + Number(d.currentBalance ?? 0),
    0,
  );

  const showSoldOweKpi = soldButOwe.length > 0;
  const soldOweMicrocopy =
    soldButOwe.length === 1
      ? `Vendiste ${soldButOwe[0].title || soldButOwe[0].creditorName} pero sigues debiendo`
      : `${soldButOwe.length} activos vendidos con deuda pendiente`;

  // -------------------------------------------------------------
  // Si NINGUN KPI aplica, oculta panel completo (cero ruido visual)
  // -------------------------------------------------------------
  const hasAnyKpi = showMonthsKpi || showFlowKpi || showSoldOweKpi;

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-slate-700/40 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyKpi) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-emerald-300" />
          <h3 className="text-sm font-bold text-slate-200">
            Salud de deuda · indicadores
          </h3>
        </div>

        {/* Grid de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {showMonthsKpi && (
            <KpiCard
              icon={TrendingDown}
              label="Meses para liberarte"
              value={formatMonths(monthsToFree!)}
              microcopy={`A este ritmo (${fmt(payRate)}/mes) liquidas ${fmt(totalDebt)} de deuda total`}
              color={monthsColor}
            />
          )}

          {showFlowKpi && (
            <KpiCard
              icon={Zap}
              label="Flujo liberable"
              value={`+${fmt(liberableFlow)}/mes`}
              microcopy={flowMicrocopy}
              color="emerald"
            />
          )}

          {showSoldOweKpi && (
            <KpiCard
              icon={PackageX}
              label="Vendido con deuda"
              value={fmt(soldOweBalance)}
              microcopy={soldOweMicrocopy}
              color="rose"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
