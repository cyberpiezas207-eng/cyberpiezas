import { useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Sparkles,
  Home,
  Wallet,
  Crown,
  Settings,
  Calendar,
  TrendingUp,
  AlertCircle,
  Syringe,
  PawPrint,
  Activity,
} from "lucide-react";

// ============================================================================
// SYSTEMS PANEL - Dashboard ejecutivo CyberPiezas
// ----------------------------------------------------------------------------
// Hero compacto + cards con metricas en vivo (Veterinaria primero, demas con
// placeholders honestos "pronto datos"). Activos arriba con jerarquia, en
// camino abajo como pills horizontales que excitan sin distraer.
// ============================================================================

interface POSSystem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  status: "active" | "coming-soon";
  path?: string;
  gradient: string;
  glowColor: string;
  accentColor: string;
  features: string[];
  hasMetrics?: boolean;
}

const systems: POSSystem[] = [
  {
    id: "veterinaria",
    name: "Sistema POS Veterinaria",
    shortName: "Veterinaria",
    description: "Clinicas con expediente, vacunas, citas y portal para duenos.",
    icon: "🐾",
    status: "active",
    path: "/veterinaria-pos",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    glowColor: "shadow-emerald-500/30",
    accentColor: "emerald",
    features: ["Mascotas", "Expediente", "Vacunas", "Portal"],
    hasMetrics: true,
  },
  {
    id: "boutique",
    name: "Sistema POS Boutique",
    shortName: "Boutique",
    description: "Tiendas de ropa, zapatos y accesorios con variantes.",
    icon: "👗",
    status: "active",
    path: "/dashboard",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    glowColor: "shadow-pink-500/30",
    accentColor: "pink",
    features: ["Variantes", "Sucursales", "Inventario", "Reportes"],
  },
  {
    id: "abarrotes",
    name: "Sistema POS Abarrotes",
    shortName: "Abarrotes",
    description: "Tienditas con codigo de barras, bascula y granel.",
    icon: "🛒",
    status: "active",
    path: "/abarrotes-pos",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    glowColor: "shadow-amber-500/30",
    accentColor: "amber",
    features: ["Codigo barras", "Granel", "Bascula", "Inventario"],
  },
  {
    id: "verduleria",
    name: "Sistema POS Verduleria",
    shortName: "Verduleria",
    description: "Frutas y verduras con grid visual y ventas rapidas.",
    icon: "🥕",
    status: "active",
    path: "/verduleria",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    glowColor: "shadow-emerald-500/30",
    accentColor: "green",
    features: ["Grid visual", "Por kg", "Frutas", "Venta rapida"],
  },
  {
    id: "tarima",
    name: "Sistema Tarima",
    shortName: "Tarima",
    description: "Plataforma para musicos y artistas con bookings.",
    icon: "🎤",
    status: "active",
    path: "/mi-tarima",
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-500",
    glowColor: "shadow-purple-500/30",
    accentColor: "purple",
    features: ["Perfil", "Bookings", "Redes", "Media"],
  },
  {
    id: "restaurant",
    name: "Sistema POS Restaurante",
    shortName: "Restaurante",
    description: "Restaurantes con mesas, comandas y cocina.",
    icon: "🍽️",
    status: "coming-soon",
    gradient: "from-red-500 via-orange-500 to-amber-500",
    glowColor: "shadow-orange-500/30",
    accentColor: "orange",
    features: ["Mesas", "Comandas", "Cocina", "Propinas"],
  },
  {
    id: "cafeteria",
    name: "Sistema POS Cafeteria",
    shortName: "Cafeteria",
    description: "Cafeterias con bebidas personalizables y combos.",
    icon: "☕",
    status: "coming-soon",
    gradient: "from-amber-700 via-orange-600 to-yellow-700",
    glowColor: "shadow-amber-600/30",
    accentColor: "amber",
    features: ["Bebidas", "Combos", "Carta", "Mods"],
  },
  {
    id: "refaccionaria",
    name: "Sistema POS Refaccionaria",
    shortName: "Refaccionaria",
    description: "Refacciones con busqueda por compatibilidad de vehiculo.",
    icon: "🚗",
    status: "coming-soon",
    gradient: "from-blue-500 via-cyan-500 to-sky-500",
    glowColor: "shadow-cyan-500/30",
    accentColor: "blue",
    features: ["Catalogo", "Compat.", "Marcas", "Modelos"],
  },
  {
    id: "panaderia",
    name: "Sistema POS Panaderia",
    shortName: "Panaderia",
    description: "Panaderias con piezas, charolas y produccion.",
    icon: "🥖",
    status: "coming-soon",
    gradient: "from-yellow-600 via-orange-500 to-red-600",
    glowColor: "shadow-orange-500/30",
    accentColor: "orange",
    features: ["Piezas", "Charolas", "Recetas", "Lote"],
  },
];

