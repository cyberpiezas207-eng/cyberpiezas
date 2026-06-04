// ============================================================================
// CAPA DE BD - Salud Mecanica + Mantenimientos del vehiculo
// ----------------------------------------------------------------------------
// Maneja:
//   - CRUD de mantenimientos (insert, list, update, delete)
//   - Calculo del score de salud usando el engine puro
//   - Captura inicial multiple (varios mantenimientos a la vez)
//
// Patron:
//   createMaintenance     -> insert simple
//   bulkInitialMaintenance -> insert varios de una (para captura inicial)
//   getVehicleHealth      -> calcula score usando el engine
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalVehicleMaintenanceLog,
  type PersonalVehicleMaintenanceLog,
} from "./personalVehicleMaintenanceSchema";
import { personalVehicles } from "./personalVehicleSchema";
import {
  calculateVehicleHealth,
  recommendTirePressure,
  guessCarType,
  climateByMonth,
  type MaintenanceType,
  type MaintenanceLogEntry,
  type VehicleHealthScore,
  type PressureContext,
  type PressureRecommendation,
  type LoadLevel,
  type TerrainType,
} from "./personalVehicleHealthEngine";

// ----------------------------------------------------------------------------
// TYPES de input
// ----------------------------------------------------------------------------

export interface CreateMaintenanceInput {
  vehicleId: number;
  maintenanceType: MaintenanceType;
  performedAt: string; // YYYY-MM-DD
  odometerAtService?: number | null;
  cost?: number | null;
  serviceProvider?: string | null;
  notes?: string | null;
}

export interface InitialMaintenanceItem {
  maintenanceType: MaintenanceType;
  performedAt: string;
  odometerAtService?: number | null;
  notes?: string | null;
}

export interface BulkInitialInput {
  vehicleId: number;
  items: InitialMaintenanceItem[];
}

export interface PressureRecommendInput {
  vehicleId: number;
  loadLevel?: LoadLevel;
  terrain?: TerrainType;
  // climate se infiere del mes actual si no se da
}

// ----------------------------------------------------------------------------
// CREATE: nuevo mantenimiento
// ----------------------------------------------------------------------------

export async function createMaintenance(
  userId: number,
  input: CreateMaintenanceInput,
): Promise<PersonalVehicleMaintenanceLog> {
  const conn = await getDbOrThrow();

  // Verificar vehiculo del usuario
  const veh = await conn
    .select({ id: personalVehicles.id })
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.id, input.vehicleId),
        eq(personalVehicles.userId, userId),
      ),
    )
    .limit(1);
  if (veh.length === 0) throw new Error("Vehiculo no encontrado");

  const insertRes = await conn.insert(personalVehicleMaintenanceLog).values({
    userId,
    vehicleId: input.vehicleId,
    maintenanceType: input.maintenanceType,
    performedAt: input.performedAt,
    odometerAtService: input.odometerAtService ?? null,
    cost: input.cost ?? null,
    serviceProvider: input.serviceProvider?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  const id = (insertRes as any).insertId as number;

  const rows = await conn
    .select()
    .from(personalVehicleMaintenanceLog)
    .where(eq(personalVehicleMaintenanceLog.id, id))
    .limit(1);
  return rows[0];
}

// ----------------------------------------------------------------------------
// BULK initial: para el modal "Cuentale al cerebro lo que ya tienes"
// ----------------------------------------------------------------------------

export async function bulkInitialMaintenance(
  userId: number,
  input: BulkInitialInput,
): Promise<{ created: number }> {
  if (input.items.length === 0) return { created: 0 };
  const conn = await getDbOrThrow();

  // Verificar vehiculo
  const veh = await conn
    .select({ id: personalVehicles.id })
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.id, input.vehicleId),
        eq(personalVehicles.userId, userId),
      ),
    )
    .limit(1);
  if (veh.length === 0) throw new Error("Vehiculo no encontrado");

  // Insertar todos
  const values = input.items.map((item) => ({
    userId,
    vehicleId: input.vehicleId,
    maintenanceType: item.maintenanceType,
    performedAt: item.performedAt,
    odometerAtService: item.odometerAtService ?? null,
    cost: null,
    serviceProvider: null,
    notes: item.notes?.trim() || "Captura inicial",
  }));

  await conn.insert(personalVehicleMaintenanceLog).values(values);
  return { created: values.length };
}

