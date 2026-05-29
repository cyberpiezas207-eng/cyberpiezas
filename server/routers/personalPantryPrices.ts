// ============================================================================
// ROUTER tRPC - Historial de precios de la alacena
// ----------------------------------------------------------------------------
// 2 endpoints de lectura:
//   - history(pantryItemId): lista cronologica de compras de ese producto
//   - stats(pantryItemId): min/max/promedio + breakdown por tienda
// Blindado ownerOnly. Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listItemPriceHistory,
  getItemPriceStats,
} from "../personalPantryPricesDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

export const personalPantryPricesRouter = router({
  history: ownerOnlyProcedure
    .input(
      z.object({
        pantryItemId: z.number().int().positive(),
        limit: z.number().int().positive().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await listItemPriceHistory(
        ctx.user.id,
        input.pantryItemId,
        input.limit,
      );
    }),

  stats: ownerOnlyProcedure
    .input(z.object({ pantryItemId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await getItemPriceStats(ctx.user.id, input.pantryItemId);
    }),
});
