import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc, gte, lte, ne, like, or, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import {
  pets,
  vetProducts,
  vetServices,
  vetSales,
  vetSaleItems,
  vetVisits,
  vetVaccinations,
  vetClinicSettings,
  vetAppointments,
  customers,
} from "../../drizzle/schema";
import * as db from "../db";
import { createNotification } from "./notifications";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica que el usuario tenga acceso activo al programa "veterinaria".
 * Si no, lanza FORBIDDEN.
 */
async function ensureVetAccess(userId: number) {
  const hasAccess = await db.userHasProgramAccess(userId, "veterinaria" as any);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes acceso al modulo Veterinaria. Contacta al administrador.",
    });
  }
}

async function getDbOrThrow() {
  const conn = await db.getDb();
  if (!conn) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Base de datos no disponible",
    });
  }
  return conn;
}

// ============================================================================
// ROUTER VETERINARIA
// ============================================================================

export const veterinariaRouter = router({
  // ────────────────────────────────────────────────────────────────────────
  // CONFIGURACION DE LA CLINICA
  // ────────────────────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(vetClinicSettings)
        .where(eq(vetClinicSettings.ownerId, ctx.user.id))
        .limit(1);
      return rows[0] ?? null;
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          clinicName: z.string().max(255).optional(),
          doctorName: z.string().max(255).optional(),
          professionalLicense: z.string().max(100).optional(),
          university: z.string().max(255).optional(),
          phone: z.string().max(40).optional(),
          email: z.string().max(320).optional(),
          address: z.string().optional(),
          rfc: z.string().max(13).optional(),
          fiscalName: z.string().max(255).optional(),
          logoUrl: z.string().max(500).optional(),
          primaryColor: z.string().max(20).optional(),
          receiptFooter: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        const existing = await conn
          .select()
          .from(vetClinicSettings)
          .where(eq(vetClinicSettings.ownerId, ctx.user.id))
          .limit(1);

        if (existing[0]) {
          await conn
            .update(vetClinicSettings)
            .set(input)
            .where(eq(vetClinicSettings.ownerId, ctx.user.id));
        } else {
          await conn
            .insert(vetClinicSettings)
            .values({ ...input, ownerId: ctx.user.id });
        }

        const rows = await conn
          .select()
          .from(vetClinicSettings)
          .where(eq(vetClinicSettings.ownerId, ctx.user.id))
          .limit(1);
        return rows[0];
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // MASCOTAS (PETS)
  // ────────────────────────────────────────────────────────────────────────
  pets: router({
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          customerId: z.number().optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        const conditions = [eq(pets.ownerId, ctx.user.id)];

        if (input?.customerId) {
          conditions.push(eq(pets.customerId, input.customerId));
        }

        if (input?.search) {
          const q = `%${input.search}%`;
          conditions.push(
            or(
              like(pets.name, q),
              like(pets.breed, q),
              like(pets.microchip, q),
            )!,
          );
        }

        const rows = await conn
          .select({
            pet: pets,
            customer: customers,
          })
          .from(pets)
          .leftJoin(customers, eq(pets.customerId, customers.id))
          .where(and(...conditions))
          .orderBy(desc(pets.createdAt));

        return rows;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const rows = await conn
          .select({
            pet: pets,
            customer: customers,
          })
          .from(pets)
          .leftJoin(customers, eq(pets.customerId, customers.id))
          .where(and(eq(pets.id, input.id), eq(pets.ownerId, ctx.user.id)))
          .limit(1);

        if (!rows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mascota no encontrada" });
        }
        return rows[0];
      }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          name: z.string().min(1).max(100),
          species: z.enum(["perro", "gato", "ave", "reptil", "roedor", "exotico", "otro"]).default("perro"),
          breed: z.string().max(100).optional(),
          birthDate: z.coerce.date().optional(),
          sex: z.enum(["macho", "hembra", "desconocido"]).default("desconocido"),
          sterilized: z.boolean().default(false),
          color: z.string().max(100).optional(),
          microchip: z.string().max(50).optional(),
          weight: z.string().optional(),
          photoUrl: z.string().max(500).optional(),
          allergies: z.string().optional(),
          chronicConditions: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        // Verificar que el cliente pertenezca al usuario
        const cust = await conn
          .select()
          .from(customers)
          .where(and(eq(customers.id, input.customerId), eq(customers.userId, ctx.user.id)))
          .limit(1);
        if (!cust[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        const result = await conn.insert(pets).values({
          ...input,
          ownerId: ctx.user.id,
        });
        const insertId = (result as any).insertId as number;
        const rows = await conn.select().from(pets).where(eq(pets.id, insertId));
        return rows[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          species: z.enum(["perro", "gato", "ave", "reptil", "roedor", "exotico", "otro"]).optional(),
          breed: z.string().max(100).optional(),
          birthDate: z.coerce.date().optional(),
          sex: z.enum(["macho", "hembra", "desconocido"]).optional(),
          sterilized: z.boolean().optional(),
          color: z.string().max(100).optional(),
          microchip: z.string().max(50).optional(),
          weight: z.string().optional(),
          photoUrl: z.string().max(500).optional(),
          allergies: z.string().optional(),
          chronicConditions: z.string().optional(),
          notes: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const { id, ...data } = input;

        await conn
          .update(pets)
          .set(data)
          .where(and(eq(pets.id, id), eq(pets.ownerId, ctx.user.id)));

        const rows = await conn.select().from(pets).where(eq(pets.id, id));
        return rows[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(pets)
          .set({ isActive: false })
          .where(and(eq(pets.id, input.id), eq(pets.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // PRODUCTOS
  // ────────────────────────────────────────────────────────────────────────
  products: router({
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          category: z.string().optional(),
          activeOnly: z.boolean().default(true),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        const conditions = [eq(vetProducts.ownerId, ctx.user.id)];

        if (input?.activeOnly !== false) {
          conditions.push(eq(vetProducts.isActive, true));
        }

        if (input?.search) {
          const q = `%${input.search}%`;
          conditions.push(
            or(
              like(vetProducts.name, q),
              like(vetProducts.sku, q),
              like(vetProducts.barcode, q),
            )!,
          );
        }

        return await conn
          .select()
          .from(vetProducts)
          .where(and(...conditions))
          .orderBy(asc(vetProducts.name));
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          category: z.enum(["medicamento", "alimento", "accesorio", "higiene", "vitamina", "otro"]).default("otro"),
          price: z.string(),
          cost: z.string().optional(),
          stock: z.number().int().default(0),
          lowStockAlert: z.number().int().default(5),
          sku: z.string().max(100).optional(),
          barcode: z.string().max(100).optional(),
          requiresPrescription: z.boolean().default(false),
          expirationDate: z.coerce.date().optional(),
          batchNumber: z.string().max(100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const result = await conn.insert(vetProducts).values({
          ...input,
          ownerId: ctx.user.id,
        });
        const insertId = (result as any).insertId as number;
        const rows = await conn.select().from(vetProducts).where(eq(vetProducts.id, insertId));
        return rows[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          category: z.enum(["medicamento", "alimento", "accesorio", "higiene", "vitamina", "otro"]).optional(),
          price: z.string().optional(),
          cost: z.string().optional(),
          stock: z.number().int().optional(),
          lowStockAlert: z.number().int().optional(),
          sku: z.string().max(100).optional(),
          barcode: z.string().max(100).optional(),
          requiresPrescription: z.boolean().optional(),
          expirationDate: z.coerce.date().optional(),
          batchNumber: z.string().max(100).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const { id, ...data } = input;
        await conn
          .update(vetProducts)
          .set(data)
          .where(and(eq(vetProducts.id, id), eq(vetProducts.ownerId, ctx.user.id)));
        const rows = await conn.select().from(vetProducts).where(eq(vetProducts.id, id));
        return rows[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(vetProducts)
          .set({ isActive: false })
          .where(and(eq(vetProducts.id, input.id), eq(vetProducts.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // SERVICIOS
  // ────────────────────────────────────────────────────────────────────────
  services: router({
    list: protectedProcedure
      .input(
        z.object({
          activeOnly: z.boolean().default(true),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const conditions = [eq(vetServices.ownerId, ctx.user.id)];
        if (input?.activeOnly !== false) {
          conditions.push(eq(vetServices.isActive, true));
        }
        return await conn
          .select()
          .from(vetServices)
          .where(and(...conditions))
          .orderBy(asc(vetServices.name));
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          category: z.enum(["consulta", "vacuna", "desparasitacion", "estetica", "cirugia", "hospitalizacion", "domicilio", "otro"]).default("consulta"),
          price: z.string(),
          durationMinutes: z.number().int().default(30),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const result = await conn.insert(vetServices).values({
          ...input,
          ownerId: ctx.user.id,
        });
        const insertId = (result as any).insertId as number;
        const rows = await conn.select().from(vetServices).where(eq(vetServices.id, insertId));
        return rows[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          category: z.enum(["consulta", "vacuna", "desparasitacion", "estetica", "cirugia", "hospitalizacion", "domicilio", "otro"]).optional(),
          price: z.string().optional(),
          durationMinutes: z.number().int().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const { id, ...data } = input;
        await conn
          .update(vetServices)
          .set(data)
          .where(and(eq(vetServices.id, id), eq(vetServices.ownerId, ctx.user.id)));
        const rows = await conn.select().from(vetServices).where(eq(vetServices.id, id));
        return rows[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(vetServices)
          .set({ isActive: false })
          .where(and(eq(vetServices.id, input.id), eq(vetServices.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // VENTAS (POS)
  // ────────────────────────────────────────────────────────────────────────
  sales: router({
    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number().optional(),
          petId: z.number().optional(),
          discount: z.string().default("0"),
          paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia", "credito", "otro"]).default("efectivo"),
          paymentStatus: z.enum(["pagado", "pendiente", "parcial", "cancelado"]).default("pagado"),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              itemType: z.enum(["product", "service"]),
              productId: z.number().optional(),
              serviceId: z.number().optional(),
              description: z.string().min(1).max(255),
              quantity: z.string().default("1"),
              unitPrice: z.string(),
            }),
          ).min(1, "Debe haber al menos un item"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        // Calcular subtotal y total
        let subtotal = 0;
        for (const item of input.items) {
          const qty = parseFloat(item.quantity);
          const price = parseFloat(item.unitPrice);
          subtotal += qty * price;
        }
        const discount = parseFloat(input.discount);
        const total = subtotal - discount;

        // Crear venta
        const saleResult = await conn.insert(vetSales).values({
          ownerId: ctx.user.id,
          customerId: input.customerId,
          petId: input.petId,
          subtotal: subtotal.toFixed(2),
          discount: input.discount,
          total: total.toFixed(2),
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          notes: input.notes,
        });
        const saleId = (saleResult as any).insertId as number;

        // Insertar items
        for (const item of input.items) {
          const qty = parseFloat(item.quantity);
          const price = parseFloat(item.unitPrice);
          await conn.insert(vetSaleItems).values({
            saleId,
            itemType: item.itemType,
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: (qty * price).toFixed(2),
          });

          // Si es producto, descontar stock + trigger de stock bajo
          if (item.itemType === "product" && item.productId) {
            await conn
              .update(vetProducts)
              .set({
                stock: sql`${vetProducts.stock} - ${Math.floor(qty)}`,
              })
              .where(eq(vetProducts.id, item.productId));

            // Trigger: notificar si stock quedo bajo (<= 5)
            const updatedProduct = await conn
              .select()
              .from(vetProducts)
              .where(eq(vetProducts.id, item.productId));
            const product = updatedProduct[0];
            if (product && product.stock <= 5) {
              try {
                await createNotification({
                  userId: ctx.user.id,
                  type: "low_stock",
                  title: "Stock bajo",
                  message: product.name + " - quedan solo " + product.stock + " unidades",
                  relatedId: product.id,
                });
              } catch (e) {
                // Silent fail: no romper la venta si falla la notif
                console.error("Failed to create low_stock notification:", e);
              }
            }
          }
        }

        // Trigger: notificar venta completada
        try {
          await createNotification({
            userId: ctx.user.id,
            type: "sale",
            title: "Venta registrada",
            message: "Cobraste $" + total.toFixed(2) + " (" + input.items.length + " items)",
            relatedId: saleId,
          });
        } catch (e) {
          console.error("Failed to create sale notification:", e);
        }

        const rows = await conn.select().from(vetSales).where(eq(vetSales.id, saleId));
        return rows[0];
      }),

    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(200).default(50),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        return await conn
          .select({
            sale: vetSales,
            customer: customers,
            pet: pets,
          })
          .from(vetSales)
          .leftJoin(customers, eq(vetSales.customerId, customers.id))
          .leftJoin(pets, eq(vetSales.petId, pets.id))
          .where(eq(vetSales.ownerId, ctx.user.id))
          .orderBy(desc(vetSales.createdAt))
          .limit(input?.limit ?? 50);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const saleRows = await conn
          .select({
            sale: vetSales,
            customer: customers,
            pet: pets,
          })
          .from(vetSales)
          .leftJoin(customers, eq(vetSales.customerId, customers.id))
          .leftJoin(pets, eq(vetSales.petId, pets.id))
          .where(and(eq(vetSales.id, input.id), eq(vetSales.ownerId, ctx.user.id)))
          .limit(1);

        if (!saleRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Venta no encontrada" });
        }

        const items = await conn
          .select()
          .from(vetSaleItems)
          .where(eq(vetSaleItems.saleId, input.id));

        return {
          ...saleRows[0],
          items,
        };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const sales = await conn
        .select()
        .from(vetSales)
        .where(
          and(
            eq(vetSales.ownerId, ctx.user.id),
            gte(vetSales.createdAt, startOfMonth),
          ),
        );

      const totalRevenue = sales.reduce((acc, s) => acc + parseFloat(s.total), 0);
      const totalSales = sales.length;

      return {
        totalRevenue: totalRevenue.toFixed(2),
        totalSales,
      };
    }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // VISITAS / EXPEDIENTE CLINICO
  // ────────────────────────────────────────────────────────────────────────
  visits: router({
    listByPet: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        return await conn
          .select()
          .from(vetVisits)
          .where(
            and(
              eq(vetVisits.petId, input.petId),
              eq(vetVisits.ownerId, ctx.user.id),
            ),
          )
          .orderBy(desc(vetVisits.visitDate));
      }),

    create: protectedProcedure
      .input(
        z.object({
          petId: z.number(),
          customerId: z.number(),
          visitDate: z.coerce.date().optional(),
          reason: z.string().min(1).max(500),
          weight: z.string().optional(),
          temperature: z.string().optional(),
          symptoms: z.string().optional(),
          diagnosis: z.string().optional(),
          treatment: z.string().optional(),
          prescribedMedications: z.string().optional(),
          recommendations: z.string().optional(),
          nextVisitDate: z.coerce.date().optional(),
          nextVisitReason: z.string().max(500).optional(),
          saleId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const result = await conn.insert(vetVisits).values({
          ...input,
          ownerId: ctx.user.id,
          visitDate: input.visitDate ?? new Date(),
        });
        const insertId = (result as any).insertId as number;

        // Si registró peso, actualizar peso de la mascota
        if (input.weight) {
          await conn
            .update(pets)
            .set({ weight: input.weight })
            .where(eq(pets.id, input.petId));
        }

        const rows = await conn.select().from(vetVisits).where(eq(vetVisits.id, insertId));
        return rows[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          reason: z.string().min(1).max(500).optional(),
          weight: z.string().optional(),
          temperature: z.string().optional(),
          symptoms: z.string().optional(),
          diagnosis: z.string().optional(),
          treatment: z.string().optional(),
          prescribedMedications: z.string().optional(),
          recommendations: z.string().optional(),
          nextVisitDate: z.coerce.date().optional(),
          nextVisitReason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const { id, ...data } = input;
        await conn
          .update(vetVisits)
          .set(data)
          .where(and(eq(vetVisits.id, id), eq(vetVisits.ownerId, ctx.user.id)));
        const rows = await conn.select().from(vetVisits).where(eq(vetVisits.id, id));
        return rows[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .delete(vetVisits)
          .where(and(eq(vetVisits.id, input.id), eq(vetVisits.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // VACUNAS
  // ────────────────────────────────────────────────────────────────────────
  vaccinations: router({
    listByPet: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        return await conn
          .select()
          .from(vetVaccinations)
          .where(
            and(
              eq(vetVaccinations.petId, input.petId),
              eq(vetVaccinations.ownerId, ctx.user.id),
            ),
          )
          .orderBy(desc(vetVaccinations.appliedDate));
      }),

    create: protectedProcedure
      .input(
        z.object({
          petId: z.number(),
          visitId: z.number().optional(),
          vaccineName: z.string().min(1).max(255),
          brand: z.string().max(100).optional(),
          batchNumber: z.string().max(100).optional(),
          appliedDate: z.coerce.date().optional(),
          nextDoseDate: z.coerce.date().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const result = await conn.insert(vetVaccinations).values({
          ...input,
          ownerId: ctx.user.id,
          appliedDate: input.appliedDate ?? new Date(),
        });
        const insertId = (result as any).insertId as number;
        const rows = await conn.select().from(vetVaccinations).where(eq(vetVaccinations.id, insertId));
        return rows[0];
      }),

    upcoming: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(30) }).optional())
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + (input?.daysAhead ?? 30));

        return await conn
          .select({
            vaccination: vetVaccinations,
            pet: pets,
            customer: customers,
          })
          .from(vetVaccinations)
          .leftJoin(pets, eq(vetVaccinations.petId, pets.id))
          .leftJoin(customers, eq(pets.customerId, customers.id))
          .where(
            and(
              eq(vetVaccinations.ownerId, ctx.user.id),
              gte(vetVaccinations.nextDoseDate, new Date()),
              gte(futureDate, vetVaccinations.nextDoseDate),
            ),
          )
          .orderBy(asc(vetVaccinations.nextDoseDate));
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .delete(vetVaccinations)
          .where(and(eq(vetVaccinations.id, input.id), eq(vetVaccinations.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────────────────
  // CITAS (APPOINTMENTS)
  // ────────────────────────────────────────────────────────────────────────
  appointments: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pendiente", "confirmada", "completada", "cancelada"]).optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        const conditions: any[] = [eq(vetAppointments.userId, ctx.user.id)];

        if (input?.status) {
          conditions.push(eq(vetAppointments.status, input.status));
        }
        if (input?.from) {
          conditions.push(gte(vetAppointments.appointmentAt, new Date(input.from)));
        }
        if (input?.to) {
          conditions.push(lte(vetAppointments.appointmentAt, new Date(input.to)));
        }

        const rows = await conn
          .select({
            appointment: vetAppointments,
            pet: pets,
            customer: customers,
          })
          .from(vetAppointments)
          .leftJoin(pets, eq(vetAppointments.petId, pets.id))
          .leftJoin(customers, eq(vetAppointments.customerId, customers.id))
          .where(and(...conditions))
          .orderBy(asc(vetAppointments.appointmentAt));

        return rows;
      }),

    upcoming: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();

      const now = new Date();
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return await conn
        .select({
          appointment: vetAppointments,
          pet: pets,
          customer: customers,
        })
        .from(vetAppointments)
        .leftJoin(pets, eq(vetAppointments.petId, pets.id))
        .leftJoin(customers, eq(vetAppointments.customerId, customers.id))
        .where(
          and(
            eq(vetAppointments.userId, ctx.user.id),
            gte(vetAppointments.appointmentAt, now),
            lte(vetAppointments.appointmentAt, in30days),
            ne(vetAppointments.status, "cancelada"),
          ),
        )
        .orderBy(asc(vetAppointments.appointmentAt));
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number().int().positive(),
          petId: z.number().int().positive(),
          appointmentAt: z.string(),
          durationMinutes: z.number().int().positive().default(30),
          reason: z.string().min(1).max(200),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        await conn.insert(vetAppointments).values({
          userId: ctx.user.id,
          customerId: input.customerId,
          petId: input.petId,
          appointmentAt: new Date(input.appointmentAt),
          durationMinutes: input.durationMinutes,
          reason: input.reason,
          notes: input.notes ?? null,
          status: "pendiente",
        });

        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pendiente", "confirmada", "completada", "cancelada"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        await conn
          .update(vetAppointments)
          .set({ status: input.status })
          .where(
            and(
              eq(vetAppointments.id, input.id),
              eq(vetAppointments.userId, ctx.user.id),
            ),
          );

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .delete(vetAppointments)
          .where(
            and(
              eq(vetAppointments.id, input.id),
              eq(vetAppointments.userId, ctx.user.id),
            ),
          );
        return { success: true };
      }),
  }),
});
