// ============================================================================
// MOTOR DE INSIGHTS MENSUALES - reglas deterministicas, sin IA
// ----------------------------------------------------------------------------
// getMonthlyInsights aplica reglas sobre los datos del mes vs mes anterior y
// estado actual de la alacena, generando una lista de "frases utiles" tipo:
//   "Gastaste 18% mas que el mes pasado"
//   "Costco concentro el 42% de tu gasto"
//   "Tienes 4 productos bajos en alacena"
//
// SOLO LECTURA. Reusa funciones existentes (no modifica nada).
// La prioridad ordena los mas relevantes primero.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, sql, isNull, gte, lte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalExpenses } from "./personalExpensesSchema";
import {
  totalPersonalExpensesForMonth,
  sumPersonalExpensesByCategory,
  sumPersonalExpensesByStore,
  listPersonalExpenseCategories,
  listPersonalExpenseStores,
} from "./personalExpensesDb";
import { getPantryStats } from "./personalPantryDb";

export type InsightType = "positive" | "warning" | "alert" | "info";

export interface MonthlyInsight {
  id: string; // identificador unico para llaves React
  type: InsightType;
  icon: string; // emoji
  title: string; // frase principal
  detail?: string | null; // contexto extra opcional
  priority: number; // 0-100, mayor = mas importante
  category: "gastos" | "alacena" | "tiendas" | "habitos";
}

// Helpers ---------------------------------------------------------------------

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function monthRangeYMD(year: number, month: number): { first: string; last: string } {
  const firstD = new Date(year, month - 1, 1);
  const lastD = new Date(year, month, 0);
  const fmtD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { first: fmtD(firstD), last: fmtD(lastD) };
}

// Contar gastos pendientes (sin monto asignado) del mes
async function countPendingExpenses(
  userId: number,
  year: number,
  month: number,
): Promise<number> {
  const conn = await getDbOrThrow();
  const { first, last } = monthRangeYMD(year, month);
  const rows = await conn
    .select({ c: sql<number>`COUNT(*)` })
    .from(personalExpenses)
    .where(
      and(
        eq(personalExpenses.userId, userId),
        isNull(personalExpenses.deletedAt),
        eq(personalExpenses.purchaseType, "pending"),
        gte(personalExpenses.expenseDate, first),
        lte(personalExpenses.expenseDate, last),
      ),
    );
  return Number(rows[0]?.c ?? 0);
}

// Contar gastos totales del mes (incluye pendientes)
async function countExpensesInMonth(
  userId: number,
  year: number,
  month: number,
): Promise<number> {
  const conn = await getDbOrThrow();
  const { first, last } = monthRangeYMD(year, month);
  const rows = await conn
    .select({ c: sql<number>`COUNT(*)` })
    .from(personalExpenses)
    .where(
      and(
        eq(personalExpenses.userId, userId),
        isNull(personalExpenses.deletedAt),
        gte(personalExpenses.expenseDate, first),
        lte(personalExpenses.expenseDate, last),
      ),
    );
  return Number(rows[0]?.c ?? 0);
}

// ----------------------------------------------------------------------------
// MOTOR PRINCIPAL
// ----------------------------------------------------------------------------

