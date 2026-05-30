// ============================================================================
// EXPORTACION A CSV - datos personales
// ----------------------------------------------------------------------------
// Genera strings CSV listos para descargar:
//   - exportExpensesCsv         : todos los gastos del usuario
//   - exportPricesCsv           : historial de precios de alacena
//   - exportPantryCsv           : productos de alacena con estado actual
//   - exportShoppingListCsv     : productos en lista de compra
//
// Convenciones:
//   - BOM UTF-8 al inicio para que Excel detecte acentos correctamente
//   - Separador: coma
//   - Saltos de linea: CRLF (\r\n) - estandar CSV
//   - Strings siempre entre comillas dobles, comillas internas duplicadas
//   - Fechas en YYYY-MM-DD
//   - Montos con 2 decimales como string
//
// SOLO LECTURA. No modifica nada.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalExpenses,
  personalExpenseCategories,
  personalExpenseStores,
} from "./personalExpensesSchema";
import {
  personalPantryItems,
} from "./personalPantrySchema";
import { personalPantryItemPrices } from "./personalPantryPricesSchema";

// ----------------------------------------------------------------------------
// Helpers CSV
// ----------------------------------------------------------------------------

function csvEscape(value: unknown): string {
  if (value == null) return '""';
  const s = String(value);
  // Comillas internas se duplican, todo entre comillas dobles
  return `"${s.replace(/"/g, '""')}"`;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(csvEscape).join(",");
  const bodyLines = rows.map((r) => r.map(csvEscape).join(","));
  // BOM (\uFEFF) para que Excel reconozca UTF-8
  return "\uFEFF" + [headerLine, ...bodyLines].join("\r\n");
}

function fmtMoney(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

function fmtDate(d: unknown): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return String(d);
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Debito",
  credit: "Credito",
  transfer: "Transferencia",
  other: "Otro",
};

const PANTRY_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  low: "Bajo",
  out: "Agotado",
  archived: "Archivado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
};

// ----------------------------------------------------------------------------
// EXPORT GASTOS
// ----------------------------------------------------------------------------

export async function exportExpensesCsv(userId: number): Promise<string> {
  const conn = await getDbOrThrow();

  const rows = await conn
    .select({
      id: personalExpenses.id,
      expenseDate: personalExpenses.expenseDate,
      description: personalExpenses.description,
      amount: personalExpenses.amount,
      categoryName: personalExpenseCategories.name,
      storeName: personalExpenses.storeName,
      paymentMethod: personalExpenses.paymentMethod,
      purchaseType: personalExpenses.purchaseType,
      autoDetected: personalExpenses.autoDetected,
      notes: personalExpenses.notes,
      createdAt: personalExpenses.createdAt,
    })
    .from(personalExpenses)
    .leftJoin(
      personalExpenseCategories,
      eq(personalExpenseCategories.id, personalExpenses.categoryId),
    )
    .where(
      and(
        eq(personalExpenses.userId, userId),
        isNull(personalExpenses.deletedAt),
      ),
    )
    .orderBy(desc(personalExpenses.expenseDate), desc(personalExpenses.id));

  const headers = [
    "ID",
    "Fecha",
    "Descripcion",
    "Monto",
    "Categoria",
    "Tienda",
    "Metodo de pago",
    "Tipo",
    "Auto detectado",
    "Notas",
    "Capturado en",
  ];

  const body = rows.map((r) => [
    r.id,
    fmtDate(r.expenseDate),
    r.description ?? "",
    fmtMoney(r.amount),
    r.categoryName ?? "Sin clasificar",
    r.storeName ?? "",
    PAYMENT_LABELS[r.paymentMethod ?? ""] ?? r.paymentMethod ?? "",
    r.purchaseType === "pending" ? "Pendiente" : r.purchaseType ?? "",
    r.autoDetected ? "Si" : "No",
    r.notes ?? "",
    fmtDate(r.createdAt),
  ]);

  return rowsToCsv(headers, body);
}

// ----------------------------------------------------------------------------
// EXPORT HISTORIAL DE PRECIOS
// ----------------------------------------------------------------------------

export async function exportPricesCsv(userId: number): Promise<string> {
  const conn = await getDbOrThrow();

  const rows = await conn
    .select({
      id: personalPantryItemPrices.id,
      itemName: personalPantryItems.name,
      unitPrice: personalPantryItemPrices.unitPrice,
      quantity: personalPantryItemPrices.quantity,
      unit: personalPantryItemPrices.unit,
      storeName: personalExpenseStores.name,
      purchasedAt: personalPantryItemPrices.purchasedAt,
      source: personalPantryItemPrices.source,
      notes: personalPantryItemPrices.notes,
    })
    .from(personalPantryItemPrices)
    .leftJoin(
      personalPantryItems,
      eq(personalPantryItems.id, personalPantryItemPrices.pantryItemId),
    )
    .leftJoin(
      personalExpenseStores,
      eq(personalExpenseStores.id, personalPantryItemPrices.storeId),
    )
    .where(eq(personalPantryItemPrices.userId, userId))
    .orderBy(
      desc(personalPantryItemPrices.purchasedAt),
      desc(personalPantryItemPrices.id),
    );

  const headers = [
    "ID",
    "Producto",
    "Precio",
    "Cantidad",
    "Unidad",
    "Tienda",
    "Fecha",
    "Origen",
    "Notas",
  ];

  const body = rows.map((r) => [
    r.id,
    r.itemName ?? "(producto eliminado)",
    fmtMoney(r.unitPrice),
    r.quantity ?? "",
    r.unit ?? "",
    r.storeName ?? "",
    fmtDate(r.purchasedAt),
    r.source ?? "",
    r.notes ?? "",
  ]);

  return rowsToCsv(headers, body);
}

