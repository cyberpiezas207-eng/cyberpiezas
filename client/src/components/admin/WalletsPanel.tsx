// ============================================================================
// WALLETS PANEL - Tarjeta del dashboard que muestra todos los bolsillos
// ----------------------------------------------------------------------------
// Lista compacta de wallets con su balance, color, icono.
// Boton "+ Nuevo bolsillo" abre CreateWalletModal.
// Total agregado en el header.
// Modo Esposa Fase A - parte de Wallets-2.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Wallet, Star, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft } from "lucide-react";
import CreateWalletModal from "./CreateWalletModal";
import WalletMovementModal from "./WalletMovementModal";
import TransferWalletsModal from "./TransferWalletsModal";

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function WalletsPanel() {
  const [showCreate, setShowCreate] = useState(false);

  // Wallets-2B: estado para el modal de movimientos (deposit/withdraw)
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<"deposit" | "withdraw">(
    "deposit",
  );

  // Wallets-2C: estado para el modal de transferencia
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFromId, setTransferFromId] = useState<number | null>(null);

  function openMovementModal(wallet: any, action: "deposit" | "withdraw") {
    setSelectedWallet(wallet);
    setModalAction(action);
  }

  function openTransferModal(fromId: number | null = null) {
    setTransferFromId(fromId);
    setShowTransfer(true);
  }

  const walletsQuery = trpc.personalWallets.wallets.list.useQuery();
  const wallets = (walletsQuery.data ?? []) as any[];

  // Total agregado
  const total = wallets.reduce(
    (sum, w) => sum + (Number(w.balance) || 0),
    0,
  );

  // Color de la barra principal cambia segun si hay bolsillos en negativo
  const hasNegative = wallets.some((w) => Number(w.balance) < 0);

  return (
    <>
      <div className="relative rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
        {/* Glow decorativo */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: hasNegative ? "#f43f5e" : "#fbbf24" }}
        />

        {/* Header */}
        <div className="relative px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: hasNegative ? "#f43f5e22" : "#fbbf2422",
                border: `1px solid ${hasNegative ? "#f43f5e" : "#fbbf24"}`,
              }}
            >
              <Wallet
                className="w-4 h-4"
                style={{ color: hasNegative ? "#fb7185" : "#fbbf24" }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Bolsillos
              </p>
              <h3 className="text-sm font-black text-white tracking-tight">
                Donde esta tu dinero
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {wallets.length > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Total
                </p>
                <p
                  className="text-base font-black tabular-nums tracking-tight"
                  style={{ color: hasNegative ? "#fb7185" : "#fbbf24" }}
                >
                  {fmt(total)}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
            {/* Wallets-2C: boton de transferencia (solo si hay 2+ bolsillos) */}
            {wallets.length >= 2 && (
              <button
                onClick={() => openTransferModal()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-slate-700 hover:bg-slate-600 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
                title="Transferir entre bolsillos"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Transferir</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="relative px-4 py-3">
          {walletsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-slate-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400 mb-1">
                Aun no tienes bolsillos
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Crea uno para organizar tu dinero por categoria
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear primer bolsillo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {wallets.map((w) => {
                const balance = Number(w.balance) || 0;
                const isNeg = balance < 0;
                return (
                  <div
                    key={w.id}
                    className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    {/* Fila 1: info del bolsillo */}
                    <div className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{
                          backgroundColor: (w.color || "#fbbf24") + "22",
                          border: `1px solid ${w.color || "#fbbf24"}`,
                        }}
                      >
                        {w.icon || "👛"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-bold text-slate-100 truncate">
                            {w.name}
                          </p>
                          {w.isDefault === 1 && (
                            <Star
                              className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0"
                              aria-label="Default"
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {w.ownerName || w.walletType}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-black tabular-nums shrink-0 ${
                          isNeg ? "text-rose-400" : "text-slate-100"
                        }`}
                      >
                        {fmt(balance)}
                      </p>
                    </div>
                    {/* Fila 2: botones rapidos Wallets-2B */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openMovementModal(w, "deposit")}
                        className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md transition-colors"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        Depositar
                      </button>
                      <button
                        type="button"
                        onClick={() => openMovementModal(w, "withdraw")}
                        className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md transition-colors"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        Retirar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateWalletModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Wallets-2B: modal de depositos y retiros */}
      <WalletMovementModal
        open={!!selectedWallet}
        wallet={selectedWallet}
        defaultAction={modalAction}
        onClose={() => setSelectedWallet(null)}
      />

      {/* Wallets-2C: modal de transferencia entre bolsillos */}
      <TransferWalletsModal
        open={showTransfer}
        wallets={wallets}
        defaultFromId={transferFromId}
        onClose={() => {
          setShowTransfer(false);
          setTransferFromId(null);
        }}
      />
    </>
  );
}
