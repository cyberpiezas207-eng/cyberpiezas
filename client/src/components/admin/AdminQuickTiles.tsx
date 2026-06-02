// ============================================================================
// ADMIN QUICK TILES
// ----------------------------------------------------------------------------
// 4 tiles de navegacion rapida a los sub-modulos personales: Gastos, Alacena,
// Vehiculo, Deudas. Sin datos (los KPIs arriba ya los muestran). Solo navegacion
// premium con icons tematicos y hover effect.
//
// Click en un tile -> onOpenModule(subTab) abre PersonalExpensesView con el
// sub-tab correcto activado.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  Wallet,
  Boxes,
  Car,
  CreditCard,
  Bell,
  ChevronRight,
} from "lucide-react";

export type SubModule = "gastos" | "alacena" | "vehiculo" | "deudas" | "recordatorios";

interface Props {
  onOpenModule: (subTab: SubModule) => void;
}

// ----------------------------------------------------------------------------
// Diccionario de tiles (icon, color, subtitulo)
// ----------------------------------------------------------------------------

interface TileConfig {
  key: SubModule;
  icon: typeof Wallet;
  label: string;
  subtitle: string;
  iconColor: string;
  iconBg: string;
  iconRing: string;
  glow: string;
  hoverBorder: string;
}

const TILES: TileConfig[] = [
  {
    key: "gastos",
    icon: Wallet,
    label: "Mis Gastos",
    subtitle: "Captura, categorias y tiendas",
    iconColor: "text-emerald-300",
    iconBg: "bg-emerald-500/15",
    iconRing: "ring-emerald-400/30",
    glow: "bg-emerald-500/[0.08]",
    hoverBorder: "hover:border-emerald-500/40",
  },
  {
    key: "alacena",
    icon: Boxes,
    label: "Alacena",
    subtitle: "Inventario casero y consumo",
    iconColor: "text-amber-300",
    iconBg: "bg-amber-500/15",
    iconRing: "ring-amber-400/30",
    glow: "bg-amber-500/[0.08]",
    hoverBorder: "hover:border-amber-500/40",
  },
  {
    key: "vehiculo",
    icon: Car,
    label: "Vehiculo",
    subtitle: "Combustible y mantenimiento",
    iconColor: "text-cyan-300",
    iconBg: "bg-cyan-500/15",
    iconRing: "ring-cyan-400/30",
    glow: "bg-cyan-500/[0.08]",
    hoverBorder: "hover:border-cyan-500/40",
  },
  {
    key: "deudas",
    icon: CreditCard,
    label: "Deudas",
    subtitle: "Pagos, vencimientos y activos",
    iconColor: "text-rose-300",
    iconBg: "bg-rose-500/15",
    iconRing: "ring-rose-400/30",
    glow: "bg-rose-500/[0.08]",
    hoverBorder: "hover:border-rose-500/40",
  },
  {
    key: "recordatorios",
    icon: Bell,
    label: "Recordatorios",
    subtitle: "Pendientes, fechas y recurrencias",
    iconColor: "text-indigo-300",
    iconBg: "bg-indigo-500/15",
    iconRing: "ring-indigo-400/30",
    glow: "bg-indigo-500/[0.08]",
    hoverBorder: "hover:border-indigo-500/40",
  },
];

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function AdminQuickTiles({ onOpenModule }: Props) {
  return (
    <div>
      {/* Header de seccion */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-wider text-slate-500 tabular-nums">
            01
          </span>
          <span className="w-4 h-px bg-slate-600/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Control personal
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden md:inline">
          click en un modulo para abrirlo
        </span>
      </div>

      {/* Grid de tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            onClick={() => onOpenModule(tile.key)}
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-800/40 border border-slate-700/60 ${tile.hoverBorder} p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]`}
          >
            {/* Glow sutil tematico */}
            <div
              className={`absolute -top-12 -right-12 w-32 h-32 ${tile.glow} rounded-full blur-3xl pointer-events-none transition-opacity opacity-60 group-hover:opacity-100`}
            />

            <div className="relative flex items-start justify-between mb-3">
              <span
                className={`w-11 h-11 rounded-xl ${tile.iconBg} ring-1 ${tile.iconRing} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
              >
                <tile.icon className={`w-5 h-5 ${tile.iconColor}`} />
              </span>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <p className="relative text-base font-black text-white tracking-tight leading-tight">
              {tile.label}
            </p>
            <p className="relative text-[11px] text-slate-500 mt-1 leading-snug group-hover:text-slate-400 transition-colors">
              {tile.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
