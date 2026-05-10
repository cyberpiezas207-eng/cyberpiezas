import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Camera,
  Check,
  Cloud,
  Cpu,
  CreditCard,
  Gift,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  LineChart,
  LogIn,
  MessageCircle,
  Monitor,
  Package,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  ShoppingBasket,
  TrendingUp,
  Truck,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

// ============================================================================
// HOMEPAGE APPLE-STYLE PREMIUM
// ============================================================================

export function CyberpiezasHome() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth() as any;

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <NavBar isAuthenticated={isAuthenticated} setLocation={setLocation} />
      <Hero setLocation={setLocation} isAuthenticated={isAuthenticated} />
      <TrustBar />
      <Wizard setLocation={setLocation} />
      <Industries setLocation={setLocation} />
      <Hardware />
      <Services />
      <Features />
      <HowItWorks />
      <Referrals isAuthenticated={isAuthenticated} setLocation={setLocation} />
      <Pricing setLocation={setLocation} isAuthenticated={isAuthenticated} />
      <Testimonials />
      <FinalCTA setLocation={setLocation} isAuthenticated={isAuthenticated} />
      <Footer />
      <FloatingButtons />
    </div>
  );
}

// ============================================================================
// FLOATING BUTTONS - Mobile/Tablet UX (back + scroll top)
// ============================================================================

