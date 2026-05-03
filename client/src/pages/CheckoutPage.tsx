import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle, Copy, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const planDetails = {
  basic: { name: "Básico", price: 299, features: ["1 caja", "Inventario básico", "Soporte WhatsApp"] },
  pro: { name: "Pro", price: 599, features: ["3 cajas", "Reportes avanzados", "Soporte prioritario"] },
  business: { name: "Business", price: 999, features: ["Cajas ilimitadas", "Facturación", "Soporte 24/7"] },
};

// Datos bancarios del propietario - TODO: Obtener de configuración
const BANK_DETAILS = {
  bankName: "Banco Azteca",
  accountHolder: "Deivid Farfán",
  accountNumber: "1234567890",
  clabe: "127002010012345678",
};

export function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [planId, setPlanId] = useState<string>("pro");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    businessName: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const notifyOwner = trpc.system.notifyOwner.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan") || "pro";
    setPlanId(plan);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCheckout = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.businessName) {
      alert("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      // Notificar al propietario sobre la nueva suscripción
      await notifyOwner.mutateAsync({
        title: `Nueva solicitud de suscripción: ${planId.toUpperCase()}`,
        content: `${formData.businessName} - ${formData.name} (${formData.email}, ${formData.phone})\n\nMonto: $${planDetails[planId as keyof typeof planDetails].price}/mes`,
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Error al procesar. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const plan = planDetails[planId as keyof typeof planDetails];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 mb-4">Debes iniciar sesión para continuar</p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-green-200">
          <CardContent className="pt-12 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud enviada!</h1>
              <p className="text-slate-600">
                Hemos recibido tu solicitud. En breve recibirás las instrucciones de pago por correo.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Próximos pasos:</p>
              <ol className="text-left space-y-1 text-xs">
                <li>1. Recibirás un correo con los datos bancarios</li>
                <li>2. Realiza la transferencia con referencia: {user.id}</li>
                <li>3. Tu acceso se activa al confirmar el pago</li>
              </ol>
            </div>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Ir a mi panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/pricing")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a planes
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Resumen del plan */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de tu compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                <p className="text-slate-600 text-sm mb-4">Plan mensual</p>
                <div className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Primer mes (prueba gratis)</span>
                  <span className="font-semibold">$0</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-slate-600">A partir del mes 2</span>
                  <span className="font-semibold text-lg">${plan.price}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  ℹ️ Primer mes gratis. Después: ${plan.price}/mes por transferencia
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario */}
          <Card>
            <CardHeader>
              <CardTitle>Información de contacto</CardTitle>
              <CardDescription>Completa tus datos para comenzar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nombre del negocio</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  placeholder="Ej: Mi Boutique"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Tu nombre"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+52 555 1234567"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                ✓ Pago por transferencia bancaria
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Solicitar acceso"
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Al continuar, aceptas nuestros términos y condiciones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Datos bancarios */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Datos para transferencia (después de confirmar)</CardTitle>
            <CardDescription>Recibirás estos datos por correo al confirmar tu solicitud</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">Banco</Label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
                  <span className="text-sm font-mono flex-1">{BANK_DETAILS.bankName}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.bankName, "bank")}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    {copied === "bank" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Titular</Label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
                  <span className="text-sm font-mono flex-1">{BANK_DETAILS.accountHolder}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.accountHolder, "holder")}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    {copied === "holder" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Número de cuenta</Label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
                  <span className="text-sm font-mono flex-1">{BANK_DETAILS.accountNumber}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.accountNumber, "account")}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    {copied === "account" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">CLABE</Label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
                  <span className="text-sm font-mono flex-1">{BANK_DETAILS.clabe}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.clabe, "clabe")}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    {copied === "clabe" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CheckoutPage;
