// ============================================================================
// CEREBRO DE TANQUE - Calculos puros del estado actual del tanque
// ----------------------------------------------------------------------------
// Funciones puras (sin BD) que calculan:
//   1. % actual del tanque (a partir de ultima lectura + km manejados + cargas)
//   2. Rango de km restantes (pesimista vs optimista)
//   3. Factor de honestidad por gasolinera (aprende solo)
//   4. Litros reales recibidos vs litros que dijeron darme
//
// Reglas clave:
//   - El rendimiento NO es fijo: usamos el MEJOR y PEOR de las ultimas 5 cargas
//   - Las gasolineras NO siempre dan litro completo: calculamos factor por tienda
//   - Si no hay datos suficientes, usar valores neutros (factor 1.0, rendimiento default)
//
// Pure functions, sin imports de BD. Reusable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export interface FuelLogForTank {
  id: number;
  fillDate: string;
  liters: number; // litros que DIJERON darme
  amountPaid: number;
  pricePerLiter: number;
  odometerReading: number | null;
  kmSinceLast: number | null;
  kmPerLiter: number | null;
  tankPercentBefore: number | null;
  storeName: string | null;
}

export interface VehicleForTank {
  id: number;
  tankCapacityLiters: number | null;
  currentOdometer: number | null;
  lastKnownTankPercent: number | null;
  lastKnownTankAt: Date | string | null;
  lastKnownOdometerAtTank: number | null;
}

export interface TankStateCalculation {
  // Estado actual del tanque
  currentPercent: number; // 0-100, clamped
  currentLiters: number; // litros estimados ahora mismo
  capacityLiters: number; // capacidad total del tanque

  // Rango de km restantes
  kmRemainingMin: number; // pesimista (peor rendimiento histo)
  kmRemainingMax: number; // optimista (mejor rendimiento historico)
  kmRemainingAvg: number; // promedio

  // Rendimientos usados para el calculo
  pessimisticKmPerLiter: number;
  optimisticKmPerLiter: number;
  averageKmPerLiter: number;

  // Como se calculo (transparencia)
  basedOnLastReading: boolean; // hubo lectura manual?
  kmDrivenSinceReading: number; // km que se manejaron desde la lectura
  litersAddedSinceReading: number; // litros que se cargaron desde la lectura
  confidence: "high" | "medium" | "low"; // que tan confiable es el calculo
  explanation: string; // texto human-readable
}

export interface StoreHonestyFactor {
  storeName: string;
  factor: number; // multiplicador: 1.00 = honesto, 0.90 = roba 10%
  measurementsCount: number; // cuantas cargas con odometro hemos medido
  status: "unknown" | "learning" | "good" | "average" | "suspicious";
  label: string; // texto user-friendly
}

// ----------------------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------------------

// Rendimiento default cuando no hay historia (Chevy Pop ~12 km/L en ciudad)
const DEFAULT_KM_PER_LITER = 12;

// Capacidad default si el usuario no la metio (asumimos algo razonable)
const DEFAULT_TANK_CAPACITY = 40;

// Minimo de cargas con odometro y misma gasolinera para confiar en el factor
const MIN_MEASUREMENTS_FOR_FACTOR = 2;

// Maximo numero de cargas recientes a considerar para el rango
const MAX_RECENT_LOGS_FOR_RANGE = 5;

// ----------------------------------------------------------------------------
// HELPER: Calcular el rango de rendimiento (peor, mejor, promedio)
// ----------------------------------------------------------------------------
// Toma las ultimas N cargas con kmPerLiter calculado y devuelve min/max/avg.
// Si hay pocos datos, expande el rango con un margen de seguridad.
// ----------------------------------------------------------------------------

