// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/routers/personalServices.ts <<<
// ============================================================================
// ROUTER - Servicios fijos (recibos que se repiten cada mes)
// ----------------------------------------------------------------------------
// Blindado solo para el dueno (ownerOnlyProcedure). Expone: listar, resumen
// del mes, crear, editar, archivar y marcar pagado.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listServices,
  getServicesSummary,
  createService,
  updateService,
  archiveService,
  markServicePaid,
} from "../personalServicesDb";

// Solo el dueno principal ve y maneja sus servicios fijos.
const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});

export const personalServicesRouter = router({
  // Lista de servicios activos
  list: ownerOnlyProcedure.query(async ({ ctx }) => {
    return await listServices(ctx.user.id);
  }),

  // Resumen del mes: total esperado, pagados y cuales faltan
  summary: ownerOnlyProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await getServicesSummary(ctx.user.id, input.year, input.month);
    }),

  // Crear un servicio
  create: ownerOnlyProcedure
    .input(
      z.object({
        name: z.string().min(1, "Ponle un nombre al servicio"),
        amount: z.number().positive().nullable().optional(),
        dueDay: z.number().int().min(1).max(31).nullable().optional(),
        categoryId: z.number().int().positive().nullable().optional(),
        icon: z.string().max(20).nullable().optional(),
        color: z.string().max(20).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createService(ctx.user.id, input);
    }),

  // Editar un servicio
  update: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        amount: z.number().positive().nullable().optional(),
        dueDay: z.number().int().min(1).max(31).nullable().optional(),
        categoryId: z.number().int().positive().nullable().optional(),
        icon: z.string().max(20).nullable().optional(),
        color: z.string().max(20).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await updateService(ctx.user.id, id, data);
    }),

  // Archivar (borrado suave)
  archive: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return await archiveService(ctx.user.id, input.id);
    }),

  // Marcar pagado: crea el gasto del mes y guarda la fecha del pago
  markPaid: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        amount: z.number().positive().nullable().optional(),
        paymentMethod: z
          .enum(["cash", "debit", "credit", "transfer", "other"])
          .optional(),
        expenseDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await markServicePaid(ctx.user.id, input.id, {
        amount: input.amount ?? undefined,
        paymentMethod: input.paymentMethod,
        expenseDate: input.expenseDate,
      });
    }),
});
