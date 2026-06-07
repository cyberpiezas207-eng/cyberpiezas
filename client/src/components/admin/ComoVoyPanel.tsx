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
  Bug,
  LifeBuoy,
  Trophy,
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
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const listQuery = trpc.personalExpenses.expenses.list.useQuery({
    year,
    month,
    limit: 200,
  });
  const walletsQuery = trpc.personalWallets.wallets.list.useQuery();

  const overview = overviewQuery.data;
  const sum = sumQuery.data;
  const dash = dashQuery.data;
  const debts = (debtsQuery.data ?? []) as any[];
  const expenses = (listQuery.data ?? []) as any[];
  const wallets = (walletsQuery.data ?? []) as any[];

  const isLoading =
    overviewQuery.isLoading ||
    sumQuery.isLoading ||
    dashQuery.isLoading ||
    debtsQuery.isLoading ||
    listQuery.isLoading ||
    walletsQuery.isLoading;

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

  // ----- Que paso este mes (lo que mas peso) -----
  const topCat = dash?.topCategory ?? null;
  const topStore = dash?.topStore ?? null;

  // ----- Que no (compromisos que vencieron sin cubrir este mes) -----
  function todayYmdMx(): string {
    const d = nowMexico();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const todayYmd = todayYmdMx();
  const overdue = debts.filter((d) => {
    if (typeof d.nextDueDate !== "string" || d.nextDueDate.length < 10)
      return false;
    const [y, m] = d.nextDueDate.split("-").map(Number);
    return y === year && m === month && d.nextDueDate < todayYmd;
  });
  const overdueSum = overdue.reduce(
    (acc, d) => acc + toNum(d.installmentAmount),
    0,
  );
  const todoEnOrden = falta <= 0 && overdue.length === 0;

  // ----- Gasto hormiga (compras chicas que se repiten) -----
  const HORMIGA_MAX = 120; // monto maximo por compra para contar como hormiga
  const HORMIGA_MIN_VECES = 3; // minimo de repeticiones
  const hormigaGroups = new Map<
    string,
    { label: string; count: number; sum: number }
  >();
  for (const e of expenses) {
    const amt = toNum(e.amount);
    if (amt <= 0 || amt > HORMIGA_MAX) continue;
    const key = String(e.normalizedDescription || e.description || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const g = hormigaGroups.get(key) ?? {
      label: e.description || key,
      count: 0,
      sum: 0,
    };
    g.count += 1;
    g.sum += amt;
    hormigaGroups.set(key, g);
  }
  const hormigas = [...hormigaGroups.values()]
    .filter((g) => g.count >= HORMIGA_MIN_VECES)
    .sort((a, b) => b.sum - a.sum);
  const hormigaTotal = hormigas.reduce((s, g) => s + g.sum, 0);
  const topHormigas = hormigas.slice(0, 4);

  // ----- Racha: meses seguidos en verde (balance positivo) -----
  // Usa el historial mensual (trend). Cuenta hacia atras desde el mas reciente.
  const trendBalances = (overview?.trend ?? []).map((t: any) =>
    toNum(t.balance),
  );
  let racha = 0;
  for (let i = trendBalances.length - 1; i >= 0; i--) {
    if (trendBalances[i] >= 0) racha += 1;
    else break;
  }

  // ----- Colchon de meses (cuanto aguantas sin que entre dinero) -----
  const totalGuardado = wallets.reduce(
    (acc, w) => acc + toNum(w.balance),
    0,
  );
  // Gasto mensual promedio: promedio de los meses con gasto del historial.
  // Si no hay historial, usamos el gasto de este mes como referencia.
  const trendExp = (overview?.trend ?? [])
    .map((t: any) => toNum(t.personalExpenses))
    .filter((n: number) => n > 0);
  const gastoMensualProm =
    trendExp.length > 0
      ? trendExp.reduce((a: number, b: number) => a + b, 0) / trendExp.length
      : toNum(dash?.total);
  const hayBolsillos = wallets.length > 0;
  const colchonMeses =
    gastoMensualProm > 0 ? totalGuardado / gastoMensualProm : null;

  let colchonKind: "good" | "warning" | "danger" = "good";
  if (colchonMeses != null) {
    if (colchonMeses < 1) colchonKind = "danger";
    else if (colchonMeses < 3) colchonKind = "warning";
  }
  const colchonStyles = {
    good: { text: "text-emerald-300", border: "border-emerald-500/25", bg: "bg-emerald-500/[0.06]" },
    warning: { text: "text-amber-300", border: "border-amber-500/25", bg: "bg-amber-500/[0.06]" },
    danger: { text: "text-rose-300", border: "border-rose-500/25", bg: "bg-rose-500/[0.06]" },
  };
  const cs = colchonStyles[colchonKind];
  const colchonTexto =
    colchonMeses == null
      ? ""
      : colchonMeses < 1
        ? `Te alcanza para menos de un mes. Vale la pena engordar el colchon.`
        : `Aguantas ~${colchonMeses.toFixed(1)} mes${colchonMeses >= 2 ? "es" : ""} sin que entre dinero.`;

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700/60 ring-1 ring-slate-600 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Como voy este mes</h3>
          </div>
          {racha >= 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-[11px] font-bold">
              <Trophy className="w-3 h-3" />
              {racha} mes{racha === 1 ? "" : "es"} en verde
            </span>
          )}
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

        {/* Que paso / que no */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Que paso */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Que paso este mes
            </p>
            {topCat || topStore ? (
              <div className="space-y-1.5">
                {topCat && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 truncate">
                      Mas gastaste en{" "}
                      <span className="font-bold text-slate-100">
                        {topCat.name}
                      </span>
                    </span>
                    <span className="text-xs font-black tabular-nums text-slate-200 shrink-0">
                      {fmt(toNum(topCat.total))}
                    </span>
                  </div>
                )}
                {topStore && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 truncate">
                      Tienda top{" "}
                      <span className="font-bold text-slate-100">
                        {topStore.name}
                      </span>
                    </span>
                    <span className="text-xs font-black tabular-nums text-slate-200 shrink-0">
                      {fmt(toNum(topStore.total))}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aun sin gastos este mes.</p>
            )}
          </div>

          {/* Que no */}
          <div
            className={`p-3 rounded-xl border ${
              todoEnOrden
                ? "bg-emerald-500/[0.06] border-emerald-500/25"
                : "bg-rose-500/[0.06] border-rose-500/25"
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                todoEnOrden ? "text-emerald-300/80" : "text-rose-300/80"
              }`}
            >
              Que no
            </p>
            {todoEnOrden ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <p className="text-xs text-emerald-200">
                  Todo en orden, nada pendiente.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {overdue.length > 0 && (
                  <p className="text-xs text-rose-200">
                    <span className="font-black">{overdue.length}</span> pago
                    {overdue.length === 1 ? "" : "s"} vencido
                    {overdue.length === 1 ? "" : "s"} ({fmt(overdueSum)}).
                  </p>
                )}
                {falta > 0 && (
                  <p className="text-xs text-slate-300">
                    Faltan <span className="font-bold">{fmt(falta)}</span> de
                    compromisos por cubrir.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Gasto hormiga */}
        {hormigas.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-amber-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Gasto hormiga
                </span>
              </div>
              <span className="text-sm font-black tabular-nums text-amber-200">
                {fmt(hormigaTotal)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Compras chicas que repites y sumadas pesan:
            </p>
            <div className="space-y-1">
              {topHormigas.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-slate-300 truncate capitalize">
                    {g.label}
                    <span className="text-slate-500">
                      {" "}
                      · {g.count} veces
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-slate-200 shrink-0">
                    {fmt(g.sum)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Colchon de meses */}
        <div className={`mt-3 p-3 rounded-xl ${cs.bg} border ${cs.border}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <LifeBuoy className={`w-4 h-4 ${cs.text}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cs.text}`}>
                Colchon
              </span>
            </div>
            {hayBolsillos && colchonMeses != null && (
              <span className={`text-lg font-black tabular-nums ${cs.text}`}>
                {colchonMeses < 1
                  ? "< 1 mes"
                  : `${colchonMeses.toFixed(1)} meses`}
              </span>
            )}
          </div>
          {!hayBolsillos ? (
            <p className="text-xs text-slate-400">
              Crea tu primer bolsillo para activar el colchon.
            </p>
          ) : colchonMeses == null ? (
            <p className="text-xs text-slate-400">
              Captura gastos para estimar cuanto te dura lo guardado.
            </p>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              {colchonTexto}{" "}
              <span className="text-slate-500">
                ({fmt(totalGuardado)} guardado / {fmt(gastoMensualProm)} al mes)
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
