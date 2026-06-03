// ============================================================================
// DEBT STRATEGIES PANEL - "Estrategias de liquidacion"
// ----------------------------------------------------------------------------
// Cuando tienes 2+ deudas activas, te ayuda a decidir a cual atacar primero
// mostrando 3 estrategias clasicas con sus pros/contras:
//
//   1. BOLA DE NIEVE (snowball) - menor saldo restante primero
//      Pro: victoria rapida, motivacion psicologica
//      Para: gente que necesita ver progreso rapido
//
//   2. PRESION MENSUAL - mayor cuota mensual primero
//      Pro: libera mas flujo de caja cuando termina
//      Para: gente con presion mensual fuerte
//
//   3. MINIMO SEGURO - solo paga lo obligatorio, no acelera
//      Pro: cero riesgo financiero
//      Para: gente con margen apretado
//
// REGLAS:
//   - Si hay menos de 2 deudas activas, el panel se OCULTA (cero ruido)
//   - Es informativo: NO modifica nada en la BD
//   - Click en una estrategia abre el modal de edicion de esa deuda
//
// Avalancha (mayor interes primero) NO se implementa porque el schema
// actual no tiene tasas de interes. Pendiente para un commit futuro.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Snowflake,
  Zap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}

// ----------------------------------------------------------------------------
// Estrategias - calculan la deuda recomendada
// ----------------------------------------------------------------------------

function getSnowballTarget(debts: any[]): any | null {
  if (debts.length === 0) return null;
  return [...debts]
    .filter((d) => toNum(d.currentBalance) > 0)
    .sort((a, b) => toNum(a.currentBalance) - toNum(b.currentBalance))[0] ?? null;
}

function getPressureTarget(debts: any[]): any | null {
  if (debts.length === 0) return null;
  return [...debts]
    .filter((d) => toNum(d.installmentAmount ?? 0) > 0)
    .sort(
      (a, b) =>
        toNum(b.installmentAmount ?? 0) - toNum(a.installmentAmount ?? 0),
    )[0] ?? null;
}

// ----------------------------------------------------------------------------
// Tarjeta individual de estrategia
// ----------------------------------------------------------------------------

interface StrategyCardProps {
  icon: any;
  title: string;
  philosophy: string;
  targetLabel?: string;
  targetCreditor?: string;
  targetMetric?: string;
  microcopy: string;
  color: "indigo" | "amber" | "slate";
  recommended?: boolean;
  onSelect?: () => void;
}

