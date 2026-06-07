// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/DeseosTab.tsx <<<
// ============================================================================
// VISTA "Deseos" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Tu wishlist con CEREBRO de viabilidad. Agregas un deseo (ej: Xbox $13,000,
// lo quieres en 3 meses) y el cerebro mira tu colchon (bolsillos) + lo que te
// sobra al mes (dinero libre) y te dice:
//   - VIABLE (verde): alcanzas a tiempo sin descuidar tus pagos
//   - AJUSTADO (ambar): se puede, pero te deja sin reserva o muy justo
//   - MEJOR ESPERA (rojo): no alcanzas a tiempo / no te sobra al mes
// Y un PLAN: "aparta $X al mes, lo tienes en Y meses".
//
// Solo frontend: usa endpoints que ya existen. El calculo del dinero libre es
// el mismo espiritu que DineroLibreCard (usa pendingThisMonth de deudas).
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Heart,
  Plus,
  Sparkles,
  Trash2,
  Check,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Gift,
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

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Meses (aprox) desde hoy hasta una fecha YYYY-MM-DD. Minimo 0.
function monthsUntil(ymd: string | null): number | null {
  if (!ymd || typeof ymd !== "string") return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  const diffDays = (target.getTime() - today.getTime()) / 86_400_000;
  if (diffDays <= 0) return 0;
  return Math.max(0, Math.ceil(diffDays / 30));
}

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function DeseosTab() {
  const utils = trpc.useUtils();
  const today = nowMexico();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Formulario de alta
  const [title, setTitle] = useState("");
  const [costText, setCostText] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // --- Queries de deseos ---
  const wishesQuery = trpc.personalWishes.list.useQuery({ status: "wishing" });
  const achievedQuery = trpc.personalWishes.list.useQuery({
    status: "achieved",
  });

  // --- Queries para el cerebro (colchon + dinero libre) ---
  const walletsQuery = trpc.personalWallets.wallets.list.useQuery();
  const overviewQuery = trpc.personalFinanceOverview.getOverview.useQuery();
  const debtSummaryQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const mySubsQuery = trpc.pagos.subscriptions.listMine.useQuery();

  function refreshWishes() {
    utils.personalWishes.list.invalidate();
  }

  const createM = trpc.personalWishes.create.useMutation({
    onSuccess: () => {
      toast.success("Deseo agregado");
      setTitle("");
      setCostText("");
      setTargetDate("");
      refreshWishes();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo agregar"),
  });

  const setStatusM = trpc.personalWishes.setStatus.useMutation({
    onSuccess: () => {
      refreshWishes();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo actualizar"),
  });

  const addSavedM = trpc.personalWishes.addSaved.useMutation({
    onSuccess: () => {
      toast.success("Apartado actualizado");
      refreshWishes();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo apartar"),
  });

  const deleteM = trpc.personalWishes.delete.useMutation({
    onSuccess: () => {
      toast.success("Deseo borrado");
      refreshWishes();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo borrar"),
  });

  // --- CEREBRO: colchon y dinero libre del mes ---
  const wallets = (walletsQuery.data ?? []) as any[];
  const colchon = wallets.reduce((acc, w) => acc + toNum(w.balance), 0);

  const overview = overviewQuery.data;
  const debtSum = debtSummaryQuery.data;
  const mySubs = mySubsQuery.data ?? [];

  const businessProfit = overview?.currentMonth?.businessProfit ?? 0;
  const personalExpenses = overview?.currentMonth?.personalExpenses ?? 0;
  const deudasMes = toNum(debtSum?.pendingThisMonth);
  const suscripcionesMes = (mySubs as any[]).reduce((acc, sub: any) => {
    const isActive = sub?.status === "active" || sub?.isActive;
    if (!isActive) return acc;
    return acc + toNum(sub?.monthlyPrice ?? sub?.amount);
  }, 0);
  const ahorroDiario = toNum(debtSum?.ahorroDiarioSugerido);
  const ahorroPlaneadoMes = ahorroDiario * daysInMonth(year, month);

  // Lo que te sobra al mes despues de cubrir todo (puede ser negativo).
  const dineroLibreMes =
    businessProfit - personalExpenses - deudasMes - suscripcionesMes - ahorroPlaneadoMes;

  // Reserva de emergencia sugerida: 1 mes de gastos personales.
  const reservaEmergencia = personalExpenses > 0 ? personalExpenses : 0;
  // Colchon disponible para deseos = colchon - reserva (no menos que 0).
  const colchonDisponible = Math.max(0, colchon - reservaEmergencia);

  const wishes = (wishesQuery.data ?? []) as any[];
  const achieved = (achievedQuery.data ?? []) as any[];

  function handleCreate() {
    const t = title.trim();
    if (!t) {
      toast.error("Ponle nombre a tu deseo");
      return;
    }
    const cost = Number(costText.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Ponle un costo valido");
      return;
    }
    createM.mutate({
      title: t,
      estimatedCost: cost,
      targetDate: targetDate || null,
    });
  }

  function handleApartar(w: any) {
    const raw = window.prompt(
      `Cuanto quieres apartar para "${w.title}"?\n(numero, ej: 500)`,
    );
    if (raw == null) return;
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Monto invalido");
      return;
    }
    addSavedM.mutate({ id: w.id, amount: n });
  }

  // --- El cerebro: analiza un deseo y devuelve veredicto + plan ---
  function analizar(w: any) {
    const costo = toNum(w.estimatedCost);
    const apartado = toNum(w.savedSoFar);
    const falta = Math.max(0, costo - apartado);
    const mesesMeta = monthsUntil(w.targetDate); // null si sin fecha

    // Progreso de lo apartado
    const pctApartado = costo > 0 ? Math.min(100, Math.round((apartado / costo) * 100)) : 0;

    // Caso: ya lo tienes apartado
    if (falta <= 0) {
      return {
        kind: "ready" as const,
        cls: "emerald",
        titulo: "Ya lo tienes apartado",
        detalle: "Tienes el dinero guardado para este deseo.",
        pctApartado,
        mesesNecesarios: 0,
      };
    }

    // Cuanto del colchon disponible alcanza
    const cubreColchon = colchonDisponible >= falta;

    // Meses que tomaria con el dinero libre mensual
    const mesesNecesarios =
      dineroLibreMes > 0 ? Math.ceil(falta / dineroLibreMes) : null;

    // Veredicto
    let kind: "viable" | "ajustado" | "espera" = "espera";
    let titulo = "Mejor espera";
    let detalle = "";

    if (cubreColchon) {
      // Te alcanza con lo guardado sin tocar tu reserva de emergencia
      kind = "viable";
      titulo = "Viable ya";
      detalle = `Te alcanza con tu colchon disponible (${fmt(colchonDisponible)}) sin tocar tu reserva.`;
    } else if (colchon >= falta) {
      // Alcanza con el colchon TOTAL pero te comes la reserva de emergencia
      kind = "ajustado";
      titulo = "Ajustado";
      detalle = `Te alcanza con lo guardado, pero te deja con poca reserva de emergencia.`;
    } else if (mesesNecesarios != null) {
      // Hay que ahorrar mes a mes
      if (mesesMeta == null) {
        kind = "viable";
        titulo = "Viable con plan";
        detalle = `Apartando lo que te sobra al mes, lo tienes en ${mesesNecesarios} ${mesesNecesarios === 1 ? "mes" : "meses"}.`;
      } else if (mesesNecesarios <= mesesMeta) {
        kind = "viable";
        titulo = "Viable a tiempo";
        detalle = `Lo logras en ${mesesNecesarios} ${mesesNecesarios === 1 ? "mes" : "meses"}, antes de tu fecha (${mesesMeta} ${mesesMeta === 1 ? "mes" : "meses"}).`;
      } else {
        kind = "ajustado";
        titulo = "Ajustado a la fecha";
        detalle = `Necesitas ${mesesNecesarios} meses pero tu meta es en ${mesesMeta}. Tendrias que apartar mas o mover la fecha.`;
      }
    } else {
      // dineroLibreMes <= 0
      kind = "espera";
      titulo = "Mejor espera";
      detalle =
        "Ahorita no te sobra al mes despues de cubrir deudas y gastos. Mejor primero aligera eso.";
    }

    // Plan: cuanto apartar al mes para lograrlo en la fecha (o sugerido)
    let aporteMensualSugerido: number | null = null;
    if (mesesMeta != null && mesesMeta > 0) {
      aporteMensualSugerido = Math.ceil(falta / mesesMeta);
    } else if (mesesNecesarios != null && mesesNecesarios > 0) {
      aporteMensualSugerido = Math.ceil(falta / mesesNecesarios);
    }

    return {
      kind,
      cls:
        kind === "viable" ? "emerald" : kind === "ajustado" ? "amber" : "rose",
      titulo,
      detalle,
      pctApartado,
      falta,
      mesesNecesarios,
      mesesMeta,
      aporteMensualSugerido,
    };
  }

  const THEME: Record<string, { chip: string; bar: string; text: string }> = {
    emerald: {
      chip: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
      bar: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
      text: "text-emerald-300",
    },
    amber: {
      chip: "bg-amber-500/15 text-amber-200 border-amber-500/40",
      bar: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
      text: "text-amber-300",
    },
    rose: {
      chip: "bg-rose-500/15 text-rose-200 border-rose-500/40",
      bar: "linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)",
      text: "text-rose-300",
    },
  };

  return (
    <div className="space-y-5">
      {/* Header PREMIUM */}
      <div className="relative overflow-hidden rounded-2xl border border-pink-500/40 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-slate-900 to-fuchsia-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-fuchsia-500/15 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-pink-500/20 ring-1 ring-pink-400/40 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-pink-200" />
          </span>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-400/30 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-200">
                Mis deseos
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-tight">
              Deseos
            </h2>
            <p className="text-xs text-pink-100/70 mt-0.5">
              Lo que quieres comprar, y si te alcanza sin descuidar tus pagos
            </p>
          </div>
        </div>
      </div>

      {/* Resumen del cerebro: colchon + dinero libre */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-amber-300" />
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Tu colchon
            </p>
          </div>
          <p className="text-xl font-black text-amber-200 tabular-nums">
            {fmt(colchon)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Disponible para deseos: {fmt(colchonDisponible)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Te sobra al mes
            </p>
          </div>
          <p
            className={`text-xl font-black tabular-nums ${dineroLibreMes >= 0 ? "text-emerald-200" : "text-rose-300"}`}
          >
            {fmt(dineroLibreMes)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Despues de deudas y gastos
          </p>
        </div>
      </div>

      {/* Alta de deseo */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-pink-300" />
            Agregar un deseo
          </h3>
          <div className="flex flex-col gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Que quieres (ej: Xbox Series X)"
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[120px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  $
                </span>
                <Input
                  value={costText}
                  onChange={(e) => setCostText(e.target.value)}
                  placeholder="Cuanto cuesta"
                  inputMode="decimal"
                  className="bg-slate-900 border-slate-700 text-white pl-7"
                />
              </div>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white w-44"
                title="Para cuando lo quieres (opcional)"
              />
              <Button
                onClick={handleCreate}
                disabled={createM.isPending}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              La fecha es opcional, pero ayuda al cerebro a decirte si llegas a
              tiempo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de deseos con cerebro */}
      {wishesQuery.isLoading ? (
        <div className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
      ) : wishes.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-8 text-center">
            <Gift className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-200 font-bold">Sin deseos todavia</p>
            <p className="text-slate-500 text-sm mt-1">
              Agrega algo que quieras y te digo si te alcanza.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wishes.map((w: any) => {
            const a = analizar(w);
            const theme = THEME[a.cls];
            return (
              <Card key={w.id} className="bg-slate-800/40 border-slate-700">
                <CardContent className="p-4">
                  {/* Header del deseo */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{
                          backgroundColor: (w.color || "#c084fc") + "22",
                          border: `1px solid ${(w.color || "#c084fc")}55`,
                        }}
                      >
                        {w.icon || "🎁"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {w.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                          <span className="font-semibold text-slate-300 tabular-nums">
                            {fmt(toNum(w.estimatedCost))}
                          </span>
                          {w.requestedBy && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-pink-300">
                                pidio {w.requestedBy}
                              </span>
                            </>
                          )}
                          {w.targetDate && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <CalendarClock className="w-3 h-3" />
                                {w.targetDate}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Semaforo */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border shrink-0 ${theme.chip}`}
                    >
                      {a.cls === "rose" ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {a.titulo}
                    </span>
                  </div>

                  {/* Veredicto del cerebro */}
                  <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-3 mb-3">
                    <p className="text-xs text-slate-200 leading-snug">
                      {a.detalle}
                    </p>
                    {a.aporteMensualSugerido != null && a.kind !== "ready" && (
                      <p className={`text-xs font-bold mt-1.5 ${theme.text}`}>
                        Plan: aparta {fmt(a.aporteMensualSugerido)} al mes.
                      </p>
                    )}
                  </div>

                  {/* Barra de progreso de lo apartado */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">
                        Apartado: {fmt(toNum(w.savedSoFar))}
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        {a.pctApartado}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${a.pctApartado}%`, background: theme.bar }}
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleApartar(w)}
                      disabled={addSavedM.isPending}
                      className="flex items-center gap-1 text-[12px] font-bold text-pink-100 bg-pink-600/80 hover:bg-pink-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      <PiggyBank className="w-3.5 h-3.5" />
                      Apartar
                    </button>
                    <button
                      onClick={() =>
                        setStatusM.mutate({ id: w.id, status: "achieved" })
                      }
                      disabled={setStatusM.isPending}
                      className="flex items-center gap-1 text-[12px] font-bold text-emerald-200 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Ya lo logre
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Borrar el deseo "${w.title}"?`))
                          deleteM.mutate({ id: w.id });
                      }}
                      className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors ml-auto"
                      title="Borrar deseo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Logrados */}
      {achieved.length > 0 && (
        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-300" />
              Ya logrados
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                {achieved.length}
              </span>
            </h3>
            <div className="space-y-1.5">
              {achieved.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 opacity-80"
                >
                  <span className="text-xs text-slate-300 truncate flex items-center gap-1.5">
                    <span>{w.icon || "🎁"}</span>
                    {w.title}
                  </span>
                  <span className="text-xs font-bold text-slate-300 tabular-nums shrink-0">
                    {fmt(toNum(w.estimatedCost))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
