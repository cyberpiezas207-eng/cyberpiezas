import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Heart, Zap, TrendingUp, ArrowRight, Check, ChevronLeft, ChevronRight, X, LogOut } from "lucide-react";

interface POSSystem {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "active" | "coming-soon";
  path?: string;
  color: string;
  features: string[];
}

const systems: POSSystem[] = [
  {
    id: "boutique",
    name: "POS Boutique",
    description: "Tiendas de ropa y accesorios",
    icon: "👗",
    status: "active",
    path: "/dashboard",
    color: "from-purple-500 to-pink-500",
    features: ["Inventario", "Ventas", "Reportes"],
  },
  {
    id: "abarrotes",
    name: "POS Abarrotes",
    description: "Tiendas con codigo de barras y bascula",
    icon: "🛒",
    status: "active",
    path: "/abarrotes-pos",
    color: "from-orange-500 to-red-500",
    features: ["Codigo de barras", "Granel", "Inventario"],
  },
  {
    id: "restaurant",
    name: "POS Restaurante",
    description: "Restaurantes y cafés",
    icon: "🍽️",
    status: "coming-soon",
    color: "from-green-500 to-emerald-500",
    features: ["Mesas", "Pedidos", "Cocina"],
  },
  {
    id: "refaccionaria",
    name: "POS Refaccionaria",
    description: "Autopartes y refacciones",
    icon: "🚗",
    status: "coming-soon",
    color: "from-blue-500 to-cyan-500",
    features: ["Catálogo", "Inventario", "Búsqueda"],
  },
  {
    id: "cafeteria",
    name: "POS Cafetería",
    description: "Cafeterías y bebidas",
    icon: "☕",
    status: "coming-soon",
    color: "from-amber-600 to-orange-500",
    features: ["Personalizadas", "Combos", "Reportes"],
  },
  {
    id: "veterinaria",
    name: "POS Veterinaria",
    description: "Clinicas con expediente clinico y vacunas",
    icon: "🐾",
    status: "active",
    path: "/veterinaria-pos",
    color: "from-emerald-500 to-cyan-500",
    features: ["Mascotas", "Expediente", "Vacunas"],
  },
];

