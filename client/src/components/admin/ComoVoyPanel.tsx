// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/ComoVoyPanel.tsx <<<
// ============================================================================
// COMO VOY ESTE MES - semaforo + proyeccion de cierre
// ----------------------------------------------------------------------------
// Panel de un vistazo que responde "como voy este mes":
//   - Semaforo: verde / amarillo / rojo segun si puedes cubrir tus
//     compromisos (deudas esperadas) con lo que te queda (balance).
//   - Proyeccion de cierre: a tu ritmo de gasto, cuanto cierras el mes.
//
// REGLA CLAVE:
//   - Usa endpoints existentes (sin backend nuevo):
//       personalFinanceOverview.getOverview
//       personalDebts.stats.monthSummary
//       personalExpenses.stats.dashboard
//   - Solo lectura. Se calcula sobre el mes ACTUAL.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}

type Light = "green" | "amber" | "red";

export default function ComoVoyPanel() {
  const now = nowMexico();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const overviewQuery = trpc.personalFinanceOverview.getOverview.useQuery();
  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const dashQuery = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });

  const overview = overviewQuery.data;
  const sum = sumQuery.data;
  const dash = dashQuery.data;

  const isLoading =
    overviewQuery.isLoading || sumQuery.isLoading || dashQuery.isLoading;

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="h-24 rounded-lg bg-slate-700/30 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // ----- Semaforo -----
  const balance = toNum(overview?.currentMonth?.balanceAfterExpenses);
  const expected = toNum(sum?.expectedThisMonth);
  const paid = toNum(sum?.paymentsThisMonth);
  const falta = Math.max(0, expected - paid);

  let light: Light;
  let title: string;
  let message: string;

  if (falta <= 0) {
    light = "green";
    title = "Vas al corriente";
    message =
      expected > 0
        ? "Ya cubriste tus compromisos del mes. Buen trabajo."
        : "Sin compromisos pendientes este mes.";
  } else if (balance >= falta) {
    light = "green";
    title = "Vas bien";
    message = `Te alcanza para cubrir lo que falta (${fmt(falta)}).`;
  } else if (balance > 0) {
    light = "amber";
    title = "Cuidado";
    message = `Te alcanza para una parte. Falta juntar ${fmt(falta - balance)} para cubrir todo.`;
  } else {
    light = "red";
    title = "Vas corto";
    message = `Este mes lo que queda no cubre los ${fmt(falta)} de compromisos. Prioriza lo vencido.`;
  }

  const lightStyles: Record<
    Light,
    { dot: string; ring: string; text: string; border: string; bg: string; Icon: any }
  > = {
    green: {
      dot: "bg-emerald-400",
      ring: "ring-emerald-400/40",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/[0.07]",
      Icon: CheckCircle2,
    },
    amber: {
      dot: "bg-amber-400",
      ring: "ring-amber-400/40",
      text: "text-amber-300",
      border: "border-amber-500/30",
      bg: "bg-amber-500/[0.07]",
      Icon: AlertTriangle,
    },
    red: {
      dot: "bg-rose-500",
      ring: "ring-rose-400/40",
      text: "text-rose-300",
      border: "border-rose-500/30",
      bg: "bg-rose-500/[0.07]",
      Icon: AlertTriangle,
    },
  };
  const s = lightStyles[light];
  const LightIcon = s.Icon;

  // ----- Proyeccion de cierre (gastos) -----
  const spentSoFar = toNum(dash?.total);
  const avgDaily = toNum(dash?.avgDaily);
  const daysRemaining = toNum(sum?.remainingDaysInMonth);
  const projected = spentSoFar + avgDaily * daysRemaining;
  const prevTotal = toNum(dash?.vsLastMonth?.prevTotal);
  const projVsPrev =
    prevTotal > 0 ? projected - prevTotal : null;

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700/60 ring-1 ring-slate-600 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Como voy este mes</h3>
        </div>

        {/* Semaforo */}
        <div className={`p-3.5 rounded-xl ${s.bg} border ${s.border} flex items-start gap-3`}>
          <span
            className={`mt-0.5 w-3.5 h-3.5 rounded-full shrink-0 ${s.dot} ring-4 ${s.ring}`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <LightIcon className={`w-4 h-4 ${s.text}`} />
              <p className={`text-sm font-black ${s.text}`}>{title}</p>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Proyeccion de cierre */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Proyeccion de cierre
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                A tu ritmo, cierras el mes gastando
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums text-slate-100">
                ~{fmt(projected)}
              </p>
              {projVsPrev != null && (
                <p
                  className={`text-[11px] font-bold flex items-center gap-1 justify-end ${
                    projVsPrev > 0 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {projVsPrev > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {projVsPrev > 0 ? "+" : ""}
                  {fmt(projVsPrev)} vs mes pasado
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
