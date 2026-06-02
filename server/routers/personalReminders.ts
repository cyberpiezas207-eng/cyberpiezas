// ============================================================================
// ROUTER tRPC - Modulo Recordatorios
// ----------------------------------------------------------------------------
// Endpoints organizados en sub-routers:
//   - reminders: CRUD principal + acciones (markDone, snooze, dismiss)
//   - stats: dashboard stats
//
// Auth: ownerOnlyProcedure (modulo personal, solo el dueño).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { z } from "zod";
import {
  listReminders,
  getReminder,
  createReminder,
  updateReminder,
  markReminderDone,
  snoozeReminder,
  dismissReminder,
  softDeleteReminder,
  getDashboardStats,
  type ReminderFilter,
} from "../personalRemindersDb";
import { analyzeReminderLine } from "../personalRemindersEngine";

// ----------------------------------------------------------------------------
// Procedure owner-only
// ----------------------------------------------------------------------------

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next({ ctx });
});

// ----------------------------------------------------------------------------
// Zod schemas
// ----------------------------------------------------------------------------

const RecurrencePatternEnum = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
const SourceModuleEnum = z.enum([
  "manual",
  "debt",
  "subscription",
  "vehicle",
  "pantry",
]);
const FilterEnum = z.enum([
  "all",
  "pending",
  "today",
  "upcoming",
  "overdue",
  "done",
]);

// ----------------------------------------------------------------------------
// Router principal
// ----------------------------------------------------------------------------

export const personalRemindersRouter = router({
  // =========================================================================
  // CRUD principal
  // =========================================================================
  reminders: router({
    list: ownerOnlyProcedure
      .input(
        z.object({
          filter: FilterEnum.default("pending"),
          limit: z.number().int().min(1).max(500).default(100),
        }),
      )
      .query(async ({ ctx, input }) => {
        return listReminders(
          ctx.user.id,
          input.filter as ReminderFilter,
          input.limit,
        );
      }),

    get: ownerOnlyProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getReminder(ctx.user.id, input.id);
      }),

    // Captura de texto natural - PREVIEW (no guarda)
    previewCapture: ownerOnlyProcedure
      .input(z.object({ text: z.string() }))
      .query(async ({ input }) => {
        return analyzeReminderLine(input.text);
      }),

    // Captura de texto natural - QUICK CREATE
    quickCreate: ownerOnlyProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const detection = analyzeReminderLine(input.text);

        if (!detection.title) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No detectamos un titulo. Intenta: 'recordar [que] [cuando]'",
          });
        }

        return createReminder(ctx.user.id, {
          title: detection.title,
          dueDate: detection.dueDate,
          dueTime: detection.dueTime,
          priority: detection.priority,
          isRecurring: detection.isRecurring,
          recurrencePattern: detection.recurrencePattern as any,
          tags: detection.tags,
          sourceModule: "manual",
        });
      }),

    // Create manual con todos los campos
    create: ownerOnlyProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional().nullable(),
          dueDate: z.string().optional().nullable(),
          dueTime: z.string().optional().nullable(),
          isRecurring: z.boolean().optional(),
          recurrencePattern: RecurrencePatternEnum.optional().nullable(),
          recurrenceUntil: z.string().optional().nullable(),
          sourceModule: SourceModuleEnum.optional(),
          sourceId: z.number().optional().nullable(),
          priority: PriorityEnum.optional(),
          icon: z.string().max(20).optional().nullable(),
          color: z.string().max(20).optional().nullable(),
          tags: z.array(z.string()).optional().nullable(),
          notes: z.string().optional().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return createReminder(ctx.user.id, input as any);
      }),

    update: ownerOnlyProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          description: z.string().optional().nullable(),
          dueDate: z.string().optional().nullable(),
          dueTime: z.string().optional().nullable(),
          snoozedUntil: z.string().optional().nullable(),
          isRecurring: z.boolean().optional(),
          recurrencePattern: RecurrencePatternEnum.optional().nullable(),
          recurrenceUntil: z.string().optional().nullable(),
          priority: PriorityEnum.optional(),
          icon: z.string().max(20).optional().nullable(),
          color: z.string().max(20).optional().nullable(),
          tags: z.array(z.string()).optional().nullable(),
          notes: z.string().optional().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateReminder(ctx.user.id, id, data as any);
      }),

    // Marcar como completado (auto-crea siguiente si es recurrente)
    markDone: ownerOnlyProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return markReminderDone(ctx.user.id, input.id);
      }),

    // Posponer hasta una fecha
    snooze: ownerOnlyProcedure
      .input(
        z.object({
          id: z.number(),
          untilDate: z.string(), // YMD
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return snoozeReminder(ctx.user.id, input.id, input.untilDate);
      }),

    // Atajos de snooze comunes (manana, 3 dias, 1 semana)
    snoozeQuick: ownerOnlyProcedure
      .input(
        z.object({
          id: z.number(),
          preset: z.enum(["tomorrow", "in_3_days", "in_1_week", "in_1_month"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const now = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const offsets = {
          tomorrow: 1,
          in_3_days: 3,
          in_1_week: 7,
          in_1_month: 30,
        };
        const days = offsets[input.preset];
        const target = new Date(now);
        target.setDate(target.getDate() + days);
        const ymd = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
        return snoozeReminder(ctx.user.id, input.id, ymd);
      }),

    dismiss: ownerOnlyProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return dismissReminder(ctx.user.id, input.id);
      }),

    softDelete: ownerOnlyProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return softDeleteReminder(ctx.user.id, input.id);
      }),
  }),

  // =========================================================================
  // STATS
  // =========================================================================
  stats: router({
    dashboard: ownerOnlyProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),
  }),
});
