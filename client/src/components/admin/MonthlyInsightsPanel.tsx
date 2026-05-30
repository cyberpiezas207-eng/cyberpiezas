// ============================================================================
// PANEL "Resumen del mes" - insights inteligentes
// ----------------------------------------------------------------------------
// Muestra los insights generados por el motor de reglas (backend).
// Cada insight es una mini-card con icono en circulo tinted, color segun tipo:
//   positive (verde)  - logros
//   warning (naranja) - cuidados
//   alert (rojo)      - urgentes
//   info (indigo)     - datos neutrales
// Top 6 visibles + "Ver mas" si hay mas.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  year: number;
  month: number;
}

type InsightType = "positive" | "warning" | "alert" | "info";

// Estilos por tipo de insight
const TYPE_STYLES: Record<
  InsightType,
  {
    cardBg: string;
    border: string;
    iconBg: string;
    iconRing: string;
    titleColor: string;
    glowBg: string;
  }
> = {
  positive: {
    cardBg: "from-emerald-950/50 via-slate-800 to-slate-800/90",
    border: "border-emerald-500/40 hover:border-emerald-400/60",
    iconBg: "bg-emerald-500/20",
    iconRing: "ring-emerald-400/30",
    titleColor: "text-emerald-100",
    glowBg: "bg-emerald-500/10",
  },
  warning: {
    cardBg: "from-orange-950/50 via-slate-800 to-slate-800/90",
    border: "border-orange-500/40 hover:border-orange-400/60",
    iconBg: "bg-orange-500/20",
    iconRing: "ring-orange-400/30",
    titleColor: "text-orange-100",
    glowBg: "bg-orange-500/10",
  },
  alert: {
    cardBg: "from-rose-950/50 via-slate-800 to-slate-800/90",
    border: "border-rose-500/40 hover:border-rose-400/60",
    iconBg: "bg-rose-500/20",
    iconRing: "ring-rose-400/30",
    titleColor: "text-rose-100",
    glowBg: "bg-rose-500/10",
  },
  info: {
    cardBg: "from-indigo-950/50 via-slate-800 to-slate-800/90",
    border: "border-indigo-500/40 hover:border-indigo-400/60",
    iconBg: "bg-indigo-500/20",
    iconRing: "ring-indigo-400/30",
    titleColor: "text-indigo-100",
    glowBg: "bg-indigo-500/10",
  },
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const VISIBLE_DEFAULT = 6;

export default function MonthlyInsightsPanel({ year, month }: Props) {
  const [expanded, setExpanded] = useState(false);

  const query = trpc.personalMonthlyInsights.get.useQuery({ year, month });

  const insights = query.data?.insights ?? [];
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;

  // Si no hay insights, no mostramos nada (oculta el panel)
  if (query.isFetched && insights.length === 0) {
    return null;
  }

  const visible = expanded ? insights : insights.slice(0, VISIBLE_DEFAULT);
  const hasMore = insights.length > VISIBLE_DEFAULT;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 shadow-2xl">
      {/* Fondo premium con orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900" />
      <div className="absolute -top-20 -right-12 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-12 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                  Inteligente
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight leading-tight">
                Resumen de {monthLabel}
              </h3>
            </div>
          </div>
          {insights.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {insights.length} {insights.length === 1 ? "dato" : "datos"}
            </span>
          )}
        </div>

        {/* Loading */}
        {query.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-800/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Insights grid */}
        {!query.isLoading && visible.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map((insight) => {
                const styles =
                  TYPE_STYLES[insight.type as InsightType] ?? TYPE_STYLES.info;
                return (
                  <Card
                    key={insight.id}
                    className={`relative overflow-hidden bg-gradient-to-br ${styles.cardBg} border ${styles.border} shadow-md transition-all duration-200`}
                  >
                    <div
                      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl ${styles.glowBg}`}
                    />
                    <CardContent className="relative p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl ${styles.iconBg} ring-1 ${styles.iconRing} flex items-center justify-center text-lg shrink-0`}
                        >
                          {insight.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold ${styles.titleColor} leading-snug`}
                          >
                            {insight.title}
                          </p>
                          {insight.detail && (
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {insight.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Ver mas / Ver menos */}
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold transition-all"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Ver {insights.length - VISIBLE_DEFAULT} más
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
