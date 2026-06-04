// ============================================================================
// COMPONENTE - Mini-cerebro de presion de llantas
// ----------------------------------------------------------------------------
// Card interactiva que muestra la presion recomendada para el vehiculo
// considerando:
//   - Tipo de carro (auto-detectado del brand/model)
//   - Carga (vacio / normal / pesado) - editable
//   - Terreno (ciudad / carretera / mix / terraceria) - editable
//   - Clima (calor / templado / frio) - auto-detectado del mes
//
// El cerebro recalcula al cambiar cualquier factor.
//
// Props:
//   - vehicleId: number
//
// Convenciones del proyecto:
//   - Estilo: navy + dorado CyberPiezas
//   - Sin librerias externas (solo React + tRPC)
//   - Comentarios SIN ACENTOS
// ============================================================================

import { useState } from "react";
import { trpc } from "../../utils/trpc";

interface TirePressureCardProps {
  vehicleId: number;
}

type LoadLevel = "light" | "normal" | "heavy";
type TerrainType = "city" | "highway" | "mixed" | "rough";

export function TirePressureCard({ vehicleId }: TirePressureCardProps) {
  const [loadLevel, setLoadLevel] = useState<LoadLevel>("normal");
  const [terrain, setTerrain] = useState<TerrainType>("mixed");
  const [showFactors, setShowFactors] = useState(false);

  const { data: rec, isLoading } =
    trpc.personalVehicles.health.recommendPressure.useQuery({
      vehicleId,
      loadLevel,
      terrain,
    });

  if (isLoading || !rec) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <span>Cargando recomendacion...</span>
        </div>
      </div>
    );
  }

  const showRearDifferent = rec.rearPsi !== rec.recommendedPsi;

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
          Presion recomendada hoy
        </span>
      </div>

      {/* Numero grande */}
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-5xl font-semibold text-white">
          {rec.recommendedPsi}
        </span>
        <span className="text-xl text-slate-400">PSI</span>
        <span className="ml-2 text-sm text-slate-500">
          {showRearDifferent ? "delanteras" : "en las 4 llantas"}
        </span>
      </div>

      {/* Atras si difiere */}
      {showRearDifferent && (
        <div className="mb-3 flex items-baseline gap-2 text-sm text-amber-300">
          <span className="font-medium">Atras: {rec.rearPsi} PSI</span>
          <span className="text-xs text-slate-500">(por la carga)</span>
        </div>
      )}

      {/* Explicacion */}
      <p className="mb-4 text-sm text-slate-300 leading-relaxed">
        {rec.explanation}
      </p>

      {/* Warnings */}
      {rec.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {rec.warnings.map((w, i) => (
            <div
              key={i}
              className="flex gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200"
            >
              <span className="text-amber-400">!</span>
              <span className="leading-relaxed">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ajustes de contexto */}
      <div className="mb-4 space-y-3 rounded-lg bg-slate-950/40 p-3">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Ajusta tu situacion
        </div>

        {/* Carga */}
        <div>
          <div className="mb-1.5 text-xs text-slate-400">Carga</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { v: "light", label: "Vacio" },
                { v: "normal", label: "Normal" },
                { v: "heavy", label: "Pesado" },
              ] as { v: LoadLevel; label: string }[]
            ).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setLoadLevel(v)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (loadLevel === v
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Terreno */}
        <div>
          <div className="mb-1.5 text-xs text-slate-400">Terreno</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { v: "city", label: "Ciudad" },
                { v: "highway", label: "Carretera" },
                { v: "mixed", label: "Mix" },
                { v: "rough", label: "Terraceria" },
              ] as { v: TerrainType; label: string }[]
            ).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setTerrain(v)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (terrain === v
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle factores */}
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="mb-3 w-full rounded-lg bg-slate-800/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
      >
        {showFactors ? "Ocultar" : "Ver"} factores que considero
      </button>

      {/* Factores (colapsable) */}
      {showFactors && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-slate-950/40 p-3">
          {rec.factors.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-300">{f.label}</span>
              <span className="text-slate-500 font-mono">{f.impact}</span>
            </div>
          ))}
        </div>
      )}

      {/* Educacional: por que */}
      <div className="grid gap-2 rounded-lg bg-slate-950/40 p-3">
        <div className="mb-1 text-xs uppercase tracking-wider text-slate-500">
          Por que esta presion
        </div>

        {/* Muy baja */}
        <div className="grid grid-cols-[50px_1fr] gap-3 items-start">
          <div className="rounded-md bg-rose-500/15 border border-rose-500/20 p-2 text-center">
            <div className="text-base font-semibold text-rose-300">
              {rec.minSafePsi}
            </div>
            <div className="text-[9px] text-rose-300/80">PSI</div>
          </div>
          <div>
            <div className="text-xs font-medium text-rose-300">Muy baja</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Gastas mas gasolina, llantas se calientan, frenas peor.
            </div>
          </div>
        </div>

        {/* Recomendada */}
        <div className="grid grid-cols-[50px_1fr] gap-3 items-start">
          <div className="rounded-md bg-emerald-500/15 border border-emerald-500/20 p-2 text-center">
            <div className="text-base font-semibold text-emerald-300">
              {rec.recommendedPsi}
            </div>
            <div className="text-[9px] text-emerald-300/80">PSI</div>
          </div>
          <div>
            <div className="text-xs font-medium text-emerald-300">
              Recomendada para ti
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Mejor agarre, gasta menos, llantas duran mas.
            </div>
          </div>
        </div>

        {/* Muy alta */}
        <div className="grid grid-cols-[50px_1fr] gap-3 items-start">
          <div className="rounded-md bg-amber-500/15 border border-amber-500/20 p-2 text-center">
            <div className="text-base font-semibold text-amber-300">
              {rec.maxSafePsi}
            </div>
            <div className="text-[9px] text-amber-300/80">PSI</div>
          </div>
          <div>
            <div className="text-xs font-medium text-amber-300">Muy alta</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Centro de la llanta se gasta antes, rebota mas en topes.
            </div>
          </div>
        </div>

        {/* Tip de oro */}
        <div className="mt-2 rounded-md bg-cyan-500/10 border border-cyan-500/20 p-2 flex gap-2">
          <span className="text-cyan-400 text-sm">i</span>
          <span className="text-[11px] text-cyan-200 leading-relaxed">
            <strong>Tip:</strong> Revisa la presion <strong>en frio</strong>{" "}
            (antes de manejar). En caliente sube 3-5 PSI y te engana.
          </span>
        </div>
      </div>
    </div>
  );
}
