// ============================================================================
// DB LAYER - Modulo Recordatorios
// ----------------------------------------------------------------------------
// Repository pattern: cada funcion recibe userId y filtros, retorna filas.
// El router decide auth (ownerOnlyProcedure) y mapea ctx -> userId.
//
// Funciones publicas:
//   - listReminders(userId, filter, limit?)
//   - getReminder(userId, id)
//   - createReminder(userId, data)
//   - updateReminder(userId, id, data)
//   - markReminderDone(userId, id)  - maneja recurrencia automatica
//   - snoozeReminder(userId, id, untilYMD)
//   - dismissReminder(userId, id)
//   - softDeleteReminder(userId, id)
//   - getDashboardStats(userId)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, isNull, isNotNull, sql, desc, asc, or, lte, gte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalReminders,
  type RecurrencePattern as SchemaRecurrencePattern,
} from "./personalRemindersSchema";

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export type ReminderStatus = "pending" | "done" | "dismissed";
export type ReminderPriority = "low" | "normal" | "high" | "urgent";
export type ReminderSourceModule =
  | "manual"
  | "debt"
  | "subscription"
  | "vehicle"
  | "pantry";
export type ReminderRecurrence =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type ReminderFilter = "all" | "pending" | "today" | "upcoming" | "overdue" | "done";

export interface CreateReminderInput {
  title: string;
  description?: string | null;
  dueDate?: string | null; // YMD
  dueTime?: string | null; // HH:MM
  isRecurring?: boolean;
  recurrencePattern?: ReminderRecurrence | null;
  recurrenceUntil?: string | null;
  sourceModule?: ReminderSourceModule;
  sourceId?: number | null;
  priority?: ReminderPriority;
  icon?: string | null;
  color?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  snoozedUntil?: string | null;
  isRecurring?: boolean;
  recurrencePattern?: ReminderRecurrence | null;
  recurrenceUntil?: string | null;
  priority?: ReminderPriority;
  icon?: string | null;
  color?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayYMD(): string {
  const d = nowMexico();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function addMonthsYMD(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setMonth(dt.getMonth() + months);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Calcula la proxima ocurrencia segun el pattern de recurrencia
function nextOccurrence(
  currentYMD: string,
  pattern: ReminderRecurrence,
): string {
  switch (pattern) {
    case "daily":
      return addDaysYMD(currentYMD, 1);
    case "weekly":
      return addDaysYMD(currentYMD, 7);
    case "biweekly":
      return addDaysYMD(currentYMD, 14);
    case "monthly":
      return addMonthsYMD(currentYMD, 1);
    case "quarterly":
      return addMonthsYMD(currentYMD, 3);
    case "yearly":
      return addMonthsYMD(currentYMD, 12);
  }
}

// Stringify tags array a JSON
function stringifyTags(tags: string[] | null | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  return JSON.stringify(tags);
}

// Parse tags JSON a array
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// LIST con filtros
// ----------------------------------------------------------------------------

export async function listReminders(
  userId: number,
  filter: ReminderFilter = "pending",
  limit: number = 100,
): Promise<any[]> {
  const conn = await getDbOrThrow();
  const today = todayYMD();
  const in7Days = addDaysYMD(today, 7);

  const baseConditions = [
    eq(personalReminders.userId, userId),
    isNull(personalReminders.deletedAt),
  ];

  let whereClause;
  switch (filter) {
    case "all":
      whereClause = and(...baseConditions);
      break;
    case "pending":
      whereClause = and(
        ...baseConditions,
        eq(personalReminders.status, "pending"),
        or(
          isNull(personalReminders.snoozedUntil),
          lte(personalReminders.snoozedUntil, today),
        ),
      );
      break;
    case "today":
      whereClause = and(
        ...baseConditions,
        eq(personalReminders.status, "pending"),
        or(
          eq(personalReminders.dueDate, today),
          isNull(personalReminders.dueDate),
        ),
      );
      break;
    case "upcoming":
      whereClause = and(
        ...baseConditions,
        eq(personalReminders.status, "pending"),
        isNotNull(personalReminders.dueDate),
        gte(personalReminders.dueDate, today),
        lte(personalReminders.dueDate, in7Days),
      );
      break;
    case "overdue":
      whereClause = and(
        ...baseConditions,
        eq(personalReminders.status, "pending"),
        isNotNull(personalReminders.dueDate),
        lte(personalReminders.dueDate, today),
        // No incluir los de hoy
        sql`${personalReminders.dueDate} < ${today}`,
      );
      break;
    case "done":
      whereClause = and(
        ...baseConditions,
        eq(personalReminders.status, "done"),
      );
      break;
  }

  const rows = await conn
    .select()
    .from(personalReminders)
    .where(whereClause)
    .orderBy(
      // Sin fecha al final, con fecha mas cercana primero
      sql`${personalReminders.dueDate} IS NULL`,
      asc(personalReminders.dueDate),
      desc(personalReminders.priority),
      desc(personalReminders.createdAt),
    )
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    tags: parseTags(r.tags),
  }));
}

