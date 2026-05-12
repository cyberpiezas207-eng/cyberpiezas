import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import {
  verduleriaProducts,
  verduleriaSales,
  verduleriaSaleItems,
} from "../../drizzle/schema";
import * as db from "../db";
import { createNotification } from "./notifications";

// Productos por defecto para sembrar al activar verduleria
const DEFAULT_CATALOG = [
  // Frutas
  { name: "Manzana roja", icon: "🍎", unit: "kg", category: "fruta", price: "55.00" },
  { name: "Plátano tabasco", icon: "🍌", unit: "kg", category: "fruta", price: "25.00" },
  { name: "Naranja", icon: "🍊", unit: "kg", category: "fruta", price: "30.00" },
  { name: "Limón", icon: "🍋", unit: "kg", category: "fruta", price: "40.00" },
  { name: "Uva verde", icon: "🍇", unit: "kg", category: "fruta", price: "90.00" },
  { name: "Sandía", icon: "🍉", unit: "kg", category: "fruta", price: "20.00" },
  { name: "Fresa", icon: "🍓", unit: "kg", category: "fruta", price: "70.00" },
  { name: "Mango", icon: "🥭", unit: "pieza", category: "fruta", price: "15.00" },
  { name: "Piña", icon: "🍍", unit: "pieza", category: "fruta", price: "45.00" },
  { name: "Aguacate", icon: "🥑", unit: "kg", category: "fruta", price: "85.00" },
  // Verduras
  { name: "Jitomate", icon: "🍅", unit: "kg", category: "verdura", price: "30.00" },
  { name: "Pepino", icon: "🥒", unit: "kg", category: "verdura", price: "20.00" },
  { name: "Lechuga", icon: "🥬", unit: "pieza", category: "verdura", price: "20.00" },
  { name: "Brócoli", icon: "🥦", unit: "pieza", category: "verdura", price: "25.00" },
  { name: "Chile serrano", icon: "🌶️", unit: "kg", category: "verdura", price: "60.00" },
  { name: "Elote", icon: "🌽", unit: "pieza", category: "verdura", price: "12.00" },
  { name: "Berenjena", icon: "🍆", unit: "kg", category: "verdura", price: "35.00" },
  // Tubérculos
  { name: "Papa", icon: "🥔", unit: "kg", category: "tuberculo", price: "25.00" },
  { name: "Zanahoria", icon: "🥕", unit: "kg", category: "tuberculo", price: "20.00" },
  { name: "Cebolla blanca", icon: "🧅", unit: "kg", category: "tuberculo", price: "25.00" },
  { name: "Ajo", icon: "🧄", unit: "kg", category: "tuberculo", price: "120.00" },
  // Hierbas
  { name: "Cilantro", icon: "🌿", unit: "manojo", category: "hierba", price: "8.00" },
  { name: "Perejil", icon: "🌿", unit: "manojo", category: "hierba", price: "8.00" },
  { name: "Hongos", icon: "🍄", unit: "kg", category: "hierba", price: "70.00" },
];

