import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Store,
  Package,
  Users,
  ShieldCheck,
  Lock,
  Trash2,
  Copy,
  Check,
  BarChart3,
  ShoppingCart,
  Settings,
  Globe,
} from "lucide-react";

// Permisos disponibles para el suscriptor
const AVAILABLE_PERMISSIONS = [
  { id: "inventory", label: "Inventario", icon: Package, description: "Gestión de productos y stock" },
  { id: "sales", label: "Ventas", icon: ShoppingCart, description: "Punto de venta y cobros" },
  { id: "reports", label: "Reportes", icon: BarChart3, description: "Análisis y estadísticas" },
  { id: "users", label: "Usuarios", icon: Users, description: "Cajeros y personal" },
  { id: "settings", label: "Configuración", icon: Settings, description: "Ajustes del sistema" },
  { id: "store", label: "Tienda Pública", icon: Globe, description: "Catálogo online" },
];

export default function MySubscription() {
  const { user } = useAuth();

  // Contadores reales desde planUsage (protectedProcedure — accesible para cualquier rol)
  const planUsageQuery = trpc.dashboard.planUsage.useQuery();

  // Permisos con persistencia en localStorage
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("user_permissions");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      inventory: true,
      sales: true,
      reports: true,
      users: true,
      settings: false,
      store: false,
    };
  });

  // Estado de modales
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  // Datos del plan desde el usuario real
  const planCode = (user as any)?.subscriptionPlan ?? "free";
  const planNames: Record<string, string> = {
    free: "Gratis",
    basic: "Básico",
    professional: "Profesional",
    premium: "Premium",
    annual: "Anual",
  };
  const planPrices: Record<string, number> = {
    free: 0,
    basic: 249,
    professional: 500,
    premium: 0, // precio especial
    annual: 2390,
  };
  const planFeatures: Record<string, string[]> = {
    free: ["1 sucursal", "Hasta 50 productos", "Reportes básicos"],
    basic: ["1 sucursal", "Hasta 500 productos", "Reportes básicos", "Soporte por correo"],
    professional: ["Hasta 3 sucursales", "Productos ilimitados", "Reportes avanzados", "Soporte prioritario"],
    premium: ["Sucursales ilimitadas", "Productos ilimitados", "Reportes avanzados", "Soporte directo", "Características especiales a solicitud"],
    annual: ["Todo lo del plan Profesional", "2 meses gratis incluidos", "Facturación anual"],
  };
  const rawStart = (user as any)?.subscriptionStartDate;
  const rawEnd = (user as any)?.subscriptionEndDate;
  const subscriptionData = {
    plan: planNames[planCode] ?? "Gratis",
    price: planPrices[planCode] ?? 0,
    currency: "MXN",
    startDate: rawStart ? new Date(rawStart) : null,
    renewalDate: rawEnd ? new Date(rawEnd) : null,
    status: user?.subscriptionStatus || "inactive",
    features: planFeatures[planCode] ?? planFeatures["free"],
  };

  const today = new Date();
  const daysRemaining = subscriptionData.renewalDate
    ? Math.ceil((subscriptionData.renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  const togglePermission = (id: string) => {
    const updated = { ...permissions, [id]: !permissions[id] };
    setPermissions(updated);
    localStorage.setItem("user_permissions", JSON.stringify(updated));
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("cyberpiezas207@gmail.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleCancelSubscription = () => {
    setCancelConfirmed(true);
    // Aquí iría la llamada al backend cuando esté disponible
    setTimeout(() => {
      setShowCancelModal(false);
      setCancelConfirmed(false);
    }, 2000);
  };

  // Conteos reales desde planUsage
  const branchCount = planUsageQuery.data?.usage?.branches ?? 0;
  const productCount = planUsageQuery.data?.usage?.products ?? 0;
  const userCount = planUsageQuery.data?.limits?.users ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-white">Mi Suscripción</h1>
          <p className="text-slate-400 mt-2">Información de tu plan y accesos</p>
        </div>

        {/* Plan Actual — informativo, no interactivo */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-slate-900 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-1">Tu Plan Actual</p>
                <h2 className="text-3xl font-bold text-white">{subscriptionData.plan}</h2>
                <p className="text-purple-300 text-lg font-semibold mt-1">
                  {subscriptionData.price === 0 ? "Gratis" : `$${subscriptionData.price} ${subscriptionData.currency}/mes`}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Activo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Fecha de inicio</span>
                </div>
                <p className="text-white font-medium">
                  {subscriptionData.startDate ? formatDate(subscriptionData.startDate) : "No disponible"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Próxima renovación</span>
                </div>
                <p className="text-white font-medium">
                  {subscriptionData.renewalDate ? formatDate(subscriptionData.renewalDate) : "No disponible"}
                </p>
              </div>
            </div>

            {/* Días restantes */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm">Días restantes</span>
                <span className={`text-2xl font-bold ${
                  daysRemaining === null ? "text-slate-400" :
                  daysRemaining <= 5 ? "text-red-400" :
                  daysRemaining <= 10 ? "text-yellow-400" : "text-purple-400"
                }`}>
                  {daysRemaining === null ? "N/A" : `${daysRemaining} días`}
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className={`rounded-full h-2 transition-all ${daysRemaining <= 5 ? "bg-red-500" : daysRemaining <= 10 ? "bg-yellow-500" : "bg-purple-500"}`}
                  style={{ width: `${daysRemaining === null ? 0 : Math.max(0, Math.min(100, (daysRemaining / 30) * 100))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uso Real de la Suscripción */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Uso de tu suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <Store className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{planUsageQuery.isLoading ? "..." : branchCount}</p>
                <p className="text-slate-400 text-sm mt-1">Sucursales</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <Package className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{planUsageQuery.isLoading ? "..." : productCount}</p>
                <p className="text-slate-400 text-sm mt-1">Productos</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{planUsageQuery.isLoading ? "..." : userCount}</p>
                <p className="text-slate-400 text-sm mt-1">Cajeros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permisos Activos — Interactivos */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-white">Permisos activos</CardTitle>
            </div>
            <p className="text-slate-400 text-sm mt-1">Activa o desactiva el acceso a cada módulo</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const Icon = perm.icon;
                const isActive = permissions[perm.id];
                return (
                  <button
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left w-full ${
                      isActive
                        ? "bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30"
                        : "bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50 opacity-60"
                    }`}
                  >
                    <div className={`p-2 rounded-md ${isActive ? "bg-purple-500/30" : "bg-slate-600/50"}`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-purple-300" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? "text-white" : "text-slate-400"}`}>{perm.label}</p>
                      <p className="text-xs text-slate-500 truncate">{perm.description}</p>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${isActive ? "bg-purple-500" : "bg-slate-600"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Características del Plan */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Características incluidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {subscriptionData.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cambiar Contraseña */}
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 h-12 text-base"
            onClick={() => setShowPasswordModal(true)}
          >
            <Lock className="w-4 h-4 mr-2" />
            Cambiar contraseña
          </Button>

          {/* Cancelar Suscripción */}
          <Button
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-12 text-base"
            onClick={() => setShowCancelModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancelar suscripción
          </Button>
        </div>

        {/* Info de ayuda */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                <p>
                  Si tienes preguntas sobre tu suscripción, contacta al equipo de soporte en{" "}
                  <span className="font-semibold text-blue-200">cyberpiezas207@gmail.com</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Cambiar Contraseña */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Lock className="w-5 h-5 text-purple-400" />
              Cambiar contraseña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <p className="font-medium mb-1">Solicitud manual requerida</p>
                  <p>
                    Para cambiar tu contraseña, contacta al administrador directamente.
                    Te asignaremos una nueva contraseña de forma segura.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-slate-400 text-xs mb-1">Correo del administrador</p>
                <p className="text-white font-medium">cyberpiezas207@gmail.com</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                onClick={copyEmail}
              >
                {emailCopied ? (
                  <><Check className="w-4 h-4 mr-1 text-green-400" /> Copiado</>
                ) : (
                  <><Copy className="w-4 h-4 mr-1" /> Copiar</>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setShowPasswordModal(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Cancelación */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Cancelar suscripción
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {cancelConfirmed ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-300 font-medium">Solicitud enviada</p>
                <p className="text-slate-400 text-sm mt-1">El administrador procesará tu cancelación pronto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-red-300">
                      <p className="font-medium mb-1">¿Estás seguro de que deseas cancelar tu suscripción?</p>
                      <p>Esta acción no se puede deshacer. Perderás acceso al sistema al vencer tu periodo actual.</p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm text-center">
                  Tu acceso continuará activo hasta el{" "}
                  <span className="text-white font-medium">
                    {subscriptionData.renewalDate ? formatDate(subscriptionData.renewalDate) : "la fecha de vencimiento"}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {!cancelConfirmed && (
              <>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setShowCancelModal(false)}
                >
                  No, mantener plan
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCancelSubscription}
                >
                  Sí, cancelar suscripción
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
