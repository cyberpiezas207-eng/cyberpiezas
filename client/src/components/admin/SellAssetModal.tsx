// ============================================================================
// MODAL "Vender activo vinculado a deuda"
// ----------------------------------------------------------------------------
// Cuando una deuda tiene linkedAssetName, este modal permite registrar la venta
// del bien y decidir que hacer con el dinero recibido:
//   - Solo registrar la venta (no tocar la deuda)
//   - Pagar lo mas posible (min entre salePrice y currentBalance)
//   - Pagar un monto parcial decidido por el usuario
//
// Calculos en vivo:
//   - Resultado (gain/loss) vs precio original
//   - Saldo despues de aplicar el pago
//   - Sobrante en bolsillo del usuario
//
// Llama al endpoint atomico personalDebts.assets.sellAndPay para que ambas
// operaciones (vender + pagar) sucedan en una sola transaccion coherente.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  Tag,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtExact = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function todayYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PaymentOption = "none" | "all_possible" | "partial";

interface Props {
  debt: any;
  onClose: () => void;
  onCompleted: () => void;
}

export default function SellAssetModal({ debt, onClose, onCompleted }: Props) {
  const balance = Number(debt.currentBalance);
  const original = debt.originalAmount ? Number(debt.originalAmount) : 0;

  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState(todayYMD());
  const [buyer, setBuyer] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentOption, setPaymentOption] = useState<PaymentOption>(
    "all_possible",
  );
  const [partialAmount, setPartialAmount] = useState("");
  const [createExpense, setCreateExpense] = useState(true);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const categories = categoriesQuery.data ?? [];
  const deudasCategory = categories.find((c) =>
    (c.slug ?? "").toLowerCase().includes("deuda"),
  );

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Calculos en vivo
  const priceN = Number(salePrice) || 0;
  const partialN = Number(partialAmount) || 0;
  const gainLoss = priceN > 0 && original > 0 ? priceN - original : 0;
  const isLoss = gainLoss < 0;

  let toApply = 0;
  if (paymentOption === "all_possible") {
    toApply = Math.min(priceN, balance);
  } else if (paymentOption === "partial") {
    toApply = Math.min(partialN, balance);
  }
  const balanceAfter = Math.max(0, balance - toApply);
  const surplus = Math.max(0, priceN - toApply);
  const willLiquidate = balanceAfter <= 0.01 && toApply > 0;

  const sellAndPay = trpc.personalDebts.assets.sellAndPay.useMutation({
    onSuccess: (res) => {
      const parts: string[] = ["Venta registrada"];
      if (res.payment) parts.push("pago aplicado");
      if (res.expenseId) parts.push("gasto creado");
      if (res.debt.status === "paid") parts.push("DEUDA LIQUIDADA 🏆");
      toast.success(parts.join(" · "));
      onCompleted();
    },
    onError: (e) => toast.error(e.message || "No se pudo registrar la venta"),
  });

  function handleSubmit() {
    if (priceN <= 0) {
      toast.error("Pon un precio de venta valido");
      return;
    }
    let paymentAmount = 0;
    if (paymentOption === "all_possible") {
      paymentAmount = Math.min(priceN, balance);
    } else if (paymentOption === "partial") {
      if (partialN <= 0) {
        toast.error("Pon un monto parcial valido");
        return;
      }
      paymentAmount = Math.min(partialN, balance);
    }

    sellAndPay.mutate({
      debtId: debt.id,
      soldPrice: priceN,
      soldAt: saleDate,
      soldBuyer: buyer.trim() || null,
      soldNotes: notes.trim() || null,
      paymentAmount,
      // Si paga el total que liquida la deuda, no es "parcial"; avanza estado a paid
      paymentIsPartial: !willLiquidate,
      createExpense: createExpense && paymentAmount > 0,
      expenseCategoryId: deudasCategory?.id ?? null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <div className="absolute -top-16 -right-12 w-40 h-40 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative p-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30 flex items-center justify-center text-lg shrink-0">
                <Tag className="w-5 h-5 text-orange-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-200 mb-0.5">
                  Vender activo
                </div>
                <h2 className="text-base font-black text-white tracking-tight truncate">
                  {debt.linkedAssetName ?? debt.title}
                </h2>
                <p className="text-[11px] text-slate-500">
                  vinculado a deuda {debt.creditorName}
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
        </div>

        <div className="p-5 space-y-5">
          {/* ============ SECCION 1: Datos de la venta ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-orange-300" />
              Datos de la venta
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Precio de venta *
                </label>
                <Input
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="5000"
                  inputMode="decimal"
                  className="bg-slate-900 border-slate-700 text-white mt-1 text-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Fecha
                  </label>
                  <Input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Comprador (opcional)
                  </label>
                  <Input
                    value={buyer}
                    onChange={(e) => setBuyer(e.target.value)}
                    placeholder="Juan / amigo"
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notas (opcional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej: lo vendi por internet"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
          </section>

          {/* ============ SECCION 2: Resultado vs compra ============ */}
          {priceN > 0 && original > 0 && (
            <section className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
                {isLoss ? (
                  <TrendingDown className="w-3 h-3 text-rose-300" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-emerald-300" />
                )}
                Resultado vs compra original
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Precio original</span>
                  <span className="text-slate-200 font-bold">
                    {fmtExact(original)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Precio venta</span>
                  <span className="text-slate-200 font-bold">
                    {fmtExact(priceN)}
                  </span>
                </div>
                <div className="h-px bg-slate-700 my-1.5" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">
                    {isLoss ? "Perdida" : gainLoss > 0 ? "Ganancia" : "Igual"}
                  </span>
                  <span
                    className={`text-base font-black ${
                      isLoss
                        ? "text-rose-400"
                        : gainLoss > 0
                          ? "text-emerald-400"
                          : "text-slate-300"
                    }`}
                  >
                    {gainLoss === 0
                      ? fmtExact(0)
                      : `${gainLoss > 0 ? "+" : ""}${fmtExact(gainLoss)}`}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ============ SECCION 3: Que hacer con el dinero ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <Wallet className="w-3 h-3 text-indigo-300" />
              ¿Que hacer con el dinero?
            </h3>

            <p className="text-[11px] text-slate-400 mb-2">
              Saldo actual de la deuda:{" "}
              <span className="text-rose-300 font-bold">
                {fmtExact(balance)}
              </span>
            </p>

            <div className="space-y-2">
              {/* Opcion 1: No pagar */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentOption === "none"
                    ? "bg-slate-700/50 border-slate-500"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === "none"}
                  onChange={() => setPaymentOption("none")}
                  className="mt-0.5 accent-slate-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">
                    Solo registrar la venta
                  </div>
                  <p className="text-[11px] text-slate-400">
                    El saldo de {fmt(balance)} sigue activo · te quedas con todo
                    el dinero
                  </p>
                </div>
              </label>

              {/* Opcion 2: Pagar lo mas posible */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentOption === "all_possible"
                    ? "bg-emerald-500/10 border-emerald-400/50"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === "all_possible"}
                  onChange={() => setPaymentOption("all_possible")}
                  className="mt-0.5 accent-emerald-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      Pagar lo mas posible
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30">
                      Recomendado
                    </span>
                  </div>
                  {priceN > 0 && paymentOption === "all_possible" && (
                    <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                      <div>
                        Aplicar a deuda:{" "}
                        <span className="text-emerald-300 font-bold">
                          {fmtExact(toApply)}
                        </span>
                      </div>
                      <div>
                        Saldo despues:{" "}
                        <span
                          className={`font-bold ${balanceAfter <= 0.01 ? "text-emerald-300" : "text-rose-300"}`}
                        >
                          {fmtExact(balanceAfter)}
                        </span>
                        {willLiquidate && (
                          <span className="ml-2 text-emerald-300 font-bold">
                            🏆 LIQUIDADA
                          </span>
                        )}
                      </div>
                      {surplus > 0 && (
                        <div>
                          Sobrante para ti:{" "}
                          <span className="text-emerald-300 font-bold">
                            {fmtExact(surplus)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* Opcion 3: Parcial */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentOption === "partial"
                    ? "bg-amber-500/10 border-amber-400/50"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === "partial"}
                  onChange={() => setPaymentOption("partial")}
                  className="mt-0.5 accent-amber-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">
                    Pagar un monto parcial
                  </div>
                  {paymentOption === "partial" && (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder="ej: 2000"
                        inputMode="decimal"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      {partialN > 0 && priceN > 0 && (
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <div>
                            Aplicar a deuda:{" "}
                            <span className="text-amber-300 font-bold">
                              {fmtExact(Math.min(partialN, balance))}
                            </span>
                          </div>
                          <div>
                            Saldo despues:{" "}
                            <span className="text-rose-300 font-bold">
                              {fmtExact(
                                Math.max(0, balance - Math.min(partialN, balance)),
                              )}
                            </span>
                          </div>
                          <div>
                            Sobrante para ti:{" "}
                            <span className="text-emerald-300 font-bold">
                              {fmtExact(
                                priceN - Math.min(partialN, balance),
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </section>

          {/* Toggle de gasto vinculado */}
          {paymentOption !== "none" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createExpense}
                onChange={(e) => setCreateExpense(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-500"
              />
              <span className="text-xs text-slate-300">
                Crear gasto personal vinculado al pago
              </span>
              {deudasCategory && (
                <span className="text-[10px] text-emerald-300 font-bold">
                  · "{deudasCategory.name}"
                </span>
              )}
            </label>
          )}

          {/* Aviso si la regla inviolable aplica */}
          {priceN > 0 && balance > 0 && paymentOption === "none" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-snug">
                Recuerda: vender el activo NO cancela automaticamente la deuda.
                Si eliges esta opcion, los {fmtExact(balance)} siguen
                pendientes.
              </p>
            </div>
          )}

          {/* Sticker celebracion si liquida */}
          {willLiquidate && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/40">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-200 leading-snug font-bold">
                Esta venta liquida la deuda completa. Pasa a tu archivo de
                trofeos 🏆
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sellAndPay.isPending || priceN <= 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-md"
            >
              <Receipt className="w-4 h-4 mr-1" />
              {sellAndPay.isPending ? "Registrando..." : "Confirmar venta"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
