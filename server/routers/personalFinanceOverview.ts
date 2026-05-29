// ============================================================================
// ROUTER tRPC - Vista combinada "Flujo General"
// ----------------------------------------------------------------------------
// Un solo endpoint de lectura que alimenta el panel "Flujo General".
// Devuelve numeros del negocio + gastos personales + tendencia 6 meses + insight.
// Blindado ownerOnly. Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getFinanceOverview } from "../personalFinanceOverviewDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

export const personalFinanceOverviewRouter = router({
  // Devuelve TODO lo que necesita el panel Flujo General
  getOverview: ownerOnlyProcedure.query(async ({ ctx }) => {
    return await getFinanceOverview(ctx.user.id);
  }),
});
