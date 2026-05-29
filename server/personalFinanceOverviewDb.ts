// ============================================================================
// CAPA DE BD - Vista combinada "Flujo General"
// ----------------------------------------------------------------------------
// SOLO LECTURA. Cruza datos del negocio (personalOperations) con gastos
// personales (personalExpensesDb) SIN MEZCLAR TABLAS.
//
// Reglas de oro:
//   - Los ingresos y utilidad del negocio NUNCA cambian por gastos personales.
//   - Aqui solo se calculan numeros y se cruzan visualmente.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, sql, gte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalOperations } from "../drizzle/schema";
import { monthlyPersonalExpenseTotals } from "./personalExpensesDb";

// ----------------------------------------------------------------------------
// Helpers de tiempo (Morelos = UTC-6 todo el ano)
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// Devuelve los ultimos N meses, mas antiguo primero. Cada uno: { year, month, ym }
function lastNMonths(count: number): { year: number; month: number; ym: string }[] {
  const now = nowMexico();
  const out: { year: number; month: number; ym: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    out.push({ year, month, ym });
  }
  return out;
}

function firstDayString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// ----------------------------------------------------------------------------
// Tendencia mensual del negocio
// Para productos: revenue = soldPrice, profit = soldPrice - acquiredCost
//                 (solo cuando status='sold' y soldAt en el mes)
// Para servicios: revenue = serviceFee, profit = serviceFee
//                 (cuando serviceDate en el mes)
// ----------------------------------------------------------------------------

export interface BusinessMonthBucket {
  ym: string; // YYYY-MM
  revenue: number;
  profit: number;
}

export async function getBusinessMonthlyTrend(
  userId: number,
  monthsCount: number = 6,
): Promise<BusinessMonthBucket[]> {
  const conn = await getDbOrThrow();
  const months = lastNMonths(monthsCount);
  const start = firstDayString(months[0].year, months[0].month);

  // Una sola query con CASE WHEN para sumar productos y servicios por mes
  const ymExpr = sql<string>`DATE_FORMAT(COALESCE(${personalOperations.soldAt}, ${personalOperations.serviceDate}), '%Y-%m')`;
  const revenueExpr = sql<string>`COALESCE(SUM(
    CASE
      WHEN ${personalOperations.operationType} = 'product' AND ${personalOperations.status} = 'sold' AND ${personalOperations.soldAt} IS NOT NULL
        THEN ${personalOperations.soldPrice}
      WHEN ${personalOperations.operationType} = 'service' AND ${personalOperations.serviceDate} IS NOT NULL
        THEN ${personalOperations.serviceFee}
      ELSE 0
    END
  ), 0)`;
  const profitExpr = sql<string>`COALESCE(SUM(
    CASE
      WHEN ${personalOperations.operationType} = 'product' AND ${personalOperations.status} = 'sold' AND ${personalOperations.soldAt} IS NOT NULL
        THEN (${personalOperations.soldPrice} - COALESCE(${personalOperations.acquiredCost}, 0))
      WHEN ${personalOperations.operationType} = 'service' AND ${personalOperations.serviceDate} IS NOT NULL
        THEN ${personalOperations.serviceFee}
      ELSE 0
    END
  ), 0)`;

  const rows = await conn
    .select({
      ym: ymExpr,
      revenue: revenueExpr,
      profit: profitExpr,
    })
    .from(personalOperations)
    .where(
      and(
        eq(personalOperations.ownerId, userId),
        sql`COALESCE(${personalOperations.soldAt}, ${personalOperations.serviceDate}) >= ${start}`,
      ),
    )
    .groupBy(ymExpr);

  // Mapear en orden, rellenando ceros donde no hay datos
  const byYm = new Map<string, { revenue: number; profit: number }>();
  for (const r of rows) {
    if (!r.ym) continue;
    byYm.set(r.ym, {
      revenue: Number(r.revenue) || 0,
      profit: Number(r.profit) || 0,
    });
  }

  return months.map(({ ym }) => {
    const v = byYm.get(ym);
    return {
      ym,
      revenue: v?.revenue ?? 0,
      profit: v?.profit ?? 0,
    };
  });
}

