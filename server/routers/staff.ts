// ============================================================================
// staff.ts
// ----------------------------------------------------------------------------
// Router tRPC para gestion de POS Staff (cajeros, managers, empleados).
//
// ESTRUCTURA:
// - staff.list             Owner lista su staff (opcionalmente filtra por POS)
// - staff.getById          Owner obtiene detalle + permisos de un staff
// - staff.create           Owner crea staff nuevo con preset o custom perms
// - staff.setPermissions   Owner reemplaza permisos del staff
// - staff.setStatus        Owner activa/desactiva un staff
// - staff.delete           Owner elimina un staff
// - staff.me               Staff member obtiene su propio info+perms para
//                          un POS especifico (UI lo usa para gates)
// - staff.catalog          Devuelve el catalogo de permisos y presets
//                          (cualquier usuario autenticado lo lee)
//
// CONVENCIONES:
// - "Owner" = ctx.user.id que crea/gestiona el staff
// - Todos los endpoints de gestion validan tenant (ownerUserId = ctx.user.id)
// - users.role='admin' global tiene acceso total automatico via assertPosPermission
// - Tenant isolation se aplica en cada query: never confiar en input solo
//
// PARTE DE V2 PERMISOS - Commit 2
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { posStaff, users } from "../../drizzle/schema";
import {
  POS_PERMISSIONS,
  POS_ROLE_PRESETS,
  createPosStaff,
  listPosStaffByOwner,
  getPosStaffById,
  getPosStaffPermissions,
  setPosStaffPermissions,
  setPosStaffStatus,
  deletePosStaff,
  getDb,
  type PosPermission,
} from "../db";

// =============================================================================
// SCHEMAS Zod compartidos
// =============================================================================

const posCodeSchema = z.enum([
  "boutique",
  "abarrotes",
  "veterinaria",
  "verduleria",
  "tarima",
  "taqueria",
  "papeleria",
]);

const rolePresetSchema = z.enum(["manager", "cashier", "custom"]);
const statusSchema = z.enum(["active", "disabled", "invited"]);

const permissionSchema = z.enum(
  Object.keys(POS_PERMISSIONS) as [PosPermission, ...PosPermission[]],
);

// =============================================================================
// HELPERS LOCALES (no se exportan)
// =============================================================================

async function isUserAdmin(userId: number): Promise<boolean> {
  const conn = await getDb();
  if (!conn) return false;
  const rows = await conn
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.role === "admin";
}

