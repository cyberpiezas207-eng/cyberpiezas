// ============================================================================
// SECCION "Deudas liquidadas" (trofeos)
// ----------------------------------------------------------------------------
// Muestra todas las deudas con status=paid como trofeos psicologicos.
// Banner con stats agregados (count + total liquidado).
// Cada trofeo es una mini-card con: icono, creditor, titulo, total pagado,
// fecha de ultimo pago, info de activo vendido si aplica.
//
// Auto-oculta si no hay liquidadas. Self-contained.
// Color tema emerald/gold para celebrar progreso.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Check, Tag } from "lucide-react";

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

const MONTHS_ES_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDate(ymd: string | null): string {
  if (!ymd) return "—";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTHS_ES_SHORT[monthIdx] ?? parts[1];
  return `${parts[2]} ${monthName} ${parts[0]}`;
}

export default function PaidDebtsSection() {
  const listQuery = trpc.personalDebts.stats.paidList.useQuery();
  const statsQuery = trpc.personalDebts.stats.paidStats.useQuery();

  const paid = listQuery.data ?? [];
  const stats = statsQuery.data;

  // Auto-oculta si no hay liquidadas
  if (listQuery.isLoading || paid.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Banner premium con stats */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950/60" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl" />

        <div className="relative p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center text-2xl shrink-0">
                🏆
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-1">
                  <Trophy className="w-3 h-3 text-emerald-300" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                    Archivo de trofeos
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Deudas liquidadas
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {stats?.count ?? 0} deuda
                  {(stats?.count ?? 0) === 1 ? "" : "s"} eliminada
                  {(stats?.count ?? 0) === 1 ? "" : "s"} de tu vida
                </p>
              </div>
            </div>

            {/* Mini-stats */}
            <div className="flex gap-3">
              {stats && stats.totalLiquidated > 0 && (
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold">
                    Total liquidado
                  </div>
                  <div className="text-base font-black text-emerald-200 leading-tight mt-0.5">
                    {fmt(stats.totalLiquidated)}
                  </div>
                </div>
              )}
              {stats && stats.countThisYear > 0 && (
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
                  <div className="text-[9px] uppercase tracking-wider text-yellow-200 font-bold">
                    Este año
                  </div>
                  <div className="text-base font-black text-yellow-100 leading-tight mt-0.5">
                    {stats.countThisYear}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de trofeos */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="space-y-3">
            {paid.map((debt) => {
              const soldPrice = debt.assetSoldPrice ?? null;
              const original = debt.originalAmount ?? null;
              const gainLoss =
                soldPrice != null && original != null
                  ? soldPrice - original
                  : null;
              const wasMsi = debt.installmentPlanType === "msi";

              return (
                <div
                  key={debt.id}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-emerald-500/20 p-4"
                >
                  {/* Check verde flotante (esquina) */}
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-300" />
                  </div>

                  <div className="flex items-start gap-3">
                    <span
                      className="w-10 h-10 rounded-xl ring-1 flex items-center justify-center text-lg shrink-0"
                      style={{
                        backgroundColor: (debt.color ?? "#10b981") + "22",
                        borderColor: debt.color ?? "#10b981",
                      }}
                    >
                      {debt.icon ?? "🏆"}
                    </span>

                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm font-bold text-white truncate">
                        {debt.creditorName} · {debt.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]">
                        <span className="text-slate-400">
                          {debt.paymentsCount} pago
                          {debt.paymentsCount === 1 ? "" : "s"}
                        </span>
                        {debt.lastPaymentDate && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">
                              Liquidada {formatDate(debt.lastPaymentDate)}
                            </span>
                          </>
                        )}
                        {wasMsi && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30">
                              MSI
                            </span>
                          </>
                        )}
                      </div>

                      {/* Info de activo si aplica */}
                      {debt.linkedAssetName && (
                        <div className="mt-2 pt-2 border-t border-slate-700/60">
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {debt.assetStatus === "sold" ? (
                              <>
                                <Tag className="w-3 h-3 text-orange-300" />
                                <span className="text-orange-300 font-bold">
                                  {debt.linkedAssetName} vendido
                                </span>
                                {soldPrice != null && (
                                  <span className="text-slate-300">
                                    por {fmt(soldPrice)}
                                  </span>
                                )}
                                {gainLoss != null && (
                                  <span
                                    className={`font-bold ${gainLoss < 0 ? "text-rose-300" : "text-emerald-300"}`}
                                  >
                                    {gainLoss >= 0 ? "+" : ""}
                                    {fmt(gainLoss)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-indigo-300">
                                🎮 {debt.linkedAssetName} (te lo quedaste)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Total pagado</span>
                        <span className="text-emerald-300 font-bold text-sm">
                          {fmtExact(debt.totalPaid)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer celebratorio */}
          {stats && stats.count >= 3 && (
            <p className="text-[11px] text-center text-emerald-300 mt-4 font-bold">
              Sigues subiendo. Cada deuda liquidada es libertad ganada. 🚀
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
