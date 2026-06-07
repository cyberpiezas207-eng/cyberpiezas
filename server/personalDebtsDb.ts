// ============================================================================
// CAPA DE BD - Deudas personales
// ----------------------------------------------------------------------------
// Funciones de consulta para el modulo de deudas personales.
// Reusa getDbOrThrow del proyecto y las tablas de personalDebtsSchema.
// Todo filtrado por userId (el admin). Patron repository, igual que db.ts.
//
// Funciones exportadas:
//   - listDebts, getDebtById
//   - createDebt, updateDebt, archiveDebt, setDebtStatus
//   - recordPayment, listPayments, softDeletePayment
//   - markAssetSold, sellAssetAndOptionallyPay
//   - getMonthSummary, getUpcomingPayments
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  eq,
  and,
  gte,
  lte,
  desc,
  asc,
  isNull,
  isNotNull,
} from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalDebts,
  personalDebtPayments,
  type PersonalDebt,
  type PersonalDebtPayment,
} from "./personalDebtsSchema";

// ----------------------------------------------------------------------------
// Tipos y helpers internos
// ----------------------------------------------------------------------------

type DebtStatus = "active" | "paused" | "paid" | "cancelled";
type DebtPriority = "low" | "medium" | "high";
type DebtPaymentMethod =
  | "cash"
  | "debit"
  | "credit"
  | "transfer"
  | "other";

// Normaliza nombre del acreedor para busquedas case-insensitive
function normalizeCreditor(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/\s+/g, " ")
    .trim();
}

