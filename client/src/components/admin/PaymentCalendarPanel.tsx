// ============================================================================
// CALENDARIO DE PAGOS VISUAL
// ----------------------------------------------------------------------------
// Grid mensual estilo Google Calendar con dots coloreados por urgencia.
// Click en un dia → muestra lista de pagos que vencen ese dia.
// Header con total del mes y count de pagos.
// Se auto-oculta si no hay deudas activas (similar a DebtsFlowSection).
//
// Colores por urgencia:
//   - Rojo: vencido (dia ya paso este mes)
//   - Amber: hoy o proximos 3 dias
//   - Indigo: dentro del mes pero a futuro
//
// Solo usa personalDebts.debts.list (sin queries nuevas).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------------------

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

interface DebtLite {
  id: number;
  creditorName: string;
  title: string;
  currentBalance: number | string;
  installmentAmount: number | string | null;
  nextDueDate: string | null;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Offset en columnas de lunes (0=lunes, 6=domingo)
function mondayOffset(year: number, month: number): number {
  const first = new Date(year, month - 1, 1);
  return (first.getDay() + 6) % 7;
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function PaymentCalendarPanel() {
  const today = nowMexico();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(
    today.getDate(),
  );

  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const debts = (debtsQuery.data ?? []) as DebtLite[];

  // Agrupar pagos por dia del mes seleccionado
  const byDay = useMemo(() => {
    const map = new Map<number, DebtLite[]>();
    for (const d of debts) {
      if (typeof d.nextDueDate !== "string" || d.nextDueDate.length < 10) continue;
      const parts = d.nextDueDate.split("-").map(Number);
      if (parts.length !== 3) continue;
      const [y, m, day] = parts;
      if (y === year && m === month) {
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(d);
      }
    }
    return map;
  }, [debts, year, month]);

  // Total del mes
  const monthTotal = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const arr of byDay.values()) {
      for (const d of arr) {
        const amount = Number(d.installmentAmount ?? d.currentBalance ?? 0);
        sum += amount;
        count += 1;
      }
    }
    return { sum, count };
  }, [byDay]);

  // Navegacion
  function prevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  }

  // Build calendar cells (con padding antes/despues)
  const totalDays = daysInMonth(year, month);
  const offset = mondayOffset(year, month);
  const totalCells = Math.ceil((offset + totalDays) / 7) * 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    cells.push(i < offset || dayNum > totalDays ? null : dayNum);
  }

  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  const selectedDebts = selectedDay != null ? byDay.get(selectedDay) ?? [] : [];

  // Hide totalmente si no hay deudas activas
  if (!debtsQuery.isLoading && debts.length === 0) return null;

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300/70">
                Calendario de pagos
              </p>
              <h3 className="text-lg font-black text-white tracking-tight">
                {MONTHS_ES[month - 1]} {year}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {monthTotal.count > 0
                  ? `${monthTotal.count} pago${monthTotal.count === 1 ? "" : "s"} · ${fmt(monthTotal.sum)} en total`
                  : "sin pagos este mes"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid del calendario */}
        <div className="rounded-xl bg-slate-900/40 border border-slate-700/40 p-3">
          {/* Header de dias de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day == null) {
                return <div key={i} className="aspect-square" />;
              }
              const payments = byDay.get(day) ?? [];
              const hasPayments = payments.length > 0;
              const isToday = day === todayDay;
              const isSelected = day === selectedDay;
              const isPast =
                isCurrentMonth && todayDay != null && day < todayDay;
              const isSoon =
                isCurrentMonth &&
                todayDay != null &&
                day - todayDay <= 3 &&
                day - todayDay > 0;

              // Color del dot/badge
              let dotColor = "bg-indigo-400";
              if (hasPayments) {
                if (isPast) dotColor = "bg-red-500";
                else if (isToday) dotColor = "bg-amber-500";
                else if (isSoon) dotColor = "bg-amber-400";
              }

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isSelected
                      ? "bg-indigo-500/25 ring-1 ring-indigo-400/60 text-white"
                      : isToday
                        ? "bg-slate-700/60 text-white ring-1 ring-indigo-400/50"
                        : hasPayments
                          ? "bg-slate-700/30 hover:bg-slate-700/60 text-slate-200"
                          : isPast
                            ? "text-slate-600 hover:bg-slate-800/40"
                            : "text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xs font-bold tabular-nums leading-none">
                    {day}
                  </span>
                  {hasPayments && (
                    <>
                      {payments.length === 1 ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                        />
                      ) : (
                        <span
                          className={`text-[9px] font-black leading-none px-1.5 py-0.5 rounded-full ${dotColor} text-white`}
                        >
                          {payments.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del dia seleccionado */}
        {selectedDay != null && selectedDebts.length > 0 && (
          <div className="mt-4 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Dia {selectedDay} de {MONTHS_ES[month - 1]}
              </span>
              <span className="text-[10px] text-slate-500">
                · {selectedDebts.length} pago
                {selectedDebts.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-1.5">
              {selectedDebts.map((d) => {
                const amount = Number(
                  d.installmentAmount ?? d.currentBalance ?? 0,
                );
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {d.creditorName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {d.title}
                      </p>
                    </div>
                    <span className="text-sm font-black text-rose-300 tabular-nums shrink-0">
                      {fmt(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state si no hay pagos en el mes seleccionado */}
        {monthTotal.count === 0 && !debtsQuery.isLoading && (
          <div className="mt-4 text-center py-5 text-slate-500 text-sm border border-dashed border-slate-700/40 rounded-xl">
            <Check className="w-5 h-5 mx-auto mb-1.5 text-emerald-400/60" />
            <p>Sin pagos en {MONTHS_ES[month - 1]}.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
