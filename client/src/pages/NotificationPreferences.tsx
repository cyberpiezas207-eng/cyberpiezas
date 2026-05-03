import { useEffect, useMemo, useState } from "react";
import { BellRing, Mail, RefreshCcw, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

type PreferenceForm = {
  emailOnSale: boolean;
  emailOnLowStock: boolean;
  emailOnPayment: boolean;
  emailOnSubscriptionChange: boolean;
  pushOnSale: boolean;
  pushOnLowStock: boolean;
  pushOnPayment: boolean;
  pushOnSubscriptionChange: boolean;
};

const EMPTY_FORM: PreferenceForm = {
  emailOnSale: true,
  emailOnLowStock: true,
  emailOnPayment: true,
  emailOnSubscriptionChange: true,
  pushOnSale: true,
  pushOnLowStock: true,
  pushOnPayment: true,
  pushOnSubscriptionChange: true,
};

export default function NotificationPreferences() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notifications.getPreferences.useQuery();
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: async () => {
      toast.success("Preferencias actualizadas");
      await utils.notifications.getPreferences.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudieron guardar las preferencias");
    },
  });

  const [form, setForm] = useState<PreferenceForm>(EMPTY_FORM);

  useEffect(() => {
    if (data) {
      setForm({
        emailOnSale: Boolean(data.emailOnSale),
        emailOnLowStock: Boolean(data.emailOnLowStock),
        emailOnPayment: Boolean(data.emailOnPayment),
        emailOnSubscriptionChange: Boolean(data.emailOnSubscriptionChange),
        pushOnSale: Boolean(data.pushOnSale),
        pushOnLowStock: Boolean(data.pushOnLowStock),
        pushOnPayment: Boolean(data.pushOnPayment),
        pushOnSubscriptionChange: Boolean(data.pushOnSubscriptionChange),
      });
    }
  }, [data]);

  const handleCheckedChange = (field: keyof PreferenceForm, checked: boolean) => {
    setForm((current) => ({ ...current, [field]: checked }));
  };

  const handleSave = async () => {
    await updatePreferences.mutateAsync(form);
  };

  const blocks = [
    {
      title: "Correo electrónico",
      description: "Recibe avisos clave en tu correo para mantener control operativo aunque no estés dentro del panel.",
      icon: Mail,
      items: [
        { key: "emailOnSale", label: "Nueva venta registrada" },
        { key: "emailOnLowStock", label: "Inventario con stock bajo" },
        { key: "emailOnPayment", label: "Pago recibido o validado" },
        { key: "emailOnSubscriptionChange", label: "Cambios de plan o suscripción" },
      ] as const,
    },
    {
      title: "Notificaciones dentro del sistema",
      description: "Controla qué eventos deben aparecer en la campana y centro de notificaciones del sistema.",
      icon: Smartphone,
      items: [
        { key: "pushOnSale", label: "Nueva venta registrada" },
        { key: "pushOnLowStock", label: "Inventario con stock bajo" },
        { key: "pushOnPayment", label: "Pago recibido o validado" },
        { key: "pushOnSubscriptionChange", label: "Cambios de plan o suscripción" },
      ] as const,
    },
  ];

  const enabledCount = useMemo(() => {
    return Object.values(form).filter(Boolean).length;
  }, [form]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Preferencias centralizadas
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Preferencias de notificaciones
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                Decide qué alertas quieres recibir, por qué canal deben llegar y mantén una configuración coherente para pagos, ventas, inventario y cambios de suscripción.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Activas</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{enabledCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canales</p>
                <p className="mt-2 text-2xl font-bold text-foreground">2</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cambios</p>
                <p className="mt-2 text-2xl font-bold text-foreground">En tiempo real</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <Card className="flex-1 border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Control centralizado de alertas</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Estos cambios impactan la campana, el centro de notificaciones y los avisos por correo asociados a tu cuenta.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/90 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                Guarda al finalizar para aplicar los cambios inmediatamente.
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={() => utils.notifications.getPreferences.invalidate()}
            disabled={isLoading || updatePreferences.isPending}
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {isLoading ? (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              Cargando preferencias...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {blocks.map((block) => {
              const Icon = block.icon;
              const enabledInBlock = block.items.filter((item) => form[item.key]).length;

              return (
                <Card key={block.title} className="border-border/80 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Icon className="h-5 w-5 text-primary" />
                          {block.title}
                        </CardTitle>
                        <CardDescription className="mt-2 leading-6">{block.description}</CardDescription>
                      </div>
                      <div className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {enabledInBlock}/{block.items.length} activas
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {block.items.map((item, index) => (
                      <div key={item.key}>
                        {index > 0 ? <Separator className="mb-4" /> : null}
                        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/40">
                          <Checkbox
                            checked={form[item.key]}
                            onCheckedChange={(checked) => handleCheckedChange(item.key, Boolean(checked))}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label className="cursor-pointer text-sm font-medium text-foreground">
                              {item.label}
                            </Label>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {block.title === "Correo electrónico"
                                ? "Ideal para avisos que deben revisarse fuera del sistema o compartirse con responsables del negocio."
                                : "Se mostrará dentro del panel y en la campana para atender eventos mientras operas el sistema."}
                            </p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Recomendación operativa
            </CardTitle>
            <CardDescription>
              Para no perder eventos críticos, conviene mantener activos al menos los avisos de pagos y cambios de suscripción.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Si desactivas demasiados avisos, el sistema seguirá funcionando, pero podrías enterarte tarde de ventas importantes, faltantes de inventario o activaciones administrativas que requieren seguimiento.
            </p>
            <Button onClick={handleSave} disabled={updatePreferences.isPending || isLoading} className="self-start md:self-auto">
              {updatePreferences.isPending ? "Guardando..." : "Guardar preferencias"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