// ----------------------------------------------------------------------------
// Inventario actual (productos no vendidos)
// ----------------------------------------------------------------------------

export async function getInventorySnapshot(userId: number): Promise<{
  count: number;
  cost: number;
}> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select({
      count: sql<number>`COUNT(*)`,
      cost: sql<string>`COALESCE(SUM(${personalOperations.acquiredCost}), 0)`,
    })
    .from(personalOperations)
    .where(
      and(
        eq(personalOperations.ownerId, userId),
        eq(personalOperations.operationType, "product"),
        eq(personalOperations.status, "in_inventory"),
      ),
    );
  const r = rows[0];
  return {
    count: Number(r?.count) || 0,
    cost: Number(r?.cost) || 0,
  };
}

// ----------------------------------------------------------------------------
// OVERVIEW: cruza negocio + gastos personales para el panel Flujo General
// ----------------------------------------------------------------------------

export interface FlowMonthBucket {
  ym: string;
  year: number;
  month: number;
  businessRevenue: number;
  businessProfit: number;
  personalExpenses: number;
  balance: number; // profit - expenses
}

export interface CurrentMonthFlow {
  year: number;
  month: number;
  businessRevenue: number;
  businessProfit: number;
  personalExpenses: number;
  balanceAfterExpenses: number;
  expenseToProfitRatio: number | null; // porcentaje (0-100+) o null si no hay utilidad
  inventoryCount: number;
  inventoryCost: number;
}

export interface FinanceOverview {
  currentMonth: CurrentMonthFlow;
  trend: FlowMonthBucket[]; // ultimos 6 meses, mas antiguo primero
  insight: string | null;
}

export async function getFinanceOverview(
  userId: number,
): Promise<FinanceOverview> {
  const months = lastNMonths(6);

  // Tendencia del negocio (con relleno de ceros)
  const businessTrend = await getBusinessMonthlyTrend(userId, 6);

  // Tendencia de gastos personales (todos los meses, filtramos los ultimos 6)
  const allExpenseMonths = await monthlyPersonalExpenseTotals(userId);
  const expensesByYm = new Map<string, number>();
  for (const m of allExpenseMonths) {
    if (m.month) expensesByYm.set(m.month, m.total);
  }

  // Inventario actual
  const inv = await getInventorySnapshot(userId);

  // Construir trend cruzado
  const trend: FlowMonthBucket[] = months.map(({ year, month, ym }, idx) => {
    const biz = businessTrend[idx];
    const expenses = expensesByYm.get(ym) ?? 0;
    const businessRevenue = biz?.revenue ?? 0;
    const businessProfit = biz?.profit ?? 0;
    return {
      ym,
      year,
      month,
      businessRevenue,
      businessProfit,
      personalExpenses: expenses,
      balance: businessProfit - expenses,
    };
  });

  // Mes actual = ultimo del trend
  const last = trend[trend.length - 1];
  const ratio =
    last.businessProfit > 0
      ? Math.round((last.personalExpenses / last.businessProfit) * 100)
      : null;

  // Microcopy inteligente
  let insight: string | null = null;
  if (last.businessProfit > 0 && last.personalExpenses > 0) {
    if (ratio !== null && ratio < 100) {
      insight = `Este mes tus gastos personales consumieron ${ratio}% de tu utilidad del negocio. Balance neto positivo.`;
    } else if (ratio !== null && ratio >= 100) {
      insight = `Este mes tus gastos personales (${ratio}%) superaron tu utilidad del negocio. Balance neto negativo.`;
    }
  } else if (last.businessProfit > 0 && last.personalExpenses === 0) {
    insight = "Aun no registras gastos personales este mes.";
  } else if (last.businessProfit <= 0 && last.personalExpenses > 0) {
    insight = "Este mes registras gastos personales pero aun no utilidad del negocio.";
  }

  return {
    currentMonth: {
      year: last.year,
      month: last.month,
      businessRevenue: last.businessRevenue,
      businessProfit: last.businessProfit,
      personalExpenses: last.personalExpenses,
      balanceAfterExpenses: last.balance,
      expenseToProfitRatio: ratio,
      inventoryCount: inv.count,
      inventoryCost: inv.cost,
    },
    trend,
    insight,
  };
}
