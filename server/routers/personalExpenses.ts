// ============================================================================
// ROUTER tRPC - Gastos personales (admin exclusivo)
// ----------------------------------------------------------------------------
// Sigue el patron del proyecto: router y protectedProcedure salen de
// _core/trpc, y adminProcedure se arma local con protectedProcedure.use().
// El usuario se obtiene de ctx.user.id. Todo filtrado por ese usuario.
//
// Enchufa el motor puro (analyzeExpenseLine) con la capa de BD.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  seedPersonalExpenseDefaults,
  listPersonalExpenseCategories,
  listPersonalExpenseStores,
  listPersonalExpenseRules,
  createPersonalExpense,
  listPersonalExpenses,
} from "../personalExpensesDb";
import {
  analyzeExpenseLine,
  type KeywordEntity,
  type LearnedRule,
} from "../personalExpensesEngine";

// ----------------------------------------------------------------------------
// Procedure admin (mismo patron que routers.ts)
// ----------------------------------------------------------------------------

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// ----------------------------------------------------------------------------
// Constantes y helpers
// ----------------------------------------------------------------------------

// Confianza minima para auto-asignar categoria. Debajo de esto, va a "Sin
// clasificar" pero igual guardamos lo que el motor detecto (detectedCategoryId).
const CATEGORY_CONFIDENCE_MIN = 55;
const STORE_CONFIDENCE_MIN = 50;

const KNOWN_PURCHASE_TYPES = new Set([
  "gasolina",
  "despensa",
  "verduleria",
  "carne",
  "servicios",
]);

function toEntities(rows: Array<{ slug: string; keywordsJson: unknown }>): KeywordEntity[] {
  return rows.map((r) => ({
    slug: r.slug,
    keywords: Array.isArray(r.keywordsJson) ? (r.keywordsJson as string[]) : [],
  }));
}

// Morelos = UTC-6 todo el ano (Mexico ya no usa horario de verano).
// Asi la fecha "de hoy" no se brinca al dia siguiente por la zona horaria.
function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// Corre el motor con las categorias, tiendas y reglas del usuario.
async function analyzeForUser(userId: number, text: string) {
  const [cats, stores, rules] = await Promise.all([
    listPersonalExpenseCategories(userId),
    listPersonalExpenseStores(userId),
    listPersonalExpenseRules(userId),
  ]);

  // Las reglas guardan categoryId; el motor trabaja con slugs. Las traducimos.
  const idToSlug = new Map<number, string>(cats.map((c) => [c.id, c.slug]));
  const ruleEntities: LearnedRule[] = rules
    .map((r) => ({
      categorySlug: idToSlug.get(r.categoryId) || "",
      normalizedPhrase: r.normalizedPhrase,
    }))
    .filter((r) => r.categorySlug.length > 0);

  const analysis = analyzeExpenseLine(text, {
    categories: toEntities(cats),
    stores: toEntities(stores),
    rules: ruleEntities,
  });

  const category = analysis.categorySlug
    ? cats.find((c) => c.slug === analysis.categorySlug) || null
    : null;
  const store = analysis.storeSlug
    ? stores.find((s) => s.slug === analysis.storeSlug) || null
    : null;

  return { analysis, category, store };
}

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export const personalExpensesRouter = router({
  // Crea categorias y tiendas por defecto (idempotente). Llamar una vez.
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    return await seedPersonalExpenseDefaults(ctx.user.id);
  }),

  categories: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await listPersonalExpenseCategories(ctx.user.id);
    }),
  }),

  stores: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await listPersonalExpenseStores(ctx.user.id);
    }),
  }),

  expenses: router({
    // Solo analiza el texto y devuelve la sugerencia. NO guarda nada.
    previewCapture: adminProcedure
      .input(z.object({ text: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const { analysis, category, store } = await analyzeForUser(
          ctx.user.id,
          input.text,
        );
        return {
          amount: analysis.amount,
          cleanDescription: analysis.cleanDescription,
          category: category
            ? {
                id: category.id,
                slug: category.slug,
                name: category.name,
                icon: category.icon,
                color: category.color,
              }
            : null,
          categoryConfidence: analysis.categoryConfidence,
          categorySource: analysis.categorySource,
          store: store
            ? {
                id: store.id,
                slug: store.slug,
                name: store.name,
                icon: store.icon,
                color: store.color,
              }
            : null,
          storeConfidence: analysis.storeConfidence,
          possibleItems: analysis.possibleItems,
        };
      }),

    // Crea el gasto desde una sola linea de texto.
    quickCreate: adminProcedure
      .input(
        z.object({
          text: z.string().min(1),
          expenseDate: z.string().optional(),
          paymentMethod: z
            .enum(["cash", "debit", "credit", "transfer", "other"])
            .optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const { analysis, category, store } = await analyzeForUser(
          ctx.user.id,
          input.text,
        );

        if (!analysis.amount || analysis.amount <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No detecte un monto. Escribe algo como: gasolina pemex 500",
          });
        }

        const useCategory =
          !!category && analysis.categoryConfidence >= CATEGORY_CONFIDENCE_MIN;
        const categoryId = useCategory && category ? category.id : null;
        const detectedCategoryId = category ? category.id : null;

        const useStore =
          !!store && analysis.storeConfidence >= STORE_CONFIDENCE_MIN;
        const storeId = useStore && store ? store.id : null;
        const storeName = useStore && store ? store.name : null;

        const purchaseType =
          analysis.categorySlug && KNOWN_PURCHASE_TYPES.has(analysis.categorySlug)
            ? analysis.categorySlug
            : "otro";

        const expense = await createPersonalExpense(ctx.user.id, {
          amount: analysis.amount,
          description: analysis.cleanDescription || input.text,
          normalizedDescription: analysis.normalizedDescription,
          categoryId,
          detectedCategoryId,
          storeId,
          storeName,
          purchaseType,
          autoDetected: useCategory,
          detectionConfidence: analysis.categoryConfidence,
          detectionSource: analysis.categorySource,
          paymentMethod: input.paymentMethod ?? "cash",
          expenseDate: input.expenseDate ?? todayMexico(),
          rawItemsText:
            analysis.possibleItems.length > 0
              ? analysis.possibleItems.join(" ")
              : null,
          detectedItemsJson:
            analysis.possibleItems.length > 0 ? analysis.possibleItems : null,
        });

        return {
          expense,
          category:
            useCategory && category
              ? {
                  id: category.id,
                  name: category.name,
                  icon: category.icon,
                  color: category.color,
                }
              : null,
          store:
            useStore && store
              ? {
                  id: store.id,
                  name: store.name,
                  icon: store.icon,
                  color: store.color,
                }
              : null,
        };
      }),

    // Lista gastos, opcionalmente filtrados por mes.
    list: adminProcedure
      .input(
        z
          .object({
            year: z.number().int().optional(),
            month: z.number().int().min(1).max(12).optional(),
            limit: z.number().int().min(1).max(200).optional(),
          })
          .optional(),
      )
      .query(async ({ input, ctx }) => {
        return await listPersonalExpenses(ctx.user.id, input ?? {});
      }),
  }),
});
