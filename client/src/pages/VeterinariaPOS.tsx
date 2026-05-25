import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc, gte, lte, ne, like, or, sql, inArray } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
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
  petOwnerPortalTokens,
  portalAccessLog,
} from "../../drizzle/schema";
import * as db from "../db";
import { veterinariaCashiers } from "../db";
import { createNotification } from "./notifications";

// ============================================================================
// P2 - PORTAL DE DUENOS: helpers de tokens (admin side)
// ----------------------------------------------------------------------------
// Token plano: 32 bytes random -> base64url (43 chars, URL-safe)
// Token hash:  SHA-256 hex (64 chars) -> guardado en BD
// El plano se devuelve UNA SOLA VEZ al generar; despues solo el hash existe.
// ============================================================================
function generatePortalToken(): { plainToken: string; tokenHash: string } {
  // 32 bytes = 256 bits de entropia -> a prueba de brute force
  const raw = randomBytes(32);
  const plainToken = raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");
  return { plainToken, tokenHash };
}

function hashPortalToken(plainToken: string): string {
  return createHash("sha256").update(plainToken).digest("hex");
}

// ============================================================================
// P3 - Helpers para acceso publico al portal (sin auth de usuario)
// ----------------------------------------------------------------------------
// Para Ley Federal de Proteccion de Datos MX: nunca guardamos IP plana,
// solo su hash SHA-256 (irreversible). Permite detectar abuso sin violar
// privacidad del visitante.
// ============================================================================
function hashIp(ip: string | undefined): string | null {
  if (!ip || typeof ip !== "string") return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}

function extractIpFromCtx(ctx: any): string | undefined {
  try {
    const fwd = ctx?.req?.headers?.["x-forwarded-for"];
    if (typeof fwd === "string") return fwd.split(",")[0].trim();
    if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).trim();
    const real = ctx?.req?.headers?.["x-real-ip"];
    if (typeof real === "string") return real.trim();
    return ctx?.req?.socket?.remoteAddress;
  } catch {
    return undefined;
  }
}

