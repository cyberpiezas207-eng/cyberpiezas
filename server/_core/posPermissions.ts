// ============================================================================
// posPermissions.ts
// ----------------------------------------------------------------------------
// Helpers para validar permisos POS Staff en endpoints tRPC.
//
// PATRON DE USO:
//   import { assertPosPermission } from "@/_core/posPermissions";
//
//   sales.create = protectedProcedure
//     .input(z.object({ posCode: z.enum([...]), ...rest }))
//     .mutation(async ({ ctx, input }) => {
//       await assertPosPermission({
//         userId: ctx.user.id,
//         posCode: input.posCode,
//         permission: "sales.create",
//       });
//       // ... resto del handler
//     });
//
// LOGICA:
// assertPosPermission llama a userHasPosPermission (db.ts) y throw FORBIDDEN
// si el usuario no tiene el permiso para ese POS.
//
// Para owners (users.role='admin'), userHasPosPermission devuelve true
// automaticamente. Por eso es seguro aplicar este check en endpoints que
// solo el owner usaba antes.
//
// PORQUE NO MIDDLEWARE tRPC:
// El patron .use(middleware) requiere instanciar el middleware con el
// builder `t` del proyecto. Usar una funcion pura es mas simple, mas
// type-safe (input.posCode ya viene tipado por Zod) y no depende del
// builder. Si en el futuro se necesita el patron middleware, se envuelve
// esta funcion trivialmente.
// ============================================================================

import { TRPCError } from "@trpc/server";
import { userHasPosPermission, type PosPermission } from "../db";

type PosCode =
  | "boutique"
  | "abarrotes"
  | "veterinaria"
  | "verduleria"
  | "tarima"
  | "taqueria"
  | "papeleria";

/**
 * Verifica que el usuario tenga un permiso especifico en un POS.
 * Lanza TRPCError FORBIDDEN si NO tiene el permiso.
 *
 * Para owners (users.role='admin' global), siempre permite (no falla).
 *
 * @throws TRPCError code="FORBIDDEN" si no tiene permiso
 * @throws TRPCError code="UNAUTHORIZED" si userId es invalido
 */
export async function assertPosPermission(args: {
  userId: number;
  posCode: PosCode;
  permission: PosPermission;
}): Promise<void> {
  if (!args.userId || args.userId <= 0) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sesion requerida",
    });
  }

  const allowed = await userHasPosPermission({
    userId: args.userId,
    posCode: args.posCode,
    permission: args.permission,
  });

  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permiso para esta accion",
    });
  }
}

/**
 * Version "soft" que devuelve boolean en vez de throw.
 * Util para condicionales en endpoints (ej: "si puede ver profit, incluir
 * el campo; si no, omitirlo").
 *
 * @returns true si el usuario tiene el permiso, false si no
 */
export async function checkPosPermission(args: {
  userId: number;
  posCode: PosCode;
  permission: PosPermission;
}): Promise<boolean> {
  if (!args.userId || args.userId <= 0) return false;
  return userHasPosPermission(args);
}
