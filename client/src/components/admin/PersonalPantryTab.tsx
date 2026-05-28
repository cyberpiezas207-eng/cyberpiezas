// ============================================================================
// VISTA "Alacena" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Productos del hogar con nivel simple (no gramos), lista de compra
// automatica y botones rapidos. Reusa categorias y tiendas de gastos.
// Coral/rojo = se acaba | Naranja = bajo | Verde = disponible.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Package,
  ShoppingBasket,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Minus,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// Color por estado
function statusColor(status: string): { bg: string; text: string; bar: string } {
  switch (status) {
    case "out":
      return { bg: "bg-rose-500/15", text: "text-rose-300", bar: "bg-rose-500" };
    case "low":
      return {
        bg: "bg-orange-500/15",
        text: "text-orange-300",
        bar: "bg-orange-500",
      };
    case "available":
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-300",
        bar: "bg-emerald-500",
      };
    default:
      return {
        bg: "bg-slate-500/15",
        text: "text-slate-300",
        bar: "bg-slate-500",
      };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "out":
      return "Agotado";
    case "low":
      return "Bajo";
    case "available":
      return "Disponible";
    default:
      return status;
  }
}

export default function PersonalPantryTab() {
  const utils = trpc.useUtils();

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Reusamos categorias y tiendas de los gastos (mismas piezas)
  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const storesQuery = trpc.personalExpenses.stores.list.useQuery();

  const statsQuery = trpc.personalPantry.stats.get.useQuery();
  const itemsQuery = trpc.personalPantry.items.list.useQuery({
    search: search || undefined,
  });
  const shoppingQuery = trpc.personalPantry.shoppingList.list.useQuery();

  const refreshAll = () => {
    utils.personalPantry.stats.get.invalidate();
    utils.personalPantry.items.list.invalidate();
    utils.personalPantry.shoppingList.list.invalidate();
  };

  const createItem = trpc.personalPantry.items.create.useMutation({
    onSuccess: () => {
      toast.success("Producto agregado a tu alacena");
      setNewName("");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo agregar"),
  });

  const consume = trpc.personalPantry.actions.consume.useMutation({
    onSuccess: () => {
      toast.success("Consumido");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo"),
  });

  const markLow = trpc.personalPantry.actions.markLow.useMutation({
    onSuccess: () => {
      toast.success("Marcado bajo - agregado a tu lista de compra");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo"),
  });

  const markOut = trpc.personalPantry.actions.markOut.useMutation({
    onSuccess: () => {
      toast.success("Marcado como agotado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo"),
  });

  const restocked = trpc.personalPantry.actions.restocked.useMutation({
    onSuccess: () => {
      toast.success("Repuesto - alacena al 100%");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo"),
  });

  const archive = trpc.personalPantry.items.archive.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado de la alacena");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo"),
  });

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createItem.mutate({
      name,
      categoryId: newCategoryId,
      stockPercent: 100,
    });
  };

  // "Comprar de nuevo": permite editar precio (puede cambiar entre compras)
  const handleRestocked = (id: number, lastStoreId: number | null) => {
    const priceStr = window.prompt(
      "Precio de compra (deja vacio si no quieres registrar):",
      "",
    );
    let price: number | null = null;
    if (priceStr && priceStr.trim().length > 0) {
      const parsed = parseFloat(priceStr.replace(",", "."));
      if (Number.isFinite(parsed) && parsed >= 0) price = parsed;
    }
    restocked.mutate({
      id,
      price,
      storeId: lastStoreId ?? undefined,
    });
  };

  const handleArchive = (id: number, name: string) => {
    if (window.confirm(`Quitar "${name}" de la alacena?`)) {
      archive.mutate({ id });
    }
  };

  const stats = statsQuery.data;
  const items = itemsQuery.data ?? [];
  const shoppingList = shoppingQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];

  const catById = new Map(categories.map((c) => [c.id, c]));
  const storeById = new Map(stores.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      {/* Cards de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-800 border border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Package className="w-4 h-4" /> En alacena
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats?.total ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {stats?.averageStockPercent ?? 0}% promedio
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <AlertTriangle className="w-4 h-4" /> Bajos
            </div>
            <div className="text-2xl font-bold text-orange-400 mt-1">
              {stats?.low ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <AlertTriangle className="w-4 h-4" /> Agotados
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {stats?.out ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-indigo-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <ShoppingBasket className="w-4 h-4" /> Por comprar
            </div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">
              {stats?.shoppingListCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agregar producto */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Agregar producto a la alacena
          </label>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: huevo, leche, arroz..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-slate-900 border-slate-700 text-white flex-1 min-w-[200px]"
            />
            <select
              value={newCategoryId ?? ""}
              onChange={(e) =>
                setNewCategoryId(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 min-w-[160px]"
            >
              <option value="">Categoria (opcional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleCreate}
              disabled={createItem.isPending || !newName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              {createItem.isPending ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de compra (solo si hay) */}
      {shoppingList.length > 0 && (
        <Card className="bg-slate-800 border border-indigo-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBasket className="w-4 h-4 text-indigo-300" />
              <h3 className="text-sm font-bold text-slate-100">
                Lista de compra ({shoppingList.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {shoppingList.map((item) => {
                const cat = item.categoryId
                  ? catById.get(item.categoryId)
                  : null;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{cat?.icon ?? "📦"}</span>
                      <span className="text-sm text-slate-200 truncate">
                        {item.name}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleRestocked(item.id, item.lastStoreId ?? null)
                      }
                      className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 whitespace-nowrap"
                      title="Marcar como comprado"
                    >
                      <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                      Comprado
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busqueda */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en la alacena..."
          className="bg-slate-800 border-slate-700 text-white pl-9"
        />
      </div>

      {/* Lista de productos */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3">
            Productos en tu alacena
          </h3>

          {items.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                {search
                  ? "Nada coincide con tu busqueda"
                  : "Tu alacena esta vacia"}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {search
                  ? "Prueba con otro nombre"
                  : "Agrega tus productos frecuentes arriba"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const cat = item.categoryId
                  ? catById.get(item.categoryId)
                  : null;
                const store = item.lastStoreId
                  ? storeById.get(item.lastStoreId)
                  : null;
                const c = statusColor(item.status);
                const lastPrice = item.lastPurchasePrice
                  ? Number(item.lastPurchasePrice)
                  : null;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{
                            backgroundColor: (cat?.color ?? "#888780") + "22",
                          }}
                        >
                          {cat?.icon ?? "📦"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-100 truncate">
                              {item.name}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {cat?.name ?? "Sin categoria"}
                            {store && ` · ultima en ${store.name}`}
                            {lastPrice !== null && ` · ${fmt(lastPrice)}`}
                            {item.timesPurchased > 0 &&
                              ` · comprado ${item.timesPurchased}x`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleArchive(item.id, item.name)}
                        className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                        title="Quitar de la alacena"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Barra de nivel */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Nivel</span>
                        <span className="font-bold text-slate-200">
                          {item.stockPercent}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.bar} transition-all`}
                          style={{ width: `${item.stockPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Botones rapidos */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() =>
                          consume.mutate({ id: item.id, step: 25 })
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
                        title="Consumir un poco (-25%)"
                      >
                        <Minus className="w-3 h-3 inline mr-1" />
                        Consumir
                      </button>
                      <button
                        onClick={() => markLow.mutate({ id: item.id })}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 border border-orange-500/30"
                      >
                        Bajo
                      </button>
                      <button
                        onClick={() => markOut.mutate({ id: item.id })}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30"
                      >
                        Agotado
                      </button>
                      <button
                        onClick={() =>
                          handleRestocked(item.id, item.lastStoreId ?? null)
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 ml-auto"
                      >
                        <RefreshCw className="w-3 h-3 inline mr-1" />
                        Comprar de nuevo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
