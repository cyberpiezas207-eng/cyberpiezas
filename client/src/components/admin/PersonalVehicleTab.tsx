// ============================================================================
// SUB-PESTANA "Vehiculo" - dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Estados:
//   - Sin vehiculo: muestra setup form con defaults de Chevy Pop
//   - Con vehiculo: hero card + captura rapida + stats + lista
//
// Cerebro (parser) muestra preview en vivo mientras el usuario escribe.
// Captura rapida soporta: "pemex 200 23.49 km 125400 tanque 40"
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Car,
  Fuel,
  Gauge,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  Store,
  Calendar,
  Sparkles,
  CircleDot,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtDecimal = (n: number, decimals = 2) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDay(ymd: string): string {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return ymd || "";
  return `${parts[2]}/${parts[1]}`;
}

export default function PersonalVehicleTab() {
  const today = nowMexico();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  // Multi-vehiculo: cual vehiculo se ve/captura, y modal para agregar otro
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const utils = trpc.useUtils();

  const vehiclesQuery = trpc.personalVehicles.vehicles.list.useQuery();
  const vehicles = vehiclesQuery.data ?? [];

  // Vehiculo activo (default o el primero)
  const activeVehicle =
    vehicles.find((v) => v.isDefault) ?? vehicles[0] ?? null;
  // Vehiculo que se esta viendo: el elegido a mano, o el activo por default
  const currentVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? activeVehicle;

  if (vehiclesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />
        <div className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
      </div>
    );
  }

  if (!activeVehicle) {
    return <FirstVehicleSetup onCreated={() => vehiclesQuery.refetch()} />;
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }
  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;

  return (
    <div className="space-y-5">
      {/* Selector de vehiculo (multi-vehiculo) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              v.id === currentVehicle.id
                ? "bg-indigo-500/20 text-indigo-100 border-indigo-400/50 shadow-md shadow-indigo-500/10"
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            <span>{v.icon ?? "🚗"}</span>
            {v.name}
            {v.isDefault && (
              <span className="text-[8px] uppercase tracking-wider text-indigo-300/70">
                principal
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setShowAddVehicle(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-slate-800/30 text-slate-300 border border-dashed border-slate-600 hover:border-indigo-400/50 hover:text-indigo-200 transition-all"
        >
          <Plus className="w-3 h-3" />
          Agregar
        </button>
      </div>

      {/* Hero card del vehiculo */}
      <VehicleHeroCard vehicleId={currentVehicle.id} />

      {/* Captura rapida */}
      <QuickFuelCapture
        vehicleId={currentVehicle.id}
        onCreated={() => {
          // Bug4: invalidar TODO el namespace del vehiculo para que el cerebro
          // de tanque y salud se refresquen tras cada carga. Antes solo se
          // refrescaban fuelLogs/stats/vehicles, por eso el tanque se veia
          // congelado aunque el odometro subiera en la BD.
          utils.personalVehicles.invalidate();
        }}
      />

      {/* Navegador de mes */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => shiftMonth(-1)}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all shadow-md"
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
              ← Mes actual
            </button>
          )}
        </div>
        <button
          onClick={() => shiftMonth(1)}
          disabled={atCurrentMonth}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all shadow-md disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards de stats del mes */}
      <MonthStatsCards
        vehicleId={currentVehicle.id}
        year={year}
        month={month}
      />

      {/* Lista de cargas */}
      <FuelLogsList
        vehicleId={currentVehicle.id}
        year={year}
        month={month}
        monthLabel={monthLabel}
      />

      {/* Modal: agregar otro vehiculo */}
      {showAddVehicle && (
        <AddVehicleModal
          onClose={() => setShowAddVehicle(false)}
          onCreated={(newId) => {
            setShowAddVehicle(false);
            utils.personalVehicles.vehicles.list.invalidate();
            vehiclesQuery.refetch();
            if (newId) setSelectedVehicleId(newId);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// FIRST VEHICLE SETUP - cuando no hay ningun vehiculo
// ============================================================================

function FirstVehicleSetup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("Chevy Pop");
  const [brand, setBrand] = useState("Chevrolet");
  const [model, setModel] = useState("Pop");
  const [year, setYear] = useState<string>("");
  const [tankCapacity, setTankCapacity] = useState("40");
  const [currentOdometer, setCurrentOdometer] = useState("");

  const create = trpc.personalVehicles.vehicles.create.useMutation({
    onSuccess: () => {
      toast.success("Vehiculo creado");
      onCreated();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Falta el nombre");
      return;
    }
    create.mutate({
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      year: year ? Number(year) : null,
      tankCapacityLiters: tankCapacity ? Number(tankCapacity) : null,
      currentOdometer: currentOdometer ? Number(currentOdometer) : 0,
      icon: "🚗",
      color: "#6366f1",
      setAsDefault: true,
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="relative p-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
              Primer paso
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Registra tu vehiculo
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 max-w-md">
            Para empezar a tracker gasolina, rendimiento y costo por km.
          </p>
        </div>
      </div>

      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nombre *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Marca
              </label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Modelo
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Año
              </label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                placeholder="2008"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tanque (litros)
              </label>
              <Input
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
                placeholder="40"
                inputMode="decimal"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Odometro actual (km)
              </label>
              <Input
                value={currentOdometer}
                onChange={(e) =>
                  setCurrentOdometer(e.target.value.replace(/\D/g, ""))
                }
                placeholder="125000"
                inputMode="numeric"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={create.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            {create.isPending ? "Creando..." : "Crear vehiculo"}
          </Button>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            Podras editar todo despues. El odometro se actualiza solo cuando
            cargas gasolina.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ADD VEHICLE MODAL - agregar otro vehiculo (multi-vehiculo)
// ============================================================================

function AddVehicleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (newId: number | null) => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [tankCapacity, setTankCapacity] = useState("40");
  const [currentOdometer, setCurrentOdometer] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const create = trpc.personalVehicles.vehicles.create.useMutation({
    onSuccess: (veh: any) => {
      toast.success("Vehiculo agregado");
      onCreated(veh?.id ?? null);
    },
    onError: (e) => toast.error(e.message || "No se pudo agregar"),
  });

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Falta el nombre");
      return;
    }
    create.mutate({
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      year: year ? Number(year) : null,
      tankCapacityLiters: tankCapacity ? Number(tankCapacity) : null,
      currentOdometer: currentOdometer ? Number(currentOdometer) : 0,
      icon: "🚗",
      color: "#6366f1",
      setAsDefault: makeDefault,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-black text-white">Agregar vehiculo</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nombre
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Tsuru, Camioneta, Moto"
              className="bg-slate-900 border-slate-700 text-white mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Marca
              </label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Modelo
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Año
              </label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                placeholder="2008"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tanque (L)
              </label>
              <Input
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
                placeholder="40"
                inputMode="decimal"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Odometro
              </label>
              <Input
                value={currentOdometer}
                onChange={(e) =>
                  setCurrentOdometer(e.target.value.replace(/\D/g, ""))
                }
                placeholder="125000"
                inputMode="numeric"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          <button
            onClick={() => setMakeDefault((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-300 mt-1"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                makeDefault
                  ? "bg-indigo-500 border-indigo-400"
                  : "border-slate-600"
              }`}
            >
              {makeDefault && <span className="text-white text-[10px]">✓</span>}
            </span>
            Marcar como vehiculo principal
          </button>

          <Button
            onClick={handleCreate}
            disabled={create.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            {create.isPending ? "Agregando..." : "Agregar vehiculo"}
          </Button>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            Podras editar todo despues. El odometro se actualiza solo cuando
            cargas gasolina en este vehiculo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VEHICLE HERO CARD - card grande con stats globales del vehiculo
// ============================================================================

function VehicleHeroCard({ vehicleId }: { vehicleId: number }) {
  const statsQuery = trpc.personalVehicles.stats.dashboard.useQuery({
    vehicleId,
  });
  const vehiclesQuery = trpc.personalVehicles.vehicles.list.useQuery();
  const vehicle = vehiclesQuery.data?.find((v) => v.id === vehicleId);
  const stats = statsQuery.data;

  if (!vehicle) return null;

  const tankLiters = vehicle.tankCapacityLiters
    ? Number(vehicle.tankCapacityLiters)
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 shadow-2xl">
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950/50"
        style={{
          backgroundColor: vehicle.color ?? undefined,
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/60"
      />
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-3xl shrink-0 backdrop-blur-sm">
            {vehicle.icon ?? "🚗"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 mb-1">
              <CircleDot className="w-3 h-3 text-indigo-300" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                Activo
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {vehicle.name}
            </h2>
            <p className="text-xs text-slate-400">
              {[vehicle.brand, vehicle.model, vehicle.year]
                .filter(Boolean)
                .join(" · ") || "Sin detalles"}
            </p>
          </div>
        </div>

        {/* Mini-stats: odometro, rango, rendimiento, ultima carga */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <Gauge className="w-3 h-3" />
              Odometro
            </div>
            <p className="text-lg font-black text-white mt-1 leading-tight">
              {(stats?.currentOdometer ?? vehicle.currentOdometer ?? 0).toLocaleString("es-MX")}
            </p>
            <p className="text-[10px] text-slate-500">km</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <Fuel className="w-3 h-3" />
              Tanque lleno
            </div>
            <p className="text-lg font-black text-white mt-1 leading-tight">
              {stats?.estimatedRangeKm
                ? `~${stats.estimatedRangeKm.toLocaleString("es-MX")}`
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">
              {!tankLiters
                ? "necesita capacidad"
                : stats?.statsReliable
                  ? `${tankLiters}L · km estimados`
                  : "pocos datos aun"}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <Sparkles className="w-3 h-3" />
              Rinde
            </div>
            <p className="text-lg font-black text-emerald-300 mt-1 leading-tight">
              {stats?.statsReliable && stats?.avgKmPerLiter
                ? fmtDecimal(stats.avgKmPerLiter, 1)
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats?.statsReliable ? "km / litro promedio" : "pocos datos aun"}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <Calendar className="w-3 h-3" />
              Ultima carga
            </div>
            <p className="text-lg font-black text-white mt-1 leading-tight">
              {stats?.daysSinceLastFill == null
                ? "—"
                : stats.daysSinceLastFill === 0
                  ? "Hoy"
                  : `${stats.daysSinceLastFill}d`}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats?.lastFillDate ? formatDay(stats.lastFillDate) : "sin registros"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK FUEL CAPTURE - captura rapida con preview del parser
// ============================================================================

function QuickFuelCapture({
  vehicleId,
  onCreated,
}: {
  vehicleId: number;
  onCreated: () => void;
}) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [createExpense, setCreateExpense] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const categories = categoriesQuery.data ?? [];
  // Buscar categoria "Gasolina" automaticamente
  const gasolinaCategory = categories.find((c) =>
    (c.slug ?? "").toLowerCase().includes("gasolin"),
  );

  const preview = trpc.personalVehicles.fuelLogs.previewCapture.useQuery(
    { text: debounced },
    { enabled: debounced.length > 0 },
  );

  const quickCreate = trpc.personalVehicles.fuelLogs.quickCreate.useMutation({
    onSuccess: (res) => {
      const bits: string[] = ["Carga registrada"];
      if (res.linkedExpenseId) bits.push("gasto creado");
      toast.success(bits.join(" · "));
      setText("");
      setDebounced("");
      onCreated();
    },
    onError: (e) => toast.error(e.message || "No se pudo registrar"),
  });

  function handleAdd() {
    const t = text.trim();
    if (!t) return;
    quickCreate.mutate({
      text: t,
      vehicleId,
      createExpense,
      expenseCategoryId: gasolinaCategory?.id ?? null,
    });
  }

  const d = preview.data;
  const liters = d?.liters ?? null;

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Fuel className="w-3.5 h-3.5 text-indigo-300" />
          Captura rapida de carga
        </label>
        <p className="text-[11px] text-slate-500 mt-0.5">
          ej: pemex 200 23.49 km 125400 tanque 40
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ej: pemex 500 24.50"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <Button
            onClick={handleAdd}
            disabled={quickCreate.isPending || !text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            {quickCreate.isPending ? "..." : "Cargar"}
          </Button>
        </div>

        {/* Preview en vivo del parser */}
        {debounced.length > 0 && d && (
          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Detectado
              </span>
              <span className="text-[10px] text-slate-500">
                Confianza: {Math.round((d.confidence ?? 0) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {d.storeName && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200 flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {d.storeName}
                </span>
              )}
              {d.amountPaid != null && (
                <span className="font-bold text-orange-300">
                  {fmt(d.amountPaid)}
                </span>
              )}
              {d.pricePerLiter != null && (
                <>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-emerald-300 font-bold">
                    {fmtDecimal(d.pricePerLiter, 2)}/L
                  </span>
                </>
              )}
              {liters != null && liters > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 border border-indigo-400/30 text-indigo-200">
                  {fmtDecimal(liters, 3)} litros
                </span>
              )}
            </div>
            {(d.odometerReading != null || d.tankPercentBefore != null) && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                {d.odometerReading != null && (
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {d.odometerReading.toLocaleString("es-MX")} km
                  </span>
                )}
                {d.tankPercentBefore != null && (
                  <span>Tanque al {d.tankPercentBefore}%</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Toggle gasto vinculado */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={createExpense}
            onChange={(e) => setCreateExpense(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500"
          />
          <span className="text-xs text-slate-300">
            Crear gasto personal vinculado (categoria Gasolina si existe)
          </span>
        </label>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MONTH STATS CARDS - 4 cards del mes seleccionado
// ============================================================================

function MonthStatsCards({
  vehicleId,
  year,
  month,
}: {
  vehicleId: number;
  year: number;
  month: number;
}) {
  const query = trpc.personalVehicles.stats.dashboard.useQuery({
    vehicleId,
    year,
    month,
  });
  const s = query.data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Gastado en gasolina */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-orange-950/60 via-slate-800 to-slate-800/90 border border-orange-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30 flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-orange-300" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Gastado
          </p>
          <div className="text-2xl font-black text-orange-300 tracking-tight leading-tight">
            {fmt(s?.totalSpent ?? 0)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">{s?.fillCount ?? 0} carga(s)</p>
        </CardContent>
      </Card>

      {/* Litros */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-950/60 via-slate-800 to-slate-800/90 border border-cyan-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/30 flex items-center justify-center mb-3">
            <Fuel className="w-4 h-4 text-cyan-300" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Litros
          </p>
          <div className="text-2xl font-black text-cyan-200 tracking-tight leading-tight">
            {s?.totalLiters ? fmtDecimal(s.totalLiters, 2) : "0"}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {s?.avgPricePerLiter
              ? `prom ${fmtDecimal(s.avgPricePerLiter, 2)}/L`
              : "este mes"}
          </p>
        </CardContent>
      </Card>

      {/* Rendimiento */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-800/90 border border-emerald-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Rendimiento
          </p>
          {s?.statsReliable && s?.avgKmPerLiter ? (
            <div className="text-2xl font-black text-emerald-300 tracking-tight leading-tight">
              {fmtDecimal(s.avgKmPerLiter, 1)}
            </div>
          ) : (
            <div className="text-base font-bold text-amber-300/80 tracking-tight leading-tight pt-1">
              Pocos datos
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-1.5">
            {s?.statsReliable ? "km / litro" : "captura +cargas con odometro"}
          </p>
        </CardContent>
      </Card>

      {/* Costo por km */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-800 to-slate-800/90 border border-indigo-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center mb-3">
            <TrendingDown className="w-4 h-4 text-indigo-300" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Costo / km
          </p>
          {s?.statsReliable && s?.avgCostPerKm ? (
            <div className="text-2xl font-black text-indigo-200 tracking-tight leading-tight">
              {`$${fmtDecimal(s.avgCostPerKm, 2)}`}
            </div>
          ) : (
            <div className="text-base font-bold text-amber-300/80 tracking-tight leading-tight pt-1">
              Pocos datos
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-1.5">
            {s?.statsReliable
              ? `${s?.totalKm ?? 0} km totales`
              : `${s?.totalKm ?? 0} km medidos aun`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// FUEL LOGS LIST - cargas del mes
// ============================================================================

function FuelLogsList({
  vehicleId,
  year,
  month,
  monthLabel,
}: {
  vehicleId: number;
  year: number;
  month: number;
  monthLabel: string;
}) {
  const utils = trpc.useUtils();
  const logsQuery = trpc.personalVehicles.fuelLogs.list.useQuery({
    vehicleId,
    year,
    month,
    limit: 200,
  });
  const logs = logsQuery.data ?? [];

  const softDelete = trpc.personalVehicles.fuelLogs.softDelete.useMutation({
    onSuccess: () => {
      toast.success("Carga borrada");
      // Bug4: refrescar todo el vehiculo (incluido el cerebro de tanque/salud)
      utils.personalVehicles.invalidate();
    },
    onError: (e) => toast.error(e.message || "No se pudo borrar"),
  });

  function handleDelete(id: number) {
    if (window.confirm("Borrar esta carga?")) {
      softDelete.mutate({ id });
    }
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-3">
          Cargas de {monthLabel}
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-10">
            <Fuel className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">
              Sin cargas en {monthLabel}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Usa la captura rapida de arriba para registrar tu primera carga.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/60">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30 flex items-center justify-center text-base shrink-0">
                    ⛽
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {log.storeName ?? "Sin tienda"} ·{" "}
                      {fmtDecimal(Number(log.liters), 2)}L
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDay(log.fillDate)}</span>
                      <span>·</span>
                      <span>${fmtDecimal(Number(log.pricePerLiter), 2)}/L</span>
                      {log.odometerReading != null && (
                        <>
                          <span>·</span>
                          <span>
                            {log.odometerReading.toLocaleString("es-MX")} km
                          </span>
                        </>
                      )}
                      {log.kmPerLiter != null && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 font-bold">
                            {fmtDecimal(Number(log.kmPerLiter), 1)} km/L
                          </span>
                        </>
                      )}
                      {log.tankPercentBefore != null && (
                        <>
                          <span>·</span>
                          <span>tanque {log.tankPercentBefore}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-bold text-orange-400">
                    {fmt(Number(log.amountPaid))}
                  </span>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Borrar carga"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
