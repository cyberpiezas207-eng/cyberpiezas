import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  notifications,
  payments,
  transferPaymentRequests,
  users,
} from "../../drizzle/schema";
import { storagePut } from "../storage";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createNotificationForUser, getEffectiveUserSubscription, getDb } from "../db";

type PlanCode = "free" | "basic" | "professional" | "premium" | "annual";

type CatalogPlan = {
  id: PlanCode;
  name: string;
  price: number;
  currency: "MXN";
  billingType: "monthly" | "annual";
  description: string;
  badge?: string;
  features: string[];
};

const FREE_PLAN: CatalogPlan = {
  id: "free",
  name: "Gratis",
  price: 0,
  currency: "MXN",
  billingType: "monthly",
  description: "Ideal para una boutique pequeña que necesita una sola sucursal y operación básica para empezar.",
  badge: "1 sucursal",
  features: [
    "1 sucursal",
    "1 usuario",
    "Hasta 100 productos",
    "Hasta 200 ventas por mes",
    "Historial de 30 días",
    "Mensajes para mejorar al siguiente plan",
  ],
};

const PLAN_CATALOG: Record<Exclude<PlanCode, "free">, CatalogPlan> = {
  basic: {
    id: "basic",
    name: "Básico",
    price: 99,
    currency: "MXN",
    billingType: "monthly",
    description: "Para boutiques que inician operaciones con una sola caja y catálogo controlado.",
    features: [
      "Hasta 500 productos",
      "Hasta 3 usuarios",
      "Reportes esenciales",
      "Control básico de inventario",
      "Soporte para ventas rápidas",
    ],
  },
  professional: {
    id: "professional",
    name: "Profesional",
    price: 299,
    currency: "MXN",
    billingType: "monthly",
    description: "Ideal para negocios en crecimiento que necesitan más usuarios y mejor control operativo.",
    features: [
      "Hasta 5,000 productos",
      "Hasta 10 usuarios",
      "Reportes avanzados",
      "Inventario multiárea",
      "Gestión operativa ampliada",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 800,
    currency: "MXN",
    billingType: "monthly",
    description: "Pensado para operación más robusta, con prioridad operativa y crecimiento sostenido.",
    badge: "Más completo",
    features: [
      "Productos ilimitados",
      "Hasta 50 usuarios",
      "Reportes y métricas avanzadas",
      "Mejor soporte operativo",
      "Listo para expandirse a sucursales",
    ],
  },
  annual: {
    id: "annual",
    name: "Anualidad",
    price: 7000,
    currency: "MXN",
    billingType: "annual",
    description: "Pago anual con acceso completo. Renovación automática cada año.",
    badge: "Pago anual",
    features: [
      "Acceso completo por 12 meses",
      "Productos ilimitados",
      "Usuarios ilimitados",
      "Panel administrativo completo",
      "Renovación automática anual",
    ],
  },
};

function requireAdmin(role?: string) {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo un administrador puede realizar esta acción.",
    });
  }
}

function addThirtyDays(baseDate: Date) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 30);
  return next;
}

function decodeBase64File(input?: string) {
  if (!input) return null;
  const normalized = input.includes(",") ? input.split(",").pop() ?? "" : input;
  return Buffer.from(normalized, "base64");
}

