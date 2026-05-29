// ============================================================================
// ROUTER tRPC - Admin de categorias y tiendas (gastos)
// ----------------------------------------------------------------------------
// Endpoints para crear, editar y archivar categorias y tiendas desde la UI.
// Blindado ownerOnly. No toca el router personalExpenses original.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  createCategory,
  updateCategory,
  archiveCategory,
  createStore,
  updateStore,
  archiveStore,
} from "../personalExpensesAdminDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

// ---- Schemas de entrada ----------------------------------------------------

const idSchema = z.object({ id: z.number().int().positive() });

const colorRegex = /^#[0-9a-fA-F]{6}$/;

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().max(8).nullable().optional(),
  color: z.string().regex(colorRegex).nullable().optional(),
});

const categoryUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(80).optional(),
  icon: z.string().max(8).nullable().optional(),
  color: z.string().regex(colorRegex).nullable().optional(),
});

const storeCreateSchema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().max(8).nullable().optional(),
  color: z.string().regex(colorRegex).nullable().optional(),
  type: z.string().max(40).nullable().optional(),
});

const storeUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(80).optional(),
  icon: z.string().max(8).nullable().optional(),
  color: z.string().regex(colorRegex).nullable().optional(),
  type: z.string().max(40).nullable().optional(),
});

// ---- Router ----------------------------------------------------------------

export const personalExpensesAdminRouter = router({
  categories: router({
    create: ownerOnlyProcedure
      .input(categoryCreateSchema)
      .mutation(async ({ ctx, input }) => {
        return await createCategory(ctx.user.id, input);
      }),
    update: ownerOnlyProcedure
      .input(categoryUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        return await updateCategory(ctx.user.id, id, rest);
      }),
    archive: ownerOnlyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        return await archiveCategory(ctx.user.id, input.id);
      }),
  }),

  stores: router({
    create: ownerOnlyProcedure
      .input(storeCreateSchema)
      .mutation(async ({ ctx, input }) => {
        return await createStore(ctx.user.id, input);
      }),
    update: ownerOnlyProcedure
      .input(storeUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        return await updateStore(ctx.user.id, id, rest);
      }),
    archive: ownerOnlyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        return await archiveStore(ctx.user.id, input.id);
      }),
  }),
});
