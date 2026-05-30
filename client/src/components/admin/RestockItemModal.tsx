// ============================================================================
// MODAL "Comprar de nuevo" - reponer item de alacena con precio y tienda
// ----------------------------------------------------------------------------
// Muestra al usuario contexto premium:
//   - Ultima compra (precio + tienda + hace cuanto)
//   - Mejor precio historico (con badge si la seleccion actual es la mas barata)
// Formulario:
//   - Precio (prellenado con el ultimo precio si existe)
//   - Tienda (prellenada con la ultima o la mas barata)
//   - Toggle "Crear gasto vinculado" + categoria
// Llama a personalPantryRestock.submitRestock (compositor).
// Overlay propio (ESC, X, clic fuera).
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
  ShoppingBag,
  TrendingDown,
  Store,
  Wallet,
  Sparkles,
  Calendar,
  Trophy,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(n);

function todayMexicoYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysSince(dateStr: string | Date | null | undefined): number | null {
  if (!dateStr) return null;
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const diff = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff < 0 ? 0 : diff;
}

interface PantryItemLite {
  id: number;
  name: string;
  icon?: string | null;
  categoryId?: number | null;
  lastPurchasePrice?: string | number | null;
  lastStoreId?: number | null;
  lastPurchasedAt?: string | Date | null;
}

