// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalAnimalsDb.ts <<<
// ============================================================================
// CAPA DE BD - Modulo Animales (autonomo, no toca gastos ni el pastel)
// ----------------------------------------------------------------------------
// Maneja los grupos (perro, borregos, gallinas...) y sus movimientos
// (gasto, produccion, consumo, venta). Calcula el "conviene":
//   conviene = (ventas reales + valor estimado de produccion/consumo) - gastos
//
// Todo por userId. Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, asc, desc, isNull, gte, lte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalAnimals,
  personalAnimalEvents,
  type PersonalAnimal,
  type PersonalAnimalEvent,
} from "./personalAnimalsSchema";

// Tipos de movimiento validos
export const ANIMAL_EVENT_TYPES = ["gasto", "produccion", "consumo", "venta"] as const;
export type AnimalEventType = (typeof ANIMAL_EVENT_TYPES)[number];

// Morelos = UTC-6 todo el ano
function todayMexico(): string {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function extractInsertId(insertRes: any): number | undefined {
  return (
    insertRes?.[0]?.insertId ??
    insertRes?.insertId ??
    insertRes?.[0]?.[0]?.insertId
  );
}

// ----------------------------------------------------------------------------
// GRUPOS
// ----------------------------------------------------------------------------

export async function listAnimals(userId: number): Promise<PersonalAnimal[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalAnimals)
    .where(
      and(
        eq(personalAnimals.userId, userId),
        eq(personalAnimals.isActive, true),
        isNull(personalAnimals.deletedAt),
      ),
    )
    .orderBy(asc(personalAnimals.name));
}

export async function getAnimalById(
  userId: number,
  id: number,
): Promise<PersonalAnimal | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalAnimals)
    .where(and(eq(personalAnimals.id, id), eq(personalAnimals.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateAnimalInput {
  name: string;
  species?: string | null;
  count?: number | null;
  icon?: string | null;
  color?: string | null;
  givesReturn?: boolean;
  notes?: string | null;
}

export async function createAnimal(
  userId: number,
  data: CreateAnimalInput,
): Promise<PersonalAnimal> {
  const conn = await getDbOrThrow();
  const insertRes: any = await conn.insert(personalAnimals).values({
    userId,
    name: data.name.trim(),
    species: data.species ?? null,
    count: data.count ?? 1,
    icon: data.icon ?? null,
    color: data.color ?? null,
    givesReturn: data.givesReturn ?? true,
    isActive: true,
    notes: data.notes ?? null,
  });
  const insertId = extractInsertId(insertRes);
  if (!insertId) throw new Error("No se pudo crear el grupo de animales");
  const rows = await conn
    .select()
    .from(personalAnimals)
    .where(eq(personalAnimals.id, insertId))
    .limit(1);
  return rows[0];
}

export interface UpdateAnimalInput {
  name?: string;
  species?: string | null;
  count?: number | null;
  icon?: string | null;
  color?: string | null;
  givesReturn?: boolean;
  notes?: string | null;
}

export async function updateAnimal(
  userId: number,
  id: number,
  data: UpdateAnimalInput,
): Promise<PersonalAnimal | null> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.species !== undefined) updates.species = data.species;
  if (data.count !== undefined) updates.count = data.count;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.color !== undefined) updates.color = data.color;
  if (data.givesReturn !== undefined) updates.givesReturn = data.givesReturn;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (Object.keys(updates).length === 0) return getAnimalById(userId, id);

  const conn = await getDbOrThrow();
  await conn
    .update(personalAnimals)
    .set(updates)
    .where(and(eq(personalAnimals.id, id), eq(personalAnimals.userId, userId)));
  return getAnimalById(userId, id);
}

export async function archiveAnimal(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalAnimals)
    .set({ isActive: false, deletedAt: new Date() })
    .where(and(eq(personalAnimals.id, id), eq(personalAnimals.userId, userId)));
  return { success: true };
}

// ----------------------------------------------------------------------------
// MOVIMIENTOS (eventos)
// ----------------------------------------------------------------------------

export async function listEvents(
  userId: number,
  opts: { animalId?: number; from?: string; to?: string } = {},
): Promise<PersonalAnimalEvent[]> {
  const conn = await getDbOrThrow();
  const conds = [
    eq(personalAnimalEvents.userId, userId),
    isNull(personalAnimalEvents.deletedAt),
  ];
  if (opts.animalId) conds.push(eq(personalAnimalEvents.animalId, opts.animalId));
  if (opts.from) conds.push(gte(personalAnimalEvents.eventDate, opts.from));
  if (opts.to) conds.push(lte(personalAnimalEvents.eventDate, opts.to));

  return await conn
    .select()
    .from(personalAnimalEvents)
    .where(and(...conds))
    .orderBy(desc(personalAnimalEvents.eventDate), desc(personalAnimalEvents.id));
}

