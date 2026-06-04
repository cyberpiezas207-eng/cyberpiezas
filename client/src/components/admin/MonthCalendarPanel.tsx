// ============================================================================
// MONTH CALENDAR PANEL - "Calendario financiero mensual"
// ----------------------------------------------------------------------------
// Vista mensual estilo Google Calendar mostrando:
//   - Deudas pendientes con su fecha de vencimiento
//   - Pagos registrados del mes
//   - Estado visual: pendiente (amber), pagado (emerald), vencido (rose)
//
// Interaccion:
//   - Hover/click en dia con eventos abre la lista abajo
//   - Click en evento abre modal de pago o edicion segun corresponda
//
// REGLAS:
//   - Cero backend nuevo (usa debts.list + payments.list que ya existen)
//   - Solo lectura, NO modifica tablas
//   - Si NO hay eventos en el mes, muestra el calendario igual pero sin marcas
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Receipt,
  Pencil,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS_ES = ["D", "L", "M", "M", "J", "V", "S"];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayYMD(): string {
  const d = nowMexico();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

type EventType = "debt-pending" | "debt-overdue" | "debt-today" | "payment-done";

interface CalendarEvent {
  type: EventType;
  debtId?: number;
  paymentId?: number;
  creditor: string;
  title: string;
  amount: number;
  color: string;
}

interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  events: CalendarEvent[];
}

// ----------------------------------------------------------------------------
// Construir matriz 7x6 del mes (incluyendo dias de mes anterior/siguiente)
// ----------------------------------------------------------------------------

function buildCalendarMatrix(year: number, month: number): CalendarDay[] {
  const today = todayYMD();
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Empezar desde el domingo de la semana del dia 1
  const startWeekday = firstDayOfMonth.getDay(); // 0 = domingo
  const daysFromPrevMonth = startWeekday;

  // Total de celdas: 6 semanas x 7 dias = 42
  const totalCells = 42;
  const result: CalendarDay[] = [];

  // Dias del mes anterior
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();

  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateStr = ymd(prevYear, prevMonth, day);
    result.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isPast: dateStr < today,
      events: [],
    });
  }

  // Dias del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = ymd(year, month, day);
    result.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === today,
      isPast: dateStr < today,
      events: [],
    });
  }

  // Dias del mes siguiente para completar
  const remaining = totalCells - result.length;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  for (let day = 1; day <= remaining; day++) {
    const dateStr = ymd(nextYear, nextMonth, day);
    result.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isPast: dateStr < today,
      events: [],
    });
  }

  return result;
}

// ----------------------------------------------------------------------------
// Mapear deudas y pagos a eventos por dia
// ----------------------------------------------------------------------------

function mapEventsToDays(
  matrix: CalendarDay[],
  debts: any[],
  payments: any[],
): CalendarDay[] {
  const today = todayYMD();
  const eventsByDate = new Map<string, CalendarEvent[]>();

  // Deudas con nextDueDate
  for (const d of debts) {
    if (!d.nextDueDate) continue;
    const dateStr = d.nextDueDate;

    // Determinar tipo segun la fecha vs hoy
    let type: EventType;
    if (dateStr < today) {
      type = "debt-overdue";
    } else if (dateStr === today) {
      type = "debt-today";
    } else {
      type = "debt-pending";
    }

    // Color segun urgencia
    const color =
      type === "debt-overdue"
        ? "#fb7185" // rose
        : type === "debt-today"
          ? "#fb7185"
          : "#fbbf24"; // amber

    if (!eventsByDate.has(dateStr)) eventsByDate.set(dateStr, []);
    eventsByDate.get(dateStr)!.push({
      type,
      debtId: d.id,
      creditor: d.creditorName,
      title: d.title,
      amount: toNum(d.installmentAmount),
      color,
    });
  }

  // Pagos del mes
  for (const p of payments) {
    const dateStr = p.paymentDate;
    if (!eventsByDate.has(dateStr)) eventsByDate.set(dateStr, []);

    // Buscar info de la deuda asociada
    const linkedDebt = debts.find((d) => d.id === p.debtId);
    eventsByDate.get(dateStr)!.push({
      type: "payment-done",
      debtId: p.debtId,
      paymentId: p.id,
      creditor: linkedDebt?.creditorName ?? "Pago",
      title: linkedDebt?.title ?? "Pago registrado",
      amount: toNum(p.amount),
      color: "#34d399", // emerald
    });
  }

  // Aplicar eventos a la matriz
  return matrix.map((day) => ({
    ...day,
    events: eventsByDate.get(day.date) ?? [],
  }));
}

// ----------------------------------------------------------------------------
// Componente: Celda de dia
// ----------------------------------------------------------------------------

