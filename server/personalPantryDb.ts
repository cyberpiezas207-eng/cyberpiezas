// ============================================================================
// CAPA DE BD - Alacena personal
// ----------------------------------------------------------------------------
// Funciones de consulta para los productos de la alacena.
// Reusa getDbOrThrow y normalizeText del proyecto.
// Todo filtrado por userId. Cada cambio relevante deja una huella en
// personalPantryMovements (historial), util para ritmos de consumo a futuro.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, ne, asc, desc, isNull, like, sql } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalPantryItems,
  personalPantryMovements,
  type PersonalPantryItem,
} from "./personalPantrySchema";
import { normalizeText } from "./personalExpensesEngine";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// Mapea porcentaje a estado simple
function statusFromPercent(p: number): "available" | "low" | "out" {
  if (p <= 0) return "out";
  if (p <= 25) return "low";
  return "available";
}

// Registra movimiento en el historial (sin romper si falla)
async function logPantryMovement(
  userId: number,
  pantryItemId: number,
  movementType:
    | "added"
    | "consumed"
    | "adjusted"
    | "marked_low"
    | "marked_out"
    | "restocked",
  before: number | null,
  after: number | null,
  note: string | null = null,
  expenseId: number | null = null,
): Promise<void> {
  const conn = await getDbOrThrow();
  await conn.insert(personalPantryMovements).values({
    userId,
    pantryItemId,
    expenseId,
    movementType,
    stockPercentBefore: before,
    stockPercentAfter: after,
    note,
  });
}

// ----------------------------------------------------------------------------
// CREAR
// ----------------------------------------------------------------------------

export interface CreatePantryItemInput {
  name: string;
  categoryId?: number | null;
  storeId?: number | null;
  unit?: string | null;
  stockPercent?: number;
  priority?: "low" | "normal" | "high";
  notes?: string | null;
}

export async function createPantryItem(
  userId: number,
  data: CreatePantryItemInput,
): Promise<PersonalPantryItem> {
  const conn = await getDbOrThrow();
  const stockPercent = clamp(data.stockPercent ?? 100, 0, 100);
  const status = statusFromPercent(stockPercent);

  const insertRes = await conn.insert(personalPantryItems).values({
    userId,
    name: data.name.trim(),
    normalizedName: normalizeText(data.name),
    categoryId: data.categoryId ?? null,
    storeId: data.storeId ?? null,
    unit: data.unit ?? null,
    stockPercent,
    status,
    onShoppingList: status === "out",
    priority: data.priority ?? "normal",
    notes: data.notes ?? null,
  });

  const insertId = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalPantryItems)
    .where(eq(personalPantryItems.id, insertId))
    .limit(1);

  await logPantryMovement(userId, insertId, "added", null, stockPercent);
  return rows[0];
}

// ----------------------------------------------------------------------------
// LISTAR
// ----------------------------------------------------------------------------

export interface ListPantryItemsOptions {
  status?: "available" | "low" | "out" | "archived";
  onShoppingList?: boolean;
  search?: string;
  limit?: number;
}

export async function listPantryItems(
  userId: number,
  opts: ListPantryItemsOptions = {},
): Promise<PersonalPantryItem[]> {
  const conn = await getDbOrThrow();
  const conds = [
    eq(personalPantryItems.userId, userId),
    isNull(personalPantryItems.deletedAt),
  ];

  if (opts.status) {
    conds.push(eq(personalPantryItems.status, opts.status));
  } else {
    // por defecto, ocultar archivados
    conds.push(ne(personalPantryItems.status, "archived"));
  }
  if (opts.onShoppingList === true) {
    conds.push(eq(personalPantryItems.onShoppingList, true));
  }
  if (opts.search && opts.search.trim().length > 0) {
    const norm = normalizeText(opts.search);
    if (norm) {
      conds.push(like(personalPantryItems.normalizedName, `%${norm}%`));
    }
  }

  return await conn
    .select()
    .from(personalPantryItems)
    .where(and(...conds))
    .orderBy(
      // ordena por estado mas urgente primero, luego por nombre
      sql`FIELD(${personalPantryItems.status}, 'out','low','available','archived')`,
      asc(personalPantryItems.name),
    )
    .limit(opts.limit ?? 300);
}

