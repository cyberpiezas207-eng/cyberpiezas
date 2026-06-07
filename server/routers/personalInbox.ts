// >>> ESTE ARCHIVO VA EN: server/routers/personalInbox.ts <<<
// ============================================================================
// ROUTER BUZON (formato esposa) - lado del dueno
// ----------------------------------------------------------------------------
// Blindado solo para el dueno (ownerOnlyProcedure). Expone:
//   tokens.list / tokens.ensure / tokens.regenerate / tokens.revoke
//   submissions.list / submissions.pendingCount
//   submissions.confirm / submissions.reject
//
// El endpoint PUBLICO (que ella usa para mandar) va aparte (Paso 2b),
// porque necesita un procedimiento sin login.
//
// AMPLIACION (gasolina D2b): submissions.confirm ahora acepta un switch
// opcional countAsExpense. Solo aplica a envios de gasolina:
//   - true  -> dinero nuevo: la carga entra al Vehiculo Y cuenta como gasto.
//   - false -> del dinero ya entregado: solo entra al Vehiculo (no duplica).
// Para los demas tipos (gasto/deseo/ingreso) el switch se ignora.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listTokens,
  ensureToken,
  regenerateToken,
  revokeToken,
  listSubmissions,
  countPending,
  confirmSubmission,
  rejectSubmission,
} from "../personalInboxDb";
// Solo el dueno principal maneja su buzon.
const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});
export const personalInboxRouter = router({
  tokens: router({
    // Lista todos los tokens (activos e historicos)
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listTokens(ctx.user.id);
    }),
    // Devuelve el token activo; si no hay, lo crea
    ensure: ownerOnlyProcedure
      .input(z.object({ label: z.string().max(80).optional() }).optional())
      .mutation(async ({ input, ctx }) => {
        return await ensureToken(ctx.user.id, input?.label ?? "Esposa");
      }),
    // Revoca el actual y crea uno nuevo (cambia el link secreto)
    regenerate: ownerOnlyProcedure
      .input(z.object({ label: z.string().max(80).optional() }).optional())
      .mutation(async ({ input, ctx }) => {
        return await regenerateToken(ctx.user.id, input?.label ?? "Esposa");
      }),
    // Revoca un token por id
    revoke: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        return await revokeToken(ctx.user.id, input.id);
      }),
  }),
  submissions: router({
    // Lista los envios (filtrable por estado)
    list: ownerOnlyProcedure
      .input(
        z
          .object({
            status: z.enum(["pending", "confirmed", "rejected"]).optional(),
          })
          .optional(),
      )
      .query(async ({ input, ctx }) => {
        return await listSubmissions(ctx.user.id, input?.status);
      }),
    // Cuantos pendientes hay (para un badge)
    pendingCount: ownerOnlyProcedure.query(async ({ ctx }) => {
      const n = await countPending(ctx.user.id);
      return { count: n };
    }),
    // Confirma un pendiente -> lo materializa segun su tipo.
    // countAsExpense (opcional) solo afecta a gasolina: si true, ademas de
    // entrar al Vehiculo, cuenta como gasto (dinero nuevo).
    confirm: ownerOnlyProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          countAsExpense: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        return await confirmSubmission(ctx.user.id, input.id, {
          countAsExpense: input.countAsExpense ?? false,
        });
      }),
    // Rechaza un pendiente
    reject: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        return await rejectSubmission(ctx.user.id, input.id);
      }),
  }),
});
