import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportSubscribersToExcel } from "@/lib/subscriberExport";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CalendarClock, CheckCircle2, Download, Plus, Trash2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

type LicensePlan = "free" | "basic" | "professional" | "premium" | "annual";
type LicenseType = "free_special" | "promotional" | "trial" | "manual_grant";

const defaultGrantForm = () => ({
  userId: "",
  planCode: "basic" as LicensePlan,
  licenseType: "manual_grant" as LicenseType,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: "",
  requiresYouTube: false,
  requiresFacebook: false,
  youtubeVerified: false,
  facebookVerified: false,
  reason: "",
  notes: "",
});

const defaultRenewForm = () => ({
  licenseId: null as number | null,
  validUntil: "",
  renewalNotes: "",
});

export default function SubscriberManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [grantFormData, setGrantFormData] = useState(defaultGrantForm);
  const [renewFormData, setRenewFormData] = useState(defaultRenewForm);

  const { data: allUsers = [] } = trpc.users.getAllUsers.useQuery();
  const { data: allLicenses = [], refetch: refetchLicenses } = trpc.licenses.getAllLicenses.useQuery();

  const grantLicenseMutation = trpc.licenses.grantLicense.useMutation({
    onSuccess: async () => {
      toast.success("Licencia otorgada exitosamente");
      setIsGrantDialogOpen(false);
      setGrantFormData(defaultGrantForm());
      await Promise.all([
        refetchLicenses(),
        utils.users.list.invalidate(),
        utils.users.subscribers.invalidate(),
        utils.users.getAllUsers.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateLicenseStatusMutation = trpc.licenses.updateLicenseStatus.useMutation({
    onSuccess: async () => {
      toast.success("Estado de licencia actualizado");
      await Promise.all([
        refetchLicenses(),
        utils.users.subscribers.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const renewLicenseMutation = trpc.licenses.renewLicense.useMutation({
    onSuccess: async () => {
      toast.success("Licencia renovada correctamente");
      setIsRenewDialogOpen(false);
      setRenewFormData(defaultRenewForm());
      await Promise.all([
        refetchLicenses(),
        utils.users.subscribers.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleExportSubscribers = async () => {
    try {
      await exportSubscribersToExcel(allLicenses, allUsers);
      toast.success("Listado de suscriptores exportado a Excel");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo exportar el archivo de suscriptores");
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Acceso Denegado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">Solo los administradores pueden gestionar suscriptores.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const isFreeSpecial = grantFormData.licenseType === "free_special";

  const handleGrantLicense = async () => {
    if (!grantFormData.userId) {
      toast.error("Selecciona un usuario");
      return;
    }

    if (isFreeSpecial && (!grantFormData.youtubeVerified || !grantFormData.facebookVerified)) {
      toast.error("Debes confirmar YouTube y Facebook para licencias gratuitas especiales");
      return;
    }

    const userId = Number.parseInt(grantFormData.userId, 10);
    await grantLicenseMutation.mutateAsync({
      userId,
      planCode: grantFormData.planCode,
      licenseType: grantFormData.licenseType,
      validFrom: new Date(grantFormData.validFrom),
      validUntil: grantFormData.validUntil ? new Date(grantFormData.validUntil) : undefined,
      requiresYouTube: isFreeSpecial ? true : grantFormData.requiresYouTube,
      requiresFacebook: isFreeSpecial ? true : grantFormData.requiresFacebook,
      youtubeVerified: grantFormData.youtubeVerified,
      facebookVerified: grantFormData.facebookVerified,
      reason: grantFormData.reason || undefined,
      notes: grantFormData.notes || undefined,
    });
  };

  const handleSuspendLicense = (licenseId: number) => {
    updateLicenseStatusMutation.mutate({
      licenseId,
      newStatus: "suspended",
      changeReason: "Suspendida por administrador",
    });
  };

  const handleRevokeLicense = (licenseId: number) => {
    updateLicenseStatusMutation.mutate({
      licenseId,
      newStatus: "revoked",
      changeReason: "Revocada por administrador",
    });
  };

  const openRenewDialog = (license: any) => {
    const baseDate = license.validUntil ? new Date(license.validUntil) : new Date();
    const normalizedDate = new Date(baseDate);
    normalizedDate.setMonth(normalizedDate.getMonth() + 1);
    setRenewFormData({
      licenseId: license.id,
      validUntil: normalizedDate.toISOString().split("T")[0],
      renewalNotes: "",
    });
    setIsRenewDialogOpen(true);
  };

  const handleRenewLicense = async () => {
    if (!renewFormData.licenseId || !renewFormData.validUntil) {
      toast.error("Selecciona una fecha de renovación válida");
      return;
    }

    await renewLicenseMutation.mutateAsync({
      licenseId: renewFormData.licenseId,
      validUntil: new Date(renewFormData.validUntil),
      renewalNotes: renewFormData.renewalNotes || undefined,
    });
  };

  const getUserName = (userId: number) => {
    const userRecord = allUsers.find((row: any) => row.user?.id === userId);
    return userRecord?.user?.name || `Usuario ${userId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-700 bg-green-50 border-green-200";
      case "suspended":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "revoked":
        return "text-red-700 bg-red-50 border-red-200";
      case "expired":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getRequirementSummary = (license: any) => {
    if (!license.requiresYouTube && !license.requiresFacebook) {
      return "Sin requisitos especiales";
    }

    const requirements: string[] = [];
    if (license.requiresYouTube) {
      requirements.push(`YouTube ${license.youtubeVerified ? "verificado" : "pendiente"}`);
    }
    if (license.requiresFacebook) {
      requirements.push(`Facebook ${license.facebookVerified ? "verificado" : "pendiente"}`);
    }
    return requirements.join(" · ");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Users className="h-8 w-8" />
              Gestión de Suscriptores
            </h1>
            <p className="mt-1 text-muted-foreground">
              Administra licencias, renovaciones manuales y requisitos especiales para usuarios. Las licencias gratuitas o ecológicas deben validar YouTube, Facebook y, cuando aplique, la compartición de ambos perfiles.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleExportSubscribers} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar a Excel
            </Button>
            <Button onClick={() => setIsGrantDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Otorgar Licencia
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Licencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allLicenses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Licencias Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allLicenses.filter((license: any) => license.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de requisito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {
                  allLicenses.filter(
                    (license: any) =>
                      (license.requiresYouTube && !license.youtubeVerified) ||
                      (license.requiresFacebook && !license.facebookVerified),
                  ).length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suspendidas / Revocadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {allLicenses.filter((license: any) => ["suspended", "revoked"].includes(license.status)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Licencias Otorgadas</CardTitle>
            <CardDescription>
              Historial administrativo con estado, vigencia, requisitos especiales, difusión requerida y acciones de renovación para licencias manuales o ecológicas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allLicenses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay licencias otorgadas aún. Comienza a otorgar licencias a los usuarios.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                      <th className="px-4 py-3 text-left font-semibold">Plan</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold">Requisitos</th>
                      <th className="px-4 py-3 text-left font-semibold">Vigencia</th>
                      <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLicenses.map((license: any) => (
                      <tr key={license.id} className="border-b align-top hover:bg-muted/30">
                        <td className="px-4 py-3">{getUserName(license.userId)}</td>
                        <td className="px-4 py-3 capitalize">{license.planCode}</td>
                        <td className="px-4 py-3 capitalize">{license.licenseType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(license.status)}`}>
                            {license.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{getRequirementSummary(license)}</td>
                        <td className="px-4 py-3">
                          <div>{new Date(license.validFrom).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            hasta {license.validUntil ? new Date(license.validUntil).toLocaleDateString() : "sin límite"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRenewDialog(license)}
                              className="gap-1"
                            >
                              <CalendarClock className="h-3 w-3" />
                              Renovar
                            </Button>
                            {license.status === "active" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuspendLicense(license.id)}
                                  className="gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Suspender
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRevokeLicense(license.id)}
                                  className="gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Revocar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Otorgar Nueva Licencia</DialogTitle>
              <DialogDescription>
                Configura el plan, la vigencia y, si aplica, los requisitos especiales de difusión para licencias gratuitas. Para licencias especiales gratuitas debe mostrarse y validarse el seguimiento en YouTube y Facebook, además de la compartición de ambos perfiles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Usuario</Label>
                <Select value={grantFormData.userId} onValueChange={(value) => setGrantFormData((current) => ({ ...current, userId: value }))}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((row: any) => (
                      <SelectItem key={row.user.id} value={row.user.id.toString()}>
                        {row.user.name} ({row.user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={grantFormData.planCode} onValueChange={(value: LicensePlan) => setGrantFormData((current) => ({ ...current, planCode: value }))}>
                    <SelectTrigger id="plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratis</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="professional">Profesional</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="annual">Anualidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Licencia</Label>
                  <Select
                    value={grantFormData.licenseType}
                    onValueChange={(value: LicenseType) =>
                      setGrantFormData((current) => ({
                        ...current,
                        licenseType: value,
                        requiresYouTube: value === "free_special" ? true : current.requiresYouTube,
                        requiresFacebook: value === "free_special" ? true : current.requiresFacebook,
                      }))
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_special">Especial Gratuita</SelectItem>
                      <SelectItem value="promotional">Promocional</SelectItem>
                      <SelectItem value="trial">Prueba</SelectItem>
                      <SelectItem value="manual_grant">Otorgamiento Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Válido Desde</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={grantFormData.validFrom}
                    onChange={(e) => setGrantFormData((current) => ({ ...current, validFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido Hasta</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={grantFormData.validUntil}
                    onChange={(e) => setGrantFormData((current) => ({ ...current, validUntil: e.target.value }))}
                  />
                </div>
              </div>

              {isFreeSpecial ? (
                <Card className="border-amber-200 bg-amber-50/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Requisitos obligatorios para licencia gratuita especial</CardTitle>
                    <CardDescription>
                      Debe verificarse que el usuario siga el canal de YouTube de CyberPiezas, siga la página de Facebook y comparta ambos perfiles antes de otorgar esta licencia.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={true} disabled />
                      <Label>Requiere seguir el canal de YouTube de CyberPiezas</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={true} disabled />
                      <Label>Requiere seguir la página de Facebook de CyberPiezas</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={grantFormData.youtubeVerified}
                        onCheckedChange={(checked) =>
                          setGrantFormData((current) => ({ ...current, youtubeVerified: checked === true }))
                        }
                      />
                      <Label>Confirmo que el seguimiento en YouTube ya fue validado</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={grantFormData.facebookVerified}
                        onCheckedChange={(checked) =>
                          setGrantFormData((current) => ({ ...current, facebookVerified: checked === true }))
                        }
                      />
                      <Label>Confirmo que el seguimiento en Facebook ya fue validado</Label>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white/80 p-3 text-sm text-amber-900">
                      También debe confirmarse manualmente que el usuario compartió ambos perfiles como parte de la promoción especial.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={grantFormData.requiresYouTube}
                      onCheckedChange={(checked) =>
                        setGrantFormData((current) => ({ ...current, requiresYouTube: checked === true }))
                      }
                    />
                    <Label>Requiere YouTube</Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={grantFormData.requiresFacebook}
                      onCheckedChange={(checked) =>
                        setGrantFormData((current) => ({ ...current, requiresFacebook: checked === true }))
                      }
                    />
                    <Label>Requiere Facebook</Label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Razón</Label>
                <Input
                  id="reason"
                  placeholder="Ej. cliente especial, renovación manual, promoción local"
                  value={grantFormData.reason}
                  onChange={(e) => setGrantFormData((current) => ({ ...current, reason: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas internas</Label>
                <Input
                  id="notes"
                  placeholder="Notas administrativas"
                  value={grantFormData.notes}
                  onChange={(e) => setGrantFormData((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGrantLicense} disabled={grantLicenseMutation.isPending} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {grantLicenseMutation.isPending ? "Otorgando..." : "Otorgar Licencia"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Renovar Licencia Manualmente</DialogTitle>
              <DialogDescription>
                Extiende la vigencia y reactiva la licencia si estaba suspendida, revocada o expirada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="renew-valid-until">Nueva fecha de vencimiento</Label>
                <Input
                  id="renew-valid-until"
                  type="date"
                  value={renewFormData.validUntil}
                  onChange={(e) => setRenewFormData((current) => ({ ...current, validUntil: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renew-notes">Notas de renovación</Label>
                <Input
                  id="renew-notes"
                  placeholder="Ej. renovación por pago manual confirmado"
                  value={renewFormData.renewalNotes}
                  onChange={(e) => setRenewFormData((current) => ({ ...current, renewalNotes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsRenewDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRenewLicense} disabled={renewLicenseMutation.isPending} className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  {renewLicenseMutation.isPending ? "Renovando..." : "Renovar licencia"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
