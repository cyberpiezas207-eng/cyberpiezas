import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  MapPin,
  Car,
  Calendar,
  Users,
  ArrowRight,
  Plus,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Phone,
  History,
  FileText,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Home,
  Search,
  Handshake,
  X,
  Check,
  Heart,
  MessageCircle,
  Compass,
  Coffee,
} from "lucide-react";

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

const TERMS_VERSION = "2026-05";
const PRIVACY_VERSION = "2026-05";

export default function MobilityHome() {
  const { user } = useAuth() as any;
  const profileQuery = trpc.mobility.profile.getMine.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return <UnauthenticatedView />;
  }

  if (profileQuery.isLoading) {
    return <LoadingState />;
  }

  const profile = profileQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <BuildingNav />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <Header />

        {!profile ? (
          <UnregisteredFlow onSuccess={() => profileQuery.refetch()} />
        ) : (
          <RegisteredFlow profile={profile} />
        )}

        <Footer />
      </div>
    </div>
  );
}

// =============================================================================
// HEADER NAV DEL EDIFICIO
// =============================================================================

function BuildingNav() {
  const [, setLocation] = useLocation();
  return (
    <nav className="relative sticky top-0 z-50 backdrop-blur-xl bg-slate-950/60 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setLocation("/cyberpiezas")}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-bold transition-colors group"
          >
            <Home className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="tracking-tight">CyberPiezas</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white font-medium">Mobility</span>
        </div>

        <button
          onClick={() => setLocation("/cyberpiezas")}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al edificio
        </button>
      </div>
    </nav>
  );
}

function Header() {
  return (
    <header className="text-center mb-10 lg:mb-14">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
          Mobility · Piloto cerrado
        </span>
      </div>

      <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-5">
        Viajes compartidos
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 mt-1">
          entre personas reales
        </span>
      </h1>

      <p className="text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Conecta con personas que ya recorren tu mismo camino. Sin algoritmos opacos,
        sin estrellas, sin pagos por la plataforma.
      </p>
    </header>
  );
}

function UnauthenticatedView() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <BuildingNav />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <Header />

        <div className="max-w-md w-full text-center bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 mx-auto mb-10">
          <div className={"w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 bg-gradient-to-br " + MOBILITY_ACCENT + " " + MOBILITY_GLOW + " shadow-lg"}>
            🚗
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Mobility está en piloto cerrado</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Para entrar necesitas una invitación y haber iniciado sesión.
          </p>
          <button
            onClick={() => setLocation("/login")}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-full h-11 font-semibold transition-colors"
          >
            Iniciar sesión
          </button>
        </div>

        <HowItWorksBlock />
        <DifferentFromOthersBlock />
        <CommonRoutesBlock />
        <PilotStateBlock />
        <GoodExperienceBlock />
        <MorelosMapBlock />

        <Footer />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <BuildingNav />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Cargando tu cuarto de Mobility...</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FLUJOS: SIN PERFIL vs CON PERFIL
// =============================================================================

function UnregisteredFlow({ onSuccess }: { onSuccess: () => void }) {
  return (
    <>
      <HowItWorksBlock />
      <DifferentFromOthersBlock />
      <CommonRoutesBlock />
      <PilotStateBlock />
      <GoodExperienceBlock />
      <MorelosMapBlock />
      <CreateProfileSection onSuccess={onSuccess} />
    </>
  );
}

function RegisteredFlow({ profile }: { profile: any }) {
  const isDriverVerified = profile.role === "driver_verified" || profile.role === "both";
  const isDriverPending = profile.role === "driver_pending";

  return (
    <>
      <ProfileSummary profile={profile} />
      {isDriverPending && <PendingVerificationBanner />}
      {isDriverVerified && <DriverRidesSection />}
      <AvailableRidesSection />
      {!isDriverVerified && !isDriverPending && <BecomeDriverCTA />}

      <CommonRoutesBlock />
      <PilotStateBlock />
      <GoodExperienceBlock />
      <MorelosMapBlock />
    </>
  );
}

// =============================================================================
// BLOQUE 1: CÓMO FUNCIONA MOBILITY (3 pasos)
// =============================================================================

