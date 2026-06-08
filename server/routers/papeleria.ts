import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDbOrThrow } from "../db";
import { eq, and, desc, asc, gte, lt } from "drizzle-orm";
import {
  papeleriaSettings,
  papeleriaCategories,
  papeleriaProducts,
  papeleriaSales,
  papeleriaSaleItems,
  transferPaymentRequests,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// =============================================================================
// HELPER: Verificar acceso a papeleria (suscripcion activa)
// =============================================================================
async function requirePapeleriaAccess(userId: number) {
  const db = await getDbOrThrow();
  const now = new Date();

  const subscriptions = await db
    .select()
    .from(transferPaymentRequests)
    .where(
      and(
        eq(transferPaymentRequests.userId, userId),
        eq(transferPaymentRequests.status, "approved"),
        gte(transferPaymentRequests.periodEnd, now)
      )
    );

  const hasAccess = subscriptions.some((sub) => {
    try {
      const notes = sub.notes ? JSON.parse(sub.notes) : {};
      return notes.posCode === "papeleria";
    } catch {
      return false;
    }
  });

  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Necesitas una suscripcion activa al POS de Papeleria. Visita /pricing",
    });
  }
}

// =============================================================================
// MINICEREBRO: normalizacion y scoring de busqueda
// =============================================================================

// Quita acentos, pasa a minusculas, recorta espacios
function stripAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Normalizacion fonetica: acerca palabras que suenan igual pero se
// escriben distinto (kuaderno -> cuaderno, baso -> baso, etc.)
// La idea no es perfeccion linguistica, sino tolerar errores comunes.
function phonetic(s: string): string {
  let r = stripAccents(s);
  r = r.replace(/\s+/g, " ");
  // qu -> k, c (suave/fuerte) -> k, q -> k
  r = r.replace(/qu/g, "k");
  r = r.replace(/c/g, "k");
  r = r.replace(/q/g, "k");
  // v -> b (suenan igual en espanol)
  r = r.replace(/v/g, "b");
  // z -> s, x -> s (aprox)
  r = r.replace(/z/g, "s");
  // ll -> y
  r = r.replace(/ll/g, "y");
  // h muda -> fuera
  r = r.replace(/h/g, "");
  // dobles letras -> una
  r = r.replace(/(.)\1+/g, "$1");
  return r;
}

// Calcula que tan bien un producto matchea el query.
// Mayor score = mas relevante. 0 = no matchea.
function scoreProduct(
  product: { name: string; description: string | null; barcode: string | null; salesCount: number },
  rawQuery: string
): number {
  const q = stripAccents(rawQuery);
  if (!q) return 0;

  // Match exacto por codigo de barras = maxima prioridad (escaneo)
  if (product.barcode && stripAccents(product.barcode) === q) {
    return 100000 + product.salesCount;
  }

  const name = stripAccents(product.name);
  const desc = stripAccents(product.description ?? "");
  const qPhon = phonetic(rawQuery);
  const namePhon = phonetic(product.name);

  let score = 0;

  // Coincidencia directa sobre el nombre
  if (name.startsWith(q)) score += 100;
  else if (name.includes(q)) score += 50;

  // Por palabra: alguna palabra del nombre empieza con el query
  const words = name.split(" ");
  if (words.some((w) => w.startsWith(q))) score += 30;

  // Coincidencia fonetica (tolerante a errores de escritura)
  if (score === 0) {
    if (namePhon.startsWith(qPhon)) score += 40;
    else if (namePhon.includes(qPhon)) score += 25;
  }

  // En la descripcion (peso menor)
  if (score === 0 && desc.includes(q)) score += 10;

  // Desempate por popularidad
  if (score > 0) {
    score += Math.min(product.salesCount * 0.1, 20);
  }

  return score;
}

// =============================================================================
// SCHEMAS DE VALIDACION
// =============================================================================
const categoryInputSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  icon: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

const productInputSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, "Nombre requerido").max(200),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio invalido"),
  barcode: z.string().max(60).optional().or(z.literal("")),
  imageUrl: z.string().url("URL de foto invalida").optional().or(z.literal("")),
  stock: z.number().int().default(0),
  trackStock: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

