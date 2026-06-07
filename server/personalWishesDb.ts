// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalWishesDb.ts <<<
// ============================================================================
// CAPA DE BD - Deseos (wishlist con cerebro de viabilidad)
// ----------------------------------------------------------------------------
// CRUD de deseos del dueno. Todo filtrado por userId (regla de oro).
// El cerebro de viabilidad NO vive aqui (es calculo de frontend con el colchon
// de bolsillos + dinero libre); aqui solo guardamos y leemos los deseos.
//
// Funciones:
//   - listWishes, getWishById
//   - createWish, updateWish, setWishStatus, addToSaved
//   - deleteWish
//   - createWishFromSubmission (para conectar el buzon en el Paso D)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import { personalWishes } from "./personalWishesSchema";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function pickInsertId(insertRes: any): number | undefined {
  return (
    insertRes?.[0]?.insertId ??
    insertRes?.insertId ??
    insertRes?.[0]?.[0]?.insertId
  );
}

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Normaliza una fecha a YYYY-MM-DD o null (defensivo, igual que en deudas).
function toYMD(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const p = new Date(s);
    if (!isNaN(p.getTime())) {
      return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
    }
    return null;
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  return null;
}

// Normaliza un row asegurando numbers y fechas como string.
function normalizeWishRow(w: any): any {
  if (!w) return w;
  return {
    ...w,
    estimatedCost: toNum(w.estimatedCost),
    savedSoFar: toNum(w.savedSoFar),
    targetDate: toYMD(w.targetDate),
  };
}

type WishStatus = "wishing" | "achieved" | "dismissed";

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

export async function listWishes(userId: number, status?: WishStatus) {
  const conn = await getDbOrThrow();
  const where = status
    ? and(eq(personalWishes.userId, userId), eq(personalWishes.status, status))
    : eq(personalWishes.userId, userId);
  const rows = await conn
    .select()
    .from(personalWishes)
    .where(where)
    .orderBy(desc(personalWishes.createdAt));
  return rows.map(normalizeWishRow);
}

export async function getWishById(userId: number, id: number) {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalWishes)
    .where(and(eq(personalWishes.userId, userId), eq(personalWishes.id, id)))
    .limit(1);
  return rows[0] ? normalizeWishRow(rows[0]) : null;
}

export interface CreateWishInput {
  title: string;
  estimatedCost: number;
  targetDate?: string | null;
  priority?: "low" | "medium" | "high";
  savedSoFar?: number | null;
  source?: "own" | "inbox";
  sourceSubmissionId?: number | null;
  requestedBy?: string | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
}

export async function createWish(userId: number, data: CreateWishInput) {
  const conn = await getDbOrThrow();

  const title = String(data.title ?? "").trim();
  if (!title) throw new Error("El deseo necesita un nombre");

  const cost = toNum(data.estimatedCost);
  if (cost <= 0) throw new Error("El costo del deseo debe ser mayor a cero");

  const insertData: any = {
    userId,
    title,
    estimatedCost: cost.toFixed(2),
    targetDate: toYMD(data.targetDate),
    savedSoFar: (data.savedSoFar != null ? toNum(data.savedSoFar) : 0).toFixed(2),
    priority: data.priority ?? "medium",
    status: "wishing",
    source: data.source ?? "own",
    sourceSubmissionId: data.sourceSubmissionId ?? null,
    requestedBy: data.requestedBy ?? null,
    icon: data.icon ?? "🎁",
    color: data.color ?? "#c084fc",
    notes: data.notes ?? null,
  };

  const insertRes = await conn.insert(personalWishes).values(insertData);
  const id = pickInsertId(insertRes);
  if (!id) throw new Error("No se pudo crear el deseo");

  const created = await getWishById(userId, id);
  if (!created) throw new Error("Deseo creado pero no se pudo leer");
  return created;
}

export async function updateWish(
  userId: number,
  id: number,
  data: Partial<CreateWishInput>,
) {
  const conn = await getDbOrThrow();

  const existing = await getWishById(userId, id);
  if (!existing) throw new Error("Deseo no encontrado");

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = String(data.title).trim();
  if (data.estimatedCost !== undefined) {
    updateData.estimatedCost = toNum(data.estimatedCost).toFixed(2);
  }
  if (data.targetDate !== undefined) {
    updateData.targetDate = toYMD(data.targetDate);
  }
  if (data.savedSoFar !== undefined) {
    updateData.savedSoFar = toNum(data.savedSoFar).toFixed(2);
  }
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.requestedBy !== undefined) updateData.requestedBy = data.requestedBy;

  if (Object.keys(updateData).length > 0) {
    await conn
      .update(personalWishes)
      .set(updateData)
      .where(and(eq(personalWishes.userId, userId), eq(personalWishes.id, id)));
  }

  const updated = await getWishById(userId, id);
  if (!updated) throw new Error("Deseo no encontrado despues de update");
  return updated;
}

export async function setWishStatus(
  userId: number,
  id: number,
  status: WishStatus,
) {
  const conn = await getDbOrThrow();

  const setData: any = { status };
  if (status === "achieved") {
    setData.achievedAt = nowMexico();
  }

  await conn
    .update(personalWishes)
    .set(setData)
    .where(and(eq(personalWishes.userId, userId), eq(personalWishes.id, id)));

  const updated = await getWishById(userId, id);
  if (!updated) throw new Error("Deseo no encontrado");
  return updated;
}

// Suma (o resta, si amount es negativo) a lo apartado para este deseo.
export async function addToSaved(userId: number, id: number, amount: number) {
  const existing = await getWishById(userId, id);
  if (!existing) throw new Error("Deseo no encontrado");

  const conn = await getDbOrThrow();
  const nuevo = Math.max(0, toNum(existing.savedSoFar) + toNum(amount));

  await conn
    .update(personalWishes)
    .set({ savedSoFar: nuevo.toFixed(2) })
    .where(and(eq(personalWishes.userId, userId), eq(personalWishes.id, id)));

  const updated = await getWishById(userId, id);
  if (!updated) throw new Error("Deseo no encontrado despues de abonar");
  return updated;
}

export async function deleteWish(userId: number, id: number) {
  const conn = await getDbOrThrow();
  await conn
    .delete(personalWishes)
    .where(and(eq(personalWishes.userId, userId), eq(personalWishes.id, id)));
  return { ok: true as const };
}

// Crea un deseo a partir de un envio del buzon (Paso D lo usara al confirmar
// un submission tipo "deseo"). Aqui solo la funcion lista para conectar.
export async function createWishFromSubmission(
  userId: number,
  submissionId: number,
  data: {
    title: string;
    estimatedCost: number;
    targetDate?: string | null;
    requestedBy?: string | null;
    notes?: string | null;
  },
) {
  return await createWish(userId, {
    title: data.title,
    estimatedCost: data.estimatedCost,
    targetDate: data.targetDate ?? null,
    source: "inbox",
    sourceSubmissionId: submissionId,
    requestedBy: data.requestedBy ?? null,
    notes: data.notes ?? null,
    icon: "💖",
    color: "#f472b6",
  });
}
