// ============================================================================
// VISTA "Mis Gastos" - contenedor con sub-pestanas (Gastos / Alacena)
// ----------------------------------------------------------------------------
// Sub-pestanas internas:
//   - Gastos / Flujo : captura, sugerencia de alacena, tarjetas, graficas y lista
//   - Alacena        : productos del hogar con niveles y lista de compra
// Datos personales del hogar, separados del negocio. Coral = sale dinero.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import PersonalExpensesCharts from "@/components/admin/PersonalExpensesCharts";
import PersonalPantryTab from "@/components/admin/PersonalPantryTab";
import PantrySuggestionPanel from "@/components/admin/PantrySuggestionPanel";
import {
  ArrowLeft,
  Plus,
  Wallet,
  Store,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Tag,
  Trash2,
  Package,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// Morelos = UTC-6 todo el ano
function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDay(ymd: string): string {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return ymd || "";
  return `${parts[2]}/${parts[1]}`;
}

type SubTab = "gastos" | "alacena";

interface PendingSuggestion {
  detectedItems: string[];
  expenseId: number;
  storeId: number | null;
  storeName: string | null;
  totalAmount: number;
  defaultCategoryId: number | null;
}

interface Props {
  onBack?: () => void;
}

export default function PersonalExpensesView({ onBack }: Props) {
  const now = nowMexico();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [activeTab, setActiveTab] = useState<SubTab>("gastos");
  const [pendingSuggestion, setPendingSuggestion] =
    useState<PendingSuggestion | null>(null);

  const utils = trpc.useUtils();

  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const dashboardQuery = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });
  const listQuery = trpc.personalExpenses.expenses.list.useQuery({
    year,
    month,
    limit: 50,
  });

  const preview = trpc.personalExpenses.expenses.previewCapture.useQuery(
    { text: debounced },
    { enabled: debounced.length > 0 },
  );

  const refreshAll = () => {
    utils.personalExpenses.stats.dashboard.invalidate();
    utils.personalExpenses.expenses.list.invalidate();
  };

  const seed = trpc.personalExpenses.seedDefaults.useMutation({
    onSuccess: () => {
      toast.success("Categorias y tiendas activadas");
      utils.personalExpenses.categories.list.invalidate();
      utils.personalExpenses.stores.list.invalidate();
      utils.personalExpenses.stats.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message || "No se pudo activar"),
  });

  const quickCreate = trpc.personalExpenses.expenses.quickCreate.useMutation({
    onSuccess: (res) => {
      const cat = res.category
        ? `${res.category.icon} ${res.category.name}`
        : "Sin clasificar";
      toast.success(`Gasto guardado en ${cat}`);
      setText("");
      setDebounced("");
      refreshAll();

      // Sugerir productos para la alacena si el motor detecto items
      const detected = (res.expense as any)?.detectedItemsJson;
      const items: string[] = Array.isArray(detected)
        ? detected.filter((s: unknown): s is string => typeof s === "string")
        : [];
      if (items.length > 0) {
        setPendingSuggestion({
          detectedItems: items,
          expenseId: res.expense.id,
          storeId: (res.expense as any).storeId ?? null,
          storeName:
            res.store?.name ?? (res.expense as any).storeName ?? null,
          totalAmount: Number((res.expense as any).amount) || 0,
          defaultCategoryId: res.category?.id ?? null,
        });
      }
    },
    onError: (e) => toast.error(e.message || "No se pudo guardar"),
  });

  const recategorize = trpc.personalExpenses.expenses.recategorize.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.ruleSaved ? "Categoria actualizada y aprendida" : "Categoria actualizada",
      );
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo actualizar"),
  });

  const softDelete = trpc.personalExpenses.expenses.softDelete.useMutation({
    onSuccess: () => {
      toast.success("Gasto borrado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo borrar"),
  });

  const handleAdd = () => {
    const t = text.trim();
    if (!t) return;
    quickCreate.mutate({ text: t });
  };

  const handleRecategorize = (expenseId: number, newCatId: number | null) => {
    const saveRule =
      newCatId != null
        ? window.confirm("Recordar para la proxima? (guardar regla)")
        : false;
    recategorize.mutate({ id: expenseId, categoryId: newCatId, saveRule });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Borrar este gasto?")) {
      softDelete.mutate({ id });
    }
  };

  const dash = dashboardQuery.data;
  const categories = categoriesQuery.data ?? [];
  const expenses = listQuery.data ?? [];
  const noCategories = categoriesQuery.isFetched && categories.length === 0;

  const catById = new Map(categories.map((c) => [c.id, c]));

  const pct = dash?.vsLastMonth?.pct ?? null;
  const wentUp = pct !== null && pct > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/40 via-rose-900/20 to-slate-900 rounded-2xl p-6 border border-orange-500/30 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-orange-300" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
                Control personal
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Mis Gastos
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Gastos, alacena y consumo del hogar. Separado del negocio.
            </p>
          </div>
          {onBack && (
            <Button
              onClick={onBack}
              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
        </div>
      </div>

      {/* Sub-pestanas internas */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("gastos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "gastos"
              ? "bg-orange-500/15 border border-orange-500/40 text-orange-200"
              : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Gastos / Flujo
        </button>
        <button
          onClick={() => setActiveTab("alacena")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "alacena"
              ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-200"
              : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Package className="w-4 h-4" />
          Alacena
        </button>
      </div>

      {/* ====== TAB: GASTOS / FLUJO ====== */}
      {activeTab === "gastos" && (
        <>
          {/* Banner primera vez: sembrar categorias */}
          {noCategories && (
            <Card className="bg-slate-800 border border-purple-500/30">
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Primera vez por aqui
                    </p>
                    <p className="text-xs text-slate-400">
                      Activa tus categorias y tiendas iniciales para que la
                      captura se clasifique sola.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => seed.mutate()}
                  disabled={seed.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {seed.isPending ? "Activando..." : "Activar categorias"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Captura rapida */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardContent className="p-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Captura rapida (escribe algo como: walmart leche huevo 780)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ej: pemex gasolina 500"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Button
                  onClick={handleAdd}
                  disabled={quickCreate.isPending || !text.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {quickCreate.isPending ? "Guardando..." : "Agregar"}
                </Button>
              </div>

              {/* Preview en vivo */}
              {debounced.length > 0 && preview.data && (
                <div className="flex items-center gap-2 mt-3 flex-wrap text-sm">
                  <span className="text-slate-400">Detectado:</span>
                  {preview.data.amount > 0 && (
                    <span className="font-bold text-orange-400">
                      {fmt(preview.data.amount)}
                    </span>
                  )}
                  {preview.data.category ? (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: preview.data.category.color + "22",
                        color: preview.data.category.color,
                      }}
                    >
                      {preview.data.category.icon} {preview.data.category.name}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300">
                      Sin clasificar
                    </span>
                  )}
                  {preview.data.store && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200 flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {preview.data.store.name}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sugerencia: agregar productos detectados a la alacena */}
          {pendingSuggestion && (
            <PantrySuggestionPanel
              detectedItems={pendingSuggestion.detectedItems}
              expenseId={pendingSuggestion.expenseId}
              storeId={pendingSuggestion.storeId}
              storeName={pendingSuggestion.storeName}
              totalAmount={pendingSuggestion.totalAmount}
              defaultCategoryId={pendingSuggestion.defaultCategoryId}
              onClose={() => setPendingSuggestion(null)}
            />
          )}

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-800 border border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Wallet className="w-4 h-4" /> Gastado este mes
                </div>
                <div className="text-2xl font-bold text-orange-400 mt-1">
                  {fmt(dash?.total ?? 0)}
                </div>
                {pct !== null && (
                  <div
                    className={
                      "flex items-center gap-1 text-xs mt-1 " +
                      (wentUp ? "text-rose-400" : "text-emerald-400")
                    }
                  >
                    {wentUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(pct)}% vs mes anterior
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Tag className="w-4 h-4" /> Categoria principal
                </div>
                <div className="text-lg font-bold text-slate-100 mt-1 truncate">
                  {dash?.topCategory && dash.topCategory.total > 0
                    ? `${dash.topCategory.icon} ${dash.topCategory.name}`
                    : "—"}
                </div>
                {dash?.topCategory && dash.topCategory.total > 0 && (
                  <div className="text-xs text-slate-400">
                    {fmt(dash.topCategory.total)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Store className="w-4 h-4" /> Tienda top
                </div>
                <div className="text-lg font-bold text-slate-100 mt-1 truncate">
                  {dash?.topStore && dash.topStore.total > 0
                    ? dash.topStore.name
                    : "—"}
                </div>
                {dash?.topStore && dash.topStore.total > 0 && (
                  <div className="text-xs text-slate-400">
                    {fmt(dash.topStore.total)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <CalendarDays className="w-4 h-4" /> Promedio diario
                </div>
                <div className="text-2xl font-bold text-slate-100 mt-1">
                  {fmt(dash?.avgDaily ?? 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graficas */}
          {dash && (
            <PersonalExpensesCharts
              byCategory={dash.byCategory}
              byStore={dash.byStore}
              trend={dash.trend}
            />
          )}

          {/* Lista de gastos */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-3">
                Gastos de este mes
              </h3>

              {expenses.length === 0 ? (
                <div className="text-center py-10">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">
                    Todavia no hay gastos este mes
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Empieza capturando algo como: gasolina pemex 500
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {expenses.map((e) => {
                    const cat =
                      e.categoryId != null ? catById.get(e.categoryId) : null;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                            style={{
                              backgroundColor: (cat?.color ?? "#888780") + "22",
                            }}
                          >
                            {cat?.icon ?? "🧾"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {e.description || cat?.name || "Gasto"}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {e.storeName ? `${e.storeName} · ` : ""}
                              {formatDay(e.expenseDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-bold text-orange-400">
                            {fmt(Number(e.amount))}
                          </span>
                          <div className="flex items-center gap-1">
                            <select
                              value={e.categoryId ?? ""}
                              onChange={(ev) =>
                                handleRecategorize(
                                  e.id,
                                  ev.target.value === ""
                                    ? null
                                    : Number(ev.target.value),
                                )
                              }
                              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-1.5 py-1 max-w-[140px]"
                              title="Cambiar categoria"
                            >
                              <option value="">Sin clasificar</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {c.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Borrar gasto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ====== TAB: ALACENA ====== */}
      {activeTab === "alacena" && <PersonalPantryTab />}
    </div>
  );
}
