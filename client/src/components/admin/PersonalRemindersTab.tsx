// ============================================================================
// FRONTEND - Modulo Recordatorios
// ----------------------------------------------------------------------------
// Componente principal con:
//   - Hero compacto indigo palacio fino
//   - 4 stats cards: hoy / proximos / atrasados / urgentes
//   - Captura natural con preview del cerebro
//   - Filter tabs: Hoy | Proximos | Atrasados | Todos | Completados
//   - Lista de recordatorios con acciones inline:
//     - Hecho (markDone, maneja recurrencia automatica)
//     - Posponer (popover con presets: mañana / 3 dias / 1 semana / 1 mes)
//     - Eliminar (softDelete con confirmacion)
//
// Endpoints usados (todos del Commit 13):
//   - personalReminders.reminders.list/quickCreate/previewCapture/markDone
//   - personalReminders.reminders.snoozeQuick/dismiss/softDelete
//   - personalReminders.stats.dashboard
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
  Bell,
  Plus,
  Check,
  Clock,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Repeat,
  Tag,
  X,
  Trash2,
  MoreVertical,
  Sparkles,
  CalendarClock,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayYMD(): string {
  const d = nowMexico();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntil(ymd: string | null | undefined): number | null {
  if (!ymd) return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(ymd: string | null | undefined, time: string | null | undefined): string {
  if (!ymd) return time ? `a las ${time.slice(0, 5)}` : "sin fecha";
  const days = daysUntil(ymd);
  if (days == null) return ymd;
  const timeLabel = time ? ` · ${time.slice(0, 5)}` : "";
  if (days === 0) return `hoy${timeLabel}`;
  if (days === 1) return `mañana${timeLabel}`;
  if (days === -1) return `ayer${timeLabel}`;
  if (days < 0) return `hace ${Math.abs(days)} dias`;
  if (days <= 7) return `en ${days} dias${timeLabel}`;
  return `${ymd}${timeLabel}`;
}

// Bug1-Deudas: formato de dinero MXN sin decimales para los items de deuda
function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

// Bug1-Deudas: estilo del badge segun la clasificacion (badgeKind viene del backend)
const DEBT_BADGE_STYLE: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  overdue: { bg: "bg-rose-500/15", border: "border-rose-500/50", text: "text-rose-300" },
  due_soon: { bg: "bg-amber-500/15", border: "border-amber-500/50", text: "text-amber-300" },
  due_later: { bg: "bg-sky-500/15", border: "border-sky-500/50", text: "text-sky-300" },
  no_date: { bg: "bg-violet-500/15", border: "border-violet-500/50", text: "text-violet-300" },
};

// Bug1-Deudas: texto del badge. Para deudas con fecha usa daysUntil; sin fecha es fijo.
function debtBadgeLabel(
  badgeKind: string,
  dueDate: string | null | undefined,
): string {
  if (badgeKind === "no_date") return "Deuda sin fecha";
  const days = daysUntil(dueDate);
  if (days == null) return "Deuda";
  if (days < 0) return `Atrasada ${Math.abs(days)} dias`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `En ${days} dias`;
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Importante",
  normal: "",
  low: "Sin prisa",
};

const PRIORITY_THEME: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  urgent: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/40",
    text: "text-rose-300",
  },
  high: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-300",
  },
  normal: {
    bg: "bg-slate-700/30",
    border: "border-slate-700",
    text: "text-slate-400",
  },
  low: {
    bg: "bg-slate-700/20",
    border: "border-slate-700",
    text: "text-slate-500",
  },
};

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

type Filter = "today" | "upcoming" | "overdue" | "pending" | "done";

// ----------------------------------------------------------------------------
// Stats cards
// ----------------------------------------------------------------------------

