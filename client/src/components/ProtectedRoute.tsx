import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, LockKeyhole } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type AppRole = "admin" | "cashier" | "user";

// SUBSCRIPTION CORE V1: enum completo de los 7 POS de CyberPiezas.
// Cualquier ruta con requiredProgram debe usar uno de estos codigos.
type ProgramCode =
  | "boutique"
  | "abarrotes"
  | "celine"
  | "veterinaria"
  | "verduleria"
  | "tarima"
  | "taqueria"
  | "papeleria";

type ProgramAccessEntry = {
  programCode: string;
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

// POS que NO usan hasAccess (no son POS pagados o son publicos)
// celine es interno de CyberPiezas (admin-only). No tiene suscripciones.
const POS_WITHOUT_SUBSCRIPTION: ReadonlySet<ProgramCode> = new Set([
  "celine",
]);

// POS que SI son validados via subscriptions table (fuente canonica nueva)
const POS_WITH_SUBSCRIPTION: ReadonlySet<ProgramCode> = new Set([
  "boutique",
  "abarrotes",
  "veterinaria",
  "verduleria",
  "tarima",
  "taqueria",
  "papeleria",
]);

function hasRequiredRole(userRole: string | undefined, requiredRole?: AppRole) {
  if (!requiredRole) return true;
  if (!userRole) return false;
  const normalizedRole = (userRole in rolePriority ? userRole : "user") as AppRole;
  return rolePriority[normalizedRole] >= rolePriority[requiredRole];
}

/**
 * Valida acceso por programa con fallback legacy.
 *
 * SUBSCRIPTION CORE V1: Para POS con suscripciones (todos menos celine),
 * la validacion REAL la hace useQuery(trpc.pagos.subscriptions.hasAccess).
 * Esta funcion solo valida el fallback legacy de user.programAccess para
 * POS que el backend hibrido aun resuelve por enum legacy.
 *
 * - Admin global: acceso a todo (sin importar suscripcion)
 * - Sin requiredProgram: acceso libre
 * - Con requiredProgram + admin: acceso
 * - Con requiredProgram + user.programAccess incluye el POS: acceso (legacy)
 */
function hasLegacyProgramAccess(
  userRole: string | undefined,
  programAccess: ProgramAccessEntry[] | undefined,
  requiredProgram?: ProgramCode,
) {
  if (!requiredProgram) return true;
  if (userRole === "admin") return true;
  return Boolean(
    programAccess?.some(
      (item) => item.programCode === requiredProgram && item.status === "active",
    ),
  );
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredProgram,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // SUBSCRIPTION CORE V1: consultar hasAccess SOLO si:
  // - hay un requiredProgram que esta dentro de POS_WITH_SUBSCRIPTION
  // - el usuario esta logueado
  // - el usuario NO es admin global (admin no necesita check)
  const shouldQueryHasAccess =
    !!user &&
    user.role !== "admin" &&
    !!requiredProgram &&
    POS_WITH_SUBSCRIPTION.has(requiredProgram);

  const hasAccessQuery = trpc.pagos.subscriptions.hasAccess.useQuery(
    { posCode: requiredProgram as Exclude<ProgramCode, "celine"> },
    {
      enabled: shouldQueryHasAccess,
      // Mantener fresco para reflejar cambios de suscripcion sin hard refresh
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  // Loading inicial de auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verificando acceso al sistema...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check de rol primero (mas barato que el query a hasAccess)
  if (!hasRequiredRole(user.role, requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tu perfil no tiene permisos para abrir este módulo. Si necesitas acceso,
            entra con una cuenta administradora o regresa al centro principal.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => setLocation("/cyberpiezas")}>
              Ir al centro principal
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Validacion de acceso al programa: HIBRIDA
  // - Fuente nueva (canonica): subscriptions via hasAccess
  // - Fallback legacy: user.programAccess
  // Si CUALQUIERA dice OK, dejamos pasar (backward compatible).

  // 1) Mientras carga hasAccess, mostrar loading suave si el legacy NO da OK.
  //    Si el legacy ya da OK, dejamos pasar sin esperar (UX rapida).
  const legacyOk = hasLegacyProgramAccess(
    user.role,
    (user as { programAccess?: ProgramAccessEntry[] }).programAccess,
    requiredProgram,
  );

  if (shouldQueryHasAccess && hasAccessQuery.isLoading && !legacyOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Validando tu suscripción...
          </p>
        </div>
      </div>
    );
  }

  const subscriptionOk = shouldQueryHasAccess
    ? hasAccessQuery.data?.hasAccess === true
    : false;

  const accessGranted = legacyOk || subscriptionOk;

  if (!accessGranted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <LockKeyhole className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Módulo no activo en tu cuenta
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Este sistema no aparece en tu suscripción actual. Para mantener tu panel
            limpio y seguro, solo puedes entrar a los módulos contratados.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => setLocation("/cyberpiezas")}>
              Ir al centro principal
            </Button>
            <Button variant="outline" onClick={() => setLocation("/pricing")}>
              Ver suscripciones
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
