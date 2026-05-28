// ============================================================================
// ROUTER tRPC - Sugerencias gasto -> alacena
// ----------------------------------------------------------------------------
// Recibe productos confirmados por el usuario y los crea/repone en la alacena.
// Router separado para mantener personalPantry.ts intacto. Blindado ownerOnly.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { bulkCreateOrRestockPantryItems } from "../personalPantryBulk";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

const acceptSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        pricePerUnit: z.number().nonnegative().nullable().optional(),
        categoryId: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
  storeId: z.number().int().positive().nullable().optional(),
  expenseId: z.number().int().positive().nullable().optional(),
  defaultCategoryId: z.number().int().positive().nullable().optional(),
});

export const personalPantrySuggestionsRouter = router({
  // Confirmar: agrega/repone los productos seleccionados en la alacena
  accept: ownerOnlyProcedure
    .input(acceptSchema)
    .mutation(async ({ ctx, input }) => {
      return await bulkCreateOrRestockPantryItems(
        ctx.user.id,
        input.products,
        {
          storeId: input.storeId ?? null,
          expenseId: input.expenseId ?? null,
          defaultCategoryId: input.defaultCategoryId ?? null,
        },
      );
    }),
});
