// ============================================================================
// CAPA DE BD - Admin de categorias y tiendas del modulo de gastos
// ----------------------------------------------------------------------------
// Permite al usuario crear, editar y archivar sus propias categorias y tiendas
// desde la UI. Soft delete (isArchived). Slug unico por usuario auto-generado.
// sortOrder = max existente + 1.
//
// Reglas:
//   - No tocamos las funciones existentes (list, etc) de personalExpensesDb.
//   - Archivar = isArchived true. Las queries que filtran isArchived=false ya
//     respetan esto; los gastos existentes mantienen su categoryId historico.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, sql } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalExpenseCategories,
  personalExpenseStores,
  type PersonalExpenseCategory,
  type PersonalExpenseStore,
} from "./personalExpensesSchema";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function slugify(name: string): string {
  const out = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
  return out || "sin-nombre";
}

const DEFAULT_CATEGORY_ICON = "📦";
const DEFAULT_STORE_ICON = "🏪";
const DEFAULT_COLOR = "#888780";

// ----------------------------------------------------------------------------
// CATEGORIAS
// ----------------------------------------------------------------------------

export interface UpsertCategoryInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  keywords?: string[];
}

async function nextCategorySortOrder(userId: number): Promise<number> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select({
      max: sql<number>`COALESCE(MAX(${personalExpenseCategories.sortOrder}), 0)`,
    })
    .from(personalExpenseCategories)
    .where(eq(personalExpenseCategories.userId, userId));
  return Number(rows[0]?.max ?? 0) + 1;
}

