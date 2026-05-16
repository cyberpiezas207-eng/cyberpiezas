// =============================================================================
// PricingPlans - Pagina publica para comprar planes
// =============================================================================
// REEMPLAZAR archivo: client/src/pages/PricingPlans.tsx
// =============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Check,
  Loader2,
  X,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Upload,
  Gift,
} from "lucide-react";

const POS_FEATURES: Record<string, string[]> = {
  boutique: [
    "POS completo de boutique",
    "Productos ilimitados",
    "Ventas ilimitadas",
    "Múltiples sucursales",
    "Reportes y gráficas",
    "Notificaciones automáticas",
    "Soporte prioritario",
  ],
  abarrotes: [
    "POS para tiendita",
    "Inventario ilimitado",
    "Códigos de barras",
    "Ventas con fiado",
    "Reportes diarios",
    "Notificaciones de stock bajo",
    "Soporte prioritario",
  ],
  veterinaria: [
    "POS para clínica veterinaria",
    "Expediente de mascotas",
    "Citas y vacunación",
    "Productos + servicios",
    "Recibos profesionales",
    "Notificaciones automáticas",
    "Soporte prioritario",
  ],
  verduleria: [
    "POS para verdulería",
    "Catálogo visual con emojis",
    "Ventas rápidas",
    "Productos ilimitados",
    "Reportes diarios",
    "Notificaciones de ventas",
    "Soporte prioritario",
  ],
  tarima: [
    "Página pública para artistas",
    "URL personalizada",
    "Galería ilimitada de fotos",
    "Videos de YouTube",
    "Música de Spotify",
    "Sistema de bookings",
    "Soporte prioritario",
  ],
};

export default function PricingPlans() {
  const [planType, setPlanType] = useState<"monthly" | "yearly">("monthly");
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const plansQuery = trpc.pagos.plans.list.useQuery();
  const discountQuery = trpc.pagos.plans.todayDiscount.useQuery();

  const plans = plansQuery.data ?? [];
  const todayDiscount = discountQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* HERO */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-fuchsia-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-bold uppercase tracking-wider">Suscríbete</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              Planes CyberPiezas
            </h1>
            <p className="text-white/80 text-lg max-w-2xl">
              Una suscripción por cada sistema que necesites. Sin contratos largos, cancela cuando quieras.
            </p>
          </div>
        </div>

        {/* BANNER PROMO si hay descuento hoy */}
        {todayDiscount?.active && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-xl shadow-amber-500/30 animate-pulse-slow">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">¡Promoción del día!</h3>
                <p className="text-white/90 text-sm">
                  Hoy día {todayDiscount.today}: <span className="font-bold">{todayDiscount.percentage}% OFF</span> en planes mensuales. Solo por hoy.
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-3xl font-bold">{todayDiscount.percentage}%</p>
                <p className="text-xs uppercase tracking-wider">OFF</p>
              </div>
            </div>
          </div>
        )}

        {/* TOGGLE MENSUAL/ANUAL */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setPlanType("monthly")}
              className={
                "h-10 px-6 rounded-full text-sm font-bold transition-all " +
                (planType === "monthly"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              Mensual
            </button>
            <button
              onClick={() => setPlanType("yearly")}
              className={
                "h-10 px-6 rounded-full text-sm font-bold transition-all relative " +
                (planType === "yearly"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                AHORRA
              </span>
            </button>
          </div>
        </div>

        {/* GRID DE PLANES */}
        {plansQuery.isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-fuchsia-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan: any) => (
              <PlanCard
                key={plan.posCode}
                plan={plan}
                planType={planType}
                onSubscribe={() => setSelectedPos(plan.posCode)}
              />
            ))}
          </div>
        )}

        {/* INFO ADICIONAL */}
        <div className="bg-slate-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-600">
            <span className="font-bold">💡 ¿Necesitas varios sistemas?</span> Suscríbete a cada uno por separado.
            Cada sistema funciona de forma independiente con su propio panel.
          </p>
        </div>
      </div>

      {/* MODAL DE CHECKOUT */}
      {selectedPos && (
        <CheckoutModal
          posCode={selectedPos}
          planType={planType}
          plan={plans.find((p: any) => p.posCode === selectedPos)}
          onClose={() => setSelectedPos(null)}
          onSuccess={() => {
            setSelectedPos(null);
            toast.success("✅ Solicitud enviada. El admin la revisará pronto.");
            setLocation("/mis-suscripciones");
          }}
        />
      )}
    </DashboardLayout>
  );
}

