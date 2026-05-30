// ============================================================================
// CAPA DE BD - Modulo Deudas
// ----------------------------------------------------------------------------
// Funciones:
//   - Deudas    : listDebts, getDebtById, createDebt, updateDebt,
//                 archiveDebt, setDebtStatus
//   - Pagos     : recordPayment (actualiza saldo + crea gasto opcional),
//                 listPayments, softDeletePayment
//   - Activos   : markAssetSold (vender el bien vinculado)
//   - Stats     : getMonthSummary (cushion + ahorro diario),
//                 getUpcomingPayments (proximos 30 dias)
//
// recordPayment regla de oro:
//   - Baja currentBalance en `amount`
//   - Si no es parcial, avanza currentInstallment +1 y recalcula nextDueDate
//   - Si currentBalance llega a 0 o menos, marca status='paid'
//   - Si createExpense=true, crea gasto personal vinculado
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, isNull, sql, gte, lte, lt } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalDebts,
  personalDebtPayments,
  type PersonalDebt,
  type PersonalDebtPayment,
} from "./personalDebtsSchema";
import { createDetailedExpense } from "./personalExpensesCaptureDb";

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

// Morelos = UTC-6
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

function monthRangeYMD(year: number, month: number): { first: string; last: string } {
  const firstD = new Date(year, month - 1, 1);
  const lastD = new Date(year, month, 0);
  const f = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { first: f(firstD), last: f(lastD) };
}