function extractUserAgent(ctx: any): string | undefined {
  try {
    const ua = ctx?.req?.headers?.["user-agent"];
    return typeof ua === "string" ? ua.slice(0, 255) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Loggea evento de acceso al portal. Defensivo: si falla, no rompe la respuesta.
 */
async function logPortalAccess(
  conn: any,
  params: {
    tokenId?: number | null;
    customerId?: number | null;
    ipHash: string | null;
    userAgent: string | null | undefined;
    eventType: "view" | "denied" | "rate_limited";
  },
) {
  try {
    await conn.insert(portalAccessLog).values({
      tokenId: params.tokenId ?? null,
      customerId: params.customerId ?? null,
      ipHash: params.ipHash,
      userAgent: params.userAgent ?? null,
      eventType: params.eventType,
    });
  } catch (err) {
    console.error("Portal access log insert failed:", err);
    // Silencioso: no afectar al usuario final
  }
}

// ============================================================================
// PASSWORD HASHING - scrypt nativo de Node (sin dependencias extras)
// ============================================================================

const scryptAsync = promisify(scrypt);

/**
 * Hashea un password usando scrypt. Genera salt aleatorio.
 * Formato: "salt:hash" (ambos hex)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return salt + ":" + derived.toString("hex");
}

/**
 * Verifica un password contra el hash almacenado.
 * Constant-time comparison para evitar timing attacks.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hexHash] = parts;
  const hashBuffer = Buffer.from(hexHash, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (derived.length !== hashBuffer.length) return false;
  return timingSafeEqual(derived, hashBuffer);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica que el usuario tenga acceso activo al programa "veterinaria".
 * Si no, lanza FORBIDDEN.
 *
 * SUBSCRIPTION CORE V1 (hotfix Ana Karen):
 * Antes usaba db.userHasProgramAccess (legacy puro, lee solo de userProgramAccess).
 * Ahora usa db.getSubscriptionState que valida hibridamente con 3 niveles:
 *   1. subscriptions table (fuente canonica nueva)
 *   2. userProgramAccess (legacy enum)
 *   3. transferPaymentRequests aprobados vigentes
 *
 * Cualquiera de los 3 que de OK desbloquea el acceso. Esto resuelve el caso
 * donde un cliente paga (crea subscription) pero userProgramAccess no se actualiza.
 *
 * Admin global tiene bypass: pasa siempre.
 */
async function ensureVetAccess(userId: number) {
  // Admin global: acceso total sin checks
  const user = await db.getUserById(userId);
  if (user?.role === "admin") return;

  // Resto de usuarios: validar via subscription state (hibrido)
  // getSubscriptionState consulta 3 niveles:
  //   1. subscriptions (canonica)
  //   2. userProgramAccess (legacy)
  //   3. transferPaymentRequests aprobados vigentes
  const state = await db.getSubscriptionState({
    userId,
    posCode: "veterinaria",
  });
  if (!state.hasAccess) {
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
          // B2: campos para ticket mixto clinico
          attendedByCashierId: z.number().int().positive().optional(),
          amountPaid: z.string().optional(),
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

        // B2: validar coherencia de amountPaid segun paymentStatus
        let finalAmountPaid: string | undefined = undefined;
        if (input.paymentStatus === "parcial") {
          if (!input.amountPaid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Para pago parcial debes indicar el monto del anticipo (amountPaid)",
            });
          }
          const paid = parseFloat(input.amountPaid);
          if (isNaN(paid) || paid <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "El anticipo debe ser un monto positivo",
            });
          }
          if (paid >= total) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "El anticipo no puede ser mayor o igual al total. Marca como 'pagado' si cobraste todo.",
            });
          }
          finalAmountPaid = paid.toFixed(2);
        } else if (input.paymentStatus === "pagado") {
          // En pago completo, amountPaid = total (registro explicito)
          finalAmountPaid = total.toFixed(2);
        }
        // Para pendiente y cancelado dejamos amountPaid como NULL.

        // B2: validar que el cashier (si se envia) pertenezca a la clinica del owner
        if (input.attendedByCashierId) {
          const cashierList = await db.listVetCashiers(ctx.user.id, { status: "all" });
          const valid = cashierList.some((c) => c.id === input.attendedByCashierId);
          if (!valid) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "El cajero seleccionado no pertenece a tu clinica",
            });
          }
        }

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
          // B2: nuevos campos
          attendedByCashierId: input.attendedByCashierId,
          amountPaid: finalAmountPaid,
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

        // ====================================================================
        // B3.1: AUTO-CONECTAR CAJA CON EXPEDIENTE CLINICO
        // Si la venta tiene mascota Y al menos un servicio (consulta, vacuna,
        // bano, cirugia, etc.), crear automaticamente una visita en el
        // expediente clinico vinculada a la venta.
        //
        // Lo que se omite (Ana Karen lo llena despues en el expediente):
        //   - sintomas, diagnostico, tratamiento, recetas, signos vitales
        // Lo que se llena automaticamente:
        //   - fecha (now), motivo (nombres de servicios), saleId vinculado
        //
        // Esta funcion es defensiva: si falla, la venta NO se cae.
        // ====================================================================
        const serviceItems = input.items.filter((it) => it.itemType === "service");
        if (input.petId && input.customerId && serviceItems.length > 0) {
          try {
            // Motivo = lista de nombres de servicios (max 500 chars)
            const reasonRaw = serviceItems
              .map((it) => it.description)
              .join(" + ");
            const reason = reasonRaw.length > 500 ? reasonRaw.slice(0, 497) + "..." : reasonRaw;

            const visitInsert = await conn.insert(vetVisits).values({
              ownerId: ctx.user.id,
              petId: input.petId,
              customerId: input.customerId,
              reason,
              saleId,
              // visitDate usa defaultNow del schema
              // Resto de campos clinicos quedan NULL, Ana Karen los llena despues
            });
            const visitId = (visitInsert as any).insertId as number | undefined;

            // Notificacion suave de creacion (silenciada si falla)
            try {
              await createNotification({
                userId: ctx.user.id,
                type: "visit",
                title: "Visita registrada en expediente",
                message: "Se creo entrada clinica para " + reason.slice(0, 80),
                relatedId: saleId,
              });
            } catch (notifErr) {
              console.error("Failed to create visit notification:", notifErr);
            }

            // ============================================================
            // B3.2: AUTO-VACUNACION
            // Si alguno de los servicios vendidos parece ser una vacuna
            // (matching por nombre), crear automaticamente registro en
            // vetVaccinations con nextDoseDate calculado.
            //
            // Heuristica de deteccion: nombre contiene "vacuna" o keywords
            // de vacunas comunes en MX (rabia, multiple, triple, sextuple,
            // moquillo, parvo, leucemia, bordetella, etc.).
            //
            // Intervalo de proxima dosis:
            //   - "refuerzo" en el nombre  -> 1 ano (365 dias)
            //   - "cachorro" o "puppy"     -> 21 dias (serie inicial)
            //   - "antirrabica"            -> 1 ano
            //   - default                  -> 1 ano (vacuna estandar adulto)
            // ============================================================
            try {
              const isVaccine = (name: string): boolean => {
                const n = name.toLowerCase();
                const kws = [
                  "vacuna", "vaccination", "rabia", "antirrabica",
                  "multiple", "triple", "sextuple", "quintuple", "decuple",
                  "moquillo", "parvo", "parvovirus", "leucemia", "bordetella",
                  "leptospira", "hepatitis", "panleucopenia",
                ];
                return kws.some((k) => n.includes(k));
              };

              const calcNextDose = (name: string): Date => {
                const n = name.toLowerCase();
                const now = new Date();
                const next = new Date(now);
                if (n.includes("cachorro") || n.includes("puppy") || n.includes("inicial")) {
                  // Serie cachorro: refuerzo en 21 dias
                  next.setDate(now.getDate() + 21);
                } else {
                  // Default: refuerzo anual (365 dias)
                  next.setDate(now.getDate() + 365);
                }
                return next;
              };

              const vaccineServices = serviceItems.filter((it) => isVaccine(it.description));

              for (const v of vaccineServices) {
                try {
                  await conn.insert(vetVaccinations).values({
                    ownerId: ctx.user.id,
                    petId: input.petId,
                    visitId: visitId ?? null,
                    vaccineName: v.description.slice(0, 255),
                    appliedDate: new Date(),
                    nextDoseDate: calcNextDose(v.description),
                    // brand, batchNumber, notes quedan NULL - Ana Karen puede llenar despues
                  });
                } catch (vacErr) {
                  console.error("B3.2 single vaccine insert failed:", vacErr);
                }
              }

              // Notificacion agrupada si se crearon vacunas
              if (vaccineServices.length > 0) {
                try {
                  const namesPreview = vaccineServices.map((v) => v.description).join(", ").slice(0, 100);
                  await createNotification({
                    userId: ctx.user.id,
                    type: "vaccine",
                    title: vaccineServices.length === 1 ? "Vacuna registrada" : (vaccineServices.length + " vacunas registradas"),
                    message: "Aplicadas: " + namesPreview + ". Proxima dosis calculada automaticamente.",
                    relatedId: saleId,
                  });
                } catch (notifErr) {
                  console.error("Failed to create vaccine notification:", notifErr);
                }
              }
            } catch (vacBlockErr) {
              // Capa exterior: si toda la deteccion falla, NO afectar la venta
              console.error("B3.2 auto-vaccination block failed (venta " + saleId + "):", vacBlockErr);
            }
          } catch (visitErr) {
            // Critico: si falla la creacion de visita, NO afectamos la venta.
            // El cliente ya pago. Solo logueamos.
            console.error("B3.1 auto-visit creation failed (venta " + saleId + "):", visitErr);
          }
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

    // ────────────────────────────────────────────────────────────────────────
    // B2: CUENTAS POR COBRAR
    // ────────────────────────────────────────────────────────────────────────
    /**
     * Lista ventas con saldo pendiente (parcial o pendiente).
     * Util para que Ana Karen vea su lista de "por cobrar".
     */
    listPending: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();

      const rows = await conn
        .select({
          sale: vetSales,
          customer: customers,
          pet: pets,
        })
        .from(vetSales)
        .leftJoin(customers, eq(vetSales.customerId, customers.id))
        .leftJoin(pets, eq(vetSales.petId, pets.id))
        .where(
          and(
            eq(vetSales.ownerId, ctx.user.id),
            // Solo ventas con saldo: parcial o pendiente
            inArray(vetSales.paymentStatus, ["parcial", "pendiente"] as const),
          ),
        )
        .orderBy(desc(vetSales.createdAt));

      // Enriquecer con saldo pendiente calculado
      return rows.map((row) => {
        const total = parseFloat(row.sale.total);
        const paid = row.sale.amountPaid ? parseFloat(row.sale.amountPaid) : 0;
        const balance = Math.max(0, total - paid);
        return {
          ...row,
          balance: balance.toFixed(2),
        };
      });
    }),

    /**
     * Registra un pago adicional sobre una venta con saldo pendiente.
     * - Si el nuevo amountPaid >= total => paymentStatus pasa a "pagado".
     * - Si el nuevo amountPaid < total => paymentStatus se queda en "parcial".
     */
    updatePayment: protectedProcedure
      .input(
        z.object({
          saleId: z.number().int().positive(),
          additionalAmount: z.string().refine((v) => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0;
          }, "El monto adicional debe ser positivo"),
          paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia", "credito", "otro"]).optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        // Cargar la venta y validar ownership
        const rows = await conn
          .select()
          .from(vetSales)
          .where(and(eq(vetSales.id, input.saleId), eq(vetSales.ownerId, ctx.user.id)));
        const sale = rows[0];
        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Venta no encontrada" });
        }

        // Solo se puede cobrar adicional sobre ventas con saldo
        if (sale.paymentStatus !== "parcial" && sale.paymentStatus !== "pendiente") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta venta no tiene saldo pendiente (estado: " + sale.paymentStatus + ")",
          });
        }

        const total = parseFloat(sale.total);
        const previouslyPaid = sale.amountPaid ? parseFloat(sale.amountPaid) : 0;
        const newPaid = previouslyPaid + parseFloat(input.additionalAmount);

        if (newPaid > total + 0.01) {
          // +0.01 tolera redondeo decimal
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El pago adicional excede el saldo pendiente (saldo: $" + (total - previouslyPaid).toFixed(2) + ")",
          });
        }

        // Determinar nuevo paymentStatus
        const newStatus: "pagado" | "parcial" = newPaid >= total - 0.01 ? "pagado" : "parcial";

        // Construir notas acumuladas (no sobreescribir)
        const paidStamp = "Pago adicional " + new Date().toISOString().slice(0, 10) +
          ": $" + parseFloat(input.additionalAmount).toFixed(2) +
          (input.paymentMethod ? " (" + input.paymentMethod + ")" : "") +
          (input.notes ? " - " + input.notes : "");
        const combinedNotes = sale.notes ? sale.notes + " | " + paidStamp : paidStamp;

        await conn
          .update(vetSales)
          .set({
            amountPaid: newPaid.toFixed(2),
            paymentStatus: newStatus,
            // Si se especifico nuevo metodo de pago, actualizarlo
            paymentMethod: input.paymentMethod ?? sale.paymentMethod,
            notes: combinedNotes,
          })
          .where(eq(vetSales.id, input.saleId));

        // Notificar si quedo saldada
        if (newStatus === "pagado") {
          try {
            await createNotification({
              userId: ctx.user.id,
              type: "sale",
              title: "Venta saldada",
              message: "Cuenta por cobrar #" + sale.id + " saldada por $" + total.toFixed(2),
              relatedId: sale.id,
            });
          } catch (e) {
            console.error("Failed to create paid-off notification:", e);
          }
        }

        const updated = await conn.select().from(vetSales).where(eq(vetSales.id, input.saleId));
        return updated[0];
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

  // ============================================================================
  // CASHIERS - Empleados de la veterinaria (CRUD scoped por ownerUserId)
  // ============================================================================
  cashiers: router({
    /**
     * Lista cajeros del usuario actual (filtrable por estado).
     */
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.enum(["active", "inactive", "all"]).optional().default("all"),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const cashiers = await db.listVetCashiers(ctx.user.id, {
          status: input?.status ?? "all",
        });
        // No retornar passwordHash al cliente
        return cashiers.map((c) => {
          const { passwordHash, ...safe } = c;
          return safe;
        });
      }),

    /**
     * Crea un nuevo cajero. Hashea password con scrypt.
     */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(2, "Nombre minimo 2 caracteres"),
          email: z.string().trim().email("Email invalido"),
          password: z.string().min(6, "Password minimo 6 caracteres"),
          role: z.enum(["doctor", "asistente", "recepcionista"]).default("asistente"),
          branchName: z.string().trim().max(120).optional().default(""),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);

        // Verificar que no exista email duplicado en este tenant
        const existing = await db.getVetCashierByEmail(input.email, ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un cajero con ese email en tu veterinaria",
          });
        }

        const passwordHash = await hashPassword(input.password);
        const created = await db.createVetCashier({
          ownerUserId: ctx.user.id,
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          branchName: input.branchName,
        });

        // No retornar passwordHash
        const { passwordHash: _ph, ...safe } = created;
        return safe;
      }),

    /**
     * Actualiza datos del cajero (no incluye password - usar updatePassword).
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().trim().min(2).optional(),
          email: z.string().trim().email().optional(),
          role: z.enum(["doctor", "asistente", "recepcionista"]).optional(),
          branchName: z.string().trim().max(120).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);

        // Si cambia email, verificar que no choque
        if (input.email !== undefined) {
          const existing = await db.getVetCashierByEmail(input.email, ctx.user.id);
          if (existing && existing.id !== input.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Ya existe un cajero con ese email",
            });
          }
        }

        const { id, ...data } = input;
        const updated = await db.updateVetCashier(id, ctx.user.id, data);
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cajero no encontrado" });
        }
        const { passwordHash: _ph, ...safe } = updated;
        return safe;
      }),

    /**
     * Cambia la password de un cajero (genera nuevo hash).
     */
    updatePassword: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          newPassword: z.string().min(6, "Password minimo 6 caracteres"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const passwordHash = await hashPassword(input.newPassword);
        const updated = await db.updateVetCashier(input.id, ctx.user.id, { passwordHash });
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cajero no encontrado" });
        }
        return { success: true };
      }),

    /**
     * Activa o desactiva cajero (soft delete - preserva historico).
     */
    setStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["active", "inactive"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const updated = await db.setVetCashierStatus(input.id, ctx.user.id, input.status);
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cajero no encontrado" });
        }
        const { passwordHash: _ph, ...safe } = updated;
        return safe;
      }),

    /**
     * Elimina cajero PERMANENTEMENTE (hard delete).
     * Recomendado usar setStatus(inactive) para preservar historico.
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        return await db.deleteVetCashier(input.id, ctx.user.id);
      }),
  }),

  // ==========================================================================
  // P2 - PORTAL DE DUENOS DE MASCOTAS (admin side)
  // --------------------------------------------------------------------------
  // Endpoints para que Ana Karen (admin clinica) genere, vea y revoque links
  // privados que envia a sus clientes finales por WhatsApp.
  //
  // El endpoint publico (lectura por token, sin auth) vive en P3 como router
  // separado fuera del veterinariaRouter (publicProcedure).
  // ==========================================================================
  portal: router({
    /**
     * Genera un nuevo token privado para un cliente.
     * Si ya existe un token activo para ese cliente, lo revoca y crea uno nuevo
     * (politica: un solo token activo por cliente a la vez).
     *
     * Retorna el token PLANO una sola vez. Despues solo el hash queda en BD.
     */
    generate: protectedProcedure
      .input(
        z.object({
          customerId: z.number().int().positive(),
          expiresInDays: z.number().int().min(7).max(730).default(365),
          internalNotes: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        // Validar que el cliente exista y pertenezca a un cliente conocido
        const customerRows = await conn
          .select()
          .from(customers)
          .where(eq(customers.id, input.customerId));
        if (!customerRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        // Revocar tokens activos previos del mismo cliente en esta clinica
        await conn
          .update(petOwnerPortalTokens)
          .set({ status: "revoked" })
          .where(
            and(
              eq(petOwnerPortalTokens.clinicUserId, ctx.user.id),
              eq(petOwnerPortalTokens.customerId, input.customerId),
              eq(petOwnerPortalTokens.status, "active"),
            ),
          );

        // Generar token nuevo
        const { plainToken, tokenHash } = generatePortalToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        const insertResult = await conn.insert(petOwnerPortalTokens).values({
          clinicUserId: ctx.user.id,
          customerId: input.customerId,
          tokenHash,
          status: "active",
          expiresAt,
          internalNotes: input.internalNotes,
        });
        const insertedId = (insertResult as any).insertId as number;

        return {
          tokenId: insertedId,
          plainToken, // Solo se devuelve UNA VEZ. Ana Karen lo copia/comparte ahora.
          expiresAt: expiresAt.toISOString(),
          customerName: customerRows[0].name,
        };
      }),

    /**
     * Lista los tokens del cliente especificado.
     * NO retorna el token plano (no lo tenemos guardado).
     */
    listByCustomer: protectedProcedure
      .input(z.object({ customerId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();
        return await conn
          .select({
            id: petOwnerPortalTokens.id,
            status: petOwnerPortalTokens.status,
            expiresAt: petOwnerPortalTokens.expiresAt,
            lastAccessAt: petOwnerPortalTokens.lastAccessAt,
            accessCount: petOwnerPortalTokens.accessCount,
            internalNotes: petOwnerPortalTokens.internalNotes,
            createdAt: petOwnerPortalTokens.createdAt,
          })
          .from(petOwnerPortalTokens)
          .where(
            and(
              eq(petOwnerPortalTokens.clinicUserId, ctx.user.id),
              eq(petOwnerPortalTokens.customerId, input.customerId),
            ),
          )
          .orderBy(desc(petOwnerPortalTokens.createdAt));
      }),

    /**
     * Lista todos los tokens activos de la clinica (vista global).
     * Util para dashboard "X clientes con portal activo".
     */
    listActive: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();
      return await conn
        .select({
          token: petOwnerPortalTokens,
          customer: customers,
        })
        .from(petOwnerPortalTokens)
        .leftJoin(customers, eq(petOwnerPortalTokens.customerId, customers.id))
        .where(
          and(
            eq(petOwnerPortalTokens.clinicUserId, ctx.user.id),
            eq(petOwnerPortalTokens.status, "active"),
          ),
        )
        .orderBy(desc(petOwnerPortalTokens.createdAt));
    }),

    /**
     * Revoca un token especifico. No se puede deshacer; hay que generar nuevo.
     */
    revoke: protectedProcedure
      .input(z.object({ tokenId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await ensureVetAccess(ctx.user.id);
        const conn = await getDbOrThrow();

        // Validar ownership
        const rows = await conn
          .select()
          .from(petOwnerPortalTokens)
          .where(
            and(
              eq(petOwnerPortalTokens.id, input.tokenId),
              eq(petOwnerPortalTokens.clinicUserId, ctx.user.id),
            ),
          );
        if (!rows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token no encontrado" });
        }

        await conn
          .update(petOwnerPortalTokens)
          .set({ status: "revoked" })
          .where(eq(petOwnerPortalTokens.id, input.tokenId));

        return { ok: true, revokedId: input.tokenId };
      }),

    /**
     * Estadisticas globales del portal para dashboard de Ana Karen.
     */
    stats: protectedProcedure.query(async ({ ctx }) => {
      await ensureVetAccess(ctx.user.id);
      const conn = await getDbOrThrow();
      const allRows = await conn
        .select()
        .from(petOwnerPortalTokens)
        .where(eq(petOwnerPortalTokens.clinicUserId, ctx.user.id));

      const active = allRows.filter((t) => t.status === "active").length;
      const revoked = allRows.filter((t) => t.status === "revoked").length;
      const totalAccess = allRows.reduce((acc, t) => acc + (t.accessCount ?? 0), 0);
      const usedAtLeastOnce = allRows.filter((t) => (t.accessCount ?? 0) > 0).length;

      return {
        active,
        revoked,
        totalTokens: allRows.length,
        totalAccess,
        usedAtLeastOnce,
      };
    }),
  }),

  // ==========================================================================
  // P3 - PORTAL DE DUENOS DE MASCOTAS (vista publica por token)
  // --------------------------------------------------------------------------
  // Endpoint que la Sra. Perez (dueno final) consume desde su celular
  // cuando entra a cyberpiezas.com/mi-mascota/:token
  //
  // SIN autenticacion de usuario. El token ES la credencial.
  //
  // Decisiones de seguridad:
  //  - Rate limit: max 30 requests por IP hasheada en 60 segundos
  //  - Token recibido se hashea ANTES de buscar en BD
  //  - Token revocado o expirado: 403, sin pistas adicionales
  //  - Datos retornados: solo lo NO sensible (sin diagnosticos, notas, costos)
  //  - Cada acceso queda en portalAccessLog para auditoria
  // ==========================================================================
  publicView: router({
    /**
     * Lee el portal del dueno con base en el token. Endpoint principal.
     */
    getByToken: publicProcedure
      .input(
        z.object({
          token: z.string().min(20).max(128),
        }),
      )
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const ipHash = hashIp(extractIpFromCtx(ctx));
        const userAgent = extractUserAgent(ctx);

        // ───────────────────────────────────────────────────────────────────
        // 1. Rate limiting por IP (max 30 requests / 60 segundos)
        // ───────────────────────────────────────────────────────────────────
        if (ipHash) {
          const sixtySecondsAgo = new Date(Date.now() - 60_000);
          const recentRequests = await conn
            .select({ id: portalAccessLog.id })
            .from(portalAccessLog)
            .where(
              and(
                eq(portalAccessLog.ipHash, ipHash),
                gte(portalAccessLog.accessedAt, sixtySecondsAgo),
              ),
            )
            .limit(31);

          if (recentRequests.length >= 30) {
            await logPortalAccess(conn, {
              ipHash,
              userAgent,
              eventType: "rate_limited",
            });
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Demasiados intentos. Intenta de nuevo en un minuto.",
            });
          }
        }

        // ───────────────────────────────────────────────────────────────────
        // 2. Hashear token recibido y buscar
        // ───────────────────────────────────────────────────────────────────
        const tokenHash = hashPortalToken(input.token);
        const tokenRows = await conn
          .select()
          .from(petOwnerPortalTokens)
          .where(eq(petOwnerPortalTokens.tokenHash, tokenHash))
          .limit(1);
        const tokenRow = tokenRows[0];

        // 3. Token no existe -> 404 (sin revelar si fue typo o link falso)
        if (!tokenRow) {
          await logPortalAccess(conn, {
            ipHash,
            userAgent,
            eventType: "denied",
          });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link no valido. Verifica con tu veterinaria que te enviaron el link correcto.",
          });
        }

        // 4. Token revocado -> 403
        if (tokenRow.status === "revoked") {
          await logPortalAccess(conn, {
            tokenId: tokenRow.id,
            customerId: tokenRow.customerId,
            ipHash,
            userAgent,
            eventType: "denied",
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Este link fue desactivado. Solicita uno nuevo a tu veterinaria.",
          });
        }

        // 5. Token expirado -> auto-marcar 'expired' y 403
        if (tokenRow.expiresAt < new Date()) {
          if (tokenRow.status === "active") {
            await conn
              .update(petOwnerPortalTokens)
              .set({ status: "expired" })
              .where(eq(petOwnerPortalTokens.id, tokenRow.id));
          }
          await logPortalAccess(conn, {
            tokenId: tokenRow.id,
            customerId: tokenRow.customerId,
            ipHash,
            userAgent,
            eventType: "denied",
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Este link ya expiro. Solicita uno nuevo a tu veterinaria.",
          });
        }

        // ───────────────────────────────────────────────────────────────────
        // 6. TODO VALIDO: actualizar contador, loggear y cargar datos
        // ───────────────────────────────────────────────────────────────────
        await conn
          .update(petOwnerPortalTokens)
          .set({
            lastAccessAt: new Date(),
            accessCount: sql`${petOwnerPortalTokens.accessCount} + 1`,
          })
          .where(eq(petOwnerPortalTokens.id, tokenRow.id));

        await logPortalAccess(conn, {
          tokenId: tokenRow.id,
          customerId: tokenRow.customerId,
          ipHash,
          userAgent,
          eventType: "view",
        });

        // ───────────────────────────────────────────────────────────────────
        // 7. Cargar cliente (info minima)
        // ───────────────────────────────────────────────────────────────────
        const customerRows = await conn
          .select({
            id: customers.id,
            name: customers.name,
          })
          .from(customers)
          .where(eq(customers.id, tokenRow.customerId))
          .limit(1);
        const customer = customerRows[0];

        // 8. Cargar mascotas (campos NO sensibles)
        const petsRows = await conn
          .select({
            id: pets.id,
            name: pets.name,
            species: pets.species,
            breed: pets.breed,
            color: pets.color,
            sex: pets.sex,
            sterilized: pets.sterilized,
            birthDate: pets.birthDate,
            weight: pets.weight,
            photoUrl: pets.photoUrl,
            // EXCLUIDOS (sensibles/internos):
            // microchip, allergies, chronicConditions, notes
          })
          .from(pets)
          .where(
            and(
              eq(pets.customerId, tokenRow.customerId),
              eq(pets.isActive, true),
            ),
          )
          .orderBy(asc(pets.name));
        const petIds = petsRows.map((p) => p.id);

        // 9. Cargar vacunas
        const vaccinations = petIds.length > 0
          ? await conn
              .select({
                id: vetVaccinations.id,
                petId: vetVaccinations.petId,
                vaccineName: vetVaccinations.vaccineName,
                brand: vetVaccinations.brand,
                appliedDate: vetVaccinations.appliedDate,
                nextDoseDate: vetVaccinations.nextDoseDate,
                // EXCLUIDOS: batchNumber, notes (uso interno)
              })
              .from(vetVaccinations)
              .where(inArray(vetVaccinations.petId, petIds))
              .orderBy(desc(vetVaccinations.appliedDate))
          : [];

        // 10. Cargar citas (solo futuras, hasta 20)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const appointments = petIds.length > 0
          ? await conn
              .select({
                id: vetAppointments.id,
                petId: vetAppointments.petId,
                appointmentAt: vetAppointments.appointmentAt,
                durationMinutes: vetAppointments.durationMinutes,
                reason: vetAppointments.reason,
                status: vetAppointments.status,
                // EXCLUIDO: notes (interno)
              })
              .from(vetAppointments)
              .where(
                and(
                  inArray(vetAppointments.petId, petIds),
                  gte(vetAppointments.appointmentAt, startOfToday),
                  ne(vetAppointments.status, "cancelada"),
                ),
              )
              .orderBy(asc(vetAppointments.appointmentAt))
              .limit(20)
          : [];

        // 11. Cargar visitas recientes (max 10, SOLO motivo y fecha)
        //     NUNCA exponer symptoms/diagnosis/treatment/notes al dueno
        const visits = petIds.length > 0
          ? await conn
              .select({
                id: vetVisits.id,
                petId: vetVisits.petId,
                visitDate: vetVisits.visitDate,
                reason: vetVisits.reason,
                nextVisitDate: vetVisits.nextVisitDate,
                nextVisitReason: vetVisits.nextVisitReason,
                // EXCLUIDOS DELIBERADAMENTE:
                // symptoms, diagnosis, treatment, prescribedMedications,
                // recommendations, notes, weight, temperature, saleId
              })
              .from(vetVisits)
              .where(inArray(vetVisits.petId, petIds))
              .orderBy(desc(vetVisits.visitDate))
              .limit(10)
          : [];

        // 12. Cargar info publica de la clinica (branding)
        const clinicRows = await conn
          .select({
            clinicName: vetClinicSettings.clinicName,
            doctorName: vetClinicSettings.doctorName,
            phone: vetClinicSettings.phone,
            email: vetClinicSettings.email,
            address: vetClinicSettings.address,
            // EXCLUIDO: professionalLicense, university (no critico para portal)
          })
          .from(vetClinicSettings)
          .where(eq(vetClinicSettings.ownerId, tokenRow.clinicUserId))
          .limit(1);
        const clinic = clinicRows[0] ?? null;

        return {
          clinic,
          customer,
          pets: petsRows,
          vaccinations,
          appointments,
          visits,
          meta: {
            tokenExpiresAt: tokenRow.expiresAt,
            lastAccessAt: tokenRow.lastAccessAt,
          },
        };
      }),
  }),
});