export async function getPantryItemById(
  userId: number,
  id: number,
): Promise<PersonalPantryItem | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalPantryItems)
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ----------------------------------------------------------------------------
// ACCIONES RAPIDAS DE NIVEL
// ----------------------------------------------------------------------------

export async function setPantryStockPercent(
  userId: number,
  id: number,
  stockPercent: number,
  note: string | null = null,
): Promise<PersonalPantryItem | null> {
  const item = await getPantryItemById(userId, id);
  if (!item) return null;
  const newPct = clamp(stockPercent, 0, 100);
  const newStatus = statusFromPercent(newPct);

  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set({
      stockPercent: newPct,
      status: newStatus,
      onShoppingList: newStatus === "out" ? true : item.onShoppingList,
    })
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );

  await logPantryMovement(userId, id, "adjusted", item.stockPercent, newPct, note);
  return await getPantryItemById(userId, id);
}

export async function consumePantryItem(
  userId: number,
  id: number,
  step: number = 25,
): Promise<PersonalPantryItem | null> {
  const item = await getPantryItemById(userId, id);
  if (!item) return null;
  const newPct = clamp(item.stockPercent - step, 0, 100);
  const newStatus = statusFromPercent(newPct);

  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set({
      stockPercent: newPct,
      status: newStatus,
      onShoppingList: newStatus === "out" ? true : item.onShoppingList,
      lastConsumedAt: todayMexico(),
    })
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );

  await logPantryMovement(userId, id, "consumed", item.stockPercent, newPct);
  return await getPantryItemById(userId, id);
}

export async function markPantryItemLow(
  userId: number,
  id: number,
): Promise<PersonalPantryItem | null> {
  const item = await getPantryItemById(userId, id);
  if (!item) return null;
  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set({ stockPercent: 25, status: "low", onShoppingList: true })
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );
  await logPantryMovement(userId, id, "marked_low", item.stockPercent, 25);
  return await getPantryItemById(userId, id);
}

export async function markPantryItemOut(
  userId: number,
  id: number,
): Promise<PersonalPantryItem | null> {
  const item = await getPantryItemById(userId, id);
  if (!item) return null;
  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set({ stockPercent: 0, status: "out", onShoppingList: true })
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );
  await logPantryMovement(userId, id, "marked_out", item.stockPercent, 0);
  return await getPantryItemById(userId, id);
}

// "Comprar de nuevo": vuelve a 100%, suma frecuencia y guarda
// precio/tienda/fecha de la compra (base para el historial de precios).
export interface MarkRestockedOptions {
  storeId?: number | null;
  price?: number | null;
  expenseId?: number | null;
}

export async function markPantryItemRestocked(
  userId: number,
  id: number,
  opts: MarkRestockedOptions = {},
): Promise<PersonalPantryItem | null> {
  const item = await getPantryItemById(userId, id);
  if (!item) return null;

  const updates: Record<string, unknown> = {
    stockPercent: 100,
    status: "available",
    onShoppingList: false,
    timesPurchased: item.timesPurchased + 1,
    lastPurchasedAt: todayMexico(),
  };
  if (opts.storeId !== undefined && opts.storeId !== null) {
    updates.lastStoreId = opts.storeId;
  }
  if (opts.price !== undefined && opts.price !== null && opts.price >= 0) {
    updates.lastPurchasePrice = opts.price.toFixed(2);
  }

  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set(updates)
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );

  await logPantryMovement(
    userId,
    id,
    "restocked",
    item.stockPercent,
    100,
    null,
    opts.expenseId ?? null,
  );
  return await getPantryItemById(userId, id);
}

// ----------------------------------------------------------------------------
// LISTA DE COMPRA
// ----------------------------------------------------------------------------

export async function togglePantryShoppingList(
  userId: number,
  id: number,
  on: boolean,
  priority?: "low" | "normal" | "high",
): Promise<PersonalPantryItem | null> {
  const updates: Record<string, unknown> = { onShoppingList: on };
  if (priority) updates.priority = priority;

  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set(updates)
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );
  return await getPantryItemById(userId, id);
}

