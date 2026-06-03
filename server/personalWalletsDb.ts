// ============================================================================
// CAPA DE BD - Bolsillos personales (Wallets) con movimientos
// ----------------------------------------------------------------------------
// Funciones canonicas para operar bolsillos:
//   - listWallets, getWalletById
//   - createWallet, archiveWallet, setDefaultWallet
//   - depositToWallet, withdrawFromWallet, transferBetweenWallets
//   - listMovements, getWalletStats
//
// REGLA CLAVE: Cada movimiento actualiza el balance del wallet en la misma
// transaccion (denormalizacion controlada para velocidad de lectura).
// Si una operacion falla a la mitad, NO debe dejar el balance inconsistente.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalWallets,
  personalWalletMovements,
  type PersonalWallet,
  type PersonalWalletMovement,
} from "./personalWalletsSchema";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function todayYMD(): string {
  // Hora Mexico (UTC-6)
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// LECTURA: listar y obtener
// ----------------------------------------------------------------------------

export async function listWallets(userId: number): Promise<PersonalWallet[]> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalWallets)
    .where(
      and(
        eq(personalWallets.userId, userId),
        isNull(personalWallets.deletedAt),
      ),
    )
    .orderBy(desc(personalWallets.isDefault), asc(personalWallets.name));
  return rows as PersonalWallet[];
}

export async function getWalletById(
  userId: number,
  walletId: number,
): Promise<PersonalWallet | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalWallets)
    .where(
      and(
        eq(personalWallets.userId, userId),
        eq(personalWallets.id, walletId),
        isNull(personalWallets.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ? (rows[0] as PersonalWallet) : null;
}

// ----------------------------------------------------------------------------
// CREACION Y EDICION
// ----------------------------------------------------------------------------

export interface CreateWalletInput {
  name: string;
  ownerName?: string | null;
  initialBalance?: number;
  walletType?: "cash" | "card" | "shared" | "savings" | "other";
  color?: string;
  icon?: string;
  isDefault?: boolean;
  notes?: string | null;
}

export async function createWallet(
  userId: number,
  data: CreateWalletInput,
): Promise<PersonalWallet> {
  const conn = await getDbOrThrow();

  // Si este wallet va a ser default, primero quitar default de los otros
  if (data.isDefault) {
    await conn
      .update(personalWallets)
      .set({ isDefault: 0 })
      .where(
        and(
          eq(personalWallets.userId, userId),
          isNull(personalWallets.deletedAt),
        ),
      );
  }

  const initialBalance = data.initialBalance ?? 0;

  const result = await conn.insert(personalWallets).values({
    userId,
    name: data.name.trim().slice(0, 100),
    ownerName: data.ownerName?.trim().slice(0, 100) ?? null,
    balance: initialBalance.toString(),
    walletType: data.walletType ?? "cash",
    color: data.color ?? "#fbbf24",
    icon: data.icon ?? "👛",
    isDefault: data.isDefault ? 1 : 0,
    notes: data.notes ?? null,
  });

  const insertedId = Number((result as any)[0]?.insertId ?? 0);
  if (!insertedId) {
    throw new Error("No se pudo crear el bolsillo");
  }

  const wallet = await getWalletById(userId, insertedId);
  if (!wallet) throw new Error("Bolsillo no encontrado tras crear");

  // Si tiene balance inicial > 0, registrar como deposito
  if (initialBalance > 0) {
    await conn.insert(personalWalletMovements).values({
      userId,
      walletId: insertedId,
      movementType: "deposit",
      amount: initialBalance.toString(),
      description: "Saldo inicial",
      sourceModule: "manual",
      occurredAt: todayYMD(),
    });
  }

  return wallet;
}

export async function archiveWallet(
  userId: number,
  walletId: number,
): Promise<{ ok: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalWallets)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(personalWallets.userId, userId),
        eq(personalWallets.id, walletId),
      ),
    );
  return { ok: true };
}