function HowItWorksBlock() {
  const steps = [
    {
      icon: <Search className="w-5 h-5 text-white" />,
      title: "Encuentras personas que ya recorren rutas similares",
      desc: "Mobility no asigna viajes. Tú buscas, tú decides, tú coordinas.",
    },
    {
      icon: <Heart className="w-5 h-5 text-white" />,
      title: "Revisas contexto humano, no estrellas",
      desc: "Las reseñas son texto escrito por personas reales que ya viajaron juntas. Sin puntajes, sin rankings.",
    },
    {
      icon: <Handshake className="w-5 h-5 text-white" />,
      title: "Coordinan directamente entre ustedes",
      desc: "Cuando alguien aprueba tu solicitud, se libera el WhatsApp. CyberPiezas no cobra comisión.",
    },
  ];

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="Cómo funciona"
        title="Mobility, en 3 pasos"
        subtitle="Es diferente a Uber o BlaBlaCar. Te explicamos cómo."
      />

      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div
            key={i}
            className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-slate-900 border-2 border-blue-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-400">{i + 1}</span>
            </div>
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-2 bg-gradient-to-br " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW}>
              {step.icon}
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-snug">
              {step.title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Moderación humana
        </span>
        <span className="inline-flex items-center gap-1.5">
          <X className="w-3 h-3 text-rose-400" />
          Sin pagos por plataforma
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Piloto cerrado
        </span>
      </div>
    </section>
  );
}

// =============================================================================
// BLOQUE 2: QUÉ HACE DIFERENTE A MOBILITY (NO usamos vs SÍ usamos)
// =============================================================================

