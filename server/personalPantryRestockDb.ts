// ============================================================================
// CAPA DE BD - "Comprar de nuevo" compositor
// ----------------------------------------------------------------------------
// restockItemWithPrice orquesta varias funciones EXISTENTES en una sola accion:
//   1. (Opcional) Crea un gasto vinculado (createDetailedExpense)
//   2. Repone el item al 100% (markPantryItemRestocked) con precio y tienda
//   3. (Si hay precio) Lo registra en el historial (recordPantryItemPrice)
// No modifica ninguna funcion previa. Es aditivo.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  markPantryItemRestocked,
  getPantryItemById,
} from "./personalPantryDb";
import { recordPantryItemPrice } from "./personalPantryPricesDb";
import { createDetailedExpense } from "./personalExpensesCaptureDb";

// Morelos = UTC-6 todo el ano
function todayMexicoYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface RestockItemWithPriceInput {
  itemId: number;
  price: number | null;
  storeId: number | null;
  storeName?: string | null;
  createExpense?: boolean;
  expenseCategoryId?: number | null;
  expenseDate?: string; // YYYY-MM-DD
}

export interface RestockResult {
  itemId: number;
  priceRecorded: boolean;
  expenseCreatedId: number | null;
}

export async function restockItemWithPrice(
  userId: number,
  input: RestockItemWithPriceInput,
): Promise<RestockResult> {
  const hasValidPrice =
    input.price != null && Number.isFinite(input.price) && input.price > 0;

  // 1. Si quiere gasto vinculado y hay precio, lo creamos primero
  // (asi tenemos un expenseId para enlazarlo al historial de precio).
  let expenseCreatedId: number | null = null;
  if (input.createExpense && hasValidPrice) {
    const item = await getPantryItemById(userId, input.itemId);
    const itemName = item?.name ?? "Recompra alacena";
    const expense = await createDetailedExpense(userId, {
      description: `Recompra: ${itemName}`,
      amount: input.price as number,
      categoryId: input.expenseCategoryId ?? null,
      storeId: input.storeId,
      storeName: input.storeName ?? null,
      expenseDate: input.expenseDate || todayMexicoYMD(),
      paymentMethod: "cash",
      notes: null,
    });
    expenseCreatedId = (expense as any)?.id ?? null;
  }

  // 2. Reponer (siempre): stock 100%, lastStoreId, lastPurchasePrice
  await markPantryItemRestocked(userId, input.itemId, {
    storeId: input.storeId ?? null,
    price: hasValidPrice ? (input.price as number) : null,
    expenseId: expenseCreatedId,
  });

  // 3. Historial de precios (solo si hay precio valido)
  if (hasValidPrice) {
    await recordPantryItemPrice(userId, {
      pantryItemId: input.itemId,
      unitPrice: input.price as number,
      storeId: input.storeId ?? null,
      expenseId: expenseCreatedId,
      source: "restock",
    });
  }

  return {
    itemId: input.itemId,
    priceRecorded: hasValidPrice,
    expenseCreatedId,
  };
}