async function getDbOrThrow() {
  const conn = await db.getDbOrThrow();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

export const verduleriaRouter = router({
  // =========================================================================
  // PRODUCTS
  // =========================================================================
  products: router({
    list: protectedProcedure
      .input(
        z.object({
          category: z.enum(["fruta", "verdura", "tuberculo", "hierba", "otro"]).optional(),
          onlyActive: z.boolean().default(true),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const conditions: any[] = [eq(verduleriaProducts.userId, ctx.user.id)];
        if (input?.onlyActive !== false) {
          conditions.push(eq(verduleriaProducts.isActive, true));
        }
        if (input?.category) {
          conditions.push(eq(verduleriaProducts.category, input.category));
        }
        return await conn
          .select()
          .from(verduleriaProducts)
          .where(and(...conditions))
          .orderBy(asc(verduleriaProducts.sortOrder), asc(verduleriaProducts.name));
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          icon: z.string().min(1).max(10).default("🥬"),
          unit: z.enum(["kg", "pieza", "atado", "manojo", "caja", "saco", "litro"]).default("kg"),
          category: z.enum(["fruta", "verdura", "tuberculo", "hierba", "otro"]).default("verdura"),
          price: z.string(),
          stock: z.string().optional(),
          trackStock: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const result = await conn.insert(verduleriaProducts).values({
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          unit: input.unit,
          category: input.category,
          price: input.price,
          stock: input.stock ?? "0",
          trackStock: input.trackStock,
        });
        const id = (result as any).insertId as number;
        const rows = await conn.select().from(verduleriaProducts).where(eq(verduleriaProducts.id, id));
        return rows[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          icon: z.string().optional(),
          unit: z.enum(["kg", "pieza", "atado", "manojo", "caja", "saco", "litro"]).optional(),
          category: z.enum(["fruta", "verdura", "tuberculo", "hierba", "otro"]).optional(),
          price: z.string().optional(),
          stock: z.string().optional(),
          trackStock: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const { id, ...rest } = input;
        const updateData: any = {};
        for (const k of Object.keys(rest)) {
          if ((rest as any)[k] !== undefined) updateData[k] = (rest as any)[k];
        }
        await conn
          .update(verduleriaProducts)
          .set(updateData)
          .where(
            and(
              eq(verduleriaProducts.id, id),
              eq(verduleriaProducts.userId, ctx.user.id),
            ),
          );
        const rows = await conn.select().from(verduleriaProducts).where(eq(verduleriaProducts.id, id));
        return rows[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        await conn
          .delete(verduleriaProducts)
          .where(
            and(
              eq(verduleriaProducts.id, input.id),
              eq(verduleriaProducts.userId, ctx.user.id),
            ),
          );
        return { success: true };
      }),

    // Sembrar productos por defecto (solo si no tiene ninguno)
    seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const existing = await conn
        .select()
        .from(verduleriaProducts)
        .where(eq(verduleriaProducts.userId, ctx.user.id))
        .limit(1);
      if (existing.length > 0) {
        return { seeded: false, message: "Ya tienes productos" };
      }
      for (let i = 0; i < DEFAULT_CATALOG.length; i++) {
        const p = DEFAULT_CATALOG[i];
        await conn.insert(verduleriaProducts).values({
          userId: ctx.user.id,
          name: p.name,
          icon: p.icon,
          unit: p.unit as any,
          category: p.category as any,
          price: p.price,
          stock: "0",
          trackStock: false,
          sortOrder: i,
        });
      }
      return { seeded: true, count: DEFAULT_CATALOG.length };
    }),
  }),

  // =========================================================================
  // SALES
  // =========================================================================
  sales: router({
    create: protectedProcedure
      .input(
        z.object({
          paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia", "credito"]).default("efectivo"),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number().optional(),
              name: z.string().min(1).max(200),
              icon: z.string().optional(),
              unit: z.string().optional(),
              quantity: z.string(),
              unitPrice: z.string(),
            }),
          ).min(1, "Debe haber al menos un item"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();

        // Calcular total
        let total = 0;
        for (const item of input.items) {
          total += parseFloat(item.quantity) * parseFloat(item.unitPrice);
        }

        // Crear venta
        const saleResult = await conn.insert(verduleriaSales).values({
          userId: ctx.user.id,
          total: total.toFixed(2),
          paymentMethod: input.paymentMethod,
          itemCount: input.items.length,
          notes: input.notes,
        });
        const saleId = (saleResult as any).insertId as number;

        // Insertar items + descontar stock si aplica
        for (const item of input.items) {
          const qty = parseFloat(item.quantity);
          const price = parseFloat(item.unitPrice);
          await conn.insert(verduleriaSaleItems).values({
            saleId,
            productId: item.productId,
            name: item.name,
            icon: item.icon,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: (qty * price).toFixed(2),
          });

          // Si el producto trackea stock, descontarlo
          if (item.productId) {
            const productRows = await conn
              .select()
              .from(verduleriaProducts)
              .where(eq(verduleriaProducts.id, item.productId));
            const product = productRows[0];
            if (product && product.trackStock) {
              const currentStock = parseFloat(product.stock || "0");
              const newStock = (currentStock - qty).toFixed(3);
              await conn
                .update(verduleriaProducts)
                .set({ stock: newStock })
                .where(eq(verduleriaProducts.id, item.productId));
              // Trigger stock bajo
              if (parseFloat(newStock) <= 5 && parseFloat(newStock) > 0) {
                try {
                  await createNotification({
                    userId: ctx.user.id,
                    type: "low_stock",
                    title: "Stock bajo",
                    message: product.name + " - quedan " + newStock + " " + (product.unit || ""),
                    relatedId: product.id,
                  });
                } catch (e) {
                  console.error("Notif fail:", e);
                }
              }
            }
          }
        }

        // Notif de venta
        try {
          await createNotification({
            userId: ctx.user.id,
            type: "sale",
            title: "Venta registrada",
            message: "Cobraste $" + total.toFixed(2) + " (" + input.items.length + " items)",
            relatedId: saleId,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }

        const rows = await conn.select().from(verduleriaSales).where(eq(verduleriaSales.id, saleId));
        return rows[0];
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        return await conn
          .select()
          .from(verduleriaSales)
          .where(eq(verduleriaSales.userId, ctx.user.id))
          .orderBy(desc(verduleriaSales.createdAt))
          .limit(input?.limit ?? 50);
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rows = await conn
        .select()
        .from(verduleriaSales)
        .where(
          and(
            eq(verduleriaSales.userId, ctx.user.id),
            gte(verduleriaSales.createdAt, today),
          ),
        );
      let totalRevenue = 0;
      let totalItems = 0;
      for (const r of rows) {
        totalRevenue += parseFloat(r.total);
        totalItems += r.itemCount;
      }
      return {
        totalSales: rows.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalItems,
      };
    }),
  }),
});
