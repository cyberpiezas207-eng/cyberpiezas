// ============================================================================
// WALLET DETAIL MODAL - Vista completa de un bolsillo
// ----------------------------------------------------------------------------
// Muestra:
//   - Header con icono, nombre, owner, balance grande
//   - 3 stats cards: entradas del mes, salidas del mes, neto
//   - Navegador de mes (anterior/siguiente)
//   - Lista cronologica de movimientos:
//     - Depositos (verde ↓)
//     - Retiros (rojo ↑)
//     - Transferencias (ambar ↔ con nombre del bolsillo opuesto)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDate(ymd: string | null): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS_ES[(m ?? 1) - 1].slice(0, 3).toLowerCase()}`;
}

// ----------------------------------------------------------------------------
// Helper: icono y color por tipo de movimiento
// ----------------------------------------------------------------------------

function getMovementVisual(movementType: string) {
  switch (movementType) {
    case "deposit":
    case "transfer_in":
      return {
        Icon: movementType === "transfer_in" ? ArrowRightLeft : ArrowDownCircle,
        color: "text-emerald-300",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        sign: "+",
        label: movementType === "transfer_in" ? "Llego" : "Deposito",
      };
    case "withdrawal":
    case "transfer_out":
      return {
        Icon:
          movementType === "transfer_out" ? ArrowRightLeft : ArrowUpCircle,
        color: "text-rose-300",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        sign: "-",
        label: movementType === "transfer_out" ? "Envio" : "Retiro",
      };
    default:
      return {
        Icon: ArrowDownCircle,
        color: "text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/30",
        sign: "",
        label: "Otro",
      };
  }
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface WalletDetailModalProps {
  open: boolean;
  walletId: number | null;
  allWallets: any[]; // Para resolver nombres de bolsillos opuestos en transfers
  onClose: () => void;
}

export default function WalletDetailModal({
  open,
  walletId,
  allWallets,
  onClose,
}: WalletDetailModalProps) {
  const today = nowMexico();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Queries (solo se ejecutan si tenemos walletId y el modal esta abierto)
  const walletQuery = trpc.personalWallets.wallets.get.useQuery(
    { id: walletId ?? 0 },
    { enabled: open && walletId != null },
  );

  const movementsQuery = trpc.personalWallets.movements.list.useQuery(
    { walletId: walletId ?? 0, limit: 100 },
    { enabled: open && walletId != null },
  );

  const statsQuery = trpc.personalWallets.movements.monthStats.useQuery(
    { walletId: walletId ?? 0, year, month },
    { enabled: open && walletId != null },
  );

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // Build wallet lookup map para counterparts
  const walletById = new Map<number, any>(allWallets.map((w) => [w.id, w]));

  if (!open || walletId == null) return null;

  const wallet = walletQuery.data;
  const movements = (movementsQuery.data ?? []) as any[];
  const stats = statsQuery.data;
  const isLoading = walletQuery.isLoading;
  const balance = wallet ? Number((wallet as any).balance) || 0 : 0;
  const isNeg = balance < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con info del bolsillo */}
        {isLoading || !wallet ? (
          <div className="px-5 py-6 border-b border-slate-700 animate-pulse">
            <div className="h-16 bg-slate-800 rounded-lg" />
          </div>
        ) : (
          <div
            className="relative overflow-hidden border-b border-slate-700"
            style={{
              backgroundColor: ((wallet as any).color || "#fbbf24") + "08",
            }}
          >
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-15"
              style={{
                backgroundColor: (wallet as any).color || "#fbbf24",
              }}
            />
            <div className="relative px-5 py-4 flex items-center gap-3">
              <span
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  backgroundColor: ((wallet as any).color || "#fbbf24") + "22",
                  border: `1px solid ${(wallet as any).color || "#fbbf24"}`,
                }}
              >
                {(wallet as any).icon || "👛"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Detalle del bolsillo
                </p>
                <h3 className="text-lg font-black text-white tracking-tight truncate">
                  {(wallet as any).name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {(wallet as any).ownerName || (wallet as any).walletType}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo
                </p>
                <p
                  className={`text-2xl font-black tabular-nums tracking-tight ${
                    isNeg ? "text-rose-300" : "text-amber-300"
                  }`}
                >
                  {fmt(balance)}
                </p>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Navegador de mes + stats */}
          <div className="px-5 py-4 border-b border-slate-700/50">
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 min-w-[140px] text-center">
                <div className="text-xs font-bold text-white">
                  {MONTHS_ES[month - 1]} {year}
                </div>
                {!atCurrentMonth && (
                  <button
                    onClick={() => {
                      setYear(today.getFullYear());
                      setMonth(today.getMonth() + 1);
                    }}
                    className="text-[9px] text-amber-300 uppercase tracking-wider font-bold"
                  >
                    ← Mes actual
                  </button>
                )}
              </div>
              <button
                onClick={() => shiftMonth(1)}
                disabled={atCurrentMonth}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 stat cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">
                  Entradas
                </p>
                <p className="text-base font-black text-emerald-300 tabular-nums">
                  {stats ? fmt(Number(stats.totalIn) || 0) : "—"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400/70">
                  Salidas
                </p>
                <p className="text-base font-black text-rose-300 tabular-nums">
                  {stats ? fmt(Number(stats.totalOut) || 0) : "—"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Neto
                </p>
                <p
                  className={`text-base font-black tabular-nums ${
                    stats && Number(stats.net) < 0
                      ? "text-rose-300"
                      : "text-slate-200"
                  }`}
                >
                  {stats ? fmt(Number(stats.net) || 0) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de movimientos */}
          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">
              Historial de movimientos
            </h4>

            {movementsQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-slate-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sin movimientos</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cierra esta vista y haz tu primer deposito o retiro
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {movements.map((m) => {
                  const visual = getMovementVisual(m.movementType);
                  const counterpart =
                    m.counterpartWalletId != null
                      ? walletById.get(m.counterpartWalletId)
                      : null;
                  const amount = Number(m.amount) || 0;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg ${visual.bg} border ${visual.border}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${visual.color}`}
                      >
                        <visual.Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-100 truncate">
                            {m.description || visual.label}
                          </p>
                          {m.category && (
                            <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
                              {m.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {formatDate(m.occurredAt)}
                          {counterpart && (
                            <>
                              {" · "}
                              {m.movementType === "transfer_out" ? "→ " : "← "}
                              <span className="text-amber-300">
                                {counterpart.name}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-black tabular-nums shrink-0 ${visual.color}`}
                      >
                        {visual.sign}
                        {fmt(amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