function StrategyCard({
  icon: Icon,
  title,
  philosophy,
  targetLabel,
  targetCreditor,
  targetMetric,
  microcopy,
  color,
  recommended = false,
  onSelect,
}: StrategyCardProps) {
  const palette = {
    indigo: {
      bg: "bg-gradient-to-br from-indigo-950/50 via-slate-800 to-slate-800/80",
      border: recommended ? "border-indigo-400/60" : "border-indigo-500/30",
      iconBg: "bg-indigo-500/20",
      iconRing: "ring-indigo-400/50",
      iconColor: "text-indigo-200",
      titleColor: "text-indigo-100",
      glow: "bg-indigo-500/10",
      buttonClass: "border-indigo-500/40 text-indigo-100 hover:bg-indigo-500/20",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-950/50 via-slate-800 to-slate-800/80",
      border: recommended ? "border-amber-400/60" : "border-amber-500/30",
      iconBg: "bg-amber-500/20",
      iconRing: "ring-amber-400/50",
      iconColor: "text-amber-200",
      titleColor: "text-amber-100",
      glow: "bg-amber-500/10",
      buttonClass: "border-amber-500/40 text-amber-100 hover:bg-amber-500/20",
    },
    slate: {
      bg: "bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900",
      border: recommended ? "border-slate-400/60" : "border-slate-700",
      iconBg: "bg-slate-700",
      iconRing: "ring-slate-600",
      iconColor: "text-slate-200",
      titleColor: "text-slate-100",
      glow: "bg-slate-500/10",
      buttonClass: "border-slate-600 text-slate-200 hover:bg-slate-700",
    },
  };
  const p = palette[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${p.bg} border ${p.border} p-4 shadow-md ${recommended ? "ring-2 ring-emerald-400/30" : ""}`}
    >
      {/* Glow decorativo */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 ${p.glow} rounded-full blur-2xl`}
      />

      {/* Badge recomendado */}
      {recommended && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50">
            <Target className="w-2.5 h-2.5" />
            Recomendada
          </span>
        </div>
      )}

      <div className="relative">
        {/* Header con icono */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-10 h-10 rounded-lg ${p.iconBg} ring-2 ${p.iconRing} flex items-center justify-center shrink-0 shadow-md`}
          >
            <Icon className={`w-5 h-5 ${p.iconColor}`} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h4
              className={`text-sm font-black uppercase tracking-wider ${p.titleColor}`}
            >
              {title}
            </h4>
          </div>
        </div>

        {/* Filosofia */}
        <p className="text-[11px] italic text-slate-400 mb-3 leading-snug">
          {philosophy}
        </p>

        {/* Target (deuda recomendada) */}
        {targetCreditor ? (
          <div className="mb-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              {targetLabel || "Ataca primero"}
            </p>
            <p className="text-sm font-bold text-slate-100 truncate">
              {targetCreditor}
            </p>
            {targetMetric && (
              <p className="text-xs font-black tabular-nums text-amber-200 mt-0.5">
                {targetMetric}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/50">
            <p className="text-[11px] italic text-slate-500">
              Mantén pagos al día
            </p>
          </div>
        )}

        {/* Microcopy */}
        <p className="text-[11px] text-slate-300 leading-snug mb-3">
          {microcopy}
        </p>

        {/* Botón */}
        {onSelect && targetCreditor && (
          <Button
            onClick={onSelect}
            size="sm"
            variant="outline"
            className={`w-full h-8 text-[11px] font-bold ${p.buttonClass}`}
          >
            Ver detalle
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function DebtStrategiesPanel({
  onEdit,
}: {
  onEdit: (debtId: number) => void;
}) {
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });

  const debts = (debtsQuery.data ?? []) as any[];

  // Filtrar solo deudas con saldo > 0
  const activeDebts = debts.filter((d) => toNum(d.currentBalance) > 0);

  // REGLA CLAVE: si hay menos de 2 deudas activas, ocultar el panel
  // (no tiene sentido comparar estrategias sin alternativas)
  if (activeDebts.length < 2) {
    return null;
  }

  // Calcular targets de cada estrategia
  const snowballTarget = getSnowballTarget(activeDebts);
  const pressureTarget = getPressureTarget(activeDebts);

  // Calcular flujo liberable si terminas la deuda de presion mensual
  const pressureLiberateMonthly = pressureTarget
    ? toNum(pressureTarget.installmentAmount)
    : 0;

  // Mensajes contextuales
  const snowballMicrocopy = snowballTarget
    ? `Si liquidas ${snowballTarget.creditorName} pronto (${fmt(toNum(snowballTarget.currentBalance))}) sientes una victoria que motiva atacar la siguiente.`
    : "Sin deudas que liquidar.";

  const pressureMicrocopy = pressureTarget
    ? `Liquidar ${pressureTarget.creditorName} libera ${fmt(pressureLiberateMonthly)} cada mes para otras prioridades.`
    : "Sin deudas que liberar.";

  const minimumMicrocopy =
    "Si tu margen mensual es justo, paga lo obligatorio y no aceleres. Sin riesgo de quedarte sin liquidez.";

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-300" />
            <h3 className="text-sm font-bold text-slate-200">
              Estrategias de liquidacion
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            {activeDebts.length} deudas activas · elige a cual atacar primero
          </span>
        </div>

        {/* Grid 3 estrategias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Bola de nieve - RECOMENDADA (orden 1) */}
          <StrategyCard
            icon={Snowflake}
            title="Bola de nieve"
            philosophy="Liquida la más pequeña primero"
            targetLabel="Ataca esta primero"
            targetCreditor={
              snowballTarget
                ? `${snowballTarget.creditorName} · ${snowballTarget.title}`
                : undefined
            }
            targetMetric={
              snowballTarget
                ? `${fmt(toNum(snowballTarget.currentBalance))} de saldo`
                : undefined
            }
            microcopy={snowballMicrocopy}
            color="indigo"
            recommended
            onSelect={
              snowballTarget ? () => onEdit(snowballTarget.id) : undefined
            }
          />

          {/* Presion mensual */}
          <StrategyCard
            icon={Zap}
            title="Presión mensual"
            philosophy="Liquida la de mayor cuota primero"
            targetLabel="Libera más flujo"
            targetCreditor={
              pressureTarget
                ? `${pressureTarget.creditorName} · ${pressureTarget.title}`
                : undefined
            }
            targetMetric={
              pressureTarget
                ? `${fmt(toNum(pressureTarget.installmentAmount))}/mes`
                : undefined
            }
            microcopy={pressureMicrocopy}
            color="amber"
            onSelect={
              pressureTarget ? () => onEdit(pressureTarget.id) : undefined
            }
          />

          {/* Minimo seguro */}
          <StrategyCard
            icon={ShieldCheck}
            title="Mínimo seguro"
            philosophy="Solo paga mensualidades, no aceleres"
            microcopy={minimumMicrocopy}
            color="slate"
          />
        </div>

        {/* Microcopy final educativo */}
        <p className="text-[10px] text-slate-500 mt-3 italic leading-snug">
          💡 Ninguna estrategia es perfecta para todos. La bola de nieve gana en
          motivación, la presión mensual en flujo de caja, el mínimo en
          seguridad. Elige según tu momento.
        </p>
      </CardContent>
    </Card>
  );
}