async function findUniqueCategorySlug(
  userId: number,
  baseSlug: string,
): Promise<string> {
  const conn = await getDbOrThrow();
  let slug = baseSlug;
  let n = 1;
  // limite practico para evitar loop infinito
  for (let i = 0; i < 50; i++) {
    const rows = await conn
      .select({ id: personalExpenseCategories.id })
      .from(personalExpenseCategories)
      .where(
        and(
          eq(personalExpenseCategories.userId, userId),
          eq(personalExpenseCategories.slug, slug),
        ),
      )
      .limit(1);
    if (rows.length === 0) return slug;
    n++;
    slug = `${baseSlug}-${n}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function createCategory(
  userId: number,
  data: UpsertCategoryInput,
): Promise<PersonalExpenseCategory> {
  const conn = await getDbOrThrow();
  const name = data.name.trim();
  if (!name) throw new Error("Nombre requerido");

  const slug = await findUniqueCategorySlug(userId, slugify(name));
  const sortOrder = await nextCategorySortOrder(userId);

  const insertRes = await conn.insert(personalExpenseCategories).values({
    userId,
    name,
    slug,
    icon: (data.icon?.trim() || DEFAULT_CATEGORY_ICON).slice(0, 8),
    color: data.color?.trim() || DEFAULT_COLOR,
    keywordsJson: data.keywords ?? [],
    isDefault: false,
    isArchived: false,
    sortOrder,
  });

  const insertId = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalExpenseCategories)
    .where(eq(personalExpenseCategories.id, insertId))
    .limit(1);
  return rows[0];
}

export async function updateCategory(
  userId: number,
  id: number,
  data: Partial<UpsertCategoryInput>,
): Promise<PersonalExpenseCategory | null> {
  const conn = await getDbOrThrow();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const n = data.name.trim();
    if (!n) throw new Error("Nombre no puede estar vacio");
    updates.name = n;
  }
  if (data.icon !== undefined) {
    updates.icon = (data.icon?.trim() || DEFAULT_CATEGORY_ICON).slice(0, 8);
  }
  if (data.color !== undefined) {
    updates.color = data.color?.trim() || DEFAULT_COLOR;
  }
  if (data.keywords !== undefined) {
    updates.keywordsJson = data.keywords;
  }

  if (Object.keys(updates).length > 0) {
    await conn
      .update(personalExpenseCategories)
      .set(updates)
      .where(
        and(
          eq(personalExpenseCategories.id, id),
          eq(personalExpenseCategories.userId, userId),
        ),
      );
  }

  const rows = await conn
    .select()
    .from(personalExpenseCategories)
    .where(
      and(
        eq(personalExpenseCategories.id, id),
        eq(personalExpenseCategories.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function archiveCategory(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalExpenseCategories)
    .set({ isArchived: true })
    .where(
      and(
        eq(personalExpenseCategories.id, id),
        eq(personalExpenseCategories.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// TIENDAS
// ----------------------------------------------------------------------------

export interface UpsertStoreInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  type?: string | null;
  keywords?: string[];
}

async function nextStoreSortOrder(userId: number): Promise<number> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select({
      max: sql<number>`COALESCE(MAX(${personalExpenseStores.sortOrder}), 0)`,
    })
    .from(personalExpenseStores)
    .where(eq(personalExpenseStores.userId, userId));
  return Number(rows[0]?.max ?? 0) + 1;
}

async function findUniqueStoreSlug(
  userId: number,
  baseSlug: string,
): Promise<string> {
  const conn = await getDbOrThrow();
  let slug = baseSlug;
  let n = 1;
  for (let i = 0; i < 50; i++) {
    const rows = await conn
      .select({ id: personalExpenseStores.id })
      .from(personalExpenseStores)
      .where(
        and(
          eq(personalExpenseStores.userId, userId),
          eq(personalExpenseStores.slug, slug),
        ),
      )
      .limit(1);
    if (rows.length === 0) return slug;
    n++;
    slug = `${baseSlug}-${n}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function createStore(
  userId: number,
  data: UpsertStoreInput,
): Promise<PersonalExpenseStore> {
  const conn = await getDbOrThrow();
  const name = data.name.trim();
  if (!name) throw new Error("Nombre requerido");

  const slug = await findUniqueStoreSlug(userId, slugify(name));
  const sortOrder = await nextStoreSortOrder(userId);

  const insertRes = await conn.insert(personalExpenseStores).values({
    userId,
    name,
    slug,
    type: data.type?.trim() || "general",
    icon: (data.icon?.trim() || DEFAULT_STORE_ICON).slice(0, 8),
    color: data.color?.trim() || DEFAULT_COLOR,
    keywordsJson: data.keywords ?? [],
    isArchived: false,
    sortOrder,
  });

  const insertId = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalExpenseStores)
    .where(eq(personalExpenseStores.id, insertId))
    .limit(1);
  return rows[0];
}

export async function updateStore(
  userId: number,
  id: number,
  data: Partial<UpsertStoreInput>,
): Promise<PersonalExpenseStore | null> {
  const conn = await getDbOrThrow();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const n = data.name.trim();
    if (!n) throw new Error("Nombre no puede estar vacio");
    updates.name = n;
  }
  if (data.icon !== undefined) {
    updates.icon = (data.icon?.trim() || DEFAULT_STORE_ICON).slice(0, 8);
  }
  if (data.color !== undefined) {
    updates.color = data.color?.trim() || DEFAULT_COLOR;
  }
  if (data.type !== undefined) {
    updates.type = data.type?.trim() || "general";
  }
  if (data.keywords !== undefined) {
    updates.keywordsJson = data.keywords;
  }

  if (Object.keys(updates).length > 0) {
    await conn
      .update(personalExpenseStores)
      .set(updates)
      .where(
        and(
          eq(personalExpenseStores.id, id),
          eq(personalExpenseStores.userId, userId),
        ),
      );
  }

  const rows = await conn
    .select()
    .from(personalExpenseStores)
    .where(
      and(
        eq(personalExpenseStores.id, id),
        eq(personalExpenseStores.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function archiveStore(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalExpenseStores)
    .set({ isArchived: true })
    .where(
      and(
        eq(personalExpenseStores.id, id),
        eq(personalExpenseStores.userId, userId),
      ),
    );
  return { success: true };
}
