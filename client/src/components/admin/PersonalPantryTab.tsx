// ============================================================================
// VISTA "Alacena" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// NUEVO ENFOQUE: la Alacena ya NO lleva inventario de stock. Es una LENTE
// de comida sobre tus gastos: capturas una compra (se guarda como gasto con
// su categoria y tienda) y aqui ves a donde se va la comida del mes:
// total, por tienda, por categoria y las compras recientes.
//
// Fuente unica de verdad = gastos personales. Comida = categorias cuyo
// nombre/slug suena a comida (fruta, verdura, carne, despensa, etc.).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShoppingBasket,
  Plus,
  Store,
  Receipt,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Apple,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatDay(ymd: string | null): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}`;
}

// Pistas de "comida": una categoria cuenta como comida si su nombre o slug
// contiene alguna de estas palabras. Asi Fruta, Verduleria, Carne, Despensa...
// entran solas, y Gasolina/Servicios/Luz quedan fuera.
const FOOD_HINTS = [
  "fruta", "verdura", "verduleria", "fruteria", "carne", "carniceria",
  "pollo", "pescado", "marisco", "despensa", "abarrote", "super",
  "mandado", "comida", "cocina", "lacteo", "leche", "pan", "panaderia",
  "tortilla", "tortilleria", "huevo", "cremeria", "mercado", "alacena",
];

function isFoodCategory(cat: { name?: string | null; slug?: string | null }): boolean {
  const hay = normalizeStr(`${cat.name ?? ""} ${cat.slug ?? ""}`);
  return FOOD_HINTS.some((h) => hay.includes(h));
}

// ----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------------

export default function PersonalPantryTab() {
  const utils = trpc.useUtils();
  const today = nowMexico();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;

  const prev =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  // Datos base
  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const storesQuery = trpc.personalExpenses.stores.list.useQuery();
  const expensesQuery = trpc.personalExpenses.expenses.list.useQuery({
    year,
    month,
    limit: 200,
  });
  const prevExpensesQuery = trpc.personalExpenses.expenses.list.useQuery({
    year: prev.year,
    month: prev.month,
    limit: 200,
  });

  function refreshAll() {
    utils.personalExpenses.expenses.list.invalidate();
    utils.personalExpenses.stats.dashboard.invalidate();
  }

  const quickCreate = trpc.personalExpenses.expenses.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Compra agregada a tus gastos");
      setText("");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo agregar"),
  });

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function handleCreate() {
    const t = text.trim();
    if (!t) return;
    quickCreate.mutate({ text: t, categoryId: categoryId ?? undefined });
  }

  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const prevExpenses = prevExpensesQuery.data ?? [];

  const catById = new Map(categories.map((c) => [c.id, c]));
  const storeById = new Map(stores.map((s) => [s.id, s]));

  // Que categorias son "comida"
  const foodCatIds = new Set(
    categories.filter((c) => isFoodCategory(c)).map((c) => c.id),
  );
  const foodCatList = categories.filter((c) => foodCatIds.has(c.id));

  function isFoodExpense(e: any): boolean {
    return e.categoryId != null && foodCatIds.has(e.categoryId);
  }

  const foodExpenses = expenses.filter(isFoodExpense);
  const prevFoodExpenses = prevExpenses.filter(isFoodExpense);

  const foodTotal = foodExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const prevFoodTotal = prevFoodExpenses.reduce(
    (acc, e) => acc + Number(e.amount),
    0,
  );
  const diff = foodTotal - prevFoodTotal;
  const pct = prevFoodTotal > 0 ? Math.round((diff / prevFoodTotal) * 1000) / 10 : null;

  // Agrupar por tienda
  const byStoreMap = new Map<string, { name: string; total: number; count: number }>();
  for (const e of foodExpenses) {
    const st = e.storeId != null ? storeById.get(e.storeId) : null;
    const name = st?.name ?? e.storeName ?? "Sin tienda";
    const key = name;
    const cur = byStoreMap.get(key) ?? { name, total: 0, count: 0 };
    cur.total += Number(e.amount);
    cur.count += 1;
    byStoreMap.set(key, cur);
  }
  const byStore = [...byStoreMap.values()].sort((a, b) => b.total - a.total);

  // Agrupar por categoria
  const byCatMap = new Map<
    number,
    { name: string; icon: string; color: string; total: number }
  >();
  for (const e of foodExpenses) {
    const cat = e.categoryId != null ? catById.get(e.categoryId) : null;
    if (!cat) continue;
    const cur = byCatMap.get(cat.id) ?? {
      name: cat.name,
      icon: cat.icon ?? "",
      color: cat.color ?? "#888780",
      total: 0,
    };
    cur.total += Number(e.amount);
    byCatMap.set(cat.id, cur);
  }
  const byCategory = [...byCatMap.values()].sort((a, b) => b.total - a.total);

  const maxStore = byStore.length > 0 ? byStore[0].total : 0;
  const recent = foodExpenses.slice(0, 15);

  const isLoading = expensesQuery.isLoading || categoriesQuery.isLoading;

  return (
    <div className="space-y-5">
      {/* Header: comida del mes */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-2">
                <Apple className="w-3 h-3 text-emerald-300" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                  Alacena
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                A donde se va tu comida
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tus compras de comida, por tienda y categoria.
              </p>
            </div>

            {/* Navegador de mes */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-center min-w-[130px]">
                <div className="text-sm font-bold text-white">{monthLabel}</div>
              </div>
              <button
                onClick={() => shiftMonth(1)}
                disabled={atCurrentMonth}
                className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total grande + comparacion */}
          <div className="mt-4 flex items-end gap-3 flex-wrap">
            <div className="text-4xl font-black text-emerald-200 tracking-tight">
              {fmt(foodTotal)}
            </div>
            <div className="mb-1 text-xs text-slate-400">
              {foodExpenses.length} compra(s) de comida
            </div>
            {pct !== null && diff !== 0 && (
              <div
                className={`mb-1 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                  diff < 0
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {diff < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {Math.abs(pct)}% vs mes pasado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Captura: crea un GASTO de comida */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShoppingBasket className="w-3.5 h-3.5 text-emerald-300" />
              Agregar compra
            </label>
            <span className="text-[10px] text-slate-500 truncate max-w-[60%]">
              ej: naranja lupita 37 el kilo compre
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ej: naranja lupita 37 compre"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-slate-900 border-slate-700 text-white flex-1 min-w-[200px]"
            />
            <select
              value={categoryId ?? ""}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? null : Number(e.target.value))
              }
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 min-w-[150px]"
            >
              <option value="">Categoria (auto)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleCreate}
              disabled={quickCreate.isPending || !text.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              {quickCreate.isPending ? "..." : "Agregar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Por tienda */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-300" />
            Por tienda
          </h3>
          {byStore.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aun no hay compras de comida este mes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {byStore.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium truncate">
                      {s.name}{" "}
                      <span className="text-slate-500">
                        · {s.count} compra(s)
                      </span>
                    </span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {fmt(s.total)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/70 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${maxStore > 0 ? Math.round((s.total / maxStore) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por categoria (chips) */}
      {byCategory.length > 0 && (
        <Card className="bg-slate-800 border border-slate-700">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-3">
              Por categoria
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {byCategory.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                  style={{
                    backgroundColor: (c.color ?? "#888780") + "22",
                    borderColor: (c.color ?? "#888780") + "55",
                    color: "#e2e8f0",
                  }}
                >
                  <span>{c.icon || "🍎"}</span>
                  {c.name}
                  <span className="text-emerald-300 font-black tabular-nums">
                    {fmt(c.total)}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compras recientes */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-300" />
            Compras recientes
          </h3>

          {isLoading ? (
            <div className="h-20 rounded-xl bg-slate-700/40 animate-pulse" />
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBasket className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                Sin compras de comida este mes
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Captura arriba: "naranja lupita 37 compre" y elige una categoria
                de comida.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => {
                const cat = e.categoryId ? catById.get(e.categoryId) : null;
                const st = e.storeId ? storeById.get(e.storeId) : null;
                const storeName = st?.name ?? e.storeName ?? null;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{
                          backgroundColor: (cat?.color ?? "#888780") + "22",
                        }}
                      >
                        {cat?.icon ?? "🍎"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {e.description}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {storeName ? `${storeName} · ` : ""}
                          {formatDay(e.expenseDate)}
                          {cat ? ` · ${cat.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-emerald-300 font-bold tabular-nums shrink-0">
                      {fmt(Number(e.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transparencia: que categorias cuentan como comida */}
          {foodCatList.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-3">
              Cuenta como comida:{" "}
              {foodCatList.map((c) => c.name).join(", ")}. Si falta una, dime y la
              agrego.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
