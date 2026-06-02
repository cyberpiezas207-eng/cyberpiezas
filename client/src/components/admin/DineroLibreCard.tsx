// ============================================================================
// DINERO LIBRE ESTIMADO - Card destacada de Resumen de Hoy
// ----------------------------------------------------------------------------
// La metrica MAS importante del dashboard: responde "cuanto me queda libre
// este mes despues de cubrir TODO lo que tengo que cubrir".
//
// Formula:
//   Dinero libre = utilidadNegocio - gastosPersonales - deudasMes -
//                  suscripciones - ahorroDiarioMes
//
// Microcopy narrativa para humanizar el numero:
//   "Tus gastos consumen X% de tu utilidad este mes"
//   "Te queda Y dias para llegar al limite"
//   "Vas en buen camino: tu balance crecio Z%"
//
// Tema: card grande arriba del KPI strip, color verde/amber/rojo segun el
// estado. Hover muestra detalle del calculo.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmt(n: number): string {
  const rounded = Math.round(n);
  if (rounded < 0) return `-$${Math.abs(rounded).toLocaleString("es-MX")}`;
  return `$${rounded.toLocaleString("es-MX")}`;
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function daysRemainingInMonth(): number {
  const d = nowMexico();
  const total = daysInMonth(d.getFullYear(), d.getMonth() + 1);
  return total - d.getDate() + 1;
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function DineroLibreCard() {
  const [expanded, setExpanded] = useState(false);

  const today = nowMexico();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // --- Queries (todas existentes) ---
  const overviewQuery = trpc.personalFinanceOverview.getOverview.useQuery();
  const debtSummaryQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const mySubsQuery = trpc.pagos.subscriptions.listMine.useQuery();

  const overview = overviewQuery.data;
  const debtSum = debtSummaryQuery.data;
  const mySubs = mySubsQuery.data ?? [];

  // --- Calculo ---
  const businessProfit = overview?.currentMonth?.businessProfit ?? 0;
  const personalExpenses = overview?.currentMonth?.personalExpenses ?? 0;

  // Deudas del mes: suma de los pagos que tocan este mes
  const deudasMes = Number(debtSum?.totalMonthlyPayments ?? 0);

  // Suscripciones activas: suma de pagos mensuales
  const suscripcionesMes = mySubs.reduce((acc: number, sub: any) => {
    const isActive = sub?.status === "active" || sub?.isActive;
    if (!isActive) return acc;
    return acc + Number(sub?.monthlyPrice ?? sub?.amount ?? 0);
  }, 0);

  // Ahorro diario sugerido por las deudas
  const ahorroDiarioSugerido = Number(debtSum?.ahorroDiarioSugerido ?? 0);
  const diasMes = daysInMonth(year, month);
  const ahorroPlaneadoMes = ahorroDiarioSugerido * diasMes;

  // Total gastado/comprometido este mes
  const totalComprometido =
    personalExpenses + deudasMes + suscripcionesMes + ahorroPlaneadoMes;

  // Dinero libre = utilidad negocio - todo lo comprometido
  const dineroLibre = businessProfit - totalComprometido;

  // Ratio de utilidad consumida
  const utilidadConsumidaPct =
    businessProfit > 0
      ? Math.round((totalComprometido / businessProfit) * 100)
      : null;

  // --- Logica de estado ---
  // verde: dineroLibre > 0 y utilidadConsumida < 70%
  // amber: dineroLibre > 0 pero utilidad >= 70%
  // rosa: dineroLibre <= 0
  let stateKind: "good" | "warning" | "danger" = "good";
  if (dineroLibre <= 0) {
    stateKind = "danger";
  } else if (utilidadConsumidaPct != null && utilidadConsumidaPct >= 70) {
    stateKind = "warning";
  }

  const stateTheme = {
    good: {
      bg: "from-emerald-500/15 via-slate-900 to-slate-900",
      border: "border-emerald-500/30",
      iconBg: "bg-emerald-500/20",
      iconRing: "ring-emerald-400/40",
      iconColor: "text-emerald-300",
      numberColor: "text-emerald-300",
      label: "Dinero libre",
      icon: Coins,
      trend: TrendingUp,
    },
    warning: {
      bg: "from-amber-500/12 via-slate-900 to-slate-900",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500/20",
      iconRing: "ring-amber-400/40",
      iconColor: "text-amber-300",
      numberColor: "text-amber-300",
      label: "Margen ajustado",
      icon: AlertTriangle,
      trend: TrendingDown,
    },
    danger: {
      bg: "from-rose-500/15 via-slate-900 to-slate-900",
      border: "border-rose-500/30",
      iconBg: "bg-rose-500/20",
      iconRing: "ring-rose-400/40",
      iconColor: "text-rose-300",
      numberColor: "text-rose-300",
      label: "Mes en rojo",
      icon: AlertTriangle,
      trend: TrendingDown,
    },
  };
  const theme = stateTheme[stateKind];

  // --- Microcopy narrativa ---
  let narrative = "";
  if (overviewQuery.isLoading || debtSummaryQuery.isLoading) {
    narrative = "Calculando tu balance del mes...";
  } else if (businessProfit === 0) {
    narrative = `Aun no hay utilidad registrada este mes. Lo que cubres con tus reservas: ${fmt(totalComprometido)}.`;
  } else if (stateKind === "danger") {
    narrative = `Estas $${Math.abs(Math.round(dineroLibre)).toLocaleString("es-MX")} arriba de tu utilidad. Hay que ajustar gastos o deudas.`;
  } else if (utilidadConsumidaPct != null && utilidadConsumidaPct >= 70) {
    narrative = `Tus compromisos consumen ${utilidadConsumidaPct}% de tu utilidad. Margen ajustado.`;
  } else if (utilidadConsumidaPct != null) {
    narrative = `Tus compromisos consumen ${utilidadConsumidaPct}% de tu utilidad. Vas bien.`;
  } else {
    narrative = "Buen mes. Sin alertas de presupuesto.";
  }

  const diasRestantes = daysRemainingInMonth();

  // --- Skeleton ---
  if (overviewQuery.isLoading || debtSummaryQuery.isLoading) {
    return (
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 animate-pulse h-[140px]" />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} border ${theme.border}`}
    >
      {/* Glow effect */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 ${theme.iconBg} rounded-full blur-3xl pointer-events-none opacity-60`}
      />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-slate-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl ${theme.iconBg} ring-1 ${theme.iconRing} flex items-center justify-center shrink-0`}
            >
              <theme.icon className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400/60" />
                Resumen de hoy
              </p>
              <h2 className="text-sm font-bold text-slate-200 leading-tight mt-0.5">
                {theme.label} este mes
              </h2>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title={expanded ? "Ocultar detalle" : "Ver detalle"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Numero grande */}
        <div className="mb-2">
          <p
            className={`text-4xl md:text-5xl font-black ${theme.numberColor} tabular-nums tracking-tight leading-none`}
          >
            {fmt(dineroLibre)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
            {narrative}
          </p>
        </div>

        {/* Footer rapido */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-3">
          {utilidadConsumidaPct != null && (
            <span className="inline-flex items-center gap-1">
              <theme.trend className={`w-3 h-3 ${theme.iconColor}`} />
              {utilidadConsumidaPct}% utilidad usada
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-500">·</span>
            {diasRestantes} dia{diasRestantes === 1 ? "" : "s"} restante
            {diasRestantes === 1 ? "" : "s"} del mes
          </span>
        </div>

        {/* Detalle expandido */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-700/40 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Utilidad del negocio
              </span>
              <span className="text-emerald-300 font-bold tabular-nums">
                +{fmt(businessProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Gastos personales
              </span>
              <span className="text-rose-300 font-bold tabular-nums">
                -{fmt(personalExpenses)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Deudas del mes
              </span>
              <span className="text-amber-300 font-bold tabular-nums">
                -{fmt(deudasMes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Suscripciones
              </span>
              <span className="text-violet-300 font-bold tabular-nums">
                -{fmt(suscripcionesMes)}
              </span>
            </div>
            {ahorroPlaneadoMes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Ahorro planeado ({fmt(ahorroDiarioSugerido)}/dia)
                </span>
                <span className="text-indigo-300 font-bold tabular-nums">
                  -{fmt(ahorroPlaneadoMes)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-700/30">
              <span className="text-white font-bold inline-flex items-center gap-1.5">
                = Dinero libre
              </span>
              <span
                className={`font-black text-base tabular-nums ${theme.numberColor}`}
              >
                {fmt(dineroLibre)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug pt-2">
              Calculo: utilidad - gastos personales - deudas - suscripciones - ahorro planeado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
