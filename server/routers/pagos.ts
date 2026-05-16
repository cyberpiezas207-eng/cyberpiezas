import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  transferPaymentRequests,
  users,
} from "../../drizzle/schema";
import * as db from "../db";
import { createNotification } from "./notifications";

async function getDbOrThrow() {
  const conn = await db.getDbOrThrow();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

// =============================================================================
// CATALOGO DE PLANES (estatico)
// =============================================================================

const POS_PRICES: Record<string, { monthly: number; yearly: number; name: string; icon: string }> = {
  boutique: { monthly: 300, yearly: 3000, name: "Boutique", icon: "👗" },
  abarrotes: { monthly: 300, yearly: 3000, name: "Abarrotes", icon: "🛒" },
  veterinaria: { monthly: 300, yearly: 3000, name: "Veterinaria", icon: "🐾" },
  verduleria: { monthly: 300, yearly: 3000, name: "Verduleria", icon: "🥕" },
  tarima: { monthly: 150, yearly: 1500, name: "Tarima", icon: "🎤" },
};

const DISCOUNT_DAYS = [7, 20];
const DISCOUNT_PERCENTAGE = 20;

// =============================================================================
// HELPERS
// =============================================================================

function isDiscountDay(): boolean {
  return DISCOUNT_DAYS.includes(new Date().getDate());
}

function calculatePrice(posCode: string, planType: "monthly" | "yearly") {
  const prices = POS_PRICES[posCode];
  if (!prices) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "POS no valido" });
  }
  const originalAmount = planType === "monthly" ? prices.monthly : prices.yearly;
  if (planType === "monthly" && isDiscountDay()) {
    return {
      originalAmount,
      finalAmount: originalAmount * (1 - DISCOUNT_PERCENTAGE / 100),
      discountApplied: true,
      discountPercentage: DISCOUNT_PERCENTAGE,
    };
  }
  return {
    originalAmount,
    finalAmount: originalAmount,
    discountApplied: false,
    discountPercentage: 0,
  };
}

// Parsea el campo notes (JSON) de transferPaymentRequests
function parseNotesData(notes: string | null): {
  posCode?: string;
  originalAmount?: number;
  finalAmount?: number;
  discountApplied?: boolean;
  discountPercentage?: number;
  paymentMethod?: string;
  customerNotes?: string;
} {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

// Enriquece una request con los datos de notes
function enrichRequest(req: any) {
  const data = parseNotesData(req.notes);
  return {
    id: req.id,
    userId: req.userId,
    posCode: data.posCode ?? "boutique",
    planType: req.billingType === "monthly" ? "monthly" : "yearly",
    originalAmount: String(data.originalAmount ?? req.amount),
    finalAmount: String(data.finalAmount ?? req.amount),
    discountApplied: data.discountApplied ?? false,
    discountPercentage: data.discountPercentage ?? 0,
    paymentMethod: data.paymentMethod ?? "transferencia",
    proofUrl: req.proofUrl,
    customerNotes: data.customerNotes ?? "",
    status: req.status === "canceled" ? "cancelled" : req.status,
    adminNotes: req.notes && req.status !== "pending" ? (data.adminNotes ?? "") : "",
    reviewedAt: req.reviewedAt,
    createdAt: req.createdAt,
    // Para suscripciones activas
    startDate: req.periodStart,
    endDate: req.periodEnd,
    amountPaid: req.amount,
    planTypeForSub: req.billingType,
  };
}

async function requireAdmin(userId: number) {
  const conn = await getDbOrThrow();
  const userRows = await conn.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows[0] || userRows[0].role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin" });
  }
}

// =============================================================================
// ROUTER
// =============================================================================