export async function getMonthlyInsights(
  userId: number,
  year: number,
  month: number,
): Promise<{ insights: MonthlyInsight[]; meta: { year: number; month: number } }> {
  const insights: MonthlyInsight[] = [];

  // Datos del mes actual
  const thisTotal = await totalPersonalExpensesForMonth(userId, year, month);
  const thisByCat = await sumPersonalExpensesByCategory(userId, year, month);
  const thisByStore = await sumPersonalExpensesByStore(userId, year, month);
  const pendingCount = await countPendingExpenses(userId, year, month);
  const expenseCount = await countExpensesInMonth(userId, year, month);

  // Datos del mes anterior (comparacion)
  const prev = prevMonth(year, month);
  const lastTotal = await totalPersonalExpensesForMonth(userId, prev.year, prev.month);
  const lastByCat = await sumPersonalExpensesByCategory(userId, prev.year, prev.month);
  const lastExpenseCount = await countExpensesInMonth(userId, prev.year, prev.month);

  // Estado actual de alacena (no es por mes; es snapshot)
  const pantry = await getPantryStats(userId);

  // Catalogos para nombres legibles
  const categories = await listPersonalExpenseCategories(userId);
  const stores = await listPersonalExpenseStores(userId);
  const catName = new Map(categories.map((c) => [c.id, { name: c.name, icon: c.icon ?? "📦" }]));
  const storeName = new Map(stores.map((s) => [s.id, { name: s.name, icon: s.icon ?? "🏪" }]));

  // --------------------------------------------------------------------------
  // REGLAS
  // --------------------------------------------------------------------------

  // Regla 1: Cambio del total vs mes anterior
  if (Number(lastTotal.total) > 0) {
    const diff = Number(thisTotal.total) - Number(lastTotal.total);
    const pct = Math.round((diff / Number(lastTotal.total)) * 100);
    if (pct >= 20) {
      insights.push({
        id: "total_up_strong",
        type: "warning",
        icon: "📈",
        title: `Gastaste ${pct}% mas que el mes pasado`,
        detail: `${fmt(Number(thisTotal.total))} este mes vs ${fmt(Number(lastTotal.total))} antes`,
        priority: 95,
        category: "gastos",
      });
    } else if (pct >= 10) {
      insights.push({
        id: "total_up_mild",
        type: "warning",
        icon: "📈",
        title: `Subiste tu gasto un ${pct}%`,
        detail: `${fmt(Number(thisTotal.total))} vs ${fmt(Number(lastTotal.total))} el mes pasado`,
        priority: 75,
        category: "gastos",
      });
    } else if (pct <= -20) {
      insights.push({
        id: "total_down_strong",
        type: "positive",
        icon: "🌱",
        title: `Bajaste tu gasto un ${Math.abs(pct)}%`,
        detail: `${fmt(Number(thisTotal.total))} este mes vs ${fmt(Number(lastTotal.total))} antes`,
        priority: 85,
        category: "gastos",
      });
    } else if (pct <= -10) {
      insights.push({
        id: "total_down_mild",
        type: "positive",
        icon: "👏",
        title: `Gastaste ${Math.abs(pct)}% menos que el mes pasado`,
        detail: `${fmt(Number(thisTotal.total))} vs ${fmt(Number(lastTotal.total))}`,
        priority: 70,
        category: "gastos",
      });
    } else if (Math.abs(pct) <= 5 && Number(thisTotal.total) > 0) {
      insights.push({
        id: "total_stable",
        type: "info",
        icon: "📊",
        title: "Tu gasto se mantiene estable",
        detail: `${fmt(Number(thisTotal.total))} este mes (±${Math.abs(pct)}%)`,
        priority: 40,
        category: "gastos",
      });
    }
  } else if (Number(thisTotal.total) > 0) {
    insights.push({
      id: "first_month",
      type: "info",
      icon: "🚀",
      title: "Es tu primer mes con datos",
      detail: `Llevas ${fmt(Number(thisTotal.total))} gastados. Manten el ritmo de captura.`,
      priority: 50,
      category: "gastos",
    });
  }

  // Regla 2: Categoria que mas subio vs mes pasado
  const lastByCatMap = new Map(lastByCat.map((c) => [c.categoryId ?? -1, Number(c.total)]));
  let topGrowth: { catId: number; pct: number; thisAmt: number; lastAmt: number } | null = null;
  for (const c of thisByCat) {
    if (!c.categoryId) continue;
    const lastAmt = lastByCatMap.get(c.categoryId) ?? 0;
    const thisAmt = Number(c.total);
    if (lastAmt <= 0) continue; // no podemos comparar
    const pct = Math.round(((thisAmt - lastAmt) / lastAmt) * 100);
    if (pct >= 15 && (topGrowth == null || pct > topGrowth.pct)) {
      topGrowth = { catId: c.categoryId, pct, thisAmt, lastAmt };
    }
  }
  if (topGrowth) {
    const info = catName.get(topGrowth.catId);
    insights.push({
      id: `cat_up_${topGrowth.catId}`,
      type: "warning",
      icon: info?.icon ?? "📈",
      title: `${info?.name ?? "Una categoria"} subio ${topGrowth.pct}% este mes`,
      detail: `${fmt(topGrowth.thisAmt)} vs ${fmt(topGrowth.lastAmt)} el mes pasado`,
      priority: 80,
      category: "gastos",
    });
  }

  // Regla 3: Categoria que mas bajo vs mes pasado (logro)
  let topDrop: { catId: number; pct: number; thisAmt: number; lastAmt: number } | null = null;
  for (const c of thisByCat) {
    if (!c.categoryId) continue;
    const lastAmt = lastByCatMap.get(c.categoryId) ?? 0;
    const thisAmt = Number(c.total);
    if (lastAmt <= 0) continue;
    const pct = Math.round(((thisAmt - lastAmt) / lastAmt) * 100);
    if (pct <= -20 && thisAmt > 0 && (topDrop == null || pct < topDrop.pct)) {
      topDrop = { catId: c.categoryId, pct, thisAmt, lastAmt };
    }
  }
  if (topDrop) {
    const info = catName.get(topDrop.catId);
    insights.push({
      id: `cat_down_${topDrop.catId}`,
      type: "positive",
      icon: "✨",
      title: `Bajaste ${Math.abs(topDrop.pct)}% en ${info?.name ?? "una categoria"}`,
      detail: `${fmt(topDrop.thisAmt)} vs ${fmt(topDrop.lastAmt)} antes`,
      priority: 65,
      category: "gastos",
    });
  }

  // Regla 4: Categoria top del mes (concentracion)
  if (thisByCat.length > 0 && Number(thisTotal.total) > 0) {
    const top = [...thisByCat].sort((a, b) => Number(b.total) - Number(a.total))[0];
    if (top.categoryId && Number(top.total) > 0) {
      const pct = Math.round((Number(top.total) / Number(thisTotal.total)) * 100);
      const info = catName.get(top.categoryId);
      if (pct >= 40) {
        insights.push({
          id: `cat_top_${top.categoryId}`,
          type: "info",
          icon: info?.icon ?? "🏷️",
          title: `${info?.name ?? "Una categoria"} concentro el ${pct}% de tus gastos`,
          detail: `${fmt(Number(top.total))} este mes`,
          priority: 55,
          category: "gastos",
        });
      } else {
        insights.push({
          id: `cat_top_${top.categoryId}`,
          type: "info",
          icon: info?.icon ?? "🏷️",
          title: `${info?.name ?? "Una categoria"} fue tu rubro principal`,
          detail: `${fmt(Number(top.total))} (${pct}% del total)`,
          priority: 35,
          category: "gastos",
        });
      }
    }
  }

  // Regla 5: Tienda top del mes
  if (thisByStore.length > 0 && Number(thisTotal.total) > 0) {
    const top = [...thisByStore].sort((a, b) => Number(b.total) - Number(a.total))[0];
    if (top.storeId && Number(top.total) > 0) {
      const pct = Math.round((Number(top.total) / Number(thisTotal.total)) * 100);
      const info = storeName.get(top.storeId);
      if (pct >= 40) {
        insights.push({
          id: `store_top_${top.storeId}`,
          type: "info",
          icon: "🏪",
          title: `${info?.name ?? "Una tienda"} concentro el ${pct}% de tu gasto`,
          detail: `${fmt(Number(top.total))} este mes`,
          priority: 50,
          category: "tiendas",
        });
      } else if (pct >= 20) {
        insights.push({
          id: `store_top_${top.storeId}`,
          type: "info",
          icon: "🏪",
          title: `${info?.name ?? "Una tienda"} fue tu tienda principal`,
          detail: `${fmt(Number(top.total))} (${pct}%)`,
          priority: 30,
          category: "tiendas",
        });
      }
    }
  }

  // Regla 6: Variedad de tiendas (un dato divertido)
  const distinctStoresWithSpend = thisByStore.filter((s) => s.storeId && Number(s.total) > 0).length;
  if (distinctStoresWithSpend >= 5) {
    insights.push({
      id: "stores_variety",
      type: "info",
      icon: "🛍️",
      title: `Visitaste ${distinctStoresWithSpend} tiendas distintas`,
      detail: "Buen nivel de variedad de proveedores",
      priority: 25,
      category: "tiendas",
    });
  }

  // Regla 7: Alacena agotada (alerta)
  if (Number(pantry.out ?? 0) > 0) {
    insights.push({
      id: "pantry_out",
      type: "alert",
      icon: "🚨",
      title: `Tienes ${pantry.out} producto(s) agotado(s) en alacena`,
      detail: "Considera reponerlos pronto",
      priority: 90,
      category: "alacena",
    });
  }

  // Regla 8: Alacena baja
  if (Number(pantry.low ?? 0) > 0) {
    insights.push({
      id: "pantry_low",
      type: "warning",
      icon: "🍽️",
      title: `Tienes ${pantry.low} producto(s) por acabarse`,
      detail: "Revisa tu lista de compra",
      priority: 70,
      category: "alacena",
    });
  }

  // Regla 9: Lista de compra cargada
  if (Number(pantry.shoppingListCount ?? 0) >= 3) {
    insights.push({
      id: "pantry_shopping",
      type: "info",
      icon: "🛒",
      title: `${pantry.shoppingListCount} productos esperan en tu lista de compra`,
      detail: "Buen momento para hacer una vuelta al super",
      priority: 45,
      category: "alacena",
    });
  }

  // Regla 10: Gastos pendientes sin monto
  if (pendingCount > 0) {
    insights.push({
      id: "pending_amount",
      type: pendingCount >= 5 ? "alert" : "warning",
      icon: "⏳",
      title: `${pendingCount} gasto(s) sin monto asignado`,
      detail: "Asignales monto para que sumen a tus stats",
      priority: pendingCount >= 5 ? 88 : 60,
      category: "habitos",
    });
  }

  // Regla 11: Consistencia de captura (mas o menos gastos que mes pasado)
  if (lastExpenseCount > 0 && expenseCount > 0) {
    const ratio = expenseCount / lastExpenseCount;
    if (ratio >= 1.5) {
      insights.push({
        id: "capture_more",
        type: "positive",
        icon: "📝",
        title: `Capturaste mas (${expenseCount} vs ${lastExpenseCount} gastos)`,
        detail: "Buen habito - mas datos, mejores insights",
        priority: 35,
        category: "habitos",
      });
    } else if (ratio <= 0.5) {
      insights.push({
        id: "capture_less",
        type: "info",
        icon: "📝",
        title: `Capturaste menos gastos este mes (${expenseCount} vs ${lastExpenseCount})`,
        detail: "Quizas se te olvidaron algunos?",
        priority: 30,
        category: "habitos",
      });
    }
  }

  // Regla 12: Mes sin movimientos
  if (expenseCount === 0 && lastExpenseCount > 0) {
    insights.push({
      id: "empty_month",
      type: "info",
      icon: "🤔",
      title: "No has capturado gastos este mes",
      detail: "Captura tu primer gasto del mes",
      priority: 50,
      category: "habitos",
    });
  }

  // Ordenar por prioridad
  insights.sort((a, b) => b.priority - a.priority);

  return {
    insights,
    meta: { year, month },
  };
}
