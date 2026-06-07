// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalInboxDb.ts <<<
// ============================================================================
// CAPA DE BD - Buzon (formato esposa)
// ----------------------------------------------------------------------------
// Maneja el token de acceso (link secreto) y los envios pendientes.
// Reusa getDbOrThrow, createPersonalExpense y normalizeText del proyecto.
//
// SEGURIDAD:
//   - El token se genera aleatorio y largo.
//   - createSubmission solo crea un PENDIENTE; no toca gastos.
//   - confirmSubmission es el unico que crea un gasto real, y solo lo llama
//     el dueno desde su router ownerOnly.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDbOrThrow } from "./db";
import {
  personalInboxTokens,
  personalInboxSubmissions,
} from "./personalInboxSchema";
import { createPersonalExpense } from "./personalExpensesDb";
import { normalizeText } from "./personalExpensesEngine";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayMexicoYmd(): string {
  const d = nowMexico();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function genToken(): string {
  // Cadena larga, aleatoria y segura para URL.
  return randomBytes(24).toString("base64url");
}

function pickInsertId(insertRes: any): number | undefined {
  // MySQL puede devolver { insertId } o [{ insertId }] segun el driver.
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

// ----------------------------------------------------------------------------
// TOKENS (link secreto)
// ----------------------------------------------------------------------------

export async function listTokens(userId: number) {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalInboxTokens)
    .where(eq(personalInboxTokens.userId, userId))
    .orderBy(desc(personalInboxTokens.createdAt));
}

// Devuelve el token activo del usuario; si no hay, crea uno.
export async function ensureToken(userId: number, label = "Esposa") {
  const conn = await getDbOrThrow();
  const existing = await conn
    .select()
    .from(personalInboxTokens)
    .where(
      and(
        eq(personalInboxTokens.userId, userId),
        eq(personalInboxTokens.isActive, true),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];

  const token = genToken();
  const insertRes = await conn.insert(personalInboxTokens).values({
    userId,
    token,
    label,
    isActive: true,
  });
  const id = pickInsertId(insertRes);
  if (!id) throw new Error("No se pudo crear el token del buzon");
  const rows = await conn
    .select()
    .from(personalInboxTokens)
    .where(eq(personalInboxTokens.id, id))
    .limit(1);
  return rows[0];
}

// Revoca el token actual y crea uno nuevo (cambia el link secreto).
export async function regenerateToken(userId: number, label = "Esposa") {
  const conn = await getDbOrThrow();
  await conn
    .update(personalInboxTokens)
    .set({ isActive: false, revokedAt: nowMexico() })
    .where(
      and(
        eq(personalInboxTokens.userId, userId),
        eq(personalInboxTokens.isActive, true),
      ),
    );
  return await ensureToken(userId, label);
}

export async function revokeToken(userId: number, id: number) {
  const conn = await getDbOrThrow();
  await conn
    .update(personalInboxTokens)
    .set({ isActive: false, revokedAt: nowMexico() })
    .where(
      and(
        eq(personalInboxTokens.id, id),
        eq(personalInboxTokens.userId, userId),
      ),
    );
  return { ok: true };
}

// Para el endpoint publico (Paso 2b): valida el token y devuelve el dueno.
export async function getActiveTokenByString(token: string) {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalInboxTokens)
    .where(
      and(
        eq(personalInboxTokens.token, token),
        eq(personalInboxTokens.isActive, true),
      ),
    )
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

// ----------------------------------------------------------------------------
// SUBMISSIONS (envios pendientes)
// ----------------------------------------------------------------------------

export interface CreateSubmissionInput {
  senderName?: string | null;
  description: string;
  amount?: number | null;
  storeName?: string | null;
  rawText?: string | null;
}

// La llama el endpoint publico (Paso 2b). Crea un PENDIENTE para el dueno.
export async function createSubmission(
  ownerUserId: number,
  tokenId: number,
  data: CreateSubmissionInput,
) {
  const conn = await getDbOrThrow();
  const insertRes = await conn.insert(personalInboxSubmissions).values({
    userId: ownerUserId,
    tokenId,
    senderName: data.senderName ?? null,
    description: data.description,
    amount:
      data.amount != null && Number.isFinite(data.amount)
        ? data.amount.toFixed(2)
        : null,
    storeName: data.storeName ?? null,
    rawText: data.rawText ?? null,
    status: "pending",
  });
  const id = pickInsertId(insertRes);
  return { ok: true, id: id ?? null };
}

export async function listSubmissions(
  userId: number,
  status?: "pending" | "confirmed" | "rejected",
) {
  const conn = await getDbOrThrow();
  const where = status
    ? and(
        eq(personalInboxSubmissions.userId, userId),
        eq(personalInboxSubmissions.status, status),
      )
    : eq(personalInboxSubmissions.userId, userId);
  return await conn
    .select()
    .from(personalInboxSubmissions)
    .where(where)
    .orderBy(desc(personalInboxSubmissions.createdAt));
}

export async function countPending(userId: number): Promise<number> {
  const rows = await listSubmissions(userId, "pending");
  return rows.length;
}

// Confirma un pendiente: lo convierte en gasto real y lo marca confirmado.
export async function confirmSubmission(userId: number, id: number) {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalInboxSubmissions)
    .where(
      and(
        eq(personalInboxSubmissions.id, id),
        eq(personalInboxSubmissions.userId, userId),
      ),
    )
    .limit(1);
  if (rows.length === 0) throw new Error("Envio no encontrado");
  const sub = rows[0];
  if (sub.status !== "pending") {
    throw new Error("Ese envio ya fue procesado");
  }

  const amount = toNumOrNull(sub.amount) ?? 0;
  const expense = await createPersonalExpense(userId, {
    amount,
    description: sub.description,
    normalizedDescription: normalizeText(sub.description),
    categoryId: null,
    detectedCategoryId: null,
    storeId: null,
    storeName: sub.storeName ?? null,
    purchaseType: "otro",
    autoDetected: false,
    detectionConfidence: 0,
    detectionSource: "manual",
    paymentMethod: "cash",
    expenseDate: todayMexicoYmd(),
    notes: sub.senderName ? `Capturado por ${sub.senderName}` : null,
  });

  await conn
    .update(personalInboxSubmissions)
    .set({
      status: "confirmed",
      confirmedExpenseId: expense.id,
      confirmedAt: nowMexico(),
    })
    .where(eq(personalInboxSubmissions.id, id));

  return { ok: true, expenseId: expense.id };
}

export async function rejectSubmission(userId: number, id: number) {
  const conn = await getDbOrThrow();
  await conn
    .update(personalInboxSubmissions)
    .set({ status: "rejected" })
    .where(
      and(
        eq(personalInboxSubmissions.id, id),
        eq(personalInboxSubmissions.userId, userId),
      ),
    );
  return { ok: true };
}