// =============================================================================
// PLAN CARD
// =============================================================================
function PlanCard({
  plan,
  planType,
  onSubscribe,
}: {
  plan: any;
  planType: "monthly" | "yearly";
  onSubscribe: () => void;
}) {
  const pricing = planType === "monthly" ? plan.monthly : plan.yearly;
  const features = POS_FEATURES[plan.posCode] || [];

  return (
    <div className="bg-white border-2 border-slate-200 hover:border-fuchsia-300 rounded-3xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-purple-100 flex items-center justify-center text-2xl">
          {plan.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
      </div>

      {/* Precio */}
      <div className="mb-5">
        {pricing.discountApplied ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">
                ${pricing.finalAmount.toFixed(0)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                ${pricing.originalAmount.toFixed(0)}
              </span>
              <span className="text-sm text-slate-500">
                /{planType === "monthly" ? "mes" : "año"}
              </span>
            </div>
            <p className="text-xs text-emerald-600 font-bold mt-1">
              🎁 -{pricing.discountPercentage}% solo hoy
            </p>
          </>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">
              ${pricing.finalAmount.toFixed(0)}
            </span>
            <span className="text-sm text-slate-500">
              /{planType === "monthly" ? "mes" : "año"}
            </span>
          </div>
        )}
        {planType === "yearly" && (
          <p className="text-xs text-emerald-600 font-bold mt-1">
            💰 Ahorras ${(plan.monthly.originalAmount * 12 - plan.yearly.originalAmount).toFixed(0)} al año
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feat: string, idx: number) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={onSubscribe}
        className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-full h-12 font-bold shadow-lg shadow-fuchsia-500/30"
      >
        Suscribirme
      </Button>
    </div>
  );
}

// =============================================================================
// CHECKOUT MODAL
// =============================================================================
function CheckoutModal({
  posCode,
  planType,
  plan,
  onClose,
  onSuccess,
}: {
  posCode: string;
  planType: "monthly" | "yearly";
  plan: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"transferencia" | "mercadopago">("transferencia");
  const [proofUrl, setProofUrl] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const pricing = planType === "monthly" ? plan.monthly : plan.yearly;

  const createRequest = trpc.pagos.requests.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!proofUrl) {
      toast.error("Por favor sube tu comprobante de pago");
      return;
    }
    createRequest.mutate({
      posCode: posCode as any,
      planType,
      paymentMethod,
      proofUrl: proofUrl || undefined,
      customerNotes: customerNotes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/80">Confirmar suscripción</p>
              <h2 className="text-2xl font-bold mt-1">
                {plan.icon} {plan.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5">
          {/* RESUMEN */}
          <section className="bg-slate-50 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Resumen
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Plan:</span>
                <span className="font-bold text-slate-900">
                  {planType === "monthly" ? "Mensual" : "Anual"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sistema:</span>
                <span className="font-bold text-slate-900">{plan.name}</span>
              </div>
              {pricing.discountApplied && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Precio normal:</span>
                    <span className="line-through">
                      ${pricing.originalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Descuento ({pricing.discountPercentage}%):</span>
                    <span>
                      -${(pricing.originalAmount - pricing.finalAmount).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between items-baseline">
                <span className="text-slate-700 font-bold">Total:</span>
                <span className="text-3xl font-bold text-slate-900">
                  ${pricing.finalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          {/* MÉTODO DE PAGO */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              💳 Método de pago
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "transferencia", label: "Transferencia", icon: "🏦" },
                { id: "mercadopago", label: "MercadoPago", icon: "💳" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={
                    "p-3 rounded-xl border-2 transition-all text-center " +
                    (paymentMethod === method.id
                      ? "border-fuchsia-500 bg-fuchsia-50"
                      : "border-slate-200 bg-white hover:border-slate-300")
                  }
                >
                  <div className="text-2xl mb-1">{method.icon}</div>
                  <div className="text-xs font-bold text-slate-700">{method.label}</div>
                </button>
              ))}
            </div>
          </section>

          {/* INSTRUCCIONES DE PAGO */}
          {paymentMethod === "transferencia" && (
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2">🏦 Datos para transferencia</h4>
              <div className="text-xs text-blue-800 space-y-1">
                <p><span className="font-bold">Banco:</span> Banco Azteca</p>
                <p><span className="font-bold">A nombre de:</span> David Farfán</p>
                <p><span className="font-bold">CLABE:</span> 127542013042637791</p>
                <p><span className="font-bold">Concepto:</span> {plan.name} - {planType}</p>
              </div>
              <p className="text-xs text-blue-700 mt-2 italic">
                💡 Después de transferir, sube el comprobante aquí abajo.
              </p>
            </section>
          )}

          {paymentMethod === "mercadopago" && (
            <section className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-cyan-900 mb-1">💳 MercadoPago</h4>
              <p className="text-xs text-cyan-800">
                Solicita el link de pago al admin por WhatsApp.
                <br />
                Después de pagar, sube el comprobante o captura.
              </p>
            </section>
          )}

          {/* UPLOAD COMPROBANTE */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              📎 Comprobante de pago *
            </h3>
              {proofUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border-2 border-emerald-300">
                    <img
                      src={proofUrl}
                      alt="Comprobante"
                      className="w-full max-h-64 object-contain bg-slate-50"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => setProofUrl("")}
                        className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 text-center font-bold">
                    ✅ Comprobante cargado
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 mb-3">
                    Sube foto o captura de tu pago
                  </p>
                  <CloudinaryUpload
                    label="Subir comprobante"
                    folder="pagos/comprobantes"
                    onUploaded={(url) => {
                      setProofUrl(url);
                    }}
                  />
                </div>
              )}
            </section>

          {/* NOTAS */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              💬 Notas (opcional)
            </h3>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Algo que quieras decirle al admin..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-400 focus:outline-none"
            />
          </section>

          {/* SUBMIT */}
          <Button
            onClick={handleSubmit}
            disabled={createRequest.isPending}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full h-14 font-bold text-base shadow-lg shadow-emerald-500/30"
          >
            {createRequest.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Enviar solicitud (${pricing.finalAmount.toFixed(0)})
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            El admin revisará tu pago y activará tu acceso pronto.
          </p>
        </div>
      </div>
    </div>
  );
}
