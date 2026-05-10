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
  Heart,
  Handshake,
  LayoutDashboard,
  LineChart,
  LogIn,
  Mail,
  MessageCircle,
  Monitor,
  Package,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  ShoppingBasket,
  Truck,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";

export function CyberpiezasHome() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth() as any;
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <NavBar
        isAuthenticated={isAuthenticated}
        setLocation={setLocation}
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
      />
      <Hero
        setLocation={setLocation}
        isAuthenticated={isAuthenticated}
        onDemo={() => setShowDemoModal(true)}
      />
      <Wizard setLocation={setLocation} />
      <Industries setLocation={setLocation} />
      <Hardware />
      <Services />
      <Features />
      <Referrals isAuthenticated={isAuthenticated} setLocation={setLocation} />
      <Pricing setLocation={setLocation} isAuthenticated={isAuthenticated} />
      <FinalCTA
        setLocation={setLocation}
        isAuthenticated={isAuthenticated}
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
      />
      <Footer
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
      />
      <FloatingButtons />
      {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}
      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
      {showCollabModal && <CollabModal onClose={() => setShowCollabModal(false)} />}
    </div>
  );
}

function FloatingButtons() {
  const [showButtons, setShowButtons] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowButtons(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  if (!showButtons) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4">
      <button onClick={() => window.history.length > 1 && window.history.back()} className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all" title="Atras">
        <ArrowLeft className="w-5 h-5 text-slate-700" />
      </button>
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all" title="Subir al inicio">
        <ArrowUp className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

function NavBar({ isAuthenticated, setLocation, onSupport, onCollab }: { isAuthenticated: boolean; setLocation: (p: string) => void; onSupport: () => void; onCollab: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">C</div>
          <span className="font-bold text-lg tracking-tight text-slate-900">CyberPiezas</span>
        </button>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
          <a href="#sistemas" className="hover:text-slate-900 transition-colors">Sistemas</a>
          <a href="#hardware" className="hover:text-slate-900 transition-colors">Hardware</a>
          <a href="#servicios" className="hover:text-slate-900 transition-colors">Servicios</a>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          <button onClick={onCollab} className="hover:text-slate-900 transition-colors">Colaborar</button>
          <button onClick={onSupport} className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Apoyar
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button onClick={() => setLocation("/sistemas")} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Mi Panel
            </Button>
          ) : (
            <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold">
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Iniciar sesion
            </Button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center">
            <span className="text-lg leading-none">≡</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 gap-2 text-sm font-medium">
            <a href="#sistemas" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Sistemas</a>
            <a href="#hardware" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Hardware</a>
            <a href="#servicios" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Servicios</a>
            <a href="#precios" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Precios</a>
            <button onClick={() => { setMobileOpen(false); onCollab(); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-100">Colaborar</button>
            <button onClick={() => { setMobileOpen(false); onSupport(); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> Apoyar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ setLocation, isAuthenticated, onDemo }: { setLocation: (p: string) => void; isAuthenticated: boolean; onDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-20 pb-12 lg:pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full mb-6 shadow-lg">
          <Sparkles className="w-3.5 h-3.5" /> Sistema POS para tu negocio
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.05]">
          El sistema POS{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
            que tu negocio merece
          </span>
        </h1>
        <p className="mt-5 text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto">
          Boutiques, veterinarias, abarrotes. Un sistema hecho a la medida de tu industria.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => { const el = document.getElementById("wizard"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12 px-7 text-base font-semibold shadow-xl shadow-slate-900/10 hover:scale-[1.02] transition-all"
          >
            Encontrar mi sistema <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button onClick={onDemo} variant="outline" className="border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-12 px-7 text-base font-semibold">
            <Play className="w-4 h-4 mr-1.5" /> Ver demo
          </Button>
          {isAuthenticated && (
            <Button onClick={() => setLocation("/sistemas")} variant="outline" className="border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-full h-12 px-7 text-base font-semibold">
              <LayoutDashboard className="w-4 h-4 mr-1.5" /> Ir a mi panel
            </Button>
          )}
        </div>
        <div className="mt-10 inline-flex items-center gap-5 px-6 py-3 bg-white rounded-full border border-slate-200/60 shadow-sm text-sm flex-wrap justify-center max-w-full">
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /><span className="font-medium text-slate-700">3 sistemas POS</span></span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /><span className="font-medium text-slate-700">100% en la nube</span></span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /><span className="font-medium text-slate-700">Sin contratos</span></span>
        </div>
      </div>
    </section>
  );
}

function Wizard({ setLocation }: { setLocation: (p: string) => void }) {
  const items = [
    { id: "boutique", name: "Boutique", desc: "Ropa, accesorios, calzado", icon: Store, gradient: "from-purple-500 to-pink-500", path: "/dashboard" },
    { id: "veterinaria", name: "Veterinaria", desc: "Clinicas con expediente", icon: Stethoscope, gradient: "from-emerald-500 to-cyan-500", path: "/veterinaria-pos" },
    { id: "abarrotes", name: "Abarrotes", desc: "Codigo barras y bascula", icon: ShoppingBasket, gradient: "from-amber-500 to-orange-500", path: "/abarrotes-pos" },
  ];
  return (
    <section id="wizard" className="bg-slate-50 py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Empieza aqui</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">¿Que tipo de negocio tienes?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setLocation(item.path)} className="group bg-white rounded-2xl p-6 text-left border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all">
                <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + item.gradient + " flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-4"}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h3>
                <p className="text-slate-600 text-sm mb-3">{item.desc}</p>
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                  Conocer mas <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Industries({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <section id="sistemas" className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2">Sistemas especializados</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Construido para tu industria</h2>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 rounded-3xl border border-emerald-100/60 overflow-hidden mb-6">
          <div className="grid lg:grid-cols-2 gap-6 p-7 lg:p-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-3">
                <Stethoscope className="w-3.5 h-3.5" /> NUEVO
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mb-2">POS Veterinaria</h3>
              <p className="text-slate-600 mb-5">Expediente clinico, agenda de citas, control de inventario y punto de venta. Todo en uno.</p>
              <ul className="grid grid-cols-2 gap-2 mb-5">
                {["Expediente clinico", "Agenda de citas", "Catalogo servicios", "Recibos con tu marca"].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => setLocation("/veterinaria-pos")} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 px-5 font-semibold text-sm">
                Conocer Veterinaria <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
            <div className="h-48 lg:h-56 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-2xl flex items-center justify-center text-8xl">🐾</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: "POS Boutique", desc: "Inventario por talla y color, multi-sucursal.", icon: "👗", gradient: "from-purple-50 to-pink-50", features: ["Variantes", "Multi-sucursal", "Reportes"], path: "/dashboard" },
            { name: "POS Abarrotes", desc: "Codigo de barras, bascula, granel.", icon: "🛒", gradient: "from-amber-50 to-orange-50", features: ["Codigo barras", "Granel", "Inventario rapido"], path: "/abarrotes-pos" },
          ].map((item) => (
            <div key={item.name} className={"bg-gradient-to-br " + item.gradient + " rounded-2xl p-6 border border-slate-200/60"}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{item.name}</h3>
              <p className="text-slate-600 mb-4 text-sm">{item.desc}</p>
              <ul className="flex flex-wrap gap-2 mb-4">
                {item.features.map((f, i) => (
                  <li key={i} className="text-xs bg-white/60 px-2.5 py-1 rounded-full text-slate-700 font-medium">{f}</li>
                ))}
              </ul>
              <button onClick={() => setLocation(item.path)} className="text-slate-900 font-bold text-sm flex items-center gap-1.5 hover:gap-2.5 transition-all">
                Ver detalles <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hardware() {
  const products = [
    { icon: Package, gradient: "from-blue-500 to-cyan-500", title: "Kit POS Completo", price: "Desde $7,499", desc: "Tablet + impresora + cajon + lector. Listo para vender.", tag: "MAS VENDIDO", tagColor: "bg-emerald-500" },
    { icon: Camera, gradient: "from-rose-500 to-pink-500", title: "Camaras Seguridad", price: "Desde $2,999", desc: "Camaras IP con visor remoto desde el celular.", tag: "POPULAR", tagColor: "bg-purple-500" },
    { icon: Cpu, gradient: "from-purple-500 to-indigo-500", title: "Piezas Computadora", price: "Cotizacion", desc: "Memorias, discos, fuentes, tarjetas.", tag: null, tagColor: "" },
    { icon: Monitor, gradient: "from-amber-500 to-orange-500", title: "Monitores", price: "Desde $3,499", desc: "Pantallas touch para POS y secundarias.", tag: null, tagColor: "" },
    { icon: HardDrive, gradient: "from-emerald-500 to-teal-500", title: "Backup y Storage", price: "Cotizacion", desc: "NAS, discos, soluciones de respaldo.", tag: null, tagColor: "" },
    { icon: Wifi, gradient: "from-cyan-500 to-blue-500", title: "Redes y WiFi", price: "Cotizacion", desc: "Routers, repetidores, instalacion.", tag: null, tagColor: "" },
  ];

  const handleCotizar = (n: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Cotizacion: " + n);
    const body = encodeURIComponent("Hola, me interesa cotizar: " + n + "\n\nMi nombre: \nNegocio: \nUbicacion: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="hardware" className="bg-slate-50 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Tienda</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Equipo y hardware</h2>
          <p className="mt-2 text-slate-600">Mas que un sistema. Te equipamos completo.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all relative">
                {p.tag && (
                  <div className={"absolute -top-2.5 right-5 px-2.5 py-1 text-white text-[10px] font-bold rounded-full shadow-lg " + p.tagColor}>{p.tag}</div>
                )}
                <div className={"w-11 h-11 rounded-xl bg-gradient-to-br " + p.gradient + " flex items-center justify-center shadow-lg mb-3"}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-0.5">{p.title}</h3>
                <p className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{p.price}</p>
                <p className="text-slate-600 text-sm mb-4">{p.desc}</p>
                <button onClick={() => handleCotizar(p.title)} className="w-full text-sm font-bold text-slate-900 hover:text-emerald-600 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
                  Cotizar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    { icon: Wrench, title: "Instalacion", price: "$1,500", desc: "Te instalamos todo en sitio", gradient: "from-emerald-500 to-cyan-500" },
    { icon: GraduationCap, title: "Capacitacion", price: "$500", desc: "1 hora 1:1 con tu equipo", gradient: "from-purple-500 to-pink-500" },
    { icon: Truck, title: "Migracion", price: "Desde $1,000", desc: "Migramos tu inventario de Aspel/Excel", gradient: "from-amber-500 to-orange-500" },
    { icon: MessageCircle, title: "Soporte WhatsApp", price: "$299/mes", desc: "Respuesta en menos de 1 hora", gradient: "from-rose-500 to-red-500" },
  ];

  const handleContratar = (s: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Servicio: " + s);
    const body = encodeURIComponent("Hola, me interesa contratar: " + s + "\n\nMi nombre: \nNegocio: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="servicios" className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Servicios profesionales</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Te acompanamos en cada paso</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200/60 hover:shadow-lg transition-all">
                <div className={"w-10 h-10 rounded-xl bg-gradient-to-br " + s.gradient + " flex items-center justify-center shadow-md mb-3"}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="text-lg font-bold text-slate-900 tracking-tight mb-1">{s.price}</p>
                <p className="text-sm text-slate-600 mb-4">{s.desc}</p>
                <button onClick={() => handleContratar(s.title)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Contratar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Wifi, title: "Funciona sin internet", desc: "Sigue vendiendo aunque se caiga la red." },
    { icon: Cloud, title: "100% en la nube", desc: "Accede desde cualquier dispositivo." },
    { icon: LineChart, title: "Reportes en tiempo real", desc: "Decisiones con datos al instante." },
    { icon: ShieldCheck, title: "Datos protegidos", desc: "Backups automaticos siempre." },
    { icon: MessageCircle, title: "Soporte WhatsApp", desc: "Atencion rapida sin tickets eternos." },
    { icon: CreditCard, title: "Sin contratos", desc: "Pagas mes a mes, cancela cuando quieras." },
  ];
  return (
    <section className="bg-slate-50 py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Lo esencial</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Todo lo que necesitas, sin lo que estorba</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 mb-0.5">{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Referrals({ isAuthenticated, setLocation }: { isAuthenticated: boolean; setLocation: (p: string) => void }) {
  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 lg:p-12 border border-emerald-100 shadow-xl shadow-emerald-500/5 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full mb-4 shadow-lg">
              <Gift className="w-3.5 h-3.5" /> Programa de referidos
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Trae a un amigo, <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">ganen ambos</span>
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto mb-7">
              Tu amigo se suscribe, ambos reciben <strong className="text-slate-900">1 mes GRATIS</strong>.
            </p>
            <Button
              onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full h-11 px-7 text-base font-bold shadow-xl shadow-emerald-500/30"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              {isAuthenticated ? "Ver mi codigo" : "Empezar"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ setLocation, isAuthenticated }: { setLocation: (p: string) => void; isAuthenticated: boolean }) {
  const plans = [
    { name: "Gratis", price: "$0", period: "Para siempre", desc: "Perfecto para empezar.", cta: "Empezar gratis", featured: false, features: ["1 sistema POS", "Hasta 50 productos", "Reportes basicos", "Soporte email"] },
    { name: "Pro", price: "$499", period: "/mes", desc: "Para negocios establecidos.", cta: "Probar 30 dias gratis", featured: true, features: ["Productos ilimitados", "Reportes avanzados", "Multi-sucursal (3)", "Soporte WhatsApp", "Backups automaticos"] },
    { name: "Premium", price: "$999", period: "/mes", desc: "Para multiples negocios.", cta: "Hablar con ventas", featured: false, features: ["Multiples POS", "Sucursales ilimitadas", "Cajeros ilimitados", "API personalizada", "Soporte 24/7"] },
  ];
  return (
    <section id="precios" className="bg-gradient-to-b from-slate-50 to-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">Sin sorpresas</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Precios transparentes</h2>
          <p className="mt-2 text-slate-600">Sin contratos largos. Cancela cuando quieras.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan.name} className={plan.featured ? "bg-slate-900 text-white rounded-3xl p-7 shadow-2xl shadow-slate-900/20 relative md:scale-105" : "bg-white rounded-3xl p-7 border border-slate-200/80"}>
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 text-xs font-bold rounded-full">MAS POPULAR</div>
              )}
              <h3 className={"text-lg font-bold mb-1 " + (plan.featured ? "text-white" : "text-slate-900")}>{plan.name}</h3>
              <p className={"text-sm mb-4 " + (plan.featured ? "text-slate-400" : "text-slate-600")}>{plan.desc}</p>
              <div className="mb-5">
                <span className={"text-4xl font-bold tracking-tight " + (plan.featured ? "text-white" : "text-slate-900")}>{plan.price}</span>
                <span className={"text-sm ml-1 " + (plan.featured ? "text-slate-400" : "text-slate-500")}>{plan.period}</span>
              </div>
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className={plan.featured ? "w-full bg-white hover:bg-slate-100 text-slate-900 rounded-full h-10 font-semibold mb-5 text-sm" : "w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 font-semibold mb-5 text-sm"}
              >
                {plan.cta}
              </Button>
              <ul className="space-y-2">
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
      </div>
    </section>
  );
}

function FinalCTA({ setLocation, isAuthenticated, onSupport, onCollab }: { setLocation: (p: string) => void; isAuthenticated: boolean; onSupport: () => void; onCollab: () => void }) {
  return (
    <section className="bg-slate-50 py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="text-3xl mb-3">⭐⭐⭐⭐⭐</div>
          <blockquote className="text-xl lg:text-2xl font-medium text-slate-900 leading-relaxed max-w-2xl mx-auto mb-3">
            "Antes anotaba todo en libreta. Ahora controlo mi negocio desde el celular. Cambio mi vida."
          </blockquote>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span className="font-bold text-slate-700">Maria G.</span>
            <span>·</span>
            <span>Boutique Mariangel, Cuernavaca</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 lg:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <Zap className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight mb-3">
              ¿Listo para hacer crecer tu negocio?
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto mb-7">Empieza gratis hoy. Sin tarjeta de credito, sin contratos.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7">
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className="bg-white hover:bg-slate-100 text-slate-900 rounded-full h-11 px-7 text-base font-semibold shadow-xl"
              >
                {isAuthenticated ? "Ir a mi panel" : "Empezar gratis"} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("[CyberPiezas] Quiero conocer mas");
                  window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject;
                }}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 text-white rounded-full h-11 px-7 text-base font-semibold"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Hablar con ventas
              </Button>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm">
              <button onClick={onCollab} className="text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline flex items-center gap-1">
                <Handshake className="w-3.5 h-3.5" /> Colaborar
              </button>
              <span className="text-slate-600">·</span>
              <button onClick={onSupport} className="text-rose-300 hover:text-rose-200 underline-offset-4 hover:underline flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> Apoyar el proyecto
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onSupport, onCollab }: { onSupport: () => void; onCollab: () => void }) {
  return (
    <footer className="bg-white border-t border-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm">C</div>
              <span className="font-bold text-lg text-slate-900">CyberPiezas</span>
            </div>
            <p className="text-sm text-slate-600">Sistemas POS hechos a la medida de tu industria.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
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
                <li><button onClick={onCollab} className="hover:text-slate-900 text-left">Colaborar</button></li>
                <li><button onClick={onSupport} className="hover:text-slate-900 text-left">Apoyar</button></li>
                <li><a href="mailto:cyberpiezas207@gmail.com" className="hover:text-slate-900">Contacto</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 mt-8 pt-5 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CyberPiezas. Todos los derechos reservados.</p>
          <p className="text-sm text-slate-500">Hecho en Mexico 🇲🇽</p>
        </div>
      </div>
    </footer>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 lg:p-10 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg mx-auto mb-5">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mb-2">Agenda tu demo personalizado</h2>
          <p className="text-slate-600 mb-6">Te mostramos el sistema en una llamada de 20 minutos. Sin compromiso.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                const subject = encodeURIComponent("[CyberPiezas] Quiero un demo");
                const body = encodeURIComponent("Hola, me gustaria agendar un demo del sistema.\n\nMi nombre: \nNegocio: \nMejor horario: \nTelefono: \n");
                window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 px-6 font-semibold"
            >
              <Mail className="w-4 h-4 mr-1.5" /> Solicitar por email
            </Button>
            <Button
              onClick={() => window.open("https://wa.me/527771234567?text=Hola,%20quiero%20un%20demo%20de%20CyberPiezas", "_blank")}
              variant="outline"
              className="border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-full h-11 px-6 font-semibold"
            >
              <Phone className="w-4 h-4 mr-1.5" /> Por WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-5">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Apoya el proyecto</h2>
          <p className="text-slate-600 mb-6">Tu apoyo nos ayuda a seguir construyendo herramientas para pequeños negocios.</p>
          <div className="space-y-3">
            <a
              href="https://www.paypal.com/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-full h-11 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              💙 Donar con PayPal
            </a>
            <button
              onClick={() => {
                const subject = encodeURIComponent("[CyberPiezas] Quiero apoyar el proyecto");
                const body = encodeURIComponent("Hola, me gustaria apoyar el proyecto. ¿Como puedo hacerlo?");
                window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
              }}
              className="block w-full border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-11 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" /> Otra forma de apoyo
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-5">Cada aporte cuenta. Gracias por creer en CyberPiezas.</p>
        </div>
      </div>
    </div>
  );
}

function CollabModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!name || !contact) {
      alert("Por favor llena tu nombre y forma de contacto");
      return;
    }
    const subject = encodeURIComponent("[CyberPiezas] Quiero colaborar");
    const body = encodeURIComponent("Nombre: " + name + "\nContacto: " + contact + "\nMensaje:\n" + message);
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Handshake className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Colabora con nosotros</h2>
          <p className="text-slate-600 text-sm">¿Tienes una idea, propuesta o quieres ser parte del equipo?</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Tu nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como te llamas"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Email o WhatsApp *</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Donde podemos contactarte"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuentanos tu propuesta..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors resize-none"
            />
          </div>
          <Button
            onClick={handleSend}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full h-11 font-semibold mt-2"
          >
            <Mail className="w-4 h-4 mr-1.5" /> Enviar propuesta
          </Button>
        </div>
      </div>
    </div>
  );
}
