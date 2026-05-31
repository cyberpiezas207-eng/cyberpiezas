// ============================================================================
// PANEL "Insights inteligentes" del modulo Deudas
// ----------------------------------------------------------------------------
// Aplica 10 reglas deterministicas en el backend y muestra hasta 6 insights
// ordenados por prioridad. Cada insight tiene:
//   - icon (emoji)
//   - title (corto, accion-oriented)
//   - description (1 linea de contexto)
//   - type que determina color: positive | warning | alert | info
//
// Auto-oculta si no hay insights. Self-contained.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const TYPE_STYLES: Record<
  string,
  { cardBg: string; border: string; iconBg: string; iconText: string; titleText: string }
> = {
  positive: {
    cardBg: "from-emerald-950/40 via-slate-800 to-slate-800/90",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-200",
    titleText: "text-emerald-100",
  },
  warning: {
    cardBg: "from-amber-950/40 via-slate-800 to-slate-800/90",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconText: "text-amber-200",
    titleText: "text-amber-100",
  },
  alert: {
    cardBg: "from-rose-950/40 via-slate-800 to-slate-800/90",
    border: "border-rose-500/40",
    iconBg: "bg-rose-500/20",
    iconText: "text-rose-200",
    titleText: "text-rose-100",
  },
  info: {
    cardBg: "from-indigo-950/40 via-slate-800 to-slate-800/90",
    border: "border-indigo-500/30",
    iconBg: "bg-indigo-500/20",
    iconText: "text-indigo-200",
    titleText: "text-indigo-100",
  },
};

interface Props {
  year: number;
  month: number;
}

export default function DebtInsightsPanel({ year, month }: Props) {
  const query = trpc.personalDebts.stats.insights.useQuery({ year, month });
  const insights = query.data ?? [];

  // Auto-oculta si vacio
  if (query.isLoading || insights.length === 0) return null;

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">
            Insights del mes
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 font-bold">
            Inteligente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {insights.map((ins) => {
            const styles = TYPE_STYLES[ins.type] ?? TYPE_STYLES.info;
            return (
              <div
                key={ins.id}
                className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${styles.cardBg} border ${styles.border}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${styles.iconBg} ring-1 ring-white/10 flex items-center justify-center text-lg shrink-0`}
                >
                  {ins.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${styles.titleText} leading-tight`}>
                    {ins.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {ins.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
