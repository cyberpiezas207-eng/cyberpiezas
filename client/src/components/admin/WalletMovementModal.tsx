// ============================================================================
// WALLET MOVEMENT MODAL - Depositar o retirar dinero de un bolsillo
// ----------------------------------------------------------------------------
// Recibe: open, wallet, onClose
// Toggle entre Depositar (entrada) y Retirar (salida).
// Preview en vivo: "Saldo despues: $XXX" con color rojo si queda negativo.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// Sugerencias rapidas de categoria (chips clickables)
// ----------------------------------------------------------------------------

const DEPOSIT_CATEGORIES = [
  "Sueldo",
  "Venta",
  "Trabajo",
  "Regalo",
  "Reembolso",
  "Cobro",
  "Otro",
];

const WITHDRAWAL_CATEGORIES = [
  "Comida",
  "Transporte",
  "Servicios",
  "Personal",
  "Ropa",
  "Salud",
  "Diversion",
  "Otro",
];

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface WalletMovementModalProps {
  open: boolean;
  wallet: {
    id: number;
    name: string;
    icon?: string | null;
    color?: string | null;
    balance: string | number;
    ownerName?: string | null;
  } | null;
  defaultAction?: "deposit" | "withdraw"; // Que tab abre por default
  onClose: () => void;
}

export default function WalletMovementModal({
  open,
  wallet,
  defaultAction = "deposit",
  onClose,
}: WalletMovementModalProps) {
  const utils = trpc.useUtils();

  // Form state
  const [action, setAction] = useState<"deposit" | "withdraw">(defaultAction);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayYMD());

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setAction(defaultAction);
      setAmount("");
      setDescription("");
      setCategory("");
      setOccurredAt(todayYMD());
    }
  }, [open, defaultAction]);

  const depositMutation = trpc.personalWallets.wallets.deposit.useMutation({
    onSuccess: () => {
      toast.success(`Deposito registrado: ${fmt(parseFloat(amount) || 0)}`);
      invalidateAll();
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo depositar"),
  });

  const withdrawMutation = trpc.personalWallets.wallets.withdraw.useMutation({
    onSuccess: () => {
      toast.success(`Retiro registrado: ${fmt(parseFloat(amount) || 0)}`);
      invalidateAll();
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo retirar"),
  });

  function invalidateAll() {
    utils.personalWallets.wallets.list.invalidate();
    if (wallet) {
      utils.personalWallets.movements.list.invalidate({ walletId: wallet.id });
    }
  }

  const isPending = depositMutation.isPending || withdrawMutation.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  function handleSubmit() {
    if (!wallet) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("El monto debe ser mayor a cero");
      return;
    }

    const input = {
      walletId: wallet.id,
      amount: amt,
      description: description.trim() || null,
      category: category.trim() || null,
      occurredAt,
    };

    if (action === "deposit") {
      depositMutation.mutate(input);
    } else {
      withdrawMutation.mutate(input);
    }
  }

  if (!open || !wallet) return null;

  // Calculos para preview
  const currentBalance = Number(wallet.balance) || 0;
  const amountNum = parseFloat(amount) || 0;
  const newBalance =
    action === "deposit"
      ? currentBalance + amountNum
      : currentBalance - amountNum;
  const willGoNegative = newBalance < 0 && amountNum > 0;

  const categoryOptions =
    action === "deposit" ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con info del bolsillo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{
              backgroundColor: (wallet.color || "#fbbf24") + "22",
              border: `1px solid ${wallet.color || "#fbbf24"}`,
            }}
          >
            {wallet.icon || "👛"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Movimiento en
            </p>
            <h3 className="text-base font-black text-white tracking-tight truncate">
              {wallet.name}
            </h3>
            <p className="text-xs text-slate-400 tabular-nums">
              Saldo actual:{" "}
              <span className="font-bold text-slate-200">
                {fmt(currentBalance)}
              </span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            type="button"
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Toggle Depositar / Retirar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction("deposit")}
              className={`py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                action === "deposit"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-200"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span className="text-sm font-bold">Depositar</span>
            </button>
            <button
              type="button"
              onClick={() => setAction("withdraw")}
              className={`py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                action === "withdraw"
                  ? "bg-rose-500/15 border-rose-500 text-rose-200"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span className="text-sm font-bold">Retirar</span>
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Monto *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-black">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                autoFocus
                placeholder="0"
                className="w-full pl-8 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-2xl font-black text-white text-right tabular-nums focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Preview del nuevo saldo */}
          {amountNum > 0 && (
            <div
              className={`p-3 rounded-lg border ${
                willGoNegative
                  ? "bg-rose-500/10 border-rose-500/50"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo despues
                </p>
                <p
                  className={`text-base font-black tabular-nums ${
                    willGoNegative ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {fmt(newBalance)}
                </p>
              </div>
              {willGoNegative && (
                <div className="flex items-start gap-1.5 mt-2 text-[11px] text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Este bolsillo va a quedar en negativo. Aun asi puedes
                    registrarlo; luego transfieres para cubrir.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Categoria con chips de sugerencia */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Categoria (opcional)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={action === "deposit" ? "Sueldo, Venta..." : "Comida, Transporte..."}
              maxLength={60}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                    category === cat
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/50"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Descripcion */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Descripcion (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas o detalle del movimiento"
              maxLength={255}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Fecha
            </label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount || parseFloat(amount) <= 0}
            className={`px-4 py-1.5 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action === "deposit"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isPending
              ? "Registrando..."
              : action === "deposit"
                ? "Depositar"
                : "Retirar"}
          </button>
        </div>
      </div>
    </div>
  );
}