function normalizeForSearch(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Calcula proximo dia X del mes despues de hoy
function computeNextDueDate(dueDay: number, baseDate?: Date): string {
  const t = baseDate ?? nowMexico();
  let year = t.getFullYear();
  let month = t.getMonth();
  const today = t.getDate();

  if (today > dueDay) {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(dueDay, lastDayOfMonth);

  const y = year;
  const m = String(month + 1).padStart(2, "0");
  const d = String(actualDay).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ----------------------------------------------------------------------------
// DEUDAS (CRUD)
// ----------------------------------------------------------------------------

export interface CreateDebtInput {
  creditorName: string;
  title: string;
  description?: string | null;
  category?: string | null;

  originalAmount?: number | null;
  currentBalance?: number | null; // si no se pasa, = originalAmount
  installmentAmount?: number | null;
  currentInstallment?: number | null;
  totalInstallments?: number | null;

  dueDay?: number | null;
  startDate?: string | null;
  endDate?: string | null;

  status?: "active" | "paused" | "paid" | "cancelled";
  priority?: "low" | "medium" | "high";

  isInstallmentPurchase?: boolean;
  installmentPlanType?: "msi" | "interest" | "fixed_payment" | "informal" | "other" | null;

  paymentMethod?: "cash" | "debit" | "credit" | "transfer" | "other" | null;

  // Activo embedded
  linkedAssetName?: string | null;
  assetStatus?: "owned" | "sold" | "lost" | "gifted" | "archived" | null;

  color?: string | null;
  icon?: string | null;
  notes?: string | null;
}

export interface ListDebtsFilters {
  status?: "active" | "paused" | "paid" | "cancelled";
  priority?: "low" | "medium" | "high";
  includeArchived?: boolean;
}

export async function listDebts(
  userId: number,
  filters: ListDebtsFilters = {},
): Promise<PersonalDebt[]> {
  const conn = await getDbOrThrow();
  const conds = [eq(personalDebts.userId, userId), isNull(personalDebts.deletedAt)];
  if (filters.status) {
    conds.push(eq(personalDebts.status, filters.status));
  }
  if (filters.priority) {
    conds.push(eq(personalDebts.priority, filters.priority));
  }
  return await conn
    .select()
    .from(personalDebts)
    .where(and(...conds))
    .orderBy(
      personalDebts.status,
      desc(personalDebts.priority),
      personalDebts.nextDueDate,
    );
}

export async function getDebtById(
  userId: number,
  id: number,
): Promise<PersonalDebt | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalDebts)
    .where(and(eq(personalDebts.id, id), eq(personalDebts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createDebt(
  userId: number,
  data: CreateDebtInput,
): Promise<PersonalDebt> {
  if (!data.creditorName?.trim() || !data.title?.trim()) {
    throw new Error("Acreedor y concepto son obligatorios");
  }
  const conn = await getDbOrThrow();

  const balance =
    data.currentBalance != null
      ? data.currentBalance
      : (data.originalAmount ?? 0);

  // Si tenemos dueDay y no startDate, calculamos nextDueDate
  let nextDueDate: string | null = null;
  if (data.dueDay != null) {
    nextDueDate = computeNextDueDate(data.dueDay);
  }

  const insertRes = await conn.insert(personalDebts).values({
    userId,
    creditorName: data.creditorName.trim(),
    normalizedCreditorName: normalizeForSearch(data.creditorName),
    title: data.title.trim(),
    description: data.description?.trim() || null,
    category: data.category?.trim() || null,
    originalAmount:
      data.originalAmount != null ? data.originalAmount.toFixed(2) : null,
    currentBalance: balance.toFixed(2),
    installmentAmount:
      data.installmentAmount != null ? data.installmentAmount.toFixed(2) : null,
    currentInstallment: data.currentInstallment ?? 0,
    totalInstallments: data.totalInstallments ?? null,
    dueDay: data.dueDay ?? null,
    nextDueDate,
    startDate: data.startDate ?? todayMexicoYMD(),
    endDate: data.endDate ?? null,
    status: data.status ?? "active",
    priority: data.priority ?? "medium",
    isInstallmentPurchase: data.isInstallmentPurchase ?? false,
    installmentPlanType: data.installmentPlanType ?? null,
    paymentMethod: data.paymentMethod ?? null,
    linkedAssetName: data.linkedAssetName?.trim() || null,
    assetStatus: data.assetStatus ?? (data.linkedAssetName ? "owned" : null),
    color: data.color?.trim() || "#fb7185",
    icon: data.icon?.trim() || "💳",
    notes: data.notes?.trim() || null,
  });

  const id = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalDebts)
    .where(eq(personalDebts.id, id))
    .limit(1);
  return rows[0];
}

export async function updateDebt(
  userId: number,
  id: number,
  data: Partial<CreateDebtInput>,
): Promise<PersonalDebt | null> {
  const conn = await getDbOrThrow();
  const updates: Record<string, unknown> = {};

  if (data.creditorName !== undefined) {
    updates.creditorName = data.creditorName.trim();
    updates.normalizedCreditorName = normalizeForSearch(data.creditorName);
  }
  if (data.title !== undefined) updates.title = data.title.trim();
  if (data.description !== undefined) {
    updates.description = data.description?.trim() || null;
  }
  if (data.category !== undefined) {
    updates.category = data.category?.trim() || null;
  }
  if (data.originalAmount !== undefined) {
    updates.originalAmount =
      data.originalAmount != null ? data.originalAmount.toFixed(2) : null;
  }
  if (data.currentBalance !== undefined) {
    updates.currentBalance =
      (data.currentBalance ?? 0).toFixed(2);
  }
  if (data.installmentAmount !== undefined) {
    updates.installmentAmount =
      data.installmentAmount != null ? data.installmentAmount.toFixed(2) : null;
  }
  if (data.currentInstallment !== undefined) {
    updates.currentInstallment = data.currentInstallment ?? 0;
  }
  if (data.totalInstallments !== undefined) {
    updates.totalInstallments = data.totalInstallments ?? null;
  }
  if (data.dueDay !== undefined) {
    updates.dueDay = data.dueDay ?? null;
    if (data.dueDay != null) {
      updates.nextDueDate = computeNextDueDate(data.dueDay);
    } else {
      updates.nextDueDate = null;
    }
  }
  if (data.startDate !== undefined) updates.startDate = data.startDate ?? null;
  if (data.endDate !== undefined) updates.endDate = data.endDate ?? null;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.isInstallmentPurchase !== undefined) {
    updates.isInstallmentPurchase = data.isInstallmentPurchase;
  }
  if (data.installmentPlanType !== undefined) {
    updates.installmentPlanType = data.installmentPlanType;
  }
  if (data.paymentMethod !== undefined) {
    updates.paymentMethod = data.paymentMethod;
  }
  if (data.linkedAssetName !== undefined) {
    updates.linkedAssetName = data.linkedAssetName?.trim() || null;
  }
  if (data.assetStatus !== undefined) updates.assetStatus = data.assetStatus;
  if (data.color !== undefined) {
    updates.color = data.color?.trim() || "#fb7185";
  }
  if (data.icon !== undefined) updates.icon = data.icon?.trim() || "💳";
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  if (Object.keys(updates).length > 0) {
    await conn
      .update(personalDebts)
      .set(updates)
      .where(and(eq(personalDebts.id, id), eq(personalDebts.userId, userId)));
  }
  return await getDebtById(userId, id);
}

export async function archiveDebt(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalDebts)
    .set({ deletedAt: new Date() })
    .where(and(eq(personalDebts.id, id), eq(personalDebts.userId, userId)));
  return { success: true };
}

export async function setDebtStatus(
  userId: number,
  id: number,
  status: "active" | "paused" | "paid" | "cancelled",
): Promise<PersonalDebt | null> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalDebts)
    .set({ status })
    .where(and(eq(personalDebts.id, id), eq(personalDebts.userId, userId)));
  return await getDebtById(userId, id);
}