export const pagosRouter = router({
  // =========================================================================
  // PLANES (publico)
  // =========================================================================
  plans: router({
    list: publicProcedure.query(() => {
      const isDiscount = isDiscountDay();
      return Object.entries(POS_PRICES).map(([code, info]) => ({
        posCode: code,
        name: info.name,
        icon: info.icon,
        monthly: {
          originalAmount: info.monthly,
          finalAmount: isDiscount ? info.monthly * (1 - DISCOUNT_PERCENTAGE / 100) : info.monthly,
          discountApplied: isDiscount,
          discountPercentage: isDiscount ? DISCOUNT_PERCENTAGE : 0,
        },
        yearly: {
          originalAmount: info.yearly,
          finalAmount: info.yearly,
          discountApplied: false,
          discountPercentage: 0,
        },
      }));
    }),

    todayDiscount: publicProcedure.query(() => {
      const isDiscount = isDiscountDay();
      return {
        active: isDiscount,
        percentage: isDiscount ? DISCOUNT_PERCENTAGE : 0,
        daysOfMonth: DISCOUNT_DAYS,
        today: new Date().getDate(),
      };
    }),
  }),

  // =========================================================================
  // SOLICITUDES DE PAGO
  // =========================================================================
  requests: router({
    create: protectedProcedure
      .input(
        z.object({
          posCode: z.enum(["boutique", "abarrotes", "veterinaria", "verduleria", "tarima"]),
          planType: z.enum(["monthly", "yearly"]),
          paymentMethod: z.enum(["transferencia", "efectivo", "mercadopago"]),
          proofUrl: z.string().max(1000).optional(),
          customerNotes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const pricing = calculatePrice(input.posCode, input.planType);

        // Verificar que no haya pendiente del mismo POS
        const existing = await conn
          .select()
          .from(transferPaymentRequests)
          .where(
            and(
              eq(transferPaymentRequests.userId, ctx.user.id),
              eq(transferPaymentRequests.status, "pending"),
            ),
          );
        for (const e of existing) {
          const data = parseNotesData(e.notes);
          if (data.posCode === input.posCode) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Ya tienes una solicitud pendiente para este POS",
            });
          }
        }

        // Empacar la metadata extra en el campo notes
        const notesPayload = JSON.stringify({
          posCode: input.posCode,
          originalAmount: pricing.originalAmount,
          finalAmount: pricing.finalAmount,
          discountApplied: pricing.discountApplied,
          discountPercentage: pricing.discountPercentage,
          paymentMethod: input.paymentMethod,
          customerNotes: input.customerNotes ?? "",
        });

        // Insertar en la tabla existente
        const result = await conn.insert(transferPaymentRequests).values({
          userId: ctx.user.id,
          planCode: "premium",
          planName: POS_PRICES[input.posCode].name + " " + (input.planType === "monthly" ? "Mensual" : "Anual"),
          billingType: input.planType === "monthly" ? "monthly" : "annual",
          amount: String(pricing.finalAmount),
          currency: "MXN",
          payerName: ctx.user.id.toString(),
          transferReference: "CYB-" + Date.now(),
          proofUrl: input.proofUrl,
          notes: notesPayload,
          status: "pending",
        });
        const requestId = (result as any).insertId as number;

        // Notificar a admins
        try {
          const admins = await conn.select().from(users).where(eq(users.role, "admin"));
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: "payment_received",
              title: "Nueva solicitud de pago",
              message:
                POS_PRICES[input.posCode].name +
                " - $" +
                pricing.finalAmount.toFixed(2) +
                " (" + (input.planType === "monthly" ? "Mensual" : "Anual") + ")",
              relatedId: requestId,
            });
          }
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true, requestId };
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(transferPaymentRequests)
        .where(eq(transferPaymentRequests.userId, ctx.user.id))
        .orderBy(desc(transferPaymentRequests.createdAt));
      return rows.map(enrichRequest);
    }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        await conn
          .update(transferPaymentRequests)
          .set({ status: "canceled" })
          .where(
            and(
              eq(transferPaymentRequests.id, input.id),
              eq(transferPaymentRequests.userId, ctx.user.id),
              eq(transferPaymentRequests.status, "pending"),
            ),
          );
        return { success: true };
      }),
  }),

  // =========================================================================
  // ADMIN
  // =========================================================================
  admin: router({
    listAll: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
          limit: z.number().default(100),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const statusFilter = input?.status;
        // Mapear "cancelled" del input al "canceled" de la tabla
        const mappedStatus = statusFilter === "cancelled" ? "canceled" : statusFilter;
        const query = mappedStatus
          ? conn.select().from(transferPaymentRequests).where(eq(transferPaymentRequests.status, mappedStatus as any))
          : conn.select().from(transferPaymentRequests);
        const requests = await query
          .orderBy(desc(transferPaymentRequests.createdAt))
          .limit(input?.limit ?? 100);
        const enriched = [];
        for (const req of requests) {
          const userRows = await conn.select().from(users).where(eq(users.id, req.userId)).limit(1);
          const enrichedReq = enrichRequest(req);
          enriched.push({
            ...enrichedReq,
            customerName: userRows[0]?.name ?? "Desconocido",
            customerEmail: userRows[0]?.email ?? "",
          });
        }
        return enriched;
      }),

    approve: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          adminNotes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const reqRows = await conn
          .select()
          .from(transferPaymentRequests)
          .where(eq(transferPaymentRequests.id, input.requestId))
          .limit(1);
        const req = reqRows[0];
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya procesada" });
        }
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (req.billingType === "monthly") {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        // Merge adminNotes en el notes JSON
        const existingData = parseNotesData(req.notes);
        const newNotesPayload = JSON.stringify({
          ...existingData,
          adminNotes: input.adminNotes ?? "",
        });
        await conn
          .update(transferPaymentRequests)
          .set({
            status: "approved",
            notes: newNotesPayload,
            reviewedByUserId: ctx.user.id,
            reviewedAt: new Date(),
            activatedAt: new Date(),
            periodStart: startDate,
            periodEnd: endDate,
          })
          .where(eq(transferPaymentRequests.id, input.requestId));

        const data = parseNotesData(req.notes);
        const posName = data.posCode ? (POS_PRICES[data.posCode]?.name ?? data.posCode) : "Sistema";
        try {
          await createNotification({
            userId: req.userId,
            type: "subscription_change",
            title: "Suscripcion activada!",
            message: "Tu acceso a " + posName + " esta activo hasta " + endDate.toLocaleDateString("es-MX"),
            relatedId: req.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          adminNotes: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const reqRows = await conn
          .select()
          .from(transferPaymentRequests)
          .where(eq(transferPaymentRequests.id, input.requestId))
          .limit(1);
        const req = reqRows[0];
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (req.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya procesada" });
        }
        const existingData = parseNotesData(req.notes);
        const newNotesPayload = JSON.stringify({
          ...existingData,
          adminNotes: input.adminNotes,
        });
        await conn
          .update(transferPaymentRequests)
          .set({
            status: "rejected",
            notes: newNotesPayload,
            reviewedByUserId: ctx.user.id,
            reviewedAt: new Date(),
          })
          .where(eq(transferPaymentRequests.id, input.requestId));

        try {
          await createNotification({
            userId: req.userId,
            type: "subscription_change",
            title: "Solicitud rechazada",
            message: "Motivo: " + input.adminNotes,
            relatedId: req.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      await requireAdmin(ctx.user.id);
      const conn = await getDbOrThrow();
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      const monthRequests = await conn
        .select()
        .from(transferPaymentRequests)
        .where(
          and(
            gte(transferPaymentRequests.createdAt, firstOfMonth),
            lte(transferPaymentRequests.createdAt, lastOfMonth),
          ),
        );
      const approved = monthRequests.filter((r) => r.status === "approved");
      const pending = await conn
        .select()
        .from(transferPaymentRequests)
        .where(eq(transferPaymentRequests.status, "pending"));
      const monthRevenue = approved.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      return {
        pendingCount: pending.length,
        monthApprovedCount: approved.length,
        monthRevenue: monthRevenue.toFixed(2),
        monthRequestsCount: monthRequests.length,
      };
    }),
  }),

  // =========================================================================
  // SUSCRIPCIONES (aprobadas)
  // =========================================================================
  subscriptions: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(transferPaymentRequests)
        .where(
          and(
            eq(transferPaymentRequests.userId, ctx.user.id),
            eq(transferPaymentRequests.status, "approved"),
          ),
        )
        .orderBy(desc(transferPaymentRequests.createdAt));
      // Enriquecer y mapear como suscripciones
      return rows.map((req) => {
        const data = parseNotesData(req.notes);
        const now = new Date();
        const endDate = req.periodEnd ? new Date(req.periodEnd) : now;
        const isActive = endDate > now;
        return {
          id: req.id,
          userId: req.userId,
          posCode: data.posCode ?? "boutique",
          planType: req.billingType === "monthly" ? "monthly" : "yearly",
          status: isActive ? "active" : "expired",
          startDate: req.periodStart,
          endDate: req.periodEnd,
          amountPaid: req.amount,
          createdAt: req.createdAt,
        };
      });
    }),

    hasAccess: protectedProcedure
      .input(z.object({ posCode: z.enum(["boutique", "abarrotes", "veterinaria", "verduleria", "tarima"]) }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const now = new Date();
        const rows = await conn
          .select()
          .from(transferPaymentRequests)
          .where(
            and(
              eq(transferPaymentRequests.userId, ctx.user.id),
              eq(transferPaymentRequests.status, "approved"),
              gte(transferPaymentRequests.periodEnd, now),
            ),
          );
        for (const req of rows) {
          const data = parseNotesData(req.notes);
          if (data.posCode === input.posCode) {
            return {
              hasAccess: true,
              subscription: {
                id: req.id,
                posCode: input.posCode,
                planType: req.billingType,
                endDate: req.periodEnd,
              },
            };
          }
        }
        return { hasAccess: false, subscription: null };
      }),
  }),
});
