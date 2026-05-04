import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Heart, Zap, TrendingUp, ArrowRight, Check, ChevronLeft, X, LogOut } from "lucide-react";

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
    id: "garrote",
    name: "POS Garrote",
    description: "Ferreterías y herramientas",
    icon: "🔧",
    status: "coming-soon",
    color: "from-orange-500 to-red-500",
    features: ["Stock", "Categorías", "Reportes"],
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
    id: "farmacia",
    name: "POS Farmacia",
    description: "Farmacias y medicinas",
    icon: "💊",
    status: "coming-soon",
    color: "from-red-500 to-pink-500",
    features: ["Medicinas", "Recetas", "Inventario"],
  },
];

export function CyberpiezasHome() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [showDemoModal, setShowDemoModal] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
          <div className="flex gap-4 justify-center">
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
          </div>
        </div>

        {/* Our Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-32 items-center">
          <div>
            <h2 className="text-5xl font-bold text-white mb-8">Nuestra Historia</h2>
            <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
              <p>
                Comenzamos en Morelos, en Huitzilac y Ayalá, con una visión clara: 
                transformar la forma en que los negocios operan. Lo que comenzó como 
                instalación de sistemas de seguridad y puntos de venta se convirtió en 
                una plataforma integral de soluciones empresariales.
              </p>
              <p>
                Con más de una década de experiencia en el sector, hemos trabajado con 
                negocios de todo tipo: tiendas, restaurantes, ferreterías, farmacias y más. 
                Cada proyecto nos enseñó algo nuevo, cada cliente nos inspiró a innovar.
              </p>
              <p>
                Hoy, Cyberpiezas es un ecosistema completo de herramientas digitales 
                diseñadas para empresarios que quieren crecer. Nuestro objetivo es simple: 
                darte la tecnología que necesitas para administrar múltiples negocios desde 
                un solo lugar.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 p-8 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <Zap className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Innovación Constante</h3>
                  <p className="text-slate-300">
                    Desarrollamos soluciones que evolucionan con tu negocio
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 p-8 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Crecimiento Empresarial</h3>
                  <p className="text-slate-300">
                    Herramientas diseñadas para que escales tu negocio
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 p-8 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <Heart className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Compromiso Total</h3>
                  <p className="text-slate-300">
                    Soporte y capacitación para tu éxito
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Systems Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Nuestros Sistemas POS</h2>
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
                        : "opacity-60 border border-slate-700/50 bg-slate-900/80"
                    }`}
                    onClick={() => handleSystemClick(system)}
                  >
                    {/* Gradient Header - taller and more impactful */}
                    <div
                      className={`h-36 bg-gradient-to-br ${system.color} relative overflow-hidden flex flex-col items-center justify-center gap-2`}
                    >
                      {/* Decorative circles */}
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-black/20" />
                      {/* Icon */}
                      <span className={`text-6xl transition-transform duration-500 ${
                        system.status === "active" ? "group-hover:scale-110 group-hover:-rotate-6" : ""
                      } drop-shadow-lg relative z-10`}>
                        {system.icon}
                      </span>
                      {/* Status badge inside header */}
                      <span className={`relative z-10 text-xs font-bold px-3 py-1 rounded-full ${
                        system.status === "active"
                          ? "bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                          : "bg-black/30 text-white/70 border border-white/10"
                      }`}>
                        {system.status === "active" ? "✅ Disponible" : "🔜 Próximamente"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                        {system.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                        {system.description}
                      </p>

                      {/* Features as pills */}
                      <div className="mb-6">
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

                      {/* Button */}
                      <Button
                        onClick={() => handleSystemClick(system)}
                        className={`w-full h-11 font-semibold transition-all duration-300 ${
                          system.status === "active"
                            ? `bg-gradient-to-r ${system.color} hover:opacity-90 hover:shadow-lg text-white text-sm`
                            : "bg-slate-700/50 hover:bg-slate-700 cursor-not-allowed text-slate-400 text-sm"
                        }`}
                        disabled={system.status === "coming-soon"}
                      >
                        {system.status === "active" ? (
                          <span className="flex items-center justify-center gap-2">
                            Acceder al sistema
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        ) : (
                          "Próximamente"
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Services Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {/* Donations */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 p-8 hover:shadow-lg transition-all group cursor-pointer">
            <h3 className="text-3xl font-bold text-white mb-4">❤️ Donaciones</h3>
            <p className="text-slate-300 mb-6 text-lg leading-relaxed">
              Apoya nuestro proyecto y sé parte del crecimiento de Cyberpiezas. 
              Tus donaciones nos ayudan a desarrollar nuevas funcionalidades y mejorar 
              nuestros servicios para beneficio de toda la comunidad.
            </p>
            <Button 
              onClick={() => setLocation("/donations")}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 group-hover:shadow-lg transition-all"
            >
              Contribuir Ahora
            </Button>
          </Card>

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
        </div>

        {/* Pricing Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Planes y Precios</h2>
            <p className="text-slate-300 text-xl">
              Elige el plan que mejor se adapte a tu negocio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Gratis */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 p-8 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-white mb-2">Gratis</h3>
              <p className="text-slate-400 mb-6">Para empezar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Acceso básico", "1 Sistema POS", "Inventario simple", "Soporte por email"].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => setLocation("/suscripcion")}
                className="w-full bg-slate-600 hover:bg-slate-700"
              >
                Seleccionar
              </Button>
            </Card>

            {/* Plan Profesional */}
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 p-8 hover:shadow-xl transition-all border-2 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                  Más Popular
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-4">Profesional</h3>
              <p className="text-slate-300 mb-6">Para pequeños negocios</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$170</span>
                <span className="text-slate-300">/mes MXN</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Múltiples sistemas", "Inventario avanzado", "Reportes detallados", "Soporte prioritario"].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => setLocation("/suscripcion")}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Seleccionar
              </Button>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-20 border-t border-slate-700 mb-20">
          <h2 className="text-4xl font-bold text-white mb-6">¿Listo para transformar tu negocio?</h2>
          <p className="text-slate-300 text-xl mb-12 max-w-2xl mx-auto">
            Únete a cientos de empresarios que ya utilizan Cyberpiezas para gestionar 
            sus negocios de forma profesional y eficiente.
          </p>
          <Button
            onClick={() => setLocation("/suscripcion")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 text-lg"
          >
            Comenzar Ahora
          </Button>
        </div>
      </div>

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
