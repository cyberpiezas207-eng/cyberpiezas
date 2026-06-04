// ============================================================================
// COMPONENTE - Card del Cerebro de Tanque
// ----------------------------------------------------------------------------
// Card principal que muestra:
//   - % actual del tanque (barra visual + numero grande)
//   - Litros estimados + capacidad
//   - Rango de km restantes (pesimista vs optimista)
//   - Boton "Modificar" que abre TankReadingModal
//   - Explicacion del calculo (basado en ultima lectura + km manejados)
//   - Lista de factores aprendidos por gasolinera
//
// Props:
//   - vehicleId: number
//
// Convenciones del proyecto:
//   - Estilo: navy + dorado CyberPiezas
//   - Sin librerias externas (solo React + tRPC + shadcn)
//   - Comentarios SIN ACENTOS
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Fuel, Edit3, Target, Sparkles, Info } from "lucide-react";
import { TankReadingModal } from "./TankReadingModal";

interface TankStateCardProps {
  vehicleId: number;
}

export function TankStateCard({ vehicleId }: TankStateCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showFactors, setShowFactors] = useState(false);

  const { data, isLoading } = trpc.personalVehicles.tank.getState.useQuery({
    vehicleId,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <Fuel className="w-3 h-3 animate-pulse" />
          <span>Cargando cerebro de tanque...</span>
        </div>
      </div>
    );
  }

  const { state, levelLabel, storeFactors, lastReading } = data;

  // Color del gradient de la barra segun nivel
  const barGradient =
    levelLabel.semantic === "danger"
      ? "from-rose-500 to-rose-400"
      : levelLabel.semantic === "warning"
        ? "from-amber-500 to-amber-300"
        : "from-emerald-500 to-emerald-300";

  // Color del texto del % grande
  const percentColor =
    levelLabel.semantic === "danger"
      ? "text-rose-300"
      : levelLabel.semantic === "warning"
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Tanque actual
              </span>
              <span className="text-[10px] text-slate-500">
                {levelLabel.emoji} {levelLabel.label}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowModal(true)}
            className="text-xs text-slate-400 hover:text-white hover:bg-white/5"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Modificar
          </Button>
        </div>

        {/* Big number + litros */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className={"text-5xl font-black " + percentColor}>
            {state.currentPercent}
          </span>
          <span className="text-xl text-slate-400">%</span>
          <span className="ml-2 text-xs text-slate-500">
            aprox. {state.currentLiters.toFixed(1)} L de{" "}
            {state.capacityLiters.toFixed(0)} L
          </span>
        </div>

        {/* Barra visual */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div
            className={
              "h-full bg-gradient-to-r " +
              barGradient +
              " rounded-full transition-all duration-500"
            }
            style={{ width: `${state.currentPercent}%` }}
          />
        </div>

        {/* Rango km restantes */}
        <div className="bg-slate-950/50 rounded-xl p-3 mb-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Te quedan
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {state.kmRemainingMin}
              <span className="text-slate-500 mx-1">-</span>
              {state.kmRemainingMax}
            </span>
            <span className="text-sm text-slate-400">km</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            promedio ~{state.kmRemainingAvg} km · rinde{" "}
            {state.averageKmPerLiter.toFixed(1)} km/L
          </p>
        </div>

        {/* Confianza + explicacion */}
        {state.basedOnLastReading ? (
          <div className="bg-slate-950/40 rounded-lg p-2.5 mb-3 flex gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400 leading-relaxed">
              {state.explanation}
              {state.confidence === "low" && (
                <span className="block mt-1 text-amber-400">
                  Pocos datos: el rango es amplio. Captura mas cargas con
                  odometro.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3 flex gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200 leading-relaxed">
              Sin lectura inicial. Toca "Modificar" para decir cuanto tienes y
              el cerebro arranca.
            </div>
          </div>
        )}

        {/* Toggle factores gasolinera */}
        {storeFactors.length > 0 && (
          <button
            onClick={() => setShowFactors(!showFactors)}
            className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-between mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Factor aprendido por gasolinera ({storeFactors.length})
            </span>
            <span className="text-slate-500">
              {showFactors ? "ocultar" : "ver"}
            </span>
          </button>
        )}

        {/* Lista de factores */}
        {showFactors && storeFactors.length > 0 && (
          <div className="space-y-1.5">
            {storeFactors.map((sf) => {
              const colors =
                sf.status === "good"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : sf.status === "average"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : sf.status === "suspicious"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : "bg-slate-800/50 border-white/5 text-slate-400";

              return (
                <div
                  key={sf.storeName}
                  className={
                    "flex items-center justify-between p-2.5 rounded-lg border " +
                    colors
                  }
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {sf.storeName}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {sf.measurementsCount === 0
                        ? "sin datos aun"
                        : `${sf.measurementsCount} carga${sf.measurementsCount !== 1 ? "s" : ""} medida${sf.measurementsCount !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-bold">
                      {sf.factor.toFixed(2)}
                    </div>
                    <div className="text-[10px] opacity-70">{sf.label}</div>
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-slate-500 px-1 pt-1">
              El cerebro aprende solo midiendo km vs litros declarados. Necesita
              2+ cargas con odometro por gasolinera.
            </p>
          </div>
        )}

        {/* Ultima lectura (footer) */}
        {lastReading && (
          <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              Ultima lectura: {lastReading.tankPercent}% el{" "}
              {new Date(lastReading.at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {state.kmDrivenSinceReading > 0 && (
              <span className="text-cyan-400">
                +{state.kmDrivenSinceReading} km despues
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal de lectura */}
      <TankReadingModal
        vehicleId={vehicleId}
        currentPercent={state.currentPercent}
        currentOdometer={lastReading?.odometer ?? null}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
