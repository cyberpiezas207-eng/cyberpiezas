import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  posPaymentRequests,
  posSubscriptions,
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
// CATALOGO DE PLANES (estatico, en codigo - facil de cambiar)
// =============================================================================

const POS_PRICES: Record<string, { monthly: number; yearly: number; name: string; icon: string }> = {
  boutique: { monthly: 300, yearly: 3000, name: "Boutique", icon: "👗" },
  abarrotes: { monthly: 300, yearly: 3000, name: "Abarrotes", icon: "🛒" },
  veterinaria: { monthly: 300, yearly: 3000, name: "Veterinaria", icon: "🐾" },
  verduleria: { monthly: 300, yearly: 3000, name: "Verduleria", icon: "🥕" },
  tarima: { monthly: 150, yearly: 1500, name: "Tarima", icon: "🎤" },
};

// Dias del mes con descuento del 20% (solo en planes mensuales)
const DISCOUNT_DAYS = [7, 20];
const DISCOUNT_PERCENTAGE = 20;

// =============================================================================
// HELPERS
// =============================================================================

function isDiscountDay(): boolean {
  const today = new Date();
  return DISCOUNT_DAYS.includes(today.getDate());
}

function calculatePrice(posCode: string, planType: "monthly" | "yearly"): {
  originalAmount: number;
  finalAmount: number;
  discountApplied: boolean;
  discountPercentage: number;
} {
  const prices = POS_PRICES[posCode];
  if (!prices) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "POS no valido" });
  }
  const originalAmount = planType === "monthly" ? prices.monthly : prices.yearly;
  // Descuento solo en plan mensual y solo dias 7 y 20
  if (planType === "monthly" && isDiscountDay()) {
    const finalAmount = originalAmount * (1 - DISCOUNT_PERCENTAGE / 100);
    return {
      originalAmount,
      finalAmount,
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

// Verifica si el usuario es admin (cyberpiezas207@gmail.com)
async function requireAdmin(userId: number) {
  const conn = await getDbOrThrow();
  const userRows = await conn.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user || user.role !== "admin") {
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
    // Lista todos los planes con precios actuales (incluye descuento si aplica)
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

    // Info del descuento de hoy
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
    // Crear una solicitud (el usuario quiere comprar)
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
        // Calcular precio actual con descuento si aplica
        const pricing = calculatePrice(input.posCode, input.planType);

        // Verificar que no tenga ya una solicitud pendiente del mismo POS
        const existing = await conn
          .select()
          .from(posPaymentRequests)
          .where(
            and(
              eq(posPaymentRequests.userId, ctx.user.id),
              eq(posPaymentRequests.posCode, input.posCode),
              eq(posPaymentRequests.status, "pending"),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya tienes una solicitud pendiente para este POS. Espera respuesta del admin.",
          });
        }

        // Insertar request
        const result = await conn.insert(posPaymentRequests).values({
          userId: ctx.user.id,
          posCode: input.posCode,
          planType: input.planType,
          originalAmount: String(pricing.originalAmount),
          finalAmount: String(pricing.finalAmount),
          discountApplied: pricing.discountApplied,
          discountPercentage: pricing.discountPercentage,
          paymentMethod: input.paymentMethod,
          proofUrl: input.proofUrl,
          customerNotes: input.customerNotes,
          status: "pending",
        });
        const requestId = (result as any).insertId as number;

        // Notificar al admin (todos los admins)
        try {
          const admins = await conn
            .select()
            .from(users)
            .where(eq(users.role, "admin"));
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: "payment_received",
              title: "Nueva solicitud de pago",
              message:
                POS_PRICES[input.posCode].name +
                " - $" +
                pricing.finalAmount.toFixed(2) +
                " (" +
                (input.planType === "monthly" ? "Mensual" : "Anual") +
                ")",
              relatedId: requestId,
            });
          }
        } catch (e) {
          console.error("Notif fail:", e);
        }

        return { success: true, requestId };
      }),

    // Listar MIS solicitudes
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      return await conn
        .select()
        .from(posPaymentRequests)
        .where(eq(posPaymentRequests.userId, ctx.user.id))
        .orderBy(desc(posPaymentRequests.createdAt));
    }),

    // Cancelar mi solicitud pendiente
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        await conn
          .update(posPaymentRequests)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(posPaymentRequests.id, input.id),
              eq(posPaymentRequests.userId, ctx.user.id),
              eq(posPaymentRequests.status, "pending"),
            ),
          );
        return { success: true };
      }),
  }),

  // =========================================================================
  // ADMIN - REVISAR SOLICITUDES
  // =========================================================================
  admin: router({
    // Listar TODAS las solicitudes (admin)
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
        // Join con users para mostrar nombre
        const conditions: any[] = [];
        if (input?.status) {
          conditions.push(eq(posPaymentRequests.status, input.status));
        }
        const query = conditions.length > 0
          ? conn.select().from(posPaymentRequests).where(and(...conditions))
          : conn.select().from(posPaymentRequests);
        const requests = await query
          .orderBy(desc(posPaymentRequests.createdAt))
          .limit(input?.limit ?? 100);
        // Agregar info del usuario
        const enriched = [];
        for (const req of requests) {
          const userRows = await conn.select().from(users).where(eq(users.id, req.userId)).limit(1);
          enriched.push({
            ...req,
            customerName: userRows[0]?.name ?? "Desconocido",
            customerEmail: userRows[0]?.email ?? "",
          });
        }
        return enriched;
      }),

    // Aprobar una solicitud (crea suscripcion)
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
        // Obtener solicitud
        const reqRows = await conn
          .select()
          .from(posPaymentRequests)
          .where(eq(posPaymentRequests.id, input.requestId))
          .limit(1);
        const req = reqRows[0];
        if (!req) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (req.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitud ya fue procesada" });
        }

        // Calcular fechas
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (req.planType === "monthly") {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // Crear suscripcion
        await conn.insert(posSubscriptions).values({
          userId: req.userId,
          posCode: req.posCode,
          planType: req.planType,
          status: "active",
          startDate,
          endDate,
          paymentRequestId: req.id,
          amountPaid: req.finalAmount,
        });

        // Actualizar solicitud
        await conn
          .update(posPaymentRequests)
          .set({
            status: "approved",
            adminNotes: input.adminNotes,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          })
          .where(eq(posPaymentRequests.id, input.requestId));

        // Notificar al suscriptor
        try {
          await createNotification({
            userId: req.userId,
            type: "subscription_change",
            title: "¡Suscripcion activada!",
            message:
              "Tu acceso a " +
              (POS_PRICES[req.posCode]?.name || req.posCode) +
              " esta activo hasta " +
              endDate.toLocaleDateString("es-MX"),
            relatedId: req.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }

        return { success: true };
      }),

    // Rechazar una solicitud
    reject: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          adminNotes: z.string().min(1, "Debes explicar por que rechazas"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const reqRows = await conn
          .select()
          .from(posPaymentRequests)
          .where(eq(posPaymentRequests.id, input.requestId))
          .limit(1);
        const req = reqRows[0];
        if (!req) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (req.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitud ya fue procesada" });
        }
        await conn
          .update(posPaymentRequests)
          .set({
            status: "rejected",
            adminNotes: input.adminNotes,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          })
          .where(eq(posPaymentRequests.id, input.requestId));

        // Notificar al suscriptor
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

    // Stats para dashboard admin
    stats: protectedProcedure.query(async ({ ctx }) => {
      await requireAdmin(ctx.user.id);
      const conn = await getDbOrThrow();
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      const monthRequests = await conn
        .select()
        .from(posPaymentRequests)
        .where(
          and(
            gte(posPaymentRequests.createdAt, firstOfMonth),
            lte(posPaymentRequests.createdAt, lastOfMonth),
          ),
        );
      const approved = monthRequests.filter((r) => r.status === "approved");
      const pending = await conn
        .select()
        .from(posPaymentRequests)
        .where(eq(posPaymentRequests.status, "pending"));
      const monthRevenue = approved.reduce((sum, r) => sum + parseFloat(r.finalAmount), 0);
      return {
        pendingCount: pending.length,
        monthApprovedCount: approved.length,
        monthRevenue: monthRevenue.toFixed(2),
        monthRequestsCount: monthRequests.length,
      };
    }),
  }),

  // =========================================================================
  // SUSCRIPCIONES (mis activas)
  // =========================================================================
  subscriptions: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      return await conn
        .select()
        .from(posSubscriptions)
        .where(eq(posSubscriptions.userId, ctx.user.id))
        .orderBy(desc(posSubscriptions.createdAt));
    }),

    // Verificar si tengo acceso activo a un POS especifico
    hasAccess: protectedProcedure
      .input(z.object({ posCode: z.enum(["boutique", "abarrotes", "veterinaria", "verduleria", "tarima"]) }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const now = new Date();
        const subs = await conn
          .select()
          .from(posSubscriptions)
          .where(
            and(
              eq(posSubscriptions.userId, ctx.user.id),
              eq(posSubscriptions.posCode, input.posCode),
              eq(posSubscriptions.status, "active"),
              gte(posSubscriptions.endDate, now),
            ),
          )
          .limit(1);
        return { hasAccess: subs.length > 0, subscription: subs[0] ?? null };
      }),
  }),
});
