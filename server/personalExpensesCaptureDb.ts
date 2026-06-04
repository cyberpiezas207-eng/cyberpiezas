// ============================================================================
// CAPA DE BD - Captura detallada de gastos (V2 con walletId)
// ----------------------------------------------------------------------------
// createDetailedExpense: crea un gasto con campos separados. Reusa
//   createPersonalExpense del modulo existente (no lo modifica). Si el monto
//   viene vacio, guarda amount=0 + purchaseType="pending" para NO sumar a stats
//   (las sumas son de amount, asi que 0 no afecta totales).
//
// NUEVO V2:
//   - Acepta walletId opcional en el input
//   - Lo agrega al objeto que se pasa a createPersonalExpense
//   - Si la tabla personalExpenses ya tiene columna walletId, se guarda
//   - Si no, simplemente se ignora (cero rompimiento)
//   - El descuento real del bolsillo se hace desde el ROUTER (no aqui)
//     llamando a la mutation de wallets.withdraw despues de crear el gasto.
//
// setPendingExpenseAmount: asigna el monto a un gasto pendiente despues.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalExpenses } from "./personalExpensesSchema";
import { createPersonalExpense } from "./personalExpensesDb";
import { normalizeText } from "./personalExpensesEngine";

export type PaymentMethod =
  | "cash"
  | "debit"
  | "credit"
  | "transfer"
  | "other";

export interface CreateDetailedExpenseInput {
  description: string;
  amount: number | null; // null o <=0 = pendiente
  categoryId: number | null;
  storeId: number | null;
  storeName: string | null;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string | null;
  walletId?: number | null; // NUEVO V2
}

export async function createDetailedExpense(
  userId: number,
  data: CreateDetailedExpenseInput,
) {
  const isPending =
    data.amount == null || !Number.isFinite(data.amount) || data.amount <= 0;
  const amount = isPending ? 0 : (data.amount as number);

  // Construimos el payload base
  const payload: Record<string, unknown> = {
    amount,
    description: data.description.trim(),
    normalizedDescription: normalizeText(data.description),
    categoryId: data.categoryId ?? null,
    detectedCategoryId: null,
    storeId: data.storeId ?? null,
    storeName: data.storeName ?? null,
    purchaseType: isPending ? "pending" : "manual",
    autoDetected: false,
    detectionConfidence: 0,
    detectionSource: "manual",
    paymentMethod: data.paymentMethod,
    expenseDate: data.expenseDate,
    notes: data.notes ?? null,
  };

  // Solo agregar walletId si vino (no contaminar registros viejos)
  if (data.walletId != null) {
    payload.walletId = data.walletId;
  }

  return await createPersonalExpense(userId, payload as any);
}

// Asignar monto a un gasto pendiente (y quitar la marca pending)
export async function setPendingExpenseAmount(
  userId: number,
  id: number,
  amount: number,
): Promise<{ success: boolean }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Monto invalido");
  }
  const conn = await getDbOrThrow();
  await conn
    .update(personalExpenses)
    .set({ amount: amount.toFixed(2), purchaseType: "manual" })
    .where(
      and(eq(personalExpenses.id, id), eq(personalExpenses.userId, userId)),
    );
  return { success: true };
}
