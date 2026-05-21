import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Search,
  Mail,
  RefreshCw,
  ArrowLeft,
  Copy,
  Briefcase,
  Send,
  X as XIcon,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import OperationsView from "./OperationsView";
import { PROGRAMS, type ProgramCode } from "@/lib/adminPosCatalog";
import SubscriberCard from "@/components/admin/SubscriberCard";
import GrantSubscriptionModal from "@/components/admin/GrantSubscriptionModal";

type TabKey = "suscriptores" | "operaciones";

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<TabKey>("suscriptores");
  const [searchQuery, setSearchQuery] = useState("");
  const [welcomeEmail, setWelcomeEmail] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  // Modal "Activar gratis": guarda el usuario seleccionado o null si cerrado
  const [grantModalUser, setGrantModalUser] = useState<any | null>(null);

  const usersQuery = trpc.personalOperations.listSubscribers.useQuery();
  const upsertAccess = trpc.programAccess.upsert.useMutation({
    onSuccess: () => {
      utils.personalOperations.listSubscribers.invalidate();
      toast.success("Acceso actualizado correctamente");
      setProcessingKey(null);
    },
    onError: (err) => {
      toast.error(err.message || "Error al actualizar el acceso");
      setProcessingKey(null);
    },
  });

  const allUsers: any[] = (usersQuery.data as any[]) ?? [];
  const filteredUsers = allUsers.filter((row: any) => {
    const u = row.user ?? row;
    const q = searchQuery.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.businessName ?? "").toLowerCase().includes(q)
    );
  });

  // Desactivar directo: solo para programas manageable (los del enum legacy
  // userProgramAccess). Para no-manageable, SubscriberCard navega a setupHref.
  const deactivateProgram = (
    userId: number,
    userName: string,
    programCode: ProgramCode,
  ) => {
    const programName =
      PROGRAMS.find((p) => p.code === programCode)?.name ?? programCode;
    const key = userId + "-" + programCode;
    setProcessingKey(key);
    toast.info("Desactivando " + programName + " para " + userName + "...");

    upsertAccess.mutate({
      userId,
      programCode,
      status: "inactive",
    } as any);
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    setWelcomeEmail({
      to: userEmail || "",
      subject: "Bienvenido a CyberPiezas, " + userName,
      body:
        "Hola " +
        userName +
        ",\n\nGracias por registrarte en CyberPiezas. Tu acceso ya fue activado.\n\nSaludos,\nDavid Antonio\nCyberPiezas",
    });
  };

  const handleCopyEmail = () => {
    if (!welcomeEmail) return;
    const text =
      "Para: " +
      welcomeEmail.to +
      "\nAsunto: " +
      welcomeEmail.subject +
      "\n\n" +
      welcomeEmail.body;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Correo copiado al portapapeles");
    });
  };

  const handleOpenMail = () => {
    if (!welcomeEmail) return;
    const to = encodeURIComponent(welcomeEmail.to);
    const subject = encodeURIComponent(welcomeEmail.subject);
    const body = encodeURIComponent(welcomeEmail.body);
    window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
  };

  const programStats = PROGRAMS.map((p) => {
    const activeCount = allUsers.filter((row: any) => {
      const access = row.programAccesses?.[p.code];
      return access?.status === "active";
    }).length;
    return { ...p, activeCount };
  });

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full bg-slate-800 border-slate-700 shadow-xl">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Acceso restringido</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Esta vista es solo para administradores.
                </p>
              </div>
              <Button
                onClick={() => setLocation("/")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header del panel */}
        <div className="bg-gradient-to-r from-purple-900/40 via-fuchsia-900/30 to-slate-900 rounded-2xl p-6 border border-purple-500/30 shadow-2xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-purple-300" />
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
                  Panel de administracion
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                CyberPiezas Admin
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Gestiona suscriptores, accesos y operaciones de la plataforma.
              </p>
            </div>
            <Button
              onClick={() => usersQuery.refetch()}
              disabled={usersQuery.isFetching}
              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
            >
              <RefreshCw
                className={
                  "w-4 h-4 mr-2 " + (usersQuery.isFetching ? "animate-spin" : "")
                }
              />
              Refrescar
            </Button>
          </div>
        </div>

        {/* Tabs principales (UI inline por ahora; Commit 2 extrae AdminTabsBar) */}
        <div className="flex gap-1 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("suscriptores")}
            className={
              "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " +
              (activeTab === "suscriptores"
                ? "text-purple-300"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            <Users className="w-4 h-4" />
            Suscriptores
            {activeTab === "suscriptores" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("operaciones")}
            className={
              "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " +
              (activeTab === "operaciones"
                ? "text-purple-300"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            <Briefcase className="w-4 h-4" />
            Operaciones
            {activeTab === "operaciones" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-t" />
            )}
          </button>
        </div>

        {/* Tab content: Suscriptores */}
        {activeTab === "suscriptores" && (
          <div className="space-y-6">
            {/* Stats por programa */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {programStats.map((p) => (
                <Card key={p.code} className="bg-slate-800/60 border-slate-700 shadow-md">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl mb-1">{p.icon}</div>
                    <div className="text-xs font-bold text-slate-300 truncate">
                      {p.name}
                    </div>
                    <div className="text-lg font-bold text-emerald-300">
                      {p.activeCount}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      activos
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, email o negocio..."
                className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Lista de suscriptores */}
            {usersQuery.isLoading ? (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardContent className="pt-12 pb-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  Cargando suscriptores...
                </CardContent>
              </Card>
            ) : filteredUsers.length === 0 ? (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardContent className="pt-12 pb-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold">No hay suscriptores</p>
                  <p className="text-xs mt-1 text-slate-500">
                    {searchQuery
                      ? "No se encontraron resultados para tu busqueda."
                      : "Aun no hay usuarios registrados."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/40 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-300" />
                    Suscriptores
                    <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 ml-1">
                      {filteredUsers.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Cada card muestra los accesos y estado actual del usuario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredUsers.map((row: any, i: number) => (
                    <SubscriberCard
                      key={(row.user ?? row).id ?? i}
                      row={row}
                      processingKey={processingKey}
                      onDeactivate={deactivateProgram}
                      onNavigate={setLocation}
                      onActivateGratis={setGrantModalUser}
                      onSendEmail={handleSendEmail}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab content: Operaciones */}
        {activeTab === "operaciones" && <OperationsView showHeader={false} />}
      </div>

      {/* Modal "Welcome email": helpers para copiar/abrir mailto */}
      {welcomeEmail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 px-6 py-5 relative">
              <button
                onClick={() => setWelcomeEmail(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                    Email de bienvenida
                  </p>
                  <h2 className="text-xl font-bold text-white">Enviar correo</h2>
                  <p className="text-xs text-white/80 mt-0.5 truncate max-w-[260px]">
                    {welcomeEmail.to}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Asunto
                </label>
                <Input
                  value={welcomeEmail.subject}
                  onChange={(e) =>
                    setWelcomeEmail({ ...welcomeEmail, subject: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cuerpo
                </label>
                <textarea
                  value={welcomeEmail.body}
                  onChange={(e) =>
                    setWelcomeEmail({ ...welcomeEmail, body: e.target.value })
                  }
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none h-48 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 bg-white flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyEmail}
                className="flex-1 rounded-full h-11"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                Copiar
              </Button>
              <Button
                onClick={handleOpenMail}
                className="flex-1 rounded-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Abrir email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Activar gratis": componente extraido (V1.5 + V2 Admin Hub) */}
      {grantModalUser && (
        <GrantSubscriptionModal
          user={grantModalUser}
          onClose={() => setGrantModalUser(null)}
          onSuccess={() => {
            setGrantModalUser(null);
            utils.personalOperations.listSubscribers.invalidate();
          }}
        />
      )}
    </DashboardLayout>
  );
}
