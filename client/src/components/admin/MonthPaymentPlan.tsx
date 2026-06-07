// >>> ESTE ARCHIVO VA EN (REEMPLAZA EL EXISTENTE): client/src/components/admin/MonthPaymentPlan.tsx <<<
// ============================================================================
// MONTH PAYMENT PLAN - "Plan de pago del mes"
// ----------------------------------------------------------------------------
// Panel asesor que muestra:
//   - Bola de nieve: deudas ordenadas de menor a mayor saldo + fecha libertad
//   - Resumen numerico: por cubrir, ya pagado, dias restantes, separar diario
//   - Alerta si hay deudas vencidas en el mes
//   - Lista de deudas vencidas (prioridad maxima)
//   - Lista de deudas proximas a vencer en el mes
//   - Lista de ya pagadas este mes
//
// REGLA CLAVE:
//   - Usa endpoints existentes (debts.list + payments.list + stats.monthSummary)
//   - Cero backend nuevo
//   - "Pagar" llama a onPay del parent (reusa modal de pago existente)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Calendar as CalendarIcon,
  Snowflake,
  Flag,
  Zap,
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
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function daysUntil(ymd: string | null): number | null {
  if (typeof ymd !== "string" || ymd.length < 10) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.floor(diff / 86_400_000);
}

function formatDayShort(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS_ES[(m ?? 1) - 1].slice(0, 3)}`;
}

function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}

// Etiqueta de mes/anio sumando N meses a hoy (para la fecha de libertad)
function freedomLabel(monthsAhead: number | null): string {
  if (monthsAhead == null || !Number.isFinite(monthsAhead)) return "—";
  const base = nowMexico();
  const d = new Date(base.getFullYear(), base.getMonth() + monthsAhead, 1);
  const label = MONTHS_ES[d.getMonth()];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${d.getFullYear()}`;
}

// ----------------------------------------------------------------------------
// Mini-componente: stat compacto
// ----------------------------------------------------------------------------