const storyChapters = [
  {
    num: "01",
    icon: "🏠",
    title: "El inicio",
    subtitle: "Todo empezó en una cochera",
    text: "No había oficina, no había capital, no había plan de negocios. Solo había ganas de hacer algo. Empecé a vender lo que podía: cables, accesorios, lo que fuera. La cochera de mi casa fue mi primer local. Ahí aprendí que el negocio no empieza con dinero, empieza con decisión.",
    quote: "\"El primer paso no tiene que ser perfecto. Solo tiene que darse.\"",
    highlight: false,
  },
  {
    num: "02",
    icon: "🏍️",
    title: "La moto",
    subtitle: "La primera gran compra con mis propios ahorros",
    text: "Ahorré durante meses. Cada venta, cada peso que entraba, lo guardaba. No para gastar, sino para invertir. Cuando compré mi primera moto con dinero propio, entendí lo que significa construir algo desde cero. No fue un lujo: fue una herramienta, y también fue una prueba de que podía.",
    quote: "\"Ahorrar no es privarse. Es elegir en qué creer.\"",
    highlight: false,
  },
  {
    num: "03",
    icon: "💪",
    title: "Las caídas",
    subtitle: "Me estafaron. Una y otra vez.",
    text: "Hubo socios que no cumplieron. Clientes que no pagaron. Proveedores que desaparecieron. Cada estafa dejó una marca, pero también dejó una lección. Aprendí a leer a las personas, a poner límites, a no mezclar amistad con negocios. Las caídas no me detuvieron: me hicieron más cuidadoso.",
    quote: "\"Que te estafen una vez es mala suerte. Que te estafen dos veces es una lección que ya aprendiste.\"",
    highlight: false,
  },
  {
    num: "04",
    icon: "💻",
    title: "La computación",
    subtitle: "Encontré mi camino en la tecnología",
    text: "Siempre me llamó la atención cómo funcionaban las cosas por dentro. Empecé a estudiar programación, a entender sistemas, a ver el mundo como un conjunto de problemas que tienen solución. La tecnología no fue solo una carrera: fue el idioma en el que empecé a pensar. Y con ese idioma, todo cambió.",
    quote: "\"La tecnología no reemplaza el trabajo. Lo multiplica.\"",
    highlight: false,
  },
  {
    num: "05",
    icon: "🏪",
    title: "El problema real",
    subtitle: "Mi mamá no podía irse de su tienda",
    text: "Mi mamá tenía una tienda. Y no podía salir. Si salía, se perdía una venta. Si no estaba, nadie sabía qué había en inventario. Dependía de su presencia física para que el negocio funcionara. Eso no es libertad: es una trampa disfrazada de trabajo. Ese problema se volvió mi motivación.",
    quote: "\"Un negocio que te necesita todo el tiempo no es un negocio. Es un segundo trabajo sin sueldo.\"",
    highlight: false,
  },
  {
    num: "06",
    icon: "🔧",
    title: "La solución",
    subtitle: "Busqué un punto de venta. Lo encontré. Lo mejoré.",
    text: "Busqué herramientas en el mercado. Encontré opciones caras, complicadas, o diseñadas para empresas grandes. Nada para el negocio pequeño, real, mexicano. Entonces decidí construirlo yo mismo: un sistema que cualquier dueño de tienda pudiera usar sin ser técnico, sin pagar una fortuna, sin depender de nadie.",
    quote: "\"Si no existe la herramienta que necesitas, constrúyela.\"",
    highlight: false,
  },
  {
    num: "07",
    icon: "🚀",
    title: "Hoy",
    subtitle: "CyberPiezas: constante, aunque no perfecta",
    text: "CyberPiezas no es el producto terminado. Es el resultado de años de trabajo, errores, aprendizajes y una convicción que no cambió: los negocios pequeños merecen herramientas de calidad. Seguimos construyendo, mejorando y escuchando. No somos perfectos, pero somos constantes. Y eso, en los negocios, vale más.",
    quote: "\"No necesitas ser perfecto para ser real. Solo necesitas seguir.\"",
    highlight: true,
  },
];

