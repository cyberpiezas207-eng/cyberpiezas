import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import OperationsView from "./OperationsView";

type TabKey = "suscriptores" | "operaciones";

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<TabKey>("suscriptores");
  const [searchQuery, setSearchQuery] = useState("");
  const [welcomeEmail, setWelcomeEmail] = useState<{ to: string; subject: string; body: string } | null>(null);

 const usersQuery = trpc.personalOperations.listSubscribers.useQuery();
  const upsertAccess = trpc.users.upsertAccess.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Acceso actualizado correctamente");
    },
  });

  const allUsers = usersQuery.data ?? [];
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter((u) => !u.access || u.access.status === "pending");
  const activeUsers = filteredUsers.filter((u) => u.access?.status === "active");

  const handleConfirm = (userId: number, userName: string, userEmail: string) => {
    if (confirm(`¿Confirmar acceso para ${userName}?`)) {
      upsertAccess.mutate({ userId, status: "active" });
      handleSendEmail(userEmail, userName);
    }
  };

  const handleReject = (userId: number, userName: string) => {
    if (confirm(`¿Desactivar acceso para ${userName}?`)) {
      upsertAccess.mutate({ userId, status: "pending" });
    }
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    const to = "cyberpiezas207@gmail.com";
    setWelcomeEmail({ to, subject: "", body: "" });
  };

  const handleCopyEmail = () => {
    if (!welcomeEmail) return;
    const text = `Para: ${welcomeEmail.to}\nAsunto: ${welcomeEmail.subject}\n\n${welcomeEmail.body}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Correo copiado al portapapeles");
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Activo</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendiente</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>;
    }
  };

  const UserRow = ({ row }: { row: any }) => {
    const u = row.user ?? row;
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

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ShieldCheck className="w-16 h-16 text-red-500 mb-4 opacity-20" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso restringido</h1>
          <p className="text-slate-400 max-w-md">Esta sección es exclusiva para administradores de CyberPiezas.</p>
          <Button onClick={() => window.history.back()} variant="link" className="mt-4 text-purple-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-purple-500" />
            Panel CyberPiezas
          </h1>
          <p className="text-slate-400 mt-1">Tu centro privado de administración y operaciones.</p>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab("suscriptores")}
            className={`px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative ${
              activeTab === "suscriptores"
                ? "text-purple-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Suscriptores
            {activeTab === "suscriptores" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("operaciones")}
            className={`px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative ${
              activeTab === "operaciones"
                ? "text-purple-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Mis Operaciones
            {activeTab === "operaciones" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
          </button>
        </div>

        {activeTab === "suscriptores" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <p className="text-slate-400">Gestión de suscriptores y accesos a la plataforma.</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Buscar suscriptor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => utils.users.list.invalidate()} className="border-white/10 text-slate-400">
                  <RefreshCw className={`w-4 h-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {usersQuery.isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-20" />
                    <p>Cargando suscriptores...</p>
                  </div>
                )}

                {welcomeEmail && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-purple-300">✉ Preparar correo</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCopyEmail} className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 gap-1">
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setWelcomeEmail(null)} className="text-slate-400 hover:text-white">✕</Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold">Para:</label>
                        <Input value={welcomeEmail.to} onChange={(e) => setWelcomeEmail({...welcomeEmail, to: e.target.value})} className="bg-black/20 border-white/10 text-slate-300 h-9" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold">Asunto:</label>
                        <Input placeholder="Escribe el asunto..." value={welcomeEmail.subject} onChange={(e) => setWelcomeEmail({...welcomeEmail, subject: e.target.value})} className="bg-black/20 border-white/10 text-slate-300 h-9" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold">Mensaje:</label>
                        <Textarea placeholder="Escribe el contenido del correo..." value={welcomeEmail.body} onChange={(e) => setWelcomeEmail({...welcomeEmail, body: e.target.value})} className="bg-black/20 border-white/10 text-slate-300 min-h-[120px] font-sans" />
                      </div>
                    </div>
                  </div>
                )}

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

                {activeUsers.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        Suscriptores activos ({activeUsers.length})
                      </CardTitle>
                      <CardDescription className="text-slate-400">Usuarios con acceso confirmado a la plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeUsers.map((row: any, i: number) => (
                        <UserRow key={(row.user ?? row).id ?? i} row={row} />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {!usersQuery.isLoading && filteredUsers.length === 0 && (
                  <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-slate-500">No se encontraron suscriptores con ese criterio.</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Resumen de Red</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total registros</span>
                      <span className="text-2xl font-bold text-white">{allUsers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Activos</span>
                      <span className="text-xl font-semibold text-emerald-400">{activeUsers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Pendientes</span>
                      <span className="text-xl font-semibold text-yellow-400">{pendingUsers.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {activeTab === "operaciones" && (
          <OperationsView showHeader={false} />
        )}
      </div>
    </DashboardLayout>
  );
}