// Hora Mexico (UTC-6)
function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// YYYY-MM-DD de hoy en zona Mexico
function todayYMD(): string {
  const d = nowMexico();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Rango de fechas de un mes en YYYY-MM-DD
function monthRange(year: number, month: number): { first: string; last: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    first: `${year}-${mm}-01`,
    last: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

// DEFENSIVO: normaliza un valor de fecha a string YYYY-MM-DD o null.
// Esta funcion es la UNICA fuente de verdad para convertir fechas. Acepta
// strings, Date objects, numeros (timestamps) y cualquier basura, y SIEMPRE
// devuelve un string YYYY-MM-DD valido o null. Asi ningun .split() ni
// new Date() posterior puede tronar con "t.split is not a function".
function toYMD(v: any): string | null {
  if (v == null) return null;
  // String: validar formato y recortar
  if (typeof v === "string") {
    const s = v.trim();
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    // Intentar parsear strings tipo ISO completos u otros
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }
  // Date object
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Numero (timestamp)
  if (typeof v === "number" && isFinite(v)) {
    const parsed = new Date(v);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

// Suma N dias a una fecha YYYY-MM-DD y retorna YYYY-MM-DD.
// Blindado: si la fecha no es valida, parte de hoy.
function addDaysYMD(ymd: string | null, days: number): string {
  const safe = toYMD(ymd) ?? todayYMD();
  const [y, m, d] = safe.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Calcula proximo dueDate avanzando UN MES desde la fecha actual de vencimiento
// Maneja meses con menos dias (dia 31 en febrero usa ultimo dia).
// Blindado: si currentYMD no es valido, usa hoy como base.
function nextMonthSameDayYMD(currentYMD: string | null, dueDay: number | null): string {
  const safe = toYMD(currentYMD) ?? todayYMD();
  const [y, m] = safe.split("-").map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const day = dueDay ?? Number(safe.split("-")[2]);
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const useDay = Math.min(day, lastDay);
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(useDay).padStart(2, "0")}`;
}

// Calcula la proxima ocurrencia de un dia del mes (dueDay) desde hoy.
// Si el dia ya paso este mes, salta al proximo mes. Respeta meses cortos
// (ej: dia 31 en un mes de 30 usa el ultimo dia real).
// Se usa para que una deuda con "dia 25" tenga su nextDueDate calculado
// automaticamente y aparezca en "Por pagar este mes".
function resolveNextDueFromDueDay(dueDay: number | null): string | null {
  if (dueDay == null || dueDay < 1 || dueDay > 31) return null;
  const now = nowMexico();
  const todayDay = now.getDate();
  const clampDay = (y: number, mo: number, day: number): number => {
    const last = new Date(y, mo + 1, 0).getDate();
    return Math.min(day, last);
  };
  let y = now.getFullYear();
  let mo = now.getMonth(); // 0-based
  let day = clampDay(y, mo, dueDay);
  if (day < todayDay) {
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
    day = clampDay(y, mo, dueDay);
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Convierte decimal de BD a number JS
function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}

// Monto que se debe pagar de una deuda en su proximo vencimiento:
// la cuota si es a plazos, o el saldo completo si es de un solo pago
// (ej: prestamo "unico" sin cuota mensual). Asi una deuda de un solo pago
// con vencimiento este mes SI cuenta en "Por pagar este mes".
function dueAmountFor(d: any): number {
  const inst = toNum(d.installmentAmount);
  if (inst > 0) return inst;
  return toNum(d.currentBalance);
}

// DEFENSIVO: normaliza un row de personalDebts asegurando que las fechas
// sean strings YYYY-MM-DD o null (nunca Date object ni objeto extrano).
// Esto evita que el frontend truene con "t.split is not a function" si
// drizzle por algun motivo devuelve fechas como Date.
function normalizeDebtRow(d: any): any {
  if (!d) return d;
  return {
    ...d,
    nextDueDate: toYMD(d.nextDueDate),
    startDate: toYMD(d.startDate),
    endDate: toYMD(d.endDate),
    assetSoldAt: toYMD(d.assetSoldAt),
  };
}

function normalizePaymentRow(p: any): any {
  if (!p) return p;
  return {
    ...p,
    paymentDate: toYMD(p.paymentDate),
  };
}

// ============================================================================
// CRUD: DEUDAS
// ============================================================================

export async function listDebts(
  userId: number,
  filters: { status?: DebtStatus; priority?: DebtPriority } = {},
): Promise<PersonalDebt[]> {
  const db = await getDbOrThrow();

  const conditions = [
    eq(personalDebts.userId, userId),
    isNull(personalDebts.deletedAt),
  ];

  if (filters.status) {
    conditions.push(eq(personalDebts.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(personalDebts.priority, filters.priority));
  }

  const rows = await db
    .select()
    .from(personalDebts)
    .where(and(...conditions))
    .orderBy(asc(personalDebts.nextDueDate), desc(personalDebts.createdAt));

  return rows.map(normalizeDebtRow);
}

export async function getDebtById(
  userId: number,
  id: number,
): Promise<PersonalDebt | null> {
  const db = await getDbOrThrow();

  const rows = await db
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.id, id),
        isNull(personalDebts.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ? normalizeDebtRow(rows[0]) : null;
}

export async function createDebt(
  userId: number,
  data: any,
): Promise<PersonalDebt> {
  const db = await getDbOrThrow();

  const creditorName = String(data.creditorName ?? "").trim();
  const normalizedCreditorName = normalizeCreditor(creditorName);
  const title = String(data.title ?? "").trim();

  // Si no nos dieron currentBalance pero si originalAmount, usar originalAmount
  let currentBalance = data.currentBalance;
  if (currentBalance == null && data.originalAmount != null) {
    currentBalance = data.originalAmount;
  }
  if (currentBalance == null) currentBalance = 0;

  const insertData: any = {
    userId,
    creditorName,
    normalizedCreditorName,
    title,
    description: data.description ?? null,
    category: data.category ?? null,
    originalAmount:
      data.originalAmount != null ? String(data.originalAmount) : null,
    currentBalance: String(currentBalance),
    installmentAmount:
      data.installmentAmount != null ? String(data.installmentAmount) : null,
    firstInstallmentAmount:
      data.firstInstallmentAmount != null
        ? String(data.firstInstallmentAmount)
        : null,
    frequencyDays: data.frequencyDays ?? null,
    currentInstallment: data.currentInstallment ?? 0,
    totalInstallments: data.totalInstallments ?? null,
    dueDay: data.dueDay ?? null,
    // Si no viene nextDueDate pero si dueDay, calcular la proxima fecha
    // automaticamente. Asi una deuda con "dia 25" nunca queda "sin fecha".
    nextDueDate:
      toYMD(data.nextDueDate) ?? resolveNextDueFromDueDay(data.dueDay ?? null),
    startDate: toYMD(data.startDate),
    endDate: toYMD(data.endDate),
    status: data.status ?? "active",
    priority: data.priority ?? "medium",
    isInstallmentPurchase: data.isInstallmentPurchase ?? false,
    installmentPlanType: data.installmentPlanType ?? null,
    paymentMethod: data.paymentMethod ?? null,
    linkedAssetName: data.linkedAssetName ?? null,
    assetStatus: data.assetStatus ?? null,
    color: data.color ?? "#fb7185",
    icon: data.icon ?? "💳",
    notes: data.notes ?? null,
  };

  const result: any = await db.insert(personalDebts).values(insertData);

  // MySQL retorna { insertId } o array con insertId
  const insertId =
    result?.[0]?.insertId ??
    result?.insertId ??
    result?.[0]?.[0]?.insertId;

  if (!insertId) {
    throw new Error("No se pudo obtener insertId de la deuda creada");
  }

  const debt = await getDebtById(userId, insertId);
  if (!debt) throw new Error("Deuda creada pero no se pudo leer");
  return debt;
}

export async function updateDebt(
  userId: number,
  id: number,
  data: any,
): Promise<PersonalDebt> {
  const db = await getDbOrThrow();

  // Existe?
  const existing = await getDebtById(userId, id);
  if (!existing) {
    throw new Error("Deuda no encontrada");
  }

  const updateData: any = {};

  if (data.creditorName !== undefined) {
    updateData.creditorName = String(data.creditorName).trim();
    updateData.normalizedCreditorName = normalizeCreditor(
      updateData.creditorName,
    );
  }
  if (data.title !== undefined) updateData.title = String(data.title).trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.originalAmount !== undefined) {
    updateData.originalAmount =
      data.originalAmount != null ? String(data.originalAmount) : null;
  }
  if (data.currentBalance !== undefined) {
    updateData.currentBalance =
      data.currentBalance != null ? String(data.currentBalance) : "0.00";
  }
  if (data.installmentAmount !== undefined) {
    updateData.installmentAmount =
      data.installmentAmount != null ? String(data.installmentAmount) : null;
  }
  if (data.firstInstallmentAmount !== undefined) {
    updateData.firstInstallmentAmount =
      data.firstInstallmentAmount != null
        ? String(data.firstInstallmentAmount)
        : null;
  }
  if (data.frequencyDays !== undefined) {
    updateData.frequencyDays = data.frequencyDays;
  }
  if (data.currentInstallment !== undefined) {
    updateData.currentInstallment = data.currentInstallment;
  }
  if (data.totalInstallments !== undefined) {
    updateData.totalInstallments = data.totalInstallments;
  }
  if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;
  // nextDueDate: si viene explicito, usarlo (normalizado). Si NO viene pero
  // cambiaste el dia, recalcular la proxima fecha desde el dia. Una sola vez.
  if (data.nextDueDate !== undefined) {
    updateData.nextDueDate = toYMD(data.nextDueDate);
  } else if (data.dueDay !== undefined && data.dueDay != null) {
    updateData.nextDueDate = resolveNextDueFromDueDay(data.dueDay);
  }
  if (data.startDate !== undefined) updateData.startDate = toYMD(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = toYMD(data.endDate);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.isInstallmentPurchase !== undefined) {
    updateData.isInstallmentPurchase = data.isInstallmentPurchase;
  }
  if (data.installmentPlanType !== undefined) {
    updateData.installmentPlanType = data.installmentPlanType;
  }
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.linkedAssetName !== undefined) {
    updateData.linkedAssetName = data.linkedAssetName;
  }
  if (data.assetStatus !== undefined) updateData.assetStatus = data.assetStatus;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(personalDebts)
      .set(updateData)
      .where(
        and(
          eq(personalDebts.userId, userId),
          eq(personalDebts.id, id),
        ),
      );
  }

  const updated = await getDebtById(userId, id);
  if (!updated) throw new Error("Deuda no encontrada despues de update");
  return updated;
}

export async function archiveDebt(
  userId: number,
  id: number,
): Promise<{ ok: true }> {
  const db = await getDbOrThrow();

  await db
    .update(personalDebts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.id, id),
      ),
    );

  return { ok: true };
}

export async function setDebtStatus(
  userId: number,
  id: number,
  status: DebtStatus,
): Promise<PersonalDebt> {
  const db = await getDbOrThrow();

  await db
    .update(personalDebts)
    .set({ status })
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.id, id),
      ),
    );

  const updated = await getDebtById(userId, id);
  if (!updated) throw new Error("Deuda no encontrada");
  return updated;
}

// ============================================================================
// CRUD: PAGOS
// ============================================================================

// recordPayment: registra pago Y ajusta currentBalance + currentInstallment.
// Si la deuda queda en cero o se completaron las cuotas, marca como "paid".
// Si no es parcial, avanza la siguiente fecha de vencimiento (un mes, o
// frequencyDays dias si la deuda es quincenal/semanal).
export async function recordPayment(
  userId: number,
  data: {
    debtId: number;
    amount: number;
    paymentDate?: string;
    installmentNumber?: number | null;
    paymentMethod?: DebtPaymentMethod;
    isPartial?: boolean;
    notes?: string | null;
    createExpense?: boolean;
    expenseCategoryId?: number | null;
  },
): Promise<{ payment: PersonalDebtPayment; debt: PersonalDebt }> {
  const db = await getDbOrThrow();

  // Validar que la deuda existe
  const debt = await getDebtById(userId, data.debtId);
  if (!debt) {
    throw new Error("Deuda no encontrada");
  }

  const paymentDate = toYMD(data.paymentDate) ?? todayYMD();
  const amount = Number(data.amount);
  const isPartial = data.isPartial ?? false;

  // Insertar el pago
  const insertData: any = {
    userId,
    debtId: data.debtId,
    amount: String(amount),
    paymentDate,
    installmentNumber: data.installmentNumber ?? null,
    paymentMethod: data.paymentMethod ?? "cash",
    linkedExpenseId: null, // TODO: integrar con modulo de gastos personales en futuro
    isPartial,
    notes: data.notes ?? null,
  };

  const result: any = await db.insert(personalDebtPayments).values(insertData);
  const paymentId =
    result?.[0]?.insertId ??
    result?.insertId ??
    result?.[0]?.[0]?.insertId;

  if (!paymentId) {
    throw new Error("No se pudo obtener insertId del pago");
  }

  // Recalcular saldo
  const currentBalance = toNum(debt.currentBalance);
  const newBalance = Math.max(0, currentBalance - amount);

  // Avanzar cuota si NO es parcial
  let newCurrentInstallment = debt.currentInstallment ?? 0;
  if (!isPartial) {
    newCurrentInstallment += 1;
  }

  // Determinar si la deuda quedo completamente pagada
  const totalCuotas = debt.totalInstallments;
  const completedByInstallments =
    totalCuotas != null && newCurrentInstallment >= totalCuotas;
  const completedByBalance = newBalance <= 0.005; // tolerancia decimal

  let newStatus: DebtStatus = debt.status as DebtStatus;
  if (completedByBalance || completedByInstallments) {
    newStatus = "paid";
  }

  // Calcular siguiente nextDueDate si no esta liquidada y no es parcial.
  // V3: si la deuda tiene frequencyDays (quincenal/semanal), avanzar esos
  // dias; si no, avanzar un mes manteniendo el dia (comportamiento clasico).
  const currentNextDue = toYMD(debt.nextDueDate);
  let newNextDueDate: string | null = currentNextDue;
  if (
    !isPartial &&
    newStatus === "active" &&
    currentNextDue != null
  ) {
    const freq = Number((debt as any).frequencyDays ?? 0);
    if (freq > 0) {
      newNextDueDate = addDaysYMD(currentNextDue, freq);
    } else {
      newNextDueDate = nextMonthSameDayYMD(currentNextDue, debt.dueDay);
    }
  }

  // Actualizar deuda
  await db
    .update(personalDebts)
    .set({
      currentBalance: String(newBalance),
      currentInstallment: newCurrentInstallment,
      status: newStatus,
      nextDueDate: newNextDueDate,
    })
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.id, data.debtId),
      ),
    );

  // Leer pago y deuda actualizados
  const paymentRows = await db
    .select()
    .from(personalDebtPayments)
    .where(eq(personalDebtPayments.id, paymentId))
    .limit(1);

  const updatedDebt = await getDebtById(userId, data.debtId);

  if (!paymentRows[0] || !updatedDebt) {
    throw new Error("No se pudo leer el pago/deuda despues de registrar");
  }

  return { payment: normalizePaymentRow(paymentRows[0]), debt: updatedDebt };
}

export async function listPayments(
  userId: number,
  filters: {
    debtId?: number;
    year?: number;
    month?: number;
    limit?: number;
  } = {},
): Promise<PersonalDebtPayment[]> {
  const db = await getDbOrThrow();

  const conditions = [eq(personalDebtPayments.userId, userId)];

  if (filters.debtId) {
    conditions.push(eq(personalDebtPayments.debtId, filters.debtId));
  }

  if (filters.year && filters.month) {
    const { first, last } = monthRange(filters.year, filters.month);
    conditions.push(gte(personalDebtPayments.paymentDate, first));
    conditions.push(lte(personalDebtPayments.paymentDate, last));
  } else if (filters.year) {
    const first = `${filters.year}-01-01`;
    const last = `${filters.year}-12-31`;
    conditions.push(gte(personalDebtPayments.paymentDate, first));
    conditions.push(lte(personalDebtPayments.paymentDate, last));
  }

  const baseQuery = db
    .select()
    .from(personalDebtPayments)
    .where(and(...conditions))
    .orderBy(
      desc(personalDebtPayments.paymentDate),
      desc(personalDebtPayments.id),
    );

  const rows = filters.limit
    ? await baseQuery.limit(filters.limit)
    : await baseQuery.limit(500);

  return rows.map(normalizePaymentRow);
}

// softDeletePayment: revierte el pago restaurando saldo y cuota de la deuda.
// NOTE: hard delete del payment row para simplicidad. Si quisieramos soft delete,
// agregar columna deletedAt al schema de pagos.
export async function softDeletePayment(
  userId: number,
  id: number,
): Promise<{ ok: true }> {
  const db = await getDbOrThrow();

  // Leer el pago para revertir
  const rows = await db
    .select()
    .from(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.userId, userId),
        eq(personalDebtPayments.id, id),
      ),
    )
    .limit(1);

  const payment = rows[0];
  if (!payment) {
    return { ok: true }; // ya no existe, ok
  }

  // Restaurar el saldo de la deuda
  const debt = await getDebtById(userId, payment.debtId);
  if (debt) {
    const restoredBalance = toNum(debt.currentBalance) + toNum(payment.amount);
    const restoredInstallment = Math.max(
      0,
      (debt.currentInstallment ?? 0) - (payment.isPartial ? 0 : 1),
    );

    // Si la deuda estaba marcada como "paid", regresarla a "active"
    let restoredStatus: DebtStatus = debt.status as DebtStatus;
    if (restoredStatus === "paid" && restoredBalance > 0) {
      restoredStatus = "active";
    }

    await db
      .update(personalDebts)
      .set({
        currentBalance: String(restoredBalance),
        currentInstallment: restoredInstallment,
        status: restoredStatus,
      })
      .where(
        and(
          eq(personalDebts.userId, userId),
          eq(personalDebts.id, payment.debtId),
        ),
      );
  }

  // Eliminar el row del pago
  await db
    .delete(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.userId, userId),
        eq(personalDebtPayments.id, id),
      ),
    );

  return { ok: true };
}

// ============================================================================
// ACTIVOS
// ============================================================================

export async function markAssetSold(
  userId: number,
  data: {
    debtId: number;
    soldPrice: number;
    soldAt?: string;
    soldBuyer?: string | null;
    soldNotes?: string | null;
  },
): Promise<PersonalDebt> {
  const db = await getDbOrThrow();

  await db
    .update(personalDebts)
    .set({
      assetStatus: "sold",
      assetSoldAt: toYMD(data.soldAt) ?? todayYMD(),
      assetSoldPrice: String(data.soldPrice),
      assetSoldBuyer: data.soldBuyer ?? null,
      assetSoldNotes: data.soldNotes ?? null,
    })
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.id, data.debtId),
      ),
    );

  const updated = await getDebtById(userId, data.debtId);
  if (!updated) throw new Error("Deuda no encontrada");
  return updated;
}

export async function sellAssetAndOptionallyPay(
  userId: number,
  data: {
    debtId: number;
    soldPrice: number;
    soldAt?: string;
    soldBuyer?: string | null;
    soldNotes?: string | null;
    paymentAmount?: number;
    paymentIsPartial?: boolean;
    createExpense?: boolean;
    expenseCategoryId?: number | null;
  },
): Promise<{ debt: PersonalDebt; payment: PersonalDebtPayment | null }> {
  // 1. Marcar como vendido
  await markAssetSold(userId, {
    debtId: data.debtId,
    soldPrice: data.soldPrice,
    soldAt: data.soldAt,
    soldBuyer: data.soldBuyer,
    soldNotes: data.soldNotes,
  });

  // 2. Si se quiere registrar pago, hacerlo
  let payment: PersonalDebtPayment | null = null;
  if (data.paymentAmount != null && data.paymentAmount > 0) {
    const result = await recordPayment(userId, {
      debtId: data.debtId,
      amount: data.paymentAmount,
      paymentDate: data.soldAt,
      isPartial: data.paymentIsPartial ?? false,
      notes: `Pago con venta de activo${data.soldBuyer ? ` a ${data.soldBuyer}` : ""}`,
      createExpense: data.createExpense,
      expenseCategoryId: data.expenseCategoryId,
    });
    payment = result.payment;
  }

  const debt = await getDebtById(userId, data.debtId);
  if (!debt) throw new Error("Deuda no encontrada despues de venta");

  return { debt, payment };
}

// ============================================================================
// STATS
// ============================================================================

export async function getMonthSummary(
  userId: number,
  year: number,
  month: number,
): Promise<{
  totalCurrentBalance: number;
  activeDebtsCount: number;
  expectedThisMonth: number;
  paymentsThisMonth: number;
  pendingThisMonth: number;
  nextDueDate: string | null;
  nextDueCreditor: string | null;
  nextDueAmount: number | null;
  ahorroDiarioSugerido: number;
  remainingDaysInMonth: number;
}> {
  const db = await getDbOrThrow();
  const { first, last } = monthRange(year, month);

  // Deudas activas
  const rawActiveDebts = await db
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.status, "active"),
        isNull(personalDebts.deletedAt),
      ),
    );
  // Normalizar fechas para uso interno (evita Date objects)
  const activeDebts = rawActiveDebts.map(normalizeDebtRow);

  const totalCurrentBalance = activeDebts.reduce(
    (acc, d) => acc + toNum(d.currentBalance),
    0,
  );

  // expectedThisMonth: suma de lo que se debe pagar de deudas con nextDueDate
  // dentro del mes. Usa la cuota si hay, o el saldo completo si es de un solo
  // pago (asi una deuda "unico" tambien cuenta).
  // toYMD blinda: si nextDueDate es null o invalido, la deuda no entra.
  const monthDebts = activeDebts.filter((d) => {
    const ymd = toYMD(d.nextDueDate);
    if (!ymd) return false;
    return ymd >= first && ymd <= last;
  });
  const expectedThisMonth = monthDebts.reduce(
    (acc, d) => acc + dueAmountFor(d),
    0,
  );

  // paymentsThisMonth: suma de pagos del mes (informativo, para mostrar
  // "ya pagaste X"). Incluye pagos a CUALQUIER deuda este mes.
  const monthPayments = await db
    .select()
    .from(personalDebtPayments)
    .where(
      and(
        eq(personalDebtPayments.userId, userId),
        gte(personalDebtPayments.paymentDate, first),
        lte(personalDebtPayments.paymentDate, last),
      ),
    );
  const paymentsThisMonth = monthPayments.reduce(
    (acc, p) => acc + toNum(p.amount),
    0,
  );

  // Pagos del mes agrupados POR DEUDA (para descontar a cada deuda lo suyo).
  // Asi una deuda viva solo descuenta lo que SE LE abono a ella, no pagos
  // de otras deudas (ni de deudas ya liquidadas que ya no estan vivas).
  const paidByDebt = new Map<number, number>();
  for (const p of monthPayments) {
    const prev = paidByDebt.get(p.debtId) ?? 0;
    paidByDebt.set(p.debtId, prev + toNum(p.amount));
  }

  // Proximo pago: deuda activa con nextDueDate mas cercana.
  // toYMD blinda el sort (localeCompare necesita strings, no Date).
  const debtsWithDate = activeDebts.filter((d) => toYMD(d.nextDueDate) != null);
  debtsWithDate.sort((a, b) => {
    const ad = toYMD(a.nextDueDate) ?? "9999-12-31";
    const bd = toYMD(b.nextDueDate) ?? "9999-12-31";
    return ad.localeCompare(bd);
  });
  const upcomingDebt = debtsWithDate[0] ?? null;

  // Dias restantes del mes (si es mes actual)
  const today = nowMexico();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const remainingDaysInMonth = isCurrentMonth
    ? Math.max(1, daysInMonth - today.getDate() + 1)
    : daysInMonth;

  // Por pagar este mes: suma de lo que le falta a CADA deuda viva que vence
  // este mes (su cuota menos lo que ya se le abono a ESA deuda este mes).
  // Las deudas liquidadas (status paid) ya no estan en monthDebts, asi que
  // sus pagos no inflan ni desinflan este numero. Esto evita que pagar una
  // deuda de un solo pago "descuente" de otras deudas distintas.
  const pendingThisMonth = monthDebts.reduce((acc, d) => {
    const cuota = dueAmountFor(d);
    const yaAbonado = paidByDebt.get(d.id) ?? 0;
    return acc + Math.max(0, cuota - yaAbonado);
  }, 0);

  // Ahorro diario sugerido: lo que falta este mes repartido entre los dias
  // que quedan. Asi sabes cuanto apartar al dia para llegar sin atrasos.
  const ahorroDiarioSugerido =
    remainingDaysInMonth > 0
      ? Math.ceil(pendingThisMonth / remainingDaysInMonth)
      : pendingThisMonth;

  return {
    totalCurrentBalance,
    activeDebtsCount: activeDebts.length,
    expectedThisMonth,
    paymentsThisMonth,
    pendingThisMonth,
    nextDueDate: toYMD(upcomingDebt?.nextDueDate) ?? null,
    nextDueCreditor: upcomingDebt?.creditorName ?? null,
    nextDueAmount: upcomingDebt ? dueAmountFor(upcomingDebt) : null,
    ahorroDiarioSugerido,
    remainingDaysInMonth,
  };
}

// getUpcomingPayments: lista de deudas activas con nextDueDate en los proximos N dias
export async function getUpcomingPayments(
  userId: number,
  daysAhead: number = 30,
): Promise<
  Array<{
    id: number;
    creditorName: string;
    title: string;
    amount: number;
    dueDate: string;
    daysUntil: number;
    currentInstallment: number | null;
    totalInstallments: number | null;
    icon: string | null;
    color: string | null;
  }>
> {
  const db = await getDbOrThrow();

  const today = todayYMD();
  const limit = addDaysYMD(today, daysAhead);

  const rawRows = await db
    .select()
    .from(personalDebts)
    .where(
      and(
        eq(personalDebts.userId, userId),
        eq(personalDebts.status, "active"),
        isNull(personalDebts.deletedAt),
        isNotNull(personalDebts.nextDueDate),
      ),
    );
  const rows = rawRows.map(normalizeDebtRow);

  // Filtrar por rango y mapear. toYMD blinda cada fecha antes de split.
  const result = rows
    .map((d) => ({ d, ymd: toYMD(d.nextDueDate) }))
    .filter((x) => x.ymd != null && (x.ymd as string) <= limit)
    .map(({ d, ymd }) => {
      const safeYmd = ymd as string;
      const [y, m, dd] = safeYmd.split("-").map(Number);
      const target = new Date(y, m - 1, dd);
      const nowD = nowMexico();
      nowD.setHours(0, 0, 0, 0);
      const days = Math.floor(
        (target.getTime() - nowD.getTime()) / 86_400_000,
      );

      return {
        id: d.id,
        creditorName: d.creditorName,
        title: d.title,
        amount: dueAmountFor(d),
        dueDate: safeYmd,
        daysUntil: days,
        currentInstallment: d.currentInstallment ?? null,
        totalInstallments: d.totalInstallments ?? null,
        icon: d.icon ?? null,
        color: d.color ?? null,
      };
    });

  // Ordenar por fecha
  result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return result;
}
