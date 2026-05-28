// ============================================================================
// CAPA DE BD - Gastos personales
// ----------------------------------------------------------------------------
// Funciones de consulta para el modulo de gastos personales.
// Reusa getDbOrThrow del proyecto y las tablas de personalExpensesSchema.
// Todo filtrado por userId (el admin). Patron repository, igual que db.ts.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, gte, lte, desc, asc, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalExpenseCategories,
  personalExpenseStores,
  personalExpenseRules,
  personalExpenses,
  type PersonalExpenseCategory,
  type PersonalExpenseStore,
  type PersonalExpenseRule,
  type PersonalExpense,
} from "./personalExpensesSchema";
import { DEFAULT_CATEGORIES, DEFAULT_STORES } from "./personalExpensesEngine";

// ----------------------------------------------------------------------------
// SEED: crea las categorias y tiendas por defecto si faltan (idempotente)
// ----------------------------------------------------------------------------

export async function seedPersonalExpenseDefaults(
  userId: number,
): Promise<{ categories: PersonalExpenseCategory[]; stores: PersonalExpenseStore[] }> {
  const conn = await getDbOrThrow();

  // Categorias que ya existen para este usuario
  const existingCats = await conn
    .select()
    .from(personalExpenseCategories)
    .where(eq(personalExpenseCategories.userId, userId));
  const haveCat = new Set(existingCats.map((c) => c.slug));

  const catsToInsert = DEFAULT_CATEGORIES.filter((c) => !haveCat.has(c.slug)).map(
    (c, i) => ({
      userId,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      keywordsJson: c.keywords,
      isDefault: true,
      isArchived: false,
      sortOrder: i,
    }),
  );
  if (catsToInsert.length > 0) {
    await conn.insert(personalExpenseCategories).values(catsToInsert);
  }

  // Tiendas que ya existen para este usuario
  const existingStores = await conn
    .select()
    .from(personalExpenseStores)
    .where(eq(personalExpenseStores.userId, userId));
  const haveStore = new Set(existingStores.map((s) => s.slug));

  const storesToInsert = DEFAULT_STORES.filter((s) => !haveStore.has(s.slug)).map(
    (s, i) => ({
      userId,
      name: s.name,
      slug: s.slug,
      type: s.type,
      icon: s.icon,
      color: s.color,
      keywordsJson: s.keywords,
      isArchived: false,
      sortOrder: i,
    }),
  );
  if (storesToInsert.length > 0) {
    await conn.insert(personalExpenseStores).values(storesToInsert);
  }

  return {
    categories: await listPersonalExpenseCategories(userId),
    stores: await listPersonalExpenseStores(userId),
  };
}

// ----------------------------------------------------------------------------
// LISTADOS
// ----------------------------------------------------------------------------

export async function listPersonalExpenseCategories(
  userId: number,
): Promise<PersonalExpenseCategory[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalExpenseCategories)
    .where(
      and(
        eq(personalExpenseCategories.userId, userId),
        eq(personalExpenseCategories.isArchived, false),
      ),
    )
    .orderBy(asc(personalExpenseCategories.sortOrder), asc(personalExpenseCategories.id));
}

export async function listPersonalExpenseStores(
  userId: number,
): Promise<PersonalExpenseStore[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalExpenseStores)
    .where(
      and(
        eq(personalExpenseStores.userId, userId),
        eq(personalExpenseStores.isArchived, false),
      ),
    )
    .orderBy(asc(personalExpenseStores.sortOrder), asc(personalExpenseStores.id));
}

export async function listPersonalExpenseRules(
  userId: number,
): Promise<PersonalExpenseRule[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalExpenseRules)
    .where(
      and(
        eq(personalExpenseRules.userId, userId),
        eq(personalExpenseRules.isActive, true),
      ),
    );
}

// ----------------------------------------------------------------------------
// CREAR GASTO
// ----------------------------------------------------------------------------

export interface CreatePersonalExpenseInput {
  amount: number;
  description: string;
  normalizedDescription: string;
  categoryId: number | null;
  detectedCategoryId: number | null;
  storeId: number | null;
  storeName: string | null;
  purchaseType: string;
  autoDetected: boolean;
  detectionConfidence: number;
  detectionSource: "keyword" | "rule" | "manual" | "none";
  paymentMethod: "cash" | "debit" | "credit" | "transfer" | "other";
  expenseDate: string; // formato YYYY-MM-DD
  rawItemsText?: string | null;
  detectedItemsJson?: unknown;
  notes?: string | null;
}

export async function createPersonalExpense(
  userId: number,
  data: CreatePersonalExpenseInput,
): Promise<PersonalExpense> {
  const conn = await getDbOrThrow();
  const insertRes = await conn.insert(personalExpenses).values({
    userId,
    // decimal se inserta como string para no perder precision
    amount: data.amount.toFixed(2),
    description: data.description,
    normalizedDescription: data.normalizedDescription,
    categoryId: data.categoryId ?? null,
    detectedCategoryId: data.detectedCategoryId ?? null,
    storeId: data.storeId ?? null,
    storeName: data.storeName ?? null,
    rawItemsText: data.rawItemsText ?? null,
    detectedItemsJson: data.detectedItemsJson ?? null,
    purchaseType: data.purchaseType,
    autoDetected: data.autoDetected,
    detectionConfidence: data.detectionConfidence,
    detectionSource: data.detectionSource,
    paymentMethod: data.paymentMethod,
    expenseDate: data.expenseDate,
    notes: data.notes ?? null,
  });

  const insertId = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalExpenses)
    .where(eq(personalExpenses.id, insertId))
    .limit(1);
  return rows[0];
}

// ----------------------------------------------------------------------------
// LISTAR GASTOS (con filtro opcional por mes)
// ----------------------------------------------------------------------------

export interface ListPersonalExpensesOptions {
  year?: number;
  month?: number; // 1-12
  limit?: number;
}

export async function listPersonalExpenses(
  userId: number,
  opts: ListPersonalExpensesOptions = {},
): Promise<PersonalExpense[]> {
  const conn = await getDbOrThrow();

  const conds = [
    eq(personalExpenses.userId, userId),
    isNull(personalExpenses.deletedAt), // ignorar borrados (soft delete)
  ];

  if (opts.year && opts.month) {
    const mm = String(opts.month).padStart(2, "0");
    const first = `${opts.year}-${mm}-01`;
    const lastDayNum = new Date(opts.year, opts.month, 0).getDate();
    const last = `${opts.year}-${mm}-${String(lastDayNum).padStart(2, "0")}`;
    conds.push(gte(personalExpenses.expenseDate, first));
    conds.push(lte(personalExpenses.expenseDate, last));
  }

  return await conn
    .select()
    .from(personalExpenses)
    .where(and(...conds))
    .orderBy(desc(personalExpenses.expenseDate), desc(personalExpenses.id))
    .limit(opts.limit ?? 50);
}
