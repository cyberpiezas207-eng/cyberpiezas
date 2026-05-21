// ============================================================================
// SubscriptionBadges - Componentes compartidos para mostrar estado y origen
// de una suscripcion. Usado por MisSuscripciones, AdminCyberpiezas y
// AdminPagosPanel.
//
// V1.6 refactor: extrae logica antes duplicada en 3+ archivos.
// ============================================================================

import { AlertCircle, Gift, Shield, RotateCcw, XCircle } from "lucide-react";

// ============================================================================
// StatusBadge: muestra activo/vencido/cancelado
// ============================================================================
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "none";

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: SubscriptionStatus | string | null | undefined;
  size?: "xs" | "sm";
}) {
  // Defensive: si el status no es uno conocido, no renderizar nada
  if (!status || (status !== "active" && status !== "expired" && status !== "cancelled")) {
    return null;
  }

  const sizeClass =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5"
      : "text-[10px] px-2 py-0.5";

  if (status === "active") {
    return (
      <span
        className={
          "font-bold uppercase tracking-wider rounded-full border " +
          sizeClass +
          " bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
        }
      >
        Activa
      </span>
    );
  }

  if (status === "expired") {
    return (
      <span
        className={
          "font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 " +
          sizeClass +
          " bg-amber-500/20 text-amber-200 border-amber-500/40"
        }
      >
        <XCircle className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
        Vencida
      </span>
    );
  }

  // cancelled
  return (
    <span
      className={
        "font-bold uppercase tracking-wider rounded-full border " +
        sizeClass +
        " bg-slate-500/20 text-slate-200 border-slate-500/40"
      }
    >
      Cancelada
    </span>
  );
}

// ============================================================================
// SourceBadge: muestra cortesia/manual/migracion (omite "payment" porque es
// el default y no necesita destacarse)
// ============================================================================
export type SubscriptionSourceType =
  | "payment"
  | "courtesy"
  | "admin_grant"
  | "migration"
  | null
  | undefined;

export function SourceBadge({
  sourceType,
  size = "sm",
}: {
  sourceType: SubscriptionSourceType | string;
  size?: "xs" | "sm";
}) {
  // Si no hay sourceType o es "payment", no renderizar (es el caso normal)
  if (!sourceType || sourceType === "payment") {
    return null;
  }

  const sizeClass =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5 gap-1"
      : "text-[10px] px-2 py-0.5 gap-1";
  const iconClass = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";

  if (sourceType === "courtesy") {
    return (
      <span
        className={
          "font-bold uppercase tracking-wider rounded-full border flex items-center " +
          sizeClass +
          " bg-purple-500/20 text-purple-200 border-purple-500/40"
        }
      >
        <Gift className={iconClass} />
        Cortesía
      </span>
    );
  }

  if (sourceType === "admin_grant") {
    return (
      <span
        className={
          "font-bold uppercase tracking-wider rounded-full border flex items-center " +
          sizeClass +
          " bg-orange-500/20 text-orange-200 border-orange-500/40"
        }
      >
        <Shield className={iconClass} />
        Manual
      </span>
    );
  }

  if (sourceType === "migration") {
    return (
      <span
        className={
          "font-bold uppercase tracking-wider rounded-full border flex items-center " +
          sizeClass +
          " bg-slate-500/20 text-slate-200 border-slate-500/40"
        }
      >
        <RotateCcw className={iconClass} />
        Migrado
      </span>
    );
  }

  return null;
}

// ============================================================================
// ExpirationAlert: pequeño aviso ambar para subs vencidas o por vencer
// (helper opcional para los consumers que quieran mostrarlo)
// ============================================================================
export function ExpirationAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {children}
    </div>
  );
}
