// ============================================================================
// BULK alacena - crear o reponer productos en lote desde un gasto
// ----------------------------------------------------------------------------
// Recibe una lista de nombres (los productos sugeridos del gasto). Para cada
// uno: si ya existe (por normalizedName), lo repone al 100% y actualiza
// precio/tienda/fecha. Si no existe, lo crea al 100%. Todo deja huella en
// personalPantryMovements vinculado al expenseId que lo origino.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalPantryItems,
  personalPantryMovements,
  type PersonalPantryItem,
} from "./personalPantrySchema";
import { normalizeText } from "./personalExpensesEngine";

function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface BulkPantryItemInput {
  name: string;
  pricePerUnit?: number | null;
  categoryId?: number | null;
}

export interface BulkPantryOptions {
  storeId?: number | null;
  expenseId?: number | null;
  defaultCategoryId?: number | null;
}

export interface BulkPantryResult {
  created: number;
  restocked: number;
  items: PersonalPantryItem[];
}

export async function bulkCreateOrRestockPantryItems(
  userId: number,
  inputs: BulkPantryItemInput[],
  options: BulkPantryOptions = {},
): Promise<BulkPantryResult> {
  const conn = await getDbOrThrow();
  const today = todayMexico();

  let created = 0;
  let restocked = 0;
  const finalItems: PersonalPantryItem[] = [];

  for (const raw of inputs) {
    const name = raw.name.trim();
    if (!name) continue;
    const normalizedName = normalizeText(name);
    if (!normalizedName) continue;

    const priceStr =
      raw.pricePerUnit != null && raw.pricePerUnit >= 0
        ? raw.pricePerUnit.toFixed(2)
        : null;

    // Buscar existente por nombre normalizado (mismo user)
    const existing = await conn
      .select()
      .from(personalPantryItems)
      .where(
        and(
          eq(personalPantryItems.userId, userId),
          eq(personalPantryItems.normalizedName, normalizedName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // REPONER existente: vuelve a 100%, suma frecuencia, guarda precio/tienda
      const item = existing[0];
      await conn
        .update(personalPantryItems)
        .set({
          stockPercent: 100,
          status: "available",
          onShoppingList: false,
          timesPurchased: item.timesPurchased + 1,
          lastPurchasedAt: today,
          lastStoreId: options.storeId ?? item.lastStoreId,
          lastPurchasePrice: priceStr ?? item.lastPurchasePrice,
        })
        .where(eq(personalPantryItems.id, item.id));

      await conn.insert(personalPantryMovements).values({
        userId,
        pantryItemId: item.id,
        expenseId: options.expenseId ?? null,
        movementType: "restocked",
        stockPercentBefore: item.stockPercent,
        stockPercentAfter: 100,
        note: "Repuesto desde gasto",
      });

      restocked++;

      const refreshed = await conn
        .select()
        .from(personalPantryItems)
        .where(eq(personalPantryItems.id, item.id))
        .limit(1);
      if (refreshed[0]) finalItems.push(refreshed[0]);
    } else {
      // CREAR nuevo, ya al 100% (acabas de comprarlo)
      const insertRes = await conn.insert(personalPantryItems).values({
        userId,
        name,
        normalizedName,
        categoryId: raw.categoryId ?? options.defaultCategoryId ?? null,
        storeId: null,
        unit: null,
        stockPercent: 100,
        status: "available",
        onShoppingList: false,
        priority: "normal",
        timesPurchased: 1,
        lastPurchasedAt: today,
        lastStoreId: options.storeId ?? null,
        lastPurchasePrice: priceStr,
        notes: null,
      });

      const insertId = (insertRes as any).insertId as number;

      await conn.insert(personalPantryMovements).values({
        userId,
        pantryItemId: insertId,
        expenseId: options.expenseId ?? null,
        movementType: "added",
        stockPercentBefore: null,
        stockPercentAfter: 100,
        note: "Creado desde gasto",
      });

      created++;

      const newItem = await conn
        .select()
        .from(personalPantryItems)
        .where(eq(personalPantryItems.id, insertId))
        .limit(1);
      if (newItem[0]) finalItems.push(newItem[0]);
    }
  }

  return { created, restocked, items: finalItems };
}
