// ============================================================================
// ROUTER tRPC - Resumen mensual inteligente
// ----------------------------------------------------------------------------
// Un solo endpoint get(year, month) que devuelve lista priorizada de insights.
// Blindado ownerOnly. No toca routers existentes.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getMonthlyInsights } from "../personalMonthlyInsightsDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

export const personalMonthlyInsightsRouter = router({
  get: ownerOnlyProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await getMonthlyInsights(ctx.user.id, input.year, input.month);
    }),
});
