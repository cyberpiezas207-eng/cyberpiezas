// ============================================================================
// COMPONENTE - Modal de Mantenimientos
// ----------------------------------------------------------------------------
// 2 modos:
//   1. "initial" - Captura inicial: meter varios mantenimientos previos de golpe
//      (cuando el cerebro arranca, David dice "afinacion hace 15 dias, llantas
//      hace 7 dias, etc")
//   2. "single"  - Registrar UN mantenimiento nuevo (modo normal)
//
// Tipos de mantenimiento:
//   - tire_pressure / oil_change / tune_up / air_filter / brakes / alignment / other
//
// Props:
//   - vehicleId: number
//   - mode: "initial" | "single"
//   - currentOdometer: number | null (para sugerir odometro)
//   - open: boolean
//   - onClose: () => void
//
// Convenciones del proyecto:
//   - Estilo: navy + dorado CyberPiezas
//   - Sin librerias externas (solo React + tRPC + shadcn)
//   - Comentarios SIN ACENTOS
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wrench,
  X,
  Check,
  Plus,
  Trash2,
  CircleDot,
  Droplet,
  Zap,
  Wind,
  Disc,
  Move,
  HelpCircle,
} from "lucide-react";

type MaintenanceType =
  | "tire_pressure"
  | "oil_change"
  | "tune_up"
  | "air_filter"
  | "brakes"
  | "alignment"
  | "other";

interface MaintenanceModalProps {
  vehicleId: number;
  mode: "initial" | "single";
  currentOdometer: number | null;
  open: boolean;
  onClose: () => void;
}

// Catalogo de tipos con icono + label + descripcion corta
const MAINTENANCE_TYPES: Array<{
  type: MaintenanceType;
  label: string;
  icon: typeof CircleDot;
  hint: string;
}> = [
  {
    type: "tire_pressure",
    label: "Presion de llantas",
    icon: CircleDot,
    hint: "Calibracion / revision",
  },
  {
    type: "oil_change",
    label: "Aceite y filtro",
    icon: Droplet,
    hint: "Cambio completo",
  },
  {
    type: "tune_up",
    label: "Afinacion",
    icon: Zap,
    hint: "Bujias / cables",
  },
  {
    type: "air_filter",
    label: "Filtro de aire",
    icon: Wind,
    hint: "Del motor",
  },
  {
    type: "brakes",
    label: "Frenos",
    icon: Disc,
    hint: "Balatas / discos",
  },
  {
    type: "alignment",
    label: "Alineacion / balanceo",
    icon: Move,
    hint: "De las llantas",
  },
  {
    type: "other",
    label: "Otro",
    icon: HelpCircle,
    hint: "No categorizado",
  },
];

// Helper: hoy en YMD Mexico
function todayYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// Helper: hace N dias en YMD
function daysAgoYMD(days: number): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Tipo para items en la captura inicial
// ----------------------------------------------------------------------------
interface BulkItem {
  id: string; // temporal client-side
  maintenanceType: MaintenanceType;
  performedAt: string;
  odometerAtService: string;
  notes: string;
}

