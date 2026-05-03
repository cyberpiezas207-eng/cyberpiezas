import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CreditCard,
  History,
  Loader2,
  Package,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  inactive: "Inactiva",
  pending_review: "Pendiente de revisión",
  active: "Activa",
  canceled: "Cancelada",
  past_due: "Vencida",
  unpaid: "Sin pago",
  trialing: "En prueba",
  rejected: "Rechazada",
};

function formatDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatMoney(value?: string | number | null, currency = "MXN") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const currentSubscription = trpc.paypal.getCurrentSubscription.useQuery();
  const paymentHistory = trpc.paypal.getPaymentHistory.useQuery();
  const subdomainRequests = trpc.subdomains.mine.useQuery();
  const [subdomainForm, setSubdomainForm] = useState({
    businessName: "",
    requestedSubdomain: "",
    contactWhatsApp: "",
    notes: "",
  });

  const cancelSubscription = trpc.paypal.cancelSubscription.useMutation({
    onSuccess: async (result) => {
      toast.success("Suscripción actualizada", {
        description: result.message,
      });
      await Promise.all([currentSubscription.refetch(), utils.auth.me.invalidate()]);
    },
    onError: (error) => {
      toast.error("No se pudo cancelar la suscripción", {
        description: error.message,
      });
    },
  });

  const submitSubdomainRequest = trpc.subdomains.createRequest.useMutation({
    onSuccess: async () => {
      toast.success("Solicitud enviada", {
        description: "El dueño revisará disponibilidad y precio del subdominio solicitado.",
      });
      setSubdomainForm({
        businessName: "",
        requestedSubdomain: "",
        contactWhatsApp: "",
        notes: "",
      });
      await subdomainRequests.refetch();
    },
    onError: (error) => {
      toast.error("No se pudo registrar la solicitud", {
        description: error.message,
      });
    },
  });

  const userSubscription = currentSubscription.data?.user;
  const activeLicense = currentSubscription.data?.activeLicense;
  const requests = currentSubscription.data?.requests ?? [];
  const history = paymentHistory.data ?? [];
  const canStartBusiness = userSubscription?.subscriptionStatus === "active" && user?.role === "admin";

  useEffect(() => {
    if (userSubscription?.subscriptionStatus === "active" && user?.role !== "admin") {
      void utils.auth.me.invalidate();
    }
  }, [userSubscription?.subscriptionStatus, user?.role, utils.auth.me]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Licencia y cobros
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Gestión de suscripción
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                Revisa tu plan activo, el histórico de pagos y las solicitudes más recientes desde una vista con mejor jerarquía para seguimiento operativo.
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/plans")} className="gap-2 self-start lg:self-auto">
              <RefreshCcw className="h-4 w-4" />
              Ver planes disponibles
            </Button>
          </div>
        </section>

        {userSubscription?.subscriptionStatus === "pending_review" ? (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              Tu pago está en revisión. En cuanto se valide el comprobante, el plan quedará activo automáticamente.
            </AlertDescription>
          </Alert>
        ) : null}

        {activeLicense && (activeLicense.requiresYouTube || activeLicense.requiresFacebook) ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <AlertDescription>
              <div className="space-y-4 text-sm leading-6">
                <div>
                  <p>
                    Tu acceso actual proviene de una <strong>licencia especial</strong>. El pendiente no se quita solo: primero debes cumplir los requisitos solicitados y después administración los valida manualmente.
                  </p>
                  <p className="mt-2">
                    YouTube: <strong>{activeLicense.requiresYouTube ? (activeLicense.youtubeVerified ? "verificado" : "pendiente" ) : "no requerido"}</strong>{" · "}
                    Facebook: <strong>{activeLicense.requiresFacebook ? (activeLicense.facebookVerified ? "verificado" : "pendiente") : "no requerido"}</strong>
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {activeLicense.requiresYouTube ? (
                    <div className="rounded-xl border border-amber-300 bg-white/70 p-4">
                      <p className="font-semibold">Paso 1: YouTube</p>
                      <p className="mt-2 text-xs leading-5">Sigue el canal de CyberPiezas y conserva evidencia para compartirla con administración.</p>
                    </div>
                  ) : null}
                  {activeLicense.requiresFacebook ? (
                    <div className="rounded-xl border border-amber-300 bg-white/70 p-4">
                      <p className="font-semibold">Paso 2: Facebook</p>
                      <p className="mt-2 text-xs leading-5">Sigue la página de CyberPiezas y envía evidencia para que el pendiente pueda validarse.</p>
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-amber-300 bg-white/70 p-4">
                    <p className="font-semibold">Paso 3: Validación</p>
                    <p className="mt-2 text-xs leading-5">Cuando termines, contacta a CyberPiezas para revisión manual. En cuanto se valide, el pendiente desaparece.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="outline" className="border-amber-400 bg-white/80 text-amber-900 hover:bg-white">
                    <a href="https://wa.me/527354946224" target="_blank" rel="noreferrer">Enviar evidencia por WhatsApp</a>
                  </Button>
                  <Button asChild variant="outline" className="border-amber-400 bg-white/80 text-amber-900 hover:bg-white">
                    <a href="mailto:cyberpiezas207@gmail.com?subject=Validaci%C3%B3n%20de%20licencia%20especial">Enviar evidencia por correo</a>
                  </Button>
                  <Button variant="ghost" onClick={() => setLocation("/terms")} className="justify-start px-0 text-amber-900 hover:bg-transparent hover:text-amber-950">
                    Ver términos y condiciones de la promoción
                  </Button>
                </div>
                {activeLicense.licenseType === "free_special" ? (
                  <p>
                    Además, esta licencia especial requiere haber compartido los perfiles de CyberPiezas cuando así fue indicado por la promoción.
                  </p>
                ) : null}
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {user?.role !== "admin" ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <AlertDescription>
              Solo el administrador puede cambiar, renovar o cancelar planes desde este panel. Si necesitas un ajuste, solicítalo al responsable principal de la cuenta.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Plan actual</CardDescription>
              <CardTitle className="text-3xl uppercase">{userSubscription?.subscriptionPlan ?? "free"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Licencia principal registrada para tu cuenta.
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Estado</CardDescription>
              <CardTitle className="text-2xl">
                {STATUS_LABELS[userSubscription?.subscriptionStatus ?? "inactive"] ?? "Sin estado"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{userSubscription?.subscriptionStatus ?? "inactive"}</Badge>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Inicio de vigencia</CardDescription>
              <CardTitle className="text-xl">{formatDate(userSubscription?.subscriptionStartDate)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fecha de activación más reciente del plan.
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Fin de vigencia</CardDescription>
              <CardTitle className="text-xl">{formatDate(userSubscription?.subscriptionEndDate)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Si aparece vacío, tu licencia no tiene fecha de expiración inmediata.
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Puesta en marcha del negocio
            </CardTitle>
            <CardDescription>
              Usa esta guía para arrancar tu operación, cargar catálogo y dejar lista tu cuenta desde los módulos principales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canStartBusiness ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Button variant="outline" className="h-auto justify-start gap-3 px-4 py-4 text-left" onClick={() => setLocation("/products")}>
                    <Package className="h-5 w-5 text-primary" />
                    <span>
                      <strong className="block">Subir productos</strong>
                      <span className="text-xs text-muted-foreground">Carga tu catálogo inicial y prepara variantes.</span>
                    </span>
                  </Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 px-4 py-4 text-left" onClick={() => setLocation("/categories")}>
                    <Tags className="h-5 w-5 text-primary" />
                    <span>
                      <strong className="block">Organizar categorías</strong>
                      <span className="text-xs text-muted-foreground">Define secciones para ordenar mejor tu inventario.</span>
                    </span>
                  </Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 px-4 py-4 text-left" onClick={() => setLocation("/branches")}>
                    <Store className="h-5 w-5 text-primary" />
                    <span>
                      <strong className="block">Configurar sucursal</strong>
                      <span className="text-xs text-muted-foreground">Registra la sucursal principal y los datos básicos de operación.</span>
                    </span>
                  </Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 px-4 py-4 text-left" onClick={() => setLocation("/pos")}>
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span>
                      <strong className="block">Empezar a vender</strong>
                      <span className="text-xs text-muted-foreground">Entra al punto de venta cuando ya tengas catálogo y configuración base.</span>
                    </span>
                  </Button>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                  Recomendación de arranque: primero crea tu sucursal principal, luego carga categorías y productos, y al final entra al punto de venta para hacer tus primeras pruebas.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
                Esta guía se habilita cuando tu cuenta ya tiene una licencia activa y permisos administrativos para operar tu propio negocio. Si ya te aprobaron el acceso y aún no ves los módulos, recarga la sesión o vuelve a entrar.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Solicitar subdominio de negocio
              </CardTitle>
              <CardDescription>
                Pide un nombre comercial para tu negocio. La revisión de disponibilidad, el precio y la asignación final solo los hace el dueño principal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                Tu dominio principal no cambia. Aquí solo solicitas un subdominio comercial para tu negocio y administración te responde con cotización, disponibilidad o asignación final.
              </div>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSubdomainRequest.mutate(subdomainForm);
                }}
              >
                <div>
                  <Label htmlFor="businessName">Nombre del negocio</Label>
                  <Input
                    id="businessName"
                    className="mt-2"
                    value={subdomainForm.businessName}
                    onChange={(event) => setSubdomainForm((current) => ({ ...current, businessName: event.target.value }))}
                    placeholder="Boutique Lupita"
                  />
                </div>
                <div>
                  <Label htmlFor="requestedSubdomain">Nombre deseado</Label>
                  <Input
                    id="requestedSubdomain"
                    className="mt-2"
                    value={subdomainForm.requestedSubdomain}
                    onChange={(event) => setSubdomainForm((current) => ({ ...current, requestedSubdomain: event.target.value }))}
                    placeholder="boutiquelupita"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Usa el nombre corto del negocio. El sistema lo normaliza antes de enviarlo.</p>
                </div>
                <div>
                  <Label htmlFor="contactWhatsApp">WhatsApp de contacto</Label>
                  <Input
                    id="contactWhatsApp"
                    className="mt-2"
                    value={subdomainForm.contactWhatsApp}
                    onChange={(event) => setSubdomainForm((current) => ({ ...current, contactWhatsApp: event.target.value }))}
                    placeholder="7771234567"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="subdomainNotes">Notas para administración</Label>
                  <Textarea
                    id="subdomainNotes"
                    className="mt-2"
                    value={subdomainForm.notes}
                    onChange={(event) => setSubdomainForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Nombre alternativo, giro del negocio o comentario sobre cómo quieres que se vea tu marca."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={submitSubdomainRequest.isPending}>
                    {submitSubdomainRequest.isPending ? "Enviando solicitud..." : "Solicitar subdominio"}
                  </Button>
                </div>
              </form>

              {subdomainRequests.data?.length ? (
                <div className="overflow-x-auto rounded-2xl border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Solicitado</TableHead>
                        <TableHead>Estatus</TableHead>
                        <TableHead>Disponibilidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Asignación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subdomainRequests.data.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{request.requestedSubdomain}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{request.status}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{request.availabilityStatus}</Badge></TableCell>
                          <TableCell>{request.quotedPrice ? formatMoney(request.quotedPrice, request.currency ?? "MXN") : "Pendiente"}</TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              <p>{request.assignedSubdomain ?? "Sin asignar"}</p>
                              {request.adminNotes ? <p className="mt-1 text-xs">{request.adminNotes}</p> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Solicitudes recientes
              </CardTitle>
              <CardDescription>
                Últimos comprobantes o solicitudes enviados para activar o renovar tu plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSubscription.isLoading ? (
                <div className="flex min-h-40 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando solicitudes...
                </div>
              ) : requests.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estatus</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Enviado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.planName}</TableCell>
                          <TableCell>{request.billingType === "annual" ? "Anual" : "Mensual"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.status}</Badge>
                          </TableCell>
                          <TableCell>{formatMoney(request.amount, request.currency ?? "MXN")}</TableCell>
                          <TableCell>{request.transferReference}</TableCell>
                          <TableCell>{formatDate(request.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <History className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">Aún no hay solicitudes registradas</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Cuando envíes un comprobante o inicies una renovación, aquí aparecerá el historial reciente para darle seguimiento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Acciones rápidas
              </CardTitle>
              <CardDescription>
                Usa estas acciones para gestionar tu licencia sin salir del panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                {user?.role === "admin"
                  ? "Si tu plan está por vencer, puedes cambiarlo o renovarlo desde Planes y registrar un nuevo comprobante."
                  : "La información de la licencia sigue visible, pero los cambios de plan están reservados al administrador principal."}
              </div>
              {user?.role === "admin" ? (
                <>
                  <Button className="w-full" onClick={() => setLocation("/plans")}>Cambiar o renovar plan</Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => cancelSubscription.mutate()}
                    disabled={cancelSubscription.isPending || userSubscription?.subscriptionStatus === "canceled"}
                  >
                    {cancelSubscription.isPending ? "Cancelando..." : "Cancelar suscripción actual"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Cambio de plan solo para administrador
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
            <CardDescription>
              Registro de cobros validados y movimientos aplicados a tu licencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory.isLoading ? (
              <div className="flex min-h-32 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando historial de pagos...
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Periodo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paidAt ?? payment.createdAt)}</TableCell>
                        <TableCell>{payment.planName ?? "Plan"}</TableCell>
                        <TableCell>{payment.paymentProvider}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "succeeded" ? "default" : "outline"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatMoney(payment.amount, payment.currency ?? "MXN")}</TableCell>
                        <TableCell>
                          {formatDate(payment.billingPeriodStart)} — {formatDate(payment.billingPeriodEnd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">No hay pagos registrados todavía</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Cuando se valide un pago o una renovación, el movimiento aparecerá aquí con su periodo y estatus correspondiente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
