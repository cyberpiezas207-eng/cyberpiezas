import { Link } from "wouter";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, PawPrint, Store, Target, ArrowLeft, Copy, Check } from "lucide-react";

// ============================================================
// DONACIONES CONFIRMADAS — Editar manualmente al verificar
// comprobante de cada donante. Solo estas cantidades avanzan
// la barra de progreso. Las no confirmadas NO cuentan.
// Formato: { [campaignId]: monto_total_confirmado_en_MXN }
// ============================================================
const CONFIRMED_DONATIONS: Record<string, number> = {
  cyberpiezas: 0,   // <- editar al confirmar donaciones para Cyberpiezas
  perrito: 0,       // <- editar al confirmar donaciones para el perrito
  negocio: 0,       // <- editar al confirmar donaciones para el negocio
};

const campaigns = [
  {
    id: "cyberpiezas",
    title: "Para CyberPiezas",
    subtitle: "Que el proyecto siga creciendo",
    description:
      "Hosting, dominios, infraestructura y tiempo para construir herramientas accesibles para negocios mexicanos.",
    goal: 15000,
    icon: Heart,
    accent: "from-fuchsia-500 via-purple-500 to-indigo-500",
    softBg: "from-fuchsia-50 to-purple-50",
    buttonLabel: "Apoyar CyberPiezas",
  },
  {
    id: "perrito",
    title: "Para un perrito de la calle",
    subtitle: "Comida, vacunas y un hogar",
    description:
      "Alimento, valoracion veterinaria, medicamentos, baño, resguardo temporal y seguimiento para encontrarle una mejor oportunidad.",
    goal: 5000,
    icon: PawPrint,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    softBg: "from-amber-50 to-orange-50",
    buttonLabel: "Apoyar un perrito",
  },
  {
    id: "negocio",
    title: "Para un negocio que arranca",
    subtitle: "Inventario, POS y herramientas",
    description:
      "Equipar a un negocio con inventario inicial, punto de venta, camaras y herramientas basicas para que pueda operar con orden y seguridad.",
    goal: 40000,
    icon: Store,
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    softBg: "from-emerald-50 to-cyan-50",
    buttonLabel: "Impulsar un negocio",
  },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

interface DonationDialogProps {
  campaign: (typeof campaigns)[number];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DonationDialog({ campaign, open, onOpenChange }: DonationDialogProps) {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "paypal">("transfer");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bankData = {
    bank: "Banco Azteca",
    account: "4027660019183039",
    clabe: "127542013042637791",
    holder: "David Farfan",
  };

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setComprobante(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !email) {
      alert("Por favor completa los campos requeridos");
      return;
    }

    if (!isAnonymous && !name) {
      alert("Por favor ingresa tu nombre o marca la opcion anonimo");
      return;
    }

    if (paymentMethod === "transfer" && !comprobante) {
      alert("Por favor sube el comprobante de pago");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simular envio de donacion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const donorName = isAnonymous ? "Anonimo" : name;
      alert(
        "Gracias " + donorName + "! Tu donacion de " + formatCurrency(Number(amount)) +
        " para \"" + campaign.title + "\" ha sido registrada.\n\nTe enviaremos un recibo a " + email + "."
      );

      // Resetear formulario
      setAmount("");
      setEmail("");
      setName("");
      setMessage("");
      setIsAnonymous(false);
      setComprobante(null);
      setPaymentMethod("transfer");
      onOpenChange(false);
    } catch (error) {
      alert("Hubo un error al procesar tu donacion. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-slate-900 border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="pb-2">
          <div className={"inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-gradient-to-br " + campaign.accent + " mb-3 shadow-lg"}>
            <campaign.icon className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-2xl tracking-tight text-slate-900">
            {campaign.title}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-base">
            {campaign.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Tu nombre
            </Label>
            <Input
              id="name"
              placeholder="Juan Perez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnonymous}
              className="bg-slate-50 border-slate-200 text-slate-900 disabled:opacity-50 h-11 rounded-xl"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Donar como anonimo
            </label>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Tu email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl"
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-700 font-medium">
              Cantidad a donar (MXN) *
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl text-lg font-semibold"
              min="1"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700 font-medium">
              Mensaje o dedicatoria (opcional)
            </Label>
            <textarea
              id="message"
              placeholder="Escribe un mensaje opcional..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none"
              rows={3}
            />
          </div>

          {/* Metodo de Pago */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium block mb-2">Metodo de pago</Label>
            <div className="space-y-2">
              <label
                className={
                  "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border " +
                  (paymentMethod === "transfer"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={(e) => setPaymentMethod(e.target.value as "transfer" | "paypal")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">Transferencia bancaria</p>
                  <p className="text-xs text-slate-500">Banco Azteca · CLABE / SPEI</p>
                </div>
              </label>
              <label
                className={
                  "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border " +
                  (paymentMethod === "paypal"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={paymentMethod === "paypal"}
                  onChange={(e) => setPaymentMethod(e.target.value as "transfer" | "paypal")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">PayPal</p>
                  <p className="text-xs text-slate-500">davids207@hotmail.com</p>
                </div>
              </label>
            </div>
          </div>

          {/* Datos Bancarios */}
          {paymentMethod === "transfer" && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-slate-900 font-semibold text-sm">Datos bancarios</h4>
              <div className="space-y-2">
                <DataRow label="Banco" value={bankData.bank} />
                <DataRow
                  label="CLABE"
                  value={bankData.clabe}
                  copyable
                  onCopy={() => handleCopy(bankData.clabe, "clabe")}
                  copied={copiedField === "clabe"}
                />
                <DataRow
                  label="Tarjeta"
                  value={bankData.account}
                  copyable
                  onCopy={() => handleCopy(bankData.account, "account")}
                  copied={copiedField === "account"}
                />
                <DataRow label="Titular" value={bankData.holder} />
                <DataRow label="Concepto sugerido" value={campaign.title} highlight />
              </div>
            </div>
          )}

          {/* Comprobante */}
          {paymentMethod === "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="comprobante" className="text-slate-700 font-medium">
                Comprobante de pago (imagen o PDF) *
              </Label>
              <input
                id="comprobante"
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:text-xs hover:file:bg-slate-800"
              />
              {comprobante && (
                <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {comprobante.name}
                </p>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Resumen:</span> Donaras{" "}
              <span className="text-xl font-bold text-slate-900">
                {amount ? formatCurrency(Number(amount)) : "$0"}
              </span>{" "}
              para{" "}
              <span className="font-semibold text-slate-900">{campaign.title}</span>
            </p>
          </div>

          {/* Boton Confirmar */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !email || (!isAnonymous && !name) || (paymentMethod === "transfer" && !comprobante)}
            className={"w-full rounded-full h-12 bg-gradient-to-r " + campaign.accent + " text-base font-semibold text-white shadow-xl transition-all hover:scale-[1.01] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"}
          >
            {isSubmitting ? "Procesando..." : "Confirmar donacion"}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Tu donacion es segura y sera procesada de manera confidencial.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DataRow({
  label,
  value,
  copyable,
  onCopy,
  copied,
  highlight,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <code
          className={
            "text-sm font-mono truncate " +
            (highlight ? "text-slate-900 font-bold" : "text-slate-700")
          }
        >
          {value}
        </code>
        {copyable && (
          <button
            onClick={onCopy}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            title="Copiar"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function Donations() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const currentCampaign = campaigns.find((c) => c.id === openDialog);

  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased">
      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-fuchsia-200/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-24 lg:pt-32 pb-16 lg:pb-20">
          <Link href="/cyberpiezas">
            <button className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-10 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Volver a CyberPiezas
            </button>
          </Link>

          <div className="max-w-4xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-6">
              Donaciones
            </p>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-slate-900 leading-[0.95]">
              Tres causas.
              <br />
              <span className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">
                Una cuenta.
              </span>
              <br />
              <span className="text-slate-400">Cero intermediarios.</span>
            </h1>
            <p className="mt-10 text-xl sm:text-2xl text-slate-600 max-w-3xl font-light leading-relaxed tracking-tight">
              Apoya a CyberPiezas, a un perrito de la calle, o a un negocio que arranca.{" "}
              <span className="text-slate-900 font-normal">Tu eliges. Tu dinero llega directo.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3 CAUSAS */}
      <section className="bg-white pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const confirmed = CONFIRMED_DONATIONS[campaign.id] ?? 0;
              const percentage = Math.min(100, Math.round((confirmed / campaign.goal) * 100));
              const Icon = campaign.icon;

              return (
                <Card
                  key={campaign.id}
                  className="group overflow-hidden border-slate-200/60 bg-white shadow-sm hover:shadow-2xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all rounded-3xl"
                >
                  <div className={"h-1.5 w-full bg-gradient-to-r " + campaign.accent} />

                  <CardHeader className="space-y-5 pt-8">
                    <div
                      className={"inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br " + campaign.accent + " shadow-lg group-hover:scale-110 transition-transform"}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                        {campaign.title}
                      </CardTitle>
                      <p className="text-sm font-medium text-slate-500">{campaign.subtitle}</p>
                      <CardDescription className="text-sm leading-relaxed text-slate-600 pt-2">
                        {campaign.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Progress */}
                    <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">Recaudado</span>
                        <span className="font-bold text-slate-900">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2 bg-slate-200" />
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                            Meta
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-900 tracking-tight">
                            {formatCurrency(campaign.goal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                            Actual
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-900 tracking-tight">
                            {formatCurrency(confirmed)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Que se destina */}
                    <div className={"rounded-2xl bg-gradient-to-br " + campaign.softBg + " border border-slate-200/40 p-4 text-sm leading-relaxed text-slate-700"}>
                      <div className="mb-2 flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-[0.15em]">
                        <Target className="h-3.5 w-3.5" />
                        Para que se destina
                      </div>
                      <p className="text-sm">{campaign.description}</p>
                    </div>

                    <Button
                      onClick={() => setOpenDialog(campaign.id)}
                      className={"w-full rounded-full h-12 bg-gradient-to-r " + campaign.accent + " text-base font-semibold text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.01] hover:-translate-y-0.5"}
                    >
                      {campaign.buttonLabel}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRANSPARENCIA */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-6">
            Transparencia
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-slate-900 leading-tight mb-6">
            Todas las donaciones llegan
            <br />
            a la misma cuenta.
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed font-light">
            El concepto que pongas me dice a que causa la quieres asignar.{" "}
            <span className="text-slate-900 font-normal">
              Cada mes publico cuanto se recibio para cada una.
            </span>
          </p>
        </div>
      </section>

      {/* CIERRE */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <div className="text-3xl mb-6 tracking-[0.5em]">💚</div>
          <p className="text-2xl sm:text-3xl font-light text-slate-700 italic leading-relaxed tracking-tight max-w-xl mx-auto mb-8">
            "Cada peso ayuda. Gracias por creer."
          </p>
          <Link href="/cyberpiezas">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12 px-8 text-base font-semibold shadow-xl">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </section>

      {currentCampaign && (
        <DonationDialog
          campaign={currentCampaign}
          open={!!openDialog}
          onOpenChange={(open) => !open && setOpenDialog(null)}
        />
      )}
    </main>
  );
}
