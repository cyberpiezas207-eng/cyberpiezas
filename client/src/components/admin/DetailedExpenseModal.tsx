// ============================================================================
// MODAL "Captura detallada" de gasto
// ----------------------------------------------------------------------------
// Campos: descripcion, monto opcional, categoria, tienda, fecha, metodo de pago.
// + V3: BOLSILLO (opcional) - si se selecciona, descuenta automaticamente del
//   wallet despues de crear el gasto. Trazabilidad por notas "Gasto: X".
// Si el monto va vacio -> se guarda como pendiente (no afecta stats).
// Self-contained: hace su propia mutation y refresca queries al guardar.
// Overlay propio con cierre por ESC, X o clic fuera.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  FileText,
  CalendarDays,
  Wallet,
  Tag,
  Store,
  CreditCard,
  PiggyBank,
  ArrowDown,
  AlertCircle,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

const PAYMENT_OPTIONS: {
  value: "cash" | "debit" | "credit" | "transfer" | "other";
  label: string;
  icon: string;
}[] = [
  { value: "cash", label: "Efectivo", icon: "💵" },
  { value: "debit", label: "Debito", icon: "💳" },
  { value: "credit", label: "Credito", icon: "💳" },
  { value: "transfer", label: "Transferencia", icon: "🏦" },
  { value: "other", label: "Otro", icon: "📝" },
];

// Formateador de pesos para preview
const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

