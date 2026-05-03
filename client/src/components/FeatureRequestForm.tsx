import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Lightbulb, Mail, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_INFO, getContactInfo } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export function FeatureRequestForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contactInfo = getContactInfo(user?.name || undefined);

  const createRequest = trpc.featureRequests.create.useMutation({
    onSuccess: () => {
      toast.success("¡Solicitud enviada! Nos pondremos en contacto pronto.", {
        description: "Tu idea es importante para nosotros.",
      });
      setTitle("");
      setDescription("");
    },
    onError: (error) => {
      toast.error("Error al enviar", {
        description: error.message || "Por favor intenta nuevamente",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Campos incompletos", {
        description: "Por favor completa el título y la descripción",
      });
      return;
    }

    if (title.trim().length < 5) {
      toast.error("Título muy corto", {
        description: "El título debe tener al menos 5 caracteres",
      });
      return;
    }

    if (description.trim().length < 20) {
      toast.error("Descripción muy corta", {
        description: "La descripción debe tener al menos 20 caracteres",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest.mutateAsync({
        title: title.trim(),
        description: description.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario Principal */}
      <Card className="border-border/50 shadow-md hover:shadow-lg transition-all overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
        <CardHeader className="relative pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2.5 text-primary">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Comparte tu Idea</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Ayúdanos a mejorar con tus sugerencias y solicitudes</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Título */}
            <div className="space-y-2.5">
              <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                Título de la solicitud
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  placeholder="Ej: Integración con WhatsApp para notificaciones"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="input-modern pl-4 pr-4 py-3 text-base"
                  maxLength={100}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/100
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 5 caracteres - Sé específico sobre lo que necesitas
              </p>
            </div>

            {/* Campo Descripción */}
            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-sm font-semibold text-foreground">
                Descripción detallada
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <Textarea
                  id="description"
                  placeholder="Cuéntanos qué necesitas y cómo te ayudaría en tu negocio. Incluye ejemplos si es posible..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={6}
                  className="input-modern resize-none"
                  maxLength={1000}
                />
                <div className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                  {description.length}/1000
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 20 caracteres - Cuanto más detalle, mejor podremos ayudarte
              </p>
            </div>

            {/* Botón Enviar */}
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando tu solicitud...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tarjeta de Contacto Directo */}
      <Card className="border-border/50 shadow-md overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/15 p-2.5 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Contacto Directo</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Para consultas urgentes o soporte personalizado</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información del Ingeniero */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary mt-0.5">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{CONTACT_INFO.engineer.name}</p>
                <p className="text-sm text-primary font-medium">{CONTACT_INFO.engineer.title}</p>
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground ml-11">
              {CONTACT_INFO.engineer.description}
            </p>

            <div className="flex items-center gap-3 ml-11 pt-2 border-t border-border/50">
              <Mail className="h-4 w-4 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email de contacto</p>
                <a
                  href={`mailto:${CONTACT_INFO.engineer.email}`}
                  className="text-sm font-mono text-accent hover:text-accent/80 transition-colors break-all"
                >
                  {CONTACT_INFO.engineer.email}
                </a>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4">
            <p className="text-sm text-foreground font-medium mb-2">💡 Consejo:</p>
            <p className="text-sm text-muted-foreground leading-6">
              Describe tu solicitud con el máximo detalle posible. Incluye ejemplos de cómo usarías la función y qué problemas resolvería en tu negocio.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