// ----------------------------------------------------------------------------
// GET single
// ----------------------------------------------------------------------------

export async function getReminder(
  userId: number,
  id: number,
): Promise<any | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalReminders)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
        isNull(personalReminders.deletedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  return { ...rows[0], tags: parseTags(rows[0].tags) };
}

// ----------------------------------------------------------------------------
// CREATE
// ----------------------------------------------------------------------------

export async function createReminder(
  userId: number,
  data: CreateReminderInput,
): Promise<any> {
  const conn = await getDbOrThrow();

  const insertData: any = {
    userId,
    title: data.title.trim(),
    description: data.description || null,
    dueDate: data.dueDate || null,
    dueTime: data.dueTime || null,
    isRecurring: data.isRecurring ?? false,
    recurrencePattern: data.recurrencePattern || null,
    recurrenceUntil: data.recurrenceUntil || null,
    sourceModule: data.sourceModule || "manual",
    sourceId: data.sourceId || null,
    priority: data.priority || "normal",
    icon: data.icon || null,
    color: data.color || null,
    tags: stringifyTags(data.tags),
    notes: data.notes || null,
    status: "pending",
  };

  const result = await conn.insert(personalReminders).values(insertData);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getReminder(userId, insertId);
}

// ----------------------------------------------------------------------------
// UPDATE
// ----------------------------------------------------------------------------

export async function updateReminder(
  userId: number,
  id: number,
  data: UpdateReminderInput,
): Promise<any | null> {
  const conn = await getDbOrThrow();
  const existing = await getReminder(userId, id);
  if (!existing) return null;

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
  if (data.snoozedUntil !== undefined) updateData.snoozedUntil = data.snoozedUntil;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
  if (data.recurrencePattern !== undefined) updateData.recurrencePattern = data.recurrencePattern;
  if (data.recurrenceUntil !== undefined) updateData.recurrenceUntil = data.recurrenceUntil;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.tags !== undefined) updateData.tags = stringifyTags(data.tags);
  if (data.notes !== undefined) updateData.notes = data.notes;

  await conn
    .update(personalReminders)
    .set(updateData)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
      ),
    );

  return getReminder(userId, id);
}

// ----------------------------------------------------------------------------
// MARK DONE - con manejo de recurrencia
// ----------------------------------------------------------------------------

