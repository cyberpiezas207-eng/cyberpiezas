// ============================================================================
// CAPA DE BD - Historial de precios de productos de la alacena
// ----------------------------------------------------------------------------
// recordPantryItemPrice: guarda un punto de precio (se llama desde el bulk
//   despues de cada create/restock con precio).
// listItemPriceHistory: lista cronologica para un producto.
// getItemPriceStats: min/max/promedio global + breakdown por tienda y la
//   tienda con precio mas bajo (base para "manzana mas barata en X").
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalPantryItemPrices,
  type PersonalPantryItemPrice,
} from "./personalPantryPricesSchema";

function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// RECORD (guardar un punto de precio)
// ----------------------------------------------------------------------------

export interface RecordPriceInput {
  pantryItemId: number;
  unitPrice: number;
  storeId?: number | null;
  expenseId?: number | null;
  quantity?: number | null;
  unit?: string | null;
  source?: string; // "bulk_from_expense" | "restock" | "manual"
  purchasedAt?: string; // YYYY-MM-DD
  notes?: string | null;
}

export async function recordPantryItemPrice(
  userId: number,
  data: RecordPriceInput,
): Promise<void> {
  // Guardia: precio invalido, no escribimos basura
  if (!Number.isFinite(data.unitPrice) || data.unitPrice <= 0) return;

  const conn = await getDbOrThrow();
  await conn.insert(personalPantryItemPrices).values({
    userId,
    pantryItemId: data.pantryItemId,
    storeId: data.storeId ?? null,
    expenseId: data.expenseId ?? null,
    unitPrice: data.unitPrice.toFixed(2),
    quantity: data.quantity != null ? data.quantity.toFixed(3) : null,
    unit: data.unit ?? null,
    purchasedAt: data.purchasedAt ?? todayMexico(),
    source: data.source ?? "manual",
    notes: data.notes ?? null,
  });
}

// ----------------------------------------------------------------------------
// HISTORIAL (cronologico, mas reciente primero)
// ----------------------------------------------------------------------------

export async function listItemPriceHistory(
  userId: number,
  pantryItemId: number,
  limit: number = 50,
): Promise<PersonalPantryItemPrice[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalPantryItemPrices)
    .where(
      and(
        eq(personalPantryItemPrices.userId, userId),
        eq(personalPantryItemPrices.pantryItemId, pantryItemId),
      ),
    )
    .orderBy(
      desc(personalPantryItemPrices.purchasedAt),
      desc(personalPantryItemPrices.id),
    )
    .limit(limit);
}

// ----------------------------------------------------------------------------
// STATS (min, max, avg + breakdown por tienda + cheapestStore)
// ----------------------------------------------------------------------------

export interface ItemPriceStoreBreakdown {
  storeId: number | null;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface ItemPriceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  latest: number | null;
  byStore: ItemPriceStoreBreakdown[];
  cheapestStoreId: number | null;
}