function MiniStat({
  label,
  value,
  emphasis = false,
  color = "slate",
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
  color?: "slate" | "amber" | "rose" | "emerald";
}) {
  const colors = {
    slate: { value: "text-slate-100" },
    amber: { value: "text-amber-300" },
    rose: { value: "text-rose-300" },
    emerald: { value: "text-emerald-300" },
  };
  return (
    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
        {label}
      </p>
      <p
        className={`font-black tabular-nums ${
          emphasis ? "text-base" : "text-sm"
        } ${colors[color].value}`}
      >
        {value}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mini-componente: fila de deuda con boton Pagar
// ----------------------------------------------------------------------------

function PaymentRow({
  debt,
  variant,
  onPay,
  onEdit,
}: {
  debt: any;
  variant: "overdue" | "upcoming" | "paid";
  onPay: (id: number) => void;
  onEdit: (id: number) => void;
}) {
  const days = daysUntil(debt.nextDueDate);
  const amount = Number(debt.installmentAmount ?? 0);

  const styles = {
    overdue: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-300",
      amount: "text-rose-300",
    },
    upcoming: {
      bg: "bg-slate-800/40",
      border: "border-slate-700",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-300",
      amount: "text-slate-100",
    },
    paid: {
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-300",
      amount: "text-emerald-300",
    },
  };
  const s = styles[variant];

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-lg ${s.bg} border ${s.border} hover:border-slate-500 transition-colors`}
    >
      {/* Icono */}
      <div
        className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}
      >
        {variant === "paid" ? (
          <CheckCircle2 className={`w-4 h-4 ${s.iconColor}`} />
        ) : variant === "overdue" ? (
          <AlertTriangle className={`w-4 h-4 ${s.iconColor}`} />
        ) : (
          <Clock className={`w-4 h-4 ${s.iconColor}`} />
        )}
      </div>

      {/* Info */}
      <button
        type="button"
        onClick={() => onEdit(debt.id)}
        className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
        title="Click para editar la deuda"
      >
        <p className="text-sm font-bold text-slate-100 truncate">
          {debt.creditorName} · {debt.title}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {variant === "overdue" && days != null
            ? `Vencida hace ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`
            : variant === "paid"
              ? "Cubierto este mes"
              : debt.nextDueDate
                ? days === 0
                  ? "Vence HOY"
                  : days === 1
                    ? "Vence MANANA"
                    : `Vence ${formatDayShort(debt.nextDueDate)} (en ${days} d)`
                : "Sin fecha"}
        </p>
      </button>

      {/* Monto */}
      <p
        className={`text-sm font-black tabular-nums shrink-0 ${s.amount}`}
      >
        {fmt(amount)}
      </p>

      {/* Boton Pagar (solo si NO esta pagado) */}
      {variant !== "paid" && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onPay(debt.id);
          }}
          size="sm"
          variant="outline"
          className={
            variant === "overdue"
              ? "border-rose-500/50 text-rose-200 hover:bg-rose-500/20 h-7 px-2 text-[11px]"
              : "border-slate-600 text-slate-200 hover:bg-slate-700 h-7 px-2 text-[11px]"
          }
        >
          <Receipt className="w-3 h-3 mr-1" />
          Pagar
        </Button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-panel: Bola de nieve (orden + proxima en caer + fecha libertad + simulador)
// ----------------------------------------------------------------------------

function SnowballPanel({ debts }: { debts: any[] }) {
  const [extra, setExtra] = useState("");

  // Deudas activas con saldo, ordenadas de menor a mayor (orden bola de nieve)
  const ordered = debts
    .map((d) => ({
      id: d.id,
      creditorName: d.creditorName,
      title: d.title,
      bal: toNum(d.currentBalance),
      inst: toNum(d.installmentAmount),
    }))
    .filter((d) => d.bal > 0)
    .sort((a, b) => a.bal - b.bal);

  if (ordered.length === 0) return null;

  const totalBalance = ordered.reduce((s, d) => s + d.bal, 0);
  // Ritmo de pago mensual = suma de las cuotas mensuales
  const monthlyThroughput = ordered.reduce((s, d) => s + d.inst, 0);

  const extraNum = extra.trim() ? Math.max(0, Number(extra) || 0) : 0;

  const baseMonths =
    monthlyThroughput > 0 ? Math.ceil(totalBalance / monthlyThroughput) : null;
  const withExtraMonths =
    monthlyThroughput + extraNum > 0
      ? Math.ceil(totalBalance / (monthlyThroughput + extraNum))
      : null;
  const mesesAhorrados =
    baseMonths != null && withExtraMonths != null
      ? Math.max(0, baseMonths - withExtraMonths)
      : 0;

  // La proxima en caer = la de menor saldo
  const next = ordered[0];
  const nextMonths =
    next.inst > 0 ? Math.ceil(next.bal / next.inst) : null;

  const topList = ordered.slice(0, 5);

  return (
    <Card className="bg-slate-800 border border-sky-500/30">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 ring-1 ring-sky-400/25 flex items-center justify-center">
            <Snowflake className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Bola de nieve</h3>
            <p className="text-[11px] text-slate-400">
              Tumba primero la mas chica; su pago rueda a la siguiente.
            </p>
          </div>
        </div>

        {/* Proxima en caer */}
        <div className="mt-3 p-3 rounded-xl bg-sky-500/[0.07] border border-sky-500/25">
          <div className="flex items-center gap-1.5 mb-1">
            <Flag className="w-3.5 h-3.5 text-sky-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
              La proxima en caer
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate">
            {next.creditorName} · {next.title}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Saldo {fmt(next.bal)}
            {nextMonths != null
              ? ` · la liquidas en ~${nextMonths} mes${nextMonths === 1 ? "" : "es"}`
              : ""}
          </p>
        </div>

        {/* Orden bola de nieve */}
        <div className="mt-3 space-y-1.5">
          {topList.map((d, i) => (
            <div
              key={d.id}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/40 border border-slate-700/50"
            >
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 ${
                  i === 0
                    ? "bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 truncate">
                  {d.creditorName} · {d.title}
                </p>
              </div>
              <span className="text-sm font-black tabular-nums text-slate-200 shrink-0">
                {fmt(d.bal)}
              </span>
            </div>
          ))}
          {ordered.length > topList.length && (
            <p className="text-[10px] text-slate-500 text-center pt-1">
              + {ordered.length - topList.length} deuda
              {ordered.length - topList.length === 1 ? "" : "s"} mas
            </p>
          )}
        </div>

        {/* Fecha de libertad */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Deuda total
            </p>
            <p className="text-sm font-black tabular-nums text-slate-100">
              {fmt(totalBalance)}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/80 mb-0.5">
              Fecha de libertad
            </p>
            <p className="text-sm font-black tabular-nums text-emerald-300">
              {baseMonths != null ? freedomLabel(baseMonths) : "—"}
            </p>
          </div>
        </div>
        {baseMonths == null && (
          <p className="text-[10px] text-slate-500 mt-1.5">
            Agrega la cuota mensual a tus deudas para calcular tu fecha de
            libertad.
          </p>
        )}

        {/* Simulador */}
        {baseMonths != null && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/25">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Simulador: que pasa si le metes extra
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Extra al mes $</span>
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 w-28 text-sm"
              />
            </div>
            {extraNum > 0 && withExtraMonths != null && (
              <p className="text-xs text-amber-100 mt-2 leading-relaxed">
                Sales en{" "}
                <span className="font-black">{freedomLabel(withExtraMonths)}</span>
                {mesesAhorrados > 0 ? (
                  <>
                    {" "}· te ahorras{" "}
                    <span className="font-black">
                      {mesesAhorrados} mes{mesesAhorrados === 1 ? "" : "es"}
                    </span>
                  </>
                ) : null}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface MonthPaymentPlanProps {
  year: number;
  month: number;
  onPay: (debtId: number) => void;
  onEdit: (debtId: number) => void;
}

export default function MonthPaymentPlan({
  year,
  month,
  onPay,
  onEdit,
}: MonthPaymentPlanProps) {
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const paymentsQuery = trpc.personalDebts.payments.list.useQuery({
    year,
    month,
  });
  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });

  const debts = (debtsQuery.data ?? []) as any[];
  const payments = (paymentsQuery.data ?? []) as any[];
  const sum = sumQuery.data;

  const today = nowMexico();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // Filtrar deudas con vencimiento ESTE mes
  const debtsThisMonth = debts.filter((d) => {
    if (typeof d.nextDueDate !== "string" || d.nextDueDate.length < 10) return false;
    const [y, m] = d.nextDueDate.split("-").map(Number);
    return y === year && m === month;
  });

  // Set de debtIds que tienen al menos un pago este mes
  const paidDebtIds = new Set<number>(payments.map((p) => p.debtId));

  // Separar en 3 grupos: vencidas, proximas, ya pagadas
  const overdue: any[] = [];
  const upcoming: any[] = [];
  const paidThisMonth: any[] = [];

  for (const d of debtsThisMonth) {
    if (paidDebtIds.has(d.id)) {
      paidThisMonth.push(d);
      continue;
    }
    const days = daysUntil(d.nextDueDate);
    if (days != null && days < 0) {
      overdue.push(d);
    } else {
      upcoming.push(d);
    }
  }

  // Ordenar por fecha (mas urgente primero)
  overdue.sort((a, b) => {
    const da = daysUntil(a.nextDueDate) ?? 0;
    const db = daysUntil(b.nextDueDate) ?? 0;
    return da - db;
  });
  upcoming.sort((a, b) => {
    const da = daysUntil(a.nextDueDate) ?? 0;
    const db = daysUntil(b.nextDueDate) ?? 0;
    return da - db;
  });

  // Calculos numericos
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = isCurrentMonth
    ? Math.max(1, daysInMonth - today.getDate() + 1)
    : daysInMonth;

  const totalExpected = Number(sum?.expectedThisMonth ?? 0);
  const totalPaid = Number(sum?.paymentsThisMonth ?? 0);
  const remaining = Math.max(0, totalExpected - totalPaid);
  const dailyRequired =
    remaining > 0 && daysRemaining > 0
      ? Math.ceil(remaining / daysRemaining)
      : 0;

  const isLoading = debtsQuery.isLoading || paymentsQuery.isLoading;

  // Empty state: no hay deudas en el mes
  if (!isLoading && debtsThisMonth.length === 0) {
    return (
      <div className="space-y-4">
        <SnowballPanel debts={debts} />
        <Card className="bg-slate-800 border border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Plan de pago · {MONTHS_ES[month - 1]} {year}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sin compromisos de deuda este mes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bola de nieve arriba del plan */}
      <SnowballPanel debts={debts} />

      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-bold text-slate-200">
                Plan de pago · {MONTHS_ES[month - 1]} {year}
              </h3>
            </div>
            {overdue.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/50">
                <AlertTriangle className="w-3 h-3" />
                {overdue.length} vencida{overdue.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Resumen numerico */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <MiniStat
              label="Por cubrir"
              value={fmt(remaining)}
              emphasis
              color={remaining > 0 ? "amber" : "emerald"}
            />
            <MiniStat
              label="Ya pagaste"
              value={fmt(totalPaid)}
              color="emerald"
            />
            <MiniStat
              label="Dias restantes"
              value={daysRemaining}
              color="slate"
            />
            <MiniStat
              label="Separar diario"
              value={fmt(dailyRequired)}
              emphasis
              color={dailyRequired > 0 ? "amber" : "emerald"}
            />
          </div>

          {/* Microcopy contextual */}
          {overdue.length > 0 ? (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 mb-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200">
                <span className="font-bold">Tienes pagos vencidos.</span>{" "}
                Cubre estos primero antes de abonar extra a otras deudas.
              </p>
            </div>
          ) : dailyRequired > 0 && isCurrentMonth ? (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-3 flex items-start gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-100">
                Para llegar al fin de mes sin atrasos, separa{" "}
                <span className="font-bold">{fmt(dailyRequired)}</span> diarios
                durante {daysRemaining} dias.
              </p>
            </div>
          ) : null}

          {/* Lista vencidas */}
          {overdue.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                Vencidas
              </p>
              <div className="space-y-1.5">
                {overdue.map((d) => (
                  <PaymentRow
                    key={d.id}
                    debt={d}
                    variant="overdue"
                    onPay={onPay}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lista proximas */}
          {upcoming.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Proximas a vencer
              </p>
              <div className="space-y-1.5">
                {upcoming.map((d) => (
                  <PaymentRow
                    key={d.id}
                    debt={d}
                    variant="upcoming"
                    onPay={onPay}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lista ya pagadas */}
          {paidThisMonth.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                Ya cubiertas este mes
              </p>
              <div className="space-y-1.5">
                {paidThisMonth.map((d) => (
                  <PaymentRow
                    key={d.id}
                    debt={d}
                    variant="paid"
                    onPay={onPay}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-slate-700/40 animate-pulse"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
