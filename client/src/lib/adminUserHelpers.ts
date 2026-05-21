// ============================================================================
// adminUserHelpers.ts
// ----------------------------------------------------------------------------
// Helpers puros presentacionales para el panel admin.
//
// REGLAS DEL ARCHIVO:
// - Solo funciones puras
// - SIN hooks (no useState, useEffect, useQuery, etc)
// - SIN trpc
// - SIN side effects
// - SIN dependencias de React
// - Solo strings, fechas, math
//
// Usado por:
// - AdminCyberpiezas (page principal)
// - SubscriberCard
// - AdminUsersTab (cuando se cree en Commit 2)
// - Cualquier otro componente admin futuro que necesite los mismos helpers
// ============================================================================

// ============================================================================
// Avatar: deriva un color consistente del nombre del usuario
// ============================================================================
const AVATAR_COLORS = [
  "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ============================================================================
// Iniciales: extrae las 1-2 letras del nombre para mostrar en el avatar
// ============================================================================
export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================================================
// Plan: label legible
// ============================================================================
export function getPlanLabel(plan?: string | null): string {
  switch (plan) {
    case "free":
      return "Gratis";
    case "basic":
      return "Basico";
    case "professional":
      return "Profesional";
    case "premium":
      return "Premium";
    case "annual":
      return "Anual";
    default:
      return plan ?? "-";
  }
}

// ============================================================================
// Plan: clases Tailwind segun el tier (badge color)
// ============================================================================
export function getPlanColor(plan?: string | null): string {
  switch (plan) {
    case "free":
      return "bg-slate-700 text-slate-200 border-slate-600";
    case "basic":
      return "bg-blue-500/20 text-blue-200 border-blue-500/40";
    case "professional":
      return "bg-purple-500/20 text-purple-200 border-purple-500/40";
    case "premium":
      return "bg-amber-500/20 text-amber-200 border-amber-500/40";
    case "annual":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
    default:
      return "bg-slate-700 text-slate-300 border-slate-600";
  }
}

// ============================================================================
// Texto relativo del vencimiento de una suscripcion
//
// Acepta Date o string (lectura defensiva del backend que puede serializar
// como string). Retorna null si no hay fecha valida.
//
// Niveles de urgency:
// - expired: ya vencio (ayer, hace X dias)
// - today: vence hoy
// - soon: vence manana o en los proximos 7 dias
// - normal: vence en 8-30 dias
// - far: vence en mas de 30 dias (se muestra en meses)
// ============================================================================
export type ExpirationUrgency = "expired" | "today" | "soon" | "normal" | "far";

export type RelativeExpiration = {
  text: string;
  urgency: ExpirationUrgency;
};

export function getRelativeExpiration(
  endDate: Date | string | null | undefined,
): RelativeExpiration | null {
  if (!endDate) return null;
  const d = endDate instanceof Date ? endDate : new Date(endDate);
  if (isNaN(d.getTime())) return null;

  const diffMs = d.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return { text: "Venció ayer", urgency: "expired" };
    return { text: `Venció hace ${absDays} días`, urgency: "expired" };
  }
  if (days === 0) return { text: "Vence hoy", urgency: "today" };
  if (days === 1) return { text: "Vence mañana", urgency: "soon" };
  if (days <= 7) return { text: `Vence en ${days} días`, urgency: "soon" };
  if (days <= 30) return { text: `Vence en ${days} días`, urgency: "normal" };

  const months = Math.floor(days / 30);
  if (months === 1) return { text: "Vigente por 1 mes más", urgency: "far" };
  return { text: `Vigente por ${months} meses más`, urgency: "far" };
}
