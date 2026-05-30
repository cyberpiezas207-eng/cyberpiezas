// ============================================================================
// SECCION "Deudas y compromisos del mes" para el Flujo General
// ----------------------------------------------------------------------------
// Componente standalone que se monta al final del FlujoGeneralPanel.
// Tiene sus propios queries para no depender de la estructura externa.
//
// Estructura:
//   - Header con badge "CENTRO DE DEUDAS"
//   - 4 stats cards (deuda total, por pagar, pagado, ahorro diario)
//   - Barra de progreso visual: pagado de expected del mes
//   - Mini-lista de proximos 7 dias (con badges de urgencia)
//
// Color tema rosa/coral (consistent con el modulo de deudas).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtExact = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDay(ymd: string | null): string {
  if (!ymd) return "—";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}`;
}

interface Props {
  // Si el padre quiere forzar mes/año, los pasa. Si no, usa el mes actual.
  year?: number;
  month?: number;
}

export default function DebtsFlowSection({ year, month }: Props) {
  const today = nowMexico();
  const y = year ?? today.getFullYear();
  const m = month ?? today.getMonth() + 1;
  const monthLabel = `${MONTHS_ES[m - 1]} ${y}`;

  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year: y,
    month: m,
  });
  const upcomingQuery = trpc.personalDebts.stats.upcoming.useQuery({
    daysAhead: 7,
  });

  const s = sumQuery.data;
  const upcoming = upcomingQuery.data ?? [];

  // Loading state
  if (sumQuery.isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="h-32 rounded-xl bg-slate-700/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Si no hay deudas activas, ocultamos toda la seccion
  if (!s || s.activeDebtsCount === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900" />
        <div className="absolute -top-16 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center text-lg">
            🏆
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-200">
              Sin deudas activas en {monthLabel}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aprovecha tu mes sin compromisos financieros.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculos derivados
  const paid = s.paymentsThisMonth ?? 0;
  const expected = s.expectedThisMonth ?? 0;
  const remaining = Math.max(0, expected - paid);
  const progressPct =
    expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0;

  // Indicador de salud
  let healthLevel: "good" | "warning" | "danger" = "good";
  if (expected > 0) {
    const ratio = paid / expected;
    if (ratio >= 0.8) healthLevel = "good";
    else if (ratio >= 0.4) healthLevel = "warning";
    else healthLevel = "danger";
  }

  return (
    <div className="space-y-4">
      {/* Header de seccion */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/60 via-slate-900 to-red-950/40" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-rose-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 mb-2">
                <CreditCard className="w-3 h-3 text-rose-300" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">
                  Compromisos del mes
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Deudas y pagos
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {s.activeDebtsCount} deuda{s.activeDebtsCount === 1 ? "" : "s"}{" "}
                activa{s.activeDebtsCount === 1 ? "" : "s"}
                {s.paidDebtsCount > 0 && (
                  <span className="text-emerald-300 ml-1.5">
                    · {s.paidDebtsCount} liquidada
                    {s.paidDebtsCount === 1 ? "" : "s"} 🏆
                  </span>
                )}
              </p>
            </div>

            {/* Indicador de salud */}
            <div
              className={`px-3 py-2 rounded-xl border text-center shrink-0 ${
                healthLevel === "good"
                  ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                  : healthLevel === "warning"
                    ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                    : "bg-rose-500/15 border-rose-400/40 text-rose-200"
              }`}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider">
                Progreso
              </div>
              <div className="text-xl font-black leading-tight mt-0.5">
                {progressPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Deuda total */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-950/60 via-slate-800 to-slate-800/90 border border-rose-500/40 shadow-lg">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
          <CardContent className="relative p-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 ring-1 ring-rose-400/30 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4 text-rose-300" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Deuda total
            </p>
            <div className="text-2xl font-black text-rose-200 tracking-tight leading-tight">
              {fmt(s.totalCurrentBalance)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">saldo restante</p>
          </CardContent>
        </Card>

        {/* Por pagar este mes */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/60 via-slate-800 to-slate-800/90 border border-amber-500/40 shadow-lg">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <CardContent className="relative p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 ring-1 ring-amber-400/30 flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Por pagar mes
            </p>
            <div className="text-2xl font-black text-amber-200 tracking-tight leading-tight">
              {fmt(remaining)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              de {fmt(expected)} esperado
            </p>
          </CardContent>
        </Card>

        {/* Pagado este mes */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-800/90 border border-emerald-500/40 shadow-lg">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <CardContent className="relative p-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Pagado mes
            </p>
            <div className="text-2xl font-black text-emerald-200 tracking-tight leading-tight">
              {fmt(paid)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {s.paymentsThisMonthCount} pago(s)
            </p>
          </CardContent>
        </Card>

        {/* Ahorro diario sugerido */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-800 to-slate-800/90 border border-indigo-500/40 shadow-lg">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
          <CardContent className="relative p-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Ahorro diario
            </p>
            <div className="text-2xl font-black text-indigo-200 tracking-tight leading-tight">
              {fmt(s.ahorroDiarioSugerido ?? 0)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">para cubrir mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso visual */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`w-4 h-4 ${
                  healthLevel === "good"
                    ? "text-emerald-300"
                    : healthLevel === "warning"
                      ? "text-amber-300"
                      : "text-rose-300"
                }`}
              />
              <span className="text-xs font-bold text-slate-200">
                Avance del mes
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {fmtExact(paid)} <span className="text-slate-600">/</span>{" "}
              {fmtExact(expected)}
            </span>
          </div>
          <div className="h-3 bg-slate-700/70 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                background:
                  healthLevel === "good"
                    ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                    : healthLevel === "warning"
                      ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                      : "linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)",
              }}
            />
          </div>
          {progressPct < 100 && remaining > 0 && (
            <p className="text-[11px] text-slate-500 mt-2">
              Te faltan <span className="text-amber-300 font-bold">{fmt(remaining)}</span>
              {" "}para cubrir los compromisos del mes.
            </p>
          )}
          {progressPct >= 100 && (
            <p className="text-[11px] text-emerald-300 font-bold mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mes cubierto — vas en buen ritmo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Proximos 7 dias */}
      {upcoming.length > 0 && (
        <Card className="bg-slate-800 border border-slate-700">
          <CardContent className="p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-300" />
              Proximos 7 dias
            </h4>
            <div className="space-y-2">
              {upcoming.slice(0, 5).map((p) => {
                const isToday = p.daysUntilDue === 0;
                const isUrgent = p.daysUntilDue <= 2;
                return (
                  <div
                    key={p.debtId}
                    className="flex items-center justify-between gap-2 py-2 border-b border-slate-700/40 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-7 h-7 rounded-lg ring-1 flex items-center justify-center text-sm shrink-0"
                        style={{
                          backgroundColor: (p.color ?? "#fb7185") + "22",
                          borderColor: p.color ?? "#fb7185",
                        }}
                      >
                        {p.icon ?? "💳"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-white truncate">
                          {p.creditorName} · {p.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDay(p.nextDueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.installmentAmount != null && (
                        <span className="text-[12px] font-bold text-rose-300">
                          {fmt(p.installmentAmount)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isToday
                            ? "bg-rose-500/20 border border-rose-400/40 text-rose-200"
                            : isUrgent
                              ? "bg-amber-500/20 border border-amber-400/40 text-amber-200"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {isToday ? "Hoy" : `${p.daysUntilDue}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcoming.length > 5 && (
                <p className="text-[10px] text-slate-500 text-center pt-1">
                  + {upcoming.length - 5} mas en los proximos 7 dias
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta si la salud es danger */}
      {healthLevel === "danger" && progressPct < 100 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-bold text-rose-200">
              Vas atrasado este mes
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Solo has cubierto {progressPct}% de los compromisos. Considera
              separar{" "}
              <span className="text-amber-300 font-bold">
                {fmt(s.ahorroDiarioSugerido ?? 0)} diarios
              </span>{" "}
              para llegar al fin de mes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
