// ============================================================================
// TODAY ACTION CARD - "Hoy que hago"
// ----------------------------------------------------------------------------
// Asesor que aterriza todos los KPIs/stats en UNA SOLA accion concreta.
//
// 6 escenarios posibles, evaluados en orden de prioridad:
//
//   1. OVERDUE      - Hay deudas vencidas. Color rose. Maxima urgencia.
//   2. TODAY        - Pago vence HOY. Color rose.
//   3. TOMORROW     - Pago vence MANANA. Color amber.
//   4. SOON         - Pago en 2-7 dias. Color amber. Sugiere ahorro diario.
//   5. ALL_PAID     - Mes cubierto, hay deudas pero pagadas. Color emerald.
//   6. NO_DEBTS     - Sin deudas activas. Color emerald.
//
// IMPORTANTE:
//   - Reusa endpoints existentes (debts.list, payments.list, monthSummary)
//   - Boton principal abre RecordPaymentModal a traves de onPay del parent
//   - Boton secundario abre EditDebtModal a traves de onEdit del parent
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  PiggyBank,
  CheckCircle2,
  Sparkles,
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

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function daysUntil(ymd: string | null): number | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.floor(diff / 86_400_000);
}

function isInMonth(
  ymd: string | null | undefined,
  year: number,
  month: number,
): boolean {
  if (!ymd) return false;
  const [y, m] = ymd.split("-").map(Number);
  return y === year && m === month;
}

// ----------------------------------------------------------------------------
// Tipos de escenario
// ----------------------------------------------------------------------------

type Scenario =
  | "overdue"
  | "today"
  | "tomorrow"
  | "soon"
  | "all_paid"
  | "no_debts"
  | "no_month_compromise";

interface ScenarioConfig {
  bg: string;
  border: string;
  iconBg: string;
  iconRing: string;
  iconColor: string;
  titleColor: string;
  microcopyColor: string;
  buttonClass: string;
  Icon: any;
  badge: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  overdue: {
    bg: "bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-900/80",
    border: "border-rose-500/50",
    iconBg: "bg-rose-500/25",
    iconRing: "ring-rose-400/60",
    iconColor: "text-rose-200",
    titleColor: "text-rose-100",
    microcopyColor: "text-rose-200/80",
    buttonClass: "bg-rose-500 hover:bg-rose-600 text-white",
    Icon: AlertTriangle,
    badge: "URGENTE",
  },
  today: {
    bg: "bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900/80",
    border: "border-rose-500/40",
    iconBg: "bg-rose-500/20",
    iconRing: "ring-rose-400/50",
    iconColor: "text-rose-200",
    titleColor: "text-rose-100",
    microcopyColor: "text-rose-200/80",
    buttonClass: "bg-rose-500 hover:bg-rose-600 text-white",
    Icon: Clock,
    badge: "HOY",
  },
  tomorrow: {
    bg: "bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900/80",
    border: "border-amber-500/40",
    iconBg: "bg-amber-500/20",
    iconRing: "ring-amber-400/50",
    iconColor: "text-amber-200",
    titleColor: "text-amber-100",
    microcopyColor: "text-amber-200/80",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold",
    Icon: Clock,
    badge: "MANANA",
  },
  soon: {
    bg: "bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/80",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/15",
    iconRing: "ring-amber-400/40",
    iconColor: "text-amber-200",
    titleColor: "text-slate-100",
    microcopyColor: "text-amber-200/80",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold",
    Icon: CalendarIcon,
    badge: "ESTA SEMANA",
  },
  all_paid: {
    bg: "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900/80",
    border: "border-emerald-500/40",
    iconBg: "bg-emerald-500/20",
    iconRing: "ring-emerald-400/50",
    iconColor: "text-emerald-200",
    titleColor: "text-emerald-100",
    microcopyColor: "text-emerald-200/80",
    buttonClass: "bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold",
    Icon: CheckCircle2,
    badge: "AL DIA",
  },
  no_debts: {
    bg: "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900/80",
    border: "border-emerald-500/40",
    iconBg: "bg-emerald-500/20",
    iconRing: "ring-emerald-400/50",
    iconColor: "text-emerald-200",
    titleColor: "text-emerald-100",
    microcopyColor: "text-emerald-200/80",
    buttonClass: "bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold",
    Icon: Sparkles,
    badge: "LIBRE",
  },
  no_month_compromise: {
    bg: "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900",
    border: "border-slate-700",
    iconBg: "bg-slate-700",
    iconRing: "ring-slate-600",
    iconColor: "text-slate-300",
    titleColor: "text-slate-100",
    microcopyColor: "text-slate-400",
    buttonClass: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    Icon: PiggyBank,
    badge: "MES TRANQUILO",
  },
};

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export interface TodayActionCardProps {
  year: number;
  month: number;
  onPay: (debtId: number) => void;
  onEdit: (debtId: number) => void;
}

