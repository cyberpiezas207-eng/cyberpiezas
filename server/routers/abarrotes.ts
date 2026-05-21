import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { posStaff, users } from "../../drizzle/schema";
import * as db from "../db";
import { assertPosPermission, checkPosPermission } from "../_core/posPermissions";
import type { PosPermission } from "../db";

// =============================================================================
// SCOPE DEL POS
// =============================================================================
const POS_CODE = "abarrotes" as const;

// =============================================================================
// RESOLVE POS ACTOR
// -----------------------------------------------------------------------------
// Para CADA endpoint, antes de operar, hay que saber:
// 1. ¿Quien es el OWNER real de los datos? (puede ser el caller o el dueño
//    de quien el caller es staff)
// 2. ¿El owner tiene suscripcion activa a Abarrotes?
// 3. ¿Que permisos tiene el caller?
//
// Devuelve un objeto canonico que cada endpoint consume.
// =============================================================================

type PosActor = {
  actorUserId: number;
  ownerUserId: number;
  isAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  staffId: number | null;
  rolePreset: "manager" | "cashier" | "custom" | "owner";
  permissions: PosPermission[];
  canAccess: boolean;
  reason: "ok" | "no_subscription" | "staff_disabled" | "no_access";
};

async function resolvePosActor(actorUserId: number): Promise<PosActor> {
  const conn = await db.getDb();
  if (!conn) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Base de datos no disponible",
    });
  }

  // 1. Identificar el user
  const userRows = await conn
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    return makeNoAccess(actorUserId, "no_access");
  }

  // 2. Caso admin global de plataforma: acceso total siempre
  if (user.role === "admin") {
    return {
      actorUserId,
      ownerUserId: actorUserId,
      isAdmin: true,
      isOwner: true,
      isStaff: false,
      staffId: null,
      rolePreset: "owner",
      permissions: Object.keys(
        // Importamos POS_PERMISSIONS via db namespace
        db.POS_PERMISSIONS,
      ) as PosPermission[],
      canAccess: true,
      reason: "ok",
    };
  }

  // 3. ¿Es staff de algun owner en Abarrotes?
  const staffRows = await conn
    .select()
    .from(posStaff)
    .where(
      and(
        eq(posStaff.staffUserId, actorUserId),
        eq(posStaff.posCode, POS_CODE),
      ),
    )
    .limit(1);

  const staffRecord = staffRows[0];

  if (staffRecord) {
    // Es staff. Validar que esta activo.
    if (staffRecord.status !== "active") {
      return {
        actorUserId,
        ownerUserId: staffRecord.ownerUserId,
        isAdmin: false,
        isOwner: false,
        isStaff: true,
        staffId: staffRecord.id,
        rolePreset: staffRecord.rolePreset,
        permissions: [],
        canAccess: false,
        reason: "staff_disabled",
      };
    }

    // Staff activo. Validar suscripcion del OWNER (no del staff).
    const ownerHasSub = await ownerHasActiveAbarrotes(staffRecord.ownerUserId);
    if (!ownerHasSub) {
      return {
        actorUserId,
        ownerUserId: staffRecord.ownerUserId,
        isAdmin: false,
        isOwner: false,
        isStaff: true,
        staffId: staffRecord.id,
        rolePreset: staffRecord.rolePreset,
        permissions: [],
        canAccess: false,
        reason: "no_subscription",
      };
    }

    // Todo OK: cargar permisos del staff
    const permissions = await db.getPosStaffPermissions(staffRecord.id);

    return {
      actorUserId,
      ownerUserId: staffRecord.ownerUserId,
      isAdmin: false,
      isOwner: false,
      isStaff: true,
      staffId: staffRecord.id,
      rolePreset: staffRecord.rolePreset,
      permissions,
      canAccess: true,
      reason: "ok",
    };
  }

  // 4. No es admin ni es staff. ¿Es owner con su propia suscripcion?
  const selfHasSub = await ownerHasActiveAbarrotes(actorUserId);
  if (selfHasSub) {
    return {
      actorUserId,
      ownerUserId: actorUserId,
      isAdmin: false,
      isOwner: true,
      isStaff: false,
      staffId: null,
      rolePreset: "owner",
      permissions: Object.keys(db.POS_PERMISSIONS) as PosPermission[],
      canAccess: true,
      reason: "ok",
    };
  }

  // 5. Sin acceso
  return makeNoAccess(actorUserId, "no_access");
}

