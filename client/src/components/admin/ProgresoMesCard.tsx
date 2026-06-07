import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Flame, ListChecks } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function dueAmountFor(d: any): number {
  const inst = d.installmentAmount ? Number(d.installmentAmount) : 0;
  if (inst > 0) return inst;
  return Number(d.currentBalance ?? 0);
}

// ----------------------------------------------------------------------------
// PROGRESO DEL MES - tarjeta resumen de avance (solo frontend)
// ----------------------------------------------------------------------------
// Muestra de un vistazo:
//   - Barra de dinero: cuanto se ha cubierto del total del mes
//   - Cuantas deudas vencen este mes
//   - "Los grandes del mes": las 2 deudas con cuota mas alta del mes y que
//     porcentaje del total representan (para que sepas que pesa mas).
// Usa monthSummary + la lista de deudas (datos ya disponibles, sin backend).
// ----------------------------------------------------------------------------

function ProgresoMesCard({
  year,
  month,
  debts,
}: {
  year: number;
  month: number;
  debts: any[];
}) {
  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const s = sumQuery.data;

  const totalMes = s?.expectedThisMonth ?? 0;
  const falta = s?.pendingThisMonth ?? 0;
  const cubierto = Math.max(0, totalMes - falta);
  const pctDinero =
    totalMes > 0 ? Math.min(100, Math.round((cubierto / totalMes) * 100)) : 0;

  // Deudas que vencen este mes (nextDueDate dentro del mes visto)
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const first = `${year}-${mm}-01`;
  const last = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const delMes = debts.filter((d) => {
    const ymd = d.nextDueDate;
    if (!ymd || typeof ymd !== "string") return false;
    return ymd >= first && ymd <= last;
  });

  // Los grandes del mes: top 2 por monto de cuota del mes
  const grandes = [...delMes]
    .sort((a, b) => dueAmountFor(b) - dueAmountFor(a))
    .slice(0, 2);
  const sumaGrandes = grandes.reduce((acc, d) => acc + dueAmountFor(d), 0);
  const pctGrandes =
    totalMes > 0 ? Math.round((sumaGrandes / totalMes) * 100) : 0;

  if (sumQuery.isLoading) {
    return (
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 animate-pulse h-[150px]" />
    );
  }

  // Si no hay nada del mes, no mostrar la tarjeta (evita ruido)
  if (totalMes <= 0) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-slate-800 to-slate-800/90 border border-amber-500/30 shadow-lg">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <CardContent className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-amber-200" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                Progreso de {MONTHS_ES[month - 1]}
              </p>
              <p className="text-sm font-bold text-white">
                {delMes.length} compromiso{delMes.length === 1 ? "" : "s"} este mes
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-black text-amber-200 tabular-nums leading-none">
              {fmt(falta)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">por cubrir</p>
          </div>
        </div>

        {/* Barra de dinero */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-300 font-semibold inline-flex items-center gap-1">
              <ListChecks className="w-3 h-3 text-emerald-300" />
              Dinero cubierto
            </span>
            <span className="text-slate-400 tabular-nums">
              {fmt(cubierto)}{" "}
              <span className="text-slate-600">de {fmt(totalMes)}</span>
            </span>
          </div>
          <div className="h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pctDinero}%`,
                background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
            {pctDinero}% del mes cubierto
          </p>
        </div>

        {/* Los grandes del mes */}
        {grandes.length > 0 && sumaGrandes > 0 && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
            <span className="w-8 h-8 rounded-lg bg-rose-500/15 ring-1 ring-rose-400/30 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-rose-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-rose-300/80 mb-0.5">
                Los grandes del mes
              </p>
              <p className="text-xs text-slate-200 leading-snug">
                {grandes
                  .map(
                    (d) =>
                      `${d.creditorName} ${fmt(dueAmountFor(d))}`,
                  )
                  .join(" · ")}
              </p>
              {pctGrandes > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Juntos son el {pctGrandes}% de lo del mes
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProgresoMesCard;