interface StoreLite {
  id: number;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface Props {
  item: PantryItemLite;
  stores: StoreLite[];
  onClose: () => void;
  onSaved?: () => void;
}

export default function RestockItemModal({
  item,
  stores,
  onClose,
  onSaved,
}: Props) {
  const utils = trpc.useUtils();

  const initialPrice =
    item.lastPurchasePrice != null
      ? String(Number(item.lastPurchasePrice).toFixed(2))
      : "";

  const [priceStr, setPriceStr] = useState(initialPrice);
  const [storeId, setStoreId] = useState<number | "">(
    item.lastStoreId ?? "",
  );
  const [createExpense, setCreateExpense] = useState(false);
  const [expenseCategoryId, setExpenseCategoryId] = useState<number | "">(
    item.categoryId ?? "",
  );
  const [expenseDate, setExpenseDate] = useState(todayMexicoYMD());

  // ESC para cerrar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statsQuery = trpc.personalPantryPrices.stats.useQuery({
    pantryItemId: item.id,
  });
  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();

  const categories = categoriesQuery.data ?? [];
  const stats = statsQuery.data;

  const storeById = useMemo(
    () => new Map(stores.map((s) => [s.id, s])),
    [stores],
  );

  const submitRestock = trpc.personalPantryRestock.submitRestock.useMutation({
    onSuccess: (res) => {
      const bits = ["Repuesto al 100%"];
      if (res.priceRecorded) bits.push("precio guardado");
      if (res.expenseCreatedId) bits.push("gasto creado");
      toast.success(bits.join(" · "));
      utils.personalPantry.items.list.invalidate();
      utils.personalPantry.shoppingList.list.invalidate();
      utils.personalPantry.stats.invalidate();
      utils.personalPantryPrices.stats.invalidate();
      utils.personalPantryPrices.history.invalidate();
      utils.personalExpenses.stats.dashboard.invalidate();
      utils.personalExpenses.expenses.list.invalidate();
      onSaved?.();
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo reponer"),
  });

  // Parse precio
  const parsedPrice = (() => {
    const n = Number(priceStr.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const hasPrice = parsedPrice > 0;

  // Info de ultima compra
  const lastPrice =
    item.lastPurchasePrice != null ? Number(item.lastPurchasePrice) : null;
  const lastStore =
    item.lastStoreId != null ? storeById.get(item.lastStoreId) : null;
  const daysAgo = daysSince(item.lastPurchasedAt ?? null);

  // Tienda mas barata
  const cheapestStore =
    stats?.cheapestStoreId != null
      ? storeById.get(stats.cheapestStoreId)
      : null;
  const cheapestEntry = stats?.byStore?.find(
    (b) => b.storeId === stats.cheapestStoreId,
  );
  const cheapestPrice = cheapestEntry?.min ?? null;

  // Es la tienda seleccionada la mas barata historicamente?
  const selectedIsCheapest =
    storeId !== "" &&
    stats?.cheapestStoreId != null &&
    storeId === stats.cheapestStoreId;

  // Precio actual mejor o peor que el ultimo
  const priceDelta =
    hasPrice && lastPrice != null && lastPrice > 0
      ? parsedPrice - lastPrice
      : null;
  const priceDeltaPct =
    priceDelta != null && lastPrice != null && lastPrice > 0
      ? Math.round((priceDelta / lastPrice) * 100)
      : null;

  function handleSave() {
    submitRestock.mutate({
      itemId: item.id,
      price: hasPrice ? parsedPrice : null,
      storeId: storeId === "" ? null : storeId,
      storeName:
        storeId !== "" ? storeById.get(storeId as number)?.name ?? null : null,
      createExpense: createExpense && hasPrice,
      expenseCategoryId:
        createExpense && expenseCategoryId !== ""
          ? expenseCategoryId
          : null,
      expenseDate,
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
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl shrink-0">
              {item.icon || "🛒"}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                Comprar de nuevo
              </h2>
              <p className="text-xs text-slate-400 truncate">{item.name}</p>
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

        <div className="p-5 space-y-4">
          {/* Cards de contexto */}
          <div className="grid grid-cols-2 gap-3">
            {/* Ultima compra */}
            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <ShoppingBag className="w-3 h-3" />
                  Ultima compra
                </div>
                {lastPrice != null && lastPrice > 0 ? (
                  <>
                    <p className="text-xl font-bold text-emerald-400 mt-1">
                      {fmt(lastPrice)}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {lastStore ? `${lastStore.icon ?? "🏪"} ${lastStore.name}` : "Sin tienda"}
                    </p>
                    {daysAgo != null && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {daysAgo === 0
                          ? "Hoy"
                          : daysAgo === 1
                            ? "Hace 1 dia"
                            : `Hace ${daysAgo} dias`}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">
                    Sin registro previo
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Mejor precio historico */}
            <Card className="bg-slate-800 border border-amber-500/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                  <Trophy className="w-3 h-3" />
                  Mas barata
                </div>
                {cheapestPrice != null && cheapestPrice > 0 ? (
                  <>
                    <p className="text-xl font-bold text-amber-300 mt-1">
                      {fmt(cheapestPrice)}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cheapestStore
                        ? `${cheapestStore.icon ?? "🏪"} ${cheapestStore.name}`
                        : "Sin tienda"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {stats?.count ?? 0} compra(s) historicas
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">
                    Aun sin historial
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            {/* Precio */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Precio de esta compra
              </label>
              <Input
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="bg-slate-800 border-slate-700 text-white mt-1 text-lg font-bold"
              />
              {priceDeltaPct != null && hasPrice && (
                <p
                  className={`text-[11px] mt-1 flex items-center gap-1 ${
                    priceDeltaPct > 0
                      ? "text-rose-400"
                      : priceDeltaPct < 0
                        ? "text-emerald-400"
                        : "text-slate-500"
                  }`}
                >
                  <TrendingDown
                    className={`w-3 h-3 ${priceDeltaPct > 0 ? "rotate-180" : ""}`}
                  />
                  {priceDeltaPct === 0
                    ? "Igual al anterior"
                    : priceDeltaPct > 0
                      ? `${priceDeltaPct}% mas caro que la ultima vez`
                      : `${Math.abs(priceDeltaPct)}% mas barato que la ultima vez`}
                </p>
              )}
              {!hasPrice && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Sin precio: solo repone al 100% (no se guarda historial).
                </p>
              )}
            </div>

            {/* Tienda */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Store className="w-3 h-3" />
                Tienda
              </label>
              <select
                value={storeId === "" ? "" : String(storeId)}
                onChange={(e) =>
                  setStoreId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
              >
                <option value="">Sin tienda</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon ?? "🏪"} {s.name}
                  </option>
                ))}
              </select>
              {selectedIsCheapest && (
                <p className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3" />
                  Esta es tu tienda mas barata para este producto
                </p>
              )}
            </div>

            {/* Toggle: crear gasto vinculado */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createExpense}
                  onChange={(e) => setCreateExpense(e.target.checked)}
                  disabled={!hasPrice}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">
                    Crear gasto vinculado
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {hasPrice
                      ? "Genera un gasto en Mis Gastos por este monto."
                      : "Necesitas precio para crear el gasto."}
                  </p>
                </div>
              </label>

              {createExpense && hasPrice && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Categoria del gasto
                    </label>
                    <select
                      value={
                        expenseCategoryId === ""
                          ? ""
                          : String(expenseCategoryId)
                      }
                      onChange={(e) =>
                        setExpenseCategoryId(
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value),
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
                    >
                      <option value="">Sin clasificar</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 mt-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={submitRestock.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitRestock.isPending ? "Guardando..." : "Reponer al 100%"}
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