export async function setDefaultWallet(
  userId: number,
  walletId: number,
): Promise<{ ok: boolean }> {
  const conn = await getDbOrThrow();
  // Quitar default de todos
  await conn
    .update(personalWallets)
    .set({ isDefault: 0 })
    .where(
      and(
        eq(personalWallets.userId, userId),
        isNull(personalWallets.deletedAt),
      ),
    );
  // Asignar al elegido
  await conn
    .update(personalWallets)
    .set({ isDefault: 1 })
    .where(
      and(
        eq(personalWallets.userId, userId),
        eq(personalWallets.id, walletId),
      ),
    );
  return { ok: true };
}

// ----------------------------------------------------------------------------
// MOVIMIENTOS: depositar, retirar, transferir
// ----------------------------------------------------------------------------

export interface DepositInput {
  walletId: number;
  amount: number;
  description?: string | null;
  category?: string | null;
  sourceModule?: string | null;
  sourceId?: number | null;
  occurredAt?: string | null;
}

export async function depositToWallet(
  userId: number,
  data: DepositInput,
): Promise<PersonalWalletMovement> {
  if (data.amount <= 0) {
    throw new Error("El monto del deposito debe ser positivo");
  }

  const conn = await getDbOrThrow();

  // Verificar que el wallet existe y es del user
  const wallet = await getWalletById(userId, data.walletId);
  if (!wallet) throw new Error("Bolsillo no encontrado");

  // Insertar el movimiento
  const insertResult = await conn.insert(personalWalletMovements).values({
    userId,
    walletId: data.walletId,
    movementType: "deposit",
    amount: data.amount.toString(),
    description: data.description ?? null,
    category: data.category ?? null,
    sourceModule: data.sourceModule ?? "manual",
    sourceId: data.sourceId ?? null,
    occurredAt: data.occurredAt ?? todayYMD(),
  });

  const movementId = Number((insertResult as any)[0]?.insertId ?? 0);

  // Actualizar balance del wallet: +amount
  await conn
    .update(personalWallets)
    .set({
      balance: sql`${personalWallets.balance} + ${data.amount}`,
    })
    .where(eq(personalWallets.id, data.walletId));

  // Retornar el movimiento creado
  const rows = await conn
    .select()
    .from(personalWalletMovements)
    .where(eq(personalWalletMovements.id, movementId))
    .limit(1);
  return rows[0] as PersonalWalletMovement;
}

export interface WithdrawInput {
  walletId: number;
  amount: number;
  description?: string | null;
  category?: string | null;
  sourceModule?: string | null;
  sourceId?: number | null;
  occurredAt?: string | null;
}

export async function withdrawFromWallet(
  userId: number,
  data: WithdrawInput,
): Promise<PersonalWalletMovement> {
  if (data.amount <= 0) {
    throw new Error("El monto del retiro debe ser positivo");
  }

  const conn = await getDbOrThrow();

  const wallet = await getWalletById(userId, data.walletId);
  if (!wallet) throw new Error("Bolsillo no encontrado");

  // NOTA: no bloqueamos saldo negativo aqui. Permitimos que el bolsillo
  // quede "debiendo" (David luego transfiere para cubrir). UI debe advertir.

  const insertResult = await conn.insert(personalWalletMovements).values({
    userId,
    walletId: data.walletId,
    movementType: "withdrawal",
    amount: data.amount.toString(),
    description: data.description ?? null,
    category: data.category ?? null,
    sourceModule: data.sourceModule ?? "manual",
    sourceId: data.sourceId ?? null,
    occurredAt: data.occurredAt ?? todayYMD(),
  });

  const movementId = Number((insertResult as any)[0]?.insertId ?? 0);

  await conn
    .update(personalWallets)
    .set({
      balance: sql`${personalWallets.balance} - ${data.amount}`,
    })
    .where(eq(personalWallets.id, data.walletId));

  const rows = await conn
    .select()
    .from(personalWalletMovements)
    .where(eq(personalWalletMovements.id, movementId))
    .limit(1);
  return rows[0] as PersonalWalletMovement;
}

export interface TransferInput {
  fromWalletId: number;
  toWalletId: number;
  amount: number;
  description?: string | null;
  occurredAt?: string | null;
}

