// ============================================================================
// MODAL "Historial de precios" - vista completa de un producto
// ----------------------------------------------------------------------------
// Se abre al darle clic a "Historial" en un producto de la alacena.
// Muestra: stats (ultimo/mas barato/mas caro), insight "mas barata en X",
// grafica de evolucion, breakdown por tienda y lista de compras recientes.
// Overlay propio (no depende de shadcn Dialog). Cierra con ESC, X o clic fuera.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  Clock,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Package as PackageIcon,
} from "lucide-react";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface PantryItemForHistory {
  id: number;
  name: string;
}

export interface StoreForHistory {
  id: number;
  name: string;
}

interface Props {
  item: PantryItemForHistory;
  stores: StoreForHistory[];
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function formatShortDate(ymd: string): string {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return ymd || "";
  return `${parts[2]}/${parts[1]}`;
}

function formatLongDate(ymd: string): string {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return ymd || "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Tooltip oscuro para la grafica
function DarkTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const d = p.payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-2xl">
      <p className="text-xs font-bold text-slate-200">{d.fullDate}</p>
      {d.store && <p className="text-xs text-slate-400">{d.store}</p>}
      <p className="text-sm font-bold text-emerald-300 mt-0.5">
        {fmt(p.value)}
      </p>
    </div>
  );
}

// Stat card pequenita
function StatCard({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: number;
  Icon: any;
  color: "slate" | "emerald" | "rose";
}) {
  const colorMap = {
    slate: "border-slate-700 text-slate-100",
    emerald: "border-emerald-500/30 text-emerald-300",
    rose: "border-rose-500/30 text-rose-300",
  };
  return (
    <div className={`bg-slate-900 border rounded-xl p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-lg font-bold mt-0.5">{fmt(value)}</div>
    </div>
  );
}

export default function PantryPriceHistoryModal({
  item,
  stores,
  onClose,
}: Props) {
  // Cerrar con ESC
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
  const historyQuery = trpc.personalPantryPrices.history.useQuery({
    pantryItemId: item.id,
    limit: 50,
  });

  const stats = statsQuery.data;
  const history = historyQuery.data ?? [];

  const storeById = new Map(stores.map((s) => [s.id, s]));

  // Para la grafica: orden cronologico ascendente
  const chartData = [...history].reverse().map((h) => ({
    label: formatShortDate(h.purchasedAt),
    fullDate: formatLongDate(h.purchasedAt),
    price: Number(h.unitPrice),
    store: h.storeId ? storeById.get(h.storeId)?.name ?? "Otra" : null,
  }));

  const cheapestStore =
    stats && stats.cheapestStoreId !== null
      ? storeById.get(stats.cheapestStoreId)?.name ?? null
      : null;

  const hasData = stats && stats.count > 0;
  const loading = statsQuery.isLoading || historyQuery.isLoading;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-start justify-between gap-3 sticky top-0 bg-slate-900 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white capitalize truncate">
              {item.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historial de precios y tiendas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading && (
            <p className="text-sm text-slate-400 text-center py-6">
              Cargando historial...
            </p>
          )}

          {!loading && !hasData && (
            <div className="text-center py-10">
              <PackageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                Aun no tienes historial de precios para este producto
              </p>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                Captura un gasto que incluya este producto y confirma con
                precio, o usa "Comprar de nuevo" con un precio. Cada compra
                quedara registrada aqui.
              </p>
            </div>
          )}

          {hasData && stats && (
            <>
              {/* 3 stat cards */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="Ultimo"
                  value={stats.latest ?? 0}
                  Icon={Clock}
                  color="slate"
                />
                <StatCard
                  label="Mas barato"
                  value={stats.min}
                  Icon={TrendingDown}
                  color="emerald"
                />
                <StatCard
                  label="Mas caro"
                  value={stats.max}
                  Icon={TrendingUp}
                  color="rose"
                />
              </div>

              {/* Insight: mas barata en X */}
              {cheapestStore && (
                <Card className="bg-emerald-500/10 border border-emerald-500/30">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                    <p className="text-sm text-slate-200">
                      Mas barata en{" "}
                      <span className="font-bold text-emerald-300">
                        {cheapestStore}
                      </span>{" "}
                      a{" "}
                      <span className="font-bold text-emerald-300">
                        {fmt(stats.min)}
                      </span>
                      .
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Grafica de evolucion */}
              {chartData.length >= 2 && (
                <Card className="bg-slate-800 border border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Evolucion de precio
                    </h3>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RLineChart
                          data={chartData}
                          margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                            opacity={0.4}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            stroke="#475569"
                          />
                          <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            stroke="#475569"
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip content={<DarkTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#34d399"
                            strokeWidth={2.5}
                            dot={{ fill: "#34d399", r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: "#34d399" }}
                          />
                        </RLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Breakdown por tienda */}
              {stats.byStore.length > 0 && (
                <Card className="bg-slate-800 border border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Por tienda
                    </h3>
                    <div className="space-y-1.5">
                      {stats.byStore.map((b) => {
                        const storeName = b.storeId
                          ? storeById.get(b.storeId)?.name ?? "Tienda"
                          : "Sin tienda";
                        const isCheapest =
                          b.storeId !== null &&
                          b.storeId === stats.cheapestStoreId;
                        return (
                          <div
                            key={b.storeId ?? "null"}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                              isCheapest
                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                : "bg-slate-900 border border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-slate-200 truncate">
                                {storeName}
                              </span>
                              {isCheapest && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                  Mejor
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-slate-400">
                                {b.count} compra(s)
                              </div>
                              <div className="text-sm font-bold text-slate-100">
                                {b.min === b.max
                                  ? fmt(b.min)
                                  : `${fmt(b.min)} - ${fmt(b.max)}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de compras */}
              <Card className="bg-slate-800 border border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Compras recientes
                  </h3>
                  <div className="divide-y divide-slate-700/60">
                    {history.map((h) => {
                      const storeName = h.storeId
                        ? storeById.get(h.storeId)?.name ?? "Tienda"
                        : "Sin tienda";
                      return (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-slate-200">
                              {formatLongDate(h.purchasedAt)}
                            </p>
                            <p className="text-xs text-slate-500">{storeName}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-100 shrink-0">
                            {fmt(Number(h.unitPrice))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
