// >>> ESTE ARCHIVO VA EN: client/src/components/admin/PersonalExpensesView.tsx <<<
// ============================================================================
// VISTA "Mis Gastos" - contenedor con sub-pestanas (Gastos / Alacena)
// ----------------------------------------------------------------------------
// Sub-pestanas internas:
//   - Gastos / Flujo : navegador de mes, captura rapida + detallada,
//                      sugerencia de alacena, tarjetas, graficas, filtros y lista
//   - Alacena        : productos del hogar con niveles y lista de compra
// Boton "Gestionar" abre el modal de categorias y tiendas editables.
// Boton "Captura detallada" abre el modal de gasto manual con campos separados.
// Pendientes en lista: badge ambar + boton para asignar monto despues.
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
import PersonalVehicleTab from "@/components/admin/PersonalVehicleTab";
import PersonalDebtsTab from "@/components/admin/PersonalDebtsTab";
import PersonalRemindersTab from "@/components/admin/PersonalRemindersTab";
import PantrySuggestionPanel from "@/components/admin/PantrySuggestionPanel";
import CategoriesStoresManager from "@/components/admin/CategoriesStoresManager";
import DetailedExpenseModal from "@/components/admin/DetailedExpenseModal";
import MonthlyInsightsPanel from "@/components/admin/MonthlyInsightsPanel";
import ExportsModal from "@/components/admin/ExportsModal";
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
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Clock,
  Download,
  Car,
  CreditCard,
  Bell,
} from "lucide-react";

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

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Debito",
  credit: "Credito",
  transfer: "Transferencia",
  other: "Otro",
};

// Morelos = UTC-6 todo el ano
function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDay(ymd: string): string {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return ymd || "";
  return `${parts[2]}/${parts[1]}`;
}

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ----------------------------------------------------------------------------
// PASTEL DEL MES: agrupa las categorias del mes en rebanadas grandes
// (Comida / Gasolina / Servicios / Otros) para un resumen de un vistazo.
// Solo frontend: usa dash.byCategory que ya entrega el dashboard.
// ----------------------------------------------------------------------------

const SLICE_DEFS: Array<{ key: string; label: string; color: string; hints: string[] }> = [
  {
    key: "comida",
    label: "Comida",
    color: "#10b981",
    hints: [
      "fruta", "verdura", "verduleria", "fruteria", "carne", "carniceria",
      "pollo", "pescado", "marisco", "despensa", "abarrote", "super",
      "mandado", "comida", "cocina", "lacteo", "leche", "pan", "panaderia",
      "tortilla", "huevo", "cremeria", "mercado",
    ],
  },
  {
    key: "gasolina",
    label: "Gasolina",
    color: "#818cf8",
    hints: ["gasolina", "gasolinera", "pemex", "combustible", "diesel", "magna", "premium"],
  },
  {
    key: "servicios",
    label: "Servicios",
    color: "#a855f7",
    hints: [
      "servicio", "luz", "cfe", "agua", "internet", "telefono", "telcel",
      "cable", "streaming", "netflix", "spotify", "recibo", "predial", "renta",
    ],
  },
];

const OTHERS_SLICE = { key: "otros", label: "Otros", color: "#64748b" };

function classifyCatToSlice(name: string): string {
  const hay = normalizeText(name);
  for (const d of SLICE_DEFS) {
    if (d.hints.some((h) => hay.includes(h))) return d.key;
  }
  return "otros";
}