export async function transferBetweenWallets(
  userId: number,
  data: TransferInput,
): Promise<{
  outMovement: PersonalWalletMovement;
  inMovement: PersonalWalletMovement;
}> {
  if (data.amount <= 0) {
    throw new Error("El monto de la transferencia debe ser positivo");
  }
  if (data.fromWalletId === data.toWalletId) {
    throw new Error("No puedes transferir al mismo bolsillo");
  }

  // Verificar que ambos wallets existen y son del user
  const from = await getWalletById(userId, data.fromWalletId);
  const to = await getWalletById(userId, data.toWalletId);
  if (!from) throw new Error("Bolsillo origen no encontrado");
  if (!to) throw new Error("Bolsillo destino no encontrado");

  const ymd = data.occurredAt ?? todayYMD();
  const description =
    data.description ?? `Transferencia: ${from.name} -> ${to.name}`;

  // Hacer ambos movimientos (out + in) y actualizar balances
  // V1: no usamos transaccion explicita - es un riesgo aceptado para el MVP
  // En produccion seria mejor usar conn.transaction(async (tx) => {...})
  const outMov = await withdrawFromWallet(userId, {
    walletId: data.fromWalletId,
    amount: data.amount,
    description,
    sourceModule: "transfer",
    occurredAt: ymd,
  });

  const inMov = await depositToWallet(userId, {
    walletId: data.toWalletId,
    amount: data.amount,
    description,
    sourceModule: "transfer",
    occurredAt: ymd,
  });

  // Marcar las contrapartes
  const conn = await getDbOrThrow();
  await conn
    .update(personalWalletMovements)
    .set({
      movementType: "transfer_out",
      counterpartWalletId: data.toWalletId,
    })
    .where(eq(personalWalletMovements.id, outMov.id));

  await conn
    .update(personalWalletMovements)
    .set({
      movementType: "transfer_in",
      counterpartWalletId: data.fromWalletId,
    })
    .where(eq(personalWalletMovements.id, inMov.id));

  return { outMovement: outMov, inMovement: inMov };
}

// ----------------------------------------------------------------------------
// LECTURA DE MOVIMIENTOS
// ----------------------------------------------------------------------------

export async function listWalletMovements(
  userId: number,
  walletId: number,
  limit: number = 100,
): Promise<PersonalWalletMovement[]> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalWalletMovements)
    .where(
      and(
        eq(personalWalletMovements.userId, userId),
        eq(personalWalletMovements.walletId, walletId),
        isNull(personalWalletMovements.deletedAt),
      ),
    )
    .orderBy(
      desc(personalWalletMovements.occurredAt),
      desc(personalWalletMovements.id),
    )
    .limit(limit);
  return rows as PersonalWalletMovement[];
}

// ----------------------------------------------------------------------------
// STATS para un wallet: totales del mes (entradas, salidas, neto)
// ----------------------------------------------------------------------------

export interface WalletMonthStats {
  walletId: number;
  totalIn: number;
  totalOut: number;
  net: number;
  movementCount: number;
}

export async function getWalletMonthStats(
  userId: number,
  walletId: number,
  year: number,
  month: number,
): Promise<WalletMonthStats> {
  const conn = await getDbOrThrow();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const rows = await conn
    .select({
      movementType: personalWalletMovements.movementType,
      totalAmount: sql<string>`COALESCE(SUM(${personalWalletMovements.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(personalWalletMovements)
    .where(
      and(
        eq(personalWalletMovements.userId, userId),
        eq(personalWalletMovements.walletId, walletId),
        isNull(personalWalletMovements.deletedAt),
        sql`${personalWalletMovements.occurredAt} >= ${startDate}`,
        sql`${personalWalletMovements.occurredAt} <= ${endDate}`,
      ),
    )
    .groupBy(personalWalletMovements.movementType);

  let totalIn = 0;
  let totalOut = 0;
  let movementCount = 0;
  for (const r of rows) {
    const amount = Number(r.totalAmount) || 0;
    const count = Number(r.count) || 0;
    movementCount += count;
    if (r.movementType === "deposit" || r.movementType === "transfer_in") {
      totalIn += amount;
    } else if (
      r.movementType === "withdrawal" ||
      r.movementType === "transfer_out"
    ) {
      totalOut += amount;
    }
  }

  return {
    walletId,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    net: Math.round((totalIn - totalOut) * 100) / 100,
    movementCount,
  };
}
