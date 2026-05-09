import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { personalOperations } from "../../drizzle/schema";
import * as db from "../db";

// 🔒 Procedure que SOLO permite acceso al dueño principal
const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta sección es privada del propietario.",
    });
  }
  return next({ ctx });
});

// Schema para campos de venta (productos)
const saleFieldsSchema = z.object({
  soldAt: z.coerce.date().optional().nullable(),
  soldPrice: z.string().optional().nullable(),
  buyerName: z.string().max(255).optional().nullable(),
  buyerPhone: z.string().max(40).optional().nullable(),
  buyerLocation: z.string().max(255).optional().nullable(),
});

// Schema para campos de servicio
const serviceFieldsSchema = z.object({
  serviceTitle: z.string().max(255).optional().nullable(),
  serviceFee: z.string().optional().nullable(),
  serviceDate: z.coerce.date().optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  customerPhone: z.string().max(40).optional().nullable(),
  customerLocation: z.string().max(255).optional().nullable(),
});

export const personalOperationsRouter = router({
  // ─── LIST: todas las operaciones del dueño ────────────────────────────
  list: ownerOnlyProcedure
    .input(
      z
        .object({
          status: z.enum(["in_inventory", "sold", "all"]).default("all"),
          type: z.enum(["product", "service", "all"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const filterStatus = input?.status ?? "all";
      const filterType = input?.type ?? "all";
      const conditions = [eq(personalOperations.ownerId, ctx.user.id)];

      if (filterStatus === "in_inventory") {
        conditions.push(eq(personalOperations.status, "in_inventory"));
      } else if (filterStatus === "sold") {
        conditions.push(eq(personalOperations.status, "sold"));
      }

      if (filterType === "product") {
        conditions.push(eq(personalOperations.operationType, "product"));
      } else if (filterType === "service") {
        conditions.push(eq(personalOperations.operationType, "service"));
      }

      return await database
        .select()
        .from(personalOperations)
        .where(and(...conditions))
        .orderBy(desc(personalOperations.createdAt));
    }),

  // ─── CREATE: registra una operación (producto o servicio) ─────────────
  create: ownerOnlyProcedure
    .input(
      z
        .object({
          operationType: z.enum(["product", "service"]).default("product"),

          // Campos de producto (opcionales si es servicio)
          productName: z.string().max(255).optional().nullable(),
          productDescription: z.string().max(2000).optional().nullable(),
          acquiredAt: z.coerce.date().optional().nullable(),
          acquiredCost: z.string().optional().nullable(),
          supplierName: z.string().max(255).optional().nullable(),
          supplierPhone: z.string().max(40).optional().nullable(),
          supplierLocation: z.string().max(255).optional().nullable(),

          notes: z.string().max(2000).optional().nullable(),
        })
        .merge(saleFieldsSchema)
        .merge(serviceFieldsSchema),
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Validación según tipo
      if (input.operationType === "product") {
        if (!input.productName || !input.acquiredCost || !input.acquiredAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Producto: nombre, fecha de compra y precio son obligatorios.",
          });
        }
      } else {
        if (!input.serviceTitle || !input.serviceFee || !input.serviceDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Servicio: título, fecha y precio cobrado son obligatorios.",
          });
        }
      }

      // Status según el tipo
      let status: "in_inventory" | "sold";
      if (input.operationType === "service") {
        // Los servicios siempre cuentan como "sold" (ya se prestó y se cobró)
        status = "sold";
      } else {
        // Productos: si tiene venta, está vendido; si no, en inventario
        const hasSaleData = !!(input.soldAt && input.soldPrice);
        status = hasSaleData ? "sold" : "in_inventory";
      }

      const result = await database.insert(personalOperations).values({
        ownerId: ctx.user.id,
        operationType: input.operationType,

        // Producto
        productName: input.productName ?? null,
        productDescription: input.productDescription ?? null,
        acquiredAt: input.acquiredAt ?? null,
        acquiredCost: input.acquiredCost ?? null,
        supplierName: input.supplierName ?? null,
        supplierPhone: input.supplierPhone ?? null,
        supplierLocation: input.supplierLocation ?? null,

        // Venta del producto
        soldAt: input.soldAt ?? null,
        soldPrice: input.soldPrice ?? null,
        buyerName: input.buyerName ?? null,
        buyerPhone: input.buyerPhone ?? null,
        buyerLocation: input.buyerLocation ?? null,

        // Servicio
        serviceTitle: input.serviceTitle ?? null,
        serviceFee: input.serviceFee ?? null,
        serviceDate: input.serviceDate ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerLocation: input.customerLocation ?? null,

        status,
        notes: input.notes ?? null,
      });

      return { success: true, insertId: (result as { insertId?: number })?.insertId };
    }),

  // ─── UPDATE: actualiza datos ──────────────────────────────────────────
  update: ownerOnlyProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          operationType: z.enum(["product", "service"]).optional(),

          productName: z.string().max(255).optional().nullable(),
          productDescription: z.string().max(2000).optional().nullable(),
          acquiredAt: z.coerce.date().optional().nullable(),
          acquiredCost: z.string().optional().nullable(),
          supplierName: z.string().max(255).optional().nullable(),
          supplierPhone: z.string().max(40).optional().nullable(),
          supplierLocation: z.string().max(255).optional().nullable(),

          notes: z.string().max(2000).optional().nullable(),
        })
        .merge(saleFieldsSchema)
        .merge(serviceFieldsSchema),
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const [existing] = await database
        .select()
        .from(personalOperations)
        .where(
          and(
            eq(personalOperations.id, input.id),
            eq(personalOperations.ownerId, ctx.user.id),
          ),
        );

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operación no encontrada.",
        });
      }

      const { id, ...rest } = input;
      const updates: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      // Recalcular status según tipo
      const finalType = (updates.operationType as string) ?? existing.operationType;
      if (finalType === "service") {
        updates.status = "sold";
      } else {
        const willHaveSale =
          (updates.soldAt ?? existing.soldAt) &&
          (updates.soldPrice ?? existing.soldPrice);
        updates.status = willHaveSale ? "sold" : "in_inventory";
      }

      await database
        .update(personalOperations)
        .set(updates)
        .where(eq(personalOperations.id, id));

      return { success: true };
    }),

  // ─── MARK AS SOLD: solo aplica a productos ────────────────────────────
  markAsSold: ownerOnlyProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        soldAt: z.coerce.date(),
        soldPrice: z.string().min(1),
        buyerName: z.string().max(255).optional().nullable(),
        buyerPhone: z.string().max(40).optional().nullable(),
        buyerLocation: z.string().max(255).optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const [existing] = await database
        .select()
        .from(personalOperations)
        .where(
          and(
            eq(personalOperations.id, input.id),
            eq(personalOperations.ownerId, ctx.user.id),
          ),
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (existing.operationType !== "product") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo los productos pueden marcarse como vendidos.",
        });
      }

      await database
        .update(personalOperations)
        .set({
          soldAt: input.soldAt,
          soldPrice: input.soldPrice,
          buyerName: input.buyerName ?? null,
          buyerPhone: input.buyerPhone ?? null,
          buyerLocation: input.buyerLocation ?? null,
          status: "sold",
        })
        .where(eq(personalOperations.id, input.id));

      return { success: true };
    }),

  // ─── DELETE ───────────────────────────────────────────────────────────
  delete: ownerOnlyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const [existing] = await database
        .select()
        .from(personalOperations)
        .where(
          and(
            eq(personalOperations.id, input.id),
            eq(personalOperations.ownerId, ctx.user.id),
          ),
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await database
        .delete(personalOperations)
        .where(eq(personalOperations.id, input.id));

      return { success: true };
    }),

  // ─── STATS: con cálculo polimórfico (producto vs servicio) ────────────
  stats: ownerOnlyProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const allOps = await database
      .select()
      .from(personalOperations)
      .where(eq(personalOperations.ownerId, ctx.user.id));

    let revenueMonth = 0;
    let profitMonth = 0;
    let inInventoryCount = 0;
    let inInventoryCost = 0;
    let servicesMonth = 0;
    let productsMonth = 0;

    for (const op of allOps) {
      // PRODUCTO en inventario (no vendido)
      if (op.operationType === "product" && op.status === "in_inventory") {
        inInventoryCount += 1;
        inInventoryCost += Number(op.acquiredCost ?? 0);
        continue;
      }

      // PRODUCTO vendido este mes
      if (op.operationType === "product" && op.soldAt && op.soldAt >= monthStart) {
        const sold = Number(op.soldPrice ?? 0);
        const cost = Number(op.acquiredCost ?? 0);
        revenueMonth += sold;
        profitMonth += sold - cost;
        productsMonth += 1;
        continue;
      }

      // SERVICIO de este mes
      if (
        op.operationType === "service" &&
        op.serviceDate &&
        op.serviceDate >= monthStart
      ) {
        const fee = Number(op.serviceFee ?? 0);
        revenueMonth += fee;
        profitMonth += fee; // Sin costo: utilidad = lo cobrado
        servicesMonth += 1;
      }
    }

    return {
      revenueMonth: revenueMonth.toFixed(2),
      profitMonth: profitMonth.toFixed(2),
      inInventoryCount,
      inInventoryCost: inInventoryCost.toFixed(2),
      totalOperations: allOps.length,
      productsMonth,
      servicesMonth,
    };
  }),
});