function newBulkItem(odometer: number | null): BulkItem {
  return {
    id: Math.random().toString(36).slice(2),
    maintenanceType: "tire_pressure",
    performedAt: todayYMD(),
    odometerAtService: odometer != null ? String(odometer) : "",
    notes: "",
  };
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function MaintenanceModal({
  vehicleId,
  mode,
  currentOdometer,
  open,
  onClose,
}: MaintenanceModalProps) {
  const utils = trpc.useUtils();

  // ----- Modo single -----
  const [singleType, setSingleType] = useState<MaintenanceType>("oil_change");
  const [singlePerformedAt, setSinglePerformedAt] = useState(todayYMD());
  const [singleOdometer, setSingleOdometer] = useState(
    currentOdometer != null ? String(currentOdometer) : "",
  );
  const [singleCost, setSingleCost] = useState("");
  const [singleProvider, setSingleProvider] = useState("");
  const [singleNotes, setSingleNotes] = useState("");

  // ----- Modo initial (bulk) -----
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([
    newBulkItem(currentOdometer),
  ]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      if (mode === "single") {
        setSingleType("oil_change");
        setSinglePerformedAt(todayYMD());
        setSingleOdometer(currentOdometer != null ? String(currentOdometer) : "");
        setSingleCost("");
        setSingleProvider("");
        setSingleNotes("");
      } else {
        setBulkItems([newBulkItem(currentOdometer)]);
      }
    }
  }, [open, mode, currentOdometer]);

  // ----- Mutations -----
  const createMutation = trpc.personalVehicles.health.createMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Mantenimiento registrado");
      utils.personalVehicles.health.getScore.invalidate({ vehicleId });
      utils.personalVehicles.health.listMaintenance.invalidate({ vehicleId });
      onClose();
    },
    onError: (err) => toast.error(err.message || "Error al guardar"),
  });

  const bulkMutation = trpc.personalVehicles.health.bulkInitial.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} mantenimientos registrados`);
      utils.personalVehicles.health.getScore.invalidate({ vehicleId });
      utils.personalVehicles.health.listMaintenance.invalidate({ vehicleId });
      onClose();
    },
    onError: (err) => toast.error(err.message || "Error al guardar bulk"),
  });

  if (!open) return null;

  // ----- Handler single -----
  const handleSaveSingle = () => {
    createMutation.mutate({
      vehicleId,
      maintenanceType: singleType,
      performedAt: singlePerformedAt,
      odometerAtService: singleOdometer ? parseInt(singleOdometer) : null,
      cost: singleCost ? parseInt(singleCost) : null,
      serviceProvider: singleProvider.trim() || null,
      notes: singleNotes.trim() || null,
    });
  };

  // ----- Handlers bulk -----
  const addBulkItem = () => {
    if (bulkItems.length >= 10) {
      toast.error("Maximo 10 items por captura");
      return;
    }
    setBulkItems([...bulkItems, newBulkItem(currentOdometer)]);
  };

  const removeBulkItem = (id: string) => {
    if (bulkItems.length === 1) return; // siempre al menos 1
    setBulkItems(bulkItems.filter((b) => b.id !== id));
  };

  const updateBulkItem = (id: string, patch: Partial<BulkItem>) => {
    setBulkItems(bulkItems.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleSaveBulk = () => {
    bulkMutation.mutate({
      vehicleId,
      items: bulkItems.map((b) => ({
        maintenanceType: b.maintenanceType,
        performedAt: b.performedAt,
        odometerAtService: b.odometerAtService
          ? parseInt(b.odometerAtService)
          : null,
        notes: b.notes.trim() || null,
      })),
    });
  };

  const isLoading = createMutation.isPending || bulkMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full md:max-w-2xl max-h-[90vh] flex flex-col bg-gradient-to-br from-slate-900 to-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-indigo-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === "initial"
                  ? "Cuentale al cerebro lo que ya tienes"
                  : "Registrar mantenimiento"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === "initial"
                  ? "Mete los mantenimientos previos para que arranque con datos"
                  : "Anota lo que acabas de hacer al coche"}
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

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === "single" ? (
            <SingleMaintenanceForm
              type={singleType}
              setType={setSingleType}
              performedAt={singlePerformedAt}
              setPerformedAt={setSinglePerformedAt}
              odometer={singleOdometer}
              setOdometer={setSingleOdometer}
              cost={singleCost}
              setCost={setSingleCost}
              provider={singleProvider}
              setProvider={setSingleProvider}
              notes={singleNotes}
              setNotes={setSingleNotes}
            />
          ) : (
            <BulkMaintenanceForm
              items={bulkItems}
              onUpdate={updateBulkItem}
              onRemove={removeBulkItem}
              onAdd={addBulkItem}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/5 bg-slate-950/50 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-slate-400 hover:text-white"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={mode === "single" ? handleSaveSingle : handleSaveBulk}
            disabled={isLoading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isLoading
              ? "Guardando..."
              : mode === "single"
                ? "Guardar"
                : `Guardar ${bulkItems.length} item${bulkItems.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: Form single
// ============================================================================
function SingleMaintenanceForm(props: {
  type: MaintenanceType;
  setType: (t: MaintenanceType) => void;
  performedAt: string;
  setPerformedAt: (s: string) => void;
  odometer: string;
  setOdometer: (s: string) => void;
  cost: string;
  setCost: (s: string) => void;
  provider: string;
  setProvider: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div>
        <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
          Tipo de mantenimiento
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MAINTENANCE_TYPES.map((mt) => {
            const Icon = mt.icon;
            const isSelected = props.type === mt.type;
            return (
              <button
                key={mt.type}
                onClick={() => props.setType(mt.type)}
                className={
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all " +
                  (isSelected
                    ? "bg-emerald-500/15 border-emerald-500/40 ring-2 ring-emerald-500/20"
                    : "bg-slate-800/50 border-white/5 hover:bg-slate-800")
                }
              >
                <Icon
                  className={
                    "w-4 h-4 " +
                    (isSelected ? "text-emerald-300" : "text-slate-400")
                  }
                />
                <div>
                  <div
                    className={
                      "text-xs font-semibold " +
                      (isSelected ? "text-emerald-200" : "text-slate-300")
                    }
                  >
                    {mt.label}
                  </div>
                  <div className="text-[10px] text-slate-500">{mt.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fecha + Odometro */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
            Fecha
          </label>
          <Input
            type="date"
            value={props.performedAt}
            onChange={(e) => props.setPerformedAt(e.target.value)}
            className="bg-slate-800 border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
            Odometro (km)
          </label>
          <Input
            type="number"
            min={0}
            value={props.odometer}
            onChange={(e) => props.setOdometer(e.target.value)}
            placeholder="ej: 216990"
            className="bg-slate-800 border-white/10 text-white"
          />
        </div>
      </div>

      {/* Costo + Taller */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
            Costo (opcional)
          </label>
          <Input
            type="number"
            min={0}
            value={props.cost}
            onChange={(e) => props.setCost(e.target.value)}
            placeholder="$"
            className="bg-slate-800 border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
            Taller / lugar
          </label>
          <Input
            type="text"
            value={props.provider}
            onChange={(e) => props.setProvider(e.target.value)}
            placeholder="ej: Don Pepe"
            className="bg-slate-800 border-white/10 text-white"
            maxLength={120}
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 block">
          Notas (opcional)
        </label>
        <Input
          type="text"
          value={props.notes}
          onChange={(e) => props.setNotes(e.target.value)}
          placeholder="cambio bujias NGK, aceite 5w30, etc"
          className="bg-slate-800 border-white/10 text-white"
          maxLength={500}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: Form bulk (captura inicial)
// ============================================================================
function BulkMaintenanceForm(props: {
  items: BulkItem[];
  onUpdate: (id: string, patch: Partial<BulkItem>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Tip arriba */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-[11px] text-cyan-200 leading-relaxed">
        Mete cada mantenimiento que ya hayas hecho con su fecha aproximada. Asi
        el cerebro NO arranca en cero. Si no recuerdas la fecha exacta, pon una
        aproximada.
      </div>

      {/* Items */}
      {props.items.map((item, idx) => (
        <div
          key={item.id}
          className="bg-slate-800/40 border border-white/10 rounded-xl p-3 space-y-2.5"
        >
          {/* Header del item */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Item #{idx + 1}
            </span>
            {props.items.length > 1 && (
              <button
                onClick={() => props.onRemove(item.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tipo + Fecha en grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={item.maintenanceType}
              onChange={(e) =>
                props.onUpdate(item.id, {
                  maintenanceType: e.target.value as MaintenanceType,
                })
              }
              className="bg-slate-900 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
            >
              {MAINTENANCE_TYPES.map((mt) => (
                <option key={mt.type} value={mt.type}>
                  {mt.label}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={item.performedAt}
              onChange={(e) =>
                props.onUpdate(item.id, { performedAt: e.target.value })
              }
              className="bg-slate-900 border-white/10 text-white"
            />
          </div>

          {/* Odometro + Notas */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              value={item.odometerAtService}
              onChange={(e) =>
                props.onUpdate(item.id, { odometerAtService: e.target.value })
              }
              placeholder="km al servicio"
              className="bg-slate-900 border-white/10 text-white text-sm"
            />
            <Input
              type="text"
              value={item.notes}
              onChange={(e) =>
                props.onUpdate(item.id, { notes: e.target.value })
              }
              placeholder="notas opcional"
              className="bg-slate-900 border-white/10 text-white text-sm"
              maxLength={500}
            />
          </div>

          {/* Shortcuts de fechas */}
          <div className="flex gap-1.5 text-[10px]">
            <span className="text-slate-500">Hace:</span>
            {[7, 15, 30, 90, 180, 365].map((days) => (
              <button
                key={days}
                onClick={() =>
                  props.onUpdate(item.id, { performedAt: daysAgoYMD(days) })
                }
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {days >= 365
                  ? "1a"
                  : days >= 30
                    ? `${Math.round(days / 30)}m`
                    : `${days}d`}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Boton agregar otro */}
      <Button
        variant="ghost"
        onClick={props.onAdd}
        className="w-full border border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-300"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Agregar otro mantenimiento
      </Button>
    </div>
  );
}
