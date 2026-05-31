// ============================================================================
// CAPA DE BD - Liquidadas (trofeos) + Insights inteligentes
// ----------------------------------------------------------------------------
// Funciones:
//   - listPaidDebts        : deudas liquidadas con total pagado por cada una
//   - getPaidDebtsStats    : agregados (cuantas, total liquidado, este año)
//   - getDebtInsights      : 10 reglas que analizan tu situacion y retornan
//                            frases utiles ordenadas por prioridad
//
// Las reglas son determinisitcas (sin IA), basadas en heuristicas claras.
// Si una regla no aplica, no se incluye su insight (lista limpia).
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, isNull, sql, gte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalDebts, personalDebtPayments } from "./personalDebtsSchema";
import {
  listDebts,
  getMonthSummary,
  getUpcomingPayments,
} from "./personalDebtsDb";

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayMexicoYMD(): string {
  const d = nowMexico();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ----------------------------------------------------------------------------
// LIQUIDADAS (TROFEOS)
// ----------------------------------------------------------------------------

export interface PaidDebtView {
  id: number;
  creditorName: string;
  title: string;
  icon: string | null;
  color: string | null;
  originalAmount: number | null;
  totalPaid: number;
  paymentsCount: number;
  lastPaymentDate: string | null;
  linkedAssetName: string | null;
  assetStatus: string | null;
  assetSoldPrice: number | null;
  hadInstallmentPurchase: boolean;
  installmentPlanType: string | null;
}

export async function listPaidDebts(userId: number): Promise<PaidDebtView[]> {
  const conn = await getDbOrThrow();

  // Traer deudas con status=paid
  const paid = await conn
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "paid"),
      ),
    )
    .orderBy(desc(personalDebts.updatedAt));

  if (paid.length === 0) return [];

  // Para cada deuda, calcular total pagado y ultima fecha de pago
  const results: PaidDebtView[] = [];
  for (const debt of paid) {
    const agg = await conn
      .select({
        total: sql<string>`COALESCE(SUM(${personalDebtPayments.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
        lastDate: sql<string>`MAX(${personalDebtPayments.paymentDate})`,
      })
      .from(personalDebtPayments)
      .where(
        and(
          eq(personalDebtPayments.userId, userId),
          eq(personalDebtPayments.debtId, debt.id),
        ),
      );

    const r = agg[0];
    results.push({
      id: debt.id,
      creditorName: debt.creditorName,
      title: debt.title,
      icon: debt.icon,
      color: debt.color,
      originalAmount: debt.originalAmount ? Number(debt.originalAmount) : null,
      totalPaid: Math.round(Number(r?.total ?? 0) * 100) / 100,
      paymentsCount: Number(r?.count ?? 0),
      lastPaymentDate: r?.lastDate ?? null,
      linkedAssetName: debt.linkedAssetName,
      assetStatus: debt.assetStatus,
      assetSoldPrice: debt.assetSoldPrice ? Number(debt.assetSoldPrice) : null,
      hadInstallmentPurchase: debt.isInstallmentPurchase ?? false,
      installmentPlanType: debt.installmentPlanType,
    });
  }

  return results;
}

export interface PaidDebtsStats {
  count: number;
  totalLiquidated: number;
  totalPaidThisYear: number;
  countThisYear: number;
  oldestPaidYear: number | null;
}

export async function getPaidDebtsStats(
  userId: number,
): Promise<PaidDebtsStats> {
  const conn = await getDbOrThrow();
  const today = nowMexico();
  const yearStart = `${today.getFullYear()}-01-01`;

  // Conteo y total de deudas pagadas
  const paidRows = await conn
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(${personalDebts.originalAmount}), 0)`,
    })
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "paid"),
      ),
    );

  const count = Number(paidRows[0]?.count ?? 0);
  const totalLiquidated = Math.round(
    Number(paidRows[0]?.total ?? 0) * 100,
  ) / 100;

  // Pagos del año en curso
  const yearRows = await conn
    .select({
      total: sql<string>`COALESCE(SUM(${personalDebtPayments.amount}), 0)`,
    })
    .from(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.userId, userId),
        gte(personalDebtPayments.paymentDate, yearStart),
      ),
    );

  const totalPaidThisYear = Math.round(
    Number(yearRows[0]?.total ?? 0) * 100,
  ) / 100;

  // Liquidadas este año (ultimo update en este año con status=paid)
  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const countThisYearRows = await conn
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "paid"),
        gte(personalDebts.updatedAt, thisYearStart),
      ),
    );

  const countThisYear = Number(countThisYearRows[0]?.count ?? 0);

  // Año mas antiguo con deuda liquidada
  const oldestRows = await conn
    .select({
      year: sql<number>`MIN(YEAR(${personalDebts.updatedAt}))`,
    })
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "paid"),
      ),
    );

  const oldestPaidYear = oldestRows[0]?.year
    ? Number(oldestRows[0].year)
    : null;

  return {
    count,
    totalLiquidated,
    totalPaidThisYear,
    countThisYear,
    oldestPaidYear,
  };
}

