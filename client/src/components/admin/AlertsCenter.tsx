// ============================================================================
// CENTRO DE ALERTAS INTELIGENTES
// ----------------------------------------------------------------------------
// Agregador cross-modulo que junta alertas accionables de:
//   - Deudas (vencidas, vencen hoy, vencen pronto)
//   - Suscripciones propias (proximas a vencer)
//   - Pagos pendientes admin (si el user es admin)
//
// Reglas de severidad:
//   - critical (rojo): deudas vencidas, deudas vencen hoy
//   - urgent (amber): deudas vencen 1-3 dias, suscripciones <= 7 dias
//   - info (indigo): pagos pendientes admin, deudas 4-7 dias
//
// Cada alerta tiene un boton de accion que dispara onNavigate(target).
// Auto-oculta si no hay alertas.
//
// NO duplica DebtInsightsPanel: este foco es accionable, ese foco es informativo.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Calendar,
  Inbox,
  ChevronRight,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

type Severity = "critical" | "urgent" | "info";
type ActionTarget = "debts" | "subscriptions" | "admin_payments" | "reminders";

interface AlertItem {
  id: string;
  severity: Severity;
  icon: typeof Bell;
  title: string;
  description: string;
  actionLabel: string;
  actionTarget: ActionTarget;
  priority: number; // para ordenar
}

interface Props {
  onNavigate: (target: ActionTarget) => void;
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

function daysUntil(ymd: string | null | undefined): number | null {
  if (!ymd) return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const today = nowMexico();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ----------------------------------------------------------------------------
// Theme por severidad
// ----------------------------------------------------------------------------

const SEVERITY_THEME: Record<
  Severity,
  {
    bgClass: string;
    borderClass: string;
    iconBg: string;
    iconRing: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  critical: {
    bgClass: "bg-rose-500/[0.06]",
    borderClass: "border-rose-500/30",
    iconBg: "bg-rose-500/20",
    iconRing: "ring-rose-400/40",
    iconColor: "text-rose-300",
    badgeBg: "bg-rose-500/25",
    badgeText: "text-rose-200",
    label: "Critica",
  },
  urgent: {
    bgClass: "bg-amber-500/[0.06]",
    borderClass: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconRing: "ring-amber-400/40",
    iconColor: "text-amber-300",
    badgeBg: "bg-amber-500/25",
    badgeText: "text-amber-200",
    label: "Urgente",
  },
  info: {
    bgClass: "bg-indigo-500/[0.05]",
    borderClass: "border-indigo-500/25",
    iconBg: "bg-indigo-500/20",
    iconRing: "ring-indigo-400/30",
    iconColor: "text-indigo-300",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-200",
    label: "Info",
  },
};

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function AlertsCenter({ onNavigate }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // --- Queries ---
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });

  const mySubsQuery = trpc.pagos.subscriptions.listMine.useQuery();

  const pendingAdminQuery = trpc.pagos.admin.listAll.useQuery(
    { status: "pending" },
    { enabled: isAdmin },
  );

  const remindersQuery = trpc.personalReminders.reminders.list.useQuery({
    filter: "pending",
    limit: 50,
  });

