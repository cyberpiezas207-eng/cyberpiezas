import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Zap } from "lucide-react";

type PlanType = "basic" | "pro" | "business";

interface Plan {
  id: PlanType;
  name: string;
  monthlyPrice: number;
  description: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Básico",
    monthlyPrice: 299,
    description: "Perfecto para empezar",
    features: [
      "1 caja registradora",
      "Inventario básico",
      "Reportes simples",
      "Soporte por WhatsApp",
      "Sincronización en tiempo real",
      "Historial de ventas 30 días",
    ],
    cta: "Comenzar prueba gratis",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 599,
    description: "Lo más elegido",
    popular: true,
    features: [
      "Hasta 3 cajas registradoras",
      "Inventario avanzado",
      "Reportes detallados",
      "Backups automáticos",
      "Soporte prioritario",
      "Historial de ventas ilimitado",
      "Análisis de tendencias",
      "Integración con proveedores",
    ],
    cta: "Comenzar prueba gratis",
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 999,
    description: "Para negocios en crecimiento",
    features: [
      "Cajas ilimitadas",
      "Multiusuario avanzado",
      "Facturación electrónica",
      "Reportes personalizados",
      "Soporte 24/7",
      "API para integraciones",
      "Gestión de sucursales",
      "Análisis predictivo",
      "Capacitación incluida",
    ],
    cta: "Comenzar prueba gratis",
  },
];

export function PricingPlans() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const handleSelectPlan = (planId: PlanType) => {
    setSelectedPlan(planId);
    setLocation(`/checkout?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6 mx-auto block"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="mb-4 text-5xl font-bold text-slate-900">
            Planes de Suscripción
          </h1>
          <p className="mb-2 text-xl text-slate-600">
            Controla tu inventario, tus ventas y tu caja desde el celular — sin perder un solo peso
          </p>
          <div className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
            ✨ Primeros 30 días gratis, sin tarjeta de crédito
          </div>
        </div>

        {/* Oferta especial */}
        <Card className="mb-12 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">✅ Instalación incluida</p>
                <p className="font-semibold text-slate-900">Configuramos todo por ti</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">✅ Capacitación gratis</p>
                <p className="font-semibold text-slate-900">Aprende a usar el sistema</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">✅ Sin contrato anual</p>
                <p className="font-semibold text-slate-900">Mes a mes, cancela cuando quieras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planes */}
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {plans.map((plan) => (
            <div key={plan.id} className="relative">
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-4 py-1 text-sm font-semibold">
                    <Zap className="mr-1 h-3 w-3 inline" />
                    Más popular
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full flex flex-col transition-all duration-300 ${
                  plan.popular
                    ? "border-2 border-purple-400 shadow-xl scale-105"
                    : "border border-slate-200 hover:shadow-lg"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900">
                        ${plan.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-slate-600">/mes</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Después de 30 días gratis
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full mb-6 font-semibold py-6 text-base ${
                      plan.popular
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                    }`}
                  >
                    {plan.cta}
                  </Button>

                  <div className="space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Preguntas frecuentes */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Realmente es gratis los primeros 30 días?",
                a: "Sí, totalmente gratis. No necesitas tarjeta de crédito. Después de 30 días, se cobra automáticamente el plan que elegiste.",
              },
              {
                q: "¿Puedo cambiar de plan después?",
                a: "Por supuesto. Puedes cambiar a un plan superior o inferior en cualquier momento. Los cambios se reflejan en tu próxima factura.",
              },
              {
                q: "¿Qué pasa si cancelo?",
                a: "Puedes cancelar en cualquier momento sin penalización. Tu acceso se mantiene hasta el final del período pagado.",
              },
              {
                q: "¿Incluye soporte?",
                a: "Sí, todos los planes incluyen soporte. Básico por WhatsApp, Pro prioritario, y Business 24/7.",
              },
              {
                q: "¿Puedo traer a otro negocio y ganar?",
                a: "¡Claro! Comparte tu código de referido y obtén 1 mes gratis por cada negocio que se suscriba.",
              },
            ].map((item, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            ¿Dudas? Contáctanos por WhatsApp
          </p>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-6 px-8 text-lg"
            onClick={() => {
              const phone = "5215551234567"; // Reemplazar con número real
              window.open(`https://wa.me/${phone}?text=Hola, tengo dudas sobre los planes de suscripción`, "_blank");
            }}
          >
            💬 Hablar por WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PricingPlans;
