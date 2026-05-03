import { Heart, PawPrint, Store, ArrowRight, ShieldCheck, Target } from "lucide-react";
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

const campaigns = [
  {
    id: "cyberpiezas",
    title: "Donación para Cyberpiezas",
    description:
      "Este apoyo se destina a fortalecer la plataforma, mejorar herramientas, mantener infraestructura y seguir construyendo soluciones útiles para negocios reales.",
    goal: 15000,
    raised: 0,
    icon: Heart,
    accent: "from-fuchsia-500 via-purple-500 to-indigo-500",
    buttonLabel: "Apoyar a Cyberpiezas",
  },
  {
    id: "perrito",
    title: "Donación para ayudar a un perrito en situación de calle",
    description:
      "La meta cubre alimento, valoración veterinaria, medicamentos, baño, resguardo temporal y seguimiento para encontrarle una mejor oportunidad.",
    goal: 5000,
    raised: 0,
    icon: PawPrint,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    buttonLabel: "Apoyar a un perrito",
  },
  {
    id: "negocio",
    title: "Ayudemos un negocio",
    description:
      "Esta campaña busca equipar a un negocio con inventario inicial, punto de venta, cámaras y herramientas básicas para que pueda operar con orden y seguridad.",
    goal: 40000,
    raised: 0,
    icon: Store,
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !email || !name) {
      alert("Por favor completa todos los campos");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simular envío de donación
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Aquí iría la integración real con Stripe o PayPal
      alert(
        `¡Gracias ${name}! Tu donación de $${amount} para "${campaign.title}" ha sido registrada.\n\nTe enviaremos un recibo a ${email}.`
      );

      // Resetear formulario
      setAmount("");
      setEmail("");
      setName("");
      onOpenChange(false);
    } catch (error) {
      alert("Hubo un error al procesar tu donación. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">{campaign.title}</DialogTitle>
          <DialogDescription className="text-slate-300">{campaign.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">
              Tu nombre
            </Label>
            <Input
              id="name"
              placeholder="Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/20 bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-white">
              Tu email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/20 bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <Label htmlFor="amount" className="text-white">
              Cantidad a donar (MXN)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-white/20 bg-slate-900 text-white placeholder:text-slate-500"
              min="1"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">Resumen:</span> Donarás{" "}
              <span className="text-lg font-bold text-white">{amount ? formatCurrency(Number(amount)) : "$0"}</span> para{" "}
              <span className="font-semibold text-white">{campaign.title}</span>
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !email || !name}
            className={`w-full rounded-2xl bg-gradient-to-r ${campaign.accent} text-base font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? "Procesando..." : "Confirmar donación"}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            Tu donación es segura y será procesada de manera confidencial.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Donations() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const currentCampaign = campaigns.find((c) => c.id === openDialog);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.35),_transparent_40%),radial-gradient(circle_at_right,_rgba(34,211,238,0.2),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)]">
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1 text-sm text-fuchsia-200">
              <Heart className="h-4 w-4" />
              Donaciones con propósito claro
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              Ayuda a que <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Cyberpiezas</span> también transforme historias.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
              Aquí puedes abrir cada causa, revisar para qué se usará el dinero y ver cómo avanza cada meta. La intención es simple:
              apoyar proyectos reales, ayudar a quien lo necesita y convertir tecnología en oportunidades.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cyberpiezas">
                <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100">Volver a Cyberpiezas</Button>
              </Link>
              <Button variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10">
                Ver cómo donar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const percentage = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
            const Icon = campaign.icon;

            return (
              <Card key={campaign.id} className="overflow-hidden border-white/10 bg-white/5 text-white shadow-2xl shadow-black/20 backdrop-blur">
                <div className={`h-2 w-full bg-gradient-to-r ${campaign.accent}`} />
                <CardHeader className="space-y-4">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${campaign.accent} shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl leading-tight text-white">{campaign.title}</CardTitle>
                    <CardDescription className="text-sm leading-7 text-slate-300">{campaign.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Recaudado</span>
                      <span className="font-semibold text-white">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-3 bg-slate-800" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Meta</p>
                        <p className="mt-1 text-lg font-bold text-white">{formatCurrency(campaign.goal)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Actual</p>
                        <p className="mt-1 text-lg font-bold text-white">{formatCurrency(campaign.raised)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <Target className="h-4 w-4" />
                      ¿Para qué se destina?
                    </div>
                    <p>
                      El avance se muestra para que cualquier persona entienda con claridad cuánto falta y por qué vale la pena apoyar esta causa.
                    </p>
                  </div>

                  <Button
                    onClick={() => setOpenDialog(campaign.id)}
                    className={`w-full rounded-2xl bg-gradient-to-r ${campaign.accent} text-base font-semibold text-white shadow-lg transition hover:scale-[1.01]`}
                  >
                    {campaign.buttonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container pb-16 md:pb-20">
        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white md:text-3xl">Transparencia, apoyo real y oportunidad compartida</h2>
              <p className="leading-8 text-slate-300">
                Además de donar, también queremos abrir la puerta a colaboraciones. Si alguien necesita levantar su negocio o quiere impulsar una causa,
                este espacio puede convertirse en una ruta clara para organizar ayuda, mostrar metas y generar confianza.
              </p>
            </div>
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5 text-sm leading-7 text-cyan-50">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Compromiso Cyberpiezas
              </div>
              <p>
                Cada campaña explica su propósito, muestra avance y deja visible la meta económica para que la ayuda tenga contexto, dirección y sentido.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {currentCampaign && (
        <DonationDialog
          campaign={currentCampaign}
          open={openDialog !== null}
          onOpenChange={(open) => setOpenDialog(open ? openDialog : null)}
        />
      )}
    </main>
  );
}

export default Donations;