export default function SystemsPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const activeSystems = systems.filter((s) => s.status === "active");
  const comingSoonSystems = systems.filter((s) => s.status === "coming-soon");

  // Metricas en vivo Veterinaria (tolerante a errores)
  const vetSummaryQuery = trpc.veterinaria.dashboard.summary.useQuery(
    undefined,
    {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );
  const vetData = vetSummaryQuery.data;

  const handleSystemClick = (system: POSSystem) => {
    if (system.status === "active" && system.path) {
      setLocation(system.path);
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos dias" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Mesh decorativo de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute top-40 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* TOPBAR fija con identidad CyberPiezas */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          <button
            onClick={() => setLocation("/sistemas")}
            className="flex items-center gap-2 group flex-shrink-0"
            title="Inicio de sistemas"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
              CP
            </div>
            <span className="text-white font-bold tracking-tight text-sm hidden sm:inline">
              CyberPiezas
            </span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setLocation("/cyberpiezas")}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs sm:text-sm font-medium"
              title="Inicio"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </button>
            <button
              onClick={() => setLocation("/mis-ingresos")}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs sm:text-sm font-medium"
              title="Caja registradora"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Caja</span>
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => setLocation("/admin-cyberpiezas")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                title="Centro Cyberpiezas"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Centro</span>
              </button>
            )}
            <button
              onClick={() => setLocation("/cajeros-usuarios")}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Configuracion"
            >
              <Settings className="w-4 h-4" />
            </button>
            {user && (
              <div className="ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-white/10 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                  {firstName.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[11px] font-semibold text-white leading-tight">{firstName || user.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{user.role === "admin" ? "Admin" : "Usuario"}</p>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-16">
        {/* HERO COMPACTO */}
        <header className="mb-10 lg:mb-12">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 rounded-full mb-3">
                <Sparkles className="w-3 h-3 text-fuchsia-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  CyberPiezas · Tu plataforma
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                {greeting}
                {firstName ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400">
                    , {firstName}
                  </span>
                ) : ""}
              </h1>
              <p className="text-base text-slate-400 mt-2 max-w-xl">
                Tu centro de control unificado. Cada sistema esta listo cuando lo necesites.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-sm font-bold text-emerald-300">{activeSystems.length} activos</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                <span className="text-sm font-bold text-amber-300">{comingSoonSystems.length} en camino</span>
              </div>
            </div>
          </div>

          {/* KPI Bar agregada */}
          {vetData && vetData.hasData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
              <KpiTile
                icon={<Calendar className="w-4 h-4" />}
                label="Citas hoy"
                value={vetData.appointmentsToday.toString()}
                color="cyan"
              />
              <KpiTile
                icon={<TrendingUp className="w-4 h-4" />}
                label="Ventas hoy"
                value={"$" + vetData.totalToday.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                color="emerald"
              />
              <KpiTile
                icon={<AlertCircle className="w-4 h-4" />}
                label="Por cobrar"
                value={vetData.pendingPayments.toString()}
                color={vetData.pendingPayments > 0 ? "amber" : "slate"}
              />
              <KpiTile
                icon={<Syringe className="w-4 h-4" />}
                label="Vacunas proximas"
                value={vetData.vaccinesDueSoon.toString()}
                color={vetData.vaccinesDueSoon > 0 ? "purple" : "slate"}
              />
            </div>
          )}
        </header>

        {/* SECCION ACTIVOS */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                Disponibles ahora
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Click en cualquier card para entrar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {activeSystems.map((system) => (
              <SystemCard
                key={system.id}
                system={system}
                onClick={() => handleSystemClick(system)}
                vetData={system.id === "veterinaria" ? vetData : null}
                vetLoading={system.id === "veterinaria" && vetSummaryQuery.isLoading}
              />
            ))}
          </div>
        </section>

        {/* SECCION EN CAMINO */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/80">
                En camino
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {comingSoonSystems.length} sistemas en preparacion · vienen pronto
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comingSoonSystems.map((system) => (
              <ComingSoonChip key={system.id} system={system} />
            ))}
          </div>
        </section>

        {/* FOOTER con marca CyberPiezas */}
        <footer className="text-center pt-10 border-t border-white/10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-fuchsia-500/30">
              CP
            </div>
            <span className="text-white font-bold tracking-tight">CyberPiezas</span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Una plataforma, multiples verticales. Construida en Mexico para que tu negocio crezca sin cambiar de sistema.
          </p>
          <p className="text-xs text-slate-600 mt-3">
            ¿No ves tu giro? <button onClick={() => setLocation("/cyberpiezas")} className="text-fuchsia-400 hover:text-fuchsia-300 underline">Cuentanos</button> y lo construimos para ti.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function KpiTile({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 text-cyan-300",
    emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300",
    amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-300",
    purple: "from-purple-500/15 to-purple-500/5 border-purple-500/30 text-purple-300",
    slate: "from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400",
  };

  return (
    <div className={"bg-gradient-to-br backdrop-blur-md border rounded-2xl px-3 sm:px-4 py-3 " + colorMap[color]}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{value}</p>
    </div>
  );
}

function SystemCard({ system, onClick, vetData, vetLoading }: {
  system: POSSystem;
  onClick: () => void;
  vetData: any;
  vetLoading: boolean;
}) {
  const renderInlineMetrics = () => {
    if (system.id === "veterinaria") {
      if (vetLoading) {
        return (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <span>Cargando metricas...</span>
          </div>
        );
      }
      if (vetData && vetData.hasData) {
        return (
          <div className="mt-3 flex flex-wrap gap-2">
            {vetData.appointmentsToday > 0 && (
              <MetricPill icon={<Calendar className="w-3 h-3" />} value={vetData.appointmentsToday + " hoy"} color="cyan" />
            )}
            {vetData.salesToday > 0 && (
              <MetricPill icon={<TrendingUp className="w-3 h-3" />} value={"$" + vetData.totalToday.toLocaleString("es-MX", { maximumFractionDigits: 0 })} color="emerald" />
            )}
            {vetData.pendingPayments > 0 && (
              <MetricPill icon={<AlertCircle className="w-3 h-3" />} value={vetData.pendingPayments + " x cobrar"} color="amber" />
            )}
            {vetData.totalPets > 0 && (
              <MetricPill icon={<PawPrint className="w-3 h-3" />} value={vetData.totalPets + " mascotas"} color="slate" />
            )}
          </div>
        );
      }
      if (vetData && !vetData.hasData) {
        return (
          <div className="mt-3 text-xs text-slate-500 italic">
            Aun no tienes datos · Empieza registrando tu primer cliente
          </div>
        );
      }
    }
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Activity className="w-3 h-3" />
        <span>Metricas en vivo: proximamente</span>
      </div>
    );
  };

  return (
    <button
      onClick={onClick}
      className={
        "group relative bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/25 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden " +
        system.glowColor
      }
    >
      <div className={"absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-br " + system.gradient} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={"w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg " + system.gradient + " " + system.glowColor}>
            {system.icon}
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Activo</span>
          </span>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight mb-1">
          {system.shortName}
        </h3>
        <p className="text-xs text-slate-400 leading-snug line-clamp-2 min-h-[2.4rem]">
          {system.description}
        </p>

        {renderInlineMetrics()}

        <div className="flex flex-wrap gap-1 mt-3 mb-4">
          {system.features.slice(0, 4).map((feature, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-medium rounded-md"
            >
              {feature}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-xs font-bold text-white">Abrir sistema</span>
          <div className={"w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center group-hover:translate-x-1 transition-transform " + system.gradient}>
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}

function MetricPill({ icon, value, color }: { icon: any; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/15 border-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    purple: "bg-purple-500/15 border-purple-500/30 text-purple-200",
    slate: "bg-white/5 border-white/10 text-slate-300",
  };

  return (
    <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold " + colorMap[color]}>
      {icon}
      {value}
    </span>
  );
}

function ComingSoonChip({ system }: { system: POSSystem }) {
  return (
    <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md border border-white/5 hover:border-white/15 rounded-xl px-3 py-3 transition-all overflow-hidden">
      <div className={"absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-15 bg-gradient-to-br " + system.gradient} />
      <div className="relative flex items-center gap-2.5">
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br opacity-70 " + system.gradient}>
          {system.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white tracking-tight truncate">{system.shortName}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Proximamente</p>
        </div>
      </div>
    </div>
  );
}