export interface AddEventInput {
  animalId: number;
  type: AnimalEventType;
  quantity?: number | null;
  unitLabel?: string | null;
  amount?: number | null;
  eventDate?: string;
  notes?: string | null;
}

export async function addEvent(
  userId: number,
  data: AddEventInput,
): Promise<PersonalAnimalEvent> {
  // El grupo debe existir y ser del usuario
  const animal = await getAnimalById(userId, data.animalId);
  if (!animal) throw new Error("Grupo de animales no encontrado");
  if (!ANIMAL_EVENT_TYPES.includes(data.type)) {
    throw new Error("Tipo de movimiento no valido");
  }

  const conn = await getDbOrThrow();
  const insertRes: any = await conn.insert(personalAnimalEvents).values({
    userId,
    animalId: data.animalId,
    type: data.type,
    quantity:
      data.quantity !== undefined && data.quantity !== null
        ? data.quantity.toFixed(2)
        : null,
    unitLabel: data.unitLabel ?? null,
    amount:
      data.amount !== undefined && data.amount !== null
        ? data.amount.toFixed(2)
        : null,
    eventDate: data.eventDate ?? todayMexico(),
    notes: data.notes ?? null,
  });
  const insertId = extractInsertId(insertRes);
  if (!insertId) throw new Error("No se pudo registrar el movimiento");
  const rows = await conn
    .select()
    .from(personalAnimalEvents)
    .where(eq(personalAnimalEvents.id, insertId))
    .limit(1);
  return rows[0];
}

export async function deleteEvent(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalAnimalEvents)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(personalAnimalEvents.id, id),
        eq(personalAnimalEvents.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// RESUMEN + "CONVIENE" por grupo
// ----------------------------------------------------------------------------

export interface AnimalStats {
  animal: PersonalAnimal;
  gasto: number; // dinero gastado (comida, vet)
  venta: number; // dinero real por ventas
  valorEstimado: number; // valor estimado de produccion + consumo
  retribucion: number; // venta + valorEstimado
  balance: number; // retribucion - gasto
  conviene: boolean; // balance >= 0 (solo informativo)
  eventCount: number;
}

export interface AnimalsSummary {
  totalGasto: number;
  totalVenta: number;
  totalValorEstimado: number;
  totalRetribucion: number;
  totalBalance: number;
  animals: AnimalStats[];
}

export async function getAnimalsSummary(
  userId: number,
  opts: { from?: string; to?: string } = {},
): Promise<AnimalsSummary> {
  const animals = await listAnimals(userId);
  const events = await listEvents(userId, { from: opts.from, to: opts.to });

  // Acumular por grupo
  const byAnimal = new Map<
    number,
    { gasto: number; venta: number; valorEstimado: number; count: number }
  >();
  for (const e of events) {
    const amt = Number(e.amount ?? 0);
    const acc =
      byAnimal.get(e.animalId) ??
      { gasto: 0, venta: 0, valorEstimado: 0, count: 0 };
    acc.count += 1;
    if (e.type === "gasto") acc.gasto += amt;
    else if (e.type === "venta") acc.venta += amt;
    else if (e.type === "produccion" || e.type === "consumo")
      acc.valorEstimado += amt;
    byAnimal.set(e.animalId, acc);
  }

  let totalGasto = 0;
  let totalVenta = 0;
  let totalValorEstimado = 0;

  const stats: AnimalStats[] = animals.map((animal) => {
    const acc =
      byAnimal.get(animal.id) ??
      { gasto: 0, venta: 0, valorEstimado: 0, count: 0 };
    const retribucion = acc.venta + acc.valorEstimado;
    const balance = retribucion - acc.gasto;
    totalGasto += acc.gasto;
    totalVenta += acc.venta;
    totalValorEstimado += acc.valorEstimado;
    return {
      animal,
      gasto: Math.round(acc.gasto * 100) / 100,
      venta: Math.round(acc.venta * 100) / 100,
      valorEstimado: Math.round(acc.valorEstimado * 100) / 100,
      retribucion: Math.round(retribucion * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      conviene: balance >= 0,
      eventCount: acc.count,
    };
  });

  const totalRetribucion = totalVenta + totalValorEstimado;
  return {
    totalGasto: Math.round(totalGasto * 100) / 100,
    totalVenta: Math.round(totalVenta * 100) / 100,
    totalValorEstimado: Math.round(totalValorEstimado * 100) / 100,
    totalRetribucion: Math.round(totalRetribucion * 100) / 100,
    totalBalance: Math.round((totalRetribucion - totalGasto) * 100) / 100,
    animals: stats,
  };
}
