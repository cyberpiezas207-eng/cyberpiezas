// >>> ESTE ARCHIVO VA EN: client/src/components/admin/ServiciosTab.tsx <<<
// ============================================================================
// VISTA "Servicios" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Lista de servicios fijos (recibos que se repiten cada mes): luz, agua,
// internet, etc. Muestra el total esperado del mes, lo pagado y lo que falta.
// Boton "registrar pago" crea un gasto normal (entra al pastel) y marca el
// servicio como pagado este mes.
//
// CAPA 1 (solo frontend, sin cambios de backend):
//   - Contraste premium (header con orbs, mejor legibilidad)
//   - Semaforo de vencimiento: cada servicio pendiente muestra si vence hoy,
//     pronto (<=3 dias) o mas adelante, ordenados por urgencia.
//   - Pendientes arriba (lo que falta por pagar), pagados abajo apagados.
//   - Barra de progreso del mes (pagado vs esperado).
//   - Mini cerebro frontend: avisa cuantos faltan y cuanto, y resalta el que
//     vence mas pronto como "el siguiente en caer".
//
// Lee del router personalServices. Comentarios SIN ACENTOS por convencion.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trash2,
  CircleDollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
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

// Morelos = UTC-6 todo el ano
function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function nowMexicoYM(): { year: number; month: number } {
  const d = nowMexico();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// Dias desde hoy hasta el "dia X" del mes que se esta viendo. Si el dia ya
// paso en el mes actual, devuelve negativo (vencido). Para meses distintos al
// actual devuelve null (no aplica el semaforo de urgencia).
function daysUntilDueDay(
  dueDay: number | null | undefined,
  viewYear: number,
  viewMonth: number,
): number | null {
  if (dueDay == null || dueDay < 1 || dueDay > 31) return null;
  const now = nowMexico();
  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth() + 1;
  // Solo aplica si estamos viendo el mes actual
  if (viewYear !== curYear || viewMonth !== curMonth) return null;
  const today = now.getUTCDate();
  return dueDay - today;
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function ServiciosTab() {
  const initial = nowMexicoYM();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  // Formulario de alta
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const utils = trpc.useUtils();

  const summaryQuery = trpc.personalServices.summary.useQuery({ year, month });
  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();

  function refreshAll() {
    utils.personalServices.summary.invalidate();
    // El pago crea un gasto: refrescamos gastos y dashboard (pastel del mes)
    utils.personalExpenses.expenses.list.invalidate();
    utils.personalExpenses.stats.dashboard.invalidate();
  }

  const createM = trpc.personalServices.create.useMutation({
    onSuccess: () => {
      toast.success("Servicio agregado");
      setName("");
      setAmount("");
      setDueDay("");
      setCategoryId("");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo agregar"),
  });

  const markPaidM = trpc.personalServices.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Pago registrado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo registrar el pago"),
  });

  const archiveM = trpc.personalServices.archive.useMutation({
    onSuccess: () => {
      toast.success("Servicio quitado");
      refreshAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo quitar"),
  });

  const categories = categoriesQuery.data ?? [];
  const catById = new Map(categories.map((c: any) => [c.id, c]));

  const summary = summaryQuery.data;
  const services = summary?.services ?? [];
  const isLoading = summaryQuery.isLoading;

  const totalExpected = summary?.totalExpected ?? 0;
  const paidAmount = summary?.paidAmount ?? 0;
  const pendingAmount = summary?.pendingAmount ?? 0;
  const progressPct =
    totalExpected > 0
      ? Math.min(100, Math.round((paidAmount / totalExpected) * 100))
      : 0;

  const isCurrentMonth =
    year === initial.year && month === initial.month;

  // Separar pendientes y pagados, y ordenar pendientes por urgencia (los que
  // vencen antes, primero). Los sin dia van al final de pendientes.
  const pendientes = services
    .filter((s: any) => !s.paidThisMonth)
    .map((s: any) => ({
      ...s,
      _days: daysUntilDueDay(s.dueDay, year, month),
    }))
    .sort((a: any, b: any) => {
      const ad = a._days == null ? 9999 : a._days;
      const bd = b._days == null ? 9999 : b._days;
      return ad - bd;
    });
  const pagados = services.filter((s: any) => s.paidThisMonth);

  // Mini cerebro: el siguiente en caer (pendiente con dia mas cercano y no
  // vencido, o el vencido mas urgente).
  const proximo = pendientes.length > 0 ? pendientes[0] : null;
  const countPendientes = pendientes.length;

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

  function handleCreate() {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Ponle un nombre al servicio");
      return;
    }
    const amt = amount.trim() ? Number(amount) : undefined;
    if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) {
      toast.error("El monto no es valido");
      return;
    }
    const day = dueDay.trim() ? parseInt(dueDay, 10) : undefined;
    if (day !== undefined && (day < 1 || day > 31)) {
      toast.error("El dia debe ser entre 1 y 31");
      return;
    }
    createM.mutate({
      name: cleanName,
      amount: amt,
      dueDay: day,
      categoryId: categoryId === "" ? undefined : categoryId,
    });
  }

  function handlePay(s: any) {
    if (!s.amount || Number(s.amount) <= 0) {
      toast.error("Primero ponle un monto al servicio (editalo)");
      return;
    }
    markPaidM.mutate({ id: s.id });
  }

  function handleArchive(s: any) {
    if (!window.confirm(`Quitar "${s.name}" de tus servicios?`)) return;
    archiveM.mutate({ id: s.id });
  }

  // Badge de vencimiento (semaforo) para un servicio pendiente
  function dueBadge(days: number | null): { text: string; cls: string; icon: any } | null {
    if (days == null) return null;
    if (days < 0)
      return {
        text: `Vencido ${Math.abs(days)}d`,
        cls: "bg-rose-500/20 text-rose-200 border-rose-500/50",
        icon: AlertTriangle,
      };
    if (days === 0)
      return {
        text: "Vence hoy",
        cls: "bg-rose-500/15 text-rose-200 border-rose-500/40",
        icon: AlertTriangle,
      };
    if (days === 1)
      return {
        text: "Vence manana",
        cls: "bg-amber-500/15 text-amber-200 border-amber-500/40",
        icon: Clock,
      };
    if (days <= 3)
      return {
        text: `En ${days} dias`,
        cls: "bg-amber-500/15 text-amber-200 border-amber-500/40",
        icon: Clock,
      };
    return {
      text: `En ${days} dias`,
      cls: "bg-slate-700/60 text-slate-300 border-slate-600",
      icon: CalendarDays,
    };
  }

  function ServiceRow({ s, paid }: { s: any; paid: boolean }) {
    const cat = s.categoryId ? catById.get(s.categoryId) : null;
    const icon = s.icon || cat?.icon || "📄";
    const amt = Number(s.amount ?? 0);
    const badge = !paid ? dueBadge(s._days ?? null) : null;
    const isUrgent =
      !paid && s._days != null && s._days <= 1; // hoy, vencido o manana

    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 border transition-colors ${
          paid
            ? "bg-slate-900/40 border-slate-800 opacity-70"
            : isUrgent
              ? "bg-slate-900 border-rose-500/40"
              : "bg-slate-900 border-slate-700"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ring-1"
            style={{
              backgroundColor: (s.color ?? cat?.color ?? "#7F77DD") + "22",
              borderColor: (s.color ?? cat?.color ?? "#7F77DD") + "55",
            }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{s.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 flex-wrap">
              <span className="font-semibold tabular-nums text-slate-300">
                {amt > 0 ? fmt(amt) : "sin monto"}
              </span>
              {s.dueDay ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <CalendarDays className="w-3 h-3" />
                    dia {s.dueDay}
                  </span>
                </>
              ) : null}
              {badge && (
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}
                >
                  <badge.icon className="w-2.5 h-2.5" />
                  {badge.text}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {paid ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
              <Check className="w-3.5 h-3.5" />
              Pagado
            </span>
          ) : (
            <button
              onClick={() => handlePay(s)}
              disabled={markPaidM.isPending}
              className="flex items-center gap-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              Pagar
            </button>
          )}
          <button
            onClick={() => handleArchive(s)}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
            title="Quitar servicio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header PREMIUM con orbs blur y mejor contraste */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-900 to-purple-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-violet-500/20 ring-1 ring-violet-400/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-violet-200" />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/30 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-200">
                  Recibos fijos
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                Servicios fijos
              </h2>
              <p className="text-xs text-violet-100/70 mt-0.5">
                Tus recibos del mes y cuales faltan por pagar
              </p>
            </div>
          </div>
          {/* Navegador de mes */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white px-2 capitalize min-w-[120px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Resumen del mes con barra de progreso */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-3.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Esperado
            </p>
            <p className="text-xl font-black text-white tabular-nums mt-1">
              {fmt(totalExpected)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">
              Pagado
            </p>
            <p className="text-xl font-black text-emerald-200 tabular-nums mt-1">
              {fmt(paidAmount)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-3.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
              Falta
            </p>
            <p className="text-xl font-black text-amber-200 tabular-nums mt-1">
              {fmt(pendingAmount)}
            </p>
          </div>
        </div>

        {/* Barra de progreso del mes */}
        {totalExpected > 0 && (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-300">
                Progreso del mes
              </span>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {progressPct}%
              </span>
            </div>
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  background:
                    "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                }}
              />
            </div>
          </div>
        )}

        {/* Mini cerebro: el siguiente en caer */}
        {isCurrentMonth && proximo && (
          <div className="rounded-xl bg-gradient-to-r from-violet-950/40 via-slate-800/60 to-slate-800/60 border border-violet-500/30 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-violet-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-violet-300/80">
                El siguiente en caer
              </p>
              <p className="text-sm text-slate-100 font-semibold truncate">
                {proximo.name}
                {proximo.dueDay ? (
                  <span className="text-slate-400 font-normal">
                    {" "}
                    · dia {proximo.dueDay}
                  </span>
                ) : null}
                {Number(proximo.amount ?? 0) > 0 && (
                  <span className="text-violet-200 font-bold">
                    {" "}
                    · {fmt(Number(proximo.amount))}
                  </span>
                )}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {countPendientes} pendiente{countPendientes === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* Alta de servicio */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-violet-300" />
            Agregar servicio
          </h3>
          <div className="flex flex-col gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej: Luz, Internet, Agua)"
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="flex gap-2 flex-wrap">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto $"
                inputMode="decimal"
                className="bg-slate-900 border-slate-700 text-white w-28"
              />
              <Input
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Dia (1-31)"
                inputMode="numeric"
                className="bg-slate-900 border-slate-700 text-white w-28"
              />
              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 px-2 flex-1 min-w-[140px]"
              >
                <option value="">Categoria (opcional)</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleCreate}
                disabled={createM.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              El monto y el dia son opcionales, pero ayudan a calcular el total
              y avisarte cuando vence.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista: pendientes arriba, pagados abajo */}
      {isLoading ? (
        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-5">
            <div className="h-20 rounded-xl bg-slate-700/40 animate-pulse" />
          </CardContent>
        </Card>
      ) : services.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-8 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-200 font-bold">Sin servicios todavia</p>
            <p className="text-slate-500 text-sm mt-1">
              Agrega arriba tus recibos fijos: luz, agua, internet...
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <Card className="bg-slate-800/40 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-300" />
                  Faltan por pagar
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                    {pendientes.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {pendientes.map((s: any) => (
                    <ServiceRow key={s.id} s={s} paid={false} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagados */}
          {pagados.length > 0 && (
            <Card className="bg-slate-800/40 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-300" />
                  Ya pagados este mes
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    {pagados.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {pagados.map((s: any) => (
                    <ServiceRow key={s.id} s={s} paid={true} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-[10px] text-slate-500 px-1">
            Al registrar un pago se crea un gasto del mes (asi entra al pastel)
            y el servicio queda marcado como pagado.
          </p>
        </div>
      )}
    </div>
  );
}
