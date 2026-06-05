// ============================================================================
// COMPONENTE - Card de Salud Mecanica
// ----------------------------------------------------------------------------
// Card que muestra el estado mecanico del vehiculo:
//   - Score general 0-100 con label semantico (Excelente/Bueno/Regular/Atencion)
//   - Rendimiento real esperado (afectado por items vencidos)
//   - Lista de 6 items (llantas, aceite, afinacion, filtro aire, frenos, alineacion)
//   - Cada item: status (good/warning/urgent/unknown) + descripcion + impacto
//   - Recomendacion principal del cerebro
//   - Boton "Captura inicial" si hay 3+ items desconocidos (onboarding amigable)
//   - Boton "Registrar mantenimiento" siempre disponible
//
// Props:
//   - vehicleId: number
//   - currentOdometer: number | null (para pasarle al modal)
//
// Convenciones del proyecto:
//   - Estilo: navy + dorado CyberPiezas
//   - Sin librerias externas (solo React + tRPC + shadcn)
//   - Comentarios SIN ACENTOS
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Lightbulb,
  CircleDot,
  Droplet,
  Zap,
  Wind,
  Disc,
  Move,
  Wrench,
} from "lucide-react";
import { MaintenanceModal } from "./MaintenanceModal";

interface VehicleHealthCardProps {
  vehicleId: number;
  currentOdometer: number | null;
}

// Mapeo de iconos por tipo (los recibe el engine en string, los traducimos aqui)
const ITEM_ICONS: Record<string, typeof CircleDot> = {
  tire_pressure: CircleDot,
  oil_change: Droplet,
  tune_up: Zap,
  air_filter: Wind,
  brakes: Disc,
  alignment: Move,
  other: Wrench,
};

