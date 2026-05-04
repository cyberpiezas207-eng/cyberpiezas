import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Zap } from "lucide-react";

type PlanType = "free" | "pro" | "business";

interface Plan {
  id: PlanType;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  popular?: boolean;
  features: string[];
  cta: string;
  icon: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Gratis",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Para empezar sin riesgo",
    features: [
      "1 sucursal",
      "Hasta 50 productos",
      "1 cajero",
      "POS Boutique",
      "Soporte por correo",
    ],
    cta: "Empezar gratis",
    icon: "🏠",
  },
  {
    id: "pro",
    name: "Profesional",
    monthlyPrice: 249,
    annualPrice: 2390,
    description: "El favorito de los negocios en crecimiento",
    popular: true,
    features: [
      "Hasta 2 sucursales",
      "Productos ilimitados",
      "5 cajeros",
      "Tienda pública con link propio",
      "Reportes avanzados",
      "Soporte prioritario por WhatsApp",
    ],
    cta: "Elegir profesional",
    icon: "⭐",
  },
  {
    id: "business",
    name: "Negocio",
    monthlyPrice: 500,
    annualPrice: 4800,
    description: "Para negocios con operación compleja",
    features: [
      "Hasta 4 sucursales",
      "Cajeros ilimitados",
      "Impresión de tickets y cajón de dinero",
      "Notificaciones avanzadas",
      "Soporte prioritario",
    ],
    cta: "Elegir negocio",
    icon: "🚀",
  },
];

export function PricingPlans() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSelectPlan = (planId: PlanType) => {
    setSelectedPlan(planId);
    setLocation(`/checkout?plan=${planId}&billing=${isAnnual ? "annual" : "monthly"}`);
  };

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Puedo cambiar de plan?",
      a: "Sí, puedes subir a un plan superior en cualquier momento desde tu panel. El cambio aplica en tu próxima fecha de cobro. No es posible bajar de plan una vez activo.",
    },
    {
      q: "¿Hay permanencia?",
      a: "No. Nuestros planes son mes a mes o anuales sin penalización por cancelar. Puedes darte de baja cuando quieras.",
    },
    {
      q: "¿Qué pasa con mis datos si cancelo?",
      a: "Tus datos se conservan 30 días después de cancelar. Durante ese tiempo puedes exportar tu inventario y el historial de ventas antes de que se eliminen.",
    },
    {
      q: "¿Puedo probar antes de pagar?",
      a: "Sí. Todos los planes incluyen 30 días gratis sin necesidad de tarjeta de crédito. Solo crea tu cuenta y empieza a usarlo.",
    },
    {
      q: "¿Cómo se hace el pago?",
      a: "Aceptamos transferencia bancaria y pago en efectivo con referencia. Te indicamos los datos al momento de activar tu plan.",
    },
  ];

  const getPrice = (plan: Plan) => {
    if (isAnnual && plan.annualPrice > 0) {
      return { amount: plan.annualPrice.toLocaleString(), period: "/año" };
    }
    return { amount: plan.monthlyPrice.toLocaleString(), period: "/mes" };
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

          {/* Toggle mensual / anual */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                isAnnual ? "bg-purple-600" : "bg-slate-300"
              }`}
              aria-label="Cambiar ciclo de facturación"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  isAnnual ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-slate-900" : "text-slate-400"}`}>
              Anual
            </span>
            {isAnnual && (
              <Badge className="bg-green-500 text-white text-xs font-bold px-3 py-1 animate-pulse">
                Ahorra 20%
              </Badge>
            )}
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
        <div className="grid gap-8 md:grid-cols-3 items-stretch mb-12">
          {plans.map((plan) => {
            const cardBg =
              plan.id === "pro"
                ? "bg-purple-50"
                : plan.id === "business"
                ? "bg-blue-50"
                : "bg-white";
            const cardBorder =
              plan.id === "pro"
                ? "border-2 border-purple-400 shadow-xl shadow-purple-200"
                : plan.id === "business"
                ? "border-2 border-blue-300 shadow-lg shadow-blue-100"
                : "border border-slate-200";
            const btnClass =
              plan.id === "pro"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : plan.id === "business"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-900";
            return (
              <div key={plan.id} className="relative">
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-purple-600 text-white px-4 py-1 text-sm font-semibold">
                      <Zap className="mr-1 h-3 w-3 inline" />
                      Más popular
                    </Badge>
                  </div>
                )}
                <Card
                  className={`h-full flex flex-col transition-all duration-300 cursor-default hover:scale-105 hover:shadow-xl ${
                    cardBg
                  } ${
                    cardBorder
                  } ${
                    plan.popular ? "scale-105" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    {/* Ícono ilustrativo */}
                    <div className="text-4xl mb-2">{plan.icon}</div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900">
                          ${getPrice(plan).amount}
                        </span>
                        <span className="text-slate-600">{getPrice(plan).period}</span>
                      </div>
                      {plan.id !== "free" && isAnnual && (
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          Equivale a ${Math.round(plan.annualPrice / 12).toLocaleString()}/mes
                        </p>
                      )}
                      <p className="text-sm text-slate-500 mt-2">
                        Después de 30 días gratis
                      </p>
                    </div>

                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full mb-6 font-semibold py-6 text-base ${btnClass}`}
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
            );
          })}
        </div>

        {/* Preguntas frecuentes — acordeón */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors duration-200"
                >
                  <span className="font-semibold text-slate-800 text-base">{item.q}</span>
                  <span
                    className={`ml-4 flex-shrink-0 text-2xl font-light text-purple-600 transition-transform duration-300 ${
                      openFaq === idx ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    +
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
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
