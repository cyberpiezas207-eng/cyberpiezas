// ============================================================================
// MODAL "Captura detallada" de gasto (V2 - Wallets-3 Lite)
// ----------------------------------------------------------------------------
// Campos: descripcion, monto opcional, categoria, tienda, fecha, metodo de pago,
//         BOLSILLO opcional (NUEVO V2).
//
// Si el monto va vacio -> se guarda como pendiente (no afecta stats).
//
// NUEVO V2:
//   - Selector visual de bolsillo (opcional)
//   - Auto-default al bolsillo marcado como default
//   - Vista previa del saldo despues del gasto
//   - Warning si el gasto excede el saldo (NO bloquea, solo avisa)
//   - Si hay bolsillo + monto > 0: hace 2 mutations en cadena:
//       1) crear gasto detallado
//       2) wallets.withdraw del bolsillo seleccionado
//   - Si el gasto es pendiente o no hay bolsillo: solo crea gasto (igual que antes)
//
// NUNCA mezcla con POS de clientes (boutique/vet/abarrotes). Vive 100% en
// cuarto privado (ownerOnly en ambos routers).
//
// Self-contained: hace sus propias mutations y refresca queries al guardar.
// Overlay propio con cierre por ESC, X o clic fuera.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect, useMemo } from "react";
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
  Banknote,
  AlertTriangle,
  CheckCircle2,
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

// Morelos = UTC-6 todo el ano
function todayMexicoYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
  const [walletId, setWalletId] = useState<number | "">(""); // NUEVO V2

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
  const walletsQuery = trpc.personalWallets.wallets.list.useQuery(); // NUEVO V2

  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];

  // Auto-default: pre-seleccionar bolsillo default al cargar (solo una vez)
  useEffect(() => {
    if (walletId === "" && wallets.length > 0) {
      const def = wallets.find((w: any) => w.isDefault);
      if (def) {
        setWalletId(def.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length]);

  // ----- Mutations -----
  const createDetailed = trpc.personalExpensesCapture.createDetailed.useMutation();
  const withdrawWallet = trpc.personalWallets.wallets.withdraw.useMutation();

  const parsedAmount = useMemo(() => {
    const n = Number(amountStr.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const isPending = parsedAmount === 0;
  const canSave = description.trim().length > 0 && !createDetailed.isPending;

  const selectedStore =
    storeId === "" ? null : stores.find((s: any) => s.id === storeId) ?? null;

  // ----- Wallet helpers -----
  const selectedWallet = useMemo(() => {
    if (walletId === "") return null;
    return wallets.find((w: any) => w.id === walletId) ?? null;
  }, [walletId, wallets]);

  const currentBalance = selectedWallet
    ? Number(selectedWallet.balance ?? 0)
    : 0;

  const balanceAfter = selectedWallet ? currentBalance - parsedAmount : 0;

  const insufficientFunds =
    selectedWallet != null && !isPending && balanceAfter < 0;

  const willWithdraw =
    selectedWallet != null && !isPending && parsedAmount > 0;

  // ----- Submit con cadena de 2 mutations -----
  async function handleSave() {
    if (!canSave) return;

    try {
      // 1) Crear gasto detallado
      await createDetailed.mutateAsync({
        description: description.trim(),
        amount: isPending ? null : parsedAmount,
        categoryId: categoryId === "" ? null : categoryId,
        storeId: storeId === "" ? null : storeId,
        storeName: selectedStore?.name ?? null,
        expenseDate,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : null,
        walletId: walletId === "" ? null : walletId,
      } as any);

      // 2) Si aplica, descontar del bolsillo
      if (willWithdraw && walletId !== "") {
        try {
          await withdrawWallet.mutateAsync({
            walletId: walletId,
            amount: parsedAmount,
            description: `Gasto: ${description.trim()}`,
            category: selectedStore?.name ?? null,
            occurredAt: expenseDate,
          });
        } catch (err: any) {
          // El gasto ya se creo. Avisamos del fallo del bolsillo pero no rompemos.
          toast.warning(
            `Gasto guardado, pero no se pudo descontar del bolsillo: ${err?.message ?? "error"}`,
          );
        }
      }

      // Toast de exito y refrescar caches
      if (isPending) {
        toast.success("Gasto pendiente guardado (asigna monto despues)");
      } else if (willWithdraw) {
        toast.success(
          `Gasto guardado y descontado de "${selectedWallet?.name ?? "bolsillo"}"`,
        );
      } else {
        toast.success("Gasto guardado");
      }

      utils.personalExpenses.stats.dashboard.invalidate();
      utils.personalExpenses.expenses.list.invalidate();
      utils.personalWallets.wallets.list.invalidate();

      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    }
  }

  // ----- Renderizado -----
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
              <h2 className="text-lg font-bold text-white">Captura detallada</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Para gastos que no caben en la captura rapida o que aun no
                tienes monto.
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

          {/* ============= NUEVO V2: Selector de Bolsillo ============= */}
          {wallets.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Bolsillo (opcional)
              </label>
              <select
                value={walletId === "" ? "" : String(walletId)}
                onChange={(e) =>
                  setWalletId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
              >
                <option value="">Sin bolsillo</option>
                {wallets.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.icon ?? "💼"} {w.name} · {fmtMoney(Number(w.balance ?? 0))}
                  </option>
                ))}
              </select>

              {/* Vista previa del saldo despues del gasto */}
              {selectedWallet && !isPending && (
                <div
                  className={`mt-2 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between ${
                    insufficientFunds
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-200"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {insufficientFunds ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Saldo despues: <b>{fmtMoney(balanceAfter)}</b>
                    </span>
                  </div>
                  {insufficientFunds && (
                    <span className="text-[10px] opacity-80">
                      excede el saldo
                    </span>
                  )}
                </div>
              )}
              {selectedWallet && isPending && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Sin monto = no se descuenta del bolsillo aun.
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
                setCategoryId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
            >
              <option value="">Sin clasificar</option>
              {categories.map((c: any) => (
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
              {stores.map((s: any) => (
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
            <CardContent className="p-3 text-xs text-slate-300">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400">Resumen:</span>
                {isPending ? (
                  <span className="font-bold text-amber-400">⏳ Pendiente</span>
                ) : (
                  <span className="font-bold text-orange-400">
                    ${parsedAmount.toLocaleString("es-MX")}
                  </span>
                )}
              </div>
              {willWithdraw && selectedWallet && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">Se descontara de:</span>
                  <span className="font-medium text-cyan-300">
                    {selectedWallet.icon ?? "💼"} {selectedWallet.name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={!canSave || createDetailed.isPending || withdrawWallet.isPending}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {createDetailed.isPending || withdrawWallet.isPending
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