// ----------------------------------------------------------------------------
// LIST: mantenimientos de un vehiculo
// ----------------------------------------------------------------------------

export async function listMaintenance(
  userId: number,
  vehicleId: number,
  limit = 100,
): Promise<PersonalVehicleMaintenanceLog[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalVehicleMaintenanceLog)
    .where(
      and(
        eq(personalVehicleMaintenanceLog.userId, userId),
        eq(personalVehicleMaintenanceLog.vehicleId, vehicleId),
      ),
    )
    .orderBy(desc(personalVehicleMaintenanceLog.performedAt))
    .limit(Math.min(limit, 500));
}

// ----------------------------------------------------------------------------
// DELETE: borrar mantenimiento (hard delete, son pocos registros)
// ----------------------------------------------------------------------------

export async function deleteMaintenance(
  userId: number,
  id: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .delete(personalVehicleMaintenanceLog)
    .where(
      and(
        eq(personalVehicleMaintenanceLog.id, id),
        eq(personalVehicleMaintenanceLog.userId, userId),
      ),
    );
  return { success: true };
}

// ----------------------------------------------------------------------------
// GET vehicle health: score completo usando el engine
// ----------------------------------------------------------------------------

export async function getVehicleHealth(
  userId: number,
  vehicleId: number,
): Promise<VehicleHealthScore> {
  const conn = await getDbOrThrow();

  const vehRows = await conn
    .select()
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.id, vehicleId),
        eq(personalVehicles.userId, userId),
      ),
    )
    .limit(1);
  if (vehRows.length === 0) throw new Error("Vehiculo no encontrado");
  const vehicle = vehRows[0];

  // Cargar todos los mantenimientos
  const logs = await listMaintenance(userId, vehicleId, 500);

  const engineLogs: MaintenanceLogEntry[] = logs.map((l) => ({
    id: l.id,
    vehicleId: l.vehicleId,
    maintenanceType: l.maintenanceType as MaintenanceType,
    performedAt: l.performedAt,
    odometerAtService: l.odometerAtService,
    notes: l.notes,
    createdAt: l.createdAt,
  }));

  return calculateVehicleHealth(
    {
      id: vehicle.id,
      currentOdometer: vehicle.currentOdometer,
      brand: vehicle.brand,
      model: vehicle.model,
    },
    engineLogs,
  );
}

// ----------------------------------------------------------------------------
// PRESSURE recommendation: mini-cerebro de presion
// ----------------------------------------------------------------------------

export async function getPressureRecommendation(
  userId: number,
  input: PressureRecommendInput,
): Promise<PressureRecommendation> {
  const conn = await getDbOrThrow();

  const vehRows = await conn
    .select({
      id: personalVehicles.id,
      brand: personalVehicles.brand,
      model: personalVehicles.model,
    })
    .from(personalVehicles)
    .where(
      and(
        eq(personalVehicles.id, input.vehicleId),
        eq(personalVehicles.userId, userId),
      ),
    )
    .limit(1);
  if (vehRows.length === 0) throw new Error("Vehiculo no encontrado");

  const carType = guessCarType(vehRows[0].brand, vehRows[0].model);
  const climate = climateByMonth(new Date().getMonth());

  const context: PressureContext = {
    carType,
    loadLevel: input.loadLevel ?? "normal",
    terrain: input.terrain ?? "mixed",
    climate,
  };

  return recommendTirePressure(context);
}
