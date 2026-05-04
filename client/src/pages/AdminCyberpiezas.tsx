import { useState, useMemo } from "react";
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
  ArrowLeft,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  // Estado para mostrar el email de bienvenida en pantalla (sin abrir pestaña)
  const [welcomeEmail, setWelcomeEmail] = useState<{ to: string; subject: string; body: string } | null>(null);

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
    try {
      await upsertAccess.mutateAsync({
        userId,
        programCode: "boutique",
        status: "active",
        accessSource: "admin_override",
      });
      toast.success(`✓ Acceso activado para ${userName}`);
      // Mostrar el email de bienvenida en pantalla sin abrir pestaña
      const subject = "[CyberPiezas] Tu acceso ha sido activado";
      const body =
        `Hola ${userName},\n\n` +
        `¡Bienvenido a CyberPiezas! Tu acceso ha sido confirmado y ya puedes ingresar al sistema.\n\n` +
        `Ingresa en: https://cyberpiezas.com\n\n` +
        `Si tienes dudas, responde este correo.\n\n` +
        `— Deivid\nCyberPiezas`;
      setWelcomeEmail({ to: userEmail, subject, body });
    } catch (err: unknown) {
      const trpcErr = err as { data?: { code?: string }; message?: string };
      if (trpcErr?.data?.code === "FORBIDDEN") {
        toast.error("Sin permisos: verifica que OWNER_OPEN_ID en Railway coincide con tu cuenta.");
      } else {
        toast.error(`Error al confirmar: ${trpcErr?.message ?? "Error desconocido"}`);
      }
    }
  };

  const handleReject = async (userId: number, userName: string) => {
    if (!confirm(`¿Desactivar el acceso de ${userName}?`)) return;
    try {
      await upsertAccess.mutateAsync({
        userId,
        programCode: "boutique",
        status: "inactive",
        accessSource: "admin_override",
      });
      toast.success(`Acceso desactivado para ${userName}`);
    } catch (err: unknown) {
      const trpcErr = err as { data?: { code?: string }; message?: string };
      if (trpcErr?.data?.code === "FORBIDDEN") {
        toast.error("Sin permisos: verifica que OWNER_OPEN_ID en Railway coincide con tu cuenta.");
      } else {
        toast.error(`Error: ${trpcErr?.message ?? "Error desconocido"}`);
      }
    }
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    const subject = "[CyberPiezas] Mensaje del equipo";
    const body = `Hola ${userName},\n\n`;
    setWelcomeEmail({ to: userEmail, subject, body });
  };

  const handleCopyEmail = () => {
    if (!welcomeEmail) return;
    const text = `Para: ${welcomeEmail.to}\nAsunto: ${welcomeEmail.subject}\n\n${welcomeEmail.body}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Correo copiado al portapapeles");
    });
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

  // Separar por estado — usar row.status que viene del servidor (de userProgramAccess)
  const pendingUsers = filteredUsers.filter((row: any) => {
    const status = row.status ?? "pending";
    return status === "pending" || status === "inactive" || status === "suspended" || status === "expired";
  });
  const activeUsers = filteredUsers.filter((row: any) => {
    return row.status === "active";
  });
  const inactiveUsers = filteredUsers.filter((row: any) => {
    return row.status === "inactive" || row.status === "suspended" || row.status === "expired";
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
    // status viene del servidor (de userProgramAccess), no de la tabla users
    const status = row.status ?? "pending";
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white truncate">{u.name || "Sin nombre"}</p>
            {getStatusBadge(status)}
          </div>
          {u.businessName && (
            <p className="text-sm text-purple-300 mt-0.5">🏪 {u.businessName}</p>
          )}
          <p className="text-sm text-slate-400 truncate">{u.email}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro: {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy", { locale: es }) : "—"}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSendEmail(u.email, u.name || "usuario")}
            className="border-white/20 hover:bg-white/10 text-slate-300 gap-1"
            title="Preparar correo"
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

  // Layout propio aislado — sin DashboardLayout de boutique
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white">
      {/* Header fijo */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/cyberpiezas")}
            className="text-slate-400 hover:text-white gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Regresar
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">Panel CyberPiezas</span>
          </div>
          <span className="text-xs text-slate-500 ml-auto">Solo visible para ti</span>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Acceso restringido */}
        {user?.role !== "admin" && (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Acceso restringido al administrador.</p>
          </div>
        )}

        {user?.role === "admin" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Total registrados</p>
                <p className="text-3xl font-bold text-white mt-1">{allUsers.length}</p>
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                <p className="text-sm text-yellow-400/80">Pendientes de confirmar</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{pendingUsers.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-sm text-emerald-400/80">Activos</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{activeUsers.length}</p>
              </div>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar por nombre, negocio o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500/50"
              />
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cargando suscriptores...</span>
              </div>
            )}

            {/* Modal de correo en pantalla */}
            {welcomeEmail && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-purple-300">✉ Correo preparado</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyEmail} className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWelcomeEmail(null)} className="text-slate-400 hover:text-white">
                      ✕
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p><span className="text-slate-500">Para:</span> {welcomeEmail.to}</p>
                  <p><span className="text-slate-500">Asunto:</span> {welcomeEmail.subject}</p>
                </div>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-black/20 rounded-lg p-3 font-sans">{welcomeEmail.body}</pre>
              </div>
            )}

            {/* Pendientes */}
            {pendingUsers.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <Users className="w-5 h-5" />
                    Pendientes de confirmación ({pendingUsers.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">Estos usuarios se registraron pero aún no tienen acceso activo.</CardDescription>
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
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    Suscriptores activos ({activeUsers.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">Usuarios con acceso confirmado al sistema.</CardDescription>
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
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-400">
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
              <div className="text-center py-16 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aún no hay usuarios registrados.</p>
              </div>
            )}

            {/* Gestión de Acceso de Suscriptores */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                  Gestión de Acceso de Suscriptores
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Administra los accesos, suscripciones, anualidades y requisitos pendientes de cada suscriptor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation("/gestion-acceso")}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Abrir Gestión de Acceso
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
