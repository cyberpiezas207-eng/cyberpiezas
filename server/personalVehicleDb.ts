// ============================================================================
// CAPA DE BD - Modulo Vehiculo
// ----------------------------------------------------------------------------
// Vehiculos (CRUD) y fuel logs (CRUD + calculo automatico de derivadas).
//
// Al crear un fuel log:
//   - Litros = amountPaid / pricePerLiter
//   - kmSinceLast = odometerReading - vehicle.currentOdometer (si ambos)
//   - kmPerLiter = kmSinceLast / liters
//   - Si odometerReading > currentOdometer del vehiculo, actualiza el vehiculo.
//
// Stats: total mes, rendimiento promedio, costo/km, rango con tanque lleno.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, isNull, sql, gte, lte } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalVehicles,
  personalVehicleFuelLogs,
  type PersonalVehicle,
  type PersonalVehicleFuelLog,
} from "./personalVehicleSchema";

// Morelos = UTC-6
function todayMexicoYMD(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
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

// ----------------------------------------------------------------------------
// VEHICULOS (CRUD)
// ----------------------------------------------------------------------------

export interface CreateVehicleInput {
  name: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  tankCapacityLiters?: number | null;
  currentOdometer?: number | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  setAsDefault?: boolean;
}

export async function listVehicles(userId: number): Promise<PersonalVehicle[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.userId, userId),
        isNull(personalVehicles.deletedAt),
        eq(personalVehicles.isArchived, false),
      ),
    )
    .orderBy(desc(personalVehicles.isDefault), personalVehicles.name);
}

export async function getVehicleById(
  userId: number,
  id: number,
): Promise<PersonalVehicle | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalVehicles)
    .where(
      and(eq(personalVehicles.id, id), eq(personalVehicles.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getDefaultVehicle(
  userId: number,
): Promise<PersonalVehicle | null> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.userId, userId),
        isNull(personalVehicles.deletedAt),
        eq(personalVehicles.isArchived, false),
        eq(personalVehicles.isDefault, true),
      ),
    )
    .limit(1);
  if (rows[0]) return rows[0];

  // Fallback: el primer vehiculo del usuario
  const any = await conn
    .select()
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.userId, userId),
        isNull(personalVehicles.deletedAt),
        eq(personalVehicles.isArchived, false),
      ),
    )
    .limit(1);
  return any[0] ?? null;
}

export async function createVehicle(
  userId: number,
  data: CreateVehicleInput,
): Promise<PersonalVehicle> {
  const conn = await getDbOrThrow();

  // Si pide ser default, primero desactiva los otros default
  if (data.setAsDefault) {
    await conn
      .update(personalVehicles)
      .set({ isDefault: false })
      .where(
        and(
          eq(personalVehicles.userId, userId),
          eq(personalVehicles.isDefault, true),
        ),
      );
  }

  const insertRes = await conn.insert(personalVehicles).values({
    userId,
    name: data.name.trim(),
    brand: data.brand?.trim() || null,
    model: data.model?.trim() || null,
    year: data.year ?? null,
    plate: data.plate?.trim() || null,
    tankCapacityLiters: data.tankCapacityLiters?.toFixed(2) ?? null,
    currentOdometer: data.currentOdometer ?? 0,
    icon: data.icon?.trim() || "🚗",
    color: data.color?.trim() || "#6366f1",
    isDefault: data.setAsDefault ?? false,
    isArchived: false,
    notes: data.notes?.trim() || null,
  });
  const id = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalVehicles)
    .where(eq(personalVehicles.id, id))
    .limit(1);
  return rows[0];
}

export async function updateVehicle(
  userId: number,
  id: number,
  data: Partial<CreateVehicleInput>,
): Promise<PersonalVehicle | null> {
  const conn = await getDbOrThrow();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.brand !== undefined) updates.brand = data.brand?.trim() || null;
  if (data.model !== undefined) updates.model = data.model?.trim() || null;
  if (data.year !== undefined) updates.year = data.year;
  if (data.plate !== undefined) updates.plate = data.plate?.trim() || null;
  if (data.tankCapacityLiters !== undefined) {
    updates.tankCapacityLiters =
      data.tankCapacityLiters != null
        ? data.tankCapacityLiters.toFixed(2)
        : null;
  }
  if (data.currentOdometer !== undefined) {
    updates.currentOdometer = data.currentOdometer ?? 0;
  }
  if (data.icon !== undefined) updates.icon = data.icon?.trim() || "🚗";
  if (data.color !== undefined) {
    updates.color = data.color?.trim() || "#6366f1";
  }
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  if (Object.keys(updates).length > 0) {
    await conn
      .update(personalVehicles)
      .set(updates)
      .where(
        and(eq(personalVehicles.id, id), eq(personalVehicles.userId, userId)),
      );
  }

  return await getVehicleById(userId, id);
}