export function calculateEfficiencyRange(
  fuelLogs: FuelLogForTank[],
): {
  pessimistic: number;
  optimistic: number;
  average: number;
  sampleSize: number;
} {
  // Solo logs con kmPerLiter ya calculado (significa que tenemos odometro real)
  const valid = fuelLogs
    .filter((l) => l.kmPerLiter != null && l.kmPerLiter > 0)
    .slice(0, MAX_RECENT_LOGS_FOR_RANGE)
    .map((l) => l.kmPerLiter as number);

  // Sin datos: usar default con margen amplio
  if (valid.length === 0) {
    return {
      pessimistic: DEFAULT_KM_PER_LITER * 0.85, // 85% del default
      optimistic: DEFAULT_KM_PER_LITER * 1.15, // 115% del default
      average: DEFAULT_KM_PER_LITER,
      sampleSize: 0,
    };
  }

  const sum = valid.reduce((a, b) => a + b, 0);
  const avg = sum / valid.length;
  const min = Math.min(...valid);
  const max = Math.max(...valid);

  // Con pocos datos (1-2), expandir el rango para reflejar incertidumbre
  if (valid.length < 3) {
    return {
      pessimistic: Math.round(min * 0.9 * 100) / 100,
      optimistic: Math.round(max * 1.1 * 100) / 100,
      average: Math.round(avg * 100) / 100,
      sampleSize: valid.length,
    };
  }

  return {
    pessimistic: Math.round(min * 100) / 100,
    optimistic: Math.round(max * 100) / 100,
    average: Math.round(avg * 100) / 100,
    sampleSize: valid.length,
  };
}

// ----------------------------------------------------------------------------
// HELPER: Factor de honestidad por gasolinera
// ----------------------------------------------------------------------------
// Para una gasolinera, comparar lo que DIJO darme (liters) vs lo que REALMENTE
// se ve por los km recorridos despues. Si Pemex Civac dijo 8.5L pero el coche
// solo aguanto lo que normalmente da 7.8L -> factor = 7.8/8.5 = 0.92.
//
// IMPORTANTE: requiere al menos 2 cargas con odometro en esa gasolinera para
// no dar lecturas falsas. Antes de eso, factor = 1.0 (neutro).
// ----------------------------------------------------------------------------

export function calculateStoreHonestyFactor(
  storeName: string,
  allFuelLogs: FuelLogForTank[],
  personalAverageKmPerLiter: number,
): StoreHonestyFactor {
  // Cargas de esta gasolinera con km recorridos medibles
  const storeLogs = allFuelLogs.filter(
    (l) =>
      l.storeName === storeName &&
      l.kmSinceLast != null &&
      l.kmSinceLast > 0 &&
      l.liters > 0,
  );

  // Datos insuficientes
  if (storeLogs.length < MIN_MEASUREMENTS_FOR_FACTOR) {
    return {
      storeName,
      factor: 1.0,
      measurementsCount: storeLogs.length,
      status: storeLogs.length === 0 ? "unknown" : "learning",
      label: storeLogs.length === 0
        ? "sin datos"
        : `aprendiendo (${storeLogs.length}/${MIN_MEASUREMENTS_FOR_FACTOR})`,
    };
  }

  // Calcular factor: para cada carga, comparar litros "reales" vs litros "dichos"
  // Litros reales aproximados: km recorridos / rendimiento personal promedio
  // Factor por carga = real / dicho
  const factors = storeLogs.map((l) => {
    const realLiters = (l.kmSinceLast as number) / personalAverageKmPerLiter;
    const declaredLiters = l.liters;
    return realLiters / declaredLiters;
  });

  // Promedio de factores
  const sum = factors.reduce((a, b) => a + b, 0);
  const avgFactor = sum / factors.length;
  // Clamp en rango razonable [0.80, 1.10] para evitar valores absurdos
  const clamped = Math.max(0.8, Math.min(1.1, avgFactor));
  const rounded = Math.round(clamped * 100) / 100;

  // Status legible
  let status: StoreHonestyFactor["status"];
  let label: string;
  if (rounded >= 0.98) {
    status = "good";
    label = "litro completo";
  } else if (rounded >= 0.95) {
    status = "average";
    label = "promedio";
  } else {
    status = "suspicious";
    const pct = Math.round((1 - rounded) * 100);
    label = `te baja ~${pct}%`;
  }

  return {
    storeName,
    factor: rounded,
    measurementsCount: storeLogs.length,
    status,
    label,
  };
}

