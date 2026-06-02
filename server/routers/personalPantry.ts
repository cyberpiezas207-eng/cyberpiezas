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
  findPantryItemByNormalizedName,
} from "../personalPantryDb";
import { analyzePantryLine } from "../personalPantryEngine";

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

    // Captura natural: PREVIEW (sin guardar) - usado por el FAB Universal
    previewCapture: ownerOnlyProcedure
      .input(z.object({ text: z.string() }))
      .query(async ({ input }) => {
        return analyzePantryLine(input.text);
      }),

    // Captura natural: QUICK CREATE - crea/actualiza segun el intent
    quickCreate: ownerOnlyProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const detection = analyzePantryLine(input.text);
        const userId = ctx.user.id;

        if (!detection.productName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No detectamos el producto. Intenta: '[producto] [cantidad] [precio]'",
          });
        }

        // Buscar producto existente por nombre normalizado
        const existing = await findPantryItemByNormalizedName(
          userId,
          detection.productName,
        );

        // ---- Caso 1: mark_out (se acabo) ----
        if (detection.intent === "mark_out") {
          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `No tienes "${detection.productName}" en tu alacena. Agregalo primero.`,
            });
          }
          const updated = await markPantryItemOut(userId, existing.id);
          return {
            action: "marked_out" as const,
            item: updated,
            detection,
          };
        }

        // ---- Caso 2: mark_low (queda poco) ----
        if (detection.intent === "mark_low") {
          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `No tienes "${detection.productName}" en tu alacena. Agregalo primero.`,
            });
          }
          const updated = await markPantryItemLow(userId, existing.id);
          return {
            action: "marked_low" as const,
            item: updated,
            detection,
          };
        }

        // ---- Caso 3: add_or_restock ----
        let item = existing;
        let action: "added" | "restocked";

        if (!item) {
          // Producto nuevo: crear primero
          item = await createPantryItem(userId, {
            name: detection.productName,
            unit: detection.unit ?? null,
          });
          action = "added";
        } else {
          action = "restocked";
        }

        // Si tenemos precio o tienda, registrar restock
        if (
          detection.totalPrice != null ||
          detection.storeName != null ||
          action === "added"
        ) {
          const restocked = await markPantryItemRestocked(userId, item.id, {
            price: detection.totalPrice ?? null,
            storeId: null, // No tenemos storeId aun (solo storeName); el restock lo manejara
            expenseId: null,
          });
          if (restocked) item = restocked;
        }

        return {
          action,
          item,
          detection,
        };
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
