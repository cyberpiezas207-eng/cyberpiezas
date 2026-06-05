// >>> ESTE ARCHIVO VA EN (REEMPLAZA EL EXISTENTE): server/personalPricesDb.ts <<<
// ============================================================================
// CAPA DE BD - Cerebro de precios
// ----------------------------------------------------------------------------
// NO crea tablas nuevas. Lee tus gastos personales y los agrupa por producto
// (normalizedDescription) para responder: en cuanto anda cada cosa, en que
// tienda, si subio o bajo vs el mes pasado y donde esta mas barata.
//
// Fuente unica de verdad = gastos. Comentarios SIN ACENTOS por convencion.
// ============================================================================

import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalExpenses } from "./personalExpensesSchema";

// ----------------------------------------------------------------------------
// Tipos de salida
// ----------------------------------------------------------------------------

export interface PriceByStore {
  storeId: number | null;
  storeName: string | null;
  price: number; // promedio en el rango
  count: number;
}

export interface PriceByMonth {
  ym: string; // YYYY-MM
  avg: number;
  count: number;
}

export interface ProductPrice {
  product: string; // nombre para mostrar
  key: string; // normalizedDescription (identidad)
  categoryId: number | null;
  latestPrice: number;
  // Unidad cuando el precio es por unidad (kilo, litro...). null = es total.
  unit: string | null;
  latestStoreName: string | null;
  latestDate: string; // YYYY-MM-DD
  timesBought: number;
  deltaVsPrev: number | null; // promedio mes elegido - promedio mes anterior
  cheapestStoreName: string | null; // solo si hay 2+ tiendas con nombre
  cheapestPrice: number | null;
  stores: PriceByStore[];
  months: PriceByMonth[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Entry {
  amount: number;
  value: number; // valor a comparar: precio por unidad si hay, si no el total
  unit: string | null;
  storeId: number | null;
  storeName: string | null;
  ym: string;
  date: string;
  categoryId: number | null;
  description: string;
}

// ----------------------------------------------------------------------------
// Cerebro de precios
// ----------------------------------------------------------------------------

export async function getProductPriceBrain(
  userId: number,
  year: number,
  month: number,
  monthsBack = 3,
): Promise<ProductPrice[]> {
  const conn = await getDbOrThrow();

  // Rango: desde el primer dia de (mes - monthsBack) hasta el ultimo del mes elegido
  const startD = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
  const endD = new Date(Date.UTC(year, month, 0)); // dia 0 del siguiente = ultimo del actual
  const start = startD.toISOString().slice(0, 10);
  const end = endD.toISOString().slice(0, 10);

  const selectedYm = `${year}-${String(month).padStart(2, "0")}`;
  const prevYm = new Date(Date.UTC(year, month - 2, 1))
    .toISOString()
    .slice(0, 7);

  const rows = await conn
    .select({
      description: personalExpenses.description,
      norm: personalExpenses.normalizedDescription,
      amount: personalExpenses.amount,
      unitPrice: personalExpenses.unitPrice,
      unit: personalExpenses.unit,
      storeId: personalExpenses.storeId,
      storeName: personalExpenses.storeName,
      categoryId: personalExpenses.categoryId,
      expenseDate: personalExpenses.expenseDate,
    })
    .from(personalExpenses)
    .where(
      and(
        eq(personalExpenses.userId, userId),
        isNull(personalExpenses.deletedAt),
        gte(personalExpenses.expenseDate, start),
        lte(personalExpenses.expenseDate, end),
      ),
    );

  // Agrupar por producto (normalizedDescription)
  const groups = new Map<string, Entry[]>();
  for (const r of rows) {
    const amount = Number(r.amount ?? 0);
    const key = (r.norm ?? "").trim();
    if (!key || !Number.isFinite(amount) || amount <= 0) continue;
    const date = String(r.expenseDate);
    // Si hay precio por unidad, ese es el valor a comparar (peras con peras).
    const up = r.unitPrice != null ? Number(r.unitPrice) : 0;
    const hasUnitPrice = Number.isFinite(up) && up > 0;
    const entry: Entry = {
      amount,
      value: hasUnitPrice ? up : amount,
      unit: hasUnitPrice ? (r.unit ?? null) : null,
      storeId: r.storeId ?? null,
      storeName: r.storeName ?? null,
      ym: date.slice(0, 7),
      date,
      categoryId: r.categoryId ?? null,
      description: r.description || key,
    };
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }

  const result: ProductPrice[] = [];

  for (const [key, entries] of groups) {
    // Mas reciente primero
    entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const latest = entries[0];

    // Por mes
    const monthAgg = new Map<string, { sum: number; count: number }>();
    for (const e of entries) {
      const m = monthAgg.get(e.ym) ?? { sum: 0, count: 0 };
      m.sum += e.value;
      m.count += 1;
      monthAgg.set(e.ym, m);
    }
    const months: PriceByMonth[] = [...monthAgg.entries()]
      .map(([ym, v]) => ({ ym, avg: round2(v.sum / v.count), count: v.count }))
      .sort((a, b) => (a.ym < b.ym ? -1 : 1));

    const selAvg = monthAgg.get(selectedYm)
      ? monthAgg.get(selectedYm)!.sum / monthAgg.get(selectedYm)!.count
      : null;
    const prevAvg = monthAgg.get(prevYm)
      ? monthAgg.get(prevYm)!.sum / monthAgg.get(prevYm)!.count
      : null;
    const deltaVsPrev =
      selAvg !== null && prevAvg !== null ? round2(selAvg - prevAvg) : null;

    // Por tienda
    const storeAgg = new Map<
      string,
      { storeId: number | null; storeName: string | null; sum: number; count: number }
    >();
    for (const e of entries) {
      const sk = e.storeId != null ? `id:${e.storeId}` : `name:${e.storeName ?? "none"}`;
      const s =
        storeAgg.get(sk) ??
        { storeId: e.storeId, storeName: e.storeName, sum: 0, count: 0 };
      s.sum += e.value;
      s.count += 1;
      storeAgg.set(sk, s);
    }
    const stores: PriceByStore[] = [...storeAgg.values()]
      .map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        price: round2(s.sum / s.count),
        count: s.count,
      }))
      .sort((a, b) => a.price - b.price);

    // Mas barato: solo tiene sentido si hay 2+ tiendas CON nombre
    const named = stores.filter((s) => s.storeName);
    let cheapestStoreName: string | null = null;
    let cheapestPrice: number | null = null;
    if (named.length >= 2) {
      cheapestStoreName = named[0].storeName;
      cheapestPrice = named[0].price;
    }

    // Unidad del producto: la mas reciente que traiga precio por unidad
    const unit = entries.find((e) => e.unit)?.unit ?? null;

    result.push({
      product: latest.description,
      key,
      categoryId: latest.categoryId,
      latestPrice: round2(latest.value),
      unit,
      latestStoreName: latest.storeName,
      latestDate: latest.date,
      timesBought: entries.length,
      deltaVsPrev,
      cheapestStoreName,
      cheapestPrice,
      stores,
      months,
    });
  }

  // Lo comprado mas recientemente primero
  result.sort((a, b) => (a.latestDate < b.latestDate ? 1 : -1));
  return result;
}
