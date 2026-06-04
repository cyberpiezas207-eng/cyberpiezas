// ============================================================================
// COMPONENTE - Modal "Cuanto tienes de tanque"
// ----------------------------------------------------------------------------
// Modal que abre cuando David toca "modificar" en la card del tanque.
// Tiene 2 modos:
//   1. Botones rapidos: Vacio / 1/4 / 1/2 / 3/4 / Lleno (presets)
//   2. Input exacto: numero 0-100 con slider
//
// Props:
//   - vehicleId: number
//   - currentPercent: number (estado actual del tanque, default)
//   - currentOdometer: number | null (default odometer)
//   - open: boolean
//   - onClose: () => void
//
// Convenciones del proyecto:
//   - Estilo: navy + dorado CyberPiezas
//   - Sin librerias externas (solo React + tRPC + shadcn ya importado)
//   - Comentarios SIN ACENTOS
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fuel, X, Check } from "lucide-react";

interface TankReadingModalProps {
  vehicleId: number;
  currentPercent: number;
  currentOdometer: number | null;
  open: boolean;
  onClose: () => void;
}

// Presets rapidos: 5 niveles standard que cualquiera entiende
const QUICK_PRESETS = [
  { value: 0, label: "Vacio", emoji: "🔴", color: "rose" },
  { value: 25, label: "1/4", emoji: "🟠", color: "orange" },
  { value: 50, label: "1/2", emoji: "🟡", color: "amber" },
  { value: 75, label: "3/4", emoji: "🟢", color: "emerald" },
  { value: 100, label: "Lleno", emoji: "💚", color: "green" },
];

export function TankReadingModal({
  vehicleId,
  currentPercent,
  currentOdometer,
  open,
  onClose,
}: TankReadingModalProps) {
  const [selectedPercent, setSelectedPercent] = useState<number>(currentPercent);
  const [exactValue, setExactValue] = useState<string>(String(currentPercent));
  const [odometerValue, setOdometerValue] = useState<string>(
    currentOdometer != null ? String(currentOdometer) : "",
  );
  const [mode, setMode] = useState<"quick" | "exact">("quick");

  const utils = trpc.useUtils();
  const setReadingMutation =
    trpc.personalVehicles.tank.setReading.useMutation({
      onSuccess: () => {
        toast.success("Tanque actualizado");
        utils.personalVehicles.tank.getState.invalidate({ vehicleId });
        utils.personalVehicles.tank.listReadings.invalidate({ vehicleId });
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Error al guardar lectura");
      },
    });

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setSelectedPercent(currentPercent);
      setExactValue(String(currentPercent));
      setOdometerValue(currentOdometer != null ? String(currentOdometer) : "");
      setMode("quick");
    }
  }, [open, currentPercent, currentOdometer]);

  if (!open) return null;

  const handleQuickSelect = (value: number) => {
    setSelectedPercent(value);
    setExactValue(String(value));
  };

  const handleExactChange = (value: string) => {
    setExactValue(value);
    const n = parseInt(value);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      setSelectedPercent(n);
    }
  };

  const handleSave = () => {
    const odom = odometerValue ? parseInt(odometerValue) : null;
    setReadingMutation.mutate({
      vehicleId,
      tankPercent: selectedPercent,
      odometerAtReading: odom,
      source: mode === "quick" ? "quick_button" : "exact_input",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full md:max-w-md bg-gradient-to-br from-slate-900 to-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-indigo-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cuanto tienes de tanque
              </h3>
              <p className="text-[11px] text-slate-400">
                Dime y el cerebro recalcula
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setMode("quick")}
            className={
              "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors " +
              (mode === "quick"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800")
            }
          >
            Botones rapidos
          </button>
          <button
            onClick={() => setMode("exact")}
            className={
              "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors " +
              (mode === "exact"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800")
            }
          >
            Valor exacto
          </button>
        </div>

        {/* Contenido del modo */}
        <div className="px-5 py-5 space-y-4">
          {mode === "quick" ? (
            // ----- Modo botones rapidos -----
            <div className="grid grid-cols-5 gap-2">
              {QUICK_PRESETS.map((preset) => {
                const isSelected = selectedPercent === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleQuickSelect(preset.value)}
                    className={
                      "flex flex-col items-center gap-1 py-3 rounded-xl border transition-all " +
                      (isSelected
                        ? "bg-amber-500/15 border-amber-500/50 ring-2 ring-amber-500/30 scale-105"
                        : "bg-slate-800/50 border-white/5 hover:bg-slate-800")
                    }
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <span
                      className={
                        "text-xs font-semibold " +
                        (isSelected ? "text-amber-200" : "text-slate-300")
                      }
                    >
                      {preset.label}
                    </span>
                    <span
                      className={
                        "text-[10px] " +
                        (isSelected ? "text-amber-300" : "text-slate-500")
                      }
                    >
                      {preset.value}%
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // ----- Modo exacto -----
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
                  Porcentaje exacto
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={exactValue}
                    onChange={(e) => handleExactChange(e.target.value)}
                    className="bg-slate-800 border-white/10 text-white text-2xl font-bold text-center h-14"
                    placeholder="50"
                  />
                  <span className="text-2xl font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Slider visual */}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={selectedPercent}
                onChange={(e) => handleQuickSelect(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          )}

          {/* Barra visual del estado actual */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Vista previa
              </span>
              <span className="text-xs font-bold text-amber-300">
                {selectedPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                style={{ width: `${selectedPercent}%` }}
              />
            </div>
          </div>

          {/* Odometro opcional */}
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
              Odometro actual (opcional)
            </label>
            <Input
              type="number"
              min={0}
              value={odometerValue}
              onChange={(e) => setOdometerValue(e.target.value)}
              placeholder={currentOdometer ? `${currentOdometer} km` : "ej: 216990"}
              className="bg-slate-800 border-white/10 text-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Si lo das, el cerebro calcula mejor cuanto vas bajando.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/5 bg-slate-950/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-slate-400 hover:text-white"
            disabled={setReadingMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={setReadingMutation.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {setReadingMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