// ----------------------------------------------------------------------------
// HELPER: Litros que ENTRARON al tanque desde la ultima lectura manual
// ----------------------------------------------------------------------------
// Suma los litros de todas las cargas hechas DESPUES de lastKnownTankAt,
// aplicando el factor de honestidad de cada gasolinera.
// ----------------------------------------------------------------------------

function litersAddedSinceReading(
  vehicle: VehicleForTank,
  fuelLogs: FuelLogForTank[],
  personalAverageKmPerLiter: number,
): number {
  if (!vehicle.lastKnownTankAt) return 0;

  const readingAt =
    typeof vehicle.lastKnownTankAt === "string"
      ? new Date(vehicle.lastKnownTankAt)
      : vehicle.lastKnownTankAt;

  const recentLogs = fuelLogs.filter((l) => {
    const fillD = new Date(l.fillDate + "T12:00:00");
    return fillD.getTime() >= readingAt.getTime();
  });

  let total = 0;
  for (const log of recentLogs) {
    if (!log.storeName) {
      total += log.liters;
      continue;
    }
    const honesty = calculateStoreHonestyFactor(
      log.storeName,
      fuelLogs,
      personalAverageKmPerLiter,
    );
    total += log.liters * honesty.factor;
  }
  return Math.round(total * 100) / 100;
}

// ----------------------------------------------------------------------------
// FUNCION PRINCIPAL: Calcular estado actual del tanque
// ----------------------------------------------------------------------------
// Logica:
//   IF hay lectura manual (lastKnownTankPercent != null):
//     % actual = lastKnownTankPercent
//              - (km manejados desde lectura / rendimiento pesimista)
//                  / capacidad * 100
//              + (litros cargados desde lectura con factor) / capacidad * 100
//   ELSE:
//     Estimacion conservadora: asumir 50% (no sabemos)
// ----------------------------------------------------------------------------

