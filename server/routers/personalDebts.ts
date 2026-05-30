// ============================================================================
// ROUTER tRPC - Modulo Deudas
// ----------------------------------------------------------------------------
// Sub-routers:
//   debts    : CRUD + previewCapture (parser) + quickCreate (parser + save)
//   payments : recordPayment + list + softDelete
//   stats    : monthSummary + upcomingPayments
//   assets   : markSold
//
// Blindado ownerOnly. quickCreate solo crea deudas nuevas (new_debt o
// purchase_installment); pagos y ventas requieren seleccionar deuda en UI.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listDebts,
  getDebtById,
  createDebt,
  updateDebt,
  archiveDebt,
  setDebtStatus,
  recordPayment,
  listPayments,
  softDeletePayment,
  markAssetSold,
  getMonthSummary,
  getUpcomingPayments,
} from "../personalDebtsDb";
import { analyzeDebtLine, type DebtCaptureIntent } from "../personalDebtsEngine";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

const statusEnum = z.enum(["active", "paused", "paid", "cancelled"]);
const priorityEnum = z.enum(["low", "medium", "high"]);
const paymentEnum = z.enum(["cash", "debit", "credit", "transfer", "other"]);
const planTypeEnum = z.enum([
  "msi",
  "interest",
  "fixed_payment",
  "informal",
  "other",
]);
const assetStatusEnum = z.enum(["owned", "sold", "lost", "gifted", "archived"]);
const intentEnum = z.enum([
  "new_debt",
  "purchase_installment",
  "payment",
  "partial_payment",
  "asset_sale",
  "ambiguous",
]);

// ----------------------------------------------------------------------------
// Input schemas
// ----------------------------------------------------------------------------

const createDebtSchema = z.object({
  creditorName: z.string().min(1).max(100),
  title: z.string().min(1).max(150),
  description: z.string().max(500).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  originalAmount: z.number().positive().nullable().optional(),
  currentBalance: z.number().nonnegative().nullable().optional(),
  installmentAmount: z.number().positive().nullable().optional(),
  currentInstallment: z.number().int().nonnegative().nullable().optional(),
  totalInstallments: z.number().int().positive().max(100).nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  isInstallmentPurchase: z.boolean().optional(),
  installmentPlanType: planTypeEnum.nullable().optional(),
  paymentMethod: paymentEnum.nullable().optional(),
  linkedAssetName: z.string().max(150).nullable().optional(),
  assetStatus: assetStatusEnum.nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  icon: z.string().max(8).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const updateDebtSchema = createDebtSchema.partial().extend({
  id: z.number().int().positive(),
});

const recordPaymentSchema = z.object({
  debtId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  installmentNumber: z.number().int().positive().nullable().optional(),
  paymentMethod: paymentEnum.optional(),
  isPartial: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  createExpense: z.boolean().optional(),
  expenseCategoryId: z.number().int().positive().nullable().optional(),
});

const markAssetSoldSchema = z.object({
  debtId: z.number().int().positive(),
  soldPrice: z.number().positive(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  soldBuyer: z.string().max(100).nullable().optional(),
  soldNotes: z.string().max(1000).nullable().optional(),
});

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export const personalDebtsRouter = router({
  debts: router({
    list: ownerOnlyProcedure
      .input(
        z
          .object({
            status: statusEnum.optional(),
            priority: priorityEnum.optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        return await listDebts(ctx.user.id, input ?? {});
      }),

    get: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return await getDebtById(ctx.user.id, input.id);
      }),

    create: ownerOnlyProcedure
      .input(createDebtSchema)
      .mutation(async ({ ctx, input }) => {
        return await createDebt(ctx.user.id, input);
      }),

    update: ownerOnlyProcedure
      .input(updateDebtSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        return await updateDebt(ctx.user.id, id, rest);
      }),

    archive: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await archiveDebt(ctx.user.id, input.id);
      }),

    setStatus: ownerOnlyProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: statusEnum,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return await setDebtStatus(ctx.user.id, input.id, input.status);
      }),

    previewCapture: ownerOnlyProcedure
      .input(
        z.object({
          text: z.string().min(1).max(500),
          forcedIntent: intentEnum.optional(),
        }),
      )
      .query(async ({ input }) => {
        return analyzeDebtLine(input.text, {
          forcedIntent:
            input.forcedIntent &&
            input.forcedIntent !== "ambiguous"
              ? (input.forcedIntent as DebtCaptureIntent)
              : undefined,
        });
      }),

    quickCreate: ownerOnlyProcedure
      .input(
        z.object({
          text: z.string().min(1).max(500),
          forcedIntent: intentEnum.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const detection = analyzeDebtLine(input.text, {
          forcedIntent:
            input.forcedIntent &&
            input.forcedIntent !== "ambiguous"
              ? (input.forcedIntent as DebtCaptureIntent)
              : undefined,
        });

        // Solo soportamos creacion de deudas via quickCreate
        if (
          detection.intent !== "new_debt" &&
          detection.intent !== "purchase_installment"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Para pagos, abonos o ventas selecciona primero la deuda en la lista.",
          });
        }

        if (!detection.creditorName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No se detecto acreedor. Usa captura detallada.",
          });
        }
        if (!detection.conceptName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No se detecto concepto. Usa captura detallada.",
          });
        }

        const isPurchase = detection.intent === "purchase_installment";
        const debt = await createDebt(ctx.user.id, {
          creditorName: detection.creditorName,
          title: detection.conceptName,
          originalAmount: detection.originalAmount,
          currentBalance: detection.currentBalance,
          installmentAmount: detection.installmentAmount,
          currentInstallment: detection.currentInstallment ?? 0,
          totalInstallments: detection.totalInstallments,
          dueDay: detection.dueDay,
          isInstallmentPurchase: isPurchase,
          installmentPlanType: detection.isMsi
            ? "msi"
            : isPurchase
              ? "fixed_payment"
              : null,
          // Si fue compra a meses, vinculamos el concepto como activo
          linkedAssetName: isPurchase ? detection.conceptName : null,
          assetStatus: isPurchase ? "owned" : null,
        });

        return { debt, detection };
      }),
  }),

  payments: router({
    list: ownerOnlyProcedure
      .input(
        z.object({
          debtId: z.number().int().positive().optional(),
          year: z.number().int().min(2020).max(2100).optional(),
          month: z.number().int().min(1).max(12).optional(),
          limit: z.number().int().min(1).max(500).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await listPayments(ctx.user.id, input);
      }),

    record: ownerOnlyProcedure
      .input(recordPaymentSchema)
      .mutation(async ({ ctx, input }) => {
        return await recordPayment(ctx.user.id, input);
      }),

    softDelete: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await softDeletePayment(ctx.user.id, input.id);
      }),
  }),

  stats: router({
    monthSummary: ownerOnlyProcedure
      .input(
        z.object({
          year: z.number().int().min(2020).max(2100),
          month: z.number().int().min(1).max(12),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await getMonthSummary(ctx.user.id, input.year, input.month);
      }),

    upcoming: ownerOnlyProcedure
      .input(
        z
          .object({
            daysAhead: z.number().int().min(1).max(365).optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        return await getUpcomingPayments(ctx.user.id, input?.daysAhead ?? 30);
      }),
  }),

  assets: router({
    markSold: ownerOnlyProcedure
      .input(markAssetSoldSchema)
      .mutation(async ({ ctx, input }) => {
        return await markAssetSold(ctx.user.id, input);
      }),
  }),
});