export default function TodayActionCard({
  year,
  month,
  onPay,
  onEdit,
}: TodayActionCardProps) {
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
  const isLoading = debtsQuery.isLoading || paymentsQuery.isLoading;

  // ------------------------------------------------------
  // Loading skeleton
  // ------------------------------------------------------
  if (isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="h-16 rounded-lg bg-slate-700/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------
  // Computar escenario
  // ------------------------------------------------------
  const today = nowMexico();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // Deudas del mes filtradas
  const monthDebts = debts.filter((d) => isInMonth(d.nextDueDate, year, month));

  // Pagos ya hechos este mes
  const paidIds = new Set<number>(payments.map((p) => p.debtId));

  // Pendientes este mes
  const pending = monthDebts.filter((d) => !paidIds.has(d.id));

  // Clasificar pendientes por urgencia
  const overdue: any[] = [];
  const dueToday: any[] = [];
  const dueTomorrow: any[] = [];
  const dueSoon: any[] = []; // 2-7 dias

  for (const d of pending) {
    const days = daysUntil(d.nextDueDate);
    if (days == null) continue;
    if (days < 0) overdue.push(d);
    else if (days === 0) dueToday.push(d);
    else if (days === 1) dueTomorrow.push(d);
    else if (days >= 2 && days <= 7) dueSoon.push(d);
  }

  // Ordenar (mas urgente primero)
  const sortByDays = (a: any, b: any) =>
    (daysUntil(a.nextDueDate) ?? 0) - (daysUntil(b.nextDueDate) ?? 0);
  overdue.sort(sortByDays);
  dueToday.sort(sortByDays);
  dueTomorrow.sort(sortByDays);
  dueSoon.sort(sortByDays);

  // Determinar escenario
  let scenario: Scenario;
  let focusedDebt: any = null;

  if (overdue.length > 0) {
    scenario = "overdue";
    focusedDebt = overdue[0];
  } else if (dueToday.length > 0) {
    scenario = "today";
    focusedDebt = dueToday[0];
  } else if (dueTomorrow.length > 0) {
    scenario = "tomorrow";
    focusedDebt = dueTomorrow[0];
  } else if (dueSoon.length > 0) {
    scenario = "soon";
    focusedDebt = dueSoon[0];
  } else if (monthDebts.length > 0 && pending.length === 0) {
    scenario = "all_paid";
  } else if (debts.length === 0) {
    scenario = "no_debts";
  } else {
    // Hay deudas activas pero ninguna vence este mes
    scenario = "no_month_compromise";
  }

  // ------------------------------------------------------
  // Si no es mes actual y no es escenario relevante, ocultar
  // ------------------------------------------------------
  if (!isCurrentMonth && scenario === "no_month_compromise") {
    return null;
  }

  // ------------------------------------------------------
  // Calculos para microcopy
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // Construir titulo y microcopy segun escenario
  // ------------------------------------------------------
  const config = SCENARIOS[scenario];
  let title = "";
  let microcopy = "";
  let primaryAction: { label: string; onClick: () => void } | null = null;
  let secondaryAction: { label: string; onClick: () => void } | null = null;

  if (scenario === "overdue" && focusedDebt) {
    const days = Math.abs(daysUntil(focusedDebt.nextDueDate) ?? 0);
    const amount = Number(focusedDebt.installmentAmount ?? 0);
    title = `${focusedDebt.creditorName} · ${focusedDebt.title}`;
    microcopy = `Esta deuda venció hace ${days} día${days === 1 ? "" : "s"}. Pagar ${fmt(amount)} antes de abonar a otras deudas.${overdue.length > 1 ? ` (${overdue.length - 1} más vencidas)` : ""}`;
    primaryAction = {
      label: "Registrar pago ahora",
      onClick: () => onPay(focusedDebt.id),
    };
    secondaryAction = {
      label: "Editar deuda",
      onClick: () => onEdit(focusedDebt.id),
    };
  } else if (scenario === "today" && focusedDebt) {
    const amount = Number(focusedDebt.installmentAmount ?? 0);
    title = `Hoy paga ${focusedDebt.creditorName}`;
    microcopy = `${focusedDebt.title} vence HOY. Apartar ${fmt(amount)} para no atrasarte.${dueToday.length > 1 ? ` (${dueToday.length - 1} más vencen hoy)` : ""}`;
    primaryAction = {
      label: "Registrar pago",
      onClick: () => onPay(focusedDebt.id),
    };
    secondaryAction = {
      label: "Ver detalle",
      onClick: () => onEdit(focusedDebt.id),
    };
  } else if (scenario === "tomorrow" && focusedDebt) {
    const amount = Number(focusedDebt.installmentAmount ?? 0);
    title = `Mañana vence ${focusedDebt.creditorName}`;
    microcopy = `${focusedDebt.title} vence mañana. Aparta ${fmt(amount)} hoy para que no se te pase.`;
    primaryAction = {
      label: "Registrar pago",
      onClick: () => onPay(focusedDebt.id),
    };
    secondaryAction = {
      label: "Ver detalle",
      onClick: () => onEdit(focusedDebt.id),
    };
  } else if (scenario === "soon" && focusedDebt) {
    const days = daysUntil(focusedDebt.nextDueDate) ?? 0;
    const amount = Number(focusedDebt.installmentAmount ?? 0);
    title = `Próximo: ${focusedDebt.creditorName} en ${days} días`;
    if (dailyRequired > 0) {
      microcopy = `Para cubrir ${fmt(amount)} de ${focusedDebt.title} a tiempo, separa ${fmt(dailyRequired)} diarios durante ${daysRemaining} días.`;
    } else {
      microcopy = `${focusedDebt.title} vence en ${days} días. Apartar ${fmt(amount)}.`;
    }
    primaryAction = {
      label: "Registrar pago",
      onClick: () => onPay(focusedDebt.id),
    };
    secondaryAction = {
      label: "Ver detalle",
      onClick: () => onEdit(focusedDebt.id),
    };
  } else if (scenario === "all_paid") {
    title = "Todo al día este mes";
    microcopy = `Ya cubriste ${fmt(totalPaid)} en pagos. Puedes respirar el resto del mes.`;
  } else if (scenario === "no_debts") {
    title = "Sin deudas activas";
    microcopy = "Estás libre. Si te llega una compra a meses, captúrala abajo.";
  } else if (scenario === "no_month_compromise") {
    title = "Sin compromisos este mes";
    microcopy = `Tienes ${debts.length} deuda${debts.length === 1 ? "" : "s"} activa${debts.length === 1 ? "" : "s"} pero ninguna vence este mes.`;
  }

  // ------------------------------------------------------
  // Render
  // ------------------------------------------------------
  const Icon = config.Icon;

  return (
    <Card
      className={`relative overflow-hidden ${config.bg} border ${config.border} shadow-lg`}
    >
      {/* Glow decorativo */}
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 ${config.iconBg} rounded-full blur-3xl opacity-50`}
      />

      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Icono grande */}
          <div
            className={`w-14 h-14 rounded-2xl ${config.iconBg} ring-2 ${config.iconRing} flex items-center justify-center shrink-0 shadow-lg`}
          >
            <Icon
              className={`w-7 h-7 ${config.iconColor}`}
              strokeWidth={2.5}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Badge + título */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${config.iconBg} ${config.iconColor} ring-1 ${config.iconRing}`}
              >
                {config.badge}
              </span>
              {dailyRequired > 0 &&
                (scenario === "soon" || scenario === "tomorrow") && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    <PiggyBank className="w-3 h-3" />
                    {fmt(dailyRequired)}/dia
                  </span>
                )}
            </div>

            <h2
              className={`text-lg md:text-xl font-black ${config.titleColor} leading-tight mb-1`}
            >
              {title}
            </h2>

            <p
              className={`text-sm ${config.microcopyColor} leading-snug mb-3`}
            >
              {microcopy}
            </p>

            {/* Botones */}
            {(primaryAction || secondaryAction) && (
              <div className="flex items-center gap-2 flex-wrap">
                {primaryAction && (
                  <Button
                    onClick={primaryAction.onClick}
                    size="sm"
                    className={`${config.buttonClass} h-9 px-3 text-xs font-bold`}
                  >
                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                    {primaryAction.label}
                  </Button>
                )}
                {secondaryAction && (
                  <Button
                    onClick={secondaryAction.onClick}
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs border-slate-600 text-slate-200 hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    {secondaryAction.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
