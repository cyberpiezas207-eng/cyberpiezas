// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/AnimalesTab.tsx <<<
// ============================================================================
// VISTA "Animales" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Modulo autonomo: tus grupos de animales (perro, borregos, conejos,
// gallinas...) con lo que gastas y lo que te dan de vuelta (huevos, consumo,
// ventas). Por grupo se ve el "conviene" = retribucion - gasto.
//
// Lee del router personalAnimals. Comentarios SIN ACENTOS por convencion.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  PawPrint,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Coins,
  ChevronDown,
  ChevronUp,
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

// Quick-pick de animales comunes (prefijan nombre + especie + icono)
const QUICK_ANIMALS: Array<{ name: string; species: string; icon: string }> = [
  { name: "Perro", species: "perro", icon: "🐕" },
  { name: "Borregos", species: "borrego", icon: "🐑" },
  { name: "Conejos", species: "conejo", icon: "🐰" },
  { name: "Gallinas", species: "gallina", icon: "🐔" },
  { name: "Vacas", species: "vaca", icon: "🐄" },
  { name: "Cerdos", species: "cerdo", icon: "🐖" },
];

function speciesEmoji(species: string | null, icon: string | null): string {
  if (icon) return icon;
  const s = (species ?? "").toLowerCase();
  const map: Record<string, string> = {
    perro: "🐕", borrego: "🐑", oveja: "🐑", conejo: "🐰", gallina: "🐔",
    pollo: "🐔", vaca: "🐄", cerdo: "🐖", puerco: "🐖", pavo: "🦃",
    pato: "🦆", cabra: "🐐", chivo: "🐐", caballo: "🐎", borrega: "🐑",
  };
  return map[s] ?? "🐾";
}

