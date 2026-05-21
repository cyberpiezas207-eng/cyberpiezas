// ============================================================================
// AccessDeniedScreen
// ----------------------------------------------------------------------------
// Pantalla compartida de "Sin acceso" para los POS privados de CyberPiezas.
// Se muestra cuando hasAccess({posCode}) devuelve false.
//
// RESPONSABILIDADES (UI pura):
// - Renderiza la card de bloqueo con el tema visual del POS dado
// - Muestra beneficios + 2 CTAs (Ver planes / Volver)
// - NO consulta permisos, NO usa hooks, NO importa DashboardLayout
// - NO conoce rutas: el padre pasa onViewPlans y onBack como callbacks
//
// MODE:
// - "standalone": pantalla completa con min-h-screen y fondo propio
//   (para POS fuera del DashboardLayout: Boutique, Abarrotes, Veterinaria)
// - "embedded": sin background global, para insertarse dentro de un layout
//   existente (Verduleria, Tarima usan esto dentro de DashboardLayout)
//
// API:
//   <AccessDeniedScreen
//     posCode="verduleria"
//     description="..."
//     benefits={["...", "..."]}
//     onViewPlans={() => navigateTo("/pricing?posCode=verduleria")}
//     onBack={() => navigateTo("/sistemas")}
//     mode="embedded"
//   />
// ============================================================================

export type AccessDeniedPosCode =
  | "boutique"
  | "abarrotes"
  | "veterinaria"
  | "verduleria"
  | "tarima"
  | "taqueria"
  | "papeleria";

export type AccessDeniedScreenProps = {
  posCode: AccessDeniedPosCode;
  description: string;
  benefits: string[];
  onViewPlans: () => void;
  onBack: () => void;
  mode?: "standalone" | "embedded";
  className?: string;
};

// ============================================================================
// POS_THEMES: registro interno de presentacion por POS
// Cada entrada define todos los colores, gradientes y textos derivados
// del posCode. Asi el consumidor solo pasa posCode y todo lo demas se
// resuelve aqui (single source of truth visual).
// ============================================================================
type PosTheme = {
  posName: string;
  icon: string;
  subtitle: string;
  // Header (gradient + tints difuminados que decoran)
  headerGradient: string;
  tintTopRight: string;
  tintBottomLeft: string;
  subtitleColor: string;
  // Highlights card (beneficios)
  accentBg: string;
  accentBorder: string;
  accentText: string;
  // CTA primario "Ver planes"
  ctaGradient: string;
  ctaShadow: string;
};

const POS_THEMES: Record<AccessDeniedPosCode, PosTheme> = {
  boutique: {
    posName: "Boutique",
    icon: "👗",
    subtitle: "Punto de venta para moda",
    headerGradient: "from-purple-500 via-pink-500 to-rose-500",
    tintTopRight: "bg-pink-300/30",
    tintBottomLeft: "bg-purple-400/20",
    subtitleColor: "text-pink-50",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-100",
    accentText: "text-purple-900",
    ctaGradient: "from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
    ctaShadow: "shadow-purple-500/30",
  },
  abarrotes: {
    posName: "Abarrotes",
    icon: "🛒",
    subtitle: "Punto de venta para tienda",
    headerGradient: "from-orange-500 via-amber-500 to-red-500",
    tintTopRight: "bg-orange-300/30",
    tintBottomLeft: "bg-amber-400/20",
    subtitleColor: "text-orange-50",
    accentBg: "bg-orange-50",
    accentBorder: "border-orange-100",
    accentText: "text-orange-900",
    ctaGradient: "from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
    ctaShadow: "shadow-orange-500/30",
  },
  veterinaria: {
    posName: "Veterinaria",
    icon: "🐾",
    subtitle: "Sistema integral de gestion clinica",
    headerGradient: "from-emerald-500 via-teal-500 to-cyan-500",
    tintTopRight: "bg-emerald-300/30",
    tintBottomLeft: "bg-cyan-400/20",
    subtitleColor: "text-emerald-50",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-100",
    accentText: "text-emerald-900",
    ctaGradient: "from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600",
    ctaShadow: "shadow-emerald-500/30",
  },
  verduleria: {
    posName: "Verduleria",
    icon: "🥕",
    subtitle: "Punto de venta visual",
    headerGradient: "from-emerald-500 via-green-600 to-teal-600",
    tintTopRight: "bg-emerald-300/30",
    tintBottomLeft: "bg-green-400/20",
    subtitleColor: "text-emerald-50",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-100",
    accentText: "text-emerald-900",
    ctaGradient: "from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
    ctaShadow: "shadow-emerald-500/30",
  },
  tarima: {
    posName: "Mi Tarima",
    icon: "🎤",
    subtitle: "Plataforma para artistas",
    headerGradient: "from-fuchsia-600 via-purple-600 to-indigo-700",
    tintTopRight: "bg-pink-400/30",
    tintBottomLeft: "bg-cyan-400/20",
    subtitleColor: "text-fuchsia-100",
    accentBg: "bg-fuchsia-50",
    accentBorder: "border-fuchsia-100",
    accentText: "text-fuchsia-900",
    ctaGradient: "from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700",
    ctaShadow: "shadow-fuchsia-500/30",
  },
  taqueria: {
    posName: "Taqueria",
    icon: "🌮",
    subtitle: "Punto de venta para taqueria",
    headerGradient: "from-amber-500 via-orange-500 to-rose-500",
    tintTopRight: "bg-amber-300/30",
    tintBottomLeft: "bg-rose-400/20",
    subtitleColor: "text-amber-50",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-100",
    accentText: "text-amber-900",
    ctaGradient: "from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600",
    ctaShadow: "shadow-amber-500/30",
  },
  papeleria: {
    posName: "Papeleria",
    icon: "📓",
    subtitle: "Punto de venta para papeleria",
    headerGradient: "from-sky-500 via-blue-600 to-indigo-600",
    tintTopRight: "bg-sky-300/30",
    tintBottomLeft: "bg-blue-400/20",
    subtitleColor: "text-sky-50",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-100",
    accentText: "text-sky-900",
    ctaGradient: "from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700",
    ctaShadow: "shadow-sky-500/30",
  },
};

