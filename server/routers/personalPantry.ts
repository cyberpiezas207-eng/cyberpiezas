// ============================================================================
// ROUTER tRPC - Alacena personal
// ----------------------------------------------------------------------------
// Endpoints blindados (ownerOnly) que exponen la capa de BD a la UI.
// Mismo patron que personalExpenses router.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  createPantryItem,
  listPantryItems,
  getPantryItemById,
  setPantryStockPercent,
  consumePantryItem,
  markPantryItemLow,
  markPantryItemOut,
  markPantryItemRestocked,
  togglePantryShoppingList,
  listShoppingList,
  archivePantryItem,
  getPantryStats,
} from "../personalPantryDb";

// ----------------------------------------------------------------------------
// Blindaje: solo el dueño (mismo patron que personalOperations / personalExpenses)
// ----------------------------------------------------------------------------

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

// ----------------------------------------------------------------------------
// Schemas de entrada
// ----------------------------------------------------------------------------

const idSchema = z.object({ id: z.number().int().positive() });

const statusSchema = z.enum(["available", "low", "out", "archived"]);
const prioritySchema = z.enum(["low", "normal", "high"]);

const listItemsSchema = z
  .object({
    status: statusSchema.optional(),
    onShoppingList: z.boolean().optional(),
    search: z.string().max(160).optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .optional();

const createItemSchema = z.object({
  name: z.string().min(1).max(160),
  categoryId: z.number().int().positive().nullable().optional(),
  storeId: z.number().int().positive().nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  stockPercent: z.number().int().min(0).max(100).optional(),
  priority: prioritySchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const setStockSchema = z.object({
  id: z.number().int().positive(),
  stockPercent: z.number().int().min(0).max(100),
  note: z.string().max(255).nullable().optional(),
});

const consumeSchema = z.object({
  id: z.number().int().positive(),
  step: z.number().int().min(1).max(100).optional(),
});

const restockedSchema = z.object({
  id: z.number().int().positive(),
  storeId: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  expenseId: z.number().int().positive().nullable().optional(),
});

const toggleShoppingListSchema = z.object({
  id: z.number().int().positive(),
  on: z.boolean(),
  priority: prioritySchema.optional(),
});

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export const personalPantryRouter = router({
  // -- Productos ----------------------------------------------------------
  items: router({
    list: ownerOnlyProcedure.input(listItemsSchema).query(async ({ ctx, input }) => {
      return await listPantryItems(ctx.user.id, input ?? {});
    }),

    getById: ownerOnlyProcedure.input(idSchema).query(async ({ ctx, input }) => {
      return await getPantryItemById(ctx.user.id, input.id);
    }),

    create: ownerOnlyProcedure
      .input(createItemSchema)
      .mutation(async ({ ctx, input }) => {
        return await createPantryItem(ctx.user.id, input);
      }),

    archive: ownerOnlyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        return await archivePantryItem(ctx.user.id, input.id);
      }),
  }),

  // -- Acciones rapidas de nivel ------------------------------------------
  actions: router({
    setStock: ownerOnlyProcedure
      .input(setStockSchema)
      .mutation(async ({ ctx, input }) => {
        return await setPantryStockPercent(
          ctx.user.id,
          input.id,
          input.stockPercent,
          input.note ?? null,
        );
      }),

    consume: ownerOnlyProcedure
      .input(consumeSchema)
      .mutation(async ({ ctx, input }) => {
        return await consumePantryItem(ctx.user.id, input.id, input.step ?? 25);
      }),

    markLow: ownerOnlyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        return await markPantryItemLow(ctx.user.id, input.id);
      }),

    markOut: ownerOnlyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        return await markPantryItemOut(ctx.user.id, input.id);
      }),

    // "Comprar de nuevo": vuelve a 100% y guarda precio/tienda actuales
    restocked: ownerOnlyProcedure
      .input(restockedSchema)
      .mutation(async ({ ctx, input }) => {
        return await markPantryItemRestocked(ctx.user.id, input.id, {
          storeId: input.storeId ?? null,
          price: input.price ?? null,
          expenseId: input.expenseId ?? null,
        });
      }),
  }),

  // -- Lista de compra ----------------------------------------------------
  shoppingList: router({
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listShoppingList(ctx.user.id);
    }),

    toggle: ownerOnlyProcedure
      .input(toggleShoppingListSchema)
      .mutation(async ({ ctx, input }) => {
        return await togglePantryShoppingList(
          ctx.user.id,
          input.id,
          input.on,
          input.priority,
        );
      }),
  }),

  // -- Stats (alimenta cards y barras) ------------------------------------
  stats: router({
    get: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await getPantryStats(ctx.user.id);
    }),
  }),
});