  // --- Construir alertas en cliente ---
  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];

    // Alertas de deudas
    const debts = (debtsQuery.data ?? []) as any[];
    for (const d of debts) {
      const days = daysUntil(d.nextDueDate);
      if (days == null) continue;
      const amount = Number(d.installmentAmount ?? d.currentBalance ?? 0);

      if (days < 0) {
        // Vencida
        const ago = Math.abs(days);
        out.push({
          id: `debt-overdue-${d.id}`,
          severity: "critical",
          icon: AlertCircle,
          title: `${d.creditorName} · ${d.title}`,
          description: `Venció hace ${ago} día${ago === 1 ? "" : "s"} · ${fmt(amount)}`,
          actionLabel: "Ver deuda",
          actionTarget: "debts",
          priority: 100 + ago,
        });
      } else if (days === 0) {
        // Vence hoy
        out.push({
          id: `debt-today-${d.id}`,
          severity: "critical",
          icon: AlertCircle,
          title: `${d.creditorName} · ${d.title}`,
          description: `Vence HOY · ${fmt(amount)}`,
          actionLabel: "Pagar ahora",
          actionTarget: "debts",
          priority: 90,
        });
      } else if (days <= 3) {
        // Vence 1-3 dias
        out.push({
          id: `debt-soon-${d.id}`,
          severity: "urgent",
          icon: AlertTriangle,
          title: `${d.creditorName} · ${d.title}`,
          description: `Vence en ${days} día${days === 1 ? "" : "s"} · ${fmt(amount)}`,
          actionLabel: "Ver deuda",
          actionTarget: "debts",
          priority: 70 - days,
        });
      } else if (days <= 7) {
        // Vence 4-7 dias
        out.push({
          id: `debt-week-${d.id}`,
          severity: "info",
          icon: Calendar,
          title: `${d.creditorName} · ${d.title}`,
          description: `Vence en ${days} días · ${fmt(amount)}`,
          actionLabel: "Ver deuda",
          actionTarget: "debts",
          priority: 40 - days,
        });
      }
    }

    // Alertas de suscripciones propias
    const subs = (mySubsQuery.data ?? []) as any[];
    for (const s of subs) {
      if (s.status !== "active" || !s.endDate) continue;
      const end =
        s.endDate instanceof Date
          ? s.endDate
          : new Date(s.endDate);
      const today = nowMexico();
      today.setHours(0, 0, 0, 0);
      const days = Math.round(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (days >= 0 && days <= 7) {
        out.push({
          id: `sub-${s.id}`,
          severity: "urgent",
          icon: CreditCard,
          title: `Suscripción ${s.posCode}`,
          description:
            days === 0
              ? "Vence HOY"
              : `Vence en ${days} día${days === 1 ? "" : "s"}`,
          actionLabel: "Renovar",
          actionTarget: "subscriptions",
          priority: 75 - days,
        });
      }
    }

    // Alerta de pagos pendientes admin (solo si es admin)
    if (isAdmin) {
      const pending = (pendingAdminQuery.data ?? []) as any[];
      if (pending.length > 0) {
        out.push({
          id: "admin-pending",
          severity: "info",
          icon: Inbox,
          title: `${pending.length} pago${pending.length === 1 ? "" : "s"} pendiente${pending.length === 1 ? "" : "s"} de revisión`,
          description: `Hay solicitudes esperando aprobación o rechazo`,
          actionLabel: "Revisar",
          actionTarget: "admin_payments",
          priority: 30,
        });
      }
    }

    // Alertas de recordatorios pendientes
    const reminders = (remindersQuery.data ?? []) as any[];
    for (const r of reminders) {
      const days = daysUntil(r.dueDate);

      // Atrasado (vencido)
      if (days != null && days < 0) {
        out.push({
          id: `reminder-overdue-${r.id}`,
          severity: "critical",
          icon: Bell,
          title: `Atrasado: ${r.title}`,
          description: `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`,
          actionLabel: "Ver",
          actionTarget: "reminders",
          priority: 95 + Math.min(Math.abs(days), 5), // mas atrasado = mas prioridad
        });
      }
      // Hoy
      else if (days === 0) {
        out.push({
          id: `reminder-today-${r.id}`,
          severity: "critical",
          icon: Bell,
          title: `Hoy: ${r.title}`,
          description: r.dueTime ? `Para hoy a las ${r.dueTime.slice(0, 5)}` : "Pendiente para hoy",
          actionLabel: "Ver",
          actionTarget: "reminders",
          priority: 92,
        });
      }
      // Proximos 1-3 dias
      else if (days != null && days >= 1 && days <= 3) {
        out.push({
          id: `reminder-soon-${r.id}`,
          severity: "urgent",
          icon: Bell,
          title: `Próximo: ${r.title}`,
          description: `En ${days} día${days === 1 ? "" : "s"}`,
          actionLabel: "Ver",
          actionTarget: "reminders",
          priority: 75 - days,
        });
      }
      // Urgente sin fecha o futuro lejano
      else if (r.priority === "urgent") {
        out.push({
          id: `reminder-urgent-${r.id}`,
          severity: "urgent",
          icon: Bell,
          title: `Urgente: ${r.title}`,
          description: days != null ? `En ${days} días` : "Sin fecha definida",
          actionLabel: "Ver",
          actionTarget: "reminders",
          priority: 78,
        });
      }
    }

    // Ordenar por prioridad descendente
    out.sort((a, b) => b.priority - a.priority);

    // Tope: 6 alertas para no spammear
    return out.slice(0, 6);
  }, [debtsQuery.data, mySubsQuery.data, pendingAdminQuery.data, remindersQuery.data, isAdmin]);

  // --- Loading state ---
  const isLoading =
    debtsQuery.isLoading ||
    mySubsQuery.isLoading ||
    pendingAdminQuery.isLoading ||
    remindersQuery.isLoading;

  if (isLoading) return null; // No mostrar nada hasta tener data

  // Auto-ocultar si no hay alertas
  if (alerts.length === 0) return null;

  // Conteo por severidad para el header
  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    urgent: alerts.filter((a) => a.severity === "urgent").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-300" />
              {counts.critical > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 ring-2 ring-slate-800 flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">
                    {counts.critical}
                  </span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                Centro de alertas
              </p>
              <h3 className="text-base font-black text-white tracking-tight">
                {alerts.length} alerta{alerts.length === 1 ? "" : "s"} pendiente
                {alerts.length === 1 ? "" : "s"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                {counts.critical > 0 && (
                  <span className="text-rose-400">
                    {counts.critical} crítica{counts.critical === 1 ? "" : "s"}
                  </span>
                )}
                {counts.urgent > 0 && (
                  <span className="text-amber-400">
                    {counts.critical > 0 && "·"} {counts.urgent} urgente
                    {counts.urgent === 1 ? "" : "s"}
                  </span>
                )}
                {counts.info > 0 && (
                  <span className="text-indigo-400">
                    {(counts.critical > 0 || counts.urgent > 0) && "·"}{" "}
                    {counts.info} info
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="space-y-2">
          {alerts.map((alert) => {
            const theme = SEVERITY_THEME[alert.severity];
            return (
              <div
                key={alert.id}
                className={`relative overflow-hidden rounded-xl ${theme.bgClass} border ${theme.borderClass} p-3 flex items-start gap-3`}
              >
                <span
                  className={`w-9 h-9 rounded-lg ${theme.iconBg} ring-1 ${theme.iconRing} flex items-center justify-center shrink-0`}
                >
                  <alert.icon className={`w-4 h-4 ${theme.iconColor}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full ${theme.badgeBg} ${theme.badgeText}`}
                    >
                      {theme.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {alert.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {alert.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigate(alert.actionTarget)}
                  className="text-slate-300 hover:text-white hover:bg-slate-700/50 shrink-0 h-8 text-xs"
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
