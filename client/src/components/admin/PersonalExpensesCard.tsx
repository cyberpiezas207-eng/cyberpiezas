// ============================================================================
// TARJETA "Mis Gastos del mes" - va dentro de la pestana Operaciones
// ----------------------------------------------------------------------------
// Datos personales del hogar, separados del negocio. Coral = sale dinero.
// Usa el patron del proyecto: trpc de @/lib/trpc, Card/Button de ui, lucide.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// Morelos = UTC-6 todo el ano
function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

interface Props {
  onOpen?: () => void;
}

export default function PersonalExpensesCard({ onOpen }: Props) {
  const now = nowMexico();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, isLoading } = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });

  const total = data?.total ?? 0;
  const top = data?.topCategory ?? null;
  const pct = data?.vsLastMonth?.pct ?? null;
  const wentUp = pct !== null && pct > 0;

  return (
    <Card className="bg-slate-800 border border-orange-500/30 shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Mis gastos del mes
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300/80">
                Personal · separado del negocio
              </span>
            </div>
          </div>
          <Button
            onClick={onOpen}
            className="bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-full h-9"
          >
            Ver detalle
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-4 h-9 w-40 bg-slate-700/50 rounded-lg animate-pulse" />
        ) : (
          <div className="mt-4">
            <div className="text-3xl font-bold text-orange-400">{fmt(total)}</div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm">
              {top && top.total > 0 ? (
                <span className="text-slate-300">
                  Mayor gasto:{" "}
                  <span className="font-semibold">
                    {top.icon} {top.name}
                  </span>{" "}
                  · {fmt(top.total)}
                </span>
              ) : (
                <span className="text-slate-400">Aun no hay gastos este mes</span>
              )}
              {pct !== null && (
                <span
                  className={
                    "flex items-center gap-1 " +
                    (wentUp ? "text-rose-400" : "text-emerald-400")
                  }
                >
                  {wentUp ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(pct)}% vs mes anterior
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
