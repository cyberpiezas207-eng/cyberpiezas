// ============================================================================
// ROUTER tRPC - Captura detallada de gastos
// ----------------------------------------------------------------------------
// createDetailed: crea gasto con campos separados (monto opcional = pendiente)
// setAmount: asigna monto a un gasto pendiente
// Blindado ownerOnly. No toca el router personalExpenses original.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  createDetailedExpense,
  setPendingExpenseAmount,
} from "../personalExpensesCaptureDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

const paymentEnum = z.enum(["cash", "debit", "credit", "transfer", "other"]);

export const personalExpensesCaptureRouter = router({
  createDetailed: ownerOnlyProcedure
    .input(
      z.object({
        description: z.string().min(1).max(255),
        amount: z.number().nonnegative().nullable().optional(),
        categoryId: z.number().int().positive().nullable().optional(),
        storeId: z.number().int().positive().nullable().optional(),
        storeName: z.string().max(255).nullable().optional(),
        expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        paymentMethod: paymentEnum.optional(),
        notes: z.string().max(1000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await createDetailedExpense(ctx.user.id, {
        description: input.description,
        amount: input.amount ?? null,
        categoryId: input.categoryId ?? null,
        storeId: input.storeId ?? null,
        storeName: input.storeName ?? null,
        expenseDate: input.expenseDate,
        paymentMethod: input.paymentMethod ?? "cash",
        notes: input.notes ?? null,
      });
    }),

  setAmount: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        amount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await setPendingExpenseAmount(ctx.user.id, input.id, input.amount);
    }),
});