// ----------------------------------------------------------------------------
// PAGOS
// ----------------------------------------------------------------------------

export interface RecordPaymentInput {
  debtId: number;
  amount: number;
  paymentDate?: string;
  installmentNumber?: number | null;
  paymentMethod?: "cash" | "debit" | "credit" | "transfer" | "other";
  isPartial?: boolean;
  notes?: string | null;
  createExpense?: boolean;
  expenseCategoryId?: number | null;
}

export async function recordPayment(
  userId: number,
  data: RecordPaymentInput,
): Promise<{
  payment: PersonalDebtPayment;
  debt: PersonalDebt;
  expenseId: number | null;
}> {
  if (data.amount <= 0) {
    throw new Error("El monto del pago debe ser positivo");
  }
  const conn = await getDbOrThrow();

  const debt = await getDebtById(userId, data.debtId);
  if (!debt) throw new Error("Deuda no encontrada");

  const paymentDate = data.paymentDate || todayMexicoYMD();
  const isPartial = data.isPartial ?? false;

  // Crear gasto vinculado opcional (PRIMERO para tener su id)
  let expenseId: number | null = null;
  if (data.createExpense) {
    const expense = await createDetailedExpense(userId, {
      description: `Pago ${debt.creditorName} - ${debt.title}`,
      amount: data.amount,
      categoryId: data.expenseCategoryId ?? null,
      storeId: null,
      storeName: debt.creditorName,
      expenseDate: paymentDate,
      paymentMethod: data.paymentMethod ?? "cash",
      notes:
        data.notes ??
        (data.installmentNumber
          ? `Mensualidad ${data.installmentNumber}/${debt.totalInstallments ?? "?"}`
          : isPartial
            ? "Abono parcial"
            : null),
    } as any);
    expenseId = (expense as any)?.id ?? null;
  }

  // Insertar pago
  const insertRes = await conn.insert(personalDebtPayments).values({
    userId,
    debtId: data.debtId,
    amount: data.amount.toFixed(2),
    paymentDate,
    installmentNumber: data.installmentNumber ?? null,
    paymentMethod: data.paymentMethod ?? "cash",
    linkedExpenseId: expenseId,
    isPartial,
    notes: data.notes ?? null,
  });
  const paymentId = (insertRes as any).insertId as number;
  const paymentRows = await conn
    .select()
    .from(personalDebtPayments)
    .where(eq(personalDebtPayments.id, paymentId))
    .limit(1);
  const payment = paymentRows[0];

  // Actualizar deuda: bajar saldo
  const currentBalance = Number(debt.currentBalance);
  const newBalance = Math.max(0, currentBalance - data.amount);

  const updates: Record<string, unknown> = {
    currentBalance: newBalance.toFixed(2),
  };

  // Si no es parcial, avanzar mensualidad
  if (!isPartial && debt.totalInstallments != null) {
    const newCurrent = (debt.currentInstallment ?? 0) + 1;
    updates.currentInstallment = newCurrent;
    // Recalcular nextDueDate si hay dueDay
    if (debt.dueDay != null) {
      // Avanzar al PROXIMO ciclo
      const nextBase = new Date(nowMexico());
      nextBase.setDate(nextBase.getDate() + 1); // forzar mover al siguiente mes
      updates.nextDueDate = computeNextDueDate(debt.dueDay, nextBase);
    }
  }

  // Si quedo en cero, marcar paid
  if (newBalance <= 0.01) {
    updates.status = "paid";
    updates.currentBalance = "0.00";
  }

  await conn
    .update(personalDebts)
    .set(updates)
    .where(eq(personalDebts.id, debt.id));

  const updatedRows = await conn
    .select()
    .from(personalDebts)
    .where(eq(personalDebts.id, debt.id))
    .limit(1);

  return { payment, debt: updatedRows[0], expenseId };
}

