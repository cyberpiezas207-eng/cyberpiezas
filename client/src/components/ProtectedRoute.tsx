import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, LockKeyhole } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

type AppRole = "admin" | "cashier" | "user";
type ProgramCode = "boutique" | "abarrotes" | "celine";

type ProgramAccessEntry = {
  programCode: ProgramCode;
  status: "active" | "pending" | "inactive" | "suspended" | "expired";
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  requiredProgram?: ProgramCode;
}

const rolePriority: Record<AppRole, number> = {
  user: 1,
  cashier: 2,
  admin: 3,
};

function hasRequiredRole(userRole: string | undefined, requiredRole?: AppRole) {
  if (!requiredRole) return true;
  if (!userRole) return false;
  const normalizedRole = (userRole in rolePriority ? userRole : "user") as AppRole;
  return rolePriority[normalizedRole] >= rolePriority[requiredRole];
}

function hasRequiredProgramAccess(
  userRole: string | undefined,
  programAccess: ProgramAccessEntry[] | undefined,
  requiredProgram?: ProgramCode,
) {
  if (!requiredProgram) return true;
  if (userRole === "admin") return true;
  return Boolean(programAccess?.some((item) => item.programCode === requiredProgram && item.status === "active"));
}

export function ProtectedRoute({ children, requiredRole, requiredProgram }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando acceso al sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasRequiredRole(user.role, requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tu perfil no tiene permisos para abrir este módulo. Si necesitas acceso, entra con una cuenta administradora o regresa al centro principal.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => setLocation("/cyberpiezas")}>Ir al centro principal</Button>
            <Button variant="outline" onClick={() => setLocation("/")}>Volver al inicio</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRequiredProgramAccess(user.role, (user as { programAccess?: ProgramAccessEntry[] }).programAccess, requiredProgram)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <LockKeyhole className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Módulo no activo en tu cuenta</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Este sistema no aparece en tu suscripción actual. Para mantener tu panel limpio y seguro, solo puedes entrar a los módulos contratados.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => setLocation("/cyberpiezas")}>Ir al centro principal</Button>
            <Button variant="outline" onClick={() => setLocation("/pricing")}>Ver suscripciones</Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