const TYPE_OPTIONS: Array<{ key: string; label: string; emoji: string }> = [
  { key: "gasto", label: "Gasto", emoji: "💸" },
  { key: "produccion", label: "Produccion", emoji: "🥚" },
  { key: "consumo", label: "Consumo", emoji: "🍽️" },
  { key: "venta", label: "Venta", emoji: "💰" },
];

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function AnimalesTab() {
  const utils = trpc.useUtils();
  const summaryQuery = trpc.personalAnimals.summary.useQuery(undefined);

  // Alta de grupo
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [count, setCount] = useState("");
  const [icon, setIcon] = useState("");

  // Grupo expandido (para registrar movimientos)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Formulario de movimiento
  const [mType, setMType] = useState("gasto");
  const [mAmount, setMAmount] = useState("");
  const [mQty, setMQty] = useState("");
  const [mUnit, setMUnit] = useState("");
  const [mNotes, setMNotes] = useState("");

  const eventsQuery = trpc.personalAnimals.events.useQuery(
    { animalId: expandedId ?? 0 },
    { enabled: expandedId != null },
  );

  function refreshAll() {
    utils.personalAnimals.summary.invalidate();
    utils.personalAnimals.events.invalidate();
  }

  const createM = trpc.personalAnimals.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo agregado");
      setName("");
      setSpecies("");
      setCount("");
      setIcon("");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo agregar"),
  });

  const archiveM = trpc.personalAnimals.archive.useMutation({
    onSuccess: () => {
      toast.success("Grupo quitado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo quitar"),
  });

  const addEventM = trpc.personalAnimals.addEvent.useMutation({
    onSuccess: () => {
      toast.success("Movimiento registrado");
      setMAmount("");
      setMQty("");
      setMUnit("");
      setMNotes("");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo registrar"),
  });

  const deleteEventM = trpc.personalAnimals.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("Movimiento borrado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo borrar"),
  });

  const summary = summaryQuery.data;
  const animals = summary?.animals ?? [];
  const isLoading = summaryQuery.isLoading;

  function handleQuickPick(q: (typeof QUICK_ANIMALS)[number]) {
    setName(q.name);
    setSpecies(q.species);
    setIcon(q.icon);
  }

  function handleCreate() {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Ponle un nombre al grupo");
      return;
    }
    const cnt = count.trim() ? parseInt(count, 10) : undefined;
    if (cnt !== undefined && (!Number.isFinite(cnt) || cnt < 0)) {
      toast.error("La cantidad no es valida");
      return;
    }
    createM.mutate({
      name: cleanName,
      species: species.trim() || undefined,
      count: cnt,
      icon: icon.trim() || undefined,
    });
  }

  function handleAddEvent(animalId: number) {
    const amt = mAmount.trim() ? Number(mAmount) : undefined;
    const qty = mQty.trim() ? Number(mQty) : undefined;

    // Gasto y venta necesitan dinero; produccion/consumo el valor es opcional
    if ((mType === "gasto" || mType === "venta") && (!amt || amt <= 0)) {
      toast.error(
        mType === "gasto" ? "Pon cuanto gastaste" : "Pon en cuanto vendiste",
      );
      return;
    }
    if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) {
      toast.error("El monto no es valido");
      return;
    }
    if (qty !== undefined && (!Number.isFinite(qty) || qty <= 0)) {
      toast.error("La cantidad no es valida");
      return;
    }

    addEventM.mutate({
      animalId,
      type: mType as any,
      amount: amt,
      quantity: qty,
      unitLabel: mUnit.trim() || undefined,
      notes: mNotes.trim() || undefined,
    });
  }

  function handleArchive(a: any) {
    if (!window.confirm(`Quitar "${a.name}" de tus animales?`)) return;
    archiveM.mutate({ id: a.id });
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <PawPrint className="w-5 h-5 text-amber-300" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-100 leading-tight">
            Animales
          </h2>
          <p className="text-xs text-slate-400">
            Cuanto gastas y que te dan de vuelta
          </p>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3">
          <p className="text-[11px] text-rose-300/80">Gastado</p>
          <p className="text-lg font-bold text-rose-200 tabular-nums">
            {fmt(summary?.totalGasto ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
          <p className="text-[11px] text-emerald-300/80">Recuperado</p>
          <p className="text-lg font-bold text-emerald-200 tabular-nums">
            {fmt(summary?.totalRetribucion ?? 0)}
          </p>
        </div>
        <div
          className={`rounded-xl border p-3 ${
            (summary?.totalBalance ?? 0) >= 0
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          <p className="text-[11px] text-slate-300/80">Balance</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              (summary?.totalBalance ?? 0) >= 0
                ? "text-emerald-200"
                : "text-amber-200"
            }`}
          >
            {fmt(summary?.totalBalance ?? 0)}
          </p>
        </div>
      </div>

      {/* Alta de grupo */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-300" />
            Agregar grupo
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_ANIMALS.map((q) => (
              <button
                key={q.species}
                onClick={() => handleQuickPick(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-500/40 hover:text-amber-200"
              >
                {q.icon} {q.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🐾"
                className="bg-slate-900 border-slate-700 w-16 text-center"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre (ej: Gallinas)"
                className="bg-slate-900 border-slate-700 flex-1 min-w-[140px]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="Especie (ej: gallina)"
                className="bg-slate-900 border-slate-700 flex-1 min-w-[120px]"
              />
              <Input
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Cuantos"
                inputMode="numeric"
                className="bg-slate-900 border-slate-700 w-24"
              />
              <Button
                onClick={handleCreate}
                disabled={createM.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de grupos */}
      {isLoading ? (
        <div className="h-24 rounded-xl bg-slate-700/40 animate-pulse" />
      ) : animals.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-8 text-center">
            <PawPrint className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">Sin animales todavia</p>
            <p className="text-slate-500 text-sm mt-1">
              Usa los botones de arriba para agregar tu primer grupo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {animals.map((row: any) => {
            const a = row.animal;
            const isOpen = expandedId === a.id;
            const balanceOk = row.balance >= 0;
            const hasGasto = row.gasto > 0;
            return (
              <Card key={a.id} className="bg-slate-800/40 border-slate-700">
                <CardContent className="p-4">
                  {/* Encabezado del grupo */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{
                          backgroundColor: (a.color ?? "#BA7517") + "22",
                        }}
                      >
                        {speciesEmoji(a.species, a.icon)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-100 truncate">
                          {a.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {a.count ? `${a.count} ` : ""}
                          {a.species ?? "animales"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(a)}
                      className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                      title="Quitar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Gasto vs recuperado */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
                      <p className="text-[10px] text-slate-500">Gastado 💸</p>
                      <p className="text-sm font-bold text-rose-200 tabular-nums">
                        {fmt(row.gasto)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
                      <p className="text-[10px] text-slate-500">Recuperado 🎁</p>
                      <p className="text-sm font-bold text-emerald-200 tabular-nums">
                        {fmt(row.retribucion)}
                      </p>
                    </div>
                  </div>

                  {/* Conviene */}
                  <div
                    className={`mt-2 rounded-lg px-3 py-2 flex items-center justify-between ${
                      !hasGasto
                        ? "bg-slate-900 border border-slate-700"
                        : balanceOk
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-amber-500/10 border border-amber-500/30"
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-300" />
                      {!hasGasto
                        ? "Aun sin gastos registrados"
                        : balanceOk
                          ? "Vas ganando"
                          : "Vas en contra"}
                    </span>
                    {hasGasto && (
                      <span
                        className={`text-sm font-bold tabular-nums flex items-center gap-1 ${
                          balanceOk ? "text-emerald-300" : "text-amber-300"
                        }`}
                      >
                        {balanceOk ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {fmt(row.balance)}
                      </span>
                    )}
                  </div>

                  {/* Boton registrar movimiento */}
                  <button
                    onClick={() => {
                      setExpandedId(isOpen ? null : a.id);
                      setMType("gasto");
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-100 bg-amber-600/80 hover:bg-amber-600 rounded-lg py-2"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Cerrar
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Registrar movimiento
                      </>
                    )}
                  </button>

                  {/* Panel de movimiento */}
                  {isOpen && (
                    <div className="mt-3 border-t border-slate-700 pt-3">
                      {/* Tipo */}
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {TYPE_OPTIONS.map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setMType(t.key)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                              mType === t.key
                                ? "bg-amber-500/20 border-amber-400/60 text-amber-100"
                                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {t.emoji} {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Input
                          value={mAmount}
                          onChange={(e) => setMAmount(e.target.value)}
                          placeholder={
                            mType === "gasto"
                              ? "Cuanto gastaste $"
                              : mType === "venta"
                                ? "En cuanto vendiste $"
                                : "Valor estimado $ (opcional)"
                          }
                          inputMode="decimal"
                          className="bg-slate-900 border-slate-700 flex-1 min-w-[140px]"
                        />
                      </div>

                      {(mType === "produccion" ||
                        mType === "consumo" ||
                        mType === "venta") && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          <Input
                            value={mQty}
                            onChange={(e) => setMQty(e.target.value)}
                            placeholder="Cantidad"
                            inputMode="decimal"
                            className="bg-slate-900 border-slate-700 w-28"
                          />
                          <Input
                            value={mUnit}
                            onChange={(e) => setMUnit(e.target.value)}
                            placeholder="Unidad (huevos, kg)"
                            className="bg-slate-900 border-slate-700 flex-1 min-w-[120px]"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 mt-2">
                        <Input
                          value={mNotes}
                          onChange={(e) => setMNotes(e.target.value)}
                          placeholder="Nota (opcional)"
                          className="bg-slate-900 border-slate-700 flex-1"
                        />
                        <Button
                          onClick={() => handleAddEvent(a.id)}
                          disabled={addEventM.isPending}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Guardar
                        </Button>
                      </div>

                      {mType !== "gasto" && mType !== "venta" && (
                        <p className="text-[10px] text-slate-500 mt-1.5">
                          El valor estimado es el ahorro/valor de lo que produjo
                          o consumiste. Puedes dejarlo vacio y solo contar la
                          cantidad.
                        </p>
                      )}

                      {/* Ultimos movimientos */}
                      <div className="mt-3">
                        <p className="text-[10px] text-slate-500 mb-1.5">
                          Ultimos movimientos
                        </p>
                        {eventsQuery.isLoading ? (
                          <div className="h-10 rounded-lg bg-slate-700/40 animate-pulse" />
                        ) : (eventsQuery.data ?? []).length === 0 ? (
                          <p className="text-[11px] text-slate-600">
                            Aun no hay movimientos en este grupo.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {(eventsQuery.data ?? [])
                              .slice(0, 8)
                              .map((ev: any) => {
                                const t = TYPE_OPTIONS.find(
                                  (x) => x.key === ev.type,
                                );
                                return (
                                  <div
                                    key={ev.id}
                                    className="flex items-center justify-between gap-2 text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5"
                                  >
                                    <span className="text-slate-300 min-w-0 truncate">
                                      {t?.emoji ?? "•"} {t?.label ?? ev.type}
                                      {ev.quantity
                                        ? ` · ${Number(ev.quantity)} ${ev.unitLabel ?? ""}`
                                        : ""}
                                      <span className="text-slate-600">
                                        {" "}
                                        · {ev.eventDate}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-2 shrink-0">
                                      {ev.amount ? (
                                        <span className="text-slate-200 tabular-nums">
                                          {fmt(Number(ev.amount))}
                                        </span>
                                      ) : null}
                                      <button
                                        onClick={() =>
                                          deleteEventM.mutate({ id: ev.id })
                                        }
                                        className="text-slate-500 hover:text-red-300"
                                        title="Borrar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
