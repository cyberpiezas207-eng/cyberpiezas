import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar todos los usuarios registrados
  const { data: allUsers = [], isLoading } = trpc.users.getAllUsers.useQuery();

  // Mutation para activar/desactivar acceso al programa boutique
  const upsertAccess = trpc.programAccess.upsert.useMutation({
    onSuccess: async () => {
      await utils.users.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleConfirm = async (userId: number, userName: string, userEmail: string) => {
    await upsertAccess.mutateAsync({
      userId,
      programCode: "boutique",
      status: "active",
      accessSource: "admin_override",
    });
    toast.success(`✓ Acceso activado para ${userName}`);

    // Abrir cliente de correo con email de bienvenida
    const subject = encodeURIComponent("[CyberPiezas] Tu acceso ha sido activado");
    const body = encodeURIComponent(
      `Hola ${userName},\n\n` +
      `¡Bienvenido a CyberPiezas! Tu acceso ha sido confirmado y ya puedes ingresar al sistema.\n\n` +
      `Ingresa en: https://cyberpiezas.com\n\n` +
      `Si tienes dudas, responde este correo.\n\n` +
      `— Deivid\nCyberPiezas`
    );
    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`);
  };

  const handleReject = async (userId: number, userName: string) => {
    if (!confirm(`¿Desactivar el acceso de ${userName}?`)) return;
    await upsertAccess.mutateAsync({
      userId,
      programCode: "boutique",
      status: "inactive",
      accessSource: "admin_override",
    });
    toast.success(`Acceso desactivado para ${userName}`);
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Mensaje del equipo");
    const body = encodeURIComponent(`Hola ${userName},\n\n`);
    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`);
  };

  // Filtrar usuarios por búsqueda
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allUsers.filter((row: any) => {
      const u = row.user ?? row;
      return (
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.businessName?.toLowerCase().includes(q)
      );
    });
  }, [allUsers, searchQuery]);

  // Separar por estado
  const pendingUsers = filteredUsers.filter((row: any) => {
    const u = row.user ?? row;
    return u.status === "pending" || !u.status;
  });
  const activeUsers = filteredUsers.filter((row: any) => {
    const u = row.user ?? row;
    return u.status === "active";
  });
  const inactiveUsers = filteredUsers.filter((row: any) => {
    const u = row.user ?? row;
    return u.status === "inactive" || u.status === "suspended" || u.status === "expired";
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Activo</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendiente</Badge>;
      case "inactive":
      case "suspended":
      case "expired":
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Inactivo</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendiente</Badge>;
    }
  };

  const UserRow = ({ row }: { row: any }) => {
    const u = row.user ?? row;
    const status = u.status ?? "pending";
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-secondary/20 hover:border-primary/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground truncate">{u.name || "Sin nombre"}</p>
            {getStatusBadge(status)}
          </div>
          {u.businessName && (
            <p className="text-sm text-primary/80 mt-0.5">🏪 {u.businessName}</p>
          )}
          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Registro: {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy", { locale: es }) : "—"}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSendEmail(u.email, u.name || "usuario")}
            className="border-border hover:bg-secondary gap-1"
            title="Enviar correo"
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>
          {status !== "active" ? (
            <Button
              size="sm"
              onClick={() => handleConfirm(u.id, u.name || "usuario", u.email)}
              disabled={upsertAccess.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(u.id, u.name || "usuario")}
              disabled={upsertAccess.isPending}
              className="border-red-600/50 hover:bg-red-600/20 text-red-400 gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Desactivar
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acceso restringido al administrador.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Panel CyberPiezas</h1>
          </div>
          <p className="text-muted-foreground text-sm">Gestión centralizada de suscriptores y accesos. Solo visible para ti.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total registrados</p>
              <p className="text-3xl font-bold text-foreground mt-1">{allUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pendientes de confirmar</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">{pendingUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{activeUsers.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, negocio o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Cargando suscriptores...</span>
          </div>
        )}

        {/* Pendientes */}
        {pendingUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <Users className="w-5 h-5" />
                Pendientes de confirmación ({pendingUsers.length})
              </CardTitle>
              <CardDescription>Estos usuarios se registraron pero aún no tienen acceso activo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingUsers.map((row: any, i: number) => (
                <UserRow key={(row.user ?? row).id ?? i} row={row} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Activos */}
        {activeUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Suscriptores activos ({activeUsers.length})
              </CardTitle>
              <CardDescription>Usuarios con acceso confirmado al sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeUsers.map((row: any, i: number) => (
                <UserRow key={(row.user ?? row).id ?? i} row={row} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Inactivos */}
        {inactiveUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="w-5 h-5" />
                Inactivos / Suspendidos ({inactiveUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inactiveUsers.map((row: any, i: number) => (
                <UserRow key={(row.user ?? row).id ?? i} row={row} />
              ))}
            </CardContent>
          </Card>
        )}

        {!isLoading && allUsers.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aún no hay usuarios registrados.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