function FloatingButtons() {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButtons(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!showButtons) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4">
      <button
        onClick={() => window.history.length > 1 && window.history.back()}
        className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all"
        title="Atras"
      >
        <ArrowLeft className="w-5 h-5 text-slate-700" />
      </button>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all"
        title="Subir al inicio"
      >
        <ArrowUp className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

// ============================================================================
// NAVBAR
// ============================================================================

function NavBar({ isAuthenticated, setLocation }: { isAuthenticated: boolean; setLocation: (path: string) => void }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
            C
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">CyberPiezas</span>
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#sistemas" className="hover:text-slate-900 transition-colors">Sistemas</a>
          <a href="#hardware" className="hover:text-slate-900 transition-colors">Hardware</a>
          <a href="#servicios" className="hover:text-slate-900 transition-colors">Servicios</a>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/sistemas")}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold"
            >
              Mi Panel <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold"
            >
              <LogIn className="w-3.5 h-3.5 mr-1" /> Iniciar sesion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// HERO
// ============================================================================

function Hero({ setLocation, isAuthenticated }: { setLocation: (p: string) => void; isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Decorativos de fondo sutiles */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full mb-8 shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />
          Sistema POS para tu negocio
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.05]">
          El sistema POS{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
            que tu negocio merece
          </span>
        </h1>

        <p className="mt-6 text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Boutiques, veterinarias, abarrotes. Un sistema hecho a la medida de tu industria.
          Vende mas, controla mejor, crece mas rapido.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => {
              const el = document.getElementById("wizard");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12 px-8 text-base font-semibold shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:scale-[1.02]"
          >
            Encontrar mi sistema <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button
            onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-12 px-8 text-base font-semibold"
          >
            {isAuthenticated ? "Ir a mi panel" : "Iniciar sesion"}
          </Button>
        </div>

        <p className="mt-6 text-sm text-slate-500 flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-500" />
          Sin tarjeta de credito
          <span className="mx-1.5">•</span>
          <Check className="w-4 h-4 text-emerald-500" />
          Listo en minutos
        </p>

        {/* Mockup ilustrativo */}
        <div className="mt-16 lg:mt-20 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 shadow-2xl shadow-slate-900/10 p-1">
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-400 ml-2 font-mono">cyberpiezas.app</span>
              </div>
              <div className="p-8 lg:p-12 text-left">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Ventas hoy</p>
                    <p className="text-2xl font-bold text-slate-900">$12,450</p>
                    <p className="text-xs text-emerald-600 mt-1">+18% vs ayer</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Tickets</p>
                    <p className="text-2xl font-bold text-slate-900">47</p>
                    <p className="text-xs text-purple-600 mt-1">12 esta hora</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Inventario</p>
                    <p className="text-2xl font-bold text-slate-900">324</p>
                    <p className="text-xs text-amber-600 mt-1">SKUs activos</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                        style={{ width: 90 - i * 15 + "%" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TRUST BAR
// ============================================================================

function TrustBar() {
  return (
    <section className="bg-white border-y border-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">
          Construido para negocios reales
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "3", label: "Sistemas POS" },
            { num: "100%", label: "En la nube" },
            { num: "24/7", label: "Disponible" },
            { num: "0", label: "Contratos largos" },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{item.num}</p>
              <p className="text-sm text-slate-500 font-medium mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WIZARD - "¿Qué necesitas?"
// ============================================================================

function Wizard({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <section id="wizard" className="bg-slate-50 py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Empieza aqui</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            ¿Que tipo de negocio tienes?
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Selecciona tu industria. Te llevamos directo al sistema diseñado para ti.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              id: "boutique",
              name: "Boutique",
              desc: "Tiendas de ropa, accesorios, calzado",
              icon: Store,
              color: "purple",
              path: "/dashboard",
              gradient: "from-purple-500 to-pink-500",
            },
            {
              id: "veterinaria",
              name: "Veterinaria",
              desc: "Clinicas con expediente clinico y agenda",
              icon: Stethoscope,
              color: "emerald",
              path: "/veterinaria-pos",
              gradient: "from-emerald-500 to-cyan-500",
            },
            {
              id: "abarrotes",
              name: "Abarrotes",
              desc: "Tiendas con codigo de barras y bascula",
              icon: ShoppingBasket,
              color: "amber",
              path: "/abarrotes-pos",
              gradient: "from-amber-500 to-orange-500",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.path)}
                className="group bg-white rounded-2xl p-7 text-left border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all"
              >
                <div className={"w-14 h-14 rounded-2xl bg-gradient-to-br " + item.gradient + " flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-5"}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5">{item.name}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">{item.desc}</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  Conocer mas <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center mt-8 text-sm text-slate-500">
          Mas industrias proximamente: Restaurante, Cafeteria, Refaccionaria
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// INDUSTRIES (showcase con detalle)
// ============================================================================

function Industries({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <section id="sistemas" className="bg-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3">Sistemas especializados</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Construido para tu industria
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            No es un POS generico. Cada sistema esta pensado para los procesos de tu negocio.
          </p>
        </div>

        {/* Veterinaria - destacado */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 rounded-3xl border border-emerald-100/60 overflow-hidden mb-8">
          <div className="grid lg:grid-cols-2 gap-8 p-8 lg:p-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-4">
                <Stethoscope className="w-3.5 h-3.5" /> NUEVO
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                POS Veterinaria
              </h3>
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Expediente clinico, agenda de citas, recordatorios de vacunas, control de inventario y punto de venta. Todo en un sistema.
              </p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "Expediente clinico de cada mascota",
                  "Agenda de citas con confirmacion",
                  "Catalogo de servicios y productos",
                  "Recibos personalizados con tu marca",
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-700">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setLocation("/veterinaria-pos")}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 px-6 font-semibold"
              >
                Conocer Veterinaria <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
            <div className="relative h-64 lg:h-80 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-2xl flex items-center justify-center text-9xl">
              🐾
            </div>
          </div>
        </div>

        {/* Boutique + Abarrotes */}
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: "POS Boutique",
              desc: "Inventario por talla y color, variantes, multi-sucursal.",
              icon: "👗",
              gradient: "from-purple-50 to-pink-50",
              accent: "purple",
              features: ["Variantes por talla y color", "Multi-sucursal", "Reportes por categoria"],
              path: "/dashboard",
            },
            {
              name: "POS Abarrotes",
              desc: "Codigo de barras, bascula, productos a granel.",
              icon: "🛒",
              gradient: "from-amber-50 to-orange-50",
              accent: "amber",
              features: ["Lectura de codigo de barras", "Productos a granel", "Inventario rapido"],
              path: "/abarrotes-pos",
            },
          ].map((item) => (
            <div key={item.name} className={"bg-gradient-to-br " + item.gradient + " rounded-2xl p-8 border border-slate-200/60"}>
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.name}</h3>
              <p className="text-slate-600 mb-5">{item.desc}</p>
              <ul className="space-y-2 mb-6">
                {item.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setLocation(item.path)}
                className="text-slate-900 font-bold text-sm flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Ver detalles <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES - 6 caracts clave
// ============================================================================

function Features() {
  const features = [
    { icon: Wifi, title: "Funciona sin internet", desc: "Sigue vendiendo aunque se caiga la red. Todo se sincroniza al volver." },
    { icon: Cloud, title: "100% en la nube", desc: "Accede desde cualquier dispositivo. Datos seguros y siempre disponibles." },
    { icon: LineChart, title: "Reportes en tiempo real", desc: "Ventas, inventario y operacion al instante. Toma decisiones con datos." },
    { icon: ShieldCheck, title: "Datos protegidos", desc: "Backups automaticos. Nadie pierde su informacion." },
    { icon: MessageCircle, title: "Soporte en WhatsApp", desc: "Escribenos y te atendemos rapido. Sin tickets eternos." },
    { icon: CreditCard, title: "Sin contratos largos", desc: "Pagas mes a mes. Cancela cuando quieras, sin letras chiquitas." },
  ];

  return (
    <section id="caracteristicas" className="bg-slate-50 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3">Lo esencial</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Todo lo que necesitas, sin lo que estorba
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-7 border border-slate-200/60 hover:border-slate-300 hover:shadow-lg transition-all group">
                <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS
// ============================================================================

function HowItWorks() {
  const steps = [
    { num: "01", title: "Elige tu sistema", desc: "Boutique, veterinaria o abarrotes. Lo activamos al instante." },
    { num: "02", title: "Configura tu negocio", desc: "Sube tus productos, datos y empieza a operar en minutos." },
    { num: "03", title: "Vende y crece", desc: "Operacion diaria mas fluida, datos para decidir mejor." },
  ];

  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-cyan-600 uppercase tracking-wider mb-3">Asi de simple</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            En 3 pasos estas operando
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="text-7xl font-bold bg-gradient-to-br from-emerald-400 to-cyan-500 bg-clip-text text-transparent mb-4 leading-none">
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================

function Pricing({ setLocation, isAuthenticated }: { setLocation: (p: string) => void; isAuthenticated: boolean }) {
  const plans = [
    {
      name: "Gratis",
      price: "$0",
      period: "Para siempre",
      desc: "Perfecto para empezar y probar el sistema.",
      cta: "Empezar gratis",
      featured: false,
      features: [
        "1 sistema POS",
        "Hasta 50 productos",
        "Reportes basicos",
        "Soporte por correo",
      ],
    },
    {
      name: "Pro",
      price: "$499",
      period: "/mes",
      desc: "Para negocios establecidos que quieren crecer.",
      cta: "Probar 30 dias gratis",
      featured: true,
      features: [
        "1 sistema POS completo",
        "Productos ilimitados",
        "Reportes avanzados",
        "Multi-sucursal (hasta 3)",
        "Soporte prioritario WhatsApp",
        "Backups automaticos",
      ],
    },
    {
      name: "Premium",
      price: "$999",
      period: "/mes",
      desc: "Para multiples negocios o cadenas.",
      cta: "Hablar con ventas",
      featured: false,
      features: [
        "Multiples sistemas POS",
        "Sucursales ilimitadas",
        "Cajeros ilimitados",
        "API personalizada",
        "Soporte 24/7 dedicado",
        "Capacitacion incluida",
      ],
    },
  ];

  return (
    <section id="precios" className="bg-gradient-to-b from-slate-50 to-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-3">Sin sorpresas</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Precios transparentes
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Sin contratos largos. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.featured
                  ? "bg-slate-900 text-white rounded-3xl p-8 shadow-2xl shadow-slate-900/20 relative scale-105"
                  : "bg-white rounded-3xl p-8 border border-slate-200/80"
              }
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 text-xs font-bold rounded-full">
                  MAS POPULAR
                </div>
              )}
              <h3 className={"text-lg font-bold mb-1 " + (plan.featured ? "text-white" : "text-slate-900")}>
                {plan.name}
              </h3>
              <p className={"text-sm mb-6 " + (plan.featured ? "text-slate-400" : "text-slate-600")}>
                {plan.desc}
              </p>
              <div className="mb-6">
                <span className={"text-5xl font-bold tracking-tight " + (plan.featured ? "text-white" : "text-slate-900")}>
                  {plan.price}
                </span>
                <span className={"text-sm ml-1 " + (plan.featured ? "text-slate-400" : "text-slate-500")}>
                  {plan.period}
                </span>
              </div>
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className={
                  plan.featured
                    ? "w-full bg-white hover:bg-slate-100 text-slate-900 rounded-full h-11 font-semibold mb-6"
                    : "w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 font-semibold mb-6"
                }
              >
                {plan.cta}
              </Button>
              <ul className="space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className={"flex items-start gap-2 text-sm " + (plan.featured ? "text-slate-200" : "text-slate-700")}>
                    <Check className={"w-4 h-4 flex-shrink-0 mt-0.5 " + (plan.featured ? "text-emerald-400" : "text-emerald-500")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center mt-12 text-sm text-slate-500">
          ¿Necesitas factura SAT? Modulo de facturacion electronica disponible como complemento.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS
// ============================================================================

function Testimonials() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3">Confianza real</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Negocios que ya operan con CyberPiezas
          </h2>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 lg:p-12 border border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-5">⭐⭐⭐⭐⭐</div>
            <blockquote className="text-2xl lg:text-3xl font-medium text-slate-900 leading-relaxed mb-6">
              "Antes anotaba todo en libreta. Ahora controlo mi inventario, ventas y clientes desde el celular. Cambio mi negocio."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                M
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900">Maria G.</p>
                <p className="text-sm text-slate-500">Boutique Mariangel, Cuernavaca</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function FinalCTA({ setLocation, isAuthenticated }: { setLocation: (p: string) => void; isAuthenticated: boolean }) {
  return (
    <section className="bg-slate-50 py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />

          <div className="relative">
            <Zap className="w-12 h-12 text-emerald-300 mx-auto mb-5" />
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight mb-4">
              ¿Listo para hacer crecer tu negocio?
            </h2>
            <p className="text-lg text-slate-300 max-w-xl mx-auto mb-8">
              Empieza gratis hoy. Sin tarjeta de credito, sin contratos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className="bg-white hover:bg-slate-100 text-slate-900 rounded-full h-12 px-8 text-base font-semibold shadow-xl"
              >
                Empezar gratis <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("[CyberPiezas] Quiero conocer mas");
                  window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject;
                }}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 text-white rounded-full h-12 px-8 text-base font-semibold"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Hablar con ventas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <span className="font-bold text-lg text-slate-900">CyberPiezas</span>
            </div>
            <p className="text-sm text-slate-600 max-w-xs">
              Sistemas POS hechos a la medida de tu industria.
            </p>
          </div>

          <div className="flex gap-12 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Sistemas</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#sistemas" className="hover:text-slate-900">Boutique</a></li>
                <li><a href="#sistemas" className="hover:text-slate-900">Veterinaria</a></li>
                <li><a href="#sistemas" className="hover:text-slate-900">Abarrotes</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Tienda</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#hardware" className="hover:text-slate-900">Hardware</a></li>
                <li><a href="#hardware" className="hover:text-slate-900">Camaras</a></li>
                <li><a href="#hardware" className="hover:text-slate-900">Kits POS</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Servicios</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#servicios" className="hover:text-slate-900">Instalacion</a></li>
                <li><a href="#servicios" className="hover:text-slate-900">Capacitacion</a></li>
                <li><a href="#servicios" className="hover:text-slate-900">Migracion</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Empresa</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#precios" className="hover:text-slate-900">Precios</a></li>
                <li><a href="mailto:cyberpiezas207@gmail.com" className="hover:text-slate-900">Contacto</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CyberPiezas. Todos los derechos reservados.</p>
          <p className="text-sm text-slate-500">Hecho en Mexico 🇲🇽</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// HARDWARE - Catálogo de equipo
// ============================================================================

function Hardware() {
  const products = [
    {
      icon: Package,
      gradient: "from-blue-500 to-cyan-500",
      title: "Kit POS Completo",
      price: "Desde $7,499",
      desc: "Tablet + impresora termica + cajon + lector de codigo. Listo para vender.",
      tag: "MAS VENDIDO",
      tagColor: "bg-emerald-500",
    },
    {
      icon: Camera,
      gradient: "from-rose-500 to-pink-500",
      title: "Camaras de Seguridad",
      price: "Desde $2,999",
      desc: "Camaras IP con visor remoto. Cuida tu negocio desde el celular.",
      tag: "POPULAR",
      tagColor: "bg-purple-500",
    },
    {
      icon: Cpu,
      gradient: "from-purple-500 to-indigo-500",
      title: "Piezas para Computadora",
      price: "Cotizacion",
      desc: "Memorias, discos, fuentes, tarjetas. Mejora tu equipo de trabajo.",
      tag: null,
      tagColor: "",
    },
    {
      icon: Monitor,
      gradient: "from-amber-500 to-orange-500",
      title: "Monitores y Displays",
      price: "Desde $3,499",
      desc: "Pantallas touch para POS, monitores secundarios para cocina.",
      tag: null,
      tagColor: "",
    },
    {
      icon: HardDrive,
      gradient: "from-emerald-500 to-teal-500",
      title: "Almacenamiento y Backup",
      price: "Cotizacion",
      desc: "NAS, discos externos, soluciones de respaldo automatico.",
      tag: null,
      tagColor: "",
    },
    {
      icon: Wifi,
      gradient: "from-cyan-500 to-blue-500",
      title: "Redes y WiFi",
      price: "Cotizacion",
      desc: "Routers, repetidores, instalacion de red para tu negocio.",
      tag: null,
      tagColor: "",
    },
  ];

  const handleCotizar = (productName: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Cotizacion: " + productName);
    const body = encodeURIComponent("Hola, me interesa cotizar: " + productName + "\n\nMi nombre: \nNegocio: \nUbicacion: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="hardware" className="bg-slate-50 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3">Equipo y hardware</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Todo lo que tu negocio necesita
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Mas que un sistema. Te equipamos completo: POS, camaras, computo y mas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all relative"
              >
                {p.tag && (
                  <div className={"absolute -top-2.5 right-5 px-2.5 py-1 text-white text-[10px] font-bold rounded-full shadow-lg " + p.tagColor}>
                    {p.tag}
                  </div>
                )}
                <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + p.gradient + " flex items-center justify-center shadow-lg mb-4"}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{p.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{p.price}</p>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{p.desc}</p>
                <button
                  onClick={() => handleCotizar(p.title)}
                  className="w-full text-sm font-bold text-slate-900 hover:text-emerald-600 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                >
                  Cotizar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500 mb-3">¿Necesitas algo que no esta en la lista?</p>
          <Button
            onClick={() => handleCotizar("Equipo personalizado")}
            variant="outline"
            className="border-slate-300 hover:bg-slate-100 text-slate-900 rounded-full h-11 px-6 font-semibold"
          >
            <MessageCircle className="w-4 h-4 mr-1.5" /> Solicitar cotizacion personalizada
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SERVICES - Servicios profesionales
// ============================================================================

function Services() {
  const services = [
    {
      icon: Wrench,
      title: "Instalacion en sitio",
      price: "$1,500",
      desc: "Instalamos tu sistema completo, configuramos hardware y dejamos todo funcionando.",
      includes: ["Visita en sitio", "Configuracion completa", "Pruebas de operacion", "Garantia 30 dias"],
      gradient: "from-emerald-500 to-cyan-500",
    },
    {
      icon: GraduationCap,
      title: "Capacitacion personalizada",
      price: "$500",
      desc: "Una sesion 1:1 contigo o tu equipo para dominar el sistema en 1 hora.",
      includes: ["Sesion de 1 hora", "Material de apoyo", "Soporte 7 dias", "Grabacion incluida"],
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Truck,
      title: "Migracion de datos",
      price: "Desde $1,000",
      desc: "Tienes Aspel, Excel o libreta? Migramos tu inventario y clientes.",
      includes: ["Importacion completa", "Validacion de datos", "Sin perdida de info", "Lista en 48hrs"],
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: MessageCircle,
      title: "Soporte Premium WhatsApp",
      price: "$299/mes",
      desc: "Atencion prioritaria por WhatsApp. Respuesta en menos de 1 hora.",
      includes: ["WhatsApp 9am-9pm", "Resolucion rapida", "Cambios urgentes", "Sin costo adicional"],
      gradient: "from-rose-500 to-red-500",
    },
  ];

  const handleContratar = (service: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Servicio: " + service);
    const body = encodeURIComponent("Hola, me interesa contratar: " + service + "\n\nMi nombre: \nNegocio: \nMejor horario: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="servicios" className="bg-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Servicios profesionales</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Te acompanamos en cada paso
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            No te dejamos solo. Instalamos, capacitamos y soportamos para que tengas exito.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-7 border border-slate-200/60 hover:shadow-xl hover:shadow-slate-900/5 transition-all">
                <div className="flex items-start gap-4 mb-5">
                  <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + s.gradient + " flex items-center justify-center shadow-lg flex-shrink-0"}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{s.price}</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">{s.desc}</p>
                <ul className="space-y-2 mb-6">
                  {s.includes.map((inc, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {inc}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleContratar(s.title)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 font-semibold"
                >
                  Contratar <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// REFERRALS - Programa "Trae un amigo"
// ============================================================================

function Referrals({ isAuthenticated, setLocation }: { isAuthenticated: boolean; setLocation: (p: string) => void }) {
  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-10 lg:p-16 border border-emerald-100 shadow-xl shadow-emerald-500/5 text-center relative overflow-hidden">
          {/* Decorativos */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full mb-6 shadow-lg">
              <Gift className="w-3.5 h-3.5" /> Programa de referidos
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
              Trae a un amigo,{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                ganen ambos
              </span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
              Tu amigo se suscribe, ambos reciben <strong className="text-slate-900">1 mes GRATIS</strong> de su plan.
              Sin limite de referidos.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                <div className="text-3xl mb-2">1️⃣</div>
                <p className="font-bold text-slate-900 text-sm mb-1">Comparte tu link</p>
                <p className="text-xs text-slate-600">Cada usuario tiene un codigo unico</p>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                <div className="text-3xl mb-2">2️⃣</div>
                <p className="font-bold text-slate-900 text-sm mb-1">Tu amigo se suscribe</p>
                <p className="text-xs text-slate-600">Con tu link recibe descuento</p>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                <div className="text-3xl mb-2">3️⃣</div>
                <p className="font-bold text-slate-900 text-sm mb-1">Ambos ganan 1 mes</p>
                <p className="text-xs text-slate-600">Aplica al siguiente cobro</p>
              </div>
            </div>

            <Button
              onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full h-12 px-8 text-base font-bold shadow-xl shadow-emerald-500/30"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              {isAuthenticated ? "Ver mi codigo de referido" : "Empezar y obtener mi codigo"}
            </Button>

            <p className="mt-6 text-xs text-slate-500">
              Programa proximamente disponible para todos los usuarios.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
