import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Calendar,
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
  Zap,
  Users,
  Package,
} from "lucide-react";

export default function GestionAccesoSuscriptor() {
  const { user } = useAuth();

  // Datos simulados del suscriptor (en producción vendrían del backend)
  const suscriptorData = {
    nombre: user?.name || "Usuario",
    email: user?.email || "usuario@boutique.com",
    negocio: "Mi Boutique",
    plan: "Profesional",
    estado: "activo",
    fechaInicio: "2024-01-15",
    fechaVencimiento: "2024-04-15",
    diasRestantes: 45,
    sucursalesActivas: 2,
    cajerosCantidad: 3,
    productosRegistrados: 156,
    permisos: {
      inventario: true,
      ventas: true,
      reportes: true,
      usuarios: true,
      configuracion: true,
      tiendaPublica: true,
    },
  };

  const diasRestantes = suscriptorData.diasRestantes;
  const porcentajeRestante = (diasRestantes / 30) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-white">Mi Acceso y Suscripción</h1>
          </div>
          <p className="text-slate-300">Información de tu cuenta y permisos activos</p>
        </div>

        {/* Info del Usuario */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-primary/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Información de tu Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-400">Nombre</p>
                <p className="text-lg font-semibold text-white mt-1">{suscriptorData.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-lg font-semibold text-white mt-1">{suscriptorData.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Nombre del Negocio</p>
                <p className="text-lg font-semibold text-white mt-1">{suscriptorData.negocio}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Estado de Cuenta</p>
                <div className="mt-1">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {suscriptorData.estado.charAt(0).toUpperCase() + suscriptorData.estado.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan y Suscripción */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Plan Actual */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Plan Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Plan Contratado</p>
                <p className="text-3xl font-bold text-primary mt-2">{suscriptorData.plan}</p>
              </div>
              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">Precio Mensual</p>
                <p className="text-2xl font-bold text-white mt-2">$170 MXN</p>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 mt-4">
                Cambiar Plan
              </Button>
            </CardContent>
          </Card>

          {/* Vigencia */}
          <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Vigencia de Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Inicio</p>
                <p className="text-lg font-semibold text-white mt-1">{suscriptorData.fechaInicio}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Vencimiento</p>
                <p className="text-lg font-semibold text-white mt-1">{suscriptorData.fechaVencimiento}</p>
              </div>
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">Días Restantes</p>
                  <p className="text-2xl font-bold text-accent">{diasRestantes}</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-accent to-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(porcentajeRestante, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas de Uso */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Uso de tu Suscripción
            </CardTitle>
            <CardDescription className="text-slate-400">
              Resumen de tu actividad en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400">Sucursales Activas</p>
                <p className="text-3xl font-bold text-primary mt-2">{suscriptorData.sucursalesActivas}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400">Cajeros</p>
                <p className="text-3xl font-bold text-accent mt-2">{suscriptorData.cajerosCantidad}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400">Productos</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{suscriptorData.productosRegistrados}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400">Tienda Pública</p>
                <p className="text-xl font-bold text-blue-400 mt-2">Activa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permisos Activos */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-500" />
              Permisos Activos
            </CardTitle>
            <CardDescription className="text-slate-400">
              Funciones disponibles en tu plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(suscriptorData.permisos).map(([permiso, activo]) => (
                <div
                  key={permiso}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    activo
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-slate-700/30 border-slate-600/50 opacity-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 flex-shrink-0 ${
                      activo ? "text-green-400" : "text-slate-500"
                    }`}
                  />
                  <span className={`font-medium ${activo ? "text-green-400" : "text-slate-500"}`}>
                    {permiso.charAt(0).toUpperCase() +
                      permiso.slice(1).replace(/([A-Z])/g, " $1")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <Button
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            Cambiar Contraseña
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            Descargar Factura
          </Button>
          <Button
            variant="outline"
            className="border-red-600/50 hover:bg-red-600/20 text-red-400"
          >
            Cancelar Suscripción
          </Button>
        </div>
      </div>
    </div>
  );
}
