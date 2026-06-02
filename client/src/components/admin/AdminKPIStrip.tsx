// ============================================================================
// ADMIN KPI STRIP
// ----------------------------------------------------------------------------
// 4 cards de metricas clave que se muestran en la pestaña "Operaciones" del
// panel admin. Usa endpoints existentes - no agrega backend nuevo.
//
// Metricas:
//   1. Gastos del mes (personalExpenses.stats.dashboard)
//   2. Deudas activas (personalDebts.stats.monthSummary)
//   3. Proximo pago (personalDebts.stats.upcoming)
//   4. Ahorro diario sugerido (personalDebts.stats.monthSummary)
//
// Diseño: slate/indigo palacio fino, glow sutil, hover translucido.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import {
  Wallet,
  CreditCard,
  Calendar,
  PiggyBank,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function daysUntil(ymd: string | null | undefined): number | null {
  if (!ymd) return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function AdminKPIStrip() {
  const today = nowMexico();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // --- Queries ---
  const expensesDashQuery = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });
  const debtSummaryQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const upcomingQuery = trpc.personalDebts.stats.upcoming.useQuery({
    daysAhead: 30,
  });
  const remindersStatsQuery = trpc.personalReminders.stats.dashboard.useQuery();

  // --- Data extraction ---
  const dash = expensesDashQuery.data;
  const sum = debtSummaryQuery.data;
  const upcoming = upcomingQuery.data ?? [];
  const rStats = remindersStatsQuery.data;

  const totalGastosMes = dash?.total ?? 0;
  const vsLastPct = dash?.vsLastMonth?.pct ?? null;

  const activeDebtsCount = sum?.activeDebtsCount ?? 0;
  const totalDebtBalance = sum?.totalCurrentBalance ?? 0;
  const ahorroDiario = sum?.ahorroDiarioSugerido ?? 0;

  const nextPay = upcoming[0] ?? null;
  const nextDays = nextPay ? daysUntil(nextPay.nextDueDate) : null;

  // Recordatorios: combinamos hoy + atrasados para mostrar "lo que toca ya"
  const remindersToday = rStats?.todayCount ?? 0;
  const remindersOverdue = rStats?.overdueCount ?? 0;
  const remindersActionable = remindersToday + remindersOverdue;

  // --- Trend icon helper ---
  const TrendIcon = vsLastPct == null
    ? Minus
    : vsLastPct > 5
      ? TrendingUp
      : vsLastPct < -5
        ? TrendingDown
        : Minus;
  const trendColor = vsLastPct == null
    ? "text-slate-500"
    : vsLastPct > 5
      ? "text-rose-400"
      : vsLastPct < -5
        ? "text-emerald-400"
        : "text-slate-400";

  // --- Cards data ---
  const cards = [
    {
      icon: Wallet,
      iconColor: "text-emerald-300",
      iconBg: "bg-emerald-500/12",
      iconRing: "ring-emerald-400/20",
      label: "Gastos del mes",
      value: fmt(totalGastosMes),
      hint:
        vsLastPct != null
          ? `${vsLastPct > 0 ? "+" : ""}${vsLastPct}% vs mes pasado`
          : "primer mes con datos",
      trend: <TrendIcon className={`w-3 h-3 ${trendColor}`} />,
    },
    {
      icon: CreditCard,
      iconColor: "text-rose-300",
      iconBg: "bg-rose-500/12",
      iconRing: "ring-rose-400/20",
      label: "Deudas activas",
      value: activeDebtsCount > 0 ? `${activeDebtsCount}` : "—",
      hint:
        activeDebtsCount > 0
          ? `${fmt(totalDebtBalance)} por pagar`
          : "sin deudas activas",
    },
    {
      icon: Calendar,
      iconColor: "text-amber-300",
      iconBg: "bg-amber-500/12",
      iconRing: "ring-amber-400/20",
      label: "Proximo pago",
      value: nextPay
        ? fmt(Number(nextPay.installmentAmount ?? nextPay.amount ?? 0))
        : "—",
      hint: nextPay
        ? nextDays != null
          ? nextDays <= 0
            ? `${nextPay.creditorName} · hoy`
            : nextDays === 1
              ? `${nextPay.creditorName} · mañana`
              : `${nextPay.creditorName} · en ${nextDays} dias`
          : `${nextPay.creditorName}`
        : "sin pagos cercanos",
    },
    {
      icon: PiggyBank,
      iconColor: "text-indigo-300",
      iconBg: "bg-indigo-500/12",
      iconRing: "ring-indigo-400/20",
      label: "Ahorro diario",
      value: fmt(ahorroDiario),
      hint: ahorroDiario > 0 ? "para cushion del mes" : "sin meta diaria",
    },
    {
      icon: Bell,
      iconColor: remindersOverdue > 0 ? "text-rose-300" : "text-indigo-300",
      iconBg: remindersOverdue > 0 ? "bg-rose-500/12" : "bg-indigo-500/12",
      iconRing: remindersOverdue > 0 ? "ring-rose-400/20" : "ring-indigo-400/20",
      label: "Recordatorios",
      value: String(remindersActionable),
      hint:
        remindersActionable === 0
          ? "sin pendientes hoy"
          : remindersOverdue > 0
            ? `${remindersToday} hoy · ${remindersOverdue} atrasado${remindersOverdue === 1 ? "" : "s"}`
            : `${remindersToday} para hoy`,
    },
  ];

  const isLoading =
    expensesDashQuery.isLoading ||
    debtSummaryQuery.isLoading ||
    upcomingQuery.isLoading ||
    remindersStatsQuery.isLoading;

  // --- Skeleton loading ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-800/40 border border-slate-700/60 p-4 hover:border-slate-600 hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)] transition-all"
        >
          {/* Glow sutil de fondo */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-700/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl ${card.iconBg} ring-1 ${card.iconRing} flex items-center justify-center`}
            >
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            </span>
            {card.trend && <div className="mt-1">{card.trend}</div>}
          </div>

          <p className="relative text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
            {card.label}
          </p>
          <p className="relative text-2xl font-black text-white tracking-tight tabular-nums leading-none">
            {card.value}
          </p>
          <p className="relative text-[11px] text-slate-400 mt-1.5 truncate group-hover:text-slate-300 transition-colors">
            {card.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
