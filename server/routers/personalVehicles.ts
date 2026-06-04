// ============================================================================
// ROUTER tRPC - Modulo Vehiculo
// ----------------------------------------------------------------------------
// Sub-routers:
//   vehicles  : CRUD de vehiculos + setDefault
//   fuelLogs  : CRUD + preview (parser) + quickCreate (parser + save)
//   stats     : dashboard de stats (totales, rendimiento, rango)
//
// Blindado ownerOnly. quickCreate puede crear gasto personal vinculado
// (categoria Gasolina) si createExpense=true.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listVehicles,
  getVehicleById,
  getDefaultVehicle,
  createVehicle,
  updateVehicle,
  archiveVehicle,
  setDefaultVehicle,
  createFuelLog,
  listFuelLogs,
  softDeleteFuelLog,
  getVehicleStats,
} from "../personalVehicleDb";
import { analyzeFuelLine } from "../personalVehicleEngine";
import { createDetailedExpense } from "../personalExpensesCaptureDb";
import {
  setTankReading,
  getTankState,
  listTankReadings,
  applyAutoRefillReading,
} from "../personalVehicleTankDb";
import {
  createMaintenance,
  bulkInitialMaintenance,
  listMaintenance,
  deleteMaintenance,
  getVehicleHealth,
  getPressureRecommendation,
} from "../personalVehicleHealthDb";

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

// ----------------------------------------------------------------------------
// Schemas de input
// ----------------------------------------------------------------------------

const createVehicleSchema = z.object({
  name: z.string().min(1).max(80),
  brand: z.string().max(60).nullable().optional(),
  model: z.string().max(60).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  plate: z.string().max(20).nullable().optional(),
  tankCapacityLiters: z.number().positive().nullable().optional(),
  currentOdometer: z.number().int().nonnegative().nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
  setAsDefault: z.boolean().optional(),
});

const updateVehicleSchema = createVehicleSchema.partial().extend({
  id: z.number().int().positive(),
});