// ============================================================================
// Componente principal (presentacional puro)
// ============================================================================
export default function AccessDeniedScreen({
  posCode,
  description,
  benefits,
  onViewPlans,
  onBack,
  mode = "embedded",
  className,
}: AccessDeniedScreenProps) {
  const theme = POS_THEMES[posCode];

  // Defensive: si por alguna razon llega un posCode no registrado, no romper
  if (!theme) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-700">Sistema no disponible.</p>
        </div>
      </div>
    );
  }

  // Container externo: cambia segun mode
  // - standalone: pantalla full con bg propio (POS sin DashboardLayout)
  // - embedded: solo el area de la card (POS dentro de DashboardLayout)
  const containerBase =
    mode === "standalone"
      ? "min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50"
      : "min-h-[70vh] flex items-center justify-center px-4 py-12";

  const containerClass = className ? containerBase + " " + className : containerBase;

  return (
    <div className={containerClass}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header con gradiente tematico + bolas blur decorativas */}
        <div
          className={
            "bg-gradient-to-br px-8 pt-12 pb-14 text-center relative overflow-hidden " +
            theme.headerGradient
          }
        >
          <div
            className={
              "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl " +
              theme.tintTopRight
            }
          />
          <div
            className={
              "absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl " +
              theme.tintBottomLeft
            }
          />
          <div className="relative">
            <div className="text-7xl mb-3">{theme.icon}</div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
              {theme.posName}
            </h1>
            <p className={"text-sm font-medium " + theme.subtitleColor}>
              {theme.subtitle}
            </p>
          </div>
        </div>

        {/* Body: descripcion + beneficios + CTAs */}
        <div className="px-8 py-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Necesitas una suscripcion activa
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
          </div>

          {/* Card de beneficios con accent del POS */}
          <div
            className={
              "rounded-2xl p-4 space-y-2 border " +
              theme.accentBg +
              " " +
              theme.accentBorder
            }
          >
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className={"flex items-center gap-2 text-sm " + theme.accentText}
              >
                <span className="text-base">✓</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTAs: primaria (Ver planes) + secundaria (Volver) */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onViewPlans}
              className={
                "w-full min-h-[48px] h-12 rounded-full bg-gradient-to-r " +
                theme.ctaGradient +
                " text-white font-bold shadow-lg active:scale-[0.98] transition-all " +
                theme.ctaShadow
              }
            >
              Ver planes
            </button>
            <button
              onClick={onBack}
              className="w-full min-h-[48px] h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold active:scale-[0.98] transition-all"
            >
              Volver a mi panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
