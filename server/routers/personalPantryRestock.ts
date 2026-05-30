// ============================================================================
// ROUTER tRPC - "Comprar de nuevo" (con precio + gasto opcional)
// ----------------------------------------------------------------------------
// Un solo endpoint submitRestock que llama al compositor que orquesta
// reponer + grabar precio + opcionalmente crear gasto.
// Blindado ownerOnly. No toca el router personalPantry original.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { restockItemWithPrice } from "../personalPantryRestockDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

const submitRestockSchema = z.object({
  itemId: z.number().int().positive(),
  price: z.number().nonnegative().nullable().optional(),
  storeId: z.number().int().positive().nullable().optional(),
  storeName: z.string().max(255).nullable().optional(),
  createExpense: z.boolean().optional(),
  expenseCategoryId: z.number().int().positive().nullable().optional(),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const personalPantryRestockRouter = router({
  submitRestock: ownerOnlyProcedure
    .input(submitRestockSchema)
    .mutation(async ({ ctx, input }) => {
      return await restockItemWithPrice(ctx.user.id, {
        itemId: input.itemId,
        price: input.price ?? null,
        storeId: input.storeId ?? null,
        storeName: input.storeName ?? null,
        createExpense: input.createExpense ?? false,
        expenseCategoryId: input.expenseCategoryId ?? null,
        expenseDate: input.expenseDate,
      });
    }),
});
