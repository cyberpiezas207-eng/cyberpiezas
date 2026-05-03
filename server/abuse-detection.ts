import { getDb } from "./db";
import { abuseLog } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface AbuseAttempt {
  userId: number;
  attemptType: "create_account" | "edit_product" | "access_restricted" | "unauthorized_action";
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

/**
 * Registra un intento de abuso en modo solo recarga
 */
export async function logAbuseAttempt(attempt: AbuseAttempt) {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available for logging abuse attempt");
      return;
    }
    await db.insert(abuseLog).values({
      userId: attempt.userId,
      attemptType: attempt.attemptType,
      description: attempt.description,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      timestamp: attempt.timestamp || new Date(),
      severity: calculateSeverity(attempt.attemptType),
    });
  } catch (error) {
    console.error("Error logging abuse attempt:", error);
  }
}

/**
 * Obtiene el historial de intentos de abuso para un usuario
 */
export async function getUserAbuseHistory(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available");
      return [];
    }
    const history = await db
      .select()
      .from(abuseLog)
      .where(eq(abuseLog.userId, userId));
    return history;
  } catch (error) {
    console.error("Error fetching abuse history:", error);
    return [];
  }
}

/**
 * Obtiene todos los intentos de abuso (para el panel admin)
 */
export async function getAllAbuseAttempts() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available");
      return [];
    }
    const attempts = await db
      .select()
      .from(abuseLog);
    return attempts;
  } catch (error) {
    console.error("Error fetching all abuse attempts:", error);
    return [];
  }
}

/**
 * Calcula la severidad del intento de abuso
 */
function calculateSeverity(attemptType: string): "low" | "medium" | "high" {
  switch (attemptType) {
    case "create_account":
      return "high"; // Intento de crear cuenta es muy sospechoso
    case "edit_product":
      return "high"; // Editar productos cuando solo puede recargar
    case "access_restricted":
      return "medium"; // Acceso a áreas restringidas
    case "unauthorized_action":
      return "medium"; // Acción no autorizada
    default:
      return "low";
  }
}

/**
 * Verifica si un usuario está en modo solo recarga
 */
export async function isUserInReadOnlyMode(userId: number): Promise<boolean> {
  try {
    // Aquí iría la lógica para verificar si el usuario está en modo solo recarga
    // Por ahora retorna false, se implementará según tu lógica de negocio
    return false;
  } catch (error) {
    console.error("Error checking read-only mode:", error);
    return false;
  }
}

/**
 * Middleware para detectar intentos de abuso
 */
export function abuseDetectionMiddleware(userId: number, action: string, ipAddress?: string, userAgent?: string) {
  return async (next: () => Promise<any>) => {
    const isReadOnly = await isUserInReadOnlyMode(userId);

    if (isReadOnly && shouldBlockAction(action)) {
      await logAbuseAttempt({
        userId,
        attemptType: "unauthorized_action",
        description: `Intento de realizar acción no permitida: ${action}`,
        ipAddress,
        userAgent,
      });

      throw new Error(`Acción no permitida en modo solo recarga: ${action}`);
    }

    return next();
  };
}

/**
 * Determina si una acción debe ser bloqueada en modo solo recarga
 */
function shouldBlockAction(action: string): boolean {
  const blockedActions = [
    "create_account",
    "delete_account",
    "edit_product",
    "delete_product",
    "create_user",
    "delete_user",
    "modify_settings",
    "change_plan",
  ];

  return blockedActions.includes(action);
}
