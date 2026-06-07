// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalAgendaDb.ts <<<
// ============================================================================
// CAPA DE BD - Agenda (calendario de la esposa)
// ----------------------------------------------------------------------------
// CRUD de eventos/recordatorios. La agenda pertenece al dueno del buzon
// (userId), pero la esposa la maneja con su token desde la pagina publica.
//
// Funciones:
//   - listAgenda(userId, filtros)      -> eventos (rango de fechas opcional)
//   - listAgendaUpcoming(userId, dias) -> proximos N dias (para el banner)
//   - createAgendaEvent / updateAgendaEvent / deleteAgendaEvent
//   - setAgendaDone
//   - createAgendaFromIncome(...)      -> lo usa el buzon al confirmar ingreso
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalAgenda } from "./personalAgendaSchema";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayMexicoYMD(): string {
  const d = nowMexico();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Suma dias a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD.
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function pickInsertId(insertRes: any): number | undefined {
  return (
    insertRes?.[0]?.insertId ??
    insertRes?.insertId ??
    insertRes?.[0]?.[0]?.insertId
  );
}

function toNumOrNull(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Normaliza un evento: monto a number o null, done a boolean.
function normalizeEvent(e: any): any {
  if (!e) return e;
  return {
    ...e,
    amount: toNumOrNull(e.amount),
    done: !!e.done,
  };
}

type AgendaKind = "income" | "reminder" | "task";

// ----------------------------------------------------------------------------
// LECTURA
// ----------------------------------------------------------------------------

export interface ListAgendaFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export async function listAgenda(
  userId: number,
  filters: ListAgendaFilters = {},
) {
  const conn = await getDbOrThrow();
  const conds = [eq(personalAgenda.userId, userId)];
  if (filters.from) conds.push(gte(personalAgenda.eventDate, filters.from));
  if (filters.to) conds.push(lte(personalAgenda.eventDate, filters.to));
  const rows = await conn
    .select()
    .from(personalAgenda)
    .where(and(...conds))
    .orderBy(asc(personalAgenda.eventDate), asc(personalAgenda.id));
  return rows.map(normalizeEvent);
}

// Eventos de los proximos N dias (incluye hoy y manana). Para el banner.
export async function listAgendaUpcoming(userId: number, days = 2) {
  const today = todayMexicoYMD();
  const limit = addDaysYMD(today, days);
  return await listAgenda(userId, { from: today, to: limit });
}

// ----------------------------------------------------------------------------
// ESCRITURA
// ----------------------------------------------------------------------------

export interface CreateAgendaInput {
  title: string;
  eventDate: string; // YYYY-MM-DD
  note?: string | null;
  kind?: AgendaKind;
  amount?: number | null;
  createdBy?: string | null;
  source?: "inbox" | "income_submission";
  sourceSubmissionId?: number | null;
  tokenId?: number | null;
  icon?: string | null;
  color?: string | null;
}

export async function createAgendaEvent(
  userId: number,
  data: CreateAgendaInput,
) {
  const conn = await getDbOrThrow();

  const title = String(data.title ?? "").trim();
  if (!title) throw new Error("El evento necesita un nombre");
  const eventDate = String(data.eventDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new Error("Fecha invalida (usa formato YYYY-MM-DD)");
  }

  const insertRes = await conn.insert(personalAgenda).values({
    userId,
    tokenId: data.tokenId ?? null,
    title,
    eventDate,
    note: data.note ?? null,
    kind: data.kind ?? "reminder",
    amount:
      data.amount != null && Number.isFinite(data.amount)
        ? data.amount.toFixed(2)
        : null,
    createdBy: data.createdBy ?? null,
    source: data.source ?? "inbox",
    sourceSubmissionId: data.sourceSubmissionId ?? null,
    done: false,
    icon: data.icon ?? null,
    color: data.color ?? null,
  });
  const id = pickInsertId(insertRes);
  if (!id) throw new Error("No se pudo crear el evento");

  const rows = await conn
    .select()
    .from(personalAgenda)
    .where(eq(personalAgenda.id, id))
    .limit(1);
  return normalizeEvent(rows[0]);
}

export async function updateAgendaEvent(
  userId: number,
  id: number,
  data: Partial<CreateAgendaInput>,
) {
  const conn = await getDbOrThrow();

  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = String(data.title).trim();
  if (data.eventDate !== undefined) {
    const ed = String(data.eventDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ed)) throw new Error("Fecha invalida");
    updates.eventDate = ed;
  }
  if (data.note !== undefined) updates.note = data.note ?? null;
  if (data.kind !== undefined) updates.kind = data.kind;
  if (data.amount !== undefined) {
    updates.amount =
      data.amount != null && Number.isFinite(data.amount)
        ? data.amount.toFixed(2)
        : null;
  }
  if (data.icon !== undefined) updates.icon = data.icon ?? null;
  if (data.color !== undefined) updates.color = data.color ?? null;

  if (Object.keys(updates).length > 0) {
    await conn
      .update(personalAgenda)
      .set(updates)
      .where(and(eq(personalAgenda.userId, userId), eq(personalAgenda.id, id)));
  }

  const rows = await conn
    .select()
    .from(personalAgenda)
    .where(and(eq(personalAgenda.userId, userId), eq(personalAgenda.id, id)))
    .limit(1);
  return rows[0] ? normalizeEvent(rows[0]) : null;
}

export async function setAgendaDone(
  userId: number,
  id: number,
  done: boolean,
) {
  const conn = await getDbOrThrow();
  await conn
    .update(personalAgenda)
    .set({ done })
    .where(and(eq(personalAgenda.userId, userId), eq(personalAgenda.id, id)));
  return { ok: true as const };
}

export async function deleteAgendaEvent(userId: number, id: number) {
  const conn = await getDbOrThrow();
  await conn
    .delete(personalAgenda)
    .where(and(eq(personalAgenda.userId, userId), eq(personalAgenda.id, id)));
  return { ok: true as const };
}

// Lo usa el buzon al confirmar un INGRESO: crea un evento de tipo income con
// la fecha de pago. Asi el ingreso entra a la agenda (no a gastos).
export async function createAgendaFromIncome(
  userId: number,
  submissionId: number,
  data: {
    title: string;
    eventDate: string;
    amount?: number | null;
    createdBy?: string | null;
    note?: string | null;
    tokenId?: number | null;
  },
) {
  return await createAgendaEvent(userId, {
    title: data.title,
    eventDate: data.eventDate,
    amount: data.amount ?? null,
    note: data.note ?? null,
    createdBy: data.createdBy ?? null,
    kind: "income",
    source: "income_submission",
    sourceSubmissionId: submissionId,
    tokenId: data.tokenId ?? null,
    icon: "💵",
    color: "#10b981",
  });
}
