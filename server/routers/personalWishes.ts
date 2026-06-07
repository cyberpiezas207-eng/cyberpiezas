// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/routers/personalWishes.ts <<<
// ============================================================================
// ROUTER DESEOS (wishlist con cerebro) - lado del dueno
// ----------------------------------------------------------------------------
// Blindado solo para el dueno (ownerOnlyProcedure). Expone:
//   list / create / update / setStatus / addSaved / delete
//
// El cerebro de viabilidad (viable/ajustado/espera) se calcula en el frontend
// usando estos deseos + el colchon (bolsillos) + el dinero libre. Aqui solo
// guardamos y leemos.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listWishes,
  createWish,
  updateWish,
  setWishStatus,
  addToSaved,
  deleteWish,
} from "../personalWishesDb";

// Solo el dueno principal maneja sus deseos.
const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});

const statusEnum = z.enum(["wishing", "achieved", "dismissed"]);
const priorityEnum = z.enum(["low", "medium", "high"]);

export const personalWishesRouter = router({
  // Lista deseos (filtrable por estado)
  list: ownerOnlyProcedure
    .input(z.object({ status: statusEnum.optional() }).optional())
    .query(async ({ input, ctx }) => {
      return await listWishes(ctx.user.id, input?.status);
    }),

  // Crea un deseo nuevo (el dueno escribe el Xbox, etc.)
  create: ownerOnlyProcedure
    .input(
      z.object({
        title: z.string().min(1).max(160),
        estimatedCost: z.number().positive().max(99999999),
        targetDate: z.string().max(10).nullable().optional(),
        priority: priorityEnum.optional(),
        savedSoFar: z.number().nonnegative().max(99999999).nullable().optional(),
        icon: z.string().max(16).nullable().optional(),
        color: z.string().max(16).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createWish(ctx.user.id, input);
    }),

  // Edita un deseo
  update: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(160).optional(),
        estimatedCost: z.number().positive().max(99999999).optional(),
        targetDate: z.string().max(10).nullable().optional(),
        priority: priorityEnum.optional(),
        savedSoFar: z.number().nonnegative().max(99999999).optional(),
        icon: z.string().max(16).nullable().optional(),
        color: z.string().max(16).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await updateWish(ctx.user.id, id, data);
    }),

  // Cambia estado: deseando / logrado / descartado
  setStatus: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive(), status: statusEnum }))
    .mutation(async ({ input, ctx }) => {
      return await setWishStatus(ctx.user.id, input.id, input.status);
    }),

  // Aparta (o quita) dinero para un deseo
  addSaved: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        amount: z.number().max(99999999).min(-99999999),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await addToSaved(ctx.user.id, input.id, input.amount);
    }),

  // Borra un deseo
  delete: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return await deleteWish(ctx.user.id, input.id);
    }),
});
