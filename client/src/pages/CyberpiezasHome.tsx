import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Briefcase,
  Camera,
  Check,
  Cloud,
  Cpu,
  CreditCard,
  DollarSign,
  Gift,
  GraduationCap,
  HardDrive,
  Heart,
  Handshake,
  Hash,
  LayoutDashboard,
  Leaf,
  LineChart,
  ListChecks,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Monitor,
  Mountain,
  Music,
  Package,
  Phone,
  Play,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Stethoscope,
  Store,
  ShoppingBasket,
  Sun,
  TreePine,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";

export function CyberpiezasHome() {
  const [, setLocation] = useLocation();
  const auth = useAuth() as any;
  const isAuthenticated = auth?.isAuthenticated;
  const user = auth?.user;
  const isAdmin = user?.role === "admin" || user?.email === "cyberpiezas207@gmail.com";

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <NavBar
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        setLocation={setLocation}
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
        onAdminPanel={() => setShowAdminPanel(true)}
      />
      <Hero
        setLocation={setLocation}
        isAuthenticated={isAuthenticated}
        onDemo={() => setShowDemoModal(true)}
      />
      <WhatIsThis />
      <Houses setLocation={setLocation} />
      <Industries setLocation={setLocation} />
      <TrustLayer />
      <Communities />
      <WhyDifferent />
      <Hardware />
      <Services />
      <Features />
      <Story />
      <Referrals isAuthenticated={isAuthenticated} user={user} setLocation={setLocation} />
      <Pricing setLocation={setLocation} isAuthenticated={isAuthenticated} />
      <FinalCTA
        setLocation={setLocation}
        isAuthenticated={isAuthenticated}
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
      />
      <Footer
        onSupport={() => setShowSupportModal(true)}
        onCollab={() => setShowCollabModal(true)}
      />
      <FloatingButtons isAdmin={isAdmin} setLocation={setLocation} />
      {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}
      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
      {showCollabModal && <CollabModal onClose={() => setShowCollabModal(false)} />}
      {showAdminPanel && <AdminPanelModal setLocation={setLocation} onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
}

function AdminQuickActions({ setLocation }: { setLocation: (p: string) => void }) {
  const { data: stats } = trpc.pagos.admin.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const pendingCount = stats?.pendingCount ?? 0;
  const monthRevenue = stats?.monthRevenue ?? "0";
  const monthApproved = stats?.monthApprovedCount ?? 0;

  return (
    <section className="py-12 px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Centro de administración
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Tu panel de control</h2>
            <p className="text-sm text-slate-500 mt-1">Acciones rápidas para gestionar CyberPiezas</p>
          </div>
          {pendingCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-100 border border-rose-200 rounded-full">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-rose-700">
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setLocation("/admin-pagos")}
            className={
              "group relative p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] " +
              (pendingCount > 0
                ? "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400 shadow-lg shadow-rose-200"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg")
            }
          >
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 text-rose-900 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                {pendingCount}
              </span>
            )}
            <div className={"w-10 h-10 rounded-xl flex items-center justify-center mb-3 " + (pendingCount > 0 ? "bg-white/20" : "bg-emerald-100")}>
              <DollarSign className={"w-5 h-5 " + (pendingCount > 0 ? "text-white" : "text-emerald-600")} />
            </div>
            <h3 className={"font-bold text-base mb-1 " + (pendingCount > 0 ? "text-white" : "text-slate-900")}>Pagos por aprobar</h3>
            <p className={"text-xs " + (pendingCount > 0 ? "text-white/80" : "text-slate-500")}>
              {pendingCount > 0 ? `Hay ${pendingCount} solicitud${pendingCount !== 1 ? "es" : ""} esperando` : "Sin solicitudes pendientes"}
            </p>
            <div className={"mt-3 flex items-center gap-1 text-xs font-bold " + (pendingCount > 0 ? "text-white" : "text-emerald-600")}>
              Ver panel <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={() => setLocation("/admin-cyberpiezas")}
            className="group p-5 rounded-2xl border-2 bg-white border-slate-200 hover:border-purple-300 hover:shadow-lg text-left transition-all hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">Gestión usuarios</h3>
            <p className="text-xs text-slate-500">Activa programas y administra accesos</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-purple-600">
              Ir <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <div className="p-5 rounded-2xl border-2 bg-white border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">Ingresos del mes</h3>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              ${parseFloat(monthRevenue).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {monthApproved} aprobada{monthApproved !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={() => setLocation("/pricing")}
            className="group p-5 rounded-2xl border-2 bg-gradient-to-br from-fuchsia-500 to-purple-600 border-fuchsia-400 text-left transition-all hover:scale-[1.02] hover:shadow-lg shadow-purple-200"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-base text-white mb-1">Precios y Planes</h3>
            <p className="text-xs text-white/80">Ver catálogo completo de suscripciones</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white">
              Ver <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminPanelModal({ setLocation, onClose }: { setLocation: (p: string) => void; onClose: () => void }) {
  const { data: stats } = trpc.pagos.admin.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const pendingCount = stats?.pendingCount ?? 0;
  const monthRevenue = stats?.monthRevenue ?? "0";
  const monthApproved = stats?.monthApprovedCount ?? 0;

  const go = (path: string) => {
    onClose();
    setTimeout(() => setLocation(path), 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center p-4 sm:items-center animate-in fade-in"
      onClick={onClose}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mi Panel</h2>
              <p className="text-xs text-slate-500">Acciones rápidas de administración</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border-2 border-rose-200 rounded-2xl">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-rose-700">
                Tienes {pendingCount} pago{pendingCount !== 1 ? "s" : ""} esperando aprobación
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => go("/admin-pagos")}
              className={
                "group relative p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] " +
                (pendingCount > 0
                  ? "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400 shadow-lg shadow-rose-200"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg")
              }
            >
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 text-rose-900 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                  {pendingCount}
                </span>
              )}
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center mb-3 " + (pendingCount > 0 ? "bg-white/20" : "bg-emerald-100")}>
                <DollarSign className={"w-5 h-5 " + (pendingCount > 0 ? "text-white" : "text-emerald-600")} />
              </div>
              <h3 className={"font-bold text-base mb-1 " + (pendingCount > 0 ? "text-white" : "text-slate-900")}>Pagos por aprobar</h3>
              <p className={"text-xs " + (pendingCount > 0 ? "text-white/80" : "text-slate-500")}>
                {pendingCount > 0 ? `${pendingCount} solicitud${pendingCount !== 1 ? "es" : ""} esperando` : "Sin solicitudes pendientes"}
              </p>
              <div className={"mt-3 flex items-center gap-1 text-xs font-bold " + (pendingCount > 0 ? "text-white" : "text-emerald-600")}>
                Ver panel <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              onClick={() => go("/admin-cyberpiezas")}
              className="group p-5 rounded-2xl border-2 bg-white border-slate-200 hover:border-purple-300 hover:shadow-lg text-left transition-all hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Gestión usuarios</h3>
              <p className="text-xs text-slate-500">Activa programas y accesos</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-purple-600">
                Ir <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <div className="p-5 rounded-2xl border-2 bg-white border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Ingresos del mes</h3>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                ${parseFloat(monthRevenue).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {monthApproved} aprobada{monthApproved !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={() => go("/sistemas")}
              className="group p-5 rounded-2xl border-2 bg-gradient-to-br from-slate-900 to-slate-700 border-slate-700 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">Ir a sistemas</h3>
              <p className="text-xs text-white/70">Acceder a tus POS activos</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white">
                Entrar <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingButtons({ isAdmin, setLocation }: { isAdmin?: boolean; setLocation?: (p: string) => void }) {
  const [showButtons, setShowButtons] = useState(false);
  const { data: stats } = trpc.pagos.admin.stats.useQuery(undefined, {
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });
  const pendingCount = stats?.pendingCount ?? 0;

  useEffect(() => {
    const handleScroll = () => setShowButtons(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  if (!showButtons) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4">
      {isAdmin && setLocation && pendingCount > 0 && (
        <button
          onClick={() => setLocation("/admin-pagos")}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all"
          title={`${pendingCount} pago${pendingCount !== 1 ? "s" : ""} por aprobar`}
        >
          <DollarSign className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-yellow-400 text-rose-900 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
            {pendingCount}
          </span>
        </button>
      )}
      {isAdmin && setLocation && (
        <button
          onClick={() => setLocation("/admin-cyberpiezas")}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all"
          title="Panel admin"
        >
          <ShieldCheck className="w-5 h-5 text-white" />
        </button>
      )}
      <button onClick={() => window.history.length > 1 && window.history.back()} className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all" title="Atras">
        <ArrowLeft className="w-5 h-5 text-slate-700" />
      </button>
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all" title="Subir al inicio">
        <ArrowUp className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

function NavBar({ isAuthenticated, isAdmin, setLocation, onSupport, onCollab, onAdminPanel }: { isAuthenticated: boolean; isAdmin?: boolean; setLocation: (p: string) => void; onSupport: () => void; onCollab: () => void; onAdminPanel?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 group">
          <CyberpiezasLogo size={36} variant="dark" />
          <span className="font-bold text-lg tracking-tight text-slate-900">CyberPiezas</span>
        </button>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
          <a href="#casas" className="hover:text-slate-900 transition-colors">El edificio</a>
          <a href="#sistemas" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> POS
          </a>
          <a href="#mobility" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Mobility
          </a>
          <a href="#celine" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Celine
          </a>
          <a href="#confianza" className="hover:text-slate-900 transition-colors">Confianza</a>
          <a href="#historia" className="hover:text-slate-900 transition-colors">Historia</a>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          <button onClick={onCollab} className="hover:text-slate-900 transition-colors">Colaborar</button>
          <button onClick={onSupport} className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Apoyar
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setLocation("/admin-cyberpiezas")}
              className="hidden sm:flex w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 transition-all items-center justify-center shadow-md"
              title="Panel administracion"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </button>
          )}
          {isAuthenticated ? (
            <Button
              onClick={() => {
                if (isAdmin && onAdminPanel) {
                  onAdminPanel();
                } else {
                  setLocation("/sistemas");
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Mi Panel
            </Button>
          ) : (
            <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-9 text-sm font-semibold">
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Iniciar sesion
            </Button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center">
            <span className="text-lg leading-none">≡</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 gap-2 text-sm font-medium">
            <a href="#casas" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">El edificio</a>
            <a href="#sistemas" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> POS
            </a>
            <a href="#mobility" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Mobility
            </a>
            <a href="#celine" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Celine
            </a>
            <a href="#confianza" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Confianza</a>
            <a href="#historia" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Historia</a>
            <a href="#precios" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100">Precios</a>
            <button onClick={() => { setMobileOpen(false); onCollab(); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-100">Colaborar</button>
            <button onClick={() => { setMobileOpen(false); onSupport(); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> Apoyar
            </button>
            {isAdmin && (
              <button onClick={() => { setMobileOpen(false); setLocation("/admin-cyberpiezas"); }} className="text-left px-3 py-2 rounded-lg bg-purple-50 text-purple-700 col-span-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Panel admin
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ============================================================================
// HERO — Infraestructura de confianza local
// Grafo vivo del edificio con las casas alrededor
// ============================================================================

function Hero({ setLocation, isAuthenticated, onDemo }: { setLocation: (p: string) => void; isAuthenticated: boolean; onDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Orbes decorativos */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[280px] h-[280px] bg-amber-200/15 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-28 pb-12 sm:pb-16 lg:pb-24 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2.5 mb-6 sm:mb-8">
          <span className="w-6 sm:w-8 h-px bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.25em] sm:tracking-[0.3em]">
            Hecho en Morelos · Para Morelos
          </p>
          <span className="w-6 sm:w-8 h-px bg-slate-300" />
        </div>

        {/* H1 - El nuevo headline */}
        <h1 className="text-[2.5rem] leading-[1.02] sm:text-6xl sm:leading-[0.98] lg:text-7xl xl:text-[5.5rem] font-bold tracking-tighter text-slate-900 max-w-5xl mx-auto">
          CyberPiezas no es solo software.
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          Es{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent italic font-medium">
            infraestructura de confianza
          </span>{" "}
          local.
        </h1>

        {/* Subhead */}
        <p className="mt-6 sm:mt-8 text-lg sm:text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto font-light leading-relaxed tracking-tight px-2">
          La red donde personas, negocios y comunidades de Morelos
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          <span className="text-slate-900 font-normal">se conectan, se conocen y se cuidan entre sí.</span>
        </p>

        {/* CTAs */}
        <div className="mt-9 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
          <Button
            onClick={() => { const el = document.getElementById("casas"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12 sm:h-14 px-7 sm:px-8 text-base font-semibold shadow-xl shadow-slate-900/20 hover:scale-[1.02] hover:-translate-y-0.5 transition-all"
          >
            Conoce el ecosistema <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button
            onClick={() => { const el = document.getElementById("confianza"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
            variant="outline"
            className="w-full sm:w-auto border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-12 sm:h-14 px-7 sm:px-8 text-base font-semibold"
          >
            Cómo funciona la confianza
          </Button>
        </div>

        {/* Trust badges */}
        <div className="hidden sm:flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-12 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin contratos</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin algoritmos opacos</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Soporte humano</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Datos en México</span>
        </div>

        {/* GRAFO VIVO DEL EDIFICIO */}
        <div className="mt-10 sm:mt-16 max-w-4xl mx-auto">
          <HeroGraph />
        </div>
      </div>
    </section>
  );
}

function HeroGraph() {
  return (
    <div className="w-full aspect-[21/10] sm:aspect-[2.1/1] relative">
      <svg viewBox="0 0 840 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="heroNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="heroCenterGrad">
            <stop offset="0%" stopColor="#fefce8" />
            <stop offset="100%" stopColor="#d4a373" />
          </radialGradient>
          <linearGradient id="heroLineMob" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroLineCel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroLinePos" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Orbits */}
        <ellipse cx="420" cy="200" rx="320" ry="150" fill="none" stroke="rgba(212,163,115,0.18)" strokeWidth="1" strokeDasharray="2 6" />
        <ellipse cx="420" cy="200" rx="220" ry="100" fill="none" stroke="rgba(212,163,115,0.12)" strokeWidth="1" strokeDasharray="2 6" />

        {/* Connections center → houses */}
        <line x1="420" y1="200" x2="160" y2="130" stroke="url(#heroLineMob)" strokeWidth="1.5" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
        </line>
        <line x1="420" y1="200" x2="680" y2="130" stroke="url(#heroLineCel)" strokeWidth="1.5" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" begin="-0.5s" />
        </line>
        <line x1="420" y1="200" x2="420" y2="340" stroke="url(#heroLinePos)" strokeWidth="1.5" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" begin="-1s" />
        </line>

        {/* Cross-house */}
        <line x1="160" y1="130" x2="680" y2="130" stroke="rgba(212,163,115,0.18)" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="160" y1="130" x2="420" y2="340" stroke="rgba(212,163,115,0.15)" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="680" y1="130" x2="420" y2="340" stroke="rgba(212,163,115,0.15)" strokeWidth="1" strokeDasharray="2 4" />

        {/* People dots */}
        <g>
          {[
            { cx: 200, cy: 80, c: "#3b82f6", o: 0.5 }, { cx: 280, cy: 50, c: "#3b82f6", o: 0.5 },
            { cx: 100, cy: 180, c: "#3b82f6", o: 0.4 }, { cx: 120, cy: 100, c: "#3b82f6", o: 0.4 },
            { cx: 640, cy: 80, c: "#f97316", o: 0.5 }, { cx: 720, cy: 50, c: "#f97316", o: 0.5 },
            { cx: 740, cy: 180, c: "#f97316", o: 0.4 }, { cx: 760, cy: 120, c: "#f97316", o: 0.4 },
            { cx: 360, cy: 380, c: "#14b8a6", o: 0.5 }, { cx: 480, cy: 380, c: "#14b8a6", o: 0.5 },
            { cx: 320, cy: 350, c: "#14b8a6", o: 0.4 }, { cx: 520, cy: 350, c: "#14b8a6", o: 0.4 },
          ].map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r="3" fill={d.c} opacity={d.o} />
          ))}
        </g>

        {/* Mobility node */}
        <g>
          <circle cx="160" cy="130" r="22" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.6">
            <animate attributeName="r" values="22;44;22" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="160" cy="130" r="28" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.30)" strokeWidth="1" />
          <circle cx="160" cy="130" r="18" fill="#3b82f6" filter="url(#heroNodeGlow)" />
          <text x="160" y="135" textAnchor="middle" fill="#fff" fontFamily="system-ui" fontSize="11" fontWeight="700">MOB</text>
          <text x="160" y="180" textAnchor="middle" fill="#1e40af" fontFamily="Georgia, serif" fontSize="14" fontWeight="500">Mobility</text>
        </g>

        {/* Celine node */}
        <g>
          <circle cx="680" cy="130" r="22" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.6">
            <animate attributeName="r" values="22;44;22" dur="2.4s" repeatCount="indefinite" begin="-0.8s" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" begin="-0.8s" />
          </circle>
          <circle cx="680" cy="130" r="28" fill="rgba(249,115,22,0.08)" stroke="rgba(249,115,22,0.30)" strokeWidth="1" />
          <circle cx="680" cy="130" r="18" fill="#f97316" filter="url(#heroNodeGlow)" />
          <text x="680" y="135" textAnchor="middle" fill="#fff" fontFamily="system-ui" fontSize="11" fontWeight="700">CEL</text>
          <text x="680" y="180" textAnchor="middle" fill="#9a3412" fontFamily="Georgia, serif" fontSize="14" fontWeight="500">Celine</text>
        </g>

        {/* POS node */}
        <g>
          <circle cx="420" cy="340" r="22" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6">
            <animate attributeName="r" values="22;44;22" dur="2.4s" repeatCount="indefinite" begin="-1.6s" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" begin="-1.6s" />
          </circle>
          <circle cx="420" cy="340" r="28" fill="rgba(20,184,166,0.08)" stroke="rgba(20,184,166,0.30)" strokeWidth="1" />
          <circle cx="420" cy="340" r="18" fill="#14b8a6" filter="url(#heroNodeGlow)" />
          <text x="420" y="345" textAnchor="middle" fill="#fff" fontFamily="system-ui" fontSize="11" fontWeight="700">POS</text>
          <text x="420" y="390" textAnchor="middle" fill="#115e59" fontFamily="Georgia, serif" fontSize="14" fontWeight="500">Punto de venta</text>
        </g>

        {/* Center: CyberPiezas */}
        <g>
          <circle cx="420" cy="200" r="56" fill="rgba(255,255,255,0.5)" stroke="rgba(212,163,115,0.30)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="420" cy="200" r="42" fill="url(#heroCenterGrad)" filter="url(#heroNodeGlow)">
            <animate attributeName="r" values="42;46;42" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <text x="420" y="194" textAnchor="middle" fill="#0c1426" fontFamily="Georgia, serif" fontSize="20" fontWeight="500" fontStyle="italic">Cyber</text>
          <text x="420" y="214" textAnchor="middle" fill="#0c1426" fontFamily="Georgia, serif" fontSize="20" fontWeight="500" fontStyle="italic">Piezas</text>
        </g>

        {/* Moving particles */}
        <circle r="3" fill="#3b82f6" filter="url(#heroNodeGlow)" opacity="0.9">
          <animateMotion dur="4s" repeatCount="indefinite" path="M420 200 L160 130" />
        </circle>
        <circle r="3" fill="#f97316" filter="url(#heroNodeGlow)" opacity="0.9">
          <animateMotion dur="5s" repeatCount="indefinite" path="M420 200 L680 130" />
        </circle>
        <circle r="3" fill="#14b8a6" filter="url(#heroNodeGlow)" opacity="0.9">
          <animateMotion dur="4.5s" repeatCount="indefinite" path="M420 200 L420 340" />
        </circle>
        <circle r="2.5" fill="rgba(212,163,115,0.6)" opacity="0.7">
          <animateMotion dur="7s" repeatCount="indefinite" path="M160 130 Q420 50 680 130" />
        </circle>
      </svg>
    </div>
  );
}

// ============================================================================
// WHAT IS THIS — Ni banco, ni red social, ni gobierno
// ============================================================================

function WhatIsThis() {
  return (
    <section className="bg-gradient-to-b from-white to-amber-50/30 py-16 sm:py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-amber-500">01</span>
            <span className="w-6 h-px bg-amber-400" />
            <span>¿Qué es CyberPiezas?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Ni banco, ni red social, ni gobierno.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent italic font-medium">
              Algo más cercano.
            </span>
          </h2>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Somos la infraestructura digital donde se administran tres tipos de confianza local. Cada uno con su propia casa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* POS — Confianza económica */}
          <div className="group bg-white rounded-3xl p-7 border border-slate-200/60 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Tipo de confianza</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">Económica</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Para tu negocio. Cobrar, operar, crecer. Veterinarias, boutiques, abarrotes y más.
            </p>
            <div className="h-16 rounded-xl bg-teal-50 overflow-hidden">
              <svg viewBox="0 0 280 64" className="w-full h-full">
                <g>
                  <rect x="20" y="38" width="18" height="20" rx="3" fill="#14b8a6" opacity="0.3" />
                  <rect x="48" y="30" width="18" height="28" rx="3" fill="#14b8a6" opacity="0.5" />
                  <rect x="76" y="22" width="18" height="36" rx="3" fill="#14b8a6" opacity="0.65" />
                  <rect x="104" y="16" width="18" height="42" rx="3" fill="#14b8a6" opacity="0.8" />
                  <rect x="132" y="10" width="18" height="48" rx="3" fill="#14b8a6" />
                  <rect x="160" y="18" width="18" height="40" rx="3" fill="#14b8a6" opacity="0.8" />
                  <rect x="188" y="12" width="18" height="46" rx="3" fill="#14b8a6" />
                  <rect x="216" y="6" width="18" height="52" rx="3" fill="#14b8a6" />
                  <circle cx="225" cy="6" r="3" fill="#14b8a6">
                    <animate attributeName="cy" values="6;2;6" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              </svg>
            </div>
          </div>

          {/* Mobility — Confianza física y social */}
          <div className="group bg-white rounded-3xl p-7 border border-slate-200/60 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Tipo de confianza</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">Física y social</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Mobility, viajes compartidos. Subirte al coche de alguien requiere confianza real, no solo precio.
            </p>
            <div className="h-16 rounded-xl bg-blue-50 overflow-hidden">
              <svg viewBox="0 0 280 64" className="w-full h-full">
                <defs>
                  <linearGradient id="cardRoadMob" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path d="M30 45 Q90 18 140 30 T250 22" stroke="url(#cardRoadMob)" strokeWidth="2.5" fill="none" strokeDasharray="5 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                </path>
                <circle cx="30" cy="45" r="4.5" fill="#3b82f6" />
                <circle cx="140" cy="30" r="4.5" fill="#3b82f6" />
                <circle cx="250" cy="22" r="4.5" fill="#3b82f6" />
                <circle r="3" fill="#3b82f6">
                  <animateMotion dur="4s" repeatCount="indefinite" path="M30 45 Q90 18 140 30 T250 22" />
                </circle>
              </svg>
            </div>
          </div>

          {/* Celine — Confianza entre personas */}
          <div className="group bg-white rounded-3xl p-7 border border-slate-200/60 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform">
              <Shuffle className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Tipo de confianza</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">Entre personas</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Celine, ofertas y trueques locales. Le vendes a tu vecino, no a un desconocido del otro lado del país.
            </p>
            <div className="h-16 rounded-xl bg-orange-50 overflow-hidden">
              <svg viewBox="0 0 280 64" className="w-full h-full">
                <g>
                  <circle cx="80" cy="32" r="16" fill="#fff" stroke="#fb923c" strokeWidth="1.5" />
                  <text x="80" y="38" textAnchor="middle" fontSize="16">📦</text>
                  <circle cx="200" cy="32" r="16" fill="#fff" stroke="#fb923c" strokeWidth="1.5" />
                  <text x="200" y="38" textAnchor="middle" fontSize="16">🌱</text>
                  <path d="M101 22 Q140 4 175 22" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="5 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                  </path>
                  <polyline points="167,16 175,22 170,28" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M179 42 Q140 60 105 42" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="5 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" begin="-0.8s" />
                  </path>
                  <polyline points="113,48 105,42 110,36" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HOUSES — Todo bajo el mismo techo
// ============================================================================

function Houses({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <section id="casas" className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-slate-400">02</span>
            <span className="w-6 h-px bg-slate-300" />
            <span>El edificio</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Todo bajo el{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent italic font-medium">
              mismo techo.
            </span>
          </h2>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Cada producto es completo y tiene su propia app. Pero todos comparten quién eres y la confianza que has construido. Iremos agregando más con el tiempo.
          </p>
        </div>

        {/* Two top houses: Mobility + Celine */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
          {/* MOBILITY */}
          <a
            href="#mobility"
            id="mobility"
            className="group relative bg-gradient-to-br from-blue-50 via-white to-white rounded-3xl p-7 sm:p-9 border border-blue-100 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-1 transition-all overflow-hidden min-h-[360px] flex flex-col"
          >
            <span className="absolute top-5 right-5 w-9 h-9 rounded-full bg-blue-100 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-blue-700" />
            </span>

            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900">Mobility</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Próximamente
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Viajes compartidos en Morelos</p>
              </div>
            </div>

            <p className="text-slate-600 mb-5 leading-relaxed text-sm">
              Conecta con personas que ya recorren tu mismo camino. Como BlaBlaCar, pero hecho en casa y con confianza local.
            </p>

            {/* Mini map visualization */}
            <div className="flex-1 rounded-xl bg-white/60 backdrop-blur border border-blue-100/60 p-4 mb-4 min-h-[120px]">
              <svg viewBox="0 0 500 140" className="w-full h-full">
                <defs>
                  <linearGradient id="mobHouseRoad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <g stroke="rgba(59,130,246,0.06)" strokeWidth="1">
                  <path d="M0 35 L500 35" />
                  <path d="M0 70 L500 70" />
                  <path d="M0 105 L500 105" />
                </g>
                <path d="M60 110 Q180 60 250 80 T440 40" stroke="url(#mobHouseRoad)" strokeWidth="2.5" fill="none" strokeDasharray="5 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                </path>
                <g>
                  <circle cx="60" cy="110" r="6" fill="#3b82f6" />
                  <circle cx="60" cy="110" r="2.5" fill="#fff" />
                </g>
                <g>
                  <circle cx="250" cy="80" r="6" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="250" cy="80" r="8" fill="#3b82f6" />
                  <circle cx="250" cy="80" r="3" fill="#fff" />
                </g>
                <g>
                  <circle cx="440" cy="40" r="6" fill="#3b82f6" />
                  <circle cx="440" cy="40" r="2.5" fill="#fff" />
                </g>
                <circle r="4" fill="#3b82f6">
                  <animateMotion dur="5s" repeatCount="indefinite" path="M60 110 Q180 60 250 80 T440 40" />
                </circle>
              </svg>
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-blue-100">
              <div className="flex gap-6">
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900">Piloto</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cerrado</p>
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900">2026</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lanzamiento</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 group-hover:gap-2.5 transition-all">
                Lista de espera <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>

          {/* CELINE */}
          <a
            href="#celine"
            id="celine"
            className="group relative bg-gradient-to-br from-orange-50 via-white to-white rounded-3xl p-7 sm:p-9 border border-orange-100 hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-500/15 hover:-translate-y-1 transition-all overflow-hidden min-h-[360px] flex flex-col"
          >
            <span className="absolute top-5 right-5 w-9 h-9 rounded-full bg-orange-100 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-orange-700" />
            </span>

            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                <Shuffle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900">Celine</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Próximamente
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Ofertas y trueques locales</p>
              </div>
            </div>

            <p className="text-slate-600 mb-5 leading-relaxed text-sm">
              Plataforma abierta donde vecinos venden, regalan o truequean. Sin cuotas. Con un módulo especial para productores rurales.
            </p>

            {/* Mini trade visualization */}
            <div className="flex-1 rounded-xl bg-white/60 backdrop-blur border border-orange-100/60 p-4 mb-4 min-h-[120px]">
              <svg viewBox="0 0 500 140" className="w-full h-full">
                <g fill="rgba(249,115,22,0.10)">
                  <circle cx="40" cy="25" r="2" />
                  <circle cx="450" cy="25" r="2" />
                  <circle cx="40" cy="115" r="2" />
                  <circle cx="450" cy="115" r="2" />
                </g>
                <g transform="translate(120 70)">
                  <circle r="36" fill="#fff" stroke="#fb923c" strokeWidth="1.5" />
                  <text y="8" textAnchor="middle" fontSize="32">📚</text>
                  <text y="56" textAnchor="middle" fill="#9a3412" fontFamily="system-ui" fontSize="10" fontWeight="600">Vendedor</text>
                </g>
                <g transform="translate(380 70)">
                  <circle r="36" fill="#fff" stroke="#fb923c" strokeWidth="1.5" />
                  <text y="8" textAnchor="middle" fontSize="32">🌽</text>
                  <text y="56" textAnchor="middle" fill="#9a3412" fontFamily="system-ui" fontSize="10" fontWeight="600">Comprador</text>
                </g>
                <g stroke="#fb923c" strokeWidth="2" fill="none" strokeLinecap="round">
                  <path d="M165 50 Q250 25 335 50" strokeDasharray="5 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                  </path>
                  <polyline points="325,42 335,50 328,58" />
                  <path d="M335 90 Q250 115 165 90" strokeDasharray="5 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" begin="-0.8s" />
                  </path>
                  <polyline points="175,98 165,90 172,82" />
                </g>
                <g transform="translate(250 70)">
                  <rect x="-30" y="-12" width="60" height="24" rx="12" fill="#fff" stroke="#fb923c" strokeWidth="1.5" />
                  <text y="5" textAnchor="middle" fill="#9a3412" fontFamily="system-ui" fontSize="10" fontWeight="700">TRATO</text>
                </g>
              </svg>
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-orange-100">
              <div className="flex gap-6">
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900">Abierta</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sin cuotas</p>
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900">Q3 '26</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lanzamiento</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-700 group-hover:gap-2.5 transition-all">
                Conocer <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>
        </div>

        {/* POS — wide */}
        <a
          href="#sistemas"
          className="group relative block bg-gradient-to-br from-teal-50 via-white to-white rounded-3xl p-7 sm:p-9 border border-teal-100 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/15 hover:-translate-y-1 transition-all overflow-hidden"
        >
          <span className="absolute top-5 right-5 w-9 h-9 rounded-full bg-teal-100 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-teal-700" />
          </span>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5 sm:mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-3xl font-bold tracking-tight text-slate-900">Punto de venta</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Activo · 5 giros
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Una casa con varios cuartos · uno por giro</p>
            </div>
          </div>

          <p className="text-slate-600 mb-6 leading-relaxed text-sm max-w-3xl">
            El POS donde empezó CyberPiezas. Cada giro vive en su propio cuarto, hecho a la medida. Cobrar, operar, crecer — sin funciones que no usas.
          </p>

          {/* Rooms grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
            {[
              { emoji: "🐾", name: "Veterinaria" },
              { emoji: "👗", name: "Boutique" },
              { emoji: "🥬", name: "Verdulería" },
              { emoji: "🛒", name: "Abarrotes" },
              { emoji: "🎤", name: "Tarima" },
            ].map((room) => (
              <div
                key={room.name}
                className="bg-white/80 backdrop-blur border border-slate-200/60 rounded-2xl p-3 text-center cursor-pointer hover:bg-white hover:border-teal-200 hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-1 transition-transform group-hover:scale-110">{room.emoji}</div>
                <p className="text-xs font-bold text-slate-800">{room.name}</p>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between pt-5 border-t border-teal-100">
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900">5</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cuartos</p>
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900">Desde $150</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Por mes</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-xl font-bold tracking-tight text-slate-900">∞</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sin contratos</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 group-hover:gap-2.5 transition-all">
              Ver los cuartos <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}

// ============================================================================
// INDUSTRIES — Los cuartos de la casa POS
// ============================================================================

function Industries({ setLocation }: { setLocation: (p: string) => void }) {
  return (
    <section id="sistemas" className="bg-slate-50 py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-teal-400">03</span>
            <span className="w-6 h-px bg-teal-300" />
            <span>Dentro de la casa POS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Construido para
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
              tu industria.
            </span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Cada cuarto del POS está hecho a la medida del giro. Sin funciones que no usas, sin pagar por lo que no necesitas.
          </p>
        </div>

        {/* Vet featured */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 rounded-3xl border border-emerald-100/60 overflow-hidden mb-5 sm:mb-6 shadow-xl shadow-emerald-500/5">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 p-6 sm:p-10 lg:p-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full mb-4 sm:mb-5 uppercase tracking-[0.2em]">
                <Stethoscope className="w-3 h-3" /> Premium · $999/mes
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-slate-900 mb-3 sm:mb-4 leading-[1.0]">
                POS Veterinaria
              </h3>
              <p className="text-base sm:text-lg text-slate-600 mb-5 sm:mb-6 leading-relaxed">
                Expediente clinico, agenda de citas, inventario y punto de venta. Todo en uno.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 mb-6 sm:mb-7">
                {["Expediente clinico", "Agenda de citas", "Catalogo servicios", "Recibos con tu marca"].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setLocation("/veterinaria-pos")}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-full h-12 px-6 font-semibold text-sm hover:-translate-y-0.5 transition-all"
              >
                Conocer Veterinaria <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
            <div className="order-first lg:order-last h-44 sm:h-64 lg:h-80 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-2xl sm:rounded-3xl flex items-center justify-center text-6xl sm:text-8xl lg:text-9xl">🐾</div>
          </div>
        </div>

        {/* 4 secundarios */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8 sm:mb-12">
          {[
            { name: "Boutique", desc: "Variantes y multi-sucursal", icon: "👗", gradient: "from-purple-50 to-pink-50", path: "/dashboard" },
            { name: "Verduleria", desc: "Frutas y verduras al granel", icon: "🥬", gradient: "from-green-50 to-emerald-50", path: "/verduleria" },
            { name: "Abarrotes", desc: "Codigo barras y bascula", icon: "🛒", gradient: "from-amber-50 to-orange-50", path: "/abarrotes-pos" },
            { name: "Tarima", desc: "Perfil para artistas", icon: "🎤", gradient: "from-fuchsia-50 to-purple-50", path: "/mi-tarima" },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setLocation(item.path)}
              className={"group text-left bg-gradient-to-br " + item.gradient + " rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/60 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 active:scale-[0.98] transition-all"}
            >
              <div className="text-3xl sm:text-5xl mb-3 sm:mb-4">{item.icon}</div>
              <h3 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 mb-1">{item.name}</h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-3 sm:mb-4">{item.desc}</p>
              <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-900">
                Ver detalles
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Proximamente */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/60">
          <div className="text-center mb-5 sm:mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 sm:mb-3">Proximamente</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Mas cuartos en camino
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "Cafeteria", icon: "☕" },
              { name: "Restaurante", icon: "🍽️" },
              { name: "Refaccionaria", icon: "🔧" },
              { name: "Panaderia", icon: "🥖" },
            ].map((p) => (
              <div key={p.name} className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/40 text-center">
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">{p.icon}</div>
                <p className="text-xs font-bold text-slate-700">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TRUST LAYER — Cómo se construye la confianza
// ============================================================================

function TrustLayer() {
  const steps = [
    {
      num: "01",
      title: "Te conocemos",
      desc: "Empiezas con tu correo. Si quieres, verificas teléfono. Después INE. Cada paso es opcional y te abre nuevas puertas.",
      visual: "verifications",
    },
    {
      num: "02",
      title: "Participas",
      desc: "Compartes un viaje en Mobility, vendes algo en Celine, abres tu negocio con POS. Cada actividad deja huella.",
      visual: "activity",
    },
    {
      num: "03",
      title: "Tu comunidad respalda",
      desc: "Personas reales con las que has interactuado escriben sobre ti. Sin estrellas, sin números. Solo lo que pasó.",
      visual: "people",
    },
    {
      num: "04",
      title: "Te acompaña",
      desc: "Tu identidad vive en una sola cuenta. Tu reputación se interpreta según cada casa — buena en una no significa lo mismo en otra.",
      visual: "quote",
    },
  ];

  return (
    <section id="confianza" className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-amber-500">04</span>
            <span className="w-6 h-px bg-amber-400" />
            <span>Cómo se construye la confianza</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            No es un score.
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent italic font-medium">
              Son personas describiendo a personas.
            </span>
          </h2>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            La confianza en CyberPiezas se gana con tiempo, comunidad y memoria social — no con un algoritmo opaco.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => (
            <div
              key={step.num}
              className="bg-white rounded-3xl p-7 border border-slate-200/60 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <p className="font-serif italic text-amber-600 text-sm mb-4">{step.num} ·</p>
              <h4 className="text-xl font-bold tracking-tight text-slate-900 mb-2">{step.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{step.desc}</p>
              <div className="h-20 rounded-xl bg-slate-50 grid place-items-center overflow-hidden">
                {step.visual === "verifications" && (
                  <div className="flex gap-1.5 justify-center px-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-7 h-7 bg-emerald-500 rounded-full grid place-items-center shadow-md shadow-emerald-200"
                        style={{
                          animation: `popIn 0.5s ease ${i * 0.15}s forwards`,
                          opacity: 0,
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    ))}
                  </div>
                )}
                {step.visual === "activity" && (
                  <svg viewBox="0 0 240 70" className="w-full h-full">
                    <path d="M30 50 Q90 18 150 32 T220 28" stroke="rgba(212,163,115,0.4)" strokeWidth="1.5" fill="none" strokeDasharray="5 3">
                      <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                    </path>
                    <circle cx="30" cy="50" r="5" fill="#3b82f6" />
                    <circle cx="120" cy="36" r="5" fill="#f97316" />
                    <circle cx="220" cy="28" r="5" fill="#14b8a6" />
                    <circle r="3" fill="#d4a373">
                      <animateMotion dur="3.5s" repeatCount="indefinite" path="M30 50 Q90 18 150 32 T220 28" />
                    </circle>
                  </svg>
                )}
                {step.visual === "people" && (
                  <div className="flex">
                    {[
                      { bg: "linear-gradient(135deg, #ff8a4f, #ff5c8e)", text: "AG" },
                      { bg: "linear-gradient(135deg, #4f8cff, #6c5cff)", text: "CM" },
                      { bg: "linear-gradient(135deg, #4fc3ff, #4f8cff)", text: "LH" },
                      { bg: "linear-gradient(135deg, #b97cff, #8a4cdb)", text: "SR" },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-full border-[3px] border-slate-50 grid place-items-center text-white text-[10px] font-bold"
                        style={{ background: p.bg, marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}
                      >
                        {p.text}
                      </div>
                    ))}
                    <div className="w-9 h-9 rounded-full border-[3px] border-slate-50 bg-slate-100 grid place-items-center text-[10px] font-bold text-slate-500" style={{ marginLeft: -10 }}>+8</div>
                  </div>
                )}
                {step.visual === "quote" && (
                  <p className="font-serif italic text-sm text-slate-700 px-4 text-center leading-snug">
                    "Llega puntual y la conversación se vuelve amena."
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }`}</style>
    </section>
  );
}

// ============================================================================
// COMMUNITIES — Sectores
// ============================================================================

function Communities() {
  const sectors = [
    { emoji: "🎓", name: "Estudiantes", desc: "Universitarios y de prepa. Rutas compartidas, libros usados, tutorías." },
    { emoji: "💜", name: "Mujeres", desc: "Comunidad verificada con modo discreto activado por default. Privacidad extra fuerte." },
    { emoji: "🌽", name: "Productores", desc: "Campesinos, ganaderos y artesanos de Morelos. Comercio directo, sin coyotes en medio." },
    { emoji: "🏘️", name: "Vecinos", desc: "Personas que comparten colonia. Trueques, ofertas y recomendaciones entre quienes ya se conocen." },
    { emoji: "🏢", name: "Negocios locales", desc: "Comercios independientes de Morelos. Validados, recomendados, conectados entre sí." },
    { emoji: "🎵", name: "Músicos y artistas", desc: "Para agrupaciones, solistas y eventos. Donde la tarima encuentra al público." },
    { emoji: "🌄", name: "Turismo", desc: "Anfitriones, guías y comunidad receptora. Movilidad y descubrimiento responsable." },
  ];

  return (
    <section id="comunidades" className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-rose-400">05</span>
            <span className="w-6 h-px bg-rose-300" />
            <span>Comunidades reales</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Aquí no eres{" "}
            <span className="font-serif italic text-slate-400 font-medium">un usuario más.</span>
            <br />
            Eres parte de algo.
          </h2>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Las comunidades son el corazón de CyberPiezas. Tienen reglas propias, moderadores reales y un punto seguro físico donde encontrarse.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {sectors.map((s) => (
            <div
              key={s.name}
              className="group relative bg-white rounded-2xl p-6 border border-slate-200/60 hover:border-amber-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
              <span className="absolute top-4 right-4 text-slate-400 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all text-base">↗</span>
              <div className="text-3xl mb-4">{s.emoji}</div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-2">{s.name}</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{s.desc}</p>
              <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300" />
                Próximamente
              </p>
            </div>
          ))}

          {/* Slot abierto */}
          <div className="relative bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-300 hover:border-slate-400 transition-all cursor-pointer group">
            <div className="text-3xl mb-4 text-slate-400">＋</div>
            <h3 className="text-lg font-bold tracking-tight text-slate-700 mb-2">¿Falta la tuya?</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              Si tu sector tiene 30+ personas dispuestas a participar, te ayudamos a crearla.
            </p>
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
              Proponer <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WHY DIFFERENT — Por qué somos distintos
// ============================================================================

function WhyDifferent() {
  const reasons = [
    {
      num: "i.",
      title: "Tu reputación no es un número.",
      desc: 'No hay "8.7/10 puntos de confianza". Hay personas reales describiendo lo que pasó contigo. La confianza se gana con hechos, no con algoritmos.',
    },
    {
      num: "ii.",
      title: "Tus datos no son nuestro negocio.",
      desc: "No vendemos información. No mostramos publicidad. No rastreamos tus hábitos. Lo que ganamos viene de quienes usan nuestro POS, no de quienes confían en nosotros con sus rutas o intercambios.",
    },
    {
      num: "iii.",
      title: "Crecemos lento. A propósito.",
      desc: "Mobility empieza con un piloto cerrado. Celine arranca con comunidades pequeñas. Densidad antes que escala. Si las primeras 100 personas no se sienten seguras, no vale la pena tener 10,000.",
    },
    {
      num: "iv.",
      title: "Soporte humano, no chatbots.",
      desc: "Cuando algo no sale bien, te responde una persona — no un bot. En español. Por WhatsApp. Soporte humano, rápido y cercano. Porque en México, soporte = confianza.",
    },
    {
      num: "v.",
      title: "Hecho en casa.",
      desc: "El código se escribe en Morelos. Los datos viven en servidores que cumplen LFPDPPP. Los problemas los resuelve gente que conoce el contexto local. No somos Silicon Valley vestido de mexicano.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-teal-50/30 to-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-slate-400">06</span>
            <span className="w-6 h-px bg-slate-300" />
            <span>Por qué somos distintos</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 leading-[1.05] sm:leading-[1.0]">
            Profundidad local,
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent italic font-medium">
              no escala artificial.
            </span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            No queremos ser la próxima startup unicornio. Queremos ser la red en la que tu comunidad confía dentro de 10 años.
          </p>
        </div>

        <div className="space-y-0">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_1fr] sm:grid-cols-[64px_1fr] gap-4 sm:gap-7 py-7 sm:py-8 border-b border-slate-200 last:border-b-0"
            >
              <span className="font-serif italic text-amber-600 text-3xl sm:text-4xl leading-none">{r.num}</span>
              <div>
                <h4 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 mb-2 leading-snug">{r.title}</h4>
                <p className="text-[14px] sm:text-base text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HARDWARE
// ============================================================================

function Hardware() {
  const products = [
    { icon: Package, gradient: "from-blue-500 to-cyan-500", title: "Kit POS Completo", price: "Desde $7,499", desc: "Tablet + impresora + cajon + lector. Listo para vender.", tag: "MAS VENDIDO", tagColor: "bg-emerald-500" },
    { icon: Camera, gradient: "from-rose-500 to-pink-500", title: "Camaras Seguridad", price: "Desde $2,999", desc: "Camaras IP con visor remoto desde el celular.", tag: "POPULAR", tagColor: "bg-purple-500" },
    { icon: Cpu, gradient: "from-purple-500 to-indigo-500", title: "Piezas Computadora", price: "Cotizacion", desc: "Memorias, discos, fuentes, tarjetas.", tag: null, tagColor: "" },
    { icon: Monitor, gradient: "from-amber-500 to-orange-500", title: "Monitores", price: "Desde $3,499", desc: "Pantallas touch para POS y secundarias.", tag: null, tagColor: "" },
    { icon: HardDrive, gradient: "from-emerald-500 to-teal-500", title: "Backup y Storage", price: "Cotizacion", desc: "NAS, discos, soluciones de respaldo.", tag: null, tagColor: "" },
    { icon: Wifi, gradient: "from-cyan-500 to-blue-500", title: "Redes y WiFi", price: "Cotizacion", desc: "Routers, repetidores, instalacion.", tag: null, tagColor: "" },
  ];

  const handleCotizar = (n: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Cotizacion: " + n);
    const body = encodeURIComponent("Hola, me interesa cotizar: " + n + "\n\nMi nombre: \nNegocio: \nUbicacion: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="hardware" className="bg-slate-50 py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-blue-400">07</span>
            <span className="w-6 h-px bg-blue-300" />
            <span>Tienda</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0] mb-4 sm:mb-5">
            Equipo y hardware.
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-xl mx-auto font-light px-2">
            Mas que un sistema. Te equipamos completo.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {products.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all relative">
                {p.tag && (
                  <div className={"absolute -top-2.5 right-4 sm:right-5 px-2.5 py-1 text-white text-[10px] font-bold rounded-full shadow-lg " + p.tagColor}>{p.tag}</div>
                )}
                <div className={"w-11 h-11 rounded-xl bg-gradient-to-br " + p.gradient + " flex items-center justify-center shadow-lg mb-3"}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5">{p.title}</h3>
                <p className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">{p.price}</p>
                <p className="text-slate-600 text-sm mb-4">{p.desc}</p>
                <button onClick={() => handleCotizar(p.title)} className="w-full text-sm font-bold text-slate-900 hover:text-emerald-600 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.98] transition-all">
                  Cotizar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SERVICES
// ============================================================================

function Services() {
  const services = [
    { icon: Wrench, title: "Instalacion", price: "$1,500", desc: "Te instalamos todo en sitio", gradient: "from-emerald-500 to-cyan-500" },
    { icon: GraduationCap, title: "Capacitacion", price: "$500", desc: "1 hora 1:1 con tu equipo", gradient: "from-purple-500 to-pink-500" },
    { icon: Truck, title: "Migracion", price: "Desde $1,000", desc: "Migramos tu inventario de Aspel/Excel", gradient: "from-amber-500 to-orange-500" },
    { icon: MessageCircle, title: "Soporte WhatsApp", price: "$299/mes", desc: "Atención humana, rapida y cercana", gradient: "from-rose-500 to-red-500" },
  ];

  const handleContratar = (s: string) => {
    const subject = encodeURIComponent("[CyberPiezas] Servicio: " + s);
    const body = encodeURIComponent("Hola, me interesa contratar: " + s + "\n\nMi nombre: \nNegocio: \n");
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section id="servicios" className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-emerald-400">08</span>
            <span className="w-6 h-px bg-emerald-300" />
            <span>Servicios profesionales</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Te acompanamos
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>en cada paso.
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className={"w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br " + s.gradient + " flex items-center justify-center shadow-md mb-3"}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{s.title}</h3>
                <p className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-1">{s.price}</p>
                <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">{s.desc}</p>
                <button onClick={() => handleContratar(s.title)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Contratar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES
// ============================================================================

function Features() {
  const features = [
    { icon: Wifi, title: "Funciona sin internet", desc: "Sigue vendiendo aunque se caiga la red." },
    { icon: Cloud, title: "100% en la nube", desc: "Accede desde cualquier dispositivo." },
    { icon: LineChart, title: "Reportes en tiempo real", desc: "Decisiones con datos al instante." },
    { icon: ShieldCheck, title: "Datos protegidos", desc: "Backups automaticos siempre." },
    { icon: MessageCircle, title: "Soporte WhatsApp", desc: "Atencion rapida sin tickets eternos." },
    { icon: CreditCard, title: "Sin contratos", desc: "Pagas mes a mes, cancela cuando quieras." },
  ];
  return (
    <section className="bg-slate-50 py-16 sm:py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-amber-400">09</span>
            <span className="w-6 h-px bg-amber-300" />
            <span>Lo esencial</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0]">
            Todo lo que necesitas,
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="text-slate-400">sin lo que estorba.</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/60 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all flex items-start gap-3 sm:gap-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// REFERRALS
// ============================================================================

function Referrals({ isAuthenticated, user, setLocation }: { isAuthenticated: boolean; user: any; setLocation: (p: string) => void }) {
  const [copied, setCopied] = useState(false);

  const getReferralCode = () => {
    if (!user) return null;
    const seed = user.id || user.email || "guest";
    const hash = String(seed).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const code = (hash * 7919).toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
    return "CYB-" + code;
  };

  const referralCode = getReferralCode();
  const referralLink = referralCode
    ? "https://cyberpiezas-production.up.railway.app/cyberpiezas?ref=" + referralCode
    : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    if (!referralLink) return;
    const message = encodeURIComponent(
      "¡Hola! Te recomiendo CyberPiezas — sistemas POS para boutique, veterinaria y abarrotes. Si te suscribes con mi link, ambos recibimos 1 mes GRATIS:\n\n" + referralLink
    );
    window.open("https://wa.me/?text=" + message, "_blank");
  };

  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-16 sm:py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl sm:rounded-[2rem] p-7 sm:p-10 lg:p-16 border border-emerald-100 shadow-2xl shadow-emerald-500/5 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 sm:-top-32 sm:-right-32 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 sm:-bottom-32 sm:-left-32 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-200/30 rounded-full blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
              <span className="text-emerald-400">11</span>
              <span className="w-6 h-px bg-emerald-300" />
              <span className="flex items-center gap-1.5"><Gift className="w-3 h-3" /> Programa de referidos</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 mb-4 sm:mb-5 leading-[1.05] sm:leading-[1.0]">
              Trae a un amigo,
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                ganen ambos.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto mb-7 sm:mb-10 font-light px-2">
              Por cada amigo que se suscriba con tu codigo, ambos reciben{" "}
              <strong className="text-slate-900 font-bold">1 mes GRATIS</strong>.
            </p>

            {isAuthenticated && referralCode ? (
              <div className="max-w-md mx-auto">
                <p className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  TU CODIGO DE REFERIDO
                </p>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-5 mb-4 shadow-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-wider font-mono">
                    {referralCode}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 text-left">Tu link único:</p>
                  <p className="text-xs text-slate-700 break-all text-left font-mono">
                    {referralLink}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleCopy}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1.5" /> Copiar link
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleWhatsApp}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-11 font-semibold"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Comparte tu link. Cuando alguien se suscriba, recibes 1 mes gratis automáticamente.
                </p>
              </div>
            ) : (
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full h-11 px-7 text-base font-bold shadow-xl shadow-emerald-500/30"
              >
                <Gift className="w-4 h-4 mr-1.5" />
                Empezar y obtener mi código
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================

function Pricing({ setLocation, isAuthenticated }: { setLocation: (p: string) => void; isAuthenticated: boolean }) {
  const systems = [
    {
      code: "boutique",
      name: "Boutique",
      icon: "👗",
      price: 300,
      yearly: 3000,
      desc: "POS para tiendas de ropa, accesorios y moda.",
      features: ["Productos ilimitados", "Variantes (talla/color)", "Múltiples sucursales", "Reportes en tiempo real", "Soporte WhatsApp"],
      gradient: "from-rose-500 to-pink-600",
      accent: "rose",
    },
    {
      code: "abarrotes",
      name: "Abarrotes",
      icon: "🛒",
      price: 300,
      yearly: 3000,
      desc: "POS para tienditas, misceláneas y minisúpers.",
      features: ["Códigos de barras", "Inventario ilimitado", "Ventas con fiado", "Reportes diarios", "Soporte WhatsApp"],
      gradient: "from-amber-500 to-orange-600",
      accent: "amber",
    },
    {
      code: "veterinaria",
      name: "Veterinaria",
      icon: "🐾",
      price: 300,
      yearly: 3000,
      desc: "POS para clínicas veterinarias completas.",
      features: ["Expediente de mascotas", "Citas y vacunación", "Productos + servicios", "Recibos profesionales", "Soporte WhatsApp"],
      gradient: "from-emerald-500 to-teal-600",
      accent: "emerald",
    },
    {
      code: "verduleria",
      name: "Verdulería",
      icon: "🥕",
      price: 300,
      yearly: 3000,
      desc: "POS para frutas, verduras y mercados.",
      features: ["Catálogo visual", "Venta por peso", "Stock perecedero", "Ventas rápidas", "Soporte WhatsApp"],
      gradient: "from-green-500 to-emerald-600",
      accent: "green",
    },
    {
      code: "tarima",
      name: "Tarima",
      icon: "🎤",
      price: 150,
      yearly: 1500,
      desc: "Plataforma para artistas, músicos y bandas.",
      features: ["Perfil público con tu URL", "Galería de fotos y videos", "Música de Spotify", "Reservaciones online", "Soporte WhatsApp"],
      gradient: "from-fuchsia-500 to-purple-600",
      accent: "fuchsia",
      featured: true,
    },
  ];

  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="precios" className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 sm:mb-6">
            <span className="text-rose-400">12</span>
            <span className="w-6 h-px bg-rose-300" />
            <span>Un precio por sistema</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0] mb-4 sm:mb-5">
            Solo paga por lo que usas.
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 font-light px-2 mb-2">
            Una suscripción por cada sistema que necesites.
          </p>
          <p className="text-sm sm:text-base text-slate-500 px-2">
            Sin contratos largos. Cancela cuando quieras.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-md">
            <button
              onClick={() => setBillingType("monthly")}
              className={
                "px-5 py-2 rounded-full text-sm font-semibold transition-all " +
                (billingType === "monthly"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingType("yearly")}
              className={
                "px-5 py-2 rounded-full text-sm font-semibold transition-all relative " +
                (billingType === "yearly"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                AHORRA
              </span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {systems.map((sys) => {
            const isPremium = sys.featured;
            const price = billingType === "monthly" ? sys.price : sys.yearly;
            const period = billingType === "monthly" ? "/mes" : "/año";
            return (
              <div
                key={sys.code}
                className={
                  isPremium
                    ? "bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl shadow-slate-900/30 relative md:scale-[1.02] sm:col-span-2 lg:col-span-1 ring-2 ring-fuchsia-500/30"
                    : "bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all"
                }
              >
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                    NUEVO
                  </div>
                )}
                <div
                  className={
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 " +
                    (isPremium
                      ? "bg-white/10 ring-2 ring-fuchsia-400/40"
                      : `bg-gradient-to-br ${sys.gradient}/10`)
                  }
                >
                  {sys.icon}
                </div>
                <h3
                  className={
                    "text-xl font-bold mb-1 tracking-tight " +
                    (isPremium ? "text-white" : "text-slate-900")
                  }
                >
                  {sys.name}
                </h3>
                <p
                  className={
                    "text-sm mb-5 " + (isPremium ? "text-slate-400" : "text-slate-600")
                  }
                >
                  {sys.desc}
                </p>
                <div className="mb-5">
                  <span
                    className={
                      "text-4xl font-bold tracking-tight " +
                      (isPremium ? "text-white" : "text-slate-900")
                    }
                  >
                    ${price.toLocaleString("es-MX")}
                  </span>
                  <span
                    className={
                      "text-sm ml-1 " + (isPremium ? "text-slate-400" : "text-slate-500")
                    }
                  >
                    {period}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    if (isAuthenticated) {
                      setLocation("/pricing");
                    } else {
                      window.location.href = getLoginUrl();
                    }
                  }}
                  className={
                    isPremium
                      ? "w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-full h-10 font-semibold mb-5 text-sm shadow-lg"
                      : "w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 font-semibold mb-5 text-sm"
                  }
                >
                  {isAuthenticated ? "Suscribirme" : "Empezar ahora"}
                </Button>
                <ul className="space-y-2">
                  {sys.features.map((f, i) => (
                    <li
                      key={i}
                      className={
                        "flex items-start gap-2 text-sm " +
                        (isPremium ? "text-slate-200" : "text-slate-700")
                      }
                    >
                      <Check
                        className={
                          "w-4 h-4 flex-shrink-0 mt-0.5 " +
                          (isPremium ? "text-fuchsia-400" : "text-emerald-500")
                        }
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-600 mb-4">
            ¿Necesitas varios sistemas? Suscríbete a cada uno por separado.
          </p>
          <button
            onClick={() => setLocation("/pricing")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:gap-3 transition-all"
          >
            Ver todos los planes con detalle
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function FinalCTA({ setLocation, isAuthenticated, onSupport, onCollab }: { setLocation: (p: string) => void; isAuthenticated: boolean; onSupport: () => void; onCollab: () => void }) {
  return (
    <section className="bg-slate-50 py-16 sm:py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-20 lg:mb-24">
          <div className="text-2xl sm:text-3xl mb-4 sm:mb-5 tracking-[0.5em]">⭐⭐⭐⭐⭐</div>
          <blockquote className="text-lg sm:text-3xl lg:text-4xl font-light text-slate-900 leading-relaxed tracking-tight max-w-3xl mx-auto mb-5 sm:mb-6 italic px-2">
            "Antes anotaba todo en libreta. Ahora controlo mi negocio desde el celular. Cambio mi vida."
          </blockquote>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 uppercase tracking-[0.2em]">
            <span className="font-bold text-slate-700">Maria G.</span>
            <span>·</span>
            <span>Boutique Mariangel, Cuernavaca</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -top-20 -right-20 sm:-top-32 sm:-right-32 w-64 h-64 sm:w-96 sm:h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 sm:-bottom-32 sm:-left-32 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-300 mx-auto mb-4 sm:mb-6" />
            <h2 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-white max-w-3xl mx-auto leading-[1.05] sm:leading-[1.0] mb-4 sm:mb-6">
              ¿Listo para hacer
              <br />
              crecer tu negocio?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-xl mx-auto mb-7 sm:mb-10 font-light px-2">Empieza gratis hoy. Sin tarjeta de credito, sin contratos.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7 sm:mb-10">
              <Button
                onClick={() => isAuthenticated ? setLocation("/sistemas") : (window.location.href = getLoginUrl())}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 rounded-full h-12 sm:h-14 px-7 sm:px-8 text-base font-semibold shadow-xl hover:-translate-y-0.5 transition-all"
              >
                {isAuthenticated ? "Ir a mi panel" : "Empezar gratis"} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("[CyberPiezas] Quiero conocer mas");
                  window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject;
                }}
                variant="outline"
                className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-white rounded-full h-12 sm:h-14 px-7 sm:px-8 text-base font-semibold"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Hablar con ventas
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm">
              <button onClick={onCollab} className="text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline flex items-center gap-1.5 transition-colors">
                <Handshake className="w-3.5 h-3.5" /> Colaborar
              </button>
              <span className="text-slate-600">·</span>
              <button onClick={onSupport} className="text-rose-300 hover:text-rose-200 underline-offset-4 hover:underline flex items-center gap-1.5 transition-colors">
                <Heart className="w-3.5 h-3.5" /> Apoyar el proyecto
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER — actualizado con casas + confianza
// ============================================================================

function Footer({ onSupport, onCollab }: { onSupport: () => void; onCollab: () => void }) {
  return (
    <footer className="bg-white border-t border-slate-100 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between gap-8 sm:gap-10">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <CyberpiezasLogo size={36} variant="dark" />
              <span className="font-bold text-lg text-slate-900">CyberPiezas</span>
            </div>
            <p className="text-sm text-slate-600">Infraestructura de confianza local. Hecho en Morelos, México. Sin contratos. Sin algoritmos opacos. Sin venta de datos.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">El edificio</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#mobility" className="hover:text-slate-900 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Mobility</a></li>
                <li><a href="#celine" className="hover:text-slate-900 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Celine</a></li>
                <li><a href="#sistemas" className="hover:text-slate-900 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> POS</a></li>
                <li><a href="#hardware" className="hover:text-slate-900">Hardware</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Confianza</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#confianza" className="hover:text-slate-900">Cómo funciona</a></li>
                <li><a href="#comunidades" className="hover:text-slate-900">Comunidades</a></li>
                <li><a href="/terms" className="hover:text-slate-900">Términos</a></li>
                <li><a href="/terms" className="hover:text-slate-900">Privacidad</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Servicios</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#servicios" className="hover:text-slate-900">Instalación</a></li>
                <li><a href="#servicios" className="hover:text-slate-900">Capacitación</a></li>
                <li><a href="#servicios" className="hover:text-slate-900">Migración</a></li>
                <li><a href="#servicios" className="hover:text-slate-900">Soporte</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Empresa</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#historia" className="hover:text-slate-900">Historia</a></li>
                <li><a href="#precios" className="hover:text-slate-900">Precios</a></li>
                <li><button onClick={onCollab} className="hover:text-slate-900 text-left">Colaborar</button></li>
                <li><button onClick={onSupport} className="hover:text-slate-900 text-left">Apoyar</button></li>
                <li><a href="mailto:cyberpiezas207@gmail.com" className="hover:text-slate-900">Contacto</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 mt-8 pt-5 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CyberPiezas. Hecho con 💙 en Morelos, México.</p>
          <p className="text-sm text-slate-500">Infraestructura de confianza local</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// DEMO MODAL
// ============================================================================

function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6 sm:p-8 lg:p-10 shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg mx-auto mb-5">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mb-2">Agenda tu demo personalizado</h2>
          <p className="text-slate-600 mb-6">Te mostramos el sistema en una llamada de 20 minutos. Sin compromiso.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                const subject = encodeURIComponent("[CyberPiezas] Quiero un demo");
                const body = encodeURIComponent("Hola, me gustaria agendar un demo del sistema.\n\nMi nombre: \nNegocio: \nMejor horario: \nTelefono: \n");
                window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 px-6 font-semibold"
            >
              <Mail className="w-4 h-4 mr-1.5" /> Solicitar por email
            </Button>
            <Button
              onClick={() => window.open("https://wa.me/527771234567?text=Hola,%20quiero%20un%20demo%20de%20CyberPiezas", "_blank")}
              variant="outline"
              className="border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-full h-11 px-6 font-semibold"
            >
              <Phone className="w-4 h-4 mr-1.5" /> Por WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUPPORT MODAL
// ============================================================================

function SupportModal({ onClose }: { onClose: () => void }) {
  const [supportCount, setSupportCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem("cyberpiezas-monthly-support") || "0", 10);
  });
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const [animateBar, setAnimateBar] = useState(false);

  const monthlyGoal = 5000;
  const progressPercent = Math.min((supportCount / monthlyGoal) * 100, 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimateBar(true), 100);
    return () => clearTimeout(t);
  }, []);

  const tiers = [
    { amount: 30, emoji: "☕", name: "Cafecito", description: "Para que siga programando despierto", color: "from-amber-400 to-orange-500" },
    { amount: 150, emoji: "🌮", name: "Una comida", description: "Energía para una jornada completa", color: "from-rose-400 to-pink-500" },
    { amount: 300, emoji: "🚀", name: "Un mes completo", description: "Equivale a una suscripción mensual", color: "from-fuchsia-500 to-purple-600" },
  ];

  const handleSupport = (amount: number) => {
    setSelectedTier(amount);
    const newCount = supportCount + amount;
    setSupportCount(newCount);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cyberpiezas-monthly-support", String(newCount));
    }
    setShowThanks(true);
  };

  const openPayPal = () => {
    window.open("https://www.paypal.com/donate", "_blank", "noopener,noreferrer");
  };

  const openWhatsApp = (amount: number) => {
    const msg = encodeURIComponent(`Hola David! Quiero apoyar a CyberPiezas con $${amount} MXN. ¿Cómo te lo hago llegar?`);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Apoya el proyecto</h2>
            <p className="text-sm text-slate-600">Tu apoyo nos ayuda a seguir construyendo herramientas para pequeños negocios.</p>
          </div>

          <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Meta del mes</span>
              <span className="text-xs font-bold text-slate-700">
                ${supportCount.toLocaleString("es-MX")} / ${monthlyGoal.toLocaleString("es-MX")}
              </span>
            </div>
            <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: animateBar ? `${progressPercent}%` : "0%" }}
              />
              {progressPercent > 0 && (
                <div
                  className="absolute top-0 h-full w-8 bg-white/30 blur-sm transition-all duration-1000"
                  style={{ left: animateBar ? `calc(${progressPercent}% - 32px)` : "0px" }}
                />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center italic">
              {progressPercent >= 100
                ? "🎉 ¡Meta alcanzada! Gracias por hacerlo posible."
                : `Faltan $${(monthlyGoal - supportCount).toLocaleString("es-MX")} para la meta`}
            </p>
          </div>

          {!showThanks ? (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Elige cómo apoyar</h3>
              <div className="space-y-2 mb-6">
                {tiers.map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => handleSupport(tier.amount)}
                    className={"w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] " + `bg-gradient-to-br ${tier.color} border-transparent text-white shadow-md hover:shadow-xl`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{tier.emoji}</span>
                        <div>
                          <div className="font-bold text-base">{tier.name}</div>
                          <div className="text-xs text-white/85">{tier.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${tier.amount}</div>
                        <div className="text-[10px] text-white/70 uppercase tracking-wider">MXN</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4 mb-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-5xl mb-3">🙏</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¡Gracias por tu apoyo!</h3>
              <p className="text-sm text-slate-600 mb-5">
                Tu aporte de <span className="font-bold text-rose-600">${selectedTier} MXN</span> es un empujón enorme. Ahora completemos el pago:
              </p>
              <div className="space-y-2">
                <button onClick={openPayPal} className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-full h-11 font-semibold flex items-center justify-center gap-2 transition-colors">
                  💙 Pagar con PayPal
                </button>
                <button onClick={() => openWhatsApp(selectedTier ?? 0)} className="w-full bg-[#25d366] hover:bg-[#1ea952] text-white rounded-full h-11 font-semibold flex items-center justify-center gap-2 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Coordinar por WhatsApp
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent("[CyberPiezas] Apoyo al proyecto");
                    const body = encodeURIComponent(`Hola, quiero apoyar con $${selectedTier} MXN. ¿Como te hago llegar el monto?`);
                    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
                  }}
                  className="w-full border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-11 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Otro método (email)
                </button>
                <button onClick={() => { setShowThanks(false); setSelectedTier(null); }} className="text-xs text-slate-500 hover:text-slate-700 mt-3">
                  ← Elegir otro monto
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 text-center italic mt-4">
            Cada aporte cuenta. Gracias por creer en CyberPiezas.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COLLAB MODAL
// ============================================================================

function CollabModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!name || !contact) {
      alert("Por favor llena tu nombre y forma de contacto");
      return;
    }
    const subject = encodeURIComponent("[CyberPiezas] Quiero colaborar");
    const body = encodeURIComponent("Nombre: " + name + "\nContacto: " + contact + "\nMensaje:\n" + message);
    window.location.href = "mailto:cyberpiezas207@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Handshake className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Colabora con nosotros</h2>
          <p className="text-slate-600 text-sm">¿Tienes una idea, propuesta o quieres ser parte del equipo?</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Tu nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como te llamas"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Email o WhatsApp *</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Donde podemos contactarte"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuentanos tu propuesta..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-purple-400 focus:outline-none transition-colors resize-none"
            />
          </div>
          <Button
            onClick={handleSend}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full h-11 font-semibold mt-2"
          >
            <Mail className="w-4 h-4 mr-1.5" /> Enviar propuesta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STORY — Mejorada: capítulos editoriales con mejor ritmo y aterrizaje final
// ============================================================================

function Story() {
  return (
    <section id="historia" className="bg-white py-16 sm:py-28 lg:py-40 relative overflow-hidden">
      {/* Orbes */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Eyebrow + headline editorial */}
        <div className="text-center mb-16 sm:mb-28 lg:mb-36">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-6 sm:mb-8">
            <span className="text-slate-300">10</span>
            <span className="w-6 h-px bg-slate-300" />
            <span>Historia</span>
          </div>
          <h2 className="text-3xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-slate-900 leading-[1.0] sm:leading-[0.9]">
            ¿Por qué existe
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent italic font-medium">
              CyberPiezas?
            </span>
          </h2>
          <p className="mt-7 sm:mt-10 text-base sm:text-xl text-slate-500 max-w-xl mx-auto font-light leading-relaxed">
            No empezó como ecosistema. Empezó como una hija ayudando a su mamá.
          </p>
        </div>

        {/* Capítulos */}
        <div className="space-y-16 sm:space-y-28 lg:space-y-36">
          {/* Capítulo 1 */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-5">01 · El origen</p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-medium text-slate-900 leading-[1.25] sm:leading-[1.15] tracking-tight max-w-3xl mx-auto">
              Empezó en{" "}
              <span className="text-slate-400">Facebook Marketplace</span>.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>Comprando computadoras viejas, armando piezas,{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                distribuyendo lo que otros desechaban
              </span>.
            </p>
          </div>

          {/* Capítulo 2 - La mamá */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-5">02 · La motivación real</p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-medium text-slate-900 leading-[1.25] sm:leading-[1.15] tracking-tight max-w-3xl mx-auto">
              Pero lo que cambió todo fue mi mamá.
            </p>
            <p className="mt-5 sm:mt-6 text-base sm:text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-2">
              Su tienda de abarrotes. Le faltaba producto. Le robaban. No sabía los precios.
              Llegaba a casa frustrada, cansada.
            </p>
            <p className="mt-6 sm:mt-8 text-xl sm:text-2xl lg:text-3xl font-medium text-slate-900 leading-tight max-w-2xl mx-auto">
              <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                Quise ayudarla.
              </span>
            </p>
          </div>

          {/* Capítulo 3 - La misión */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-5">03 · La misión</p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-medium text-slate-900 leading-[1.25] sm:leading-[1.15] tracking-tight max-w-3xl mx-auto">
              Si funcionó para ella,
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                puede funcionar para miles.
              </span>
            </p>
            <p className="mt-5 sm:mt-6 text-base sm:text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-2">
              Bajo costo. Funcional. Pensado para los que no tienen capital,
              pero tienen ganas de salir adelante.
            </p>
          </div>

          {/* Capítulo 4 - El compromiso */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-5">04 · El compromiso</p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-medium text-slate-900 leading-[1.25] sm:leading-[1.15] tracking-tight max-w-3xl mx-auto">
              He sido estafado más veces de las que puedo contar.
              <br />
              <br />
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Aquí no.
              </span>
            </p>
            <p className="mt-5 sm:mt-6 text-base sm:text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-2">
              Trato justo. Sin letras chiquitas. Sin sorpresas.
              <br />
              Si tu negocio crece, el mío también.
            </p>
          </div>

          {/* Capítulo 5 - NUEVO: Donde estamos ahora */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-5">05 · Hoy</p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-medium text-slate-900 leading-[1.25] sm:leading-[1.15] tracking-tight max-w-3xl mx-auto">
              Lo que empezó como una herramienta para mi mamá
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent italic">
                se volvió algo más grande.
              </span>
            </p>
            <p className="mt-5 sm:mt-6 text-base sm:text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-2">
              Una red de confianza local. Donde personas, negocios y comunidades de Morelos
              pueden encontrarse, conocerse y cuidarse entre sí —
              sin contratos, sin algoritmos opacos, sin venta de datos.
            </p>
            <p className="mt-7 sm:mt-9 text-lg sm:text-2xl font-medium text-slate-700 leading-tight max-w-xl mx-auto">
              Eso es CyberPiezas.
            </p>
          </div>
        </div>

        {/* Cierre con firma editorial */}
        <div className="mt-20 sm:mt-32 lg:mt-44 text-center">
          <div className="inline-block max-w-2xl px-3 sm:px-0">
            <div className="w-px h-12 sm:h-16 bg-slate-300 mx-auto mb-7 sm:mb-10" />
            <p className="text-lg sm:text-2xl lg:text-3xl font-light text-slate-700 italic leading-relaxed tracking-tight">
              "Construyo la herramienta que mi mamá hubiera querido tener desde el principio."
            </p>
            <div className="mt-8 flex flex-col items-center gap-1">
              <p className="text-sm font-bold text-slate-900 tracking-tight">
                David Antonio Farfán
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-[0.25em]">
                Fundador · CyberPiezas
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CYBERPIEZAS LOGO — La obra maestra
// Apple + Da Vinci + Ghibli + Samsung
// ============================================================================

export function CyberpiezasLogo({ size = 36, variant = "dark" }: { size?: number; variant?: "dark" | "light" | "transparent" }) {
  const bg = variant === "dark" ? "#0a0a0a" : variant === "light" ? "#ffffff" : "transparent";
  const guide = variant === "dark" ? "#1f2937" : "#e5e7eb";
  const cStroke = variant === "dark" ? "#ffffff" : "#0a0a0a";
  const gradId = "aurora-" + size + "-" + variant;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {variant !== "transparent" && (
        <rect width="200" height="200" rx="40" fill={bg} />
      )}
      <circle cx="100" cy="100" r="62" fill="none" stroke={guide} strokeWidth="0.5" />
      <path
        d="M 142 50 A 50 50 0 1 0 142 150"
        fill="none"
        stroke={cStroke}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <rect
        x="138"
        y="89"
        width="24"
        height="24"
        rx="4.5"
        fill={`url(#${gradId})`}
        transform="rotate(45 150 101)"
      />
      <circle cx="146" cy="97" r="2" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
