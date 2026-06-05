// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/PreciosTab.tsx <<<
// ============================================================================
// VISTA "Precios" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// El cerebro de precios: lista de productos con en cuanto andan, en que
// tienda, si subieron o bajaron vs el mes pasado y donde estan mas baratos.
// Filtro por tienda (ej: la queseria). Toca un producto para ver mes con mes.
//
// Lee del router personalPrices (que a su vez lee tus gastos).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Store,
  Search,
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

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nowMexicoYM(): { year: number; month: number } {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function normalizeStr(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Emoji por producto, para clasificar visualmente
const ITEM_EMOJIS: Array<[string, string]> = [
  ["naranja", "🍊"], ["mandarina", "🍊"], ["limon", "🍋"], ["manzana", "🍎"],
  ["platano", "🍌"], ["fresa", "🍓"], ["uva", "🍇"], ["sandia", "🍉"],
  ["melon", "🍈"], ["pina", "🍍"], ["mango", "🥭"], ["aguacate", "🥑"],
  ["jitomate", "🍅"], ["tomate", "🍅"], ["papa", "🥔"], ["cebolla", "🧅"],
  ["ajo", "🧄"], ["zanahoria", "🥕"], ["elote", "🌽"], ["maiz", "🌽"],
  ["chile", "🌶️"], ["lechuga", "🥬"], ["brocoli", "🥦"], ["pepino", "🥒"],
  ["leche", "🥛"], ["huevo", "🥚"], ["queso", "🧀"], ["pan", "🍞"],
  ["tortilla", "🫓"], ["pollo", "🍗"], ["carne", "🥩"], ["pescado", "🐟"],
  ["camaron", "🦐"], ["arroz", "🍚"], ["frijol", "🫘"], ["cafe", "☕"],
  ["azucar", "🍬"], ["sal", "🧂"], ["aceite", "🫗"], ["refresco", "🥤"],
  ["cerveza", "🍺"], ["galleta", "🍪"], ["pastel", "🍰"], ["helado", "🍦"],
  ["sopa", "🍜"], ["cereal", "🥣"], ["gasolina", "⛽"],
];

function itemEmoji(text: string): string {
  const hay = normalizeStr(text);
  for (const [k, e] of ITEM_EMOJIS) {
    if (hay.includes(k)) return e;
  }
  return "🛒";
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function PreciosTab() {
  const initial = nowMexicoYM();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const brainQuery = trpc.personalPrices.brain.useQuery({
    year,
    month,
    monthsBack: 3,
  });

  const products = brainQuery.data ?? [];
  const isLoading = brainQuery.isLoading;

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  // Tiendas presentes (con nombre) para los chips de filtro
  const storeNames = Array.from(
    new Set(
      products
        .flatMap((p: any) => p.stores.map((s: any) => s.storeName))
        .filter((n: any): n is string => !!n),
    ),
  ).sort();

  // Filtrado por tienda + busqueda
  const q = normalizeStr(search);
  const filtered = products.filter((p: any) => {
    if (q && !normalizeStr(p.product).includes(q) && !normalizeStr(p.key).includes(q)) {
      return false;
    }
    if (storeFilter === "all") return true;
    return p.stores.some((s: any) => s.storeName === storeFilter);
  });

  return (
    <div className="space-y-5">
      {/* Cabecera con navegacion de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5 text-sky-300" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-tight">
              Precios
            </h2>
            <p className="text-xs text-slate-400">
              En cuanto anda cada cosa · ultimos 3 meses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-200 px-2 capitalize min-w-[110px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto (ej: pollo, queso)"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 pl-9 pr-3 py-2.5 focus:outline-none focus:border-sky-500/50"
        />
      </div>

      {/* Chips de tienda */}
      {storeNames.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStoreFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              storeFilter === "all"
                ? "bg-sky-500/20 border-sky-400/60 text-sky-100"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            Todas
          </button>
          {storeNames.map((name) => (
            <button
              key={name}
              onClick={() => setStoreFilter(name)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all ${
                storeFilter === name
                  ? "bg-sky-500/20 border-sky-400/60 text-sky-100"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Store className="w-3 h-3" />
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de productos */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-14 rounded-xl bg-slate-700/40 animate-pulse" />
              <div className="h-14 rounded-xl bg-slate-700/40 animate-pulse" />
              <div className="h-14 rounded-xl bg-slate-700/40 animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                {products.length === 0
                  ? "Aun no hay precios"
                  : "Nada con ese filtro"}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {products.length === 0
                  ? "Captura algunas compras y aqui veras en cuanto andan."
                  : "Prueba con otra tienda o limpia la busqueda."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => {
                // Precio a mostrar: si hay filtro de tienda, el de esa tienda
                const storeEntry =
                  storeFilter !== "all"
                    ? p.stores.find((s: any) => s.storeName === storeFilter)
                    : null;
                const showPrice = storeEntry ? storeEntry.price : p.latestPrice;
                const subStore = storeEntry
                  ? storeFilter
                  : p.latestStoreName ?? "sin tienda";
                const delta = p.deltaVsPrev;
                const isOpen = expandedKey === p.key;

                return (
                  <div
                    key={p.key}
                    className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedKey(isOpen ? null : p.key)
                      }
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0">
                          {itemEmoji(p.product + " " + p.key)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate capitalize">
                            {p.product}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {subStore}
                            {p.cheapestStoreName &&
                            p.cheapestStoreName !== p.latestStoreName &&
                            storeFilter === "all" ? (
                              <span className="text-emerald-400">
                                {" "}
                                · mas barato en {p.cheapestStoreName}
                              </span>
                            ) : (
                              <span className="text-slate-600">
                                {" "}
                                · {p.timesBought}x
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-100 tabular-nums">
                          {fmt(showPrice)}
                        </p>
                        {delta === null ? (
                          <span className="text-[10px] text-slate-500">
                            nuevo
                          </span>
                        ) : delta > 0 ? (
                          <span className="text-[10px] text-red-400 flex items-center justify-end gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            {fmt(delta)} vs mes pasado
                          </span>
                        ) : delta < 0 ? (
                          <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {fmt(Math.abs(delta))} vs mes pasado
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            igual que el mes pasado
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Detalle mes con mes */}
                    {isOpen && (
                      <div className="border-t border-slate-700 px-3 py-2.5 bg-slate-950/40">
                        <p className="text-[10px] text-slate-500 mb-1.5">
                          Precio mes con mes
                        </p>
                        <div className="space-y-1">
                          {p.months.map((m: any) => {
                            const [yy, mm] = m.ym.split("-");
                            return (
                              <div
                                key={m.ym}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-slate-400 capitalize">
                                  {MONTHS[Number(mm) - 1]} {yy}
                                </span>
                                <span className="text-slate-200 tabular-nums">
                                  {fmt(m.avg)}
                                  <span className="text-slate-600">
                                    {" "}
                                    ({m.count}x)
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {p.stores.length > 1 && (
                          <>
                            <p className="text-[10px] text-slate-500 mt-2.5 mb-1.5">
                              Por tienda
                            </p>
                            <div className="space-y-1">
                              {p.stores.map((s: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-400">
                                    {s.storeName ?? "Sin tienda"}
                                  </span>
                                  <span className="text-slate-200 tabular-nums">
                                    {fmt(s.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && products.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-3">
              Los precios salen de tus compras. Entre mas captures, mas exacto.
              El monto es lo que pagaste por linea (no el precio por kilo).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