export interface ListPaymentsFilters {
  debtId?: number;
  year?: number;
  month?: number;
  limit?: number;
}

export async function listPayments(
  userId: number,
  filters: ListPaymentsFilters = {},
): Promise<PersonalDebtPayment[]> {
  const conn = await getDbOrThrow();
  const conds = [eq(personalDebtPayments.userId, userId)];
  if (filters.debtId) conds.push(eq(personalDebtPayments.debtId, filters.debtId));
  if (filters.year && filters.month) {
    const { first, last } = monthRangeYMD(filters.year, filters.month);
    conds.push(gte(personalDebtPayments.paymentDate, first));
    conds.push(lte(personalDebtPayments.paymentDate, last));
  }
  return await conn
    .select()
    .from(personalDebtPayments)
    .where(and(...conds))
    .orderBy(desc(personalDebtPayments.paymentDate), desc(personalDebtPayments.id))
    .limit(Math.min(filters.limit ?? 100, 500));
}

export async function softDeletePayment(
  userId: number,
  paymentId: number,
): Promise<{ success: boolean }> {
  // Para mantener historial limpio, hacemos hard delete del payment
  // pero NO revertimos el balance (el usuario debe ajustar manualmente)
  const conn = await getDbOrThrow();
  await conn
    .delete(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.id, paymentId),
        eq(personalDebtPayments.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// ACTIVOS (venta del bien vinculado)
// ----------------------------------------------------------------------------

export interface MarkAssetSoldInput {
  debtId: number;
  soldPrice: number;
  soldAt?: string;
  soldBuyer?: string | null;
  soldNotes?: string | null;
}

export async function markAssetSold(
  userId: number,
  data: MarkAssetSoldInput,
): Promise<PersonalDebt | null> {
  if (data.soldPrice <= 0) {
    throw new Error("Precio de venta debe ser positivo");
  }
  const conn = await getDbOrThrow();

  const debt = await getDebtById(userId, data.debtId);
  if (!debt) throw new Error("Deuda no encontrada");
  if (!debt.linkedAssetName) {
    throw new Error("Esta deuda no tiene activo vinculado");
  }

  await conn
    .update(personalDebts)
    .set({
      assetStatus: "sold",
      assetSoldAt: data.soldAt ?? todayMexicoYMD(),
      assetSoldPrice: data.soldPrice.toFixed(2),
      assetSoldBuyer: data.soldBuyer?.trim() || null,
      assetSoldNotes: data.soldNotes?.trim() || null,
    })
    .where(eq(personalDebts.id, debt.id));

  return await getDebtById(userId, debt.id);
}

// ----------------------------------------------------------------------------
// STATS
// ----------------------------------------------------------------------------

export interface DebtMonthSummary {
  activeDebtsCount: number;
  totalCurrentBalance: number;
  paymentsThisMonth: number;
  paymentsThisMonthCount: number;
  expectedThisMonth: number;
  ahorroDiarioSugerido: number; // expectedThisMonth / dias restantes del mes
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextDueCreditor: string | null;
  paidDebtsCount: number;
}

export async function getMonthSummary(
  userId: number,
  year: number,
  month: number,
): Promise<DebtMonthSummary> {
  const conn = await getDbOrThrow();
  const { first, last } = monthRangeYMD(year, month);

  // Deudas activas
  const activeDebts = await conn
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "active"),
      ),
    );

  const totalCurrentBalance = activeDebts.reduce(
    (acc, d) => acc + Number(d.currentBalance),
    0,
  );
  const expectedThisMonth = activeDebts.reduce(
    (acc, d) => acc + Number(d.installmentAmount ?? 0),
    0,
  );

  // Pagos del mes
  const paymentRows = await conn
    .select({
      total: sql<string>`COALESCE(SUM(${personalDebtPayments.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.userId, userId),
        gte(personalDebtPayments.paymentDate, first),
        lte(personalDebtPayments.paymentDate, last),
      ),
    );

  const paymentsThisMonth = Number(paymentRows[0]?.total ?? 0);
  const paymentsThisMonthCount = Number(paymentRows[0]?.count ?? 0);

  // Proximo vencimiento (la deuda con menor nextDueDate)
  const nextDue = activeDebts
    .filter((d) => d.nextDueDate != null)
    .sort((a, b) => (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""))[0];

  // Ahorro diario sugerido: lo que falta del mes / dias restantes
  const today = nowMexico();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  let daysLeft = 30;
  if (isCurrentMonth) {
    const lastDay = new Date(year, month, 0).getDate();
    daysLeft = Math.max(1, lastDay - today.getDate());
  } else {
    daysLeft = new Date(year, month, 0).getDate();
  }
  const remainingToCover = Math.max(0, expectedThisMonth - paymentsThisMonth);
  const ahorroDiarioSugerido =
    daysLeft > 0
      ? Math.round((remainingToCover / daysLeft) * 100) / 100
      : remainingToCover;

  // Liquidadas
  const paidRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "paid"),
      ),
    );
  const paidDebtsCount = Number(paidRows[0]?.count ?? 0);

  return {
    activeDebtsCount: activeDebts.length,
    totalCurrentBalance: Math.round(totalCurrentBalance * 100) / 100,
    paymentsThisMonth: Math.round(paymentsThisMonth * 100) / 100,
    paymentsThisMonthCount,
    expectedThisMonth: Math.round(expectedThisMonth * 100) / 100,
    ahorroDiarioSugerido,
    nextDueDate: nextDue?.nextDueDate ?? null,
    nextDueAmount:
      nextDue?.installmentAmount != null
        ? Number(nextDue.installmentAmount)
        : null,
    nextDueCreditor: nextDue?.creditorName ?? null,
    paidDebtsCount,
  };
}

export interface UpcomingPayment {
  debtId: number;
  creditorName: string;
  title: string;
  installmentAmount: number | null;
  nextDueDate: string;
  daysUntilDue: number;
  icon: string | null;
  color: string | null;
}

export async function getUpcomingPayments(
  userId: number,
  daysAhead = 30,
): Promise<UpcomingPayment[]> {
  const conn = await getDbOrThrow();
  const today = nowMexico();
  const todayYMD = todayMexicoYMD();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureYMD = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;

  const rows = await conn
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        isNull(personalDebts.deletedAt),
        eq(personalDebts.status, "active"),
        gte(personalDebts.nextDueDate, todayYMD),
        lte(personalDebts.nextDueDate, futureYMD),
      ),
    )
    .orderBy(personalDebts.nextDueDate);

  return rows.map((d) => {
    const due = new Date(d.nextDueDate + "T12:00:00");
    const diff = Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      debtId: d.id,
      creditorName: d.creditorName,
      title: d.title,
      installmentAmount:
        d.installmentAmount != null ? Number(d.installmentAmount) : null,
      nextDueDate: d.nextDueDate as string,
      daysUntilDue: diff < 0 ? 0 : diff,
      icon: d.icon,
      color: d.color,
    };
  });
}
