// ============================================================================
// ADMIN QUICK TILES (Commit B - V2 con stats reales)
// ----------------------------------------------------------------------------
// Tiles de navegacion rapida a sub-modulos personales con mini-stats en vivo:
//   - Gastos: $ del mes
//   - Alacena: X bajos / Y agotados
//   - Vehiculo: ultima carga $
//   - Deudas: $ pagos este mes
//   - Recordatorios: X hoy/atrasados
//
// Cada tile sigue siendo clickeable para abrir el sub-modulo correspondiente.
// Grid de 5 columnas en desktop, 2 en mobile.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { trpc } from "@/lib/trpc";
import {
  Wallet,
  Boxes,
  Car,
  CreditCard,
  Bell,
  ChevronRight,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type SubModule = "gastos" | "alacena" | "vehiculo" | "deudas" | "recordatorios";

interface Props {
  onOpenModule: (mod: SubModule) => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmt(n: number): string {
  if (n === 0) return "$0";
  const rounded = Math.round(n);
  if (rounded < 1000) return `$${rounded}`;
  if (rounded < 1_000_000) {
    const k = rounded / 1000;
    return k >= 10 ? `$${Math.round(k)}k` : `$${k.toFixed(1)}k`;
  }
  return `$${(rounded / 1_000_000).toFixed(1)}M`;
}

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function AdminQuickTiles({ onOpenModule }: Props) {
  const today = nowMexico();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // --- Queries en paralelo ---
  const expensesDashQuery = trpc.personalExpenses.stats.dashboard.useQuery({
    year,
    month,
  });
  const pantryStatsQuery = trpc.personalPantry.stats.get.useQuery();
  const debtSummaryQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const remindersStatsQuery = trpc.personalReminders.stats.dashboard.useQuery();
  const fuelListQuery = trpc.personalVehicles.fuelLogs.list.useQuery({
    limit: 1,
  });

  // --- Extract stats ---
  const gastosTotal = Number(expensesDashQuery.data?.total ?? 0);

  const pantryLow = Number(pantryStatsQuery.data?.low ?? 0);
  const pantryOut = Number(pantryStatsQuery.data?.out ?? 0);
  const pantryAttention = pantryLow + pantryOut;

  const debtsMes = Number(debtSummaryQuery.data?.totalMonthlyPayments ?? 0);
  const activeDebtsCount = Number(debtSummaryQuery.data?.activeDebtsCount ?? 0);

  const remindersToday = Number(remindersStatsQuery.data?.todayCount ?? 0);
  const remindersOverdue = Number(remindersStatsQuery.data?.overdueCount ?? 0);
  const remindersActionable = remindersToday + remindersOverdue;

  const lastFuel = (fuelListQuery.data as any[])?.[0];
  const lastFuelAmount = Number(lastFuel?.amountPaid ?? 0);

  // --- Tiles config ---
  const TILES: Array<{
    key: SubModule;
    icon: typeof Wallet;
    label: string;
    stat: string;
    hint: string;
    iconColor: string;
    iconBg: string;
    iconRing: string;
    glow: string;
    hoverBorder: string;
    accent: string;
  }> = [
    {
      key: "gastos",
      icon: Wallet,
      label: "Gastos",
      stat: fmt(gastosTotal),
      hint: "este mes",
      iconColor: "text-emerald-300",
      iconBg: "bg-emerald-500/15",
      iconRing: "ring-emerald-400/30",
      glow: "bg-emerald-500/[0.08]",
      hoverBorder: "hover:border-emerald-500/40",
      accent: "text-emerald-300",
    },
    {
      key: "alacena",
      icon: Boxes,
      label: "Alacena",
      stat:
        pantryAttention > 0
          ? String(pantryAttention)
          : String(pantryStatsQuery.data?.available ?? 0),
      hint:
        pantryAttention > 0
          ? pantryOut > 0
            ? `${pantryOut} agotados · ${pantryLow} bajos`
            : `${pantryLow} bajos`
          : "disponibles",
      iconColor: pantryOut > 0 ? "text-rose-300" : "text-amber-300",
      iconBg: pantryOut > 0 ? "bg-rose-500/15" : "bg-amber-500/15",
      iconRing: pantryOut > 0 ? "ring-rose-400/30" : "ring-amber-400/30",
      glow: pantryOut > 0 ? "bg-rose-500/[0.08]" : "bg-amber-500/[0.08]",
      hoverBorder:
        pantryOut > 0
          ? "hover:border-rose-500/40"
          : "hover:border-amber-500/40",
      accent: pantryOut > 0 ? "text-rose-300" : "text-amber-300",
    },
    {
      key: "vehiculo",
      icon: Car,
      label: "Vehiculo",
      stat: lastFuelAmount > 0 ? fmt(lastFuelAmount) : "—",
      hint: lastFuel ? "ultima carga" : "sin cargas aun",
      iconColor: "text-cyan-300",
      iconBg: "bg-cyan-500/15",
      iconRing: "ring-cyan-400/30",
      glow: "bg-cyan-500/[0.08]",
      hoverBorder: "hover:border-cyan-500/40",
      accent: "text-cyan-300",
    },
    {
      key: "deudas",
      icon: CreditCard,
      label: "Deudas",
      stat: fmt(debtsMes),
      hint:
        activeDebtsCount > 0
          ? `${activeDebtsCount} activa${activeDebtsCount === 1 ? "" : "s"} · este mes`
          : "sin deudas activas",
      iconColor: "text-rose-300",
      iconBg: "bg-rose-500/15",
      iconRing: "ring-rose-400/30",
      glow: "bg-rose-500/[0.08]",
      hoverBorder: "hover:border-rose-500/40",
      accent: "text-rose-300",
    },
    {
      key: "recordatorios",
      icon: Bell,
      label: "Recordatorios",
      stat: String(remindersActionable),
      hint:
        remindersActionable === 0
          ? "dia tranquilo"
          : remindersOverdue > 0
            ? `${remindersToday} hoy · ${remindersOverdue} atrasado${remindersOverdue === 1 ? "" : "s"}`
            : `${remindersToday} para hoy`,
      iconColor: remindersOverdue > 0 ? "text-rose-300" : "text-indigo-300",
      iconBg:
        remindersOverdue > 0 ? "bg-rose-500/15" : "bg-indigo-500/15",
      iconRing:
        remindersOverdue > 0 ? "ring-rose-400/30" : "ring-indigo-400/30",
      glow:
        remindersOverdue > 0 ? "bg-rose-500/[0.08]" : "bg-indigo-500/[0.08]",
      hoverBorder:
        remindersOverdue > 0
          ? "hover:border-rose-500/40"
          : "hover:border-indigo-500/40",
      accent: remindersOverdue > 0 ? "text-rose-300" : "text-indigo-300",
    },
  ];

  const isLoading =
    expensesDashQuery.isLoading ||
    pantryStatsQuery.isLoading ||
    debtSummaryQuery.isLoading ||
    remindersStatsQuery.isLoading ||
    fuelListQuery.isLoading;

  // --- Skeleton ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[140px] rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // --- Render ---
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-2 px-1">
        Control personal
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            onClick={() => onOpenModule(tile.key)}
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-800/40 border border-slate-700/60 ${tile.hoverBorder} hover:bg-slate-800/80 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            {/* Glow effect */}
            <div
              className={`absolute -top-8 -right-8 w-24 h-24 ${tile.glow} rounded-full blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
            />

            {/* Icon top */}
            <div className="relative flex items-start justify-between mb-3">
              <span
                className={`w-9 h-9 rounded-lg ${tile.iconBg} ring-1 ${tile.iconRing} flex items-center justify-center`}
              >
                <tile.icon className={`w-4 h-4 ${tile.iconColor}`} />
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Label */}
            <p className="relative text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {tile.label}
            </p>

            {/* Stat number */}
            <p
              className={`relative text-xl md:text-2xl font-black ${tile.accent} tabular-nums tracking-tight leading-tight`}
            >
              {tile.stat}
            </p>

            {/* Hint */}
            <p className="relative text-[10px] text-slate-400 mt-0.5 truncate">
              {tile.hint}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
