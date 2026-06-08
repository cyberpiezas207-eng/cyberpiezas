import { useLocation } from "wouter";
import { useEffect, useState } from "react";
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
  Zap,
  Clock,
} from "lucide-react";

// ============================================================================
// SYSTEMS PANEL - Dashboard ejecutivo CyberPiezas PREMIUM
// ----------------------------------------------------------------------------
// Diseno premium con:
// - Gradientes animados de fondo (mesh-aurora)
// - Cards con hover lift + glow + shimmer
// - KPIs animados al cargar
// - Saludos dinamicos por hora
// - Solo suscriptores ven KPIs operativos (admin tiene su propio panel)
// - Consistente con la estetica premium de modales Veterinaria
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
    glowColor: "shadow-emerald-500/40",
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
    glowColor: "shadow-pink-500/40",
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
    glowColor: "shadow-amber-500/40",
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
    glowColor: "shadow-emerald-500/40",
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
    glowColor: "shadow-purple-500/40",
    accentColor: "purple",
    features: ["Perfil", "Bookings", "Redes", "Media"],
  },
  {
    id: "taqueria",
    name: "Sistema POS Taqueria",
    shortName: "Taqueria",
    description: "Taquerias rapidas: botones grandes, modificadores y comandas.",
    icon: "🌮",
    status: "active",
    path: "/taqueria",
    gradient: "from-orange-500 via-red-500 to-rose-600",
    glowColor: "shadow-orange-500/40",
    accentColor: "orange",
    features: ["Hora pico", "Modificadores", "Para llevar", "Rapido"],
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
  const [mounted, setMounted] = useState(false);

  // Animacion de entrada al montar
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const activeSystems = systems.filter((s) => s.status === "active");
  const comingSoonSystems = systems.filter((s) => s.status === "coming-soon");

  // ────────────────────────────────────────────────────────────────────
  // OPCION B: Si el usuario es admin de CyberPiezas, NO mostramos
  // metricas operativas de veterinaria. David tiene su propio panel
  // admin en /admin-cyberpiezas con metricas de negocio (MRR, etc).
  // Los suscriptores reales (Ana Karen) SI ven sus metricas operativas.
  // ────────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === "admin";

  const vetSummaryQuery = trpc.veterinaria.dashboard.summary.useQuery(
    undefined,
    {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: !isAdmin,
    }
  );
  const vetData = vetSummaryQuery.data;

  const handleSystemClick = (system: POSSystem) => {
    if (system.status === "active" && system.path) {
      setLocation(system.path);
    }
  };

  // Saludo dinamico segun hora
  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Buena madrugada" :
    hour < 12 ? "Buenos dias" :
    hour < 19 ? "Buenas tardes" : "Buenas noches";
  const greetingEmoji =
    hour < 6 ? "🌙" :
    hour < 12 ? "☀️" :
    hour < 19 ? "🌤️" : "🌙";
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* ============================================================ */}
      {/* MESH AURORA - gradientes animados de fondo                    */}
      {/* ============================================================ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-fuchsia-500/20 blur-[120px] animate-mesh-1" />
        <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/20 blur-[120px] animate-mesh-2" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px] animate-mesh-3" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[120px] animate-mesh-4" />
      </div>

      {/* Estilos custom para animaciones (Tailwind no las tiene built-in) */}
      <style>{`
        @keyframes mesh1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes mesh2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 60px) scale(1.15); }
        }
        @keyframes mesh3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.05); }
        }
        @keyframes mesh4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-mesh-1 { animation: mesh1 20s ease-in-out infinite; }
        .animate-mesh-2 { animation: mesh2 25s ease-in-out infinite; }
        .animate-mesh-3 { animation: mesh3 22s ease-in-out infinite; }
        .animate-mesh-4 { animation: mesh4 28s ease-in-out infinite; }
        .animate-count-up { animation: countUp 0.6s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .stagger-1 { animation-delay: 0.05s; opacity: 0; }
        .stagger-2 { animation-delay: 0.1s; opacity: 0; }
        .stagger-3 { animation-delay: 0.15s; opacity: 0; }
        .stagger-4 { animation-delay: 0.2s; opacity: 0; }
        .stagger-5 { animation-delay: 0.25s; opacity: 0; }
        .card-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* ============================================================ */}
      {/* TOPBAR PREMIUM                                                  */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          <button
            onClick={() => setLocation("/sistemas")}
            className="flex items-center gap-2.5 group flex-shrink-0"
            title="Inicio de sistemas"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-cyan-500 blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                CP
              </div>
            </div>
            <span className="text-white font-bold tracking-tight text-sm hidden sm:inline">
              CyberPiezas
            </span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setLocation("/cyberpiezas")}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-xs sm:text-sm font-medium hover:scale-105"
              title="Inicio"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </button>
            <button
              onClick={() => setLocation("/mis-ingresos")}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-xs sm:text-sm font-medium hover:scale-105"
              title="Caja registradora"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Caja</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setLocation("/admin-cyberpiezas")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-all text-xs sm:text-sm font-medium hover:scale-105"
                title="Centro Cyberpiezas"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Centro</span>
              </button>
            )}
            <button
              onClick={() => setLocation("/cajeros-usuarios")}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all hover:rotate-90 duration-300"
              title="Configuracion"
            >
              <Settings className="w-4 h-4" />
            </button>
            {user && (
              <div className="ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-white/10 flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-cyan-500 blur opacity-50" />
                  <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                    {firstName.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[11px] font-semibold text-white leading-tight">{firstName || user.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{isAdmin ? "Admin" : "Usuario"}</p>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-16">
        {/* ============================================================ */}
        {/* HERO PREMIUM con saludo dinamico animado                      */}
        {/* ============================================================ */}
        <header className={"mb-10 lg:mb-12 " + (mounted ? "animate-slide-up stagger-1" : "opacity-0")}>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-0">
              {/* Brand chip premium con glow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-md border border-white/15 rounded-full mb-4 shadow-lg shadow-fuchsia-500/10">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  CyberPiezas · Tu plataforma
                </span>
                <span className="text-fuchsia-300">·</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  {isAdmin ? "Admin" : "Premium"}
                </span>
              </div>

              {/* Saludo grande con gradient */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                <span className="inline-block mr-2 text-3xl sm:text-4xl">{greetingEmoji}</span>
                {greeting}
                {firstName ? (
                  <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400 sm:ml-2">
                    {firstName}
                  </span>
                ) : ""}
              </h1>
              <p className="text-base text-slate-400 mt-3 max-w-xl leading-relaxed">
                {isAdmin
                  ? "Centro de control admin. Accede a cualquier sistema con un click."
                  : "Tu centro de control unificado. Todo lo que necesitas en un solo lugar."}
              </p>
            </div>

            {/* Indicadores live con animacion ping */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-sm font-bold text-emerald-300">{activeSystems.length} activos</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-lg shadow-amber-500/10">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">{comingSoonSystems.length} en camino</span>
              </div>
            </div>
          </div>

          {/* KPI Bar - solo suscriptores no-admin con datos */}
          {!isAdmin && vetData && vetData.hasData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
              <KpiTile
                icon={<Calendar className="w-4 h-4" />}
                label="Citas hoy"
                value={vetData.appointmentsToday.toString()}
                color="cyan"
                delay={1}
              />
              <KpiTile
                icon={<TrendingUp className="w-4 h-4" />}
                label="Ventas hoy"
                value={"$" + vetData.totalToday.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                color="emerald"
                delay={2}
              />
              <KpiTile
                icon={<AlertCircle className="w-4 h-4" />}
                label="Por cobrar"
                value={vetData.pendingPayments.toString()}
                color={vetData.pendingPayments > 0 ? "amber" : "slate"}
                delay={3}
              />
              <KpiTile
                icon={<Syringe className="w-4 h-4" />}
                label="Vacunas proximas"
                value={vetData.vaccinesDueSoon.toString()}
                color={vetData.vaccinesDueSoon > 0 ? "purple" : "slate"}
                delay={4}
              />
            </div>
          )}

          {/* Card especial para admin (en lugar de KPIs operativos) */}
          {isAdmin && (
            <div className="mt-6 relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-500/10">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 flex-shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white mb-0.5">Modo administrador</p>
                  <p className="text-xs text-amber-200/80 leading-snug">
                    Accede al <button onClick={() => setLocation("/admin-cyberpiezas")} className="font-bold text-amber-300 hover:text-amber-200 underline">Centro CyberPiezas</button> para metricas de negocio (suscriptores, ingresos).
                  </p>
                </div>
                <button
                  onClick={() => setLocation("/admin-cyberpiezas")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-lg shadow-lg shadow-amber-500/30 hover:scale-105 transition-all flex-shrink-0"
                >
                  Ir al centro
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ============================================================ */}
        {/* SECCION ACTIVOS - cards con stagger animation                 */}
        {/* ============================================================ */}
        <section className={"mb-10 " + (mounted ? "animate-slide-up stagger-2" : "opacity-0")}>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-slate-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Disponibles ahora
              </h2>
              <p className="text-xs text-slate-500 mt-1">Click en cualquier card para entrar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {activeSystems.map((system, idx) => (
              <div
                key={system.id}
                className={mounted ? "animate-slide-up" : "opacity-0"}
                style={{ animationDelay: 0.1 + idx * 0.08 + "s", animationFillMode: "forwards" }}
              >
                <SystemCard
                  system={system}
                  onClick={() => handleSystemClick(system)}
                  vetData={system.id === "veterinaria" && !isAdmin ? vetData : null}
                  vetLoading={system.id === "veterinaria" && !isAdmin && vetSummaryQuery.isLoading}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCION EN CAMINO - chips animados                            */}
        {/* ============================================================ */}
        <section className={"mb-12 " + (mounted ? "animate-slide-up stagger-3" : "opacity-0")}>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/80 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                En camino
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {comingSoonSystems.length} sistemas en preparacion · vienen pronto
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comingSoonSystems.map((system, idx) => (
              <div
                key={system.id}
                className={mounted ? "animate-slide-up" : "opacity-0"}
                style={{ animationDelay: 0.4 + idx * 0.06 + "s", animationFillMode: "forwards" }}
              >
                <ComingSoonChip system={system} />
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* FOOTER con marca premium                                      */}
        {/* ============================================================ */}
        <footer className={"text-center pt-10 border-t border-white/10 " + (mounted ? "animate-slide-up stagger-4" : "opacity-0")}>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-cyan-500 blur-md opacity-50" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-500/30">
                CP
              </div>
            </div>
            <span className="text-white font-bold tracking-tight text-lg">CyberPiezas</span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Una plataforma, multiples verticales.
            <span className="block mt-1 text-slate-500">
              Construida en Mexico para que tu negocio crezca sin cambiar de sistema.
            </span>
          </p>
          <p className="text-xs text-slate-600 mt-4">
            ¿No ves tu giro?{" "}
            <button
              onClick={() => setLocation("/cyberpiezas")}
              className="text-fuchsia-400 hover:text-fuchsia-300 underline font-semibold"
            >
              Cuentanos
            </button>{" "}
            y lo construimos para ti.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function KpiTile({ icon, label, value, color, delay }: { icon: any; label: string; value: string; color: string; delay: number }) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/40 text-amber-300 shadow-amber-500/10",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/40 text-purple-300 shadow-purple-500/10",
    slate: "from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400 shadow-slate-500/5",
  };

  return (
    <div
      className={"bg-gradient-to-br backdrop-blur-md border rounded-2xl px-3 sm:px-4 py-3 shadow-lg animate-count-up hover:scale-[1.03] transition-transform " + colorMap[color]}
      style={{ animationDelay: 0.3 + delay * 0.08 + "s", animationFillMode: "forwards", opacity: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{value}</p>
    </div>
  );
}

function SystemCard({ system, onClick, vetData, vetLoading, isAdmin }: {
  system: POSSystem;
  onClick: () => void;
  vetData: any;
  vetLoading: boolean;
  isAdmin: boolean;
}) {
  // Para admin: mostrar acceso rapido sin metricas operativas
  // Para suscriptor: mostrar sus metricas reales si es vet, "proximamente" si es otro
  const renderInlineMetrics = () => {
    if (isAdmin) {
      return (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-300/80 italic">
          <Crown className="w-3 h-3" />
          <span>Acceso administrativo</span>
        </div>
      );
    }
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
          <div className="mt-3 flex flex-wrap gap-1.5">
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
          <div className="mt-3 text-xs text-slate-500 italic flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Empieza registrando tu primer cliente</span>
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
        "group relative w-full bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-white/30 rounded-3xl p-5 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden " +
        system.glowColor
      }
    >
      {/* Orb decorativo que crece en hover */}
      <div className={"absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl opacity-20 group-hover:opacity-60 group-hover:scale-125 transition-all duration-700 bg-gradient-to-br " + system.gradient} />

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 card-shimmer" />
      </div>

      <div className="relative">
        {/* Header: icon grande + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="relative">
            <div className={"absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity bg-gradient-to-br " + system.gradient} />
            <div className={"relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-500 " + system.gradient + " " + system.glowColor}>
              {system.icon}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Activo</span>
          </span>
        </div>

        {/* Title + Description */}
        <h3 className="text-xl font-bold text-white tracking-tight mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-white group-hover:to-slate-300 transition-all">
          {system.shortName}
        </h3>
        <p className="text-xs text-slate-400 leading-snug line-clamp-2 min-h-[2.4rem]">
          {system.description}
        </p>

        {/* Metricas inline */}
        {renderInlineMetrics()}

        {/* Features */}
        <div className="flex flex-wrap gap-1 mt-3 mb-4">
          {system.features.slice(0, 4).map((feature, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-medium rounded-md group-hover:bg-white/10 group-hover:border-white/20 group-hover:text-slate-300 transition-all"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA con efecto */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 group-hover:border-white/20 transition-colors">
          <span className="text-xs font-bold text-white">Abrir sistema</span>
          <div className={"w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center group-hover:scale-110 group-hover:translate-x-1 transition-all duration-300 shadow-lg " + system.gradient + " " + system.glowColor}>
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}

function MetricPill({ icon, value, color }: { icon: any; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/15 border-cyan-500/40 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
    amber: "bg-amber-500/15 border-amber-500/40 text-amber-200",
    purple: "bg-purple-500/15 border-purple-500/40 text-purple-200",
    slate: "bg-white/5 border-white/15 text-slate-300",
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
    <div className="group relative bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md border border-white/5 hover:border-white/20 rounded-2xl px-3.5 py-3 transition-all overflow-hidden hover:scale-[1.03] hover:-translate-y-0.5 duration-300">
      <div className={"absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition-opacity bg-gradient-to-br " + system.gradient} />
      <div className="relative flex items-center gap-2.5">
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all " + system.gradient}>
          {system.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white tracking-tight truncate">{system.shortName}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
            Proximamente
          </p>
        </div>
      </div>
    </div>
  );
}
