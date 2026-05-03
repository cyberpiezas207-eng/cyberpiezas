import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { exportActiveUsersToExcel } from "@/lib/activeUsersReport";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CreditCard, Download, Globe, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

function formatDate(value?: string | number | Date | null) {
  if (!value) return "Sin límite";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-MX");
}

function formatPlanLabel(plan?: string | null) {
  switch (plan) {
    case "basic":
      return "Básico";
    case "professional":
      return "Profesional";
    case "premium":
      return "Premium";
    case "annual":
      return "Anual";
    case "free":
    default:
      return "Gratis";
  }
}

function formatStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Activo";
    case "pending_review":
      return "Pendiente de revisión";
    case "canceled":
      return "Cancelado";
    case "rejected":
      return "Rechazado";
    case "expired":
      return "Expirado";
    case "suspended":
      return "Suspendido";
    case "assigned":
      return "Asignado";
    case "quoted":
      return "Cotizado";
    case "approved":
      return "Aprobado";
    case "pending":
    default:
      return "Pendiente";
  }
}

function getRequirementSummary(row: any) {
  const license = row.activeLicense;
  if (!license) return "Sin licencia especial";
  if (!license.requiresYouTube && !license.requiresFacebook) {
    return "Sin requisitos adicionales";
  }

  const requirements: string[] = [];
  if (license.requiresYouTube) {
    requirements.push(`YouTube ${license.youtubeVerified ? "verificado" : "pendiente"}`);
  }
  if (license.requiresFacebook) {
    requirements.push(`Facebook ${license.facebookVerified ? "verificado" : "pendiente"}`);
  }
  if (license.licenseType === "free_special") {
    requirements.push("Compartición requerida");
  }

  return requirements.join(" · ");
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: "quoted",
    availabilityStatus: "available",
    quotedPrice: "",
    assignedSubdomain: "",
    adminNotes: "",
  });

  const subscribersQuery = trpc.users.subscribers.useQuery();
  const subdomainAdminQuery = trpc.subdomains.adminList.useQuery(undefined, {
    retry: false,
  });
  const reviewSubdomainRequest = trpc.subdomains.reviewRequest.useMutation({
    onSuccess: async () => {
      toast.success("Solicitud actualizada correctamente");
      await subdomainAdminQuery.refetch();
      setSelectedRequestId(null);
      setReviewForm({
        status: "quoted",
        availabilityStatus: "available",
        quotedPrice: "",
        assignedSubdomain: "",
        adminNotes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo actualizar la solicitud");
    },
  });

  const filteredSubscribers = useMemo(() => {
    const rows = subscribersQuery.data ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return rows;

    return rows.filter((row: any) => {
      const name = (row.user?.name ?? "").toLowerCase();
      const email = (row.user?.email ?? "").toLowerCase();
      const plan = (row.user?.effectiveSubscriptionPlan ?? row.user?.subscriptionPlan ?? "").toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch) || plan.includes(normalizedSearch);
    });
  }, [searchTerm, subscribersQuery.data]);

  const summary = useMemo(() => {
    const rows = subscribersQuery.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((row: any) => (row.user?.effectiveSubscriptionStatus ?? row.user?.subscriptionStatus) === "active").length,
      annual: rows.filter((row: any) => (row.user?.effectiveSubscriptionPlan ?? row.user?.subscriptionPlan) === "annual").length,
      pendingRequirements: rows.filter((row: any) => {
        const license = row.activeLicense;
        return Boolean(
          license && ((license.requiresYouTube && !license.youtubeVerified) || (license.requiresFacebook && !license.facebookVerified)),
        );
      }).length,
    };
  }, [subscribersQuery.data]);

  const selectedRequest = (subdomainAdminQuery.data ?? []).find((row: any) => row.request.id === selectedRequestId);

  const handleExportActiveUsers = async () => {
    try {
      await exportActiveUsersToExcel(subscribersQuery.data ?? []);
      toast.success("Reporte de usuarios activos exportado a Excel");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo exportar el reporte de usuarios activos");
    }
  };

  const handleOpenReview = (row: any) => {
    setSelectedRequestId(row.request.id);
    setReviewForm({
      status: row.request.status ?? "quoted",
      availabilityStatus: row.request.availabilityStatus ?? "available",
      quotedPrice: row.request.quotedPrice ?? "",
      assignedSubdomain: row.request.assignedSubdomain ?? row.request.requestedSubdomain ?? "",
      adminNotes: row.request.adminNotes ?? "",
    });
  };

  const subdomainSummary = useMemo(() => {
    const rows = subdomainAdminQuery.data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((row: any) => row.request.status === "pending").length,
      quoted: rows.filter((row: any) => row.request.status === "quoted").length,
      assigned: rows.filter((row: any) => row.request.status === "assigned").length,
    };
  }, [subdomainAdminQuery.data]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary">Gestión de Acceso</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Esta vista concentra a los suscriptores del sistema y refleja el plan efectivo de cada cuenta, incluso cuando existe una licencia anual o especial otorgada manualmente.
            </p>
          </div>
          <Badge className="w-fit bg-primary/10 px-3 py-1 text-primary">
            Suscriptores separados del personal interno
          </Badge>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription>
            El módulo <strong>Usuarios</strong> queda reservado para personal interno del negocio. Aquí se revisan los accesos de suscriptores, vigencias y condiciones especiales como YouTube, Facebook y solicitudes de subdominio.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Suscriptores visibles</CardDescription>
              <CardTitle className="text-3xl text-primary">{summary.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cuentas externas al personal operativo.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Accesos activos</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{summary.active}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Licencias y suscripciones con acceso vigente.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Anualidades efectivas</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{summary.annual}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Incluye anualidades manuales o administrativas.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Requisitos pendientes</CardDescription>
              <CardTitle className="text-3xl text-rose-600">{summary.pendingRequirements}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Seguimiento de YouTube y Facebook por validar.
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Buscar por nombre, correo o plan..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" className="gap-2" onClick={handleExportActiveUsers} disabled={subscribersQuery.isLoading || summary.active === 0}>
            <Download className="h-4 w-4" />
            Exportar usuarios activos
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Suscriptores y acceso efectivo
            </CardTitle>
            <CardDescription>
              La columna de plan refleja la licencia activa real. Si una anualidad o licencia especial fue otorgada, aquí debe prevalecer sobre el estado base guardado previamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscribersQuery.isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Cargando suscriptores...</div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No se encontraron suscriptores con los criterios capturados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suscriptor</TableHead>
                      <TableHead>Plan efectivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Condiciones especiales</TableHead>
                      <TableHead>Origen del acceso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((row: any) => {
                      const effectivePlan = row.user?.effectiveSubscriptionPlan ?? row.user?.subscriptionPlan;
                      const effectiveStatus = row.user?.effectiveSubscriptionStatus ?? row.user?.subscriptionStatus;
                      const effectiveEndDate = row.user?.effectiveSubscriptionEndDate ?? row.user?.subscriptionEndDate;
                      const licenseType = row.activeLicense?.licenseType;

                      return (
                        <TableRow key={row.user.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{row.user.name || "Sin nombre"}</p>
                              <p className="text-xs text-muted-foreground">{row.user.email || "Sin correo"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-2">
                              <CreditCard className="h-3.5 w-3.5" />
                              {formatPlanLabel(effectivePlan)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={effectiveStatus === "active" ? "default" : "secondary"}>
                              {formatStatusLabel(effectiveStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-foreground">Hasta {formatDate(effectiveEndDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                Inicio {formatDate(row.user?.effectiveSubscriptionStartDate ?? row.user?.subscriptionStartDate)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs text-sm text-muted-foreground">
                              {getRequirementSummary(row)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {licenseType ? (
                              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                                {licenseType === "free_special"
                                  ? "Licencia especial gratuita"
                                  : licenseType.replace(/_/g, " ")}
                              </Badge>
                            ) : (
                              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <AlertTriangle className="h-4 w-4" />
                                Suscripción base
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Solicitudes de subdominio</CardDescription>
              <CardTitle className="text-3xl text-primary">{subdomainSummary.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Total registradas por suscriptores.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendientes</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{subdomainSummary.pending}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Esperan revisión de disponibilidad.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cotizadas</CardDescription>
              <CardTitle className="text-3xl text-sky-600">{subdomainSummary.quoted}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Con precio o seguimiento administrativo.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Asignadas</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{subdomainSummary.assigned}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Ya quedaron resueltas para el suscriptor.</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Solicitudes de subdominio
            </CardTitle>
            <CardDescription>
              Solo el dueño principal puede cotizar, revisar disponibilidad y asignar manualmente el subdominio sin tocar el dominio principal del proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subdomainAdminQuery.error ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Esta sección está reservada para el dueño principal del sistema.
              </div>
            ) : subdomainAdminQuery.isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Cargando solicitudes de subdominio...</div>
            ) : !(subdomainAdminQuery.data?.length) ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Aún no hay solicitudes de subdominio registradas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suscriptor</TableHead>
                      <TableHead>Negocio</TableHead>
                      <TableHead>Solicitado</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subdomainAdminQuery.data.map((row: any) => (
                      <TableRow key={row.request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{row.user?.name || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground">{row.user?.email || "Sin correo"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{row.request.businessName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{row.request.requestedSubdomain}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(row.request.createdAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{formatStatusLabel(row.request.status)}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{row.request.availabilityStatus}</Badge></TableCell>
                        <TableCell>{row.request.quotedPrice ? `$${row.request.quotedPrice}` : "Pendiente"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleOpenReview(row)}>
                            Revisar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={selectedRequestId !== null} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Revisar solicitud de subdominio</DialogTitle>
              <DialogDescription>
                Define disponibilidad, precio y resultado final. El suscriptor verá este seguimiento en su panel.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                  <p><strong className="text-foreground">Suscriptor:</strong> {selectedRequest.user?.name || "Sin nombre"}</p>
                  <p><strong className="text-foreground">Negocio:</strong> {selectedRequest.request.businessName}</p>
                  <p><strong className="text-foreground">Solicitado:</strong> {selectedRequest.request.requestedSubdomain}</p>
                  {selectedRequest.request.notes ? <p><strong className="text-foreground">Notas:</strong> {selectedRequest.request.notes}</p> : null}
                  {selectedRequest.request.contactWhatsApp ? <p><strong className="text-foreground">WhatsApp:</strong> {selectedRequest.request.contactWhatsApp}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Estatus</Label>
                    <Select value={reviewForm.status} onValueChange={(value) => setReviewForm((current) => ({ ...current, status: value }))}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="quoted">Cotizado</SelectItem>
                        <SelectItem value="approved">Aprobado</SelectItem>
                        <SelectItem value="assigned">Asignado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Disponibilidad</Label>
                    <Select value={reviewForm.availabilityStatus} onValueChange={(value) => setReviewForm((current) => ({ ...current, availabilityStatus: value }))}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unchecked">Sin revisar</SelectItem>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="unavailable">No disponible</SelectItem>
                        <SelectItem value="reserved">Reservado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Precio cotizado</Label>
                    <Input className="mt-2" value={reviewForm.quotedPrice} onChange={(event) => setReviewForm((current) => ({ ...current, quotedPrice: event.target.value }))} placeholder="450.00" />
                  </div>
                  <div>
                    <Label>Subdominio asignado</Label>
                    <Input className="mt-2" value={reviewForm.assignedSubdomain} onChange={(event) => setReviewForm((current) => ({ ...current, assignedSubdomain: event.target.value }))} placeholder="boutiquelupita" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notas administrativas</Label>
                    <Textarea className="mt-2" value={reviewForm.adminNotes} onChange={(event) => setReviewForm((current) => ({ ...current, adminNotes: event.target.value }))} placeholder="Precio final, alternativas disponibles, instrucciones o motivo de rechazo." />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setSelectedRequestId(null)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={reviewSubdomainRequest.isPending}
                    onClick={() =>
                      reviewSubdomainRequest.mutate({
                        requestId: selectedRequest.request.id,
                        status: reviewForm.status as any,
                        availabilityStatus: reviewForm.availabilityStatus as any,
                        quotedPrice: reviewForm.quotedPrice || undefined,
                        assignedSubdomain: reviewForm.assignedSubdomain || undefined,
                        adminNotes: reviewForm.adminNotes || undefined,
                      })
                    }
                  >
                    {reviewSubdomainRequest.isPending ? "Guardando..." : "Guardar revisión"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