async function findStaffByUserAndPos(args: {
  userId: number;
  posCode: z.infer<typeof posCodeSchema>;
}) {
  const conn = await getDb();
  if (!conn) return null;
  const rows = await conn
    .select()
    .from(posStaff)
    .where(
      and(
        eq(posStaff.staffUserId, args.userId),
        eq(posStaff.posCode, args.posCode),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function getStaffUserInfo(userId: number) {
  const conn = await getDb();
  if (!conn) return null;
  const rows = await conn
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

// =============================================================================
// ROUTER
// =============================================================================

export const staffRouter = router({
  // ==========================================================================
  // CATALOGO (publico para cualquier usuario autenticado)
  // ==========================================================================

  /**
   * Devuelve el catalogo de permisos y presets de rol.
   * Util para el frontend que renderiza la UI de configuracion de permisos.
   */
  catalog: protectedProcedure.query(() => {
    return {
      permissions: POS_PERMISSIONS,
      rolePresets: POS_ROLE_PRESETS,
    };
  }),

  // ==========================================================================
  // SELF (staff member viendo sus propios permisos)
  // ==========================================================================

  /**
   * Para el usuario autenticado, devuelve si tiene staff registrado en
   * el POS especificado, junto con sus permisos efectivos.
   *
   * Casos:
   * - Admin global (users.role='admin'): isAdmin=true, todos los permisos
   * - Staff active del POS: isAdmin=false, staff info, permisos asignados
   * - No es staff o staff disabled: isAdmin=false, staff=null, perms=[]
   *
   * El frontend usa esto para gates de UI.
   */
  me: protectedProcedure
    .input(z.object({ posCode: posCodeSchema }))
    .query(async ({ ctx, input }) => {
      const isAdmin = await isUserAdmin(ctx.user.id);
      if (isAdmin) {
        return {
          isAdmin: true,
          staff: null,
          permissions: Object.keys(POS_PERMISSIONS) as PosPermission[],
        };
      }

      const staffRecord = await findStaffByUserAndPos({
        userId: ctx.user.id,
        posCode: input.posCode,
      });

      if (!staffRecord || staffRecord.status !== "active") {
        return {
          isAdmin: false,
          staff: null,
          permissions: [],
        };
      }

      const permissions = await getPosStaffPermissions(staffRecord.id);

      return {
        isAdmin: false,
        staff: {
          id: staffRecord.id,
          posCode: staffRecord.posCode,
          rolePreset: staffRecord.rolePreset,
          status: staffRecord.status,
          branchId: staffRecord.branchId,
        },
        permissions,
      };
    }),

  // ==========================================================================
  // GESTION (owner gestiona su staff)
  // ==========================================================================

  /**
   * Owner lista su staff. Opcionalmente filtra por posCode.
   * Devuelve staff records enriquecidos con permisos + nombre+email del user.
   */
  list: protectedProcedure
    .input(z.object({ posCode: posCodeSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const ownerUserId = ctx.user.id;
      const staffList = await listPosStaffByOwner(ownerUserId, input?.posCode);

      const enriched = await Promise.all(
        staffList.map(async (s) => {
          const permissions = await getPosStaffPermissions(s.id);
          const userInfo = await getStaffUserInfo(s.staffUserId);
          return {
            ...s,
            permissions,
            staffUserName: userInfo?.name ?? "Sin nombre",
            staffUserEmail: userInfo?.email ?? "",
          };
        }),
      );

      return enriched;
    }),

  /**
   * Detalle completo de un staff (datos + permisos + info del user).
   * Tenant isolation: solo el ownerUserId puede ver su staff.
   */
  getById: protectedProcedure
    .input(z.object({ staffId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const staff = await getPosStaffById(input.staffId, ctx.user.id);
      if (!staff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff no encontrado o no pertenece a tu cuenta",
        });
      }

      const permissions = await getPosStaffPermissions(staff.id);
      const userInfo = await getStaffUserInfo(staff.staffUserId);

      return {
        ...staff,
        permissions,
        staffUserName: userInfo?.name ?? "Sin nombre",
        staffUserEmail: userInfo?.email ?? "",
      };
    }),

  /**
   * Crea un staff member nuevo.
   * El staffUserId debe ser un users.id existente.
   *
   * - rolePreset='manager' o 'cashier': se aplican los permisos preset
   * - rolePreset='custom': se requieren customPermissions
   *
   * Validacion adicional: no puedes agregarte a ti mismo como staff.
   */
  create: protectedProcedure
    .input(
      z.object({
        staffUserId: z.number().int().positive(),
        posCode: posCodeSchema,
        branchId: z.number().int().positive().nullable().optional(),
        rolePreset: rolePresetSchema,
        customPermissions: z.array(permissionSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.rolePreset === "custom") {
        if (!input.customPermissions || input.customPermissions.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Rol 'custom' requiere al menos un permiso",
          });
        }
      }

      if (input.staffUserId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes agregarte como staff a ti mismo",
        });
      }

      const result = await createPosStaff({
        ownerUserId: ctx.user.id,
        staffUserId: input.staffUserId,
        posCode: input.posCode,
        branchId: input.branchId ?? null,
        rolePreset: input.rolePreset,
        createdByUserId: ctx.user.id,
        customPermissions: input.customPermissions,
      });

      return result;
    }),

  /**
   * Reemplaza permisos de un staff. Idempotente: borra+inserta.
   *
   * El rolePreset se auto-ajusta:
   * - Si el set matchea preset manager: rolePreset = "manager"
   * - Si matchea preset cashier: rolePreset = "cashier"
   * - Si no matchea: rolePreset = "custom"
   */
  setPermissions: protectedProcedure
    .input(
      z.object({
        staffId: z.number().int().positive(),
        permissions: z.array(permissionSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const staff = await getPosStaffById(input.staffId, ctx.user.id);
      if (!staff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff no encontrado o no pertenece a tu cuenta",
        });
      }

      await setPosStaffPermissions(input.staffId, input.permissions);
      const updated = await getPosStaffById(input.staffId, ctx.user.id);
      const newPerms = await getPosStaffPermissions(input.staffId);

      return {
        ...updated,
        permissions: newPerms,
      };
    }),

  /**
   * Cambia status de un staff (active / disabled / invited).
   */
  setStatus: protectedProcedure
    .input(
      z.object({
        staffId: z.number().int().positive(),
        status: statusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await setPosStaffStatus(
        input.staffId,
        ctx.user.id,
        input.status,
      );
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff no encontrado o no pertenece a tu cuenta",
        });
      }
      return updated;
    }),

  /**
   * Elimina un staff. Por CASCADE, sus permisos se borran solos.
   */
  delete: protectedProcedure
    .input(z.object({ staffId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const staff = await getPosStaffById(input.staffId, ctx.user.id);
      if (!staff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff no encontrado o no pertenece a tu cuenta",
        });
      }
      return deletePosStaff(input.staffId, ctx.user.id);
    }),
});