export async function listShoppingList(
  userId: number,
): Promise<PersonalPantryItem[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalPantryItems)
    .where(
      and(
        eq(personalPantryItems.userId, userId),
        isNull(personalPantryItems.deletedAt),
        eq(personalPantryItems.onShoppingList, true),
      ),
    )
    .orderBy(
      // alta prioridad primero, agotados primero, luego nombre
      sql`FIELD(${personalPantryItems.priority}, 'high','normal','low')`,
      sql`FIELD(${personalPantryItems.status}, 'out','low','available','archived')`,
      asc(personalPantryItems.name),
    );
}

// ----------------------------------------------------------------------------
// ARCHIVAR
// ----------------------------------------------------------------------------

export async function archivePantryItem(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalPantryItems)
    .set({
      status: "archived",
      deletedAt: new Date(),
      onShoppingList: false,
    })
    .where(
      and(eq(personalPantryItems.id, id), eq(personalPantryItems.userId, userId)),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// STATS (alimenta las cards y barras de la pantalla)
// ----------------------------------------------------------------------------

export interface PantryStats {
  total: number;
  available: number;
  low: number;
  out: number;
  shoppingListCount: number;
  averageStockPercent: number; // 0-100
}

export async function getPantryStats(userId: number): Promise<PantryStats> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select({
      total: sql<number>`COUNT(*)`,
      available: sql<number>`SUM(CASE WHEN ${personalPantryItems.status} = 'available' THEN 1 ELSE 0 END)`,
      low: sql<number>`SUM(CASE WHEN ${personalPantryItems.status} = 'low' THEN 1 ELSE 0 END)`,
      out: sql<number>`SUM(CASE WHEN ${personalPantryItems.status} = 'out' THEN 1 ELSE 0 END)`,
      shoppingListCount: sql<number>`SUM(CASE WHEN ${personalPantryItems.onShoppingList} = 1 THEN 1 ELSE 0 END)`,
      avgPercent: sql<string>`COALESCE(AVG(${personalPantryItems.stockPercent}), 0)`,
    })
    .from(personalPantryItems)
    .where(
      and(
        eq(personalPantryItems.userId, userId),
        isNull(personalPantryItems.deletedAt),
        ne(personalPantryItems.status, "archived"),
      ),
    );

  const r = rows[0];
  return {
    total: Number(r?.total) || 0,
    available: Number(r?.available) || 0,
    low: Number(r?.low) || 0,
    out: Number(r?.out) || 0,
    shoppingListCount: Number(r?.shoppingListCount) || 0,
    averageStockPercent: Math.round(Number(r?.avgPercent) || 0),
  };
}

// ============================================================================
// BUSQUEDA POR NOMBRE NORMALIZADO (para captura natural / fuzzy match)
// ----------------------------------------------------------------------------
// Estrategia: primero match exacto, luego LIKE con el nombre normalizado.
// Retorna el item mas reciente que coincida (o null).
// ============================================================================

export async function findPantryItemByNormalizedName(
  userId: number,
  name: string,
): Promise<PersonalPantryItem | null> {
  const normalized = normalizeText(name).trim();
  if (!normalized) return null;

  const conn = await getDbOrThrow();

  // 1. Match exacto primero
  const exactRows = await conn
    .select()
    .from(personalPantryItems)
    .where(
      and(
        eq(personalPantryItems.userId, userId),
        eq(personalPantryItems.normalizedName, normalized),
        isNull(personalPantryItems.deletedAt),
        ne(personalPantryItems.status, "archived"),
      ),
    )
    .orderBy(desc(personalPantryItems.updatedAt))
    .limit(1);

  if (exactRows.length > 0) {
    return exactRows[0] as PersonalPantryItem;
  }

  // 2. Match LIKE: buscar productos que CONTENGAN el nombre buscado
  // Ej: si busca "pollo", encuentra "pollo entero" o "pechuga de pollo"
  const likeRows = await conn
    .select()
    .from(personalPantryItems)
    .where(
      and(
        eq(personalPantryItems.userId, userId),
        like(personalPantryItems.normalizedName, `%${normalized}%`),
        isNull(personalPantryItems.deletedAt),
        ne(personalPantryItems.status, "archived"),
      ),
    )
    .orderBy(desc(personalPantryItems.updatedAt))
    .limit(1);

  if (likeRows.length > 0) {
    return likeRows[0] as PersonalPantryItem;
  }

  return null;
}
