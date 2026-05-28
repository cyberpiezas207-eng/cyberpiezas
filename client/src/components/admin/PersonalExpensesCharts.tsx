// ============================================================================
// GRAFICAS - Gastos personales (recharts)
// ----------------------------------------------------------------------------
// Dona por categoria, barras por tienda y tendencia mensual.
// Recibe la data ya calculada por stats.dashboard. Tema oscuro.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtShort = (n: number) =>
  "$" + new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(Math.round(n));

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function monthLabel(ym: string): string {
  const parts = (ym || "").split("-");
  if (parts.length !== 2) return ym || "";
  const m = parseInt(parts[1], 10);
  return MONTHS_ES[(m - 1 + 12) % 12] ?? ym;
}

interface CatSlice {
  name: string;
  total: number;
  color: string;
  icon?: string;
}
interface StoreSlice {
  name: string;
  total: number;
  color: string;
}
interface TrendPoint {
  month: string;
  total: number;
}

interface Props {
  byCategory: CatSlice[];
  byStore: StoreSlice[];
  trend: TrendPoint[];
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "6px 10px",
      }}
    >
      {label != null && (
        <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      )}
      <div style={{ color: "#fb923c", fontWeight: 700, fontSize: 13 }}>
        {fmt(Number(payload[0].value))}
      </div>
    </div>
  );
}

export default function PersonalExpensesCharts({ byCategory, byStore, trend }: Props) {
  const cats = (byCategory ?? []).filter((c) => c.total > 0);
  const stores = (byStore ?? []).filter((s) => s.total > 0);
  const trendData = (trend ?? []).map((t) => ({ ...t, label: monthLabel(t.month) }));
  const hasTrend = trendData.some((t) => t.total > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Dona por categoria */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3">
            Distribucion por categoria
          </h3>
          {cats.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">
              Sin datos este mes
            </p>
          ) : (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={cats}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {cats.map((c, i) => (
                        <Cell key={i} fill={c.color} stroke="#1e293b" />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {cats.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs text-slate-300"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c.color }}
                    />
                    {c.icon ? c.icon + " " : ""}
                    {c.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Barras por tienda */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Gasto por tienda</h3>
          {stores.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">
              Sin datos este mes
            </p>
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={stores} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={fmtShort}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    width={95}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "#33415533" }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {stores.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendencia mensual */}
      <Card className="bg-slate-800 border border-slate-700 lg:col-span-2">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Tendencia mensual</h3>
          {!hasTrend ? (
            <p className="text-slate-500 text-sm py-8 text-center">
              Aun no hay historial suficiente
            </p>
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={trendData} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#33415544"
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={fmtShort}
                    width={52}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "#33415533" }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#fb923c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