// =============================================================================
// ROUTER PRINCIPAL
// =============================================================================
export const papeleriaRouter = router({
  // ===========================================================================
  // ACCESO
  // ===========================================================================
  hasAccess: protectedProcedure.query(async ({ ctx }) => {
    try {
      await requirePapeleriaAccess(ctx.user.id);
      return { hasAccess: true };
    } catch {
      return { hasAccess: false };
    }
  }),

  // ===========================================================================
  // SETTINGS - configuracion de la papeleria (nombre, y luego tienda)
  // ===========================================================================
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      await requirePapeleriaAccess(ctx.user.id);
      const db = await getDbOrThrow();
      const rows = await db
        .select()
        .from(papeleriaSettings)
        .where(eq(papeleriaSettings.userId, ctx.user.id));
      if (rows.length === 0) {
        // Crear config por defecto al primer acceso
        await db.insert(papeleriaSettings).values({
          userId: ctx.user.id,
          businessName: "Mi Papeleria",
        });
        const created = await db
          .select()
          .from(papeleriaSettings)
          .where(eq(papeleriaSettings.userId, ctx.user.id));
        return created[0];
      }
      return rows[0];
    }),

    update: protectedProcedure
      .input(
        z.object({
          businessName: z.string().min(1, "Nombre requerido").max(120),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const rows = await db
          .select()
          .from(papeleriaSettings)
          .where(eq(papeleriaSettings.userId, ctx.user.id));

        if (rows.length === 0) {
          await db.insert(papeleriaSettings).values({
            userId: ctx.user.id,
            businessName: input.businessName,
          });
        } else {
          await db
            .update(papeleriaSettings)
            .set({ businessName: input.businessName })
            .where(eq(papeleriaSettings.userId, ctx.user.id));
        }

        return { success: true };
      }),
  }),

  // ===========================================================================
  // CATEGORIAS
  // ===========================================================================
  categorias: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePapeleriaAccess(ctx.user.id);
      const db = await getDbOrThrow();
      return db
        .select()
        .from(papeleriaCategories)
        .where(
          and(
            eq(papeleriaCategories.userId, ctx.user.id),
            eq(papeleriaCategories.isActive, true)
          )
        )
        .orderBy(asc(papeleriaCategories.displayOrder));
    }),

    create: protectedProcedure
      .input(categoryInputSchema)
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        const result = await db.insert(papeleriaCategories).values({
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          displayOrder: input.displayOrder,
        });
        return { id: result[0].insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...categoryInputSchema.shape }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const existing = await db
          .select()
          .from(papeleriaCategories)
          .where(
            and(
              eq(papeleriaCategories.id, input.id),
              eq(papeleriaCategories.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        await db
          .update(papeleriaCategories)
          .set({
            name: input.name,
            icon: input.icon,
            displayOrder: input.displayOrder,
          })
          .where(eq(papeleriaCategories.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const existing = await db
          .select()
          .from(papeleriaCategories)
          .where(
            and(
              eq(papeleriaCategories.id, input.id),
              eq(papeleriaCategories.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        await db
          .update(papeleriaCategories)
          .set({ isActive: false })
          .where(eq(papeleriaCategories.id, input.id));

        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        for (let i = 0; i < input.orderedIds.length; i++) {
          await db
            .update(papeleriaCategories)
            .set({ displayOrder: i })
            .where(
              and(
                eq(papeleriaCategories.id, input.orderedIds[i]),
                eq(papeleriaCategories.userId, ctx.user.id)
              )
            );
        }
        return { success: true };
      }),
  }),

  // ===========================================================================
  // PRODUCTOS
  // ===========================================================================
  productos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePapeleriaAccess(ctx.user.id);
      const db = await getDbOrThrow();
      return db
        .select()
        .from(papeleriaProducts)
        .where(
          and(
            eq(papeleriaProducts.userId, ctx.user.id),
            eq(papeleriaProducts.isActive, true)
          )
        )
        .orderBy(asc(papeleriaProducts.displayOrder));
    }),

    listByCategory: protectedProcedure
      .input(z.object({ categoryId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        return db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.userId, ctx.user.id),
              eq(papeleriaProducts.categoryId, input.categoryId),
              eq(papeleriaProducts.isActive, true)
            )
          )
          .orderBy(asc(papeleriaProducts.displayOrder));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        const products = await db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.id, input.id),
              eq(papeleriaProducts.userId, ctx.user.id)
            )
          );
        if (products.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }
        return products[0];
      }),

    create: protectedProcedure
      .input(productInputSchema)
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const categories = await db
          .select()
          .from(papeleriaCategories)
          .where(
            and(
              eq(papeleriaCategories.id, input.categoryId),
              eq(papeleriaCategories.userId, ctx.user.id)
            )
          );
        if (categories.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        const result = await db.insert(papeleriaProducts).values({
          userId: ctx.user.id,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          price: input.price,
          barcode: input.barcode || null,
          imageUrl: input.imageUrl || null,
          stock: input.stock,
          trackStock: input.trackStock,
          displayOrder: input.displayOrder,
        });

        return { id: result[0].insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...productInputSchema.shape }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const existing = await db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.id, input.id),
              eq(papeleriaProducts.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        await db
          .update(papeleriaProducts)
          .set({
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
            price: input.price,
            barcode: input.barcode || null,
            imageUrl: input.imageUrl || null,
            stock: input.stock,
            trackStock: input.trackStock,
            displayOrder: input.displayOrder,
          })
          .where(eq(papeleriaProducts.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const existing = await db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.id, input.id),
              eq(papeleriaProducts.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        await db
          .update(papeleriaProducts)
          .set({ isActive: false })
          .where(eq(papeleriaProducts.id, input.id));

        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        for (let i = 0; i < input.orderedIds.length; i++) {
          await db
            .update(papeleriaProducts)
            .set({ displayOrder: i })
            .where(
              and(
                eq(papeleriaProducts.id, input.orderedIds[i]),
                eq(papeleriaProducts.userId, ctx.user.id)
              )
            );
        }
        return { success: true };
      }),
  }),

  // ===========================================================================
  // BUSCAR - el minicerebro (tolerante a errores + autocompletar + mas vendido)
  // ===========================================================================
  buscar: router({
    // Busqueda inteligente. Si q viene vacio, devuelve los mas vendidos.
    search: protectedProcedure
      .input(
        z.object({
          q: z.string().max(100).default(""),
          limit: z.number().int().min(1).max(50).default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const all = await db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.userId, ctx.user.id),
              eq(papeleriaProducts.isActive, true)
            )
          );

        const q = input.q.trim();

        // Sin query: top mas vendidos
        if (!q) {
          return [...all]
            .sort((a, b) => b.salesCount - a.salesCount)
            .slice(0, input.limit);
        }

        // Con query: rankear por relevancia
        const scored = all
          .map((p) => ({
            product: p,
            score: scoreProduct(
              {
                name: p.name,
                description: p.description,
                barcode: p.barcode,
                salesCount: p.salesCount,
              },
              q
            ),
          }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit)
          .map((x) => x.product);

        return scored;
      }),

    // Mas vendidos (para la seccion "Mas vendidos")
    topSellers: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        const all = await db
          .select()
          .from(papeleriaProducts)
          .where(
            and(
              eq(papeleriaProducts.userId, ctx.user.id),
              eq(papeleriaProducts.isActive, true)
            )
          );
        return [...all]
          .sort((a, b) => b.salesCount - a.salesCount)
          .slice(0, input.limit);
      }),
  }),

  // ===========================================================================
  // SALES - ventas del POS (folio + suma salesCount + descuenta stock)
  // ===========================================================================
  sales: router({
    create: protectedProcedure
      .input(
        z.object({
          paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia"]).default("efectivo"),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive().optional(),
                productName: z.string().min(1).max(200),
                quantity: z.number().int().min(1),
                unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio invalido"),
                lineTotal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Total invalido"),
              })
            )
            .min(1, "El ticket no puede ir vacio"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        // Folio: ultimo del usuario + 1
        const last = await db
          .select()
          .from(papeleriaSales)
          .where(eq(papeleriaSales.userId, ctx.user.id))
          .orderBy(desc(papeleriaSales.folio))
          .limit(1);
        const nextFolio = last.length > 0 ? last[0].folio + 1 : 1;

        // Totales en el server
        let subtotal = 0;
        let itemCount = 0;
        for (const it of input.items) {
          subtotal += parseFloat(it.lineTotal);
          itemCount += it.quantity;
        }
        const total = subtotal;

        const saleResult = await db.insert(papeleriaSales).values({
          userId: ctx.user.id,
          folio: nextFolio,
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: input.paymentMethod,
          itemCount,
          notes: input.notes,
          status: "completed",
        });

        const saleId = saleResult[0].insertId;

        // Items + actualizar salesCount y stock de cada producto
        for (const it of input.items) {
          await db.insert(papeleriaSaleItems).values({
            saleId,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
          });

          if (it.productId) {
            const prods = await db
              .select()
              .from(papeleriaProducts)
              .where(
                and(
                  eq(papeleriaProducts.id, it.productId),
                  eq(papeleriaProducts.userId, ctx.user.id)
                )
              );
            if (prods.length > 0) {
              const p = prods[0];
              const newStock = p.trackStock ? p.stock - it.quantity : p.stock;
              await db
                .update(papeleriaProducts)
                .set({
                  salesCount: p.salesCount + it.quantity,
                  stock: newStock,
                })
                .where(eq(papeleriaProducts.id, it.productId));
            }
          }
        }

        return {
          success: true,
          saleId,
          folio: nextFolio,
          total: total.toFixed(2),
        };
      }),

    listToday: protectedProcedure.query(async ({ ctx }) => {
      await requirePapeleriaAccess(ctx.user.id);
      const db = await getDbOrThrow();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return db
        .select()
        .from(papeleriaSales)
        .where(
          and(
            eq(papeleriaSales.userId, ctx.user.id),
            gte(papeleriaSales.createdAt, startOfDay)
          )
        )
        .orderBy(desc(papeleriaSales.createdAt));
    }),

    listByDate: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida") }))
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();
        const start = new Date(input.date + "T00:00:00");
        const end = new Date(input.date + "T00:00:00");
        end.setDate(end.getDate() + 1);
        return db
          .select()
          .from(papeleriaSales)
          .where(
            and(
              eq(papeleriaSales.userId, ctx.user.id),
              gte(papeleriaSales.createdAt, start),
              lt(papeleriaSales.createdAt, end)
            )
          )
          .orderBy(desc(papeleriaSales.createdAt));
      }),

    getItems: protectedProcedure
      .input(z.object({ saleId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requirePapeleriaAccess(ctx.user.id);
        const db = await getDbOrThrow();

        const sales = await db
          .select()
          .from(papeleriaSales)
          .where(
            and(
              eq(papeleriaSales.id, input.saleId),
              eq(papeleriaSales.userId, ctx.user.id)
            )
          );
        if (sales.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Venta no encontrada" });
        }

        return db
          .select()
          .from(papeleriaSaleItems)
          .where(eq(papeleriaSaleItems.saleId, input.saleId))
          .orderBy(asc(papeleriaSaleItems.id));
      }),
  }),

  // ===========================================================================
  // ADMIN - otorgar acceso (igual que taqueria, posCode=papeleria)
  // ===========================================================================
  admin: router({
    grantFreeAccess: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          months: z.number().int().min(1).max(24).default(12),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin puede otorgar acceso gratis" });
        }
        const db = await getDbOrThrow();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + input.months);
        const transferReference = "ADMIN-GRANT-PAPE-" + Date.now();

        const result = await db.insert(transferPaymentRequests).values({
          userId: input.userId,
          planCode: "premium",
          planName: "Papeleria - Acceso de Cortesia",
          billingType: "annual",
          amount: "0",
          currency: "MXN",
          payerName: "Admin Grant",
          transferReference,
          notes: JSON.stringify({
            posCode: "papeleria",
            grantedFree: true,
            reason: input.reason || "Acceso de testing",
            months: input.months,
          }),
          status: "approved",
          reviewedByUserId: ctx.user.id,
          reviewedAt: now,
          activatedAt: now,
          periodStart: now,
          periodEnd: periodEnd,
        });

        return {
          success: true,
          id: result[0].insertId,
          periodEnd: periodEnd.toISOString(),
          message: "Acceso a papeleria activado por " + input.months + " meses",
        };
      }),

    grantMyselfAccess: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin puede usar este endpoint" });
      }
      const db = await getDbOrThrow();
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const transferReference = "SELF-TEST-PAPE-" + Date.now();

      const result = await db.insert(transferPaymentRequests).values({
        userId: ctx.user.id,
        planCode: "premium",
        planName: "Papeleria - Acceso Admin",
        billingType: "annual",
        amount: "0",
        currency: "MXN",
        payerName: "Admin Self-Grant",
        transferReference,
        notes: JSON.stringify({
          posCode: "papeleria",
          grantedFree: true,
          reason: "Admin self-access for testing",
        }),
        status: "approved",
        reviewedByUserId: ctx.user.id,
        reviewedAt: now,
        activatedAt: now,
        periodStart: now,
        periodEnd: periodEnd,
      });

      return {
        success: true,
        id: result[0].insertId,
        message: "Acceso admin a papeleria activado por 1 ano",
      };
    }),
  }),
});
