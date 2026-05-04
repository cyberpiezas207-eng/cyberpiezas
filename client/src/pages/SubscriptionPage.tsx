import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";

export default function SubscriptionPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPlan = params.get("plan") || "professional";

  const [selectedPlan, setSelectedPlan] = useState<"free" | "professional">(
    (initialPlan as "free" | "professional") || "professional"
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    paymentMethod: "transfer" as "transfer" | "paypal",
  });
  const [comprobante, setComprobante] = useState<File | null>(null);

  const plans = {
    free: {
      name: "Gratis",
      price: "$0",
      period: "/mes",
      description: "Para empezar",
      features: ["Acceso básico", "1 Sistema POS", "Inventario simple", "Soporte por email"],
      bankData: null,
    },
    professional: {
      name: "Profesional",
      price: "$170",
      period: "/mes MXN",
      description: "Para pequeños negocios",
      features: ["Múltiples sistemas", "Inventario avanzado", "Reportes detallados", "Soporte prioritario"],
      bankData: {
        bank: "AZTECA",
        account: "4027660019183039",
        clabe: "127542013042637791",
        holder: "David Farfan",
      },
    },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setComprobante(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!formData.name || !formData.email) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    // Si es plan profesional y elige transferencia, requiere comprobante
    if (selectedPlan === "professional" && formData.paymentMethod === "transfer" && !comprobante) {
      alert("Por favor sube el comprobante de pago");
      return;
    }

    // Aquí iría la lógica para enviar los datos al servidor
    console.log({
      plan: selectedPlan,
      formData,
      comprobante: comprobante?.name,
    });

    alert("¡Solicitud de suscripción enviada! Te contactaremos pronto.");
    setLocation("/cyberpiezas");
  };

  const currentPlan = plans[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => setLocation("/cyberpiezas")}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Suscripción
          </h1>
          <div className="w-20" />
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Plan Selection */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Elige tu Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Gratis */}
            <Card
              className={`p-8 cursor-pointer transition-all ${
                selectedPlan === "free"
                  ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 border-2"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => setSelectedPlan("free")}
            >
              <h3 className="text-2xl font-bold text-white mb-2">Gratis</h3>
              <p className="text-slate-400 mb-4">Para empezar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <ul className="space-y-2">
                {plans.free.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              {selectedPlan === "free" && (
                <Badge className="mt-4 bg-purple-500">Seleccionado</Badge>
              )}
            </Card>

            {/* Plan Profesional */}
            <Card
              className={`p-8 cursor-pointer transition-all relative ${
                selectedPlan === "professional"
                  ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 border-2"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => setSelectedPlan("professional")}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                  Más Popular
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-4">Profesional</h3>
              <p className="text-slate-300 mb-4">Para pequeños negocios</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$170</span>
                <span className="text-slate-300">/mes MXN</span>
              </div>
              <ul className="space-y-2">
                {plans.professional.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              {selectedPlan === "professional" && (
                <Badge className="mt-4 bg-purple-500">Seleccionado</Badge>
              )}
            </Card>
          </div>
        </div>

        {/* Form Section */}
        <Card className="bg-slate-800/50 border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-white mb-8">Completa tu Información</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="Tu nombre"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="tu@email.com"
                required
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre del Negocio
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="Mi Negocio"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="+52 1234567890"
              />
            </div>

            {/* Payment Method - Solo para plan profesional */}
            {selectedPlan === "professional" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-4">
                    Método de Pago
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="transfer"
                        checked={formData.paymentMethod === "transfer"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethod: e.target.value as "transfer" | "paypal",
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-white">Transferencia Bancaria</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        checked={formData.paymentMethod === "paypal"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethod: e.target.value as "transfer" | "paypal",
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-white">PayPal (davids207@hotmail.com)</span>
                    </label>
                  </div>
                </div>

                {/* Bank Data - Si elige transferencia */}
                {formData.paymentMethod === "transfer" && plans.professional.bankData && (
                  <Card className="bg-slate-700/50 border-slate-600 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Datos Bancarios</h3>
                    <div className="space-y-3 text-slate-300">
                      <div>
                        <span className="text-slate-400">Banco:</span> {plans.professional.bankData.bank}
                      </div>
                      <div>
                        <span className="text-slate-400">Tarjeta:</span> {plans.professional.bankData.account}
                      </div>
                      <div>
                        <span className="text-slate-400">CLABE:</span> {plans.professional.bankData.clabe}
                      </div>
                      <div>
                        <span className="text-slate-400">Titular:</span> {plans.professional.bankData.holder}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Comprobante Upload */}
                {formData.paymentMethod === "transfer" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Comprobante de Pago *
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      required={formData.paymentMethod === "transfer"}
                    />
                    {comprobante && (
                      <p className="text-sm text-green-400 mt-2">✓ {comprobante.name}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 text-lg"
            >
              Confirmar Suscripción
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
