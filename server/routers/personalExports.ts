// ============================================================================
// ROUTER tRPC - Exportaciones CSV
// ----------------------------------------------------------------------------
// 4 queries que devuelven { filename, csv } listo para descargar:
//   - expenses        : todos los gastos
//   - prices          : historial de precios
//   - pantry          : alacena completa
//   - shoppingList    : lista de compra actual
// Blindado ownerOnly. Solo lectura.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  exportExpensesCsv,
  exportPricesCsv,
  exportPantryCsv,
  exportShoppingListCsv,
} from "../personalExportsDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

// Helper: stamp para nombres de archivo (YYYY-MM-DD)
function todayStamp(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000); // Morelos UTC-6
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const personalExportsRouter = router({
  expenses: ownerOnlyProcedure.query(async ({ ctx }) => {
    const csv = await exportExpensesCsv(ctx.user.id);
    return {
      filename: `gastos-personales-${todayStamp()}.csv`,
      csv,
    };
  }),

  prices: ownerOnlyProcedure.query(async ({ ctx }) => {
    const csv = await exportPricesCsv(ctx.user.id);
    return {
      filename: `historial-precios-${todayStamp()}.csv`,
      csv,
    };
  }),

  pantry: ownerOnlyProcedure.query(async ({ ctx }) => {
    const csv = await exportPantryCsv(ctx.user.id);
    return {
      filename: `alacena-${todayStamp()}.csv`,
      csv,
    };
  }),

  shoppingList: ownerOnlyProcedure.query(async ({ ctx }) => {
    const csv = await exportShoppingListCsv(ctx.user.id);
    return {
      filename: `lista-compra-${todayStamp()}.csv`,
      csv,
    };
  }),
});
