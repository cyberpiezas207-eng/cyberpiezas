// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalServicesDb.ts <<<
// ============================================================================
// CAPA DE BD - Servicios fijos (recibos que se repiten cada mes)
// ----------------------------------------------------------------------------
// Guardar, listar, editar, archivar y marcar pagado. Al marcar pagado se crea
// un gasto normal (para que entre al pastel del mes) y se guarda la fecha del
// pago en lastPaidYmd, asi sabemos cuales faltan este mes.
//
// Reusa getDbOrThrow y createPersonalExpense del proyecto. Todo por userId.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, asc, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalFixedServices,
  type PersonalFixedService,
} from "./personalServicesSchema";
import { createPersonalExpense } from "./personalExpensesDb";
import { normalizeText } from "./personalExpensesEngine";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// Morelos = UTC-6 todo el ano
function todayMexico(): string {
  const ms = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// LISTAR
// ----------------------------------------------------------------------------

export async function listServices(
  userId: number,
): Promise<PersonalFixedService[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalFixedServices)
    .where(
      and(
        eq(personalFixedServices.userId, userId),
        eq(personalFixedServices.isActive, true),
        isNull(personalFixedServices.deletedAt),
      ),
    )
    .orderBy(asc(personalFixedServices.dueDay), asc(personalFixedServices.name));
}

export async function getServiceById(
  userId: number,
  id: number,
): Promise<PersonalFixedService | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalFixedServices)
    .where(
      and(
        eq(personalFixedServices.id, id),
        eq(personalFixedServices.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ----------------------------------------------------------------------------
// CREAR
// ----------------------------------------------------------------------------

export interface CreateServiceInput {
  name: string;
  amount?: number | null;
  dueDay?: number | null;
  categoryId?: number | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
}

export async function createService(
  userId: number,
  data: CreateServiceInput,
): Promise<PersonalFixedService> {
  const conn = await getDbOrThrow();
  const insertRes: any = await conn.insert(personalFixedServices).values({
    userId,
    name: data.name.trim(),
    amount:
      data.amount !== undefined && data.amount !== null
        ? data.amount.toFixed(2)
        : null,
    dueDay: data.dueDay ?? null,
    categoryId: data.categoryId ?? null,
    icon: data.icon ?? null,
    color: data.color ?? null,
    isActive: true,
    notes: data.notes ?? null,
  });

  // MySQL puede devolver { insertId } o [{ insertId }] segun el driver.
  const insertId =
    insertRes?.[0]?.insertId ??
    insertRes?.insertId ??
    insertRes?.[0]?.[0]?.insertId;
  if (!insertId) {
    throw new Error("No se pudo crear el servicio fijo");
  }

  const rows = await conn
    .select()
    .from(personalFixedServices)
    .where(eq(personalFixedServices.id, insertId))
    .limit(1);
  return rows[0];
}

// ----------------------------------------------------------------------------
// EDITAR
// ----------------------------------------------------------------------------

export interface UpdateServiceInput {
  name?: string;
  amount?: number | null;
  dueDay?: number | null;
  categoryId?: number | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
}

export async function updateService(
  userId: number,
  id: number,
  data: UpdateServiceInput,
): Promise<PersonalFixedService | null> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.amount !== undefined)
    updates.amount = data.amount === null ? null : data.amount.toFixed(2);
  if (data.dueDay !== undefined) updates.dueDay = data.dueDay;
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.color !== undefined) updates.color = data.color;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (Object.keys(updates).length === 0) return getServiceById(userId, id);

  const conn = await getDbOrThrow();
  await conn
    .update(personalFixedServices)
    .set(updates)
    .where(
      and(
        eq(personalFixedServices.id, id),
        eq(personalFixedServices.userId, userId),
      ),
    );
  return getServiceById(userId, id);
}

// ----------------------------------------------------------------------------
// ARCHIVAR (borrado suave)
// ----------------------------------------------------------------------------

export async function archiveService(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalFixedServices)
    .set({ isActive: false, deletedAt: new Date() })
    .where(
      and(
        eq(personalFixedServices.id, id),
        eq(personalFixedServices.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// MARCAR PAGADO: crea un gasto normal + guarda la fecha del pago
// ----------------------------------------------------------------------------

export interface MarkPaidOptions {
  amount?: number | null;
  paymentMethod?: "cash" | "debit" | "credit" | "transfer" | "other";
  expenseDate?: string; // YYYY-MM-DD
}

export async function markServicePaid(
  userId: number,
  id: number,
  opts: MarkPaidOptions = {},
): Promise<{ service: PersonalFixedService | null; expenseId: number }> {
  const service = await getServiceById(userId, id);
  if (!service) {
    throw new Error("Servicio no encontrado");
  }

  // Monto: el que se pasa o el esperado del servicio
  const amount =
    opts.amount !== undefined && opts.amount !== null
      ? opts.amount
      : Number(service.amount ?? 0);
  if (!amount || amount <= 0) {
    throw new Error("Captura el monto del pago");
  }

  const ymd = opts.expenseDate ?? todayMexico();

  // 1) Crear el gasto (para que entre al pastel del mes)
  const expense = await createPersonalExpense(userId, {
    amount,
    description: service.name,
    normalizedDescription: normalizeText(service.name),
    categoryId: service.categoryId ?? null,
    detectedCategoryId: null,
    storeId: null,
    storeName: null,
    purchaseType: "servicios",
    autoDetected: false,
    detectionConfidence: 0,
    detectionSource: "manual",
    paymentMethod: opts.paymentMethod ?? "cash",
    expenseDate: ymd,
    notes: "Pago de servicio fijo",
  });

  // 2) Marcar el servicio como pagado este mes
  const conn = await getDbOrThrow();
  await conn
    .update(personalFixedServices)
    .set({ lastPaidYmd: ymd })
    .where(
      and(
        eq(personalFixedServices.id, id),
        eq(personalFixedServices.userId, userId),
      ),
    );

  const updated = await getServiceById(userId, id);
  return { service: updated, expenseId: expense.id };
}

// ----------------------------------------------------------------------------
// RESUMEN DEL MES: total esperado + cuales faltan por pagar
// ----------------------------------------------------------------------------

export interface ServiceWithPaid extends PersonalFixedService {
  paidThisMonth: boolean;
}

export interface ServicesSummary {
  totalExpected: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  services: ServiceWithPaid[];
}

export async function getServicesSummary(
  userId: number,
  year: number,
  month: number,
): Promise<ServicesSummary> {
  const services = await listServices(userId);
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  let totalExpected = 0;
  let paidAmount = 0;
  let paidCount = 0;

  const withPaid: ServiceWithPaid[] = services.map((s) => {
    const amt = Number(s.amount ?? 0);
    totalExpected += amt;
    const paidThisMonth = !!s.lastPaidYmd && s.lastPaidYmd.startsWith(prefix);
    if (paidThisMonth) {
      paidAmount += amt;
      paidCount += 1;
    }
    return { ...s, paidThisMonth };
  });

  return {
    totalExpected,
    paidAmount,
    pendingAmount: totalExpected - paidAmount,
    paidCount,
    pendingCount: withPaid.length - paidCount,
    services: withPaid,
  };
}