export async function markReminderDone(
  userId: number,
  id: number,
): Promise<{ done: any; nextCreated?: any | null }> {
  const conn = await getDbOrThrow();
  const reminder = await getReminder(userId, id);
  if (!reminder) {
    throw new Error("Recordatorio no encontrado");
  }

  // Marcar el actual como done
  await conn
    .update(personalReminders)
    .set({
      status: "done",
      completedAt: nowMexico(),
    } as any)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
      ),
    );

  const updatedDone = await getReminder(userId, id);

  // Si es recurrente y la fecha de fin no se paso, crear la siguiente ocurrencia
  let nextCreated = null;
  if (reminder.isRecurring && reminder.recurrencePattern && reminder.dueDate) {
    const nextDate = nextOccurrence(
      reminder.dueDate,
      reminder.recurrencePattern as ReminderRecurrence,
    );

    // Verificar que no haya pasado el recurrenceUntil
    const exceedsLimit =
      reminder.recurrenceUntil && nextDate > reminder.recurrenceUntil;

    if (!exceedsLimit) {
      nextCreated = await createReminder(userId, {
        title: reminder.title,
        description: reminder.description,
        dueDate: nextDate,
        dueTime: reminder.dueTime,
        isRecurring: true,
        recurrencePattern: reminder.recurrencePattern as ReminderRecurrence,
        recurrenceUntil: reminder.recurrenceUntil,
        sourceModule: reminder.sourceModule,
        sourceId: reminder.sourceId,
        priority: reminder.priority,
        icon: reminder.icon,
        color: reminder.color,
        tags: reminder.tags,
        notes: reminder.notes,
      });

      // Marcar el actual con lastTriggeredAt
      await conn
        .update(personalReminders)
        .set({ lastTriggeredAt: reminder.dueDate } as any)
        .where(
          and(
            eq(personalReminders.id, id),
            eq(personalReminders.userId, userId),
          ),
        );
    }
  }

  return { done: updatedDone, nextCreated };
}

// ----------------------------------------------------------------------------
// SNOOZE - posponer hasta una fecha
// ----------------------------------------------------------------------------

export async function snoozeReminder(
  userId: number,
  id: number,
  untilYMD: string,
): Promise<any | null> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalReminders)
    .set({ snoozedUntil: untilYMD } as any)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
      ),
    );
  return getReminder(userId, id);
}

// ----------------------------------------------------------------------------
// DISMISS - descartar sin completar
// ----------------------------------------------------------------------------

export async function dismissReminder(
  userId: number,
  id: number,
): Promise<any | null> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalReminders)
    .set({ status: "dismissed" } as any)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
      ),
    );
  return getReminder(userId, id);
}

// ----------------------------------------------------------------------------
// SOFT DELETE
// ----------------------------------------------------------------------------

export async function softDeleteReminder(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalReminders)
    .set({ deletedAt: nowMexico() } as any)
    .where(
      and(
        eq(personalReminders.id, id),
        eq(personalReminders.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------------------

export async function getDashboardStats(userId: number): Promise<{
  pendingTotal: number;
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
  urgentCount: number;
}> {
  const conn = await getDbOrThrow();
  const today = todayYMD();
  const in7Days = addDaysYMD(today, 7);

  const baseConditions = [
    eq(personalReminders.userId, userId),
    isNull(personalReminders.deletedAt),
    eq(personalReminders.status, "pending"),
  ];

  // Pending total (no snoozed o snooze paso)
  const pendingRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalReminders)
    .where(
      and(
        ...baseConditions,
        or(
          isNull(personalReminders.snoozedUntil),
          lte(personalReminders.snoozedUntil, today),
        ),
      ),
    );
  const pendingTotal = Number(pendingRows[0]?.count ?? 0);

  // Hoy
  const todayRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalReminders)
    .where(
      and(
        ...baseConditions,
        eq(personalReminders.dueDate, today),
      ),
    );
  const todayCount = Number(todayRows[0]?.count ?? 0);

  // Proximos 7 dias (sin contar hoy)
  const upcomingRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalReminders)
    .where(
      and(
        ...baseConditions,
        isNotNull(personalReminders.dueDate),
        sql`${personalReminders.dueDate} > ${today}`,
        lte(personalReminders.dueDate, in7Days),
      ),
    );
  const upcomingCount = Number(upcomingRows[0]?.count ?? 0);

  // Atrasados
  const overdueRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalReminders)
    .where(
      and(
        ...baseConditions,
        isNotNull(personalReminders.dueDate),
        sql`${personalReminders.dueDate} < ${today}`,
      ),
    );
  const overdueCount = Number(overdueRows[0]?.count ?? 0);

  // Urgentes
  const urgentRows = await conn
    .select({ count: sql<number>`COUNT(*)` })
    .from(personalReminders)
    .where(
      and(
        ...baseConditions,
        eq(personalReminders.priority, "urgent"),
      ),
    );
  const urgentCount = Number(urgentRows[0]?.count ?? 0);

  return {
    pendingTotal,
    todayCount,
    upcomingCount,
    overdueCount,
    urgentCount,
  };
}