function DifferentFromOthersBlock() {
  const notUsing = [
    "Estrellas y puntajes numéricos",
    "Rankings ocultos por algoritmo",
    "Algoritmos opacos que deciden por ti",
    "Comisiones por cada viaje",
    "Boost pagado para aparecer arriba",
    "Gamificación artificial",
  ];

  const using = [
    "Reseñas cualitativas con palabras reales",
    "Moderación hecha por personas, no bots",
    "Contexto humano antes de cada viaje",
    "Verificación de identidad con INE",
    "Cultura comunitaria explícita",
    "Transparencia sobre el momento del piloto",
  ];

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="Qué nos hace diferentes"
        title="Lo que NO hacemos / Lo que SÍ hacemos"
        subtitle="Mobility no es Uber, no es BlaBlaCar, no es una startup buscando escala. Es infraestructura comunitaria local."
      />

      <div className="grid md:grid-cols-2 gap-4">
        {/* NO usamos */}
        <div className="bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <X className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-rose-200">No usamos</h3>
          </div>
          <ul className="space-y-2">
            {notUsing.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <X className="w-3.5 h-3.5 text-rose-400/70 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SÍ usamos */}
        <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-emerald-200">Sí usamos</h3>
          </div>
          <ul className="space-y-2">
            {using.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// BLOQUE 3: RUTAS COMUNES EN MORELOS
// =============================================================================

function CommonRoutesBlock() {
  const routes = [
    { from: "Cuernavaca", to: "UAEM", reason: "Estudiantes y personal académico" },
    { from: "Jiutepec", to: "Cuernavaca Centro", reason: "Comuters diarios" },
    { from: "Cuautla", to: "Cuernavaca", reason: "Viaje interurbano frecuente" },
    { from: "Huitzilac", to: "Cuernavaca", reason: "Acceso desde la zona norte" },
    { from: "Tepoztlán", to: "Cuernavaca", reason: "Movilidad turística y laboral" },
    { from: "Yautepec", to: "Cuernavaca", reason: "Conexión zona oriente" },
  ];

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="Donde ya hay caminos"
        title="Rutas comunes en Morelos"
        subtitle="Estas son rutas donde probablemente ya hay personas recorriendo el mismo camino que tú. No son viajes activos: son potencial real."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {routes.map((route, i) => (
          <div
            key={i}
            className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <p className="text-sm text-white font-bold truncate">{route.from}</p>
              <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <p className="text-sm text-white font-bold truncate">{route.to}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{route.reason}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center mt-5 italic">
        Si conoces a alguien que ya hace alguna de estas rutas, invítalo al piloto.
      </p>
    </section>
  );
}

// =============================================================================
// BLOQUE 4: ESTADO DEL PILOTO
// =============================================================================

function PilotStateBlock() {
  return (
    <section className="mb-12">
      <div className="relative bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-3xl p-7 lg:p-9 overflow-hidden">
        <div className={"absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br " + MOBILITY_ACCENT} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
              Estado del piloto · Mayo 2026
            </span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
            Estamos construyendo esto
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              lentamente, a propósito
            </span>
          </h2>

          <p className="text-sm lg:text-base text-slate-300 leading-relaxed max-w-3xl mb-6">
            Mobility está en piloto cerrado. Preferimos crecer despacio para priorizar
            confianza y comunidad antes que escala rápida. Si las primeras personas no se
            sienten seguras, no vale la pena tener 10,000.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                Lo que estamos probando
              </p>
              <p className="text-sm text-white leading-snug">
                Si la confianza local sustituye a las estrellas como sistema de reputación.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
                Lo que estamos aprendiendo
              </p>
              <p className="text-sm text-white leading-snug">
                Cómo manejar disputas humanas sin convertir todo en cifras.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">
                Lo que viene
              </p>
              <p className="text-sm text-white leading-snug">
                Apertura gradual conforme se valide la cultura del cuarto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// BLOQUE 5: QUÉ HACE UNA BUENA EXPERIENCIA
// =============================================================================

function GoodExperienceBlock() {
  const examples = [
    {
      icon: <Clock className="w-4 h-4" />,
      title: "Avisa retrasos temprano",
      desc: "Si vas a llegar tarde, escribe antes de que pase. Diez minutos de aviso valen más que mil disculpas después.",
    },
    {
      icon: <X className="w-4 h-4" />,
      title: "Cancela con tiempo",
      desc: "Cancelar está bien. Cancelar sin avisar, no. Si algo cambia, dilo en cuanto lo sepas.",
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      title: "Confirma cuando llegues",
      desc: "Un mensaje breve cierra el ciclo. Le dice al otro que todo salió bien.",
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: "Agradece el viaje",
      desc: "No tienes que escribir una novela. Un 'gracias por el aventón' construye comunidad.",
    },
    {
      icon: <Heart className="w-4 h-4" />,
      title: "Deja reseñas útiles",
      desc: "Describe la experiencia con tus palabras. No hay estrellas que dar — hay contexto que compartir.",
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: "Rechaza sin agresión",
      desc: "Si decides no aprobar a alguien, puedes hacerlo sin lastimar. Una frase amable basta.",
    },
  ];

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="Cultura del cuarto"
        title="Qué hace una buena experiencia en Mobility"
        subtitle="No son reglas. Son ejemplos de cómo se convive en este cuarto. La cultura no se explica, se modela."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {examples.map((ex, i) => (
          <div
            key={i}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-300">
                {ex.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{ex.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{ex.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// BLOQUE 6: MAPA MINIMALISTA DE MORELOS
// =============================================================================

function MorelosMapBlock() {
  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="Geografía local"
        title="Morelos, conectado por sus caminos"
        subtitle="Las ciudades donde Mobility tiene sentido. Por ahora pequeño. Por ahora honesto."
      />

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 lg:p-9 relative overflow-hidden">
        <div className={"absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-10 bg-gradient-to-br " + MOBILITY_ACCENT} />

        <svg viewBox="0 0 500 350" className="w-full h-auto max-h-[420px] relative">
          <defs>
            <linearGradient id="mapRoute" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid sutil de fondo */}
          <g stroke="rgba(148, 163, 184, 0.06)" strokeWidth="0.5">
            <path d="M0 87 L500 87" />
            <path d="M0 175 L500 175" />
            <path d="M0 263 L500 263" />
            <path d="M125 0 L125 350" />
            <path d="M250 0 L250 350" />
            <path d="M375 0 L375 350" />
          </g>

          {/* Líneas de rutas */}
          <g stroke="url(#mapRoute)" strokeWidth="1.5" fill="none" strokeDasharray="4 3">
            {/* Cuernavaca - UAEM (cercano) */}
            <line x1="180" y1="180" x2="220" y2="195" />
            {/* Cuernavaca - Jiutepec */}
            <line x1="180" y1="180" x2="240" y2="210" />
            {/* Cuernavaca - Cuautla */}
            <line x1="180" y1="180" x2="380" y2="160" />
            {/* Cuernavaca - Huitzilac */}
            <line x1="180" y1="180" x2="160" y2="90" />
            {/* Cuernavaca - Tepoztlán */}
            <line x1="180" y1="180" x2="270" y2="110" />
            {/* Cuernavaca - Yautepec */}
            <line x1="180" y1="180" x2="330" y2="220" />
            {/* Cuautla - Yautepec */}
            <line x1="380" y1="160" x2="330" y2="220" />
            {/* Tepoztlán - Yautepec */}
            <line x1="270" y1="110" x2="330" y2="220" />
          </g>

          {/* Ciudades */}
          <CityMarker x={180} y={180} name="Cuernavaca" main />
          <CityMarker x={220} y={195} name="UAEM" small />
          <CityMarker x={240} y={210} name="Jiutepec" />
          <CityMarker x={380} y={160} name="Cuautla" />
          <CityMarker x={160} y={90} name="Huitzilac" />
          <CityMarker x={270} y={110} name="Tepoztlán" />
          <CityMarker x={330} y={220} name="Yautepec" />

          {/* Compás visual sutil */}
          <g transform="translate(450, 40)" opacity="0.4">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#475569" strokeWidth="0.5" />
            <text x="0" y="-22" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="system-ui">N</text>
            <path d="M0 -12 L3 0 L0 12 L-3 0 Z" fill="#3b82f6" opacity="0.5" />
          </g>
        </svg>

        <p className="text-xs text-slate-500 text-center mt-4 italic">
          Mapa ilustrativo de las principales conexiones donde Mobility puede operar hoy.
        </p>
      </div>
    </section>
  );
}

function CityMarker({ x, y, name, main, small }: { x: number; y: number; name: string; main?: boolean; small?: boolean }) {
  const radius = main ? 8 : small ? 4 : 6;
  const labelOffset = main ? 18 : 12;
  return (
    <g>
      {main && (
        <>
          <circle cx={x} cy={y} r={radius * 2.5} fill="url(#cityGlow)" />
          <circle cx={x} cy={y} r={radius * 1.8} fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4">
            <animate attributeName="r" values={`${radius * 1.5};${radius * 2.8};${radius * 1.5}`} dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <circle cx={x} cy={y} r={radius} fill={main ? "#3b82f6" : "#06b6d4"} />
      <circle cx={x} cy={y} r={radius / 2} fill="#fff" />
      <text
        x={x}
        y={y + labelOffset + 5}
        textAnchor="middle"
        fill={main ? "#fff" : "#cbd5e1"}
        fontSize={main ? "12" : "10"}
        fontWeight={main ? "700" : "500"}
        fontFamily="system-ui"
      >
        {name}
      </text>
    </g>
  );
}

// =============================================================================
// COMPONENTE AUXILIAR: Header de sección
// =============================================================================

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-3">
        <span className="w-1 h-1 rounded-full bg-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// CREAR PERFIL CON ACEPTACIÓN DE T&C
// =============================================================================

function CreateProfileSection({ onSuccess }: { onSuccess: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [baseCity, setBaseCity] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.mobility.profile.create.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 2) {
      setError("El nombre que mostrarás debe tener al menos 2 caracteres.");
      return;
    }
    if (phone.trim().length < 8) {
      setError("El teléfono no parece estar completo. Debe ser tu WhatsApp.");
      return;
    }
    if (!acceptedTerms) {
      setError("Necesitas aceptar los Términos y el Aviso de Privacidad para continuar.");
      return;
    }
    createMutation.mutate({
      displayName: displayName.trim(),
      phone: phone.trim(),
      bio: bio.trim() || undefined,
      baseCity: baseCity.trim() || undefined,
      acceptedTermsVersion: TERMS_VERSION,
      acceptedPrivacyVersion: PRIVACY_VERSION,
    });
  };

  const isFormValid =
    displayName.trim().length >= 2 && phone.trim().length >= 8 && acceptedTerms;

  return (
    <section className="max-w-2xl mx-auto mb-12">
      <SectionHeader
        eyebrow="Bienvenido al piloto"
        title="Crea tu perfil de Mobility"
        subtitle="Si tu correo está en la lista, podrás continuar."
      />

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 mb-6">
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold">1.</span>
            <span>Creas tu perfil con nombre y WhatsApp.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold">2.</span>
            <span>Si quieres ofrecer viajes, verificas tu identidad (INE + selfie).</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold">3.</span>
            <span>El dinero entre conductor y pasajero pasa por fuera. CyberPiezas no cobra comisiones.</span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7"
      >
        <h3 className="text-lg font-bold text-white mb-5">Tu perfil de Mobility</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Cómo te mostraremos
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nombre o como te conocen"
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Puede ser distinto de tu nombre legal. Es lo que verán otros usuarios.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> WhatsApp para coordinar viajes
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 777 123 4567"
              maxLength={32}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Tu WhatsApp NO es visible para otros usuarios. Solo se entrega
              cuando hay una reserva aprobada entre tú y otra persona.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Ciudad base <span className="text-slate-500 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={baseCity}
              onChange={(e) => setBaseCity(e.target.value)}
              placeholder="Cuernavaca, Cuautla, etc."
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Sobre ti <span className="text-slate-500 normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Algo breve. ¿Estudias? ¿Trabajas? ¿Por qué quieres compartir viajes?"
              rows={3}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {/* VERSIÓN CORTA CÁLIDA + CHECKBOX OBLIGATORIO */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-start gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <h4 className="text-sm font-bold text-white">Antes de continuar</h4>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 mb-4 space-y-4 text-xs text-slate-300 leading-relaxed">
            <p>
              Queremos explicarte rápidamente cómo funciona Mobility y qué hacemos con tus datos.
            </p>

            <div>
              <p className="font-bold text-white mb-2">Lo que hacemos con tus datos</p>
              <ul className="space-y-1 list-disc list-inside ml-1 text-slate-400">
                <li>Usamos tu información para operar Mobility y ayudarte a conectar con otras personas.</li>
                <li>Verificamos identidad para reducir riesgos y evitar cuentas falsas.</li>
                <li>Guardamos reportes y reseñas para mantener contexto comunitario.</li>
                <li>Protegemos información sensible como INE y selfies con acceso restringido.</li>
                <li>Respondemos solicitudes de privacidad y apelaciones por personas reales.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white mb-2">Lo que NO hacemos</p>
              <ul className="space-y-1 list-disc list-inside ml-1 text-slate-400">
                <li>No vendemos tus datos.</li>
                <li>No usamos tus documentos para entrenar IA.</li>
                <li>No mostramos tu INE ni tu selfie a otros usuarios.</li>
                <li>No procesamos pagos entre personas.</li>
                <li>No usamos estrellas ni puntajes automáticos.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white mb-2">Tus derechos</p>
              <p className="text-slate-400">
                Puedes pedir copia de tus datos, corregir información, solicitar eliminación
                de tu cuenta, o preguntar cómo usamos tu información. Contacto:{" "}
                <span className="text-emerald-300 font-mono">privacidad@cyberpiezas.com</span>
              </p>
            </div>

            <div>
              <p className="font-bold text-white mb-2">Si algo sale mal</p>
              <p className="text-slate-400">
                Puedes reportar situaciones dentro de Mobility. Las revisiones las hace una persona del equipo.
                Si tomamos una decisión sobre tu cuenta, te explicamos qué pasó y puedes apelar una vez
                salvo casos graves de violencia física comprobable, fraude documentado o conducta sexual hacia menores.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.open("/terms-mobility", "_blank")}
                className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 transition-colors"
              >
                Leer Términos completos <ExternalLink className="w-3 h-3" />
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => window.open("/privacidad-mobility", "_blank")}
                className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                Leer Aviso de Privacidad completo <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="sr-only"
              />
              <div
                className={
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all " +
                  (acceptedTerms
                    ? "bg-gradient-to-br " + MOBILITY_ACCENT + " border-transparent"
                    : "bg-white/5 border-white/30 group-hover:border-white/50")
                }
              >
                {acceptedTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-slate-200 leading-snug">
              He leído y acepto los{" "}
              <span className="text-blue-300 font-semibold">Términos y Condiciones</span> y el{" "}
              <span className="text-emerald-300 font-semibold">Aviso de Privacidad</span> de Mobility.
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending || !isFormValid}
          className={"mt-6 w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full h-11 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creando perfil...
            </>
          ) : (
            <>
              Crear mi perfil <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center mt-4">
          Si tu correo no está en la lista, te lo diremos sin penalizaciones.
        </p>
      </form>
    </section>
  );
}

// =============================================================================
// COMPONENTES DEL USUARIO YA REGISTRADO
// =============================================================================

function ProfileSummary({ profile }: { profile: any }) {
  const [, setLocation] = useLocation();
  const isVerified = profile.role === "driver_verified" || profile.role === "both";
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
      <button
        onClick={() => setLocation("/mobility/perfil/" + profile.userId)}
        className="flex items-center gap-4 group"
      >
        <div className={"w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br " + MOBILITY_ACCENT + " shadow-lg"}>
          <span className="text-lg font-bold text-white">
            {profile.displayName?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <div className="text-left">
          <p className="text-base font-bold text-white group-hover:underline">{profile.displayName}</p>
          <p className="text-xs text-slate-400">
            {profile.baseCity ? profile.baseCity + " · " : ""}
            {isVerified ? "Conductor verificado" : profile.role === "driver_pending" ? "Verificación en revisión" : "Pasajero"}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLocation("/mobility/mis-viajes")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-slate-300 hover:text-white transition-all"
        >
          <History className="w-3.5 h-3.5" /> Mis viajes
        </button>

        {isVerified && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Verificado
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function PendingVerificationBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold text-amber-200 mb-1">
          Tu verificación está en revisión
        </p>
        <p className="text-xs text-amber-300/80 leading-relaxed">
          Una persona del equipo está revisando tu INE y selfie. Cuando aprobemos,
          ya podrás publicar viajes. Mientras tanto puedes solicitar lugares como pasajero.
        </p>
      </div>
    </div>
  );
}

function DriverRidesSection() {
  const [, setLocation] = useLocation();
  const myRidesQuery = trpc.mobility.rides.listMine.useQuery();

  const myActiveRides = (myRidesQuery.data ?? []).filter(
    (r: any) => r.status === "published" || r.status === "full",
  );

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Mis viajes publicados
        </h2>
        <button
          onClick={() => setLocation("/mobility/publicar")}
          className={"inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW + " hover:opacity-90 transition-opacity"}
        >
          <Plus className="w-3.5 h-3.5" /> Publicar viaje
        </button>
      </div>

      {myRidesQuery.isLoading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : myActiveRides.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-center">
          <Car className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">No tienes viajes publicados</p>
          <p className="text-xs text-slate-500">
            Publica un viaje cuando tengas una ruta planeada y quieras compartir lugares.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myActiveRides.map((ride: any) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </section>
  );
}

function AvailableRidesSection() {
  const ridesQuery = trpc.mobility.rides.listPublished.useQuery({ limit: 20 });

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Viajes disponibles
        </h2>
        <p className="text-xs text-slate-500">
          {ridesQuery.data?.length ?? 0} {(ridesQuery.data?.length ?? 0) === 1 ? "viaje" : "viajes"}
        </p>
      </div>

      {ridesQuery.isLoading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : !ridesQuery.data || ridesQuery.data.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-base font-bold text-white mb-2">Aún no hay viajes publicados</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Mobility apenas empieza. Conforme se sumen más personas al piloto,
            aparecerán más viajes aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ridesQuery.data.map((ride: any) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </section>
  );
}

function BecomeDriverCTA() {
  const [, setLocation] = useLocation();
  return (
    <section className="mb-10">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={"w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">
              ¿Quieres ofrecer viajes?
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Para ser conductor verificas tu identidad con INE + selfie.
              Una persona del equipo revisa manualmente. Toma máximo 24 horas.
            </p>
          </div>
        </div>
        <button
          onClick={() => setLocation("/mobility/verificacion")}
          className={"inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW + " hover:opacity-90 transition-opacity"}
        >
          Verificarme <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

function RideCard({ ride }: { ride: any }) {
  const [, setLocation] = useLocation();
  const departureDate = new Date(ride.departureAt);

  const dateStr = departureDate.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = departureDate.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={() => setLocation("/mobility/viaje/" + ride.id)}
      className="group relative bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
    >
      <div className={"absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity bg-gradient-to-br " + MOBILITY_ACCENT} />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="capitalize">{dateStr}</span>
            <span>·</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{timeStr}</span>
          </div>
          {ride.status === "full" && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
              Lleno
            </span>
          )}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-white font-medium line-clamp-1">{ride.originText}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-white font-medium line-clamp-1">{ride.destinationText}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {ride.seatsAvailable}/{ride.seatsTotal}
            </span>
            {ride.suggestedCostPerSeat && parseFloat(ride.suggestedCostPerSeat) > 0 && (
              <span className="text-blue-300 font-bold">
                ${parseFloat(ride.suggestedCostPerSeat).toFixed(0)}
              </span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}

function Footer() {
  return (
    <footer className="text-center pt-8 border-t border-white/10 mt-12">
      <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
        Mobility es un cuarto de <span className="text-white font-bold">CyberPiezas</span>.
        Sin algoritmos opacos, sin estrellas, sin pagos por la plataforma.
      </p>
      <p className="text-xs text-slate-600 mt-2">
        ¿Algo no salió bien? Escríbenos. Hay una persona del otro lado.
      </p>
    </footer>
  );
}
