import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  ArrowLeft,
  Copy,
  Send,
  X as XIcon,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import OperationsView from "./OperationsView";
import { PROGRAMS, type ProgramCode } from "@/lib/adminPosCatalog";
import GrantSubscriptionModal from "@/components/admin/GrantSubscriptionModal";
import AdminTabsBar, {
  type AdminTabKey,
} from "@/components/admin/AdminTabsBar";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminPendingPaymentsTab from "@/components/admin/AdminPendingPaymentsTab";
import FlujoGeneralPanel from "@/components/admin/FlujoGeneralPanel";
import PersonalExpensesView from "@/components/admin/PersonalExpensesView";
import AdminKPIStrip from "@/components/admin/AdminKPIStrip";
import AdminQuickTiles, { type SubModule } from "@/components/admin/AdminQuickTiles";
import PaymentCalendarPanel from "@/components/admin/PaymentCalendarPanel";
import AlertsCenter from "@/components/admin/AlertsCenter";
import DineroLibreCard from "@/components/admin/DineroLibreCard";
import QuickCaptureFab from "@/components/admin/QuickCaptureFab";

export default function AdminCyberpiezas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<AdminTabKey>("suscriptores");
  const [showGastos, setShowGastos] = useState(false);
  // Sub-tab inicial al abrir PersonalExpensesView (controlado desde tiles)
  const [gastosInitialSubTab, setGastosInitialSubTab] =
    useState<SubModule>("gastos");
  const [welcomeEmail, setWelcomeEmail] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  // Modal "Activar gratis": guarda el usuario seleccionado o null si cerrado
  const [grantModalUser, setGrantModalUser] = useState<any | null>(null);

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

  // Query para mostrar count de pagos pendientes como badge en la tab
  const pendingPaymentsQuery = trpc.pagos.admin.listAll.useQuery({
    status: "pending",
  });
  const pendingCount = (pendingPaymentsQuery.data ?? []).length;

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
      <div className="space-y-5 pb-12">
        {/* Hero compacto del panel admin (slate/indigo palacio fino) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/15 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.04)]">
          {/* Glow sutil indigo */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300/80 mb-0.5">
                  Panel de administracion
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                  CyberPiezas Admin
                </h1>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Suscriptores, accesos y operaciones de la plataforma
                </p>
              </div>
            </div>
            <Button
              onClick={() =>
                utils.personalOperations.listSubscribers.invalidate()
              }
              size="sm"
              className="bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 h-9 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refrescar
            </Button>
          </div>
        </div>

        {/* Barra de tabs (extraida en Commit 2, extendida en Commit 3) */}
        <AdminTabsBar
          activeTab={activeTab}
          onChange={setActiveTab}
          pendingPaymentsCount={pendingCount}
        />

        {/* Tab content: Suscriptores (componente extraido en Commit 2) */}
        {activeTab === "suscriptores" && (
          <AdminUsersTab
            processingKey={processingKey}
            onDeactivate={deactivateProgram}
            onNavigate={setLocation}
            onActivateGratis={setGrantModalUser}
            onSendEmail={handleSendEmail}
          />
        )}

        {/* Tab content: Pagos pendientes (Commit 3 V2 Admin Hub) */}
        {activeTab === "pagos" && <AdminPendingPaymentsTab />}

        {/* Tab content: Operaciones (V3 con KPI strip + tiles arriba) */}
        {activeTab === "operaciones" &&
          (showGastos ? (
            <PersonalExpensesView
              onBack={() => setShowGastos(false)}
              initialSubTab={gastosInitialSubTab}
            />
          ) : (
            <div className="space-y-5">
              {/* Centro de Alertas (Commit 9) - se auto-oculta si no hay alertas */}
              <AlertsCenter
                onNavigate={(target) => {
                  if (target === "debts") {
                    setGastosInitialSubTab("deudas");
                    setShowGastos(true);
                  } else if (target === "subscriptions") {
                    setLocation("/mis-suscripciones");
                  } else if (target === "admin_payments") {
                    setActiveTab("pagos");
                  } else if (target === "reminders") {
                    setGastosInitialSubTab("recordatorios");
                    setShowGastos(true);
                  }
                }}
              />
              {/* Dinero Libre Estimado - Resumen de Hoy (Commit A) */}
              <DineroLibreCard />
              {/* KPI Strip (Commit 6) */}
              <AdminKPIStrip />
              {/* Tiles de navegacion a sub-modulos (Commit 7) */}
              <AdminQuickTiles
                onOpenModule={(subTab) => {
                  setGastosInitialSubTab(subTab);
                  setShowGastos(true);
                }}
              />
              <FlujoGeneralPanel onOpenMisGastos={() => setShowGastos(true)} />
              {/* Calendario visual de pagos (Commit 8) */}
              <PaymentCalendarPanel />
              <OperationsView showHeader={false} />
            </div>
          ))}
      </div>

      {/* Modal "Welcome email": helpers para copiar/abrir mailto */}
      {welcomeEmail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-indigo-600 to-cyan-600 px-6 py-5 relative">
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
                className="flex-1 rounded-full h-11 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Abrir email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Activar gratis": componente extraido */}
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

      {/* FAB de captura rapida (Commit 10) - flotante en esquina inferior derecha */}
      <QuickCaptureFab />
    </DashboardLayout>
  );
}
