import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CreditCard, BarChart3, Lock, Zap, Users, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

type AuthMode = "login" | "register";

function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: onSuccess,
    onError: (e) => setError(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: onSuccess,
    onError: (e) => setError(e.message),
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!acceptTerms) {
        setError("Debes aceptar los Términos y Condiciones para continuar");
        return;
      }
      registerMutation.mutate({ email, password, name, businessName });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Ingresa a tu punto de venta"
            : "Registra tu negocio gratis"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="businessName">Nombre del negocio</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Boutique XYZ"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@negocio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "register" && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 p-3">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-muted-foreground cursor-pointer flex-1">
                Acepto los{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  Términos y Condiciones
                </a>
              </label>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending || (mode === "register" && !acceptTerms)}>
            {isPending
              ? "Un momento..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline font-medium"
                  onClick={() => { setMode("register"); setError(""); }}
                >
                  Regístrate gratis
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline font-medium"
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const features = [
  {
    icon: Package,
    title: "Gestión de Inventario",
    description:
      "Control completo de productos, tallas, colores y stock. Alertas automáticas de inventario bajo.",
  },
  {
    icon: CreditCard,
    title: "Punto de Venta Rápido",
    description:
      "Ventas instantáneas con búsqueda rápida de productos, generación de tickets y múltiples métodos de pago.",
  },
  {
    icon: BarChart3,
    title: "Dashboard y Reportes",
    description:
      "Estadísticas en tiempo real, historial de ventas y análisis de desempeño de tu negocio.",
  },
  {
    icon: Lock,
    title: "Multi-sucursal",
    description:
      "Administra varias sucursales desde un solo lugar. Cada cajero opera solo en su punto asignado.",
  },
  {
    icon: Zap,
    title: "Modo Offline",
    description:
      "Sigue vendiendo aunque se corte el internet. Las ventas se sincronizan automáticamente al reconectar.",
  },
  {
    icon: Users,
    title: "Gestión de Personal",
    description:
      "Crea cuentas para tus cajeros con acceso limitado a sus funciones. Control total de permisos.",
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/cyberpiezas");
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Fondo decorativo con gradientes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-30 animate-pulse" />
      </div>

      {/* Header */}
      <header className="py-8 px-4 border-b border-primary/10 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚙️</span>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Cyberpiezas POS</h1>
          </div>
          <p className="text-lg text-slate-300 font-medium">
            Gestiona tu negocio de forma inteligente
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-4 py-16 max-w-6xl mx-auto w-full relative z-10">
        {/* Left: Hero */}
        <div className="flex-1 text-center lg:text-left max-w-2xl">
          <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent mb-6 leading-tight">
            Gestiona tu Negocio de Forma Inteligente
          </h2>
          <p className="text-xl text-slate-300 mb-10 leading-relaxed font-light">
            Sistema POS completo para boutiques, restaurantes y negocios. Controla inventario,
            realiza ventas rápidas, accede a reportes en tiempo real y crece sin límites.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-5 border border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
              >
                <Icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth form */}
        <div className="w-full max-w-md flex-shrink-0">
          <AuthForm onSuccess={() => navigate("/cyberpiezas")} />
          <p className="text-center text-xs text-slate-400 mt-6">
            Al registrarte aceptas nuestros{" "}
            <a href="/terms" className="text-primary hover:text-accent font-semibold transition-colors">
              Términos y Condiciones
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