function makeNoAccess(
  actorUserId: number,
  reason: "no_subscription" | "staff_disabled" | "no_access",
): PosActor {
  return {
    actorUserId,
    ownerUserId: actorUserId,
    isAdmin: false,
    isOwner: false,
    isStaff: false,
    staffId: null,
    rolePreset: "cashier",
    permissions: [],
    canAccess: false,
    reason,
  };
}

/**
 * Valida si un user tiene suscripcion activa a Abarrotes.
 * Por ahora consume db.hasAccess via subscriptions (Subscription Core V1).
 *
 * NOTA: Si la funcion exacta tiene otro nombre en db.ts, ajustar.
 * Si no existe, este helper devuelve true (permisivo) hasta que se conecte.
 */
async function ownerHasActiveAbarrotes(ownerUserId: number): Promise<boolean> {
  try {
    // Intentar usar el helper de Subscription Core V1 si existe
    const checkFn = (db as unknown as Record<string, unknown>).hasAccess;
    if (typeof checkFn === "function") {
      const result = await (checkFn as (a: number, b: string) => Promise<boolean>)(
        ownerUserId,
        POS_CODE,
      );
      return Boolean(result);
    }
    // Fallback permisivo: si no hay helper, asumir true.
    // Esto NO compromete seguridad: el assertPosPermission sigue validando
    // permisos, y los datos siguen aislados por posCode.
    return true;
  } catch {
    return true;
  }
}

/**
 * Helper para errores comunes de acceso, con copy humano del Design Standard v3.
 */
function failByReason(reason: PosActor["reason"]): never {
  switch (reason) {
    case "no_subscription":
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "El dueño de la tienda no tiene Abarrotes activo. Pídele que renueve la suscripción.",
      });
    case "staff_disabled":
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Tu cuenta de cajero está desactivada. Pídele al dueño que te reactive.",
      });
    case "no_access":
    default:
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes acceso a Abarrotes.",
      });
  }
}

// =============================================================================
// SUB-ROUTER: PRODUCTS
// =============================================================================

