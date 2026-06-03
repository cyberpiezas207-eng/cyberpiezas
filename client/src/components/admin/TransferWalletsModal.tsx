// ============================================================================
// TRANSFER WALLETS MODAL - Transferir dinero entre 2 bolsillos
// ----------------------------------------------------------------------------
// Recibe: open, wallets (todos), onClose, defaultFromId (opcional)
// Genera 2 movimientos coordinados: transfer_out + transfer_in
// El backend (transferBetweenWallets) se encarga de mantener consistencia.
//
// Preview en vivo: muestra ambos saldos antes/despues mientras escribes.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X,
  ArrowRightLeft,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";

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
// Wallet picker - card seleccionable
// ----------------------------------------------------------------------------

function WalletPicker({
  label,
  wallets,
  selectedId,
  excludeId,
  onSelect,
}: {
  label: string;
  wallets: any[];
  selectedId: number | null;
  excludeId: number | null;
  onSelect: (id: number) => void;
}) {
  const available = wallets.filter((w) => w.id !== excludeId);

  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
        {label}
      </label>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {available.map((w) => {
          const balance = Number(w.balance) || 0;
          const isSelected = selectedId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w.id)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left ${
                isSelected
                  ? "bg-amber-500/10 border-amber-500"
                  : "bg-slate-800 border-slate-700 hover:border-slate-600"
              }`}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{
                  backgroundColor: (w.color || "#fbbf24") + "22",
                  border: `1px solid ${w.color || "#fbbf24"}`,
                }}
              >
                {w.icon || "👛"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 truncate">
                  {w.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {w.ownerName || w.walletType}
                </p>
              </div>
              <p
                className={`text-xs font-black tabular-nums shrink-0 ${
                  balance < 0 ? "text-rose-400" : "text-slate-200"
                }`}
              >
                {fmt(balance)}
              </p>
            </button>
          );
        })}
        {available.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-3 italic">
            No hay otros bolsillos disponibles
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface TransferWalletsModalProps {
  open: boolean;
  wallets: any[];
  defaultFromId?: number | null;
  onClose: () => void;
}

export default function TransferWalletsModal({
  open,
  wallets,
  defaultFromId = null,
  onClose,
}: TransferWalletsModalProps) {
  const utils = trpc.useUtils();

  const [fromWalletId, setFromWalletId] = useState<number | null>(null);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayYMD());

  // Hidratar al abrir: si hay defaultFromId, usarlo; sino, el bolsillo default
  useEffect(() => {
    if (open) {
      const defaultFrom =
        defaultFromId ??
        wallets.find((w) => w.isDefault === 1)?.id ??
        wallets[0]?.id ??
        null;
      setFromWalletId(defaultFrom);
      // Auto-seleccionar otro bolsillo como destino (no el mismo)
      const otherWallet = wallets.find((w) => w.id !== defaultFrom);
      setToWalletId(otherWallet?.id ?? null);
      setAmount("");
      setDescription("");
      setOccurredAt(todayYMD());
    }
  }, [open, defaultFromId, wallets]);

  const transferMutation = trpc.personalWallets.wallets.transfer.useMutation({
    onSuccess: () => {
      toast.success(`Transferencia exitosa: ${fmt(parseFloat(amount) || 0)}`);
      utils.personalWallets.wallets.list.invalidate();
      if (fromWalletId) {
        utils.personalWallets.movements.list.invalidate({
          walletId: fromWalletId,
        });
      }
      if (toWalletId) {
        utils.personalWallets.movements.list.invalidate({
          walletId: toWalletId,
        });
      }
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo transferir"),
  });

  function handleClose() {
    if (transferMutation.isPending) return;
    onClose();
  }

  function handleSubmit() {
    if (!fromWalletId || !toWalletId) {
      toast.error("Selecciona ambos bolsillos");
      return;
    }
    if (fromWalletId === toWalletId) {
      toast.error("No puedes transferir al mismo bolsillo");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("El monto debe ser mayor a cero");
      return;
    }

    transferMutation.mutate({
      fromWalletId,
      toWalletId,
      amount: amt,
      description: description.trim() || null,
      occurredAt,
    });
  }

  if (!open) return null;

  // Wallets seleccionados (para preview)
  const fromWallet = wallets.find((w) => w.id === fromWalletId) ?? null;
  const toWallet = wallets.find((w) => w.id === toWalletId) ?? null;

  const amountNum = parseFloat(amount) || 0;
  const fromBalance = fromWallet ? Number(fromWallet.balance) || 0 : 0;
  const toBalance = toWallet ? Number(toWallet.balance) || 0 : 0;
  const fromAfter = fromBalance - amountNum;
  const toAfter = toBalance + amountNum;
  const willGoNegative = fromAfter < 0 && amountNum > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white tracking-tight">
              Transferir
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={transferMutation.isPending}
            type="button"
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* DESDE */}
          <WalletPicker
            label="Desde"
            wallets={wallets}
            selectedId={fromWalletId}
            excludeId={toWalletId}
            onSelect={setFromWalletId}
          />

          {/* Separator visual */}
          <div className="flex items-center justify-center py-1">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          {/* HACIA */}
          <WalletPicker
            label="Hacia"
            wallets={wallets}
            selectedId={toWalletId}
            excludeId={fromWalletId}
            onSelect={setToWalletId}
          />

          {/* Monto */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Monto a transferir *
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

          {/* Preview de ambos saldos */}
          {amountNum > 0 && fromWallet && toWallet && (
            <div
              className={`p-3 rounded-lg border ${
                willGoNegative
                  ? "bg-rose-500/10 border-rose-500/50"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Despues de la transferencia
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="text-base">{fromWallet.icon || "👛"}</span>
                    <span className="text-slate-300 truncate">
                      {fromWallet.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="text-slate-500">{fmt(fromBalance)}</span>
                    <span className="text-slate-600">→</span>
                    <span
                      className={`font-black ${
                        fromAfter < 0 ? "text-rose-300" : "text-slate-200"
                      }`}
                    >
                      {fmt(fromAfter)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="text-base">{toWallet.icon || "👛"}</span>
                    <span className="text-slate-300 truncate">
                      {toWallet.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="text-slate-500">{fmt(toBalance)}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-300 font-black">
                      {fmt(toAfter)}
                    </span>
                  </span>
                </div>
              </div>
              {willGoNegative && (
                <div className="flex items-start gap-1.5 mt-2 text-[11px] text-rose-300 border-t border-rose-500/30 pt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    El bolsillo origen va a quedar en negativo. Aun puedes
                    transferir si lo necesitas.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Descripcion */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Descripcion (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Gasto semanal mujer, ahorro mensual"
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
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={transferMutation.isPending}
            className="px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              transferMutation.isPending ||
              !fromWalletId ||
              !toWalletId ||
              !amount ||
              parseFloat(amount) <= 0 ||
              fromWalletId === toWalletId
            }
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {transferMutation.isPending ? "Transfiriendo..." : "Transferir"}
          </button>
        </div>
      </div>
    </div>
  );
}
