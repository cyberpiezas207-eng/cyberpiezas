// ============================================================================
// CAPA DE BD - Cerebro de Tanque
// ----------------------------------------------------------------------------
// Maneja:
//   - Lecturas manuales del tanque (insert + listar historial)
//   - Cache de ultima lectura en personalVehicles (lastKnown* fields)
//   - Calculo del estado actual usando el engine puro
//
// Patron:
//   setTankReading -> guarda en personalVehicleTankReadings
//                  -> actualiza lastKnown* en personalVehicles
//   getTankState   -> lee vehicle + ultimos fuel logs
//                  -> llama al engine puro
//                  -> devuelve TankStateCalculation
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { eq, and, desc, isNull } from "drizzle-orm";
import { getDbOrThrow } from "./db";
import {
  personalVehicles,
  personalVehicleFuelLogs,
  personalVehicleTankReadings,
  type PersonalVehicleTankReading,
} from "./personalVehicleSchema";
import {
  calculateCurrentTankState,
  listStoreFactors,
  tankLevelLabel,
  type FuelLogForTank,
  type TankStateCalculation,
  type StoreHonestyFactor,
} from "./personalVehicleTankEngine";

// ----------------------------------------------------------------------------
// TYPES de input
// ----------------------------------------------------------------------------

export interface SetTankReadingInput {
  vehicleId: number;
  tankPercent: number; // 0-100
  odometerAtReading?: number | null;
  source?: "quick_button" | "exact_input" | "auto_refill";
  notes?: string | null;
}

export interface TankStateResponse {
  state: TankStateCalculation;
  levelLabel: ReturnType<typeof tankLevelLabel>;
  storeFactors: StoreHonestyFactor[];
  lastReading: {
    tankPercent: number;
    at: Date;
    odometer: number | null;
  } | null;
}

// ----------------------------------------------------------------------------
// HELPER: Cargar fuel logs en formato del engine
// ----------------------------------------------------------------------------

async function loadFuelLogsForEngine(
  userId: number,
  vehicleId: number,
  limit = 30,
): Promise<FuelLogForTank[]> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(personalVehicleFuelLogs)
    .where(
      and(
        eq(personalVehicleFuelLogs.userId, userId),
        eq(personalVehicleFuelLogs.vehicleId, vehicleId),
        isNull(personalVehicleFuelLogs.deletedAt),
      ),
    )
    .orderBy(desc(personalVehicleFuelLogs.fillDate))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    fillDate: r.fillDate,
    liters: Number(r.liters),
    amountPaid: Number(r.amountPaid),
    pricePerLiter: Number(r.pricePerLiter),
    odometerReading: r.odometerReading,
    kmSinceLast: r.kmSinceLast,
    kmPerLiter: r.kmPerLiter != null ? Number(r.kmPerLiter) : null,
    tankPercentBefore: r.tankPercentBefore,
    storeName: r.storeName,
  }));
}

// ----------------------------------------------------------------------------
// SET tank reading: guardar lectura manual + actualizar cache
// ----------------------------------------------------------------------------

