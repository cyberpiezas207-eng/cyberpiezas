import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../_core/hooks/useAuth";

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
    name: "Sistema POS Boutique",
    description: "Gestión completa para tiendas de ropa y accesorios",
    icon: "👗",
    status: "active",
    path: "/cyberpiezas",
    color: "from-purple-500 to-pink-500",
    features: ["Inventario", "Ventas rápidas", "Reportes", "Control de acceso"],
  },
  {
    id: "garrote",
    name: "Sistema POS Garrote",
    description: "Punto de venta para ferreterías y tiendas de herramientas",
    icon: "🔧",
    status: "coming-soon",
    color: "from-orange-500 to-red-500",
    features: ["Gestión de stock", "Inventario por categoría", "Reportes"],
  },
  {
    id: "restaurant",
    name: "Sistema POS Restaurante",
    description: "Solución completa para restaurantes y cafés",
    icon: "🍽️",
    status: "coming-soon",
    color: "from-green-500 to-emerald-500",
    features: ["Mesas", "Pedidos", "Cocina", "Reportes"],
  },
  {
    id: "refaccionaria",
    name: "Sistema POS Refaccionaria",
    description: "Gestión de refacciones y autopartes",
    icon: "🚗",
    status: "coming-soon",
    color: "from-blue-500 to-cyan-500",
    features: ["Catálogo de partes", "Inventario", "Búsqueda rápida"],
  },
  {
    id: "cafeteria",
    name: "Sistema POS Cafetería",
    description: "Punto de venta especializado para cafeterías",
    icon: "☕",
    status: "coming-soon",
    color: "from-amber-600 to-orange-500",
    features: ["Bebidas personalizadas", "Combos", "Reportes"],
  },
  {
    id: "farmacia",
    name: "Sistema POS Farmacia",
    description: "Gestión de medicamentos y productos farmacéuticos",
    icon: "💊",
    status: "coming-soon",
    color: "from-red-500 to-pink-500",
    features: ["Control de medicinas", "Recetas", "Inventario"],
  },
];

export default function SystemsPanel() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleSystemClick = (system: POSSystem) => {
    if (system.status === "active" && system.path) {
      setLocation(system.path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Centro Unificado de Operación
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-2">
              Cyberpiezas
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Selecciona el sistema POS que necesitas para gestionar tu negocio.
            Todos tus sistemas en un solo lugar.
          </p>
        </div>
      </div>

      {/* Systems Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {systems.map((system) => (
            <div key={system.id} className="h-full">
              <Card
                className={`h-full overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                  system.status === "active"
                    ? "cursor-pointer hover:scale-105 border-2 border-purple-500/50"
                    : "opacity-75 hover:opacity-90"
                }`}
                onClick={() => handleSystemClick(system)}
              >
                {/* Gradient Background */}
                <div
                  className={`h-32 bg-gradient-to-r ${system.color} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-20 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">{system.icon}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white">
                      {system.name}
                    </h3>
                    <Badge
                      variant={
                        system.status === "active" ? "default" : "secondary"
                      }
                      className={
                        system.status === "active"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-slate-500 hover:bg-slate-600"
                      }
                    >
                      {system.status === "active" ? "Activo" : "Próximamente"}
                    </Badge>
                  </div>

                  <p className="text-slate-300 text-sm mb-4">
                    {system.description}
                  </p>

                  {/* Features */}
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                      {system.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-3 py-1 bg-slate-700/50 text-slate-200 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Button */}
                  <Button
                    onClick={() => handleSystemClick(system)}
                    disabled={system.status === "coming-soon"}
                    className={
                      system.status === "active"
                        ? "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        : "w-full bg-slate-600 hover:bg-slate-700 cursor-not-allowed"
                    }
                  >
                    {system.status === "active"
                      ? "Acceder al Sistema"
                      : "Próximamente"}
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-7xl mx-auto mt-16 text-center">
        <p className="text-slate-400 text-sm">
          🎉 Sistema POS Boutique disponible ahora. Los demás sistemas estarán
          disponibles pronto.
        </p>
      </div>
    </div>
  );
}