const fuelLogInputSchema = z.object({
  vehicleId: z.number().int().positive(),
  fillDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  amountPaid: z.number().positive(),
  pricePerLiter: z.number().positive(),
  odometerReading: z.number().int().nonnegative().nullable().optional(),
  tankPercentBefore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable()
    .optional(),
  storeId: z.number().int().positive().nullable().optional(),
  storeName: z.string().max(100).nullable().optional(),
  paymentMethod: paymentEnum.optional(),
  notes: z.string().max(500).nullable().optional(),
  createExpense: z.boolean().optional(),
  expenseCategoryId: z.number().int().positive().nullable().optional(),
});

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export const personalVehiclesRouter = router({
  vehicles: router({
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listVehicles(ctx.user.id);
    }),

    getDefault: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await getDefaultVehicle(ctx.user.id);
    }),

    create: ownerOnlyProcedure
      .input(createVehicleSchema)
      .mutation(async ({ ctx, input }) => {
        return await createVehicle(ctx.user.id, input);
      }),

    update: ownerOnlyProcedure
      .input(updateVehicleSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        return await updateVehicle(ctx.user.id, id, rest);
      }),

    archive: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await archiveVehicle(ctx.user.id, input.id);
      }),

    setDefault: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await setDefaultVehicle(ctx.user.id, input.id);
      }),
  }),

  fuelLogs: router({
    list: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive().optional(),
          year: z.number().int().min(2020).max(2100).optional(),
          month: z.number().int().min(1).max(12).optional(),
          limit: z.number().int().min(1).max(500).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await listFuelLogs(ctx.user.id, input);
      }),

    // Preview del parser sin guardar
    previewCapture: ownerOnlyProcedure
      .input(z.object({ text: z.string().min(1).max(500) }))
      .query(async ({ input }) => {
        return analyzeFuelLine(input.text);
      }),

    // Captura rapida: parser + save
    quickCreate: ownerOnlyProcedure
      .input(
        z.object({
          text: z.string().min(1).max(500),
          vehicleId: z.number().int().positive().optional(),
          createExpense: z.boolean().optional(),
          expenseCategoryId: z.number().int().positive().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const detection = analyzeFuelLine(input.text);
        if (
          detection.amountPaid == null ||
          detection.amountPaid <= 0 ||
          detection.pricePerLiter == null ||
          detection.pricePerLiter <= 0
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No se detecto monto o precio/litro. Usa captura detallada.",
          });
        }

        // Usar vehiculo indicado, o el default
        let vehicleId = input.vehicleId;
        if (!vehicleId) {
          const def = await getDefaultVehicle(ctx.user.id);
          if (!def) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Necesitas crear un vehiculo primero antes de capturar gasolina.",
            });
          }
          vehicleId = def.id;
        }

        // Crear gasto vinculado opcional (PRIMERO para tener su id)
        let linkedExpenseId: number | null = null;
        if (input.createExpense) {
          const expense = await createDetailedExpense(ctx.user.id, {
            description: `Gasolina ${detection.storeName ?? ""}`.trim(),
            amount: detection.amountPaid,
            categoryId: input.expenseCategoryId ?? null,
            storeId: null,
            storeName: detection.storeName,
            expenseDate: new Date(Date.now() - 6 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10), // V2: fecha hoy Mexico (UTC-6) para evitar NULL en INSERT
            paymentMethod: "cash",
            notes: input.text,
          } as any);
          linkedExpenseId = (expense as any)?.id ?? null;
        }

        const log = await createFuelLog(ctx.user.id, {
          vehicleId,
          amountPaid: detection.amountPaid,
          pricePerLiter: detection.pricePerLiter,
          odometerReading: detection.odometerReading,
          tankPercentBefore: detection.tankPercentBefore,
          storeName: detection.storeName,
          linkedExpenseId,
        });

        return {
          fuelLog: log,
          detection,
          linkedExpenseId,
        };
      }),

    // Crear fuel log con campos completos (modal detallado)
    create: ownerOnlyProcedure
      .input(fuelLogInputSchema)
      .mutation(async ({ ctx, input }) => {
        // Crear gasto vinculado opcional
        let linkedExpenseId: number | null = null;
        if (input.createExpense) {
          const expense = await createDetailedExpense(ctx.user.id, {
            description: `Gasolina ${input.storeName ?? ""}`.trim(),
            amount: input.amountPaid,
            categoryId: input.expenseCategoryId ?? null,
            storeId: input.storeId ?? null,
            storeName: input.storeName ?? null,
            expenseDate: input.fillDate ?? new Date()
              .toISOString()
              .slice(0, 10),
            paymentMethod: input.paymentMethod ?? "cash",
            notes: input.notes ?? null,
          });
          linkedExpenseId = (expense as any)?.id ?? null;
        }

        const log = await createFuelLog(ctx.user.id, {
          vehicleId: input.vehicleId,
          fillDate: input.fillDate,
          amountPaid: input.amountPaid,
          pricePerLiter: input.pricePerLiter,
          odometerReading: input.odometerReading ?? null,
          tankPercentBefore: input.tankPercentBefore ?? null,
          storeId: input.storeId ?? null,
          storeName: input.storeName ?? null,
          paymentMethod: input.paymentMethod ?? "cash",
          linkedExpenseId,
          notes: input.notes ?? null,
        });

        return { fuelLog: log, linkedExpenseId };
      }),

    softDelete: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await softDeleteFuelLog(ctx.user.id, input.id);
      }),
  }),

  stats: router({
    dashboard: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          year: z.number().int().min(2020).max(2100).optional(),
          month: z.number().int().min(1).max(12).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await getVehicleStats(
          ctx.user.id,
          input.vehicleId,
          input.year,
          input.month,
        );
      }),
  }),

  // --------------------------------------------------------------------------
  // CEREBRO DE TANQUE
  // --------------------------------------------------------------------------
  tank: router({
    // Estado actual del tanque (% + km restantes + factores gasolinera)
    getState: ownerOnlyProcedure
      .input(z.object({ vehicleId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return await getTankState(ctx.user.id, input.vehicleId);
      }),

    // Guardar lectura manual del tanque (boton rapido o input exacto)
    setReading: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          tankPercent: z.number().min(0).max(100),
          odometerAtReading: z
            .number()
            .int()
            .nonnegative()
            .nullable()
            .optional(),
          source: z
            .enum(["quick_button", "exact_input", "auto_refill"])
            .optional(),
          notes: z.string().max(500).nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return await setTankReading(ctx.user.id, input);
      }),

    // Historial de lecturas
    listReadings: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          limit: z.number().int().min(1).max(100).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await listTankReadings(
          ctx.user.id,
          input.vehicleId,
          input.limit,
        );
      }),

    // Aplicar refill automatico (sube tanque tras carga gasolina)
    // Util cuando la UI quiere disparar manualmente esto despues de un fuelLog
    applyRefill: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          litersAdded: z.number().positive(),
          odometerAtFill: z
            .number()
            .int()
            .nonnegative()
            .nullable()
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await applyAutoRefillReading(
          ctx.user.id,
          input.vehicleId,
          input.litersAdded,
          input.odometerAtFill ?? null,
        );
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // SALUD MECANICA + MINI-CEREBRO DE PRESION
  // --------------------------------------------------------------------------
  health: router({
    // Score 0-100 + items (llantas, aceite, afinacion, etc)
    getScore: ownerOnlyProcedure
      .input(z.object({ vehicleId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return await getVehicleHealth(ctx.user.id, input.vehicleId);
      }),

    // Registrar UN mantenimiento
    createMaintenance: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          maintenanceType: z.enum([
            "tire_pressure",
            "oil_change",
            "tune_up",
            "air_filter",
            "brakes",
            "alignment",
            "other",
          ]),
          performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          odometerAtService: z
            .number()
            .int()
            .nonnegative()
            .nullable()
            .optional(),
          cost: z.number().int().nonnegative().nullable().optional(),
          serviceProvider: z.string().max(120).nullable().optional(),
          notes: z.string().max(500).nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return await createMaintenance(ctx.user.id, input);
      }),

    // Captura inicial: muchos mantenimientos de golpe
    // (modal "Cuentale al cerebro lo que ya tienes")
    bulkInitial: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          items: z
            .array(
              z.object({
                maintenanceType: z.enum([
                  "tire_pressure",
                  "oil_change",
                  "tune_up",
                  "air_filter",
                  "brakes",
                  "alignment",
                  "other",
                ]),
                performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                odometerAtService: z
                  .number()
                  .int()
                  .nonnegative()
                  .nullable()
                  .optional(),
                notes: z.string().max(500).nullable().optional(),
              }),
            )
            .min(1)
            .max(20),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return await bulkInitialMaintenance(ctx.user.id, input);
      }),

    // Listar historial completo de mantenimientos del vehiculo
    listMaintenance: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          limit: z.number().int().min(1).max(500).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await listMaintenance(
          ctx.user.id,
          input.vehicleId,
          input.limit,
        );
      }),

    // Borrar un mantenimiento (hard delete, son pocos registros)
    deleteMaintenance: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await deleteMaintenance(ctx.user.id, input.id);
      }),

    // Mini-cerebro de presion: recomienda PSI segun contexto
    recommendPressure: ownerOnlyProcedure
      .input(
        z.object({
          vehicleId: z.number().int().positive(),
          loadLevel: z.enum(["light", "normal", "heavy"]).optional(),
          terrain: z.enum(["city", "highway", "mixed", "rough"]).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await getPressureRecommendation(ctx.user.id, input);
      }),
  }),
});
