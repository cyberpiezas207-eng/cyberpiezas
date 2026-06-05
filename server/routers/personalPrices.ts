// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/routers/personalPrices.ts <<<
// ============================================================================
// ROUTER - Cerebro de precios
// ----------------------------------------------------------------------------
// Blindado solo para el dueno. Expone "brain": la lista de productos con su
// precio mas reciente, por tienda, por mes y si subio o bajo.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getProductPriceBrain } from "../personalPricesDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});

export const personalPricesRouter = router({
  brain: ownerOnlyProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        monthsBack: z.number().int().min(1).max(12).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await getProductPriceBrain(
        ctx.user.id,
        input.year,
        input.month,
        input.monthsBack ?? 3,
      );
    }),
});
