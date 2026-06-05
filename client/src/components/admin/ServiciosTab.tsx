// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/ServiciosTab.tsx <<<
// ============================================================================
// VISTA "Servicios" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Lista de servicios fijos (recibos que se repiten cada mes): luz, agua,
// internet, etc. Muestra el total esperado del mes, lo pagado y lo que
// falta. Boton "registrar pago" crea un gasto normal (entra al pastel) y
// marca el servicio como pagado este mes.
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
function nowMexicoYM(): { year: number; month: number } {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
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

  return (
    <div className="space-y-5">
      {/* Cabecera con navegacion de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-300" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-tight">
              Servicios fijos
            </h2>
            <p className="text-xs text-slate-400">
              Tus recibos del mes y cuales faltan
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

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
          <p className="text-[11px] text-slate-400">Esperado</p>
          <p className="text-lg font-bold text-slate-100 tabular-nums">
            {fmt(summary?.totalExpected ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
          <p className="text-[11px] text-emerald-300/80">Pagado</p>
          <p className="text-lg font-bold text-emerald-200 tabular-nums">
            {fmt(summary?.paidAmount ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
          <p className="text-[11px] text-amber-300/80">Falta</p>
          <p className="text-lg font-bold text-amber-200 tabular-nums">
            {fmt(summary?.pendingAmount ?? 0)}
          </p>
        </div>
      </div>

      {/* Alta de servicio */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-violet-300" />
            Agregar servicio
          </h3>
          <div className="flex flex-col gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej: Luz, Internet, Agua)"
              className="bg-slate-900 border-slate-700"
            />
            <div className="flex gap-2 flex-wrap">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto $"
                inputMode="decimal"
                className="bg-slate-900 border-slate-700 w-28"
              />
              <Input
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Dia (1-31)"
                inputMode="numeric"
                className="bg-slate-900 border-slate-700 w-28"
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
              y recordarte cuando vence.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de servicios */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <CircleDollarSign className="w-4 h-4 text-violet-300" />
            Mis servicios
          </h3>

          {isLoading ? (
            <div className="h-20 rounded-xl bg-slate-700/40 animate-pulse" />
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Sin servicios todavia</p>
              <p className="text-slate-500 text-sm mt-1">
                Agrega arriba tus recibos fijos: luz, agua, internet...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((s: any) => {
                const cat = s.categoryId ? catById.get(s.categoryId) : null;
                const icon = s.icon || cat?.icon || "📄";
                const amt = Number(s.amount ?? 0);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{
                          backgroundColor: (s.color ?? cat?.color ?? "#7F77DD") + "22",
                        }}
                      >
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          {amt > 0 ? fmt(amt) : "sin monto"}
                          {s.dueDay ? (
                            <>
                              <span className="text-slate-600">·</span>
                              <CalendarDays className="w-3 h-3" />
                              dia {s.dueDay}
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.paidThisMonth ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                          <Check className="w-3.5 h-3.5" />
                          Pagado
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePay(s)}
                          disabled={markPaidM.isPending}
                          className="flex items-center gap-1 text-[11px] font-bold text-violet-100 bg-violet-600 hover:bg-violet-700 rounded-lg px-2.5 py-1.5"
                        >
                          <CircleDollarSign className="w-3.5 h-3.5" />
                          Registrar pago
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(s)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center"
                        title="Quitar servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && services.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-3">
              Al registrar un pago se crea un gasto del mes (asi entra al pastel)
              y el servicio queda marcado como pagado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