function DayCell({
  day,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasEvents = day.events.length > 0;
  const maxDots = 3;
  const dotsToShow = day.events.slice(0, maxDots);
  const extraCount = day.events.length - maxDots;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative aspect-square min-h-[44px] p-1 rounded-lg
        flex flex-col items-center justify-start gap-0.5
        transition-all
        ${
          day.isCurrentMonth
            ? day.isToday
              ? "bg-amber-500/20 border-2 border-amber-400 text-amber-100"
              : isSelected
                ? "bg-slate-700 border border-slate-500 text-slate-100"
                : hasEvents
                  ? "bg-slate-800/70 border border-slate-700 hover:border-slate-500 text-slate-200"
                  : "bg-slate-800/40 border border-slate-800 hover:border-slate-700 text-slate-400"
            : "bg-transparent border border-transparent text-slate-600"
        }
        ${day.isPast && day.isCurrentMonth && !day.isToday ? "opacity-60" : ""}
        ${hasEvents && day.isCurrentMonth ? "cursor-pointer" : "cursor-default"}
      `}
      disabled={!hasEvents}
      title={
        hasEvents
          ? `${day.events.length} evento${day.events.length === 1 ? "" : "s"}`
          : undefined
      }
    >
      {/* Numero del dia */}
      <span
        className={`text-[11px] font-bold tabular-nums ${day.isToday ? "text-amber-100" : ""}`}
      >
        {day.dayNumber}
      </span>

      {/* Puntos de eventos */}
      {hasEvents && (
        <div className="flex items-center gap-0.5 mt-auto">
          {dotsToShow.map((e, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: e.color }}
            />
          ))}
          {extraCount > 0 && (
            <span className="text-[8px] font-bold text-slate-400">
              +{extraCount}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Componente: Lista de eventos del dia seleccionado
// ----------------------------------------------------------------------------

function DayEventsList({
  day,
  onPay,
  onEdit,
}: {
  day: CalendarDay;
  onPay: (debtId: number) => void;
  onEdit: (debtId: number) => void;
}) {
  if (!day || day.events.length === 0) return null;
  if (typeof day.date !== "string" || day.date.length < 10) return null;

  const [y, m, d] = day.date.split("-").map(Number);
  const dateLabel = `${d} ${MONTHS_ES[m - 1]} ${y}`;

  const typeConfig: Record<
    EventType,
    {
      Icon: any;
      iconColor: string;
      bg: string;
      border: string;
      label: string;
    }
  > = {
    "debt-overdue": {
      Icon: AlertTriangle,
      iconColor: "text-rose-300",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      label: "Vencida",
    },
    "debt-today": {
      Icon: Clock,
      iconColor: "text-rose-300",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      label: "Vence hoy",
    },
    "debt-pending": {
      Icon: Clock,
      iconColor: "text-amber-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Pendiente",
    },
    "payment-done": {
      Icon: CheckCircle2,
      iconColor: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Pagado",
    },
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        {day.isToday ? `Hoy · ${dateLabel}` : dateLabel}
      </p>

      <div className="space-y-1.5">
        {day.events.map((event, i) => {
          const cfg = typeConfig[event.type];
          const Icon = cfg.Icon;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 rounded-lg ${cfg.bg} border ${cfg.border}`}
            >
              <div className="w-7 h-7 rounded-md bg-slate-800/60 flex items-center justify-center shrink-0">
                <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.iconColor}`}>
                    {cfg.label}
                  </span>
                  <p className="text-sm font-bold text-slate-100 truncate">
                    {event.creditor} · {event.title}
                  </p>
                </div>
                <p className="text-xs font-black tabular-nums text-slate-100 mt-0.5">
                  {fmt(event.amount)}
                </p>
              </div>

              {/* Acciones segun el tipo */}
              {event.debtId && event.type !== "payment-done" && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => onPay(event.debtId!)}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    <Receipt className="w-3 h-3 mr-1" />
                    Pagar
                  </Button>
                  <Button
                    onClick={() => onEdit(event.debtId!)}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {event.type === "payment-done" && event.debtId && (
                <Button
                  onClick={() => onEdit(event.debtId!)}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function MonthCalendarPanel({
  year,
  month,
  onPay,
  onEdit,
}: {
  year: number;
  month: number;
  onPay: (debtId: number) => void;
  onEdit: (debtId: number) => void;
}) {
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const paymentsQuery = trpc.personalDebts.payments.list.useQuery({
    year,
    month,
  });

  const debts = (debtsQuery.data ?? []) as any[];
  const payments = (paymentsQuery.data ?? []) as any[];
  const isLoading = debtsQuery.isLoading || paymentsQuery.isLoading;

  // Estado: dia seleccionado (por default: hoy si es mes actual, o el primero con eventos)
  const today = todayYMD();
  const isCurrentMonth =
    year === nowMexico().getFullYear() && month === nowMexico().getMonth() + 1;
  const [selectedDate, setSelectedDate] = useState<string | null>(
    isCurrentMonth ? today : null,
  );

  // Construir matriz con eventos
  const calendarDays = useMemo(() => {
    const matrix = buildCalendarMatrix(year, month);
    return mapEventsToDays(matrix, debts, payments);
  }, [year, month, debts, payments]);

  // Contar eventos del mes
  const totalEvents = calendarDays
    .filter((d) => d.isCurrentMonth)
    .reduce((acc, d) => acc + d.events.length, 0);

  // Encontrar el dia seleccionado
  const selectedDay = calendarDays.find((d) => d.date === selectedDate) ?? null;

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-4">
          <div className="h-64 rounded-lg bg-slate-700/30 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-300" />
            <h3 className="text-sm font-bold text-slate-200">
              Calendario · {MONTHS_ES[month - 1]} {year}
            </h3>
          </div>
          {totalEvents > 0 && (
            <span className="text-[10px] text-slate-400">
              {totalEvents} evento{totalEvents === 1 ? "" : "s"} este mes
            </span>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-400 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pendiente
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Pagado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Vencido / hoy
          </span>
        </div>

        {/* Encabezado dias de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS_ES.map((wd, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-bold uppercase text-slate-500 py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Grid del calendario 7x6 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              isSelected={day.date === selectedDate}
              onSelect={() => setSelectedDate(day.date)}
            />
          ))}
        </div>

        {/* Lista de eventos del dia seleccionado */}
        {selectedDay && (
          <DayEventsList day={selectedDay} onPay={onPay} onEdit={onEdit} />
        )}

        {/* Empty state si no hay eventos en TODO el mes */}
        {totalEvents === 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 text-center">
            <p className="text-xs text-slate-400">
              Sin compromisos en {MONTHS_ES[month - 1]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
