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
import { Plus, Wallet, Star } from "lucide-react";
import CreateWalletModal from "./CreateWalletModal";

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
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
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
    </>
  );
}
