// ============================================================================
// ROUTER tRPC - Gastos personales (PRIVADO del propietario)
// ----------------------------------------------------------------------------
// Blindado con ownerOnlyProcedure: solo entra el dueno principal
// (ctx.user.openId === ENV.ownerOpenId), igual que personalOperations.
// El usuario se obtiene de ctx.user.id. Todo filtrado por ese usuario.
//
// Enchufa el motor puro (analyzeExpenseLine) con la capa de BD.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  seedPersonalExpenseDefaults,
  listPersonalExpenseCategories,
  listPersonalExpenseStores,
  listPersonalExpenseRules,
  createPersonalExpense,
  listPersonalExpenses,
  sumPersonalExpensesByCategory,
  sumPersonalExpensesByStore,
  totalPersonalExpensesForMonth,
  monthlyPersonalExpenseTotals,
} from "../personalExpensesDb";
import {
  analyzeExpenseLine,
  type KeywordEntity,
  type LearnedRule,
} from "../personalExpensesEngine";

// ----------------------------------------------------------------------------
// Procedure PRIVADO del propietario (mismo candado que personalOperations)
// ----------------------------------------------------------------------------

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del propietario.",
    });
  }
  return next({ ctx });
});

// ----------------------------------------------------------------------------
// Constantes y helpers
// ----------------------------------------------------------------------------

const CATEGORY_CONFIDENCE_MIN = 55;
const STORE_CONFIDENCE_MIN = 50;

const KNOWN_PURCHASE_TYPES = new Set([
  "gasolina",
  "despensa",
  "verduleria",
  "carne",
  "servicios",
]);

const NEUTRAL_COLOR = "#888780";

function toEntities(rows: Array<{ slug: string; keywordsJson: unknown }>): KeywordEntity[] {
  return rows.map((r) => ({
    slug: r.slug,
    keywords: Array.isArray(r.keywordsJson) ? (r.keywordsJson as string[]) : [],
  }));
}

// Morelos = UTC-6 todo el ano (Mexico ya no usa horario de verano).
function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

async function analyzeForUser(userId: number, text: string) {
  const [cats, stores, rules] = await Promise.all([
    listPersonalExpenseCategories(userId),
    listPersonalExpenseStores(userId),
    listPersonalExpenseRules(userId),
  ]);

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
  seedDefaults: ownerOnlyProcedure.mutation(async ({ ctx }) => {
    return await seedPersonalExpenseDefaults(ctx.user.id);
  }),

  categories: router({
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listPersonalExpenseCategories(ctx.user.id);
    }),
  }),

  stores: router({
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listPersonalExpenseStores(ctx.user.id);
    }),
  }),

  expenses: router({
    previewCapture: ownerOnlyProcedure
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

    quickCreate: ownerOnlyProcedure
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

    list: ownerOnlyProcedure
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

  // --------------------------------------------------------------------------
  // ESTADISTICAS: un solo llamado con todo lo que necesita el dashboard
  // --------------------------------------------------------------------------
  stats: router({
    dashboard: ownerOnlyProcedure
      .input(
        z.object({
          year: z.number().int(),
          month: z.number().int().min(1).max(12),
        }),
      )
      .query(async ({ input, ctx }) => {
        const userId = ctx.user.id;
        const { year, month } = input;
        const prev =
          month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

        const [cats, stores, byCatRaw, byStoreRaw, monthTot, prevTot, monthly] =
          await Promise.all([
            listPersonalExpenseCategories(userId),
            listPersonalExpenseStores(userId),
            sumPersonalExpensesByCategory(userId, year, month),
            sumPersonalExpensesByStore(userId, year, month),
            totalPersonalExpensesForMonth(userId, year, month),
            totalPersonalExpensesForMonth(userId, prev.year, prev.month),
            monthlyPersonalExpenseTotals(userId),
          ]);

        const catById = new Map(cats.map((c) => [c.id, c]));
        const storeById = new Map(stores.map((s) => [s.id, s]));

        const byCategory = byCatRaw
          .map((r) => {
            const c = r.categoryId != null ? catById.get(r.categoryId) : null;
            return {
              categoryId: r.categoryId,
              name: c ? c.name : "Sin clasificar",
              icon: c ? c.icon : "",
              color: c ? c.color : NEUTRAL_COLOR,
              total: r.total,
              count: r.count,
            };
          })
          .sort((a, b) => b.total - a.total);

        const byStore = byStoreRaw
          .map((r) => {
            const s = r.storeId != null ? storeById.get(r.storeId) : null;
            return {
              storeId: r.storeId,
              name: s ? s.name : "Sin tienda",
              icon: s ? s.icon : "",
              color: s ? s.color : NEUTRAL_COLOR,
              total: r.total,
              count: r.count,
            };
          })
          .sort((a, b) => b.total - a.total);

        const topCategory = byCategory.length > 0 ? byCategory[0] : null;
        const topStore =
          byStore.find((s) => s.storeId != null) ??
          (byStore.length > 0 ? byStore[0] : null);

        const now = nowMexico();
        const isCurrentMonth =
          now.getFullYear() === year && now.getMonth() + 1 === month;
        const daysElapsed = isCurrentMonth
          ? now.getDate()
          : new Date(year, month, 0).getDate();
        const avgDaily = daysElapsed > 0 ? monthTot.total / daysElapsed : 0;

        const diff = monthTot.total - prevTot.total;
        const pct = prevTot.total > 0 ? (diff / prevTot.total) * 100 : null;

        const trendMap = new Map(monthly.map((m) => [m.month, m.total]));
        const trend: Array<{ month: string; total: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, month - 1 - i, 1);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          trend.push({ month: ym, total: trendMap.get(ym) || 0 });
        }

        return {
          year,
          month,
          total: monthTot.total,
          count: monthTot.count,
          byCategory,
          byStore,
          topCategory,
          topStore,
          avgDaily: Math.round(avgDaily * 100) / 100,
          vsLastMonth: {
            prevTotal: prevTot.total,
            diff: Math.round(diff * 100) / 100,
            pct: pct === null ? null : Math.round(pct * 10) / 10,
          },
          trend,
        };
      }),
  }),
});
