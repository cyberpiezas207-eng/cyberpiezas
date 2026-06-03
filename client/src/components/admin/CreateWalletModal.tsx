// ============================================================================
// CREATE WALLET MODAL - Modal para crear un bolsillo nuevo
// ----------------------------------------------------------------------------
// Recibe: open, onClose
// Maneja la llamada tRPC y muestra toasts.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Wallet, Check } from "lucide-react";

// ----------------------------------------------------------------------------
// Catalogos visuales: colores e iconos preset
// ----------------------------------------------------------------------------

const COLOR_PRESETS = [
  "#fbbf24", // amber default
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#a855f7", // purple
  "#ef4444", // red
  "#f97316", // orange
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#84cc16", // lime
];

const ICON_PRESETS = [
  "👛",
  "💰",
  "💵",
  "💳",
  "🏦",
  "👰",
  "👶",
  "🐷",
  "🏠",
  "✈️",
  "🎓",
  "🚗",
];

const TYPE_OPTIONS = [
  { value: "cash", label: "Efectivo", emoji: "💵" },
  { value: "card", label: "Tarjeta", emoji: "💳" },
  { value: "shared", label: "Compartido", emoji: "👰" },
  { value: "savings", label: "Ahorro", emoji: "🐷" },
  { value: "other", label: "Otro", emoji: "📦" },
] as const;

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface CreateWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateWalletModal({
  open,
  onClose,
}: CreateWalletModalProps) {
  const utils = trpc.useUtils();

  // Form state
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [walletType, setWalletType] = useState<
    "cash" | "card" | "shared" | "savings" | "other"
  >("cash");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState(ICON_PRESETS[0]);
  const [isDefault, setIsDefault] = useState(false);

  const createMutation = trpc.personalWallets.wallets.create.useMutation({
    onSuccess: () => {
      toast.success(`Bolsillo "${name}" creado`);
      utils.personalWallets.wallets.list.invalidate();
      reset();
      onClose();
    },
    onError: (e) => {
      toast.error(e.message || "No se pudo crear el bolsillo");
    },
  });

  function reset() {
    setName("");
    setOwnerName("");
    setInitialBalance("0");
    setWalletType("cash");
    setColor(COLOR_PRESETS[0]);
    setIcon(ICON_PRESETS[0]);
    setIsDefault(false);
  }

  function handleClose() {
    if (createMutation.isPending) return;
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const balance = parseFloat(initialBalance) || 0;
    if (balance < 0) {
      toast.error("El saldo inicial no puede ser negativo");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      ownerName: ownerName.trim() || null,
      initialBalance: balance,
      walletType,
      color,
      icon,
      isDefault,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white tracking-tight">
              Nuevo bolsillo
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Preview en vivo */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: color + "22", border: `1px solid ${color}` }}
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {name || "Mi bolsillo"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {ownerName || "Sin dueno asignado"}
                {isDefault && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
                    default
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm font-black text-amber-300 tabular-nums">
              ${parseFloat(initialBalance || "0").toLocaleString("es-MX")}
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Efectivo David, Bolsillo Mujer"
              maxLength={100}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Owner */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Dueno (opcional)
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ej: Yo, Mujer, Hijo mayor"
              maxLength={100}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Saldo inicial */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Saldo inicial
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Tipo
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWalletType(opt.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all ${
                    walletType === opt.value
                      ? "bg-amber-500/15 border-amber-500 text-amber-200"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-[10px] font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icono */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Icono
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_PRESETS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`h-10 rounded-lg text-xl transition-all ${
                    icon === i
                      ? "bg-amber-500/15 border-2 border-amber-500 scale-105"
                      : "bg-slate-800 border-2 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300">
              Marcar como bolsillo principal (default)
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !name.trim()}
            className="px-4 py-1.5 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Creando..." : "Crear bolsillo"}
          </button>
        </div>
      </div>
    </div>
  );
}