export async function getItemPriceStats(
  userId: number,
  pantryItemId: number,
): Promise<ItemPriceStats> {
  const conn = await getDbOrThrow();

  // Resumen global
  const overall = await conn
    .select({
      count: sql<number>`COUNT(*)`,
      min: sql<string>`COALESCE(MIN(${personalPantryItemPrices.unitPrice}), 0)`,
      max: sql<string>`COALESCE(MAX(${personalPantryItemPrices.unitPrice}), 0)`,
      avg: sql<string>`COALESCE(AVG(${personalPantryItemPrices.unitPrice}), 0)`,
    })
    .from(personalPantryItemPrices)
    .where(
      and(
        eq(personalPantryItemPrices.userId, userId),
        eq(personalPantryItemPrices.pantryItemId, pantryItemId),
      ),
    );

  // Ultimo precio (no importa la tienda)
  const latestRows = await conn
    .select({ price: personalPantryItemPrices.unitPrice })
    .from(personalPantryItemPrices)
    .where(
      and(
        eq(personalPantryItemPrices.userId, userId),
        eq(personalPantryItemPrices.pantryItemId, pantryItemId),
      ),
    )
    .orderBy(
      desc(personalPantryItemPrices.purchasedAt),
      desc(personalPantryItemPrices.id),
    )
    .limit(1);

  // Breakdown por tienda
  const byStoreRows = await conn
    .select({
      storeId: personalPantryItemPrices.storeId,
      min: sql<string>`MIN(${personalPantryItemPrices.unitPrice})`,
      max: sql<string>`MAX(${personalPantryItemPrices.unitPrice})`,
      avg: sql<string>`AVG(${personalPantryItemPrices.unitPrice})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(personalPantryItemPrices)
    .where(
      and(
        eq(personalPantryItemPrices.userId, userId),
        eq(personalPantryItemPrices.pantryItemId, pantryItemId),
      ),
    )
    .groupBy(personalPantryItemPrices.storeId);

  const byStore: ItemPriceStoreBreakdown[] = byStoreRows.map((r) => ({
    storeId: r.storeId ?? null,
    min: Number(r.min) || 0,
    max: Number(r.max) || 0,
    avg: Math.round((Number(r.avg) || 0) * 100) / 100,
    count: Number(r.count) || 0,
  }));

  // Cheapest = el min mas bajo entre los que tienen tienda
  const withStore = byStore.filter((b) => b.storeId !== null);
  const cheapest =
    withStore.length > 0
      ? withStore.reduce((acc, b) => (b.min < acc.min ? b : acc))
      : null;

  const o = overall[0];
  return {
    count: Number(o?.count) || 0,
    min: Number(o?.min) || 0,
    max: Number(o?.max) || 0,
    avg: Math.round((Number(o?.avg) || 0) * 100) / 100,
    latest: latestRows[0] ? Number(latestRows[0].price) || 0 : null,
    byStore,
    cheapestStoreId: cheapest?.storeId ?? null,
  };
}

// ============================================================================
// COMPARACION DE LOS 2 PRECIOS MAS RECIENTES POR ITEM (Alacena-3)
// ----------------------------------------------------------------------------
// Para cada itemId, devuelve:
//   - lastPrice: precio unitario mas reciente
//   - previousPrice: precio anterior (penultimo)
//   - changePercent: porcentaje de cambio (positivo = mas caro, negativo = mas barato)
//   - unit: unidad del ultimo precio (kg, l, etc)
//
// Una sola query SQL agrupada en TypeScript. Eficiente para 10-50 items.
// ============================================================================

export interface ItemPriceComparison {
  itemId: number;
  lastPrice: number;
  previousPrice: number | null;
  changePercent: number | null; // null si no hay precio anterior
  unit: string | null;
}

export async function compareLatestPricesForItems(
  userId: number,
  itemIds: number[],
): Promise<ItemPriceComparison[]> {
  if (itemIds.length === 0) return [];

  const conn = await getDbOrThrow();

  // Una sola query: TODOS los precios de esos items, ordenados por item y fecha desc
  const rows = await conn
    .select()
    .from(personalPantryItemPrices)
    .where(
      and(
        eq(personalPantryItemPrices.userId, userId),
        inArray(personalPantryItemPrices.pantryItemId, itemIds),
      ),
    )
    .orderBy(
      asc(personalPantryItemPrices.pantryItemId),
      desc(personalPantryItemPrices.purchasedAt),
      desc(personalPantryItemPrices.id),
    );

  // Agrupar por item, tomar los 2 mas recientes de cada uno
  const byItem = new Map<number, typeof rows>();
  for (const row of rows) {
    const existing = byItem.get(row.pantryItemId) ?? [];
    if (existing.length < 2) {
      existing.push(row);
      byItem.set(row.pantryItemId, existing);
    }
  }

  // Calcular comparaciones
  const result: ItemPriceComparison[] = [];
  for (const [itemId, prices] of byItem.entries()) {
    const last = prices[0];
    const prev = prices[1] ?? null;
    const lastUnit = Number(last.unitPrice);
    const prevUnit = prev ? Number(prev.unitPrice) : null;

    const changePercent =
      prevUnit != null && prevUnit > 0
        ? Math.round(((lastUnit - prevUnit) / prevUnit) * 100)
        : null;

    result.push({
      itemId,
      lastPrice: lastUnit,
      previousPrice: prevUnit,
      changePercent,
      unit: last.unit ?? null,
    });
  }

  return result;
}
