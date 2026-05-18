import { useState } from "react";
import { useLocation } from "wouter";
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
  Search,
  Mail,
  RefreshCw,
  ArrowLeft,
  Copy,
  Briefcase,
  Calendar,
  Store,
  CreditCard,
  Phone,
  Send,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import OperationsView from "./OperationsView";

type TabKey = "suscriptores" | "operaciones";

// Codigos de programa soportados en el panel (sin papeleria, aun no implementado)
type ProgramCode = "boutique" | "abarrotes" | "veterinaria" | "verduleria" | "tarima" | "taqueria";

// Cada programa declara:
// - setupHref: ruta a donde lleva el boton cuando esta inactivo (Setup) y cuando esta activo en los no-manageable
// - manageable: si true, el boton Desactivar llama directo a programAccess.upsert (los 3 codigos del enum)
//               si false, el boton Desactivar navega a setupHref (los 3 que vienen de pagos)
type ProgramSpec = {
  code: ProgramCode;
  name: string;
  icon: string;
  gradient: string;
  ring: string;
  setupHref: string;
  setupLabel: string;
  manageable: boolean;
};

const PROGRAMS: ProgramSpec[] = [
  {
    code: "boutique",
    name: "Boutique",
    icon: "👗",
    gradient: "from-purple-500 to-pink-500",
    ring: "ring-purple-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup boutique",
    manageable: true,
  },
  {
    code: "abarrotes",
    name: "Abarrotes",
    icon: "🛒",
    gradient: "from-orange-500 to-red-500",
    ring: "ring-orange-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup abarrotes",
    manageable: true,
  },
  {
    code: "veterinaria",
    name: "Veterinaria",
    icon: "🐾",
    gradient: "from-emerald-500 to-cyan-500",
    ring: "ring-emerald-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup veterinaria",
    manageable: true,
  },
  {
    code: "verduleria",
    name: "Verduleria",
    icon: "🥕",
    gradient: "from-lime-500 to-green-600",
    ring: "ring-lime-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup verduleria",
    manageable: false,
  },
  {
    code: "tarima",
    name: "Tarima",
    icon: "🎤",
    gradient: "from-fuchsia-500 to-indigo-500",
    ring: "ring-fuchsia-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup tarima",
    manageable: false,
  },
  {
    code: "taqueria",
    name: "Taqueria",
    icon: "🌮",
    gradient: "from-amber-500 to-rose-500",
    ring: "ring-amber-500/30",
    setupHref: "/admin-taqueria-setup",
    setupLabel: "Setup taqueria",
    manageable: false,
  },
];

const avatarColors = [
  "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getPlanLabel(plan?: string | null) {
  switch (plan) {
    case "free": return "Gratis";
    case "basic": return "Basico";
    case "professional": return "Profesional";
    case "premium": return "Premium";
    case "annual": return "Anual";
    default: return plan ?? "-";
  }
}

