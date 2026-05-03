import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Banknote, Check, Loader2, Upload, Zap } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { WelcomeMessage } from "./WelcomeMessage";
import { useLocation } from "wouter";

type PlanId = "free" | "basic" | "professional" | "premium" | "basic-annual" | "professional-annual" | "premium-annual";
type MonthlyPlanId = "basic" | "professional" | "premium";

type PlanInfo = {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  billingType: "monthly" | "annual";
  description: string;
  badge?: string;
  features: string[];
};

export default function PayPalSubscriptionPlans() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basic");
  const [payerName, setPayerName] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [billingType, setBillingType] = useState<"monthly" | "annual">("monthly");
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("boutique-pos-welcome-seen") === "true";
    }
    return false;
  });

  // Calcular precio anual con 15% de descuento
  const getAnnualPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.85);
  };

  const getAnnualSavings = (monthlyPrice: number) => {
    const annualFull = monthlyPrice * 12;
    const annualDiscounted = getAnnualPrice(monthlyPrice);
    return annualFull - annualDiscounted;
  };

  const { data: plans, isLoading } = trpc.paypal.getPlans.useQuery();
  const createSubscriptionMutation = trpc.paypal.createSubscriptionCheckout.useMutation();
  const createAnnualMutation = trpc.paypal.createAnnualCheckout.useMutation();

  const openCheckout = (planId: PlanId) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (user?.role !== "admin") {
      toast.error("Solo el administrador puede cambiar o solicitar planes.");
      return;
    }

    if (planId === "free") {
      toast.success("El plan gratis se activa directamente al registrarte. Si después creces, el administrador podrá subir de plan desde este mismo panel.");
      return;
    }

    const isAnnual = planId.includes("annual");
    setSelectedPlanId(planId);
    setCheckoutType(isAnnual ? "annual" : "monthly");
    setCheckoutOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setPayerName("");
    setTransferRef("");
    setNotes("");
    setProofFile(null);
    setProofPreview(null);
  };

  const handleSubmit = async () => {
    if (!payerName.trim()) {
      toast.error("Ingresa el nombre del titular de la transferencia.");
      return;
    }

    if (!transferRef.trim()) {
      toast.error("Ingresa la referencia o folio de la transferencia.");
      return;
    }

    const proofPayload =
      proofFile && proofPreview
        ? {
            proofBase64: proofPreview,
            proofMimeType: proofFile.type,
            proofFileName: proofFile.name,
          }
        : {};

    try {
      if (checkoutType === "annual") {
        await createAnnualMutation.mutateAsync({
          payerName,
          transferReference: transferRef,
          notes: notes || undefined,
          ...proofPayload,
        });
      } else {
        await createSubscriptionMutation.mutateAsync({
          planId: selectedPlanId as MonthlyPlanId,
          payerName,
          transferReference: transferRef,
          notes: notes || undefined,
          ...proofPayload,
        });
      }

      toast.success("Tu solicitud de pago fue enviada. Te llevaremos al panel de suscripción para que puedas revisar el estado de validación.");
      setCheckoutOpen(false);
      resetForm();
      setLocation("/subscription");
    } catch (error) {
      console.error(error);
      toast.error("No fue posible registrar tu solicitud. Verifica los datos e intenta nuevamente.");
    }
  };

  const currentPlan: PlanInfo | undefined =
    checkoutType === "annual"
      ? (plans?.annual as PlanInfo | undefined)
      : (plans?.monthly.find((plan) => plan.id === selectedPlanId) as PlanInfo | undefined);

  const faqs = [
    {
      question: "¿Cómo se activa mi suscripción?",
      answer:
        "Realiza tu transferencia bancaria en MXN, sube tu comprobante y un administrador validará el pago para activar el plan correspondiente.",
    },
    {
      question: "¿Cuánto tarda la activación?",
      answer:
        "Normalmente la validación ocurre en menos de 24 horas hábiles después de que registras tu comprobante.",
    },
    {
      question: "¿Puedo empezar gratis y luego crecer?",
      answer:
        "Sí. El plan gratis te permite operar con 1 sucursal, 1 usuario, hasta 100 productos y 200 ventas por mes. Cuando tu negocio crezca, podrás subir al plan que mejor se adapte a tu operación.",
    },
    {
      question: "¿Puedo cambiar de plan?",
      answer:
        "Sí. Solo debes seleccionar el nuevo plan, registrar la transferencia correspondiente y subir el comprobante actualizado para revisión.",
    },
    {
      question: "¿La anualidad incluye renovaciones?",
      answer:
        "Sí. La anualidad se renueva automáticamente cada año. Puedes cancelarla en cualquier momento.",
    },
  ];

  const isSubmitting = createSubscriptionMutation.isPending || createAnnualMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-14 text-center">
          <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary">
            Sistema POS Boutique
          </Badge>
          <h1 className="font-['Playfair_Display'] text-4xl font-bold text-foreground md:text-5xl">
            Planes de Suscripción
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Elige el plan ideal para tu boutique y registra tu pago por transferencia bancaria o SPEI.
            Este flujo funciona como una solicitud manual con comprobante y seguimiento administrativo dentro del sistema.
          </p>
          {isAuthenticated && user?.role !== "admin" ? (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-sm">
              Solo el administrador principal puede cambiar, renovar o solicitar un plan distinto. Tú puedes revisar la información, pero no enviar cambios de suscripción.
            </div>
          ) : null}
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-5 py-3 text-left shadow-sm">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Cobro manual por transferencia en MXN</p>
              <p className="text-xs text-muted-foreground">
                Subes tu comprobante y un administrador activa tu suscripción después de validarlo.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          {plans?.free ? (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-foreground">{plans.free.name}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{plans.free.description}</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white">Plan funcional</Badge>
                </div>
                <div className="pt-3">
                  <span className="text-4xl font-semibold text-primary">$0</span>
                  <span className="ml-2 text-sm text-muted-foreground">/ mes</span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <ul className="space-y-3">
                  {plans.free.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                  <p className="text-sm font-medium text-foreground">Límites del plan gratis</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Pensado para negocios pequeños. Cuando necesites más productos, más ventas, más usuarios o una segunda sucursal, podrás subir de plan.
                  </p>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <p>• 1 sola sucursal</p>
                    <p>• 1 solo usuario</p>
                    <p>• Historial reciente de 30 días</p>
                    <p>• Sin reportes avanzados ni soporte prioritario</p>
                  </div>
                  <Button className="mt-5 w-full" size="lg" variant="outline" onClick={() => openCheckout("free")} disabled={isAuthenticated && user?.role !== "admin"}>
                    {isAuthenticated && user?.role !== "admin" ? "Solo administrador" : "Empezar gratis"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Selector de tipo de pago */}
        <div className="mb-12 flex justify-center gap-4">
          <button
            onClick={() => setBillingType("monthly")}
            className={`rounded-lg px-8 py-3 font-semibold transition-all ${
              billingType === "monthly"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "border-2 border-primary/30 text-foreground hover:border-primary/60"
            }`}
          >
            Pago Mensual
          </button>
          <button
            onClick={() => setBillingType("annual")}
            className={`relative rounded-lg px-8 py-3 font-semibold transition-all ${
              billingType === "annual"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "border-2 border-primary/30 text-foreground hover:border-primary/60"
            }`}
          >
            Pago Anual
            <span className="absolute -top-3 right-2 rounded-full bg-accent px-2 py-1 text-xs font-bold text-white">
              Ahorra 15%
            </span>
          </button>
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="min-h-[360px] animate-pulse border-border/60" />
              ))
            : plans?.monthly.map((plan) => (
                <Card key={plan.id} className="relative overflow-hidden border-border/60 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  {plan.badge ? (
                    <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  ) : null}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                    <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                    <div className="pt-3">
                      {billingType === "monthly" ? (
                        <>
                          <span className="text-4xl font-semibold text-primary">${plan.price}</span>
                          <span className="ml-2 text-sm text-muted-foreground">/ mes</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-semibold text-primary">${getAnnualPrice(plan.price)}</span>
                          <span className="ml-2 text-sm text-muted-foreground">/ año</span>
                          <div className="mt-2 text-xs text-accent font-semibold">
                            Ahorras ${getAnnualSavings(plan.price)}
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      Desbloquea más sucursales, más usuarios y mejores reportes al subir de plan.
                    </div>
                    <Button className="w-full" size="lg" onClick={() => openCheckout(billingType === "annual" ? `${plan.id}-annual` as PlanId : plan.id as PlanId)} disabled={isAuthenticated && user?.role !== "admin"}>
                      {isAuthenticated && user?.role !== "admin" ? "Solo administrador" : billingType === "annual" ? `Elegir ${plan.name} Anual` : `Elegir ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "1. Realiza tu transferencia",
              description: "Haz tu pago por transferencia bancaria o SPEI en pesos mexicanos.",
            },
            {
              title: "2. Registra tu comprobante",
              description: "Sube la referencia y el comprobante dentro del sistema para revisión.",
            },
            {
              title: "3. Activación administrativa",
              description: "Tu acceso se activa cuando el administrador valida el pago recibido.",
            },
          ].map((step) => (
            <Card key={step.title} className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm md:p-8">
          <h2 className="font-['Playfair_Display'] text-3xl font-semibold text-foreground">
            Preguntas frecuentes
          </h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <button
                  key={faq.question}
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full rounded-2xl border border-border/60 bg-background/70 p-4 text-left transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-foreground">{faq.question}</span>
                    <span className="text-primary">{isOpen ? "−" : "+"}</span>
                  </div>
                  {isOpen ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">
              Registrar pago por transferencia
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Resumen del plan
              </p>
              <h3 className="mt-3 font-['Playfair_Display'] text-2xl font-semibold text-foreground">
                {currentPlan?.name ?? "Plan seleccionado"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {currentPlan?.description ?? "Selecciona un plan para continuar."}
              </p>
              <div className="mt-5 rounded-2xl border border-border/60 bg-background/90 p-4">
                <p className="text-sm text-muted-foreground">Monto a transferir</p>
                <p className="mt-2 text-3xl font-semibold text-primary">
                  ${currentPlan?.price ?? 0} {currentPlan?.currency ?? "MXN"}
                </p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Una vez enviada la transferencia, captura el folio o referencia y súbela junto con el comprobante.
                </p>
              </div>
              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Datos de pago</p>
                <div className="rounded-lg bg-background/90 p-3">
                  <p className="text-xs text-muted-foreground">CLABE Mercado Pago</p>
                  <p className="font-mono text-sm font-semibold text-foreground">722969010700732537</p>
                  <p className="text-xs text-muted-foreground">A nombre de: María Gómez</p>
                </div>
                <p className="font-medium text-foreground">Contacto para folios</p>
                <p>WhatsApp: 7354946224</p>
                <p>Correo: cyberpiezas207@gmail.com</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payerName">Nombre del titular</Label>
                <Input
                  id="payerName"
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  placeholder="Ej. María Fernanda López"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferRef">Referencia o folio de transferencia</Label>
                <Input
                  id="transferRef"
                  value={transferRef}
                  onChange={(event) => setTransferRef(event.target.value)}
                  placeholder="Ej. SPEI-78451293"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Puedes añadir observaciones relevantes sobre el pago."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">Comprobante de pago</Label>
                <label
                  htmlFor="proof"
                  className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <Upload className="h-4 w-4 text-primary" />
                  <span>{proofFile ? proofFile.name : "Seleccionar archivo"}</span>
                </label>
                <Input id="proof" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                {proofPreview ? (
                  <img
                    src={proofPreview}
                    alt="Vista previa del comprobante"
                    className="max-h-48 w-full rounded-2xl border border-border/60 object-cover"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCheckoutOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WelcomeMessage
        isOpen={showWelcome}
        onClose={() => {
          setShowWelcome(false);
          localStorage.setItem("boutique-pos-welcome-seen", "true");
          setHasSeenWelcome(true);
        }}
        userName={user?.name || undefined}
      />
    </div>
  );
}