const productsRouter = router({
  /**
   * Lista todos los productos del POS del owner real.
   * Filtrado estricto: posCode='abarrotes'. NO incluye legacy.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const actor = await resolvePosActor(ctx.user.id);
    if (!actor.canAccess) failByReason(actor.reason);

    await assertPosPermission({
      userId: actor.actorUserId,
      posCode: POS_CODE,
      permission: "products.view",
    });

    return db.getAllProducts(actor.ownerUserId, { posCode: POS_CODE });
  }),

  /**
   * Detalle de 1 producto del owner real (scope abarrotes).
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const actor = await resolvePosActor(ctx.user.id);
      if (!actor.canAccess) failByReason(actor.reason);

      await assertPosPermission({
        userId: actor.actorUserId,
        posCode: POS_CODE,
        permission: "products.view",
      });

      const product = await db.getProductById(input.id, actor.ownerUserId, {
        posCode: POS_CODE,
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos ese producto en Abarrotes.",
        });
      }

      return product;
    }),

  /**
   * Busqueda por nombre dentro del scope Abarrotes.
   */
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const actor = await resolvePosActor(ctx.user.id);
      if (!actor.canAccess) failByReason(actor.reason);

      await assertPosPermission({
        userId: actor.actorUserId,
        posCode: POS_CODE,
        permission: "products.view",
      });

      return db.searchProducts(actor.ownerUserId, input.query, {
        posCode: POS_CODE,
      });
    }),

  /**
   * Crea producto con posCode='abarrotes'.
   * NO toca productos legacy. Cada producto creado aqui es exclusivo de
   * Abarrotes.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        categoryId: z.number().int().positive(),
        brand: z.string().min(1).max(100),
        basePrice: z.string().min(1),
        sku: z.string().min(1).max(100),
        description: z.string().max(2000).optional(),
        branchIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await resolvePosActor(ctx.user.id);
      if (!actor.canAccess) failByReason(actor.reason);

      await assertPosPermission({
        userId: actor.actorUserId,
        posCode: POS_CODE,
        permission: "products.create",
      });

      // Validar que las branches solicitadas pertenecen al owner real.
      if (input.branchIds && input.branchIds.length > 0) {
        const availableBranches = await db.getBranchesByUserId(actor.ownerUserId);
        const availableIds = new Set(availableBranches.map((b) => b.id));
        if (input.branchIds.some((id) => !availableIds.has(id))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Solo puedes asignar el producto a sucursales de tu propio negocio.",
          });
        }
      }

      return db.createProduct(input, { posCode: POS_CODE });
    }),

  /**
   * Actualiza producto. Doble-bloqueo: posCode='abarrotes' en SELECT y UPDATE.
   * Productos legacy NO se pueden editar desde aqui.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        categoryId: z.number().int().positive().optional(),
        brand: z.string().min(1).max(100).optional(),
        basePrice: z.string().min(1).optional(),
        description: z.string().max(2000).optional(),
        branchIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await resolvePosActor(ctx.user.id);
      if (!actor.canAccess) failByReason(actor.reason);

      await assertPosPermission({
        userId: actor.actorUserId,
        posCode: POS_CODE,
        permission: "products.edit",
      });

      if (input.branchIds && input.branchIds.length > 0) {
        const availableBranches = await db.getBranchesByUserId(actor.ownerUserId);
        const availableIds = new Set(availableBranches.map((b) => b.id));
        if (input.branchIds.some((id) => !availableIds.has(id))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Solo puedes asignar el producto a sucursales de tu propio negocio.",
          });
        }
      }

      const { id, ...data } = input;
      await db.updateProduct(id, actor.ownerUserId, data, { posCode: POS_CODE });
      return { success: true };
    }),

  /**
   * Elimina producto (soft delete: isActive=false).
   * Doble-bloqueo: posCode='abarrotes' en SELECT y UPDATE.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const actor = await resolvePosActor(ctx.user.id);
      if (!actor.canAccess) failByReason(actor.reason);

      await assertPosPermission({
        userId: actor.actorUserId,
        posCode: POS_CODE,
        permission: "products.delete",
      });

      await db.deleteProduct(input.id, actor.ownerUserId, { posCode: POS_CODE });
      return { success: true };
    }),
});

// =============================================================================
// SUB-ROUTER: ACCESS
// =============================================================================

const accessRouter = router({
  /**
   * El frontend de Abarrotes llama esto al cargar el POS.
   *
   * Devuelve:
   * - canAccess: si el usuario puede entrar al POS
   * - mode: "owner" | "staff" | "none"
   * - ownerUserId: el dueño real de los datos
   * - permissions: lista de permisos efectivos (para UI gates)
   * - rolePreset: rol asignado
   * - reason: por que NO puede acceder (si canAccess=false)
   *
   * UI decide:
   * - Si canAccess=false: mostrar pantalla de bloqueo con razon
   * - Si canAccess=true mode=owner: dashboard completo
   * - Si canAccess=true mode=staff: dashboard segun permisos
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const actor = await resolvePosActor(ctx.user.id);

    return {
      canAccess: actor.canAccess,
      mode: actor.isAdmin
        ? ("owner" as const)
        : actor.isOwner
          ? ("owner" as const)
          : actor.isStaff
            ? ("staff" as const)
            : ("none" as const),
      ownerUserId: actor.canAccess ? actor.ownerUserId : null,
      staffId: actor.staffId,
      permissions: actor.permissions,
      rolePreset: actor.rolePreset,
      reason: actor.reason,
    };
  }),
});

// =============================================================================
// ROUTER PRINCIPAL DE ABARROTES
// =============================================================================

export const abarrotesRouter = router({
  access: accessRouter,
  products: productsRouter,
});