// ----------------------------------------------------------------------------
// EXPORT ALACENA
// ----------------------------------------------------------------------------

export async function exportPantryCsv(userId: number): Promise<string> {
  const conn = await getDbOrThrow();

  const rows = await conn
    .select({
      id: personalPantryItems.id,
      name: personalPantryItems.name,
      categoryName: personalExpenseCategories.name,
      status: personalPantryItems.status,
      stockPercent: personalPantryItems.stockPercent,
      onShoppingList: personalPantryItems.onShoppingList,
      priority: personalPantryItems.priority,
      timesPurchased: personalPantryItems.timesPurchased,
      lastPurchasePrice: personalPantryItems.lastPurchasePrice,
      lastStoreName: personalExpenseStores.name,
      lastPurchasedAt: personalPantryItems.lastPurchasedAt,
      createdAt: personalPantryItems.createdAt,
    })
    .from(personalPantryItems)
    .leftJoin(
      personalExpenseCategories,
      eq(personalExpenseCategories.id, personalPantryItems.categoryId),
    )
    .leftJoin(
      personalExpenseStores,
      eq(personalExpenseStores.id, personalPantryItems.lastStoreId),
    )
    .where(eq(personalPantryItems.userId, userId))
    .orderBy(personalPantryItems.name);

  const headers = [
    "ID",
    "Producto",
    "Categoria",
    "Estado",
    "Stock %",
    "En lista de compra",
    "Prioridad",
    "Veces comprado",
    "Ultimo precio",
    "Ultima tienda",
    "Ultima compra",
    "Agregado",
  ];

  const body = rows.map((r) => [
    r.id,
    r.name,
    r.categoryName ?? "Sin categoria",
    PANTRY_STATUS_LABELS[r.status ?? ""] ?? r.status ?? "",
    r.stockPercent ?? 0,
    r.onShoppingList ? "Si" : "No",
    PRIORITY_LABELS[r.priority ?? ""] ?? r.priority ?? "",
    r.timesPurchased ?? 0,
    r.lastPurchasePrice ? fmtMoney(r.lastPurchasePrice) : "",
    r.lastStoreName ?? "",
    fmtDate(r.lastPurchasedAt),
    fmtDate(r.createdAt),
  ]);

  return rowsToCsv(headers, body);
}

// ----------------------------------------------------------------------------
// EXPORT LISTA DE COMPRA
// ----------------------------------------------------------------------------

export async function exportShoppingListCsv(userId: number): Promise<string> {
  const conn = await getDbOrThrow();

  const rows = await conn
    .select({
      id: personalPantryItems.id,
      name: personalPantryItems.name,
      categoryName: personalExpenseCategories.name,
      priority: personalPantryItems.priority,
      status: personalPantryItems.status,
      lastPurchasePrice: personalPantryItems.lastPurchasePrice,
      lastStoreName: personalExpenseStores.name,
      lastPurchasedAt: personalPantryItems.lastPurchasedAt,
    })
    .from(personalPantryItems)
    .leftJoin(
      personalExpenseCategories,
      eq(personalExpenseCategories.id, personalPantryItems.categoryId),
    )
    .leftJoin(
      personalExpenseStores,
      eq(personalExpenseStores.id, personalPantryItems.lastStoreId),
    )
    .where(
      and(
        eq(personalPantryItems.userId, userId),
        eq(personalPantryItems.onShoppingList, true),
      ),
    )
    .orderBy(personalPantryItems.priority, personalPantryItems.name);

  const headers = [
    "Producto",
    "Categoria",
    "Prioridad",
    "Estado actual",
    "Ultimo precio referencia",
    "Mejor tienda conocida",
    "Ultima compra",
  ];

  const body = rows.map((r) => [
    r.name,
    r.categoryName ?? "Sin categoria",
    PRIORITY_LABELS[r.priority ?? ""] ?? r.priority ?? "",
    PANTRY_STATUS_LABELS[r.status ?? ""] ?? r.status ?? "",
    r.lastPurchasePrice ? fmtMoney(r.lastPurchasePrice) : "",
    r.lastStoreName ?? "",
    fmtDate(r.lastPurchasedAt),
  ]);

  return rowsToCsv(headers, body);
}