function getPlanColor(plan?: string | null) {
  switch (plan) {
    case "free": return "bg-slate-700 text-slate-200 border-slate-600";
    case "basic": return "bg-blue-500/20 text-blue-200 border-blue-500/40";
    case "professional": return "bg-purple-500/20 text-purple-200 border-purple-500/40";
    case "premium": return "bg-amber-500/20 text-amber-200 border-amber-500/40";
    case "annual": return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
    default: return "bg-slate-700 text-slate-300 border-slate-600";
  }
}

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<TabKey>("suscriptores");
  const [searchQuery, setSearchQuery] = useState("");
  const [welcomeEmail, setWelcomeEmail] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

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

  // Desactivar directo (solo para programas manageable, que estan en el enum userProgramAccess)
  const deactivateProgram = (userId: number, userName: string, programCode: ProgramCode) => {
    const programName = PROGRAMS.find(p => p.code === programCode)?.name ?? programCode;
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
      body: "Hola " + userName + ",\n\nGracias por registrarte en CyberPiezas. Tu acceso ya fue activado.\n\nSaludos,\nDavid Antonio\nCyberPiezas",
    });
  };

  const handleCopyEmail = () => {
    if (!welcomeEmail) return;
    const text = "Para: " + welcomeEmail.to + "\nAsunto: " + welcomeEmail.subject + "\n\n" + welcomeEmail.body;
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

  const programStats = PROGRAMS.map(p => {
    const activeCount = allUsers.filter((row: any) => {
      const access = row.programAccesses?.[p.code];
      return access?.status === "active";
    }).length;
    return { ...p, activeCount };
  });

  const SubscriberCard = ({ row }: { row: any }) => {
    const u = row.user ?? row;
    const accesses = row.programAccesses ?? {};
    const initials = getInitials(u.name || u.email || "?");
    const avatarColor = getAvatarColor(u.name || u.email || "?");

    const activePrograms = PROGRAMS.filter(p => accesses[p.code]?.status === "active");
    const isFullyInactive = activePrograms.length === 0;

    return (
      <Card className="bg-slate-800/60 border-slate-700/80 hover:border-purple-500/60 transition-all shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className={"flex-shrink-0 w-20 h-20 rounded-2xl " + avatarColor + " flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-white/10"}>
              {initials}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-xl font-bold text-white truncate">{u.name || "Sin nombre"}</h3>
                  {u.businessName && (
                    <p className="text-sm text-purple-300 flex items-center gap-1.5 mt-0.5">
                      <Store className="w-3.5 h-3.5" />
                      {u.businessName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {isFullyInactive ? (
                    <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-500/40 font-semibold">
                      Sin accesos
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40 gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {activePrograms.length} {activePrograms.length === 1 ? "programa" : "programas"}
                    </Badge>
                  )}
                  <Badge className={getPlanColor(u.subscriptionPlan) + " text-xs font-semibold"}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {getPlanLabel(u.subscriptionPlan)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-300 pt-3 border-t border-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{u.email || "Sin email"}</span>
                </div>
                {u.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{u.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Registro: {u.createdAt ? format(new Date(u.createdAt), "dd 'de' MMM, yyyy", { locale: es }) : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 uppercase tracking-wider font-semibold">
                    Login: {u.loginMethod || "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">Accesos a programas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PROGRAMS.map(program => {
                    const access = accesses[program.code];
                    const isActive = access?.status === "active";
                    const key = u.id + "-" + program.code;
                    const isProcessing = processingKey === key;
                    // Observabilidad silenciosa: de donde vino el acceso (enum o pago manual)
                    const source = access?.source ?? (program.manageable ? "enum" : "payment");

                    // Handler unificado:
                    // - Activo + manageable -> desactiva via upsert (los 3 codigos del enum)
                    // - Activo + no manageable -> navega a setupHref para gestionar el pago
                    // - Inactivo (cualquiera) -> navega a setupHref para configurar/activar
                    const handleClick = () => {
                      if (isActive && program.manageable) {
                        deactivateProgram(u.id, u.name || "usuario", program.code);
                      } else {
                        setLocation(program.setupHref);
                      }
                    };

                    return (
                      <div
                        key={program.code}
                        data-program={program.code}
                        data-source={source}
                        data-active={isActive ? "1" : "0"}
                        className={
                          "rounded-lg border p-2.5 transition-all " +
                          (isActive
                            ? "bg-emerald-500/15 border-emerald-500/50 shadow-md"
                            : "bg-slate-900/60 border-slate-700/80")
                        }
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{program.icon}</span>
                          <span className={"text-sm font-bold " + (isActive ? "text-emerald-200" : "text-slate-300")}>
                            {program.name}
                          </span>
                        </div>

                        {isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClick}
                            disabled={isProcessing}
                            className="w-full h-7 text-xs border-red-500/50 text-red-200 hover:bg-red-500/30 font-semibold"
                          >
                            {isProcessing ? "..." : "Desactivar"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClick}
                            className="w-full h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 font-semibold gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{program.setupLabel}</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendEmail(u.email, u.name || "usuario")}
                  className="border-slate-600 hover:bg-slate-700 text-slate-200 gap-1.5 font-semibold"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Enviar email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ShieldCheck className="w-16 h-16 text-red-500 mb-4 opacity-30" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso restringido</h1>
          <p className="text-slate-300 max-w-md">Esta seccion es exclusiva para administradores de CyberPiezas.</p>
          <Button onClick={() => window.history.back()} variant="link" className="mt-4 text-purple-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header con boton volver */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/cyberpiezas")}
            className="text-slate-300 hover:text-white hover:bg-slate-800 mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Centro
          </Button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
                Panel CyberPiezas
              </h1>
              <p className="text-slate-300 mt-1">Tu centro privado de administracion y operaciones.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.personalOperations.listSubscribers.invalidate()}
              className="border-slate-600 text-slate-200 hover:bg-slate-700 gap-2"
            >
              <RefreshCw className={"w-4 h-4 " + (usersQuery.isFetching ? "animate-spin" : "")} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("suscriptores")}
            className={"px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " + (activeTab === "suscriptores" ? "text-purple-300" : "text-slate-400 hover:text-slate-200")}
          >
            <Users className="w-4 h-4" />
            Suscriptores
            {activeTab === "suscriptores" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("operaciones")}
            className={"px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " + (activeTab === "operaciones" ? "text-purple-300" : "text-slate-400 hover:text-slate-200")}
          >
            <Briefcase className="w-4 h-4" />
            Mis Operaciones
            {activeTab === "operaciones" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
          </button>
        </div>

        {activeTab === "suscriptores" && (
          <div className="space-y-6">
            {/* Stats GRANDES en grid responsive (Total + 6 POS = 7 cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-slate-300 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{allUsers.length}</p>
                  <p className="text-xs text-slate-400 mt-1">suscriptores</p>
                </CardContent>
              </Card>

              {programStats.map(p => (
                <Card key={p.code} className={"bg-gradient-to-br " + p.gradient + " border-white/20 shadow-xl"}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-white/90 mb-2">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider truncate">{p.name}</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{p.activeCount}</p>
                    <p className="text-xs text-white/80 mt-1">activos</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Buscador */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, email o negocio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email modal */}
            {welcomeEmail && (
              <div className="rounded-xl border border-purple-500/50 bg-purple-950/40 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-bold text-purple-100">Preparar correo</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={handleOpenMail}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-1 font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Abrir en Mail
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCopyEmail} className="border-purple-500/50 text-purple-100 hover:bg-purple-500/30 gap-1 font-semibold">
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWelcomeEmail(null)} className="text-slate-200 hover:text-white">
                      X
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input
                    value={welcomeEmail.to}
                    onChange={(e) => setWelcomeEmail({ ...welcomeEmail, to: e.target.value })}
                    className="bg-slate-900 border-purple-500/40 text-white h-9"
                    placeholder="destinatario@ejemplo.com"
                  />
                  <Input
                    value={welcomeEmail.subject}
                    onChange={(e) => setWelcomeEmail({ ...welcomeEmail, subject: e.target.value })}
                    className="bg-slate-900 border-purple-500/40 text-white h-9"
                    placeholder="Asunto"
                  />
                  <Textarea
                    value={welcomeEmail.body}
                    onChange={(e) => setWelcomeEmail({ ...welcomeEmail, body: e.target.value })}
                    className="bg-slate-900 border-purple-500/40 text-white min-h-[120px] font-sans"
                    placeholder="Mensaje"
                  />
                </div>
              </div>
            )}

            {/* Lista de suscriptores */}
            {usersQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-40" />
                <p className="font-semibold">Cargando suscriptores...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-700">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-200 font-semibold mb-1">No hay suscriptores aun</p>
                <p className="text-sm text-slate-400">
                  Cuando alguien se registre en tu plataforma, aparecera aqui.
                </p>
              </div>
            ) : (
              <Card className="bg-slate-800/40 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="w-5 h-5 text-purple-300" />
                    Suscriptores ({filteredUsers.length})
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Cada programa muestra "Desactivar" si esta activo, o "Setup" para configurar o activar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredUsers.map((row: any, i: number) => (
                    <SubscriberCard key={(row.user ?? row).id ?? i} row={row} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "operaciones" && <OperationsView showHeader={false} />}
      </div>
    </DashboardLayout>
  );
}