export async function setTankReading(
  userId: number,
  input: SetTankReadingInput,
): Promise<PersonalVehicleTankReading> {
  if (input.tankPercent < 0 || input.tankPercent > 100) {
    throw new Error("tankPercent debe estar entre 0 y 100");
  }
  const conn = await getDbOrThrow();

  // Verificar que el vehiculo es del usuario
  const vehRows = await conn
    .select({
      id: personalVehicles.id,
      currentOdometer: personalVehicles.currentOdometer,
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

  // Si no dio odometro, usar el cache del vehiculo
  const odometerToStore =
    input.odometerAtReading ?? vehRows[0].currentOdometer ?? null;

  // Insert lectura
  const insertRes = await conn.insert(personalVehicleTankReadings).values({
    userId,
    vehicleId: input.vehicleId,
    tankPercent: Math.round(input.tankPercent),
    odometerAtReading: odometerToStore,
    source: input.source ?? "quick_button",
    notes: input.notes ?? null,
  });
  const id = (insertRes as any).insertId as number;

  // Actualizar cache en personalVehicles
  await conn
    .update(personalVehicles)
    .set({
      lastKnownTankPercent: Math.round(input.tankPercent),
      lastKnownTankAt: new Date(),
      lastKnownOdometerAtTank: odometerToStore,
    })
    .where(eq(personalVehicles.id, input.vehicleId));

  const rows = await conn
    .select()
    .from(personalVehicleTankReadings)
    .where(eq(personalVehicleTankReadings.id, id))
    .limit(1);
  return rows[0];
}

// ----------------------------------------------------------------------------
// GET tank state: estado actual completo
// ----------------------------------------------------------------------------

export async function getTankState(
  userId: number,
  vehicleId: number,
): Promise<TankStateResponse> {
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

  const fuelLogs = await loadFuelLogsForEngine(userId, vehicleId);

  // Calculo del estado actual
  const state = calculateCurrentTankState(
    {
      id: vehicle.id,
      tankCapacityLiters:
        vehicle.tankCapacityLiters != null
          ? Number(vehicle.tankCapacityLiters)
          : null,
      currentOdometer: vehicle.currentOdometer,
      lastKnownTankPercent: vehicle.lastKnownTankPercent,
      lastKnownTankAt: vehicle.lastKnownTankAt,
      lastKnownOdometerAtTank: vehicle.lastKnownOdometerAtTank,
    },
    fuelLogs,
  );

  const levelLabel = tankLevelLabel(state.currentPercent);
  const storeFactors = listStoreFactors(fuelLogs);

  const lastReading =
    vehicle.lastKnownTankPercent != null && vehicle.lastKnownTankAt != null
      ? {
          tankPercent: vehicle.lastKnownTankPercent,
          at:
            typeof vehicle.lastKnownTankAt === "string"
              ? new Date(vehicle.lastKnownTankAt)
              : vehicle.lastKnownTankAt,
          odometer: vehicle.lastKnownOdometerAtTank,
        }
      : null;

  return { state, levelLabel, storeFactors, lastReading };
}

// ----------------------------------------------------------------------------
// LIST tank readings: historial
// ----------------------------------------------------------------------------

export async function listTankReadings(
  userId: number,
  vehicleId: number,
  limit = 20,
): Promise<PersonalVehicleTankReading[]> {
  const conn = await getDbOrThrow();
  return await conn
    .select()
    .from(personalVehicleTankReadings)
    .where(
      and(
        eq(personalVehicleTankReadings.userId, userId),
        eq(personalVehicleTankReadings.vehicleId, vehicleId),
      ),
    )
    .orderBy(desc(personalVehicleTankReadings.createdAt))
    .limit(Math.min(limit, 100));
}

// ----------------------------------------------------------------------------
// AUTO refill: cuando se carga gasolina, sube el tanque automaticamente
// ----------------------------------------------------------------------------
// Esta funcion NO es llamada desde el router directamente. Se llama desde
// createFuelLog cuando se quiera (sub-commit 3D opcional).
//
// Logica: si habia lectura anterior, calcula nuevo % asumiendo que los litros
// cargados son "litros declarados" (sin aplicar factor honestidad para no
// sobre-estimar al subir).
// ----------------------------------------------------------------------------

export async function applyAutoRefillReading(
  userId: number,
  vehicleId: number,
  litersAdded: number,
  odometerAtFill: number | null,
): Promise<void> {
  if (litersAdded <= 0) return;
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
  if (vehRows.length === 0) return;
  const vehicle = vehRows[0];

  const capacity =
    vehicle.tankCapacityLiters != null
      ? Number(vehicle.tankCapacityLiters)
      : 40;
  if (capacity <= 0) return;

  // Estado actual antes del refill (usando el engine)
  const fuelLogs = await loadFuelLogsForEngine(userId, vehicleId);
  const stateBefore = calculateCurrentTankState(
    {
      id: vehicle.id,
      tankCapacityLiters: capacity,
      currentOdometer: vehicle.currentOdometer,
      lastKnownTankPercent: vehicle.lastKnownTankPercent,
      lastKnownTankAt: vehicle.lastKnownTankAt,
      lastKnownOdometerAtTank: vehicle.lastKnownOdometerAtTank,
    },
    fuelLogs,
  );

  // Sumar litros y convertir a %
  const newLiters = Math.min(
    capacity,
    stateBefore.currentLiters + litersAdded,
  );
  const newPercent = Math.round((newLiters / capacity) * 100);

  // Guardar como lectura "auto_refill"
  await setTankReading(userId, {
    vehicleId,
    tankPercent: newPercent,
    odometerAtReading: odometerAtFill,
    source: "auto_refill",
    notes: `Auto subida por carga de ${Math.round(litersAdded * 100) / 100} L`,
  });
}