function StatsCards() {
  const statsQuery = trpc.personalReminders.stats.dashboard.useQuery();
  const s = statsQuery.data;

  const cards = [
    {
      label: "Hoy",
      value: s?.todayCount ?? 0,
      icon: Clock,
      color: "text-amber-300",
      bg: "bg-amber-500/12",
      ring: "ring-amber-400/30",
    },
    {
      label: "Proximos 7 dias",
      value: s?.upcomingCount ?? 0,
      icon: Calendar,
      color: "text-indigo-300",
      bg: "bg-indigo-500/12",
      ring: "ring-indigo-400/30",
    },
    {
      label: "Atrasados",
      value: s?.overdueCount ?? 0,
      icon: AlertCircle,
      color: "text-rose-300",
      bg: "bg-rose-500/12",
      ring: "ring-rose-400/30",
    },
    {
      label: "Urgentes",
      value: s?.urgentCount ?? 0,
      icon: AlertTriangle,
      color: "text-orange-300",
      bg: "bg-orange-500/12",
      ring: "ring-orange-400/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-800/40 border border-slate-700/60 p-4"
        >
          <div className="absolute -top-8 -right-8 w-20 h-20 bg-slate-700/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-2">
            <span
              className={`w-8 h-8 rounded-lg ${card.bg} ring-1 ${card.ring} flex items-center justify-center`}
            >
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </span>
          </div>
          <p className="relative text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {card.label}
          </p>
          <p className="relative text-2xl font-black text-white tracking-tight tabular-nums">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Quick capture
// ----------------------------------------------------------------------------

function QuickReminderCapture({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 200);
    return () => clearTimeout(t);
  }, [text]);

  const preview = trpc.personalReminders.reminders.previewCapture.useQuery(
    { text: debounced },
    { enabled: debounced.length > 0 },
  );

  const utils = trpc.useUtils();
  const quickCreate = trpc.personalReminders.reminders.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Recordatorio creado");
      setText("");
      setDebounced("");
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      onCreated();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const d = preview.data;
  const canCreate = d?.title != null && (d.confidence ?? 0) >= 0.5;

  function handleCreate() {
    if (!text.trim() || !canCreate) return;
    quickCreate.mutate({ text: text.trim() });
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Captura natural
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ej: recordar pagar luz dia 12 urgente"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <Button
            onClick={handleCreate}
            disabled={quickCreate.isPending || !canCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            {quickCreate.isPending ? "..." : "Crear"}
          </Button>
        </div>

        {/* Preview en vivo */}
        {debounced.length > 0 && d && (
          <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Detectado{" "}
              <span className="text-slate-600">
                ({Math.round((d.confidence ?? 0) * 100)}%)
              </span>
            </p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {d.title ? (
                <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-200">
                  {d.title}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">
                  sin titulo
                </span>
              )}
              {d.dueDate && (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                  📅 {d.dueDate}
                </span>
              )}
              {d.dueDay != null && !d.dueDate && (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                  📅 dia {d.dueDay}
                </span>
              )}
              {d.dueTime && (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                  🕐 {d.dueTime}
                </span>
              )}
              {d.isRecurring && d.recurrencePattern && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  <Repeat className="w-3 h-3 inline mr-0.5" />
                  {RECURRENCE_LABEL[d.recurrencePattern] || d.recurrencePattern}
                </span>
              )}
              {d.priority !== "normal" && PRIORITY_LABEL[d.priority] && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${PRIORITY_THEME[d.priority].bg} ${PRIORITY_THEME[d.priority].text}`}
                >
                  {PRIORITY_LABEL[d.priority]}
                </span>
              )}
              {d.tags?.length > 0 &&
                d.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 text-cyan-300"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        )}

        {debounced.length > 0 && d && !canCreate && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200 leading-snug">
              Falta titulo claro. Intenta: 'recordar [que hacer] [cuando]'
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Reminder card
// ----------------------------------------------------------------------------

interface ReminderCardProps {
  reminder: any;
  onActionDone: () => void;
}

function ReminderCard({ reminder, onActionDone }: ReminderCardProps) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const utils = trpc.useUtils();

  const markDone = trpc.personalReminders.reminders.markDone.useMutation({
    onSuccess: (data: any) => {
      if (data.nextCreated) {
        toast.success("Hecho · Siguiente recordatorio creado");
      } else {
        toast.success("Marcado como hecho");
      }
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      onActionDone();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  const snoozeQuick = trpc.personalReminders.reminders.snoozeQuick.useMutation({
    onSuccess: () => {
      toast.success("Pospuesto");
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      setShowSnoozeMenu(false);
      onActionDone();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  const dismiss = trpc.personalReminders.reminders.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Descartado");
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      setShowMoreMenu(false);
      onActionDone();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  const softDelete = trpc.personalReminders.reminders.softDelete.useMutation({
    onSuccess: () => {
      toast.success("Eliminado");
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      setShowMoreMenu(false);
      onActionDone();
    },
    onError: (e) => toast.error(e.message || "Error"),
  });

  // Color del border-left segun urgencia
  const days = daysUntil(reminder.dueDate);
  let urgencyClass = "border-l-slate-700";
  if (reminder.priority === "urgent") {
    urgencyClass = "border-l-rose-500";
  } else if (days != null) {
    if (days < 0) urgencyClass = "border-l-rose-500";
    else if (days === 0) urgencyClass = "border-l-amber-500";
    else if (days <= 3) urgencyClass = "border-l-amber-400/70";
    else if (days <= 7) urgencyClass = "border-l-indigo-400";
  }

  const dueLabel = formatDueLabel(reminder.dueDate, reminder.dueTime);
  const isOverdue = days != null && days < 0;
  const isToday = days === 0;
  const isDone = reminder.status === "done";

  // Bug1-Deudas: items sintetizados desde el modulo Deudas (solo lectura)
  const isDebt = reminder.kind === "debt";
  const debtStyle = isDebt
    ? DEBT_BADGE_STYLE[reminder.badgeKind] ?? DEBT_BADGE_STYLE.no_date
    : null;
  // Para deudas el border-left sigue el color del badge
  let debtBorderClass = "border-l-violet-500";
  if (reminder.badgeKind === "overdue") debtBorderClass = "border-l-rose-500";
  else if (reminder.badgeKind === "due_soon") debtBorderClass = "border-l-amber-500";
  else if (reminder.badgeKind === "due_later") debtBorderClass = "border-l-sky-500";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-800/60 border border-slate-700 border-l-4 ${isDebt ? debtBorderClass : urgencyClass} p-3 ${isDone ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p
              className={`text-sm font-bold text-white truncate ${isDone ? "line-through" : ""}`}
            >
              {reminder.title}
            </p>
            {reminder.priority !== "normal" && PRIORITY_LABEL[reminder.priority] && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full ${PRIORITY_THEME[reminder.priority].bg} ${PRIORITY_THEME[reminder.priority].text}`}
              >
                {PRIORITY_LABEL[reminder.priority]}
              </span>
            )}
            {reminder.isRecurring && reminder.recurrencePattern && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full bg-emerald-500/15 text-emerald-300 inline-flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" />
                {RECURRENCE_LABEL[reminder.recurrencePattern] || reminder.recurrencePattern}
              </span>
            )}
            {isDebt && debtStyle && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${debtStyle.bg} ${debtStyle.border} ${debtStyle.text}`}
              >
                {debtBadgeLabel(reminder.badgeKind, reminder.dueDate)}
              </span>
            )}
          </div>

          {/* Description */}
          {reminder.description && (
            <p className="text-[11px] text-slate-400 mb-1.5 leading-snug">
              {reminder.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {isDebt ? (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span>{reminder.icon ?? "💳"}</span>
                <span className="text-rose-300 font-bold">
                  {fmtMoney(Number(reminder.amount ?? 0))}
                </span>
                {reminder.creditorName && (
                  <span className="text-slate-500">· {reminder.creditorName}</span>
                )}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 ${
                  isOverdue
                    ? "text-rose-300 font-bold"
                    : isToday
                      ? "text-amber-300 font-bold"
                      : "text-slate-400"
                }`}
              >
                <CalendarClock className="w-3 h-3" />
                {dueLabel}
              </span>
            )}
            {!isDebt &&
              reminder.tags?.length > 0 &&
              reminder.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-cyan-400 text-[10px]"
                >
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        {/* Actions */}
        {!isDone && !isDebt && (
          <div className="flex items-center gap-1 shrink-0 relative">
            <Button
              size="sm"
              onClick={() => markDone.mutate({ id: reminder.id })}
              disabled={markDone.isPending}
              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              title="Marcar hecho"
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowSnoozeMenu(!showSnoozeMenu);
                setShowMoreMenu(false);
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              title="Posponer"
            >
              <Clock className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowMoreMenu(!showMoreMenu);
                setShowSnoozeMenu(false);
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              title="Mas"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {/* Snooze popover */}
            {showSnoozeMenu && (
              <div className="absolute right-0 top-9 z-30 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
                {[
                  { label: "Mañana", preset: "tomorrow" as const },
                  { label: "En 3 dias", preset: "in_3_days" as const },
                  { label: "En 1 semana", preset: "in_1_week" as const },
                  { label: "En 1 mes", preset: "in_1_month" as const },
                ].map((opt) => (
                  <button
                    key={opt.preset}
                    onClick={() =>
                      snoozeQuick.mutate({ id: reminder.id, preset: opt.preset })
                    }
                    disabled={snoozeQuick.isPending}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => setShowSnoozeMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* More popover */}
            {showMoreMenu && (
              <div className="absolute right-0 top-9 z-30 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
                <button
                  onClick={() => dismiss.mutate({ id: reminder.id })}
                  disabled={dismiss.isPending}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Descartar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${reminder.title}"?`)) {
                      softDelete.mutate({ id: reminder.id });
                    }
                  }}
                  disabled={softDelete.isPending}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function PersonalRemindersTab() {
  const [filter, setFilter] = useState<Filter>("today");

  const listQuery = trpc.personalReminders.reminders.list.useQuery(
    { filter, limit: 100 },
    { refetchOnMount: true },
  );

  const reminders = listQuery.data ?? [];

  const filters: Array<{ key: Filter; label: string; emoji: string }> = [
    { key: "today", label: "Hoy", emoji: "📅" },
    { key: "upcoming", label: "Proximos", emoji: "⏭️" },
    { key: "overdue", label: "Atrasados", emoji: "⚠️" },
    { key: "pending", label: "Todos", emoji: "📋" },
    { key: "done", label: "Completados", emoji: "✓" },
  ];

  const emptyStateMessage: Record<Filter, string> = {
    today: "Sin pendientes para hoy. ¡Dia tranquilo!",
    upcoming: "Sin pendientes en los proximos 7 dias",
    overdue: "Sin atrasados. Bien hecho 💪",
    pending: "Sin recordatorios. Captura uno arriba",
    done: "Aun no completaste ningun recordatorio",
  };

  return (
    <div className="space-y-4">
      {/* Hero compacto */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/15">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300/80 mb-0.5">
              Centro de recordatorios
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
              Tus pendientes ordenados
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Captura natural · recurrencia · snooze · prioridad
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <StatsCards />

      {/* Captura natural */}
      <QuickReminderCapture onCreated={() => listQuery.refetch()} />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              filter === f.key
                ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/50"
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            <span>{f.emoji}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {listQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-pulse"
            />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <Card className="bg-slate-800 border border-slate-700">
          <CardContent className="py-10 text-center">
            <Bell className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">{emptyStateMessage[filter]}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder: any) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onActionDone={() => listQuery.refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
