import { useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { ArrowRight, Sparkles } from "lucide-react";

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
  features: string[];
}

const systems: POSSystem[] = [
  {
    id: "boutique",
    name: "Sistema POS Boutique",
    shortName: "Boutique",
    description: "Para tiendas de ropa, zapatos y accesorios. Variantes por talla y color.",
    icon: "👗",
    status: "active",
    path: "/dashboard",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    glowColor: "shadow-pink-500/30",
    features: ["Variantes", "Sucursales", "Inventario", "Reportes"],
  },
  {
    id: "abarrotes",
    name: "Sistema POS Abarrotes",
    shortName: "Abarrotes",
    description: "Tienditas de la esquina con codigo de barras, bascula y productos a granel.",
    icon: "🛒",
    status: "active",
    path: "/abarrotes-pos",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    glowColor: "shadow-amber-500/30",
    features: ["Codigo de barras", "Granel", "Inventario", "Bascula"],
  },
  {
    id: "veterinaria",
    name: "Sistema POS Veterinaria",
    shortName: "Veterinaria",
    description: "Clinicas veterinarias con expediente clinico, vacunas y citas.",
    icon: "🐾",
    status: "active",
    path: "/veterinaria-pos",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    glowColor: "shadow-teal-500/30",
    features: ["Mascotas", "Expediente", "Vacunas", "Citas"],
  },
  {
    id: "verduleria",
    name: "Sistema POS Verduleria",
    shortName: "Verduleria",
    description: "Frutas y verduras con grid visual de emojis. Ventas rapidas en segundos.",
    icon: "🥕",
    status: "active",
    path: "/verduleria",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    glowColor: "shadow-emerald-500/30",
    features: ["Grid visual", "Por kg", "Frutas/verduras", "Venta rapida"],
  },
  {
    id: "restaurant",
    name: "Sistema POS Restaurante",
    shortName: "Restaurante",
    description: "Restaurantes y fondas con mesas, comandas y modulo de cocina.",
    icon: "🍽️",
    status: "coming-soon",
    gradient: "from-red-500 via-orange-500 to-amber-500",
    glowColor: "shadow-orange-500/30",
    features: ["Mesas", "Comandas", "Cocina", "Propinas"],
  },
  {
    id: "cafeteria",
    name: "Sistema POS Cafeteria",
    shortName: "Cafeteria",
    description: "Cafeterias con bebidas personalizables, combos y carta digital.",
    icon: "☕",
    status: "coming-soon",
    gradient: "from-amber-700 via-orange-600 to-yellow-700",
    glowColor: "shadow-amber-600/30",
    features: ["Bebidas", "Combos", "Modificadores", "Carta"],
  },
  {
    id: "refaccionaria",
    name: "Sistema POS Refaccionaria",
    shortName: "Refaccionaria",
    description: "Refacciones y autopartes con busqueda por compatibilidad de vehiculo.",
    icon: "🚗",
    status: "coming-soon",
    gradient: "from-blue-500 via-cyan-500 to-sky-500",
    glowColor: "shadow-cyan-500/30",
    features: ["Catalogo", "Compatibilidad", "Marcas", "Modelos"],
  },
  {
    id: "panaderia",
    name: "Sistema POS Panaderia",
    shortName: "Panaderia",
    description: "Panaderias con piezas, charolas, recetas y produccion del dia.",
    icon: "🥖",
    status: "coming-soon",
    gradient: "from-yellow-600 via-orange-500 to-red-600",
    glowColor: "shadow-orange-500/30",
    features: ["Piezas", "Charolas", "Recetas", "Produccion"],
  },
];

export default function SystemsPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const activeSystems = systems.filter((s) => s.status === "active");
  const comingSoonSystems = systems.filter((s) => s.status === "coming-soon");

  const handleSystemClick = (system: POSSystem) => {
    if (system.status === "active" && system.path) {
      setLocation(system.path);
    }
  };

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Orbes decorativos de fondo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Header */}
        <header className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Centro Unificado
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-5">
            {firstName ? "Hola, " + firstName : "Tus sistemas"}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400 mt-1">
              en un solo lugar
            </span>
          </h1>

          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Selecciona el sistema POS que necesitas. Disenado para cada tipo de negocio,
            con la misma filosofia: simple, rapido, confiable.
          </p>

          {/* Stats row */}
          <div className="mt-8 inline-flex items-center gap-4 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-emerald-400">{activeSystems.length} activos</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              <span className="text-sm font-medium text-slate-300">{comingSoonSystems.length} en camino</span>
            </div>
          </div>
        </header>

        {/* Activos: featured cards */}
        <section className="mb-12 lg:mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Disponibles ahora
            </h2>
            <p className="text-xs text-slate-500">{activeSystems.length} sistemas listos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {activeSystems.map((system) => (
              <button
                key={system.id}
                onClick={() => handleSystemClick(system)}
                className={
                  "group relative bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-3xl p-6 lg:p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden " +
                  system.glowColor
                }
              >
                {/* Orb decorativo */}
                <div className={"absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity bg-gradient-to-br " + system.gradient} />

                <div className="relative">
                  {/* Icon + Badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={"w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br shadow-lg " + system.gradient + " " + system.glowColor}>
                      {system.icon}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Activo</span>
                    </span>
                  </div>

                  {/* Title + Description */}
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
                    {system.shortName}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">
                    {system.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {system.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 text-[11px] font-medium rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-sm font-bold text-white">Acceder al sistema</span>
                    <div className={"w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center group-hover:translate-x-1 transition-transform " + system.gradient}>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Proximamente: cards mas dim */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Proximamente
            </h2>
            <p className="text-xs text-slate-600">En desarrollo</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {comingSoonSystems.map((system) => (
              <div
                key={system.id}
                className="relative bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-5 opacity-70 hover:opacity-90 transition-opacity overflow-hidden"
              >
                <div className={"absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br " + system.gradient} />

                <div className="relative">
                  <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br opacity-60 mb-3 " + system.gradient}>
                    {system.icon}
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-1">
                    {system.shortName}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                    {system.description}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Proximamente</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer mensaje */}
        <footer className="text-center pt-8 border-t border-white/10">
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            <span className="text-white font-bold">CyberPiezas POS</span> - Una plataforma, multiples verticales.
            Construida para que tu negocio crezca sin cambiar de sistema.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            ¿No ves tu giro? Cuentanos y lo construimos para ti.
          </p>
        </footer>
      </div>
    </div>
  );
}
