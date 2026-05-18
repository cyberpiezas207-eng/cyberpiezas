import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDbOrThrow } from "../db";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import {
  taqueriaCategories,
  taqueriaProducts,
  taqueriaModifierGroups,
  taqueriaModifierOptions,
  taqueriaProductModifierGroups,
  transferPaymentRequests,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// =============================================================================
// HELPER: Verificar acceso a taqueria (suscripcion premium activa)
// =============================================================================
async function requireTaqueriaAccess(userId: number) {
  const db = getDbOrThrow();
  const now = new Date();

  // Buscar suscripcion activa para taqueria
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
      return notes.posCode === "taqueria";
    } catch {
      return false;
    }
  });

  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Necesitas una suscripcion activa al POS de Taqueria. Visita /pricing",
    });
  }
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
  imageUrl: z.string().url("Foto obligatoria - debe ser URL valida"),
  prepTimeMinutes: z.number().int().min(1).max(120).default(5),
  displayOrder: z.number().int().min(0).default(0),
});

const modifierGroupInputSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  icon: z.string().max(20).optional(),
  selectionType: z.enum(["single", "multiple"]).default("multiple"),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().min(1).default(10),
  displayOrder: z.number().int().min(0).default(0),
});

const modifierOptionInputSchema = z.object({
  groupId: z.number().int().positive(),
  name: z.string().min(1, "Nombre requerido").max(100),
  priceDelta: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Delta invalido").default("0"),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

// =============================================================================
// ROUTER PRINCIPAL
// =============================================================================
export const taqueriaRouter = router({
  // ===========================================================================
  // ACCESO - verificar si tiene suscripcion activa
  // ===========================================================================
  hasAccess: protectedProcedure.query(async ({ ctx }) => {
    try {
      await requireTaqueriaAccess(ctx.user.id);
      return { hasAccess: true };
    } catch {
      return { hasAccess: false };
    }
  }),

  // ===========================================================================
  // CATEGORIAS
  // ===========================================================================
  categorias: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requireTaqueriaAccess(ctx.user.id);
      const db = getDbOrThrow();
      return db
        .select()
        .from(taqueriaCategories)
        .where(
          and(
            eq(taqueriaCategories.userId, ctx.user.id),
            eq(taqueriaCategories.isActive, true)
          )
        )
        .orderBy(asc(taqueriaCategories.displayOrder));
    }),

    create: protectedProcedure
      .input(categoryInputSchema)
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();
        const result = await db.insert(taqueriaCategories).values({
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
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership
        const existing = await db
          .select()
          .from(taqueriaCategories)
          .where(
            and(
              eq(taqueriaCategories.id, input.id),
              eq(taqueriaCategories.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        await db
          .update(taqueriaCategories)
          .set({
            name: input.name,
            icon: input.icon,
            displayOrder: input.displayOrder,
          })
          .where(eq(taqueriaCategories.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership
        const existing = await db
          .select()
          .from(taqueriaCategories)
          .where(
            and(
              eq(taqueriaCategories.id, input.id),
              eq(taqueriaCategories.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        // Soft delete
        await db
          .update(taqueriaCategories)
          .set({ isActive: false })
          .where(eq(taqueriaCategories.id, input.id));

        return { success: true };
      }),

    reorder: protectedProcedure
      .input(
        z.object({
          orderedIds: z.array(z.number().int().positive()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Actualizar orden
        for (let i = 0; i < input.orderedIds.length; i++) {
          await db
            .update(taqueriaCategories)
            .set({ displayOrder: i })
            .where(
              and(
                eq(taqueriaCategories.id, input.orderedIds[i]),
                eq(taqueriaCategories.userId, ctx.user.id)
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
      await requireTaqueriaAccess(ctx.user.id);
      const db = getDbOrThrow();
      return db
        .select()
        .from(taqueriaProducts)
        .where(
          and(
            eq(taqueriaProducts.userId, ctx.user.id),
            eq(taqueriaProducts.isActive, true)
          )
        )
        .orderBy(asc(taqueriaProducts.displayOrder));
    }),

    listByCategory: protectedProcedure
      .input(z.object({ categoryId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();
        return db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.userId, ctx.user.id),
              eq(taqueriaProducts.categoryId, input.categoryId),
              eq(taqueriaProducts.isActive, true)
            )
          )
          .orderBy(asc(taqueriaProducts.displayOrder));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();
        const products = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, input.id),
              eq(taqueriaProducts.userId, ctx.user.id)
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
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar que la categoria existe y es del usuario
        const categories = await db
          .select()
          .from(taqueriaCategories)
          .where(
            and(
              eq(taqueriaCategories.id, input.categoryId),
              eq(taqueriaCategories.userId, ctx.user.id)
            )
          );
        if (categories.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria no encontrada" });
        }

        const result = await db.insert(taqueriaProducts).values({
          userId: ctx.user.id,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          price: input.price,
          imageUrl: input.imageUrl,
          prepTimeMinutes: input.prepTimeMinutes,
          displayOrder: input.displayOrder,
        });

        return { id: result[0].insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...productInputSchema.shape }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, input.id),
              eq(taqueriaProducts.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        await db
          .update(taqueriaProducts)
          .set({
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
            price: input.price,
            imageUrl: input.imageUrl,
            prepTimeMinutes: input.prepTimeMinutes,
            displayOrder: input.displayOrder,
          })
          .where(eq(taqueriaProducts.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, input.id),
              eq(taqueriaProducts.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        // Soft delete
        await db
          .update(taqueriaProducts)
          .set({ isActive: false })
          .where(eq(taqueriaProducts.id, input.id));

        return { success: true };
      }),

    reorder: protectedProcedure
      .input(
        z.object({
          orderedIds: z.array(z.number().int().positive()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        for (let i = 0; i < input.orderedIds.length; i++) {
          await db
            .update(taqueriaProducts)
            .set({ displayOrder: i })
            .where(
              and(
                eq(taqueriaProducts.id, input.orderedIds[i]),
                eq(taqueriaProducts.userId, ctx.user.id)
              )
            );
        }

        return { success: true };
      }),

    getModifierGroups: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership del producto
        const products = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, input.productId),
              eq(taqueriaProducts.userId, ctx.user.id)
            )
          );
        if (products.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        // Obtener todos los grupos asignados con sus opciones
        const links = await db
          .select()
          .from(taqueriaProductModifierGroups)
          .where(eq(taqueriaProductModifierGroups.productId, input.productId))
          .orderBy(asc(taqueriaProductModifierGroups.displayOrder));

        const result = [];
        for (const link of links) {
          const groupArr = await db
            .select()
            .from(taqueriaModifierGroups)
            .where(eq(taqueriaModifierGroups.id, link.modifierGroupId));
          if (groupArr.length === 0) continue;
          const group = groupArr[0];

          const options = await db
            .select()
            .from(taqueriaModifierOptions)
            .where(
              and(
                eq(taqueriaModifierOptions.groupId, group.id),
                eq(taqueriaModifierOptions.isActive, true)
              )
            )
            .orderBy(asc(taqueriaModifierOptions.displayOrder));

          result.push({ ...group, options, linkId: link.id });
        }

        return result;
      }),

    assignModifierGroup: protectedProcedure
      .input(
        z.object({
          productId: z.number().int().positive(),
          modifierGroupId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership de ambos
        const products = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, input.productId),
              eq(taqueriaProducts.userId, ctx.user.id)
            )
          );
        if (products.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.modifierGroupId),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        // Verificar que no exista la relacion ya
        const existing = await db
          .select()
          .from(taqueriaProductModifierGroups)
          .where(
            and(
              eq(taqueriaProductModifierGroups.productId, input.productId),
              eq(taqueriaProductModifierGroups.modifierGroupId, input.modifierGroupId)
            )
          );
        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este grupo ya esta asignado al producto",
          });
        }

        await db.insert(taqueriaProductModifierGroups).values({
          productId: input.productId,
          modifierGroupId: input.modifierGroupId,
        });

        return { success: true };
      }),

    removeModifierGroup: protectedProcedure
      .input(z.object({ linkId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership via producto
        const links = await db
          .select()
          .from(taqueriaProductModifierGroups)
          .where(eq(taqueriaProductModifierGroups.id, input.linkId));
        if (links.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asignacion no encontrada" });
        }

        const products = await db
          .select()
          .from(taqueriaProducts)
          .where(
            and(
              eq(taqueriaProducts.id, links[0].productId),
              eq(taqueriaProducts.userId, ctx.user.id)
            )
          );
        if (products.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }

        await db
          .delete(taqueriaProductModifierGroups)
          .where(eq(taqueriaProductModifierGroups.id, input.linkId));

        return { success: true };
      }),
  }),

  // ===========================================================================
  // MODIFIER GROUPS
  // ===========================================================================
  modifierGroups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requireTaqueriaAccess(ctx.user.id);
      const db = getDbOrThrow();
      return db
        .select()
        .from(taqueriaModifierGroups)
        .where(eq(taqueriaModifierGroups.userId, ctx.user.id))
        .orderBy(asc(taqueriaModifierGroups.displayOrder));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();
        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.id),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        const options = await db
          .select()
          .from(taqueriaModifierOptions)
          .where(
            and(
              eq(taqueriaModifierOptions.groupId, input.id),
              eq(taqueriaModifierOptions.isActive, true)
            )
          )
          .orderBy(asc(taqueriaModifierOptions.displayOrder));

        return { ...groups[0], options };
      }),

    create: protectedProcedure
      .input(modifierGroupInputSchema)
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const result = await db.insert(taqueriaModifierGroups).values({
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          selectionType: input.selectionType,
          isRequired: input.isRequired,
          minSelections: input.minSelections,
          maxSelections: input.maxSelections,
          displayOrder: input.displayOrder,
        });

        return { id: result[0].insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...modifierGroupInputSchema.shape }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.id),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        await db
          .update(taqueriaModifierGroups)
          .set({
            name: input.name,
            icon: input.icon,
            selectionType: input.selectionType,
            isRequired: input.isRequired,
            minSelections: input.minSelections,
            maxSelections: input.maxSelections,
            displayOrder: input.displayOrder,
          })
          .where(eq(taqueriaModifierGroups.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.id),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        // Eliminar relaciones primero
        await db
          .delete(taqueriaProductModifierGroups)
          .where(eq(taqueriaProductModifierGroups.modifierGroupId, input.id));

        // Eliminar opciones
        await db
          .delete(taqueriaModifierOptions)
          .where(eq(taqueriaModifierOptions.groupId, input.id));

        // Eliminar grupo
        await db
          .delete(taqueriaModifierGroups)
          .where(eq(taqueriaModifierGroups.id, input.id));

        return { success: true };
      }),
  }),

  // ===========================================================================
  // MODIFIER OPTIONS
  // ===========================================================================
  modifierOptions: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership del grupo
        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.groupId),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        return db
          .select()
          .from(taqueriaModifierOptions)
          .where(
            and(
              eq(taqueriaModifierOptions.groupId, input.groupId),
              eq(taqueriaModifierOptions.isActive, true)
            )
          )
          .orderBy(asc(taqueriaModifierOptions.displayOrder));
      }),

    create: protectedProcedure
      .input(modifierOptionInputSchema)
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        // Verificar ownership del grupo
        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, input.groupId),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }

        const result = await db.insert(taqueriaModifierOptions).values({
          groupId: input.groupId,
          name: input.name,
          priceDelta: input.priceDelta,
          isDefault: input.isDefault,
          displayOrder: input.displayOrder,
        });

        return { id: result[0].insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...modifierOptionInputSchema.shape }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaModifierOptions)
          .where(eq(taqueriaModifierOptions.id, input.id));
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Opcion no encontrada" });
        }

        // Verificar ownership via grupo
        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, existing[0].groupId),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }

        await db
          .update(taqueriaModifierOptions)
          .set({
            name: input.name,
            priceDelta: input.priceDelta,
            isDefault: input.isDefault,
            displayOrder: input.displayOrder,
          })
          .where(eq(taqueriaModifierOptions.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireTaqueriaAccess(ctx.user.id);
        const db = getDbOrThrow();

        const existing = await db
          .select()
          .from(taqueriaModifierOptions)
          .where(eq(taqueriaModifierOptions.id, input.id));
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Opcion no encontrada" });
        }

        // Verificar ownership via grupo
        const groups = await db
          .select()
          .from(taqueriaModifierGroups)
          .where(
            and(
              eq(taqueriaModifierGroups.id, existing[0].groupId),
              eq(taqueriaModifierGroups.userId, ctx.user.id)
            )
          );
        if (groups.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }

        // Soft delete
        await db
          .update(taqueriaModifierOptions)
          .set({ isActive: false })
          .where(eq(taqueriaModifierOptions.id, input.id));

        return { success: true };
      }),
  }),

  // ===========================================================================
  // ADMIN - Endpoints solo para admin (cyberpiezas207@gmail.com)
  // ===========================================================================
  admin: router({
    // Otorgar acceso gratuito a taqueria (para testing o regalos)
    grantFreeAccess: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          months: z.number().int().min(1).max(24).default(12),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Solo admin
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo admin puede otorgar acceso gratis",
          });
        }

        const db = getDbOrThrow();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + input.months);

        // Generar referencia unica
        const transferReference = "ADMIN-GRANT-" + Date.now();

        // Insertar como suscripcion aprobada
        const result = await db.insert(transferPaymentRequests).values({
          userId: input.userId,
          planCode: "premium",
          planName: "Taqueria - Acceso de Cortesia",
          billingType: "annual",
          amount: "0",
          currency: "MXN",
          payerName: "Admin Grant",
          transferReference: transferReference,
          notes: JSON.stringify({
            posCode: "taqueria",
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
          message: "Acceso a taqueria activado por " + input.months + " meses",
        };
      }),

    // Activar acceso a TI MISMO (admin) - shortcut para testing
    grantMyselfAccess: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo admin puede usar este endpoint",
        });
      }

      const db = getDbOrThrow();
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const transferReference = "SELF-TEST-" + Date.now();

      const result = await db.insert(transferPaymentRequests).values({
        userId: ctx.user.id,
        planCode: "premium",
        planName: "Taqueria - Acceso Admin",
        billingType: "annual",
        amount: "0",
        currency: "MXN",
        payerName: "Admin Self-Grant",
        transferReference: transferReference,
        notes: JSON.stringify({
          posCode: "taqueria",
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
        message: "Acceso admin a taqueria activado por 1 ano",
      };
    }),
  }),
});