export function calculateCurrentTankState(
  vehicle: VehicleForTank,
  fuelLogs: FuelLogForTank[],
): TankStateCalculation {
  const capacity = vehicle.tankCapacityLiters
    ? Number(vehicle.tankCapacityLiters)
    : DEFAULT_TANK_CAPACITY;

  const efficiency = calculateEfficiencyRange(fuelLogs);

  // Sin lectura manual ni datos: estado desconocido
  if (vehicle.lastKnownTankPercent == null) {
    return {
      currentPercent: 50, // valor neutro
      currentLiters: capacity * 0.5,
      capacityLiters: capacity,
      kmRemainingMin: Math.round(capacity * 0.5 * efficiency.pessimistic),
      kmRemainingMax: Math.round(capacity * 0.5 * efficiency.optimistic),
      kmRemainingAvg: Math.round(capacity * 0.5 * efficiency.average),
      pessimisticKmPerLiter: efficiency.pessimistic,
      optimisticKmPerLiter: efficiency.optimistic,
      averageKmPerLiter: efficiency.average,
      basedOnLastReading: false,
      kmDrivenSinceReading: 0,
      litersAddedSinceReading: 0,
      confidence: "low",
      explanation:
        "Sin lectura inicial del tanque. Toca 'modificar' para decir cuanto tienes.",
    };
  }

  // Km manejados desde la lectura
  let kmDriven = 0;
  if (
    vehicle.lastKnownOdometerAtTank != null &&
    vehicle.currentOdometer != null &&
    vehicle.currentOdometer > vehicle.lastKnownOdometerAtTank
  ) {
    kmDriven = vehicle.currentOdometer - vehicle.lastKnownOdometerAtTank;
  }

  // Litros consumidos (usando rendimiento PESIMISTA para no quedarnos sin gasolina)
  const litersConsumed = kmDriven / efficiency.pessimistic;

  // Litros cargados desde la lectura (con factor por gasolinera)
  const litersAdded = litersAddedSinceReading(
    vehicle,
    fuelLogs,
    efficiency.average,
  );

  // Tanque actual
  const startingLiters = (vehicle.lastKnownTankPercent / 100) * capacity;
  let currentLiters = startingLiters - litersConsumed + litersAdded;

  // Clamp [0, capacity]
  if (currentLiters < 0) currentLiters = 0;
  if (currentLiters > capacity) currentLiters = capacity;

  const currentPercent = Math.round((currentLiters / capacity) * 100);
  currentLiters = Math.round(currentLiters * 100) / 100;

  // Rango de km restantes
  const kmRemainingMin = Math.round(currentLiters * efficiency.pessimistic);
  const kmRemainingMax = Math.round(currentLiters * efficiency.optimistic);
  const kmRemainingAvg = Math.round(currentLiters * efficiency.average);

  // Confianza
  let confidence: "high" | "medium" | "low";
  if (efficiency.sampleSize >= 3 && kmDriven >= 0) {
    confidence = "high";
  } else if (efficiency.sampleSize >= 1) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Explicacion human-readable
  let explanation = `Calculado desde tu ultima lectura de ${vehicle.lastKnownTankPercent}%`;
  if (kmDriven > 0) {
    explanation += `, ${kmDriven} km manejados despues`;
  }
  if (litersAdded > 0) {
    explanation += `, ${Math.round(litersAdded * 10) / 10} L cargados`;
  }
  explanation += ".";

  return {
    currentPercent,
    currentLiters,
    capacityLiters: capacity,
    kmRemainingMin,
    kmRemainingMax,
    kmRemainingAvg,
    pessimisticKmPerLiter: efficiency.pessimistic,
    optimisticKmPerLiter: efficiency.optimistic,
    averageKmPerLiter: efficiency.average,
    basedOnLastReading: true,
    kmDrivenSinceReading: kmDriven,
    litersAddedSinceReading: Math.round(litersAdded * 100) / 100,
    confidence,
    explanation,
  };
}

// ----------------------------------------------------------------------------
// HELPER: Listar todas las gasolineras con sus factores
// ----------------------------------------------------------------------------
// Util para mostrar el panel "Factor aprendido por gasolinera" en la UI.
// ----------------------------------------------------------------------------

export function listStoreFactors(
  fuelLogs: FuelLogForTank[],
): StoreHonestyFactor[] {
  const efficiency = calculateEfficiencyRange(fuelLogs);
  const stores = new Set<string>();
  for (const log of fuelLogs) {
    if (log.storeName) stores.add(log.storeName);
  }
  const factors: StoreHonestyFactor[] = [];
  for (const storeName of stores) {
    factors.push(
      calculateStoreHonestyFactor(storeName, fuelLogs, efficiency.average),
    );
  }
  // Ordenar: con datos primero, despues sin datos; dentro de cada grupo, mas mediciones primero
  factors.sort((a, b) => {
    if (a.status === "unknown" && b.status !== "unknown") return 1;
    if (b.status === "unknown" && a.status !== "unknown") return -1;
    return b.measurementsCount - a.measurementsCount;
  });
  return factors;
}

// ----------------------------------------------------------------------------
// HELPER: Etiqueta amigable del nivel del tanque
// ----------------------------------------------------------------------------

export function tankLevelLabel(percent: number): {
  label: string;
  emoji: string;
  semantic: "danger" | "warning" | "success";
} {
  if (percent <= 15) {
    return { label: "Casi vacio", emoji: "🔴", semantic: "danger" };
  }
  if (percent <= 30) {
    return { label: "Bajo", emoji: "🟠", semantic: "warning" };
  }
  if (percent <= 60) {
    return { label: "Medio", emoji: "🟡", semantic: "warning" };
  }
  if (percent <= 85) {
    return { label: "Bueno", emoji: "🟢", semantic: "success" };
  }
  return { label: "Lleno", emoji: "💚", semantic: "success" };
}