export function VehicleHealthCard({
  vehicleId,
  currentOdometer,
}: VehicleHealthCardProps) {
  const [modalMode, setModalMode] = useState<"initial" | "single" | null>(null);

  const { data: health, isLoading } =
    trpc.personalVehicles.health.getScore.useQuery({ vehicleId });

  if (isLoading || !health) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <Stethoscope className="w-3 h-3 animate-pulse" />
          <span>Diagnosticando salud mecanica...</span>
        </div>
      </div>
    );
  }

  // Mostrar el CTA grande de captura inicial si tiene 3+ items desconocidos
  const showInitialCTA = health.unknownItemsCount >= 3;

  // Color del score segun semantic
  const scoreColor =
    health.semantic === "excellent" || health.semantic === "good"
      ? "text-emerald-300"
      : health.semantic === "fair"
        ? "text-amber-300"
        : "text-rose-300";

  const scoreBg =
    health.semantic === "excellent" || health.semantic === "good"
      ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30"
      : health.semantic === "fair"
        ? "from-amber-500/15 to-amber-500/5 border-amber-500/30"
        : "from-rose-500/15 to-rose-500/5 border-rose-500/30";

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Salud mecanica
              </span>
              <span className="text-[11px] text-slate-400">
                {health.emoji} {health.label}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setModalMode("single")}
            className="text-xs text-slate-400 hover:text-white hover:bg-white/5"
          >
            <Plus className="w-3 h-3 mr-1" />
            Registrar
          </Button>
        </div>

        {/* Captura inicial CTA (si hay muchos desconocidos) */}
        {showInitialCTA && (
          <button
            onClick={() => setModalMode("initial")}
            className="w-full mb-4 p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border border-cyan-500/30 hover:from-cyan-500/20 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-cyan-100">
                  Cuentale al cerebro lo que ya tienes
                </div>
                <div className="text-[11px] text-cyan-300/80 leading-relaxed mt-0.5">
                  Mete tus mantenimientos previos (afinacion, llantas, etc) para
                  que el cerebro arranque con datos reales.
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Score grande + Rendimiento real */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className={
              "rounded-xl border bg-gradient-to-br p-3 " + scoreBg
            }
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Score general
            </div>
            <div className="flex items-baseline gap-1">
              <span className={"text-3xl font-black " + scoreColor}>
                {health.scoreOutOf100}
              </span>
              <span className="text-sm text-slate-400">/100</span>
            </div>
            <div className={"text-[11px] mt-0.5 " + scoreColor}>
              {health.emoji} {health.label}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Impacto al rinde
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={
                  "text-3xl font-black " +
                  (health.totalEfficiencyImpactPercent === 0
                    ? "text-emerald-300"
                    : "text-amber-300")
                }
              >
                {health.totalEfficiencyImpactPercent === 0
                  ? "0"
                  : health.totalEfficiencyImpactPercent}
              </span>
              <span className="text-sm text-slate-400">%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {health.totalEfficiencyImpactPercent === 0 ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  optimo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <TrendingDown className="w-3 h-3" />
                  pierdes gasolina
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lista de items */}
        <div className="space-y-1.5 mb-3">
          {health.items.map((item) => {
            const Icon = ITEM_ICONS[item.type] ?? Wrench;
            return <HealthItem key={item.type} item={item} Icon={Icon} />;
          })}
        </div>

        {/* Recomendacion principal */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div className="text-[12px] text-indigo-200 leading-relaxed">
            <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 mb-0.5">
              Recomendacion
            </div>
            {health.recommendation}
          </div>
        </div>

        {/* Footer: contadores */}
        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {health.knownItemsCount} con datos · {health.unknownItemsCount} sin
            registrar
          </span>
          {health.unknownItemsCount > 0 && health.knownItemsCount > 0 && (
            <button
              onClick={() => setModalMode("initial")}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Completar registros
            </button>
          )}
        </div>
      </div>

      {/* Modal de mantenimiento */}
      <MaintenanceModal
        vehicleId={vehicleId}
        mode={modalMode ?? "single"}
        currentOdometer={currentOdometer}
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
      />
    </>
  );
}

// ============================================================================
// SUB-COMPONENTE: Item de salud (cada renglon)
// ============================================================================
function HealthItem({
  item,
  Icon,
}: {
  item: {
    type: string;
    label: string;
    status: "good" | "warning" | "urgent" | "unknown";
    description: string;
    efficiencyImpactPercent: number;
    recommendation: string | null;
  };
  Icon: typeof CircleDot;
}) {
  const colors = {
    good: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      icon: "text-emerald-400",
      label: "text-emerald-200",
      sub: "text-emerald-300/90",
      pill: "text-emerald-300",
      StatusIcon: CheckCircle2,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/20",
      icon: "text-amber-400",
      label: "text-amber-200",
      sub: "text-amber-300/90",
      pill: "text-amber-300",
      StatusIcon: AlertTriangle,
    },
    urgent: {
      bg: "bg-rose-500/10 border-rose-500/20",
      icon: "text-rose-400",
      label: "text-rose-200",
      sub: "text-rose-300/90",
      pill: "text-rose-300",
      StatusIcon: AlertCircle,
    },
    unknown: {
      bg: "bg-slate-800/40 border-white/5",
      icon: "text-slate-400",
      label: "text-slate-300",
      sub: "text-slate-400",
      pill: "text-slate-400",
      StatusIcon: HelpCircle,
    },
  };

  const c = colors[item.status];
  const StatusIcon = c.StatusIcon;

  return (
    <div
      className={
        "flex items-center justify-between p-2.5 rounded-lg border " + c.bg
      }
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <Icon className={"w-4 h-4 mt-0.5 shrink-0 " + c.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={"text-xs font-semibold " + c.label}>
              {item.label}
            </span>
            <StatusIcon className={"w-3 h-3 " + c.icon} />
          </div>
          <div className={"text-[11px] leading-snug mt-0.5 " + c.sub}>
            {item.description}
          </div>
          {item.recommendation && (
            <div className={"text-[11px] mt-1 italic " + c.sub}>
              {item.recommendation}
            </div>
          )}
        </div>
      </div>
      <div className={"text-[11px] font-bold shrink-0 ml-2 " + c.pill}>
        {item.efficiencyImpactPercent === 0
          ? "+0%"
          : `${item.efficiencyImpactPercent}%`}
      </div>
    </div>
  );
}