export const paypalRouter = router({
  getPlans: publicProcedure.query(() => {
    return {
      free: FREE_PLAN,
      monthly: [PLAN_CATALOG.basic, PLAN_CATALOG.professional, PLAN_CATALOG.premium],
      annual: PLAN_CATALOG.annual,
      paymentMethod: {
        type: "manual_transfer",
        label: "Transferencia bancaria",
        instructions: [
          "Selecciona tu plan y registra tu transferencia.",
          "Sube tu comprobante para revisión.",
          "Un administrador valida el pago y activa tu acceso.",
        ],
      },
    };
  }),

  createSubscriptionCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["basic", "professional", "premium"]),
        payerName: z.string().min(3).max(150),
        transferReference: z.string().min(4).max(120),
        notes: z.string().max(500).optional(),
        proofBase64: z.string().optional(),
        proofMimeType: z.string().optional(),
        proofFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
      }

      const plan = PLAN_CATALOG[input.planId];
      if (!plan || plan.billingType !== "monthly") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Plan mensual inválido." });
      }

      let proofUrl: string | null = null;
      if (input.proofBase64) {
        const fileBuffer = decodeBase64File(input.proofBase64);
        if (!fileBuffer) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo leer el comprobante." });
        }
        const upload = await storagePut(
          `payment-proofs/user-${ctx.user.id}/${Date.now()}-${input.proofFileName || "comprobante.jpg"}`,
          fileBuffer,
          input.proofMimeType || "image/jpeg"
        );
        proofUrl = upload.url;
      }

      const now = new Date();
      const requestResult = await db
        .insert(transferPaymentRequests)
        .values({
          userId: ctx.user.id,
          planCode: plan.id,
          planName: plan.name,
          billingType: plan.billingType,
          amount: plan.price.toFixed(2),
          currency: plan.currency,
          payerName: input.payerName,
          transferReference: input.transferReference,
          proofUrl,
          notes: input.notes,
          status: "pending",
        })
        .$returningId();

      await db
        .update(users)
        .set({
          subscriptionStatus: "pending_review",
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        requestId: requestResult[0]?.id ?? null,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        reviewMessage: "Tu comprobante fue registrado. El acceso se activará cuando un administrador valide la transferencia.",
        proofUrl,
      };
    }),

  createAnnualCheckout: protectedProcedure
    .input(
      z.object({
        payerName: z.string().min(3).max(150),
        transferReference: z.string().min(4).max(120),
        notes: z.string().max(500).optional(),
        proofBase64: z.string().optional(),
        proofMimeType: z.string().optional(),
        proofFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
      }

      let proofUrl: string | null = null;
      if (input.proofBase64) {
        const fileBuffer = decodeBase64File(input.proofBase64);
        if (!fileBuffer) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo leer el comprobante." });
        }
        const upload = await storagePut(
          `payment-proofs/user-${ctx.user.id}/${Date.now()}-${input.proofFileName || "licencia.jpg"}`,
          fileBuffer,
          input.proofMimeType || "image/jpeg"
        );
        proofUrl = upload.url;
      }

      const plan = PLAN_CATALOG.annual;
      const requestResult = await db
        .insert(transferPaymentRequests)
        .values({
          userId: ctx.user.id,
          planCode: plan.id,
          planName: plan.name,
          billingType: plan.billingType,
          amount: plan.price.toFixed(2),
          currency: plan.currency,
          payerName: input.payerName,
          transferReference: input.transferReference,
          proofUrl,
          notes: input.notes,
          status: "pending",
        })
        .$returningId();

      await db
        .update(users)
        .set({
          subscriptionStatus: "pending_review",
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        requestId: requestResult[0]?.id ?? null,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        reviewMessage: "Registramos tu solicitud de anualidad. En cuanto se valide la transferencia se habilitará el acceso completo.",
        proofUrl,
      };
    }),

  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
    }

    const [effectiveSubscription, requestRows] = await Promise.all([
      getEffectiveUserSubscription(ctx.user.id),
      db
        .select()
        .from(transferPaymentRequests)
        .where(eq(transferPaymentRequests.userId, ctx.user.id))
        .orderBy(desc(transferPaymentRequests.createdAt))
        .limit(5),
    ]);

    return {
      user: effectiveSubscription?.user ?? null,
      activeLicense: effectiveSubscription?.activeLicense ?? null,
      requests: requestRows,
    };
  }),

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(payments)
      .where(eq(payments.userId, ctx.user.id))
      .orderBy(desc(payments.createdAt));
  }),

  getPendingTransferRequests: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        request: transferPaymentRequests,
        user: users,
      })
      .from(transferPaymentRequests)
      .innerJoin(users, eq(transferPaymentRequests.userId, users.id))
      .where(eq(transferPaymentRequests.status, "pending"))
      .orderBy(desc(transferPaymentRequests.createdAt));
  }),

  approveTransferRequest: protectedProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
      }

      const requestRows = await db
        .select()
        .from(transferPaymentRequests)
        .where(eq(transferPaymentRequests.id, input.requestId))
        .limit(1);

      const request = requestRows[0];
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de pago no encontrada." });
      }
      if (request.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La solicitud ya fue procesada." });
      }

      const now = new Date();
      const periodEnd = request.billingType === "monthly" ? addThirtyDays(now) : null;

      await db
        .update(transferPaymentRequests)
        .set({
          status: "approved",
          reviewedByUserId: ctx.user.id,
          reviewedAt: now,
          activatedAt: now,
          periodStart: now,
          periodEnd,
        })
        .where(eq(transferPaymentRequests.id, request.id));

      await db
        .update(users)
        .set({
          role: "admin",
          subscriptionPlan: request.planCode,
          subscriptionStatus: "active",
          subscriptionStartDate: now,
          subscriptionEndDate: periodEnd,
        })
        .where(eq(users.id, request.userId));

      await db.insert(payments).values({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        status: "succeeded",
        planName: request.planName,
        paymentProvider: "manual_transfer",
        externalReference: request.transferReference,
        proofUrl: request.proofUrl,
        billingPeriodStart: now,
        billingPeriodEnd: periodEnd,
        paidAt: now,
      });

      await createNotificationForUser({
        userId: request.userId,
        type: "payment_received",
        title: "Pago recibido",
        message: `Recibimos tu pago por ${request.planName} y fue validado correctamente.`,
        relatedId: request.id,
      });

      await createNotificationForUser({
        userId: request.userId,
        type: "subscription_change",
        title: "Suscripción activada",
        message: `Tu pago por transferencia fue validado y tu plan ${request.planName} ya está activo.`,
        relatedId: request.id,
      });

      return {
        success: true,
        requestId: request.id,
        planCode: request.planCode,
        activatedUntil: periodEnd,
      };
    }),

  rejectTransferRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
        reason: z.string().min(3).max(250).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
      }

      const requestRows = await db
        .select()
        .from(transferPaymentRequests)
        .where(eq(transferPaymentRequests.id, input.requestId))
        .limit(1);

      const request = requestRows[0];
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de pago no encontrada." });
      }

      await db
        .update(transferPaymentRequests)
        .set({
          status: "rejected",
          reviewedByUserId: ctx.user.id,
          reviewedAt: new Date(),
          notes: input.reason ? `${request.notes ? `${request.notes}\n\n` : ""}Motivo de rechazo: ${input.reason}` : request.notes,
        })
        .where(eq(transferPaymentRequests.id, request.id));

      await db
        .update(users)
        .set({
          subscriptionStatus: "rejected",
        })
        .where(and(eq(users.id, request.userId), eq(users.subscriptionStatus, "pending_review")));

      await createNotificationForUser({
        userId: request.userId,
        type: "subscription_change",
        title: "Pago pendiente de corrección",
        message: input.reason
          ? `Tu comprobante no pudo validarse: ${input.reason}`
          : "Tu comprobante requiere revisión adicional. Por favor verifica los datos de tu transferencia.",
        relatedId: request.id,
      });

      return { success: true };
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
    }

    await db
      .update(users)
      .set({
        subscriptionStatus: "canceled",
      })
      .where(eq(users.id, ctx.user.id));

    return {
      success: true,
      message: "La suscripción quedó marcada como cancelada.",
    };
  }),
});