function MonthPieCard({
  byCategory,
  total,
}: {
  byCategory: Array<{ name: string; total: number }>;
  total: number;
}) {
  const sums: Record<string, number> = {
    comida: 0,
    gasolina: 0,
    servicios: 0,
    otros: 0,
  };
  for (const c of byCategory) {
    sums[classifyCatToSlice(c.name)] += c.total || 0;
  }

  const order = [...SLICE_DEFS, OTHERS_SLICE];
  const slices = order
    .map((d) => ({ label: d.label, color: d.color, total: sums[d.key] || 0 }))
    .filter((s) => s.total > 0);
  const sum = slices.reduce((a, s) => a + s.total, 0);
  if (sum <= 0) return null;

  // r = 15.915 -> circunferencia ~100, asi el dash es directamente el %
  const C = 100;
  let acc = 0;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-lg">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-orange-300" />
          A donde se fue este mes
        </h3>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative w-36 h-36 shrink-0 mx-auto sm:mx-0">
            <svg viewBox="0 0 40 40" className="w-36 h-36 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="15.915"
                fill="none"
                stroke="#1e293b"
                strokeWidth="4.5"
              />
              {slices.map((s, i) => {
                const pct = (s.total / sum) * 100;
                const el = (
                  <circle
                    key={i}
                    cx="20"
                    cy="20"
                    r="15.915"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="4.5"
                    strokeDasharray={`${pct} ${C - pct}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += pct;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Total
              </span>
              <span className="text-base font-black text-white leading-none">
                {fmt(total)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] space-y-2">
            {slices.map((s, i) => {
              const pct = Math.round((s.total / sum) * 100);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm text-slate-200 font-medium flex-1 truncate">
                    {s.label}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {pct}%
                  </span>
                  <span className="text-sm font-bold text-slate-100 tabular-nums min-w-[64px] text-right">
                    {fmt(s.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-3">
          Rebanadas: Comida, Gasolina, Servicios y Otros. Pronto sumamos los
          pagos de deudas.
        </p>
      </CardContent>
    </Card>
  );
}

type SubTab = "gastos" | "alacena" | "vehiculo" | "deudas" | "recordatorios";

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
  initialSubTab?: SubTab;
}

export default function PersonalExpensesView({ onBack, initialSubTab }: Props) {
  const today = nowMexico();

  const [activeTab, setActiveTab] = useState<SubTab>(initialSubTab ?? "gastos");
  const [showManager, setShowManager] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [showExports, setShowExports] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] =
    useState<PendingSuggestion | null>(null);

  // Mes seleccionado (navegable)
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Filtros de la lista
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | "all">("all");
  const [filterStoreId, setFilterStoreId] = useState<number | "all">("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  const utils = trpc.useUtils();

  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const storesQuery = trpc.personalExpenses.stores.list.useQuery();
  const dashboardQuery = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });
  const listQuery = trpc.personalExpenses.expenses.list.useQuery({
    year,
    month,
    limit: 200,
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

  const setAmount = trpc.personalExpensesCapture.setAmount.useMutation({
    onSuccess: () => {
      toast.success("Monto asignado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo asignar el monto"),
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

  const handleSetAmount = (id: number, description: string) => {
    const raw = window.prompt(`Asignar monto a "${description}":\n(solo el numero, ej: 150)`);
    if (raw == null) return;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Monto invalido");
      return;
    }
    setAmount.mutate({ id, amount: n });
  };

  // Navegacion de mes
  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }
  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const dash = dashboardQuery.data;
  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const expenses = listQuery.data ?? [];
  const noCategories = categoriesQuery.isFetched && categories.length === 0;

  const catById = new Map(categories.map((c) => [c.id, c]));

  const pct = dash?.vsLastMonth?.pct ?? null;
  const wentUp = pct !== null && pct > 0;

  // Filtrado de la lista (cliente)
  const hasFilters =
    search.trim().length > 0 ||
    filterCategoryId !== "all" ||
    filterStoreId !== "all" ||
    filterPayment !== "all";

  const filteredExpenses = expenses.filter((e) => {
    if (search.trim()) {
      const q = normalizeText(search);
      const desc = normalizeText(e.description || "");
      const store = normalizeText(e.storeName || "");
      if (!desc.includes(q) && !store.includes(q)) return false;
    }
    if (filterCategoryId !== "all" && e.categoryId !== filterCategoryId)
      return false;
    if (filterStoreId !== "all" && e.storeId !== filterStoreId) return false;
    if (filterPayment !== "all" && e.paymentMethod !== filterPayment)
      return false;
    return true;
  });

  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;

  return (
    <div className="space-y-6">
      {/* Header PREMIUM con orbs blur y mejor contraste */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/40 shadow-2xl">
        {/* Capas de gradiente para profundidad */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-rose-950/60 to-slate-900" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-rose-500/15 rounded-full blur-3xl" />

        <div className="relative p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 mb-2">
              <Wallet className="w-3.5 h-3.5 text-orange-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">
                Control personal
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Mis Gastos
            </h1>
            <p className="text-sm text-orange-100/70 mt-1.5 max-w-md">
              Gastos, alacena y consumo del hogar. Separado del negocio.
            </p>
          </div>
          {onBack && (
            <Button
              onClick={onBack}
              className="bg-slate-900/70 backdrop-blur-sm border border-slate-600 hover:bg-slate-800 text-white shadow-lg shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
        </div>
      </div>

      {/* Sub-pestanas internas + boton gestionar - PREMIUM */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("gastos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "gastos"
              ? "bg-gradient-to-br from-orange-500/25 to-orange-600/15 border border-orange-400/60 text-orange-100 shadow-lg shadow-orange-500/10"
              : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Gastos / Flujo
        </button>
        <button
          onClick={() => setActiveTab("alacena")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "alacena"
              ? "bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border border-emerald-400/60 text-emerald-100 shadow-lg shadow-emerald-500/10"
              : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          Alacena
        </button>
        <button
          onClick={() => setActiveTab("vehiculo")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "vehiculo"
              ? "bg-gradient-to-br from-indigo-500/25 to-indigo-600/15 border border-indigo-400/60 text-indigo-100 shadow-lg shadow-indigo-500/10"
              : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Car className="w-4 h-4" />
          Vehiculo
        </button>
        <button
          onClick={() => setActiveTab("deudas")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "deudas"
              ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border border-rose-400/60 text-rose-100 shadow-lg shadow-rose-500/10"
              : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Deudas
        </button>
        <button
          onClick={() => setActiveTab("recordatorios")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "recordatorios"
              ? "bg-gradient-to-br from-indigo-500/25 to-cyan-600/15 border border-indigo-400/60 text-indigo-100 shadow-lg shadow-indigo-500/10"
              : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Bell className="w-4 h-4" />
          Recordatorios
        </button>
        <button
          onClick={() => setShowExports(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-emerald-200 hover:bg-slate-800 hover:border-emerald-500/40 transition-all ml-auto"
          title="Exportar datos a CSV"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
        <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-indigo-200 hover:bg-slate-800 hover:border-indigo-500/40 transition-all"
          title="Gestionar categorias y tiendas"
        >
          <Settings className="w-4 h-4" />
          Gestionar
        </button>
      </div>

      {/* ====== TAB: GASTOS / FLUJO ====== */}
      {activeTab === "gastos" && (
        <>
          {/* Navegador de mes PREMIUM */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white transition-all shadow-md"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-5 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-lg min-w-[170px] text-center">
              <div className="text-sm font-bold text-white tracking-wide">
                {monthLabel}
              </div>
              {!atCurrentMonth && (
                <button
                  onClick={() => {
                    setYear(today.getFullYear());
                    setMonth(today.getMonth() + 1);
                  }}
                  className="text-[10px] text-indigo-300 hover:text-indigo-100 uppercase tracking-wider font-bold"
                >
                  ← Volver al mes actual
                </button>
              )}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              disabled={atCurrentMonth}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pastel del mes: a donde se fue (resumen de un vistazo) */}
          {dash && dash.total > 0 && (
            <MonthPieCard byCategory={dash.byCategory} total={dash.total} />
          )}

          {/* Resumen del mes inteligente */}
          <MonthlyInsightsPanel year={year} month={month} />

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

              {/* Captura detallada */}
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-slate-500">
                  ¿Gasto complejo o sin monto todavia?
                </p>
                <button
                  onClick={() => setShowDetailed(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700/60 border border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Captura detallada
                </button>
              </div>
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

          {/* Tarjetas de resumen PREMIUM */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Gastado en el mes - CORAL */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-950/60 via-slate-800 to-slate-800/90 border border-orange-500/40 shadow-lg hover:border-orange-400/60 hover:shadow-orange-500/10 transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30 flex items-center justify-center mb-3">
                  <Wallet className="w-4 h-4 text-orange-300" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Gastado en el mes
                </p>
                <div className="text-2xl font-black text-orange-300 tracking-tight leading-tight">
                  {fmt(dash?.total ?? 0)}
                </div>
                {pct !== null && (
                  <div
                    className={
                      "flex items-center gap-1 text-[11px] mt-1.5 font-bold " +
                      (wentUp ? "text-rose-300" : "text-emerald-300")
                    }
                  >
                    {wentUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(pct)}% vs anterior
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categoria principal - PURPLE */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-950/60 via-slate-800 to-slate-800/90 border border-purple-500/40 shadow-lg hover:border-purple-400/60 hover:shadow-purple-500/10 transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 ring-1 ring-purple-400/30 flex items-center justify-center mb-3">
                  <Tag className="w-4 h-4 text-purple-300" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Categoria top
                </p>
                <div className="text-base font-black text-purple-100 tracking-tight leading-tight truncate">
                  {dash?.topCategory && dash.topCategory.total > 0
                    ? `${dash.topCategory.icon} ${dash.topCategory.name}`
                    : "—"}
                </div>
                {dash?.topCategory && dash.topCategory.total > 0 && (
                  <div className="text-[11px] text-slate-400 mt-1 font-semibold">
                    {fmt(dash.topCategory.total)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tienda top - CYAN */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-950/60 via-slate-800 to-slate-800/90 border border-cyan-500/40 shadow-lg hover:border-cyan-400/60 hover:shadow-cyan-500/10 transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/30 flex items-center justify-center mb-3">
                  <Store className="w-4 h-4 text-cyan-300" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Tienda top
                </p>
                <div className="text-base font-black text-cyan-100 tracking-tight leading-tight truncate">
                  {dash?.topStore && dash.topStore.total > 0
                    ? dash.topStore.name
                    : "—"}
                </div>
                {dash?.topStore && dash.topStore.total > 0 && (
                  <div className="text-[11px] text-slate-400 mt-1 font-semibold">
                    {fmt(dash.topStore.total)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promedio diario - INDIGO */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-800 to-slate-800/90 border border-indigo-500/40 shadow-lg hover:border-indigo-400/60 hover:shadow-indigo-500/10 transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              <CardContent className="relative p-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center mb-3">
                  <CalendarDays className="w-4 h-4 text-indigo-300" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Promedio diario
                </p>
                <div className="text-2xl font-black text-indigo-200 tracking-tight leading-tight">
                  {fmt(dash?.avgDaily ?? 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Este mes</p>
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

          {/* Lista de gastos con filtros */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-3">
                Gastos de {monthLabel}
              </h3>

              {/* Barra de filtros */}
              <div className="space-y-2 mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por descripcion o tienda..."
                    className="bg-slate-900 border-slate-700 text-white pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filterCategoryId === "all" ? "all" : String(filterCategoryId)}
                    onChange={(e) =>
                      setFilterCategoryId(
                        e.target.value === "all" ? "all" : Number(e.target.value),
                      )
                    }
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5"
                  >
                    <option value="all">Todas las categorias</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterStoreId === "all" ? "all" : String(filterStoreId)}
                    onChange={(e) =>
                      setFilterStoreId(
                        e.target.value === "all" ? "all" : Number(e.target.value),
                      )
                    }
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5"
                  >
                    <option value="all">Todas las tiendas</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5"
                  >
                    <option value="all">Todos los metodos</option>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {hasFilters && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterCategoryId("all");
                        setFilterStoreId("all");
                        setFilterPayment("all");
                      }}
                      className="text-xs text-indigo-300 hover:text-indigo-200 px-2 py-1.5"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-10">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">
                    No hay gastos en {monthLabel}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    {atCurrentMonth
                      ? "Empieza capturando algo como: gasolina pemex 500"
                      : "Prueba con otro mes."}
                  </p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">
                    Nada coincide con tus filtros
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Ajusta la busqueda o limpia los filtros.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {filteredExpenses.map((e) => {
                    const cat =
                      e.categoryId != null ? catById.get(e.categoryId) : null;
                    const isPending = e.purchaseType === "pending";
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
                          {isPending ? (
                            <button
                              onClick={() =>
                                handleSetAmount(e.id, e.description || "gasto")
                              }
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                              title="Asignar monto"
                            >
                              <Clock className="w-3 h-3" />
                              Pendiente
                            </button>
                          ) : (
                            <span className="text-sm font-bold text-orange-400">
                              {fmt(Number(e.amount))}
                            </span>
                          )}
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

              {/* Contador */}
              {filteredExpenses.length > 0 && (
                <p className="text-[11px] text-slate-500 text-center mt-3">
                  {hasFilters
                    ? `${filteredExpenses.length} de ${expenses.length} gastos`
                    : `${expenses.length} gasto(s) en ${monthLabel}`}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ====== TAB: ALACENA ====== */}
      {activeTab === "alacena" && <PersonalPantryTab />}

      {/* ====== TAB: VEHICULO ====== */}
      {activeTab === "vehiculo" && <PersonalVehicleTab />}

      {/* ====== TAB: DEUDAS ====== */}
      {activeTab === "deudas" && <PersonalDebtsTab />}

      {activeTab === "recordatorios" && <PersonalRemindersTab />}

      {/* Modal Gestionar */}
      {showManager && (
        <CategoriesStoresManager onClose={() => setShowManager(false)} />
      )}

      {/* Modal Captura detallada */}
      {showDetailed && (
        <DetailedExpenseModal
          onClose={() => setShowDetailed(false)}
          onSaved={refreshAll}
        />
      )}

      {/* Modal Exportar datos */}
      {showExports && <ExportsModal onClose={() => setShowExports(false)} />}
    </div>
  );
}