// Morelos = UTC-6 todo el ano
function todayMexicoYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DetailedExpenseModal({ onClose, onSaved }: Props) {
  const utils = trpc.useUtils();

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [storeId, setStoreId] = useState<number | "">("");
  const [expenseDate, setExpenseDate] = useState(todayMexicoYMD());
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "debit" | "credit" | "transfer" | "other"
  >("cash");
  const [notes, setNotes] = useState("");
  // V3: estado para wallet seleccionado
  const [walletId, setWalletId] = useState<number | "">("");

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const storesQuery = trpc.personalExpenses.stores.list.useQuery();
  // V3: listar wallets disponibles
  const walletsQuery = trpc.personalWallets.wallets.list.useQuery();

  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const wallets = (walletsQuery.data ?? []) as any[];

  // V3: mutation aparte para retirar del wallet
  const withdrawFromWallet =
    trpc.personalWallets.wallets.withdraw.useMutation();

  const parsedAmount = (() => {
    const n = Number(amountStr.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  const isPending = parsedAmount === 0;

  // V3: wallet seleccionada actual
  const selectedWallet =
    walletId === "" ? null : wallets.find((w) => w.id === walletId) ?? null;

  // V3: saldo despues del retiro (preview)
  const walletBalanceAfter =
    selectedWallet && parsedAmount > 0
      ? Number(selectedWallet.balance ?? 0) - parsedAmount
      : null;

  const createDetailed =
    trpc.personalExpensesCapture.createDetailed.useMutation({
      onSuccess: async (_createdExpense) => {
        // V3: si seleccionaste un wallet Y hay monto valido, descontar
        let walletWarning: string | null = null;
        let walletSuccess = false;

        if (walletId !== "" && !isPending && parsedAmount > 0) {
          try {
            await withdrawFromWallet.mutateAsync({
              walletId: walletId as number,
              amount: parsedAmount,
              description: `Gasto: ${description.trim().slice(0, 200)}`,
              category: "gasto",
              occurredAt: expenseDate,
            });
            walletSuccess = true;
          } catch (e: any) {
            walletWarning =
              e?.message || "No se pudo descontar del bolsillo";
          }
        }

        // Mensajes contextuales
        if (walletSuccess) {
          toast.success(
            `Gasto guardado y ${fmtMXN(parsedAmount)} descontado de ${selectedWallet?.name}`,
          );
        } else if (walletWarning) {
          toast.warning(
            `Gasto guardado, pero el bolsillo: ${walletWarning}`,
          );
        } else if (isPending) {
          toast.success(
            "Gasto guardado como pendiente (asigna monto cuando lo sepas)",
          );
        } else {
          toast.success("Gasto guardado");
        }

        // Invalidar queries de gastos
        utils.personalExpenses.stats.dashboard.invalidate();
        utils.personalExpenses.expenses.list.invalidate();
        // V3: invalidar tambien queries de wallets si hubo descuento
        if (walletSuccess) {
          utils.personalWallets.wallets.list.invalidate();
          utils.personalWallets.movements.list.invalidate();
        }

        onSaved?.();
        onClose();
      },
      onError: (e) => toast.error(e.message || "No se pudo guardar"),
    });

  const canSave =
    description.trim().length > 0 &&
    !createDetailed.isPending &&
    !withdrawFromWallet.isPending;

  const selectedStore =
    storeId === "" ? null : stores.find((s) => s.id === storeId) ?? null;

  // V3: validacion: si se selecciono wallet pero el gasto es pendiente, advertir
  const walletWithPendingWarning =
    walletId !== "" && isPending && description.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    createDetailed.mutate({
      description: description.trim(),
      amount: isPending ? null : parsedAmount,
      categoryId: categoryId === "" ? null : categoryId,
      storeId: storeId === "" ? null : storeId,
      storeName: selectedStore?.name ?? null,
      expenseDate,
      paymentMethod,
      notes: notes.trim() ? notes.trim() : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-start justify-between gap-3 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-300">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Captura detallada
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Para gastos que no caben en la captura rapida o que aun no tienes monto.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Descripcion */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Descripcion *
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Comida corrida en Huitzilac, gas LP, recarga..."
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Monto (opcional)
              </label>
              <Input
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
              {isPending && description.trim() && (
                <p className="text-[10px] text-amber-400 mt-1">
                  ⏳ Sin monto = se guarda pendiente
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Fecha
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
              />
            </div>
          </div>

          {/* V3: BOLSILLO (opcional) - SOLO si hay wallets */}
          {wallets.length > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/30 via-slate-800 to-slate-800/80 border border-emerald-500/30">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1 mb-1">
                <PiggyBank className="w-3 h-3" />
                Sale del bolsillo (opcional)
              </label>
              <p className="text-[10px] text-slate-400 mb-2">
                Si seleccionas un bolsillo, se descontara el monto automaticamente.
              </p>
              <select
                value={walletId === "" ? "" : String(walletId)}
                onChange={(e) =>
                  setWalletId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No descontar de ningun bolsillo</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name} · {fmtMXN(Number(w.balance ?? 0))}
                  </option>
                ))}
              </select>

              {/* Preview saldo despues */}
              {selectedWallet && walletBalanceAfter != null && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">Saldo despues:</span>
                    <div className="flex items-center gap-1 font-bold tabular-nums">
                      <span className="text-slate-500">
                        {fmtMXN(Number(selectedWallet.balance ?? 0))}
                      </span>
                      <ArrowDown className="w-3 h-3 text-rose-400" />
                      <span
                        className={
                          walletBalanceAfter < 0
                            ? "text-rose-300"
                            : "text-emerald-300"
                        }
                      >
                        {fmtMXN(walletBalanceAfter)}
                      </span>
                    </div>
                  </div>
                  {walletBalanceAfter < 0 && (
                    <p className="text-[10px] text-rose-300 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      El bolsillo quedara en negativo (se permite)
                    </p>
                  )}
                </div>
              )}

              {/* Warning si gasto es pendiente pero hay wallet */}
              {walletWithPendingWarning && (
                <p className="text-[10px] text-amber-300 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Sin monto, no se puede descontar del bolsillo todavia.
                </p>
              )}
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Categoria
            </label>
            <select
              value={categoryId === "" ? "" : String(categoryId)}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
            >
              <option value="">Sin clasificar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tienda */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Store className="w-3 h-3" /> Tienda
            </label>
            <select
              value={storeId === "" ? "" : String(storeId)}
              onChange={(e) =>
                setStoreId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
            >
              <option value="">Sin tienda</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Metodo de pago */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Metodo de pago
            </label>
            <div className="grid grid-cols-5 gap-1 mt-1">
              {PAYMENT_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPaymentMethod(p.value)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    paymentMethod === p.value
                      ? "bg-orange-500/15 border border-orange-500/40 text-orange-200"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <span className="leading-tight text-center">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier detalle extra"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm resize-none"
            />
          </div>

          {/* Resumen */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardContent className="p-3 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Resumen:</span>
                {isPending ? (
                  <span className="font-bold text-amber-400">⏳ Pendiente</span>
                ) : (
                  <span className="font-bold text-orange-400">
                    {fmtMXN(parsedAmount)}
                  </span>
                )}
              </div>
              {selectedWallet && !isPending && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/60">
                  <span className="text-slate-400">Sale de:</span>
                  <span className="font-bold text-emerald-300">
                    {selectedWallet.icon} {selectedWallet.name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {createDetailed.isPending || withdrawFromWallet.isPending
                ? "Guardando..."
                : "Guardar gasto"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
