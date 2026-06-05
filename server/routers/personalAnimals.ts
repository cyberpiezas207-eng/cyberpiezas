// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/routers/personalAnimals.ts <<<
// ============================================================================
// ROUTER - Modulo Animales
// ----------------------------------------------------------------------------
// Blindado solo para el dueno. Maneja grupos y movimientos, y expone el
// resumen con el "conviene" por grupo.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  archiveAnimal,
  listEvents,
  addEvent,
  deleteEvent,
  getAnimalsSummary,
} from "../personalAnimalsDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});

const eventTypeSchema = z.enum(["gasto", "produccion", "consumo", "venta"]);

export const personalAnimalsRouter = router({
  // --- Grupos ---
  list: ownerOnlyProcedure.query(async ({ ctx }) => {
    return await listAnimals(ctx.user.id);
  }),

  get: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      return await getAnimalById(ctx.user.id, input.id);
    }),

  summary: ownerOnlyProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      return await getAnimalsSummary(ctx.user.id, {
        from: input?.from,
        to: input?.to,
      });
    }),

  create: ownerOnlyProcedure
    .input(
      z.object({
        name: z.string().min(1, "Ponle un nombre al grupo"),
        species: z.string().max(60).nullable().optional(),
        count: z.number().int().min(0).nullable().optional(),
        icon: z.string().max(20).nullable().optional(),
        color: z.string().max(20).nullable().optional(),
        givesReturn: z.boolean().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createAnimal(ctx.user.id, input);
    }),

  update: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        species: z.string().max(60).nullable().optional(),
        count: z.number().int().min(0).nullable().optional(),
        icon: z.string().max(20).nullable().optional(),
        color: z.string().max(20).nullable().optional(),
        givesReturn: z.boolean().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await updateAnimal(ctx.user.id, id, data);
    }),

  archive: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return await archiveAnimal(ctx.user.id, input.id);
    }),

  // --- Movimientos ---
  events: ownerOnlyProcedure
    .input(
      z.object({
        animalId: z.number().int().positive().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await listEvents(ctx.user.id, input);
    }),

  addEvent: ownerOnlyProcedure
    .input(
      z.object({
        animalId: z.number().int().positive(),
        type: eventTypeSchema,
        quantity: z.number().positive().nullable().optional(),
        unitLabel: z.string().max(30).nullable().optional(),
        amount: z.number().positive().nullable().optional(),
        eventDate: z.string().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await addEvent(ctx.user.id, input);
    }),

  deleteEvent: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return await deleteEvent(ctx.user.id, input.id);
    }),
});
