import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull, isNotNull, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { personalOperations } from "../../drizzle/schema";
import * as db from "../db";

// 🔒 Procedure que SOLO permite acceso al dueño principal (cyberpiezas207)
const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta sección es privada del propietario.",
    });
  }
  return next({ ctx });
});

// Validación común para los datos de venta (todos opcionales pero relacionados)
const saleFieldsSchema = z.object({
  soldAt: z.coerce.date().optional().nullable(),
  soldPrice: z.string().optional().nullable(),
  buyerName: z.string().max(255).optional().nullable(),
  buyerPhone: z.string().max(40).optional().nullable(),
  buyerLocation: z.string().max(255).optional().nullable(),
});

export const personalOperationsRouter = router({
  // ─── LIST: todas las operaciones del dueño ────────────────────────────
  list: ownerOnlyProcedure
    .input(
      z
        .object({
          status: z.enum(["in_inventory", "sold", "all"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const filterStatus = input?.status ?? "all";
      const conditions = [eq(personalOperations.ownerId, ctx.user.id)];

      if (filterStatus === "in_inventory") {
        conditions.push(eq(personalOperations.status, "in_inventory"));
      } else if (filterStatus === "sold") {
        conditions.push(eq(personalOperations.status, "sold"));
      }

      return await database
        .select()
        .from(personalOperations)
        .where(and(...conditions))
        .orderBy(desc(personalOperations.createdAt));
    }),

  // ─── CREATE: registra una compra (con o sin venta) ────────────────────
  create: ownerOnlyProcedure
    .input(
      z
        .object({
          productName: z.string().min(1).max(255),
          productDescription: z.string().max(2000).optional().nullable(),

          // Compra (siempre requerida)
          acquiredAt: z.coerce.date(),
          acquiredCost: z.string().min(1),
          supplierName: z.string().max(255).optional().nullable(),
          supplierPhone: z.string().max(40).optional().nullable(),
          supplierLocation: z.string().max(255).optional().nullable(),

          notes: z.string().max(2000).optional().nullable(),
        })
        .merge(saleFieldsSchema),
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Si tiene precio de venta y fecha de venta, queda como "sold"
      const hasSaleData = !!(input.soldAt && input.soldPrice);
      const status = hasSaleData ? "sold" : "in_inventory";

      const result = await database.insert(personalOperations).values({
        ownerId: ctx.user.id,
        productName: input.productName,
        productDescription: input.productDescription ?? null,
        acquiredAt: input.acquiredAt,
        acquiredCost: input.acquiredCost,
        supplierName: input.supplierName ?? null,
        supplierPhone: input.supplierPhone ?? null,
        supplierLocation: input.supplierLocation ?? null,
        soldAt: hasSaleData ? input.soldAt : null,
        soldPrice: hasSaleData ? input.soldPrice : null,
        buyerName: hasSaleData ? input.buyerName ?? null : null,
        buyerPhone: hasSaleData ? input.buyerPhone ?? null : null,
        buyerLocation: hasSaleData ? input.buyerLocation ?? null : null,
        status,
        notes: input.notes ?? null,
      });

      return { success: true, insertId: (result as { insertId?: number })?.insertId };
    }),

  // ─── UPDATE: actualiza datos de una operación ─────────────────────────
  update: ownerOnlyProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          productName: z.string().min(1).max(255).optional(),
          productDescription: z.string().max(2000).optional().nullable(),
          acquiredAt: z.coerce.date().optional(),
          acquiredCost: z.string().optional(),
          supplierName: z.string().max(255).optional().nullable(),
          supplierPhone: z.string().max(40).optional().nullable(),
          supplierLocation: z.string().max(255).optional().nullable(),
          notes: z.string().max(2000).optional().nullable(),
        })
        .merge(saleFieldsSchema),
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar ownership ANTES de modificar
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

      // Solo incluir campos que vinieron en el input
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      // Si se actualiza precio o fecha de venta, ajustar status
      const willHaveSale =
        (updates.soldAt ?? existing.soldAt) &&
        (updates.soldPrice ?? existing.soldPrice);
      updates.status = willHaveSale ? "sold" : "in_inventory";

      await database
        .update(personalOperations)
        .set(updates)
        .where(eq(personalOperations.id, id));

      return { success: true };
    }),

  // ─── MARK AS SOLD: marca una operación en inventario como vendida ─────
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

  // ─── DELETE: elimina una operación ────────────────────────────────────
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

  // ─── STATS: estadísticas para los KPIs y gráficas ─────────────────────
  stats: ownerOnlyProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Todas las operaciones del owner
    const allOps = await database
      .select()
      .from(personalOperations)
      .where(eq(personalOperations.ownerId, ctx.user.id));

    let revenueMonth = 0;
    let profitMonth = 0;
    let inInventoryCount = 0;
    let inInventoryCost = 0;

    for (const op of allOps) {
      // En inventario (no vendido)
      if (op.status === "in_inventory") {
        inInventoryCount += 1;
        inInventoryCost += Number(op.acquiredCost);
        continue;
      }

      // Vendido en el mes actual
      if (op.soldAt && op.soldAt >= monthStart) {
        const sold = Number(op.soldPrice ?? 0);
        const cost = Number(op.acquiredCost);
        revenueMonth += sold;
        profitMonth += sold - cost;
      }
    }

    return {
      revenueMonth: revenueMonth.toFixed(2),
      profitMonth: profitMonth.toFixed(2),
      inInventoryCount,
      inInventoryCost: inInventoryCost.toFixed(2),
      totalOperations: allOps.length,
    };
  }),
});