export async function archiveVehicle(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalVehicles)
    .set({ isArchived: true, isDefault: false })
    .where(
      and(eq(personalVehicles.id, id), eq(personalVehicles.userId, userId)),
    );
  return { success: true };
}

export async function setDefaultVehicle(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  // Desactiva todos los default actuales
  await conn
    .update(personalVehicles)
    .set({ isDefault: false })
    .where(
      and(
        eq(personalVehicles.userId, userId),
        eq(personalVehicles.isDefault, true),
      ),
    );
  // Activa el nuevo
  await conn
    .update(personalVehicles)
    .set({ isDefault: true })
    .where(
      and(eq(personalVehicles.id, id), eq(personalVehicles.userId, userId)),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// FUEL LOGS (CRUD)
// ----------------------------------------------------------------------------

export interface CreateFuelLogInput {
  vehicleId: number;
  fillDate?: string; // YYYY-MM-DD, default hoy
  amountPaid: number;
  pricePerLiter: number;
  odometerReading?: number | null;
  tankPercentBefore?: number | null;
  storeId?: number | null;
  storeName?: string | null;
  paymentMethod?: "cash" | "debit" | "credit" | "transfer" | "other";
  linkedExpenseId?: number | null;
  notes?: string | null;
}

export async function createFuelLog(
  userId: number,
  data: CreateFuelLogInput,
): Promise<PersonalVehicleFuelLog> {
  if (data.amountPaid <= 0 || data.pricePerLiter <= 0) {
    throw new Error("Monto y precio/litro deben ser positivos");
  }
  const conn = await getDbOrThrow();

  const vehicle = await getVehicleById(userId, data.vehicleId);
  if (!vehicle) throw new Error("Vehiculo no encontrado");

  const liters =
    Math.round((data.amountPaid / data.pricePerLiter) * 1000) / 1000;

  // kmSinceLast y kmPerLiter (si tenemos odometro nuevo > anterior)
  let kmSinceLast: number | null = null;
  let kmPerLiter: number | null = null;
  if (
    data.odometerReading != null &&
    vehicle.currentOdometer != null &&
    data.odometerReading > vehicle.currentOdometer
  ) {
    kmSinceLast = data.odometerReading - vehicle.currentOdometer;
    if (kmSinceLast > 0 && liters > 0) {
      kmPerLiter = Math.round((kmSinceLast / liters) * 100) / 100;
    }
  }

  const insertRes = await conn.insert(personalVehicleFuelLogs).values({
    userId,
    vehicleId: data.vehicleId,
    fillDate: data.fillDate || todayMexicoYMD(),
    amountPaid: data.amountPaid.toFixed(2),
    pricePerLiter: data.pricePerLiter.toFixed(3),
    liters: liters.toFixed(3),
    odometerReading: data.odometerReading ?? null,
    kmSinceLast,
    kmPerLiter: kmPerLiter != null ? kmPerLiter.toFixed(2) : null,
    tankPercentBefore: data.tankPercentBefore ?? null,
    storeId: data.storeId ?? null,
    storeName: data.storeName ?? null,
    paymentMethod: data.paymentMethod ?? "cash",
    linkedExpenseId: data.linkedExpenseId ?? null,
    notes: data.notes ?? null,
  });

  const id = (insertRes as any).insertId as number;
  const rows = await conn
    .select()
    .from(personalVehicleFuelLogs)
    .where(eq(personalVehicleFuelLogs.id, id))
    .limit(1);

  // Actualizar el odometro del vehiculo si subio
  if (
    data.odometerReading != null &&
    data.odometerReading > (vehicle.currentOdometer ?? 0)
  ) {
    await conn
      .update(personalVehicles)
      .set({ currentOdometer: data.odometerReading })
      .where(eq(personalVehicles.id, data.vehicleId));
  }

  return rows[0];
}

export interface ListFuelLogsFilters {
  vehicleId?: number;
  year?: number;
  month?: number;
  limit?: number;
}

export async function listFuelLogs(
  userId: number,
  filters: ListFuelLogsFilters = {},
): Promise<PersonalVehicleFuelLog[]> {
  const conn = await getDbOrThrow();
  const conds = [
    eq(personalVehicleFuelLogs.userId, userId),
    isNull(personalVehicleFuelLogs.deletedAt),
  ];
  if (filters.vehicleId) {
    conds.push(eq(personalVehicleFuelLogs.vehicleId, filters.vehicleId));
  }
  if (filters.year && filters.month) {
    const { first, last } = monthRangeYMD(filters.year, filters.month);
    conds.push(gte(personalVehicleFuelLogs.fillDate, first));
    conds.push(lte(personalVehicleFuelLogs.fillDate, last));
  }
  return await conn
    .select()
    .from(personalVehicleFuelLogs)
    .where(and(...conds))
    .orderBy(
      desc(personalVehicleFuelLogs.fillDate),
      desc(personalVehicleFuelLogs.id),
    )
    .limit(Math.min(filters.limit ?? 100, 500));
}

export async function softDeleteFuelLog(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .update(personalVehicleFuelLogs)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(personalVehicleFuelLogs.id, id),
        eq(personalVehicleFuelLogs.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// STATS
// ----------------------------------------------------------------------------

export interface VehicleStats {
  fillCount: number;
  totalSpent: number;
  totalLiters: number;
  totalKm: number;
  avgKmPerLiter: number | null;
  avgCostPerKm: number | null;
  avgPricePerLiter: number | null;
  lastFillDate: string | null;
  daysSinceLastFill: number | null;
  estimatedRangeKm: number | null; // km con tanque lleno (proyeccion)
  currentOdometer: number;
}

export async function getVehicleStats(
  userId: number,
  vehicleId: number,
  year?: number,
  month?: number,
): Promise<VehicleStats> {
  const conn = await getDbOrThrow();

  const conds = [
    eq(personalVehicleFuelLogs.userId, userId),
    eq(personalVehicleFuelLogs.vehicleId, vehicleId),
    isNull(personalVehicleFuelLogs.deletedAt),
  ];
  if (year && month) {
    const { first, last } = monthRangeYMD(year, month);
    conds.push(gte(personalVehicleFuelLogs.fillDate, first));
    conds.push(lte(personalVehicleFuelLogs.fillDate, last));
  }

  const aggRows = await conn
    .select({
      count: sql<number>`COUNT(*)`,
      totalSpent: sql<string>`COALESCE(SUM(${personalVehicleFuelLogs.amountPaid}), 0)`,
      totalLiters: sql<string>`COALESCE(SUM(${personalVehicleFuelLogs.liters}), 0)`,
      totalKm: sql<string>`COALESCE(SUM(${personalVehicleFuelLogs.kmSinceLast}), 0)`,
      avgPrice: sql<string>`COALESCE(AVG(${personalVehicleFuelLogs.pricePerLiter}), 0)`,
    })
    .from(personalVehicleFuelLogs)
    .where(and(...conds));

  const r = aggRows[0];
  const fillCount = Number(r?.count ?? 0);
  const totalSpent = Number(r?.totalSpent ?? 0);
  const totalLiters = Number(r?.totalLiters ?? 0);
  const totalKm = Number(r?.totalKm ?? 0);
  const avgPricePerLiter =
    Number(r?.avgPrice ?? 0) > 0 ? Number(r.avgPrice) : null;

  const avgKmPerLiter =
    totalKm > 0 && totalLiters > 0
      ? Math.round((totalKm / totalLiters) * 100) / 100
      : null;
  const avgCostPerKm =
    totalKm > 0 && totalSpent > 0
      ? Math.round((totalSpent / totalKm) * 100) / 100
      : null;

  // Ultimo fill (global, no filtrado por mes)
  const lastFillRows = await conn
    .select({
      fillDate: personalVehicleFuelLogs.fillDate,
    })
    .from(personalVehicleFuelLogs)
    .where(
      and(
        eq(personalVehicleFuelLogs.userId, userId),
        eq(personalVehicleFuelLogs.vehicleId, vehicleId),
        isNull(personalVehicleFuelLogs.deletedAt),
      ),
    )
    .orderBy(desc(personalVehicleFuelLogs.fillDate))
    .limit(1);

  const lastFillDate = lastFillRows[0]?.fillDate ?? null;
  let daysSinceLastFill: number | null = null;
  if (lastFillDate) {
    const last = new Date(lastFillDate + "T12:00:00");
    const now = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const diff = Math.floor(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    daysSinceLastFill = diff < 0 ? 0 : diff;
  }

  // Rango estimado con tanque lleno
  const vehicle = await getVehicleById(userId, vehicleId);
  const tank = vehicle?.tankCapacityLiters
    ? Number(vehicle.tankCapacityLiters)
    : null;
  const estimatedRangeKm =
    tank && avgKmPerLiter ? Math.round(tank * avgKmPerLiter) : null;

  return {
    fillCount,
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalLiters: Math.round(totalLiters * 1000) / 1000,
    totalKm,
    avgKmPerLiter,
    avgCostPerKm,
    avgPricePerLiter:
      avgPricePerLiter != null
        ? Math.round(avgPricePerLiter * 1000) / 1000
        : null,
    lastFillDate,
    daysSinceLastFill,
    estimatedRangeKm,
    currentOdometer: vehicle?.currentOdometer ?? 0,
  };
}