export function CyberpiezasHome() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [storyChapter, setStoryChapter] = useState(0);

  // Estado sección "Estamos Abiertos a Ti"
  const [openTab, setOpenTab] = useState<"colaborar" | "adquirir">("colaborar");
  // Pestaña 1 — Quiero colaborar
  const [colabNombre, setColabNombre] = useState("");
  const [colabContacto, setColabContacto] = useState("");
  const [colabChips, setColabChips] = useState<string[]>([]);
  const [colabMensaje, setColabMensaje] = useState("");
  // Pestaña 2 — Me interesa adquirirlo
  const [adqNombre, setAdqNombre] = useState("");
  const [adqContacto, setAdqContacto] = useState("");
  const [adqEmpresa, setAdqEmpresa] = useState("");
  const [adqInteres, setAdqInteres] = useState("");

  const colabChipOptions = ["Inversión", "Desarrollo", "Ventas", "Diseño", "Distribución", "Otro"];

  const toggleChip = (chip: string) => {
    setColabChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleColabSubmit = () => {
    const subject = encodeURIComponent("[Cyberpiezas] Quiero colaborar");
    const body = encodeURIComponent(
      `Nombre: ${colabNombre}\nContacto (correo/WhatsApp): ${colabContacto}\nÁreas de interés: ${colabChips.join(", ") || "No especificado"}\n\nMensaje:\n${colabMensaje || "(sin mensaje adicional)"}`
    );
    window.location.href = `mailto:cyberpiezas207@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleAdqSubmit = () => {
    const subject = encodeURIComponent("[Cyberpiezas] Me interesa adquirirlo");
    const body = encodeURIComponent(
      `Nombre: ${adqNombre}\nContacto (correo/WhatsApp): ${adqContacto}\nEmpresa / Perfil: ${adqEmpresa}\n\n¿Qué te interesa del proyecto?\n${adqInteres}`
    );
    window.location.href = `mailto:cyberpiezas207@gmail.com?subject=${subject}&body=${body}`;
  };

  // Estado formulario "Avísame" por sistema
  const [notifyForm, setNotifyForm] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent, setNotifySent] = useState<string[]>([]);

  const handleNotifySubmit = (systemName: string) => {
    if (!notifyEmail.trim()) return;
    const subject = encodeURIComponent(`[Cyberpiezas] Avísame cuando esté listo: ${systemName}`);
    const body = encodeURIComponent(`Correo: ${notifyEmail}\nSistema de interés: ${systemName}`);
    window.location.href = `mailto:cyberpiezas207@gmail.com?subject=${subject}&body=${body}`;
    setNotifySent((prev) => [...prev, systemName]);
    setNotifyForm(null);
    setNotifyEmail("");
  };

  const handleSystemClick = (system: POSSystem) => {
    if (system.status === "active" && system.path && isAuthenticated) {
      setLocation(system.path);
    } else if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  };

  // Public page view (for everyone)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Atrás"
              >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Cyberpiezas
            </h1>
          </div>
          {!isAuthenticated ? (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Iniciar Sesión
            </Button>
          ) : (
            <div className="flex gap-3 items-center">
              <Button
                onClick={() => setLocation("/dashboard")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Ir al Panel
              </Button>
              <Button
                onClick={() => logout()}
                variant="outline"
                className="border-slate-600 hover:bg-slate-800 text-slate-300 hover:text-white"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      {/* ===== 1. HERO PRINCIPAL ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-20">
          <h1 className="text-7xl font-bold text-white mb-6 leading-tight">
            Gestiona Múltiples
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Negocios en Uno
            </span>
          </h1>
          <p className="text-2xl text-slate-300 max-w-3xl mx-auto mb-12">
            Soluciones empresariales inteligentes para emprendedores que quieren crecer.
            Desde sistemas de seguridad hasta puntos de venta profesionales.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => setLocation("/suscripcion")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 text-lg"
            >
              Comenzar Ahora <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() => setShowDemoModal(true)}
              variant="outline"
              className="border-slate-600 hover:bg-slate-800 text-white px-8 py-4 text-lg"
            >
              Ver Demostración
            </Button>
            {isAdmin && (
              <Button
                onClick={() => setLocation("/admin-cyberpiezas")}
                variant="outline"
                className="border-purple-500/50 bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 hover:text-white px-8 py-4 text-lg gap-2"
              >
                🛡️ Panel CyberPiezas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== 2. ¿QUÉ ES CYBERPIEZAS? ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-3">¿Qué es Cyberpiezas?</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Todo lo que necesitas para operar tu negocio, en un solo lugar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-4xl">🛒</span>
            <h3 className="text-white font-bold text-lg">Punto de Venta</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Cobra rápido, controla tu caja y registra cada venta sin complicaciones.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-4xl">📦</span>
            <h3 className="text-white font-bold text-lg">Inventario Real</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Sabe exactamente qué tienes, qué se agota y qué vende más — en tiempo real.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-4xl">📊</span>
            <h3 className="text-white font-bold text-lg">Para ti, no para corporativos</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Diseñado para negocios reales en México. Sin mensualidades exageradas, sin contratos.</p>
          </div>
        </div>

        {/* Lo que incluye */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            { icon: "💰", text: "Sin mensualidades infladas" },
            { icon: "📱", text: "Funciona en celular y computadora" },
            { icon: "💬", text: "Soporte directo del equipo" },
            { icon: "🇲🇽", text: "Hecho en México" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-300 text-sm font-medium"
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 3. PUNTOS DE VENTA ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Puntos de Venta</h2>
          <p className="text-slate-300 text-xl">
            Soluciones especializadas para cada tipo de negocio
          </p>
        </div>
        {/* Horizontal Scroll Systems */}
        <div className="overflow-x-auto pb-6 -mx-4 px-4">
          <div className="flex gap-6 min-w-max">
            {systems.map((system) => (
              <div key={system.id} className="flex-shrink-0 w-80 group">
                <Card
                  className={`h-full overflow-hidden transition-all duration-500 ${
                    system.status === "active"
                      ? "cursor-pointer hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] border-2 border-purple-500/40 hover:border-purple-400/80 bg-slate-900"
                      : "border border-slate-700/50 bg-slate-900/80 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(100,100,200,0.25)] hover:border-slate-500/60"
                  } relative`}
                  onClick={() => system.status === "active" ? handleSystemClick(system) : undefined}
                >
                  {/* Precio referencial — Mejora 6 */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-black/40 text-white/80 backdrop-blur-sm border border-white/10">
                      {system.status === "active" ? "Desde $249/mes" : "Desde $249/mes"}
                    </span>
                  </div>

                  <div
                    className={`h-36 bg-gradient-to-br ${system.color} relative overflow-hidden flex flex-col items-center justify-center gap-2`}
                  >
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-black/20" />
                    <span className={`text-6xl transition-transform duration-500 ${
                      system.status === "active" ? "group-hover:scale-110 group-hover:-rotate-6" : "group-hover:scale-105"
                    } drop-shadow-lg relative z-10`}>
                      {system.icon}
                    </span>
                    <span className={`relative z-10 text-xs font-bold px-3 py-1 rounded-full ${
                      system.status === "active"
                        ? "bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                        : "bg-black/30 text-white/70 border border-white/10"
                    }`}>
                      {system.status === "active" ? "✅ Disponible" : "🔜 Próximamente"}
                    </span>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{system.name}</h3>
                    <p className="text-slate-400 text-sm mb-2 leading-relaxed">{system.description}</p>

                    {/* Estado de desarrollo — Mejora 4 */}
                    {system.status === "coming-soon" && (
                      <p className="text-xs text-amber-400/80 mb-4 font-medium">
                        🛠️ En desarrollo · Disponible en 2–3 meses
                      </p>
                    )}

                    {/* Features — Mejora 5: siempre visibles en coming-soon */}
                    <div className="mb-5">
                      <div className="flex flex-wrap gap-2">
                        {system.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                              system.status === "active"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botón principal */}
                    {system.status === "active" ? (
                      <Button
                        onClick={() => handleSystemClick(system)}
                        className={`w-full h-11 font-semibold transition-all duration-300 bg-gradient-to-r ${system.color} hover:opacity-90 hover:shadow-lg text-white text-sm`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Acceder al sistema
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </Button>
                    ) : notifySent.includes(system.name) ? (
                      <div className="w-full h-11 flex items-center justify-center rounded-md bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-semibold">
                        ✅ ¡Te avisamos cuando esté listo!
                      </div>
                    ) : notifyForm === system.id ? (
                      /* Formulario inline — Mejora 3 */
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="tu@correo.com"
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleNotifySubmit(system.name); }}
                            disabled={!notifyEmail.trim()}
                            className="flex-1 h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-40"
                          >
                            Enviar
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); setNotifyForm(null); setNotifyEmail(""); }}
                            variant="outline"
                            className="h-9 px-3 border-slate-600 text-slate-400 hover:bg-slate-700 text-xs"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={(e) => { e.stopPropagation(); setNotifyForm(system.id); }}
                        className="w-full h-11 font-semibold bg-slate-700 hover:bg-slate-600 text-white text-sm border border-slate-600"
                      >
                        🔔 Avísame cuando esté listo
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Y más por venir — Mejora 8 */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest mb-6">Y más por venir</p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: "🐾", label: "Veterinaria" },
              { icon: "💇", label: "Salón de belleza" },
              { icon: "🏋️", label: "Gimnasio" },
              { icon: "☕", label: "Cafetería" },
              { icon: "💊", label: "Farmacia" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 opacity-40">
                <span className="text-3xl grayscale">{item.icon}</span>
                <span className="text-slate-500 text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 4. CÓMO FUNCIONA ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-3">¿Cómo funciona?</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Empieza en minutos, sin instalaciones complicadas.</p>
        </div>

        {/* Pasos con conector visual */}
        <div className="relative max-w-4xl mx-auto">
          {/* Línea conectora — Mejora 9 (solo desktop) */}
          <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-0.5 bg-gradient-to-r from-purple-500/40 via-purple-400/60 to-purple-500/40" />
          {/* Flechas conectoras */}
          <div className="hidden md:flex absolute top-3 left-0 right-0 justify-between px-[calc(33.33%-12px)]">
            <ArrowRight className="w-5 h-5 text-purple-400/70" />
            <ArrowRight className="w-5 h-5 text-purple-400/70" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Paso 1 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-900/40 relative z-10">
                👤
              </div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">Paso 1</div>
              <h3 className="text-white font-bold text-lg">Crea tu cuenta</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Regístrate en menos de 2 minutos. Sin tarjeta de crédito, sin contrato.</p>
              <span className="text-xs text-slate-500 font-medium">⏱ 2 minutos</span>
            </div>

            {/* Paso 2 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-900/40 relative z-10">
                🏪
              </div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">Paso 2</div>
              <h3 className="text-white font-bold text-lg">Configura tu tienda</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Agrega tus productos, sucursales y cajeros. Todo desde el panel.</p>
              <span className="text-xs text-slate-500 font-medium">⏱ 10 minutos</span>
            </div>

            {/* Paso 3 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-900/40 relative z-10">
                💳
              </div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">Paso 3</div>
              <h3 className="text-white font-bold text-lg">Empieza a vender</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Abre el punto de venta desde cualquier dispositivo y cobra desde el primer día.</p>
              <span className="text-xs text-slate-500 font-medium">⏱ Inmediato</span>
            </div>
          </div>
        </div>

        {/* Botón CTA — Mejora 12 */}
        <div className="mt-12 text-center">
          <Button
            onClick={() => setLocation("/suscripcion")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-10 py-5 text-lg font-semibold shadow-xl shadow-purple-900/40"
          >
            Empezar ahora <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ===== 5 + 6. NUESTRA HISTORIA + ESTAMOS ABIERTOS A TI ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">

        {/* ===== NUESTRA HISTORIA ===== */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">Nuestra Historia</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Cada negocio tiene una historia. Esta es la nuestra.
            </p>
          </div>

          {/* Barra de progreso */}
          <div className="flex gap-1.5 mb-8 max-w-2xl mx-auto px-4">
            {storyChapters.map((_, i) => (
              <button
                key={i}
                onClick={() => setStoryChapter(i)}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i === storyChapter
                    ? "bg-purple-400"
                    : i < storyChapter
                    ? "bg-purple-700"
                    : "bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* Tarjeta activa — Mejoras 13 y 14 */}
          <div className="max-w-2xl mx-auto px-4">
            {(() => {
              const ch = storyChapters[storyChapter];
              return (
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    ch.highlight
                      ? "bg-purple-900/40 border-purple-500/50 shadow-xl shadow-purple-900/30"
                      : "bg-slate-800/60 border-slate-700/60"
                  }`}
                >
                  {/* Cabecera con ilustración — Mejora 14 */}
                  <div className={`px-8 pt-8 pb-4 flex items-start gap-4 border-b ${
                    ch.highlight ? "border-purple-700/50" : "border-slate-700/50"
                  }`}>
                    {/* Ícono ilustrativo */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                      ch.highlight
                        ? "bg-purple-800/60 border border-purple-600/40"
                        : "bg-slate-700/60 border border-slate-600/40"
                    }`}>
                      {ch.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${
                        ch.highlight ? "text-purple-400" : "text-slate-500"
                      }`}>
                        Capítulo {ch.num}
                      </p>
                      <h3 className="text-2xl font-black text-white leading-tight">{ch.title}</h3>
                      <p className={`text-sm font-semibold mt-1 ${
                        ch.highlight ? "text-purple-300" : "text-purple-400"
                      }`}>
                        {ch.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Cuerpo — Mejora 13 */}
                  <div className="px-8 py-6">
                    <p className="text-slate-300 text-base leading-relaxed mb-6">
                      {ch.text}
                    </p>

                    <blockquote className={`border-l-4 pl-5 py-2 rounded-r-lg italic text-sm ${
                      ch.highlight
                        ? "border-purple-400 text-purple-200 bg-purple-900/30"
                        : "border-purple-600 text-slate-400 bg-slate-700/30"
                    }`}>
                      {ch.quote}
                    </blockquote>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Botones de navegación */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setStoryChapter((p) => Math.max(0, p - 1))}
              disabled={storyChapter === 0}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-slate-500 text-sm">
              {storyChapter + 1} / {storyChapters.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setStoryChapter((p) => Math.min(storyChapters.length - 1, p + 1))}
              disabled={storyChapter === storyChapters.length - 1}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* ===== ESTAMOS ABIERTOS A TI ===== */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">Estamos Abiertos a Ti</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Ya sea que quieras colaborar o conocer más sobre el proyecto, aquí hay un lugar para ti.
            </p>
          </div>

          <div className="max-w-2xl mx-auto px-4">
            {/* Pestañas */}
            <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-8">
              <button
                onClick={() => setOpenTab("colaborar")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  openTab === "colaborar"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Quiero colaborar
              </button>
              <button
                onClick={() => setOpenTab("adquirir")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  openTab === "adquirir"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Me interesa adquirirlo
              </button>
            </div>

            {/* Pestaña 1: Quiero colaborar */}
            {openTab === "colaborar" && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-8 space-y-5">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    value={colabNombre}
                    onChange={(e) => setColabNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Correo o WhatsApp</label>
                  <input
                    type="text"
                    value={colabContacto}
                    onChange={(e) => setColabContacto(e.target.value)}
                    placeholder="ejemplo@correo.com o +52 777..."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">¿En qué te gustaría colaborar?</label>
                  <div className="flex flex-wrap gap-2">
                    {colabChipOptions.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          colabChips.includes(chip)
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "bg-slate-700 border-slate-600 text-slate-300 hover:border-purple-500"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Cuéntanos más <span className="text-slate-500">(opcional)</span></label>
                  <textarea
                    value={colabMensaje}
                    onChange={(e) => setColabMensaje(e.target.value)}
                    rows={4}
                    placeholder="Comparte lo que tienes en mente..."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <Button
                  onClick={handleColabSubmit}
                  disabled={!colabNombre.trim() || !colabContacto.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
                >
                  Enviar mensaje
                </Button>
              </div>
            )}

            {/* Pestaña 2: Me interesa adquirirlo */}
            {openTab === "adquirir" && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-8 space-y-5">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    value={adqNombre}
                    onChange={(e) => setAdqNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Correo o WhatsApp</label>
                  <input
                    type="text"
                    value={adqContacto}
                    onChange={(e) => setAdqContacto(e.target.value)}
                    placeholder="ejemplo@correo.com o +52 777..."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Empresa o perfil</label>
                  <input
                    type="text"
                    value={adqEmpresa}
                    onChange={(e) => setAdqEmpresa(e.target.value)}
                    placeholder="Nombre de tu empresa, rol o perfil profesional"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">¿Qué te interesa del proyecto?</label>
                  <textarea
                    value={adqInteres}
                    onChange={(e) => setAdqInteres(e.target.value)}
                    rows={4}
                    placeholder="Cuéntanos qué te llamó la atención y qué buscas..."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <p className="text-slate-500 text-xs text-center">
                  Proceso discreto y serio. Toda conversación es confidencial.
                </p>
                <Button
                  onClick={handleAdqSubmit}
                  disabled={!adqNombre.trim() || !adqContacto.trim() || !adqInteres.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
                >
                  Iniciar conversación
                </Button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ===== 7. MÁS DE CYBERPIEZAS ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-3">Más de CyberPiezas</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Servicios adicionales del ecosistema Cyberpiezas.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          {/* CELINE */}
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 p-8 hover:shadow-lg transition-all group cursor-pointer">
            <h3 className="text-3xl font-bold text-white mb-4">💻 CELINE</h3>
            <p className="text-slate-300 mb-6 text-lg leading-relaxed">
              Sistema especializado para compra y evaluación de artículos de cómputo.
              Flujo profesional diseñado para el ecosistema Cyberpiezas con herramientas
              avanzadas de gestión.
            </p>
            <Button
              onClick={() => setLocation("/celine")}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 group-hover:shadow-lg transition-all"
            >
              Explorar CELINE
            </Button>
          </Card>
          {/* Próximamente: cámaras, computadoras, equipos de informática */}
        </div>
      </div>

      {/* ===== 8. NACIDO EN AYALA, MORELOS ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-700/50">
        <div className="flex justify-center">
          <div className="inline-flex flex-col items-center gap-4 px-10 py-7 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl" role="img" aria-label="planta">🌱</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-slate-500" />
              <p className="text-slate-200 text-base font-medium tracking-wide text-center">
                Nacido en Ayala, Morelos.
                <span className="text-slate-400"> Hecho en México, pensado para crecer.</span>
              </p>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTÓN FLOTANTE EMPEZAR GRATIS ===== */}
      {!isAuthenticated && (
        <div className="fixed bottom-20 right-6 z-40">
          <button
            onClick={() => setLocation("/suscripcion")}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm shadow-2xl shadow-purple-900/50 transition-all hover:scale-105 active:scale-95"
          >
            Empezar gratis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== 9. DONACIONES — Cuadrito flotante discreto ===== */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setLocation("/donations")}
          className="group flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-xl hover:border-amber-400/60 hover:bg-slate-800/90 transition-all"
          title="Apoya a Cyberpiezas"
        >
          <span className="text-lg">❤️</span>
          <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">Donar</span>
        </button>
      </div>

      {/* ===== 10. FOOTER ===== */}
      <footer className="border-t border-slate-700/50 bg-slate-900/80 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Logo y descripción */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Cyberpiezas</h2>
              <p className="text-slate-400 text-sm leading-relaxed">Sistema POS para negocios reales en México. Inventario, ventas y reportes en un solo lugar.</p>
            </div>
            {/* Links rápidos */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm uppercase tracking-widest">Accesos rápidos</h3>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => setLocation("/suscripcion")} className="text-slate-400 hover:text-white transition-colors">Planes y precios</button></li>
                <li><button onClick={() => setLocation("/donations")} className="text-slate-400 hover:text-white transition-colors">Donaciones</button></li>
                <li><button onClick={() => setLocation("/terms")} className="text-slate-400 hover:text-white transition-colors">Términos y condiciones</button></li>
                <li><button onClick={() => window.location.href = getLoginUrl()} className="text-slate-400 hover:text-white transition-colors">Iniciar sesión</button></li>
              </ul>
            </div>
            {/* Contacto y redes */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm uppercase tracking-widest">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:cyberpiezas207@gmail.com" className="text-slate-400 hover:text-white transition-colors">cyberpiezas207@gmail.com</a></li>
                <li><span className="text-slate-500">Morelos, México</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-slate-500 text-xs">© {new Date().getFullYear()} CyberPiezas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/*
        CÓDIGO ANTERIOR — Secciones ocultas (no eliminar)
        - Additional Services Section (grid con Donaciones + CELINE)
        - Pricing Section (Planes Gratis y Profesional)
        - CTA Section (¿Listo para transformar tu negocio?)
        - Sello de identidad anterior (dentro del max-w-7xl)
      */}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Características del POS</h2>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Ventas Rápidas */}
                <div className="flex gap-4">
                  <div className="text-3xl">🛒</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Ventas Rápidas</h3>
                    <p className="text-slate-300">
                      Procesa transacciones en segundos. Interfaz intuitiva diseñada para maximizar la velocidad de cobro sin sacrificar precisión.
                    </p>
                  </div>
                </div>

                {/* Control de Inventario */}
                <div className="flex gap-4">
                  <div className="text-3xl">📦</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Control de Inventario</h3>
                    <p className="text-slate-300">
                      Seguimiento en tiempo real de tu stock. Alertas automáticas cuando los productos se agotan y gestión de múltiples almacenes.
                    </p>
                  </div>
                </div>

                {/* Reportes Inteligentes */}
                <div className="flex gap-4">
                  <div className="text-3xl">📊</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Reportes Inteligentes</h3>
                    <p className="text-slate-300">
                      Análisis detallados de ventas, ganancias y tendencias. Toma decisiones basadas en datos reales de tu negocio.
                    </p>
                  </div>
                </div>

                {/* Multi-negocio */}
                <div className="flex gap-4">
                  <div className="text-3xl">🏢</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Gestión Multi-negocio</h3>
                    <p className="text-slate-300">
                      Administra todas tus sucursales desde un solo panel. Sincronización automática y reportes consolidados de tu ecosistema completo.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowDemoModal(false)}
                className="w-full mt-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Entendido
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