// ----------------------------------------------------------------------------
// INSIGHTS (10 reglas deterministicas)
// ----------------------------------------------------------------------------

export type InsightType = "positive" | "warning" | "alert" | "info";

export interface DebtInsight {
  id: string;
  type: InsightType;
  icon: string;
  title: string;
  description: string;
  priority: number; // 1-100
}

export async function getDebtInsights(
  userId: number,
  year: number,
  month: number,
): Promise<DebtInsight[]> {
  const insights: DebtInsight[] = [];

  // Cargar datos base
  const activeDebts = await listDebts(userId, { status: "active" });
  const summary = await getMonthSummary(userId, year, month);
  const upcoming = await getUpcomingPayments(userId, 30);
  const paidStats = await getPaidDebtsStats(userId);

  // Si no hay deudas activas, retornar solo el insight positivo
  if (activeDebts.length === 0) {
    if (paidStats.count > 0) {
      insights.push({
        id: "no_active_debts_with_history",
        type: "positive",
        icon: "🏆",
        title: "Sin deudas activas",
        description: `Has liquidado ${paidStats.count} deuda${paidStats.count === 1 ? "" : "s"} en total. Aprovecha tu mes libre.`,
        priority: 50,
      });
    }
    return insights;
  }

  const today = nowMexico();
  const todayYMD = todayMexicoYMD();

  // ---------- REGLA 1: Vencidas (ALERT, priority 100) ----------
  const overdueDebts = activeDebts.filter(
    (d) => d.nextDueDate != null && d.nextDueDate < todayYMD,
  );
  if (overdueDebts.length > 0) {
    insights.push({
      id: "overdue",
      type: "alert",
      icon: "🚨",
      title:
        overdueDebts.length === 1
          ? `1 deuda vencida`
          : `${overdueDebts.length} deudas vencidas`,
      description:
        overdueDebts.length === 1
          ? `${overdueDebts[0].creditorName} - ${overdueDebts[0].title} requiere atencion urgente.`
          : `Requieren atencion urgente. Revisa la lista de abajo.`,
      priority: 100,
    });
  }

  // ---------- REGLA 2: Vence hoy o mañana (WARNING, priority 95) ----------
  const dueToday = upcoming.filter((p) => p.daysUntilDue === 0);
  const dueTomorrow = upcoming.filter((p) => p.daysUntilDue === 1);
  if (dueToday.length > 0) {
    const p = dueToday[0];
    insights.push({
      id: "due_today",
      type: "warning",
      icon: "⏰",
      title: "Vence HOY",
      description:
        dueToday.length === 1
          ? `${p.creditorName} - ${p.title}${p.installmentAmount ? ` por $${p.installmentAmount.toLocaleString("es-MX")}` : ""}.`
          : `Tienes ${dueToday.length} pagos para hoy. Revisa la lista.`,
      priority: 95,
    });
  } else if (dueTomorrow.length > 0) {
    const p = dueTomorrow[0];
    insights.push({
      id: "due_tomorrow",
      type: "warning",
      icon: "⏰",
      title: "Vence mañana",
      description: `${p.creditorName} - ${p.title}${p.installmentAmount ? ` por $${p.installmentAmount.toLocaleString("es-MX")}` : ""}.`,
      priority: 90,
    });
  }

  // ---------- REGLA 3: Activo vendido con deuda activa (WARNING, priority 80) ----------
  const soldButOwed = activeDebts.filter(
    (d) =>
      d.assetStatus === "sold" && Number(d.currentBalance) > 0.01,
  );
  if (soldButOwed.length > 0) {
    const d = soldButOwed[0];
    const balance = Number(d.currentBalance);
    insights.push({
      id: "sold_but_owed",
      type: "warning",
      icon: "🏷️",
      title: `Vendiste ${d.linkedAssetName ?? d.title} pero aun debes`,
      description: `Quedan $${balance.toLocaleString("es-MX")} pendientes con ${d.creditorName}.`,
      priority: 80,
    });
  }

  // ---------- REGLA 4: Atraso del mes (WARNING, priority 75) ----------
  const expectedMes = summary.expectedThisMonth ?? 0;
  const paidMes = summary.paymentsThisMonth ?? 0;
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  if (expectedMes > 0 && isCurrentMonth) {
    const ratio = paidMes / expectedMes;
    if (ratio < 0.4) {
      const lastDay = new Date(year, month, 0).getDate();
      const daysLeft = Math.max(1, lastDay - today.getDate());
      const remaining = Math.max(0, expectedMes - paidMes);
      const dailyNeeded = Math.round(remaining / daysLeft);
      insights.push({
        id: "behind_month",
        type: "warning",
        icon: "📉",
        title: "Vas atrasado este mes",
        description: `Solo has cubierto ${Math.round(ratio * 100)}%. Separa $${dailyNeeded.toLocaleString("es-MX")} diarios para llegar al fin de mes.`,
        priority: 75,
      });
    }
  }

  // ---------- REGLA 5: Al dia o adelantado (POSITIVE, priority 70) ----------
  if (expectedMes > 0 && paidMes >= expectedMes && isCurrentMonth) {
    insights.push({
      id: "on_track",
      type: "positive",
      icon: "🎯",
      title: "Vas al dia con el mes",
      description: `Ya cubriste $${paidMes.toLocaleString("es-MX")} de tus compromisos. Excelente ritmo.`,
      priority: 70,
    });
  }

  // ---------- REGLA 6: Proximos a liquidar (POSITIVE, priority 65) ----------
  const nearLiquidation = activeDebts.filter((d) => {
    if (d.totalInstallments == null || d.totalInstallments <= 0) return false;
    const progress = (d.currentInstallment ?? 0) / d.totalInstallments;
    return progress >= 0.8 && d.currentInstallment !== d.totalInstallments;
  });
  if (nearLiquidation.length > 0) {
    const d = nearLiquidation[0];
    const remaining = (d.totalInstallments ?? 0) - (d.currentInstallment ?? 0);
    insights.push({
      id: "near_liquidation",
      type: "positive",
      icon: "🏁",
      title: "Casi liquidas una deuda",
      description: `${d.creditorName} - ${d.title}: te falta${remaining === 1 ? "" : "n"} ${remaining} pago${remaining === 1 ? "" : "s"} para terminarla.`,
      priority: 65,
    });
  }

  // ---------- REGLA 7: Concentracion alta (INFO, priority 60) ----------
  const totalBalance = summary.totalCurrentBalance;
  if (totalBalance > 0 && activeDebts.length > 1) {
    const largest = activeDebts.reduce((max, d) =>
      Number(d.currentBalance) > Number(max.currentBalance) ? d : max,
    );
    const largestBalance = Number(largest.currentBalance);
    const concentrationPct = (largestBalance / totalBalance) * 100;
    if (concentrationPct >= 50) {
      insights.push({
        id: "concentration",
        type: "info",
        icon: "🎯",
        title: "Concentracion de deuda",
        description: `El ${Math.round(concentrationPct)}% esta en ${largest.creditorName} - ${largest.title}. Considera enfocarte en esa.`,
        priority: 60,
      });
    }
  }

  // ---------- REGLA 8: Trofeos recientes (POSITIVE, priority 55) ----------
  if (paidStats.countThisYear > 0) {
    insights.push({
      id: "trophies_this_year",
      type: "positive",
      icon: "🏆",
      title: `${paidStats.countThisYear} liquidada${paidStats.countThisYear === 1 ? "" : "s"} este año`,
      description: `Has eliminado $${paidStats.totalLiquidated.toLocaleString("es-MX")} en deudas. Sigue asi.`,
      priority: 55,
    });
  }

  // ---------- REGLA 9: Ahorro diario sugerido (INFO, priority 50) ----------
  const daily = summary.ahorroDiarioSugerido ?? 0;
  if (daily > 0 && isCurrentMonth) {
    insights.push({
      id: "daily_savings",
      type: "info",
      icon: "💰",
      title: "Ahorro diario sugerido",
      description: `Separa $${daily.toLocaleString("es-MX")} diarios para cubrir tus compromisos del mes.`,
      priority: 50,
    });
  }

  // ---------- REGLA 10: MSI activos (INFO, priority 40) ----------
  const msiDebts = activeDebts.filter(
    (d) => d.installmentPlanType === "msi" && Number(d.currentBalance) > 0,
  );
  if (msiDebts.length > 0) {
    const totalMsiBalance = msiDebts.reduce(
      (acc, d) => acc + Number(d.currentBalance),
      0,
    );
    insights.push({
      id: "msi_active",
      type: "info",
      icon: "💳",
      title: `${msiDebts.length} compra${msiDebts.length === 1 ? "" : "s"} a MSI`,
      description: `Con $${Math.round(totalMsiBalance).toLocaleString("es-MX")} pendiente${msiDebts.length === 1 ? "" : "s"} sin intereses.`,
      priority: 40,
    });
  }

  // Ordenar por prioridad descendente y tomar top 6
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}
