import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Building2, ShieldCheck, Store, Users, History } from "lucide-react";
import { toast } from "sonner";

type PendingEdit = {
  role: "admin" | "cashier";
  branchId: number | null;
};

export default function UsersManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [pendingEdits, setPendingEdits] = useState<Record<number, PendingEdit>>({});

  const isAdmin = user?.role === "admin";

  const usersQuery = trpc.users.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const branchesQuery = trpc.branches.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const accessLogsQuery = trpc.users.accessLogs.useQuery(
    { limit: 20 },
    { enabled: isAdmin },
  );

  const assignBranchMutation = trpc.users.assignBranch.useMutation({
    onSuccess: async (_, variables) => {
      toast.success("Usuario actualizado", {
        description:
          variables.role === "cashier"
            ? "La sucursal operativa del cajero quedó actualizada."
            : "El rol y la configuración del usuario fueron actualizados.",
      });
      setPendingEdits(current => {
        const next = { ...current };
        delete next[variables.userId];
        return next;
      });
      await Promise.all([
        utils.users.list.invalidate(),
        utils.users.myBranch.invalidate(),
        utils.branches.list.invalidate(),
      ]);
    },
    onError: error => {
      toast.error("No se pudo actualizar el usuario", {
        description: error.message,
      });
    },
  });

  const summary = useMemo(() => {
    const rows = usersQuery.data ?? [];
    const admins = rows.filter(row => row.user.role === "admin").length;
    const cashiers = rows.filter(row => row.user.role === "cashier").length;
    const assignedCashiers = rows.filter(
      row => row.user.role === "cashier" && row.assignment?.branchId,
    ).length;

    return {
      total: rows.length,
      admins,
      cashiers,
      assignedCashiers,
    };
  }, [usersQuery.data]);

  const getDraft = (row: NonNullable<typeof usersQuery.data>[number]): PendingEdit => {
    const currentBranchId = row.assignment?.branchId ?? null;
    return (
      pendingEdits[row.user.id] ?? {
        role: row.user.role,
        branchId: currentBranchId,
      }
    );
  };

  const updateDraft = (userId: number, partial: Partial<PendingEdit>) => {
    const row = usersQuery.data?.find(item => item.user.id === userId);
    if (!row) return;

    const current = getDraft(row);
    setPendingEdits(existing => ({
      ...existing,
      [userId]: {
        ...current,
        ...partial,
      },
    }));
  };

  const saveUser = async (userId: number) => {
    const row = usersQuery.data?.find(item => item.user.id === userId);
    if (!row) return;

    const draft = getDraft(row);

    if (draft.role === "cashier" && draft.branchId === null) {
      toast.error("Falta asignar una sucursal", {
        description: "Cada cajero debe quedar ligado a una sucursal específica.",
      });
      return;
    }

    await assignBranchMutation.mutateAsync({
      userId,
      role: draft.role,
      branchId: draft.role === "admin" ? draft.branchId : draft.branchId,
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-primary">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Solo las cuentas administrativas pueden asignar roles y sucursales.
            </p>
          </div>

          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              Tu cuenta no tiene permisos para administrar usuarios. Si eres cajero, tu operación
              queda limitada a la sucursal que te haya asignado el administrador.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-primary">Gestión de Usuarios</h1>
            <p className="max-w-3xl text-muted-foreground">
              Asigna a cada cajero una sucursal operativa específica. Los administradores mantienen
              acceso global y los cajeros solo podrán vender desde la sucursal que se les configure.
            </p>
          </div>
          <Badge className="w-fit bg-accent/15 px-3 py-1 text-accent-foreground">
            Política activa: un cajero = una sucursal
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Usuarios registrados</CardDescription>
              <CardTitle className="text-3xl">{summary.total}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total de accesos del negocio
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Administradores</CardDescription>
              <CardTitle className="text-3xl">{summary.admins}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Cuentas con acceso completo
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cajeros</CardDescription>
              <CardTitle className="text-3xl">{summary.cashiers}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              Operación limitada por sucursal
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cajeros asignados</CardDescription>
              <CardTitle className="text-3xl">{summary.assignedCashiers}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Con sucursal operativa definida
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Solo el <strong>dueño principal</strong> puede convertir cuentas en <strong>cajero</strong> y
            decidir su sucursal operativa. Si una cuenta queda como cajero, debe asignarse a una
            sucursal antes de guardar. Si permanece como <strong>administrador</strong>, la sucursal queda
            solo como referencia operativa y no restringe su acceso global.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios y sucursal asignada</CardTitle>
            <CardDescription>
              Los nuevos usuarios se crean automáticamente al iniciar sesión por primera vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol actual</TableHead>
                    <TableHead>Sucursal actual</TableHead>
                    <TableHead>Nuevo rol</TableHead>
                    <TableHead>Nueva sucursal</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data ?? []).map(row => {
                    const draft = getDraft(row);
                    const isSelf = row.user.id === user?.id;
                    const unchanged =
                      draft.role === row.user.role &&
                      draft.branchId === (row.assignment?.branchId ?? null);
                    const needsBranch = draft.role === "cashier" && draft.branchId === null;

                    return (
                      <TableRow key={row.user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{row.user.name || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.user.email || "Sin correo"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.user.role === "admin" ? "default" : "outline"}>
                            {row.user.role === "admin" ? "Administrador" : "Cajero"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.branch ? (
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{row.branch.name}</p>
                              <p className="text-xs text-muted-foreground">{row.branch.code}</p>
                            </div>
                          ) : (
                            <Badge variant="outline">Sin asignar</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft.role}
                            onValueChange={(value: "admin" | "cashier") =>
                              updateDraft(row.user.id, { role: value })
                            }
                            disabled={isSelf}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="cashier">Cajero</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Select
                              value={draft.branchId === null ? "none" : String(draft.branchId)}
                              onValueChange={value =>
                                updateDraft(row.user.id, {
                                  branchId: value === "none" ? null : Number(value),
                                })
                              }
                              disabled={isSelf}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Selecciona una sucursal" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin asignar</SelectItem>
                                {(branchesQuery.data ?? []).map(branch => (
                                  <SelectItem key={branch.id} value={String(branch.id)}>
                                    {branch.name} · {branch.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {needsBranch ? (
                              <p className="text-xs text-destructive">
                                Debes asignar una sucursal para guardar como cajero.
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => void saveUser(row.user.id)}
                            disabled={
                              isSelf || unchanged || needsBranch || assignBranchMutation.isPending
                            }
                          >
                            Guardar cambios
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {!usersQuery.isLoading && (usersQuery.data?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aún no hay usuarios registrados adicionales en el sistema.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Log reciente de accesos
            </CardTitle>
            <CardDescription>
              Últimos 20 eventos de acceso registrados automáticamente en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accessLogsQuery.isLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Cargando accesos recientes...</div>
            ) : !(accessLogsQuery.data?.length) ? (
              <div className="py-6 text-sm text-muted-foreground">Todavía no hay accesos registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogsQuery.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.openId}</TableCell>
                        <TableCell>{entry.eventType}</TableCell>
                        <TableCell>{entry.loginMethod || "manual"}</TableCell>
                        <TableCell>{entry.ipAddress || "N/D"}</TableCell>
                        <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
