// ============================================================================
// CEREBRO DE SALUD MECANICA - Score del vehiculo + mini-cerebro de presion
// ----------------------------------------------------------------------------
// Funciones puras que calculan:
//   1. Score 0-100 de salud mecanica (a partir de mantenimientos registrados)
//   2. Estado de cada item (llantas, aceite, afinacion, filtro aire, frenos)
//   3. Mini-cerebro de presion: recomienda PSI segun contexto del usuario
//   4. Impacto en rendimiento (cuanto km/L pierdes por cada item descuidado)
//
// Reglas clave:
//   - Sin datos: status "unknown", no penaliza pero recomienda registrar
//   - Item vencido: penaliza segun severidad (-3% a -10%)
//   - Mini-cerebro de presion: tipo carro + carga + clima + terreno
//   - Cada item tiene "lifespan" recomendado (km y/o dias)
//
// Pure functions, sin imports de BD. Reusable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type MaintenanceType =
  | "tire_pressure"
  | "oil_change"
  | "tune_up"
  | "air_filter"
  | "brakes"
  | "alignment"
  | "other";

export interface MaintenanceLogEntry {
  id: number;
  vehicleId: number;
  maintenanceType: MaintenanceType;
  performedAt: string; // YYYY-MM-DD
  odometerAtService: number | null;
  notes: string | null;
  createdAt: Date | string;
}

export interface VehicleForHealth {
  id: number;
  currentOdometer: number | null;
  brand: string | null;
  model: string | null;
}

export interface HealthCheckItem {
  type: MaintenanceType;
  label: string;
  icon: string; // Tabler icon name (sin "ti-")
  status: "good" | "warning" | "urgent" | "unknown";
  lastDate: string | null;
  lastOdometer: number | null;
  daysSinceService: number | null;
  kmSinceService: number | null;
  recommendedKmInterval: number;
  recommendedDaysInterval: number;
  efficiencyImpactPercent: number; // 0 si bien, negativo si penaliza (-3, -7, etc)
  description: string; // texto user-friendly del estado
  recommendation: string | null; // que hacer si no esta bien
}

export interface VehicleHealthScore {
  scoreOutOf100: number;
  semantic: "excellent" | "good" | "fair" | "poor";
  emoji: string;
  label: string;
  items: HealthCheckItem[];
  totalEfficiencyImpactPercent: number; // suma de impactos
  knownItemsCount: number;
  unknownItemsCount: number;
  recommendation: string; // accion mas importante a tomar
}

// ----------------------------------------------------------------------------
// CONSTANTES - intervalos recomendados y penalizaciones
// ----------------------------------------------------------------------------
// Basado en manuales generales para autos de uso normal. Conservador.
// ----------------------------------------------------------------------------

interface MaintenanceConfig {
  label: string;
  icon: string;
  intervalKm: number;
  intervalDays: number;
  // Penalizacion al rendimiento si esta vencido (en %)
  penaltyPercent: number;
  // Penalizacion adicional si lleva MUCHO sin hacerse (urgent)
  urgentPenaltyPercent: number;
  // Despues de cuanto sobre el intervalo es "urgent"
  urgentMultiplier: number; // ej 1.3 = 30% sobre intervalo
}

const MAINTENANCE_CONFIG: Record<MaintenanceType, MaintenanceConfig> = {
  tire_pressure: {
    label: "Presion de llantas",
    icon: "circle-dot",
    intervalKm: 2000,
    intervalDays: 30,
    penaltyPercent: 3,
    urgentPenaltyPercent: 5,
    urgentMultiplier: 2.0, // muy tolerante, es facil de revisar
  },
  oil_change: {
    label: "Aceite y filtro",
    icon: "oil",
    intervalKm: 7500,
    intervalDays: 180,
    penaltyPercent: 3,
    urgentPenaltyPercent: 6,
    urgentMultiplier: 1.3,
  },
  tune_up: {
    label: "Afinacion / bujias",
    icon: "engine",
    intervalKm: 30000,
    intervalDays: 365,
    penaltyPercent: 5,
    urgentPenaltyPercent: 10,
    urgentMultiplier: 1.3,
  },
  air_filter: {
    label: "Filtro de aire",
    icon: "wind",
    intervalKm: 15000,
    intervalDays: 365,
    penaltyPercent: 2,
    urgentPenaltyPercent: 5,
    urgentMultiplier: 1.5,
  },
  brakes: {
    label: "Frenos",
    icon: "disc-brake",
    intervalKm: 20000,
    intervalDays: 365,
    penaltyPercent: 2,
    urgentPenaltyPercent: 3,
    urgentMultiplier: 1.5,
  },
  alignment: {
    label: "Alineacion / balanceo",
    icon: "axis-x",
    intervalKm: 15000,
    intervalDays: 365,
    penaltyPercent: 2,
    urgentPenaltyPercent: 4,
    urgentMultiplier: 1.5,
  },
  other: {
    label: "Otro mantenimiento",
    icon: "tool",
    intervalKm: 50000,
    intervalDays: 720,
    penaltyPercent: 0,
    urgentPenaltyPercent: 0,
    urgentMultiplier: 1.5,
  },
};

const TRACKED_TYPES: MaintenanceType[] = [
  "tire_pressure",
  "oil_change",
  "tune_up",
  "air_filter",
  "brakes",
  "alignment",
];

// ----------------------------------------------------------------------------
// HELPER: Dias entre dos fechas YMD
// ----------------------------------------------------------------------------

function daysBetween(ymdFrom: string, dateTo: Date): number {
  const from = new Date(ymdFrom + "T12:00:00");
  const diff = dateTo.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function todayMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// ----------------------------------------------------------------------------
// FUNCION PRINCIPAL: Calcular score de salud
// ----------------------------------------------------------------------------

export function calculateVehicleHealth(
  vehicle: VehicleForHealth,
  maintenanceLogs: MaintenanceLogEntry[],
): VehicleHealthScore {
  const today = todayMexico();
  const items: HealthCheckItem[] = [];
  let totalImpact = 0;
  let knownCount = 0;
  let unknownCount = 0;

  // Worst urgent item para recomendacion principal
  let worstItem: HealthCheckItem | null = null;
  let worstImpact = 0;

  for (const type of TRACKED_TYPES) {
    const config = MAINTENANCE_CONFIG[type];

    // Ultimo log de este tipo para este vehiculo
    const logs = maintenanceLogs
      .filter((l) => l.vehicleId === vehicle.id && l.maintenanceType === type)
      .sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));
    const last = logs[0] ?? null;

    if (!last) {
      // Sin datos
      unknownCount++;
      items.push({
        type,
        label: config.label,
        icon: config.icon,
        status: "unknown",
        lastDate: null,
        lastOdometer: null,
        daysSinceService: null,
        kmSinceService: null,
        recommendedKmInterval: config.intervalKm,
        recommendedDaysInterval: config.intervalDays,
        efficiencyImpactPercent: 0,
        description: "Sin registrar",
        recommendation: "Registra cuando lo hagas para que el cerebro aprenda.",
      });
      continue;
    }

    knownCount++;
    const daysSince = daysBetween(last.performedAt, today);
    const kmSince =
      last.odometerAtService != null && vehicle.currentOdometer != null
        ? Math.max(0, vehicle.currentOdometer - last.odometerAtService)
        : null;

    // Que tan vencido esta (1.0 = justo en el limite, 2.0 = doble del recomendado)
    const overdueByKm =
      kmSince != null ? kmSince / config.intervalKm : 0;
    const overdueByDays = daysSince / config.intervalDays;
    const overdueRatio = Math.max(overdueByKm, overdueByDays);

    let status: HealthCheckItem["status"];
    let impact = 0;
    let description: string;
    let recommendation: string | null = null;

    if (overdueRatio < 0.8) {
      // Bien: aun no se acerca al limite
      status = "good";
      impact = 0;
      description = describeRecent(daysSince, kmSince, config);
    } else if (overdueRatio < 1.0) {
      // Bien pero acercandose
      status = "good";
      impact = 0;
      description = describeApproaching(daysSince, kmSince, config);
    } else if (overdueRatio < config.urgentMultiplier) {
      // Pasado el intervalo - warning
      status = "warning";
      impact = -config.penaltyPercent;
      description = describeOverdue(daysSince, kmSince, config);
      recommendation = `Revisar pronto. Pierdes ~${config.penaltyPercent}% de rendimiento.`;
    } else {
      // Muy pasado - urgent
      status = "urgent";
      impact = -config.urgentPenaltyPercent;
      description = describeUrgent(daysSince, kmSince, config);
      recommendation = `Atender ya. Pierdes ~${config.urgentPenaltyPercent}% de rendimiento y puedes danar el motor.`;
    }

    const item: HealthCheckItem = {
      type,
      label: config.label,
      icon: config.icon,
      status,
      lastDate: last.performedAt,
      lastOdometer: last.odometerAtService,
      daysSinceService: daysSince,
      kmSinceService: kmSince,
      recommendedKmInterval: config.intervalKm,
      recommendedDaysInterval: config.intervalDays,
      efficiencyImpactPercent: impact,
      description,
      recommendation,
    };
    items.push(item);
    totalImpact += impact;

    if (impact < worstImpact) {
      worstImpact = impact;
      worstItem = item;
    }
  }

  // Score: parte de 100, resta el impacto total, y resta 2 por cada item desconocido
  // (no penaliza tanto desconocer pero da incentivo para registrar)
  let score = 100 + totalImpact - unknownCount * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let semantic: VehicleHealthScore["semantic"];
  let emoji: string;
  let label: string;
  if (score >= 90) {
    semantic = "excellent";
    emoji = "💚";
    label = "Excelente estado";
  } else if (score >= 75) {
    semantic = "good";
    emoji = "🟢";
    label = "Buen estado";
  } else if (score >= 55) {
    semantic = "fair";
    emoji = "🟡";
    label = "Estado regular";
  } else {
    semantic = "poor";
    emoji = "🟠";
    label = "Necesita atencion";
  }

  // Recomendacion principal
  let recommendation: string;
  if (worstItem && worstItem.recommendation) {
    recommendation = `Prioridad: ${worstItem.label.toLowerCase()}. ${worstItem.recommendation}`;
  } else if (unknownCount >= 3) {
    recommendation =
      "Registra los mantenimientos que ya hayas hecho para que el cerebro arranque con datos reales.";
  } else if (score >= 90) {
    recommendation = "Tu coche esta en gran forma. Sigue asi.";
  } else {
    recommendation = "Todo dentro de margenes normales.";
  }

  return {
    scoreOutOf100: score,
    semantic,
    emoji,
    label,
    items,
    totalEfficiencyImpactPercent: totalImpact,
    knownItemsCount: knownCount,
    unknownItemsCount: unknownCount,
    recommendation,
  };
}

// ----------------------------------------------------------------------------
// HELPERS de descripcion human-readable
// ----------------------------------------------------------------------------

function describeRecent(
  days: number,
  km: number | null,
  config: MaintenanceConfig,
): string {
  if (days <= 30) return `Reciente, hace ${days} dias`;
  return `Hace ${days} dias` + (km != null ? ` / ${km} km` : "");
}

function describeApproaching(
  days: number,
  km: number | null,
  config: MaintenanceConfig,
): string {
  const remaining = config.intervalDays - days;
  if (km != null) {
    const kmRemaining = config.intervalKm - km;
    return `Hace ${days} dias / ${km} km. Faltan ~${kmRemaining} km o ${remaining} dias.`;
  }
  return `Hace ${days} dias. Faltan ~${remaining} dias.`;
}

function describeOverdue(
  days: number,
  km: number | null,
  config: MaintenanceConfig,
): string {
  if (km != null && km > config.intervalKm) {
    const excess = km - config.intervalKm;
    return `Hace ${days} dias / ${km} km. Pasado por ~${excess} km.`;
  }
  const excess = days - config.intervalDays;
  return `Hace ${days} dias. Pasado por ${excess} dias.`;
}

function describeUrgent(
  days: number,
  km: number | null,
  config: MaintenanceConfig,
): string {
  return `Hace ${days} dias${km != null ? ` / ${km} km` : ""}. Muy vencido.`;
}

// ============================================================================
// MINI-CEREBRO DE PRESION DE LLANTAS
// ============================================================================
// Recomienda PSI segun:
//   - Tipo de carro (chico / mediano / SUV / pickup)
//   - Carga que lleva (vacio / normal / lleno)
//   - Terreno (ciudad / carretera / mix / terraceria)
//   - Clima (calor / templado / frio)
// ============================================================================

export type CarType = "small" | "medium" | "suv" | "pickup";
export type LoadLevel = "light" | "normal" | "heavy";
export type TerrainType = "city" | "highway" | "mixed" | "rough";
export type ClimateType = "hot" | "temperate" | "cold";

export interface PressureContext {
  carType: CarType;
  loadLevel: LoadLevel;
  terrain: TerrainType;
  climate: ClimateType;
}

export interface PressureRecommendation {
  recommendedPsi: number;
  rearPsi: number; // si lleva carga puede ir distinta atras
  minSafePsi: number;
  maxSafePsi: number;
  explanation: string;
  factors: Array<{ label: string; impact: string; icon: string }>;
  warnings: string[];
}

// PSI base por tipo de carro
const BASE_PSI: Record<CarType, number> = {
  small: 30, // Chevy Pop, Aveo, Tsuru
  medium: 32, // Jetta, Civic, Sentra
  suv: 35, // CRV, RAV4
  pickup: 40, // Pickup, camioneta
};

export function recommendTirePressure(
  context: PressureContext,
): PressureRecommendation {
  const factors: PressureRecommendation["factors"] = [];
  const warnings: string[] = [];

  let psi = BASE_PSI[context.carType];

  // Etiqueta del tipo de carro
  const carLabel: Record<CarType, string> = {
    small: "Sedan chico",
    medium: "Sedan mediano",
    suv: "SUV o crossover",
    pickup: "Pickup o camioneta",
  };
  factors.push({
    label: carLabel[context.carType],
    impact: `base ${BASE_PSI[context.carType]} PSI`,
    icon: "car",
  });

  // Ajuste por carga
  let rearPsi = psi;
  if (context.loadLevel === "heavy") {
    psi += 1;
    rearPsi = psi + 2; // mas atras donde va el peso
    factors.push({
      label: "Carga pesada (familia + maleta)",
      impact: `+1 PSI / +2 atras`,
      icon: "luggage",
    });
  } else if (context.loadLevel === "normal") {
    factors.push({
      label: "Carga normal (1-2 personas)",
      impact: "sin cambio",
      icon: "user",
    });
  } else {
    factors.push({
      label: "Vacio (solo conductor)",
      impact: "sin cambio",
      icon: "user",
    });
  }

  // Ajuste por terreno
  if (context.terrain === "highway") {
    psi += 1;
    rearPsi += 1;
    factors.push({
      label: "Carretera larga",
      impact: "+1 PSI",
      icon: "road",
    });
  } else if (context.terrain === "rough") {
    psi -= 1;
    rearPsi -= 1;
    factors.push({
      label: "Terraceria o camino malo",
      impact: "-1 PSI (mas agarre)",
      icon: "mountain",
    });
  } else if (context.terrain === "mixed") {
    factors.push({
      label: "Mix ciudad + carretera",
      impact: "sin cambio",
      icon: "route",
    });
  } else {
    factors.push({
      label: "Solo ciudad",
      impact: "sin cambio",
      icon: "building",
    });
  }

  // Ajuste por clima
  if (context.climate === "hot") {
    psi -= 1;
    rearPsi -= 1;
    factors.push({
      label: "Clima caluroso (>30C)",
      impact: "-1 PSI (sube sola)",
      icon: "temperature",
    });
    warnings.push(
      "Revisa SIEMPRE en frio, antes de manejar. El calor sube 3-5 PSI sola.",
    );
  } else if (context.climate === "cold") {
    psi += 1;
    rearPsi += 1;
    factors.push({
      label: "Clima frio (<10C)",
      impact: "+1 PSI (se pierde)",
      icon: "snowflake",
    });
  } else {
    factors.push({
      label: "Clima templado",
      impact: "sin cambio",
      icon: "sun",
    });
  }

  // Rango seguro
  const minSafe = psi - 4;
  const maxSafe = psi + 4;

  // Explicacion
  const carDescriptions: Record<CarType, string> = {
    small: "Para tu carro chico",
    medium: "Para tu sedan mediano",
    suv: "Para tu SUV",
    pickup: "Para tu pickup",
  };
  let explanation = `${carDescriptions[context.carType]} con `;
  if (context.loadLevel === "heavy") explanation += "carga pesada, ";
  if (context.terrain === "highway") explanation += "uso en carretera, ";
  if (context.terrain === "rough") explanation += "caminos dificiles, ";
  if (context.climate === "hot") explanation += "en clima calido";
  else if (context.climate === "cold") explanation += "en frio";
  else explanation += "clima templado";
  explanation += ".";

  // Warning si es PSI fuera de rango razonable
  if (psi < 26) {
    warnings.push(
      "Presion muy baja, riesgo de revento y consumo alto. Verifica el tipo de llanta.",
    );
  }
  if (psi > 42) {
    warnings.push(
      "Presion alta, las llantas duraran menos en el centro y rebota mas.",
    );
  }

  return {
    recommendedPsi: psi,
    rearPsi: rearPsi !== psi ? rearPsi : psi,
    minSafePsi: minSafe,
    maxSafePsi: maxSafe,
    explanation,
    factors,
    warnings,
  };
}

// ----------------------------------------------------------------------------
// HELPER: Adivinar carType desde brand/model del vehiculo (best effort)
// ----------------------------------------------------------------------------

export function guessCarType(
  brand: string | null,
  model: string | null,
): CarType {
  const text = `${brand ?? ""} ${model ?? ""}`.toLowerCase();
  // Pickups
  if (/silverado|ram|f-?150|tundra|titan|tacoma|frontier|hilux|ranger|d-?max/.test(text)) {
    return "pickup";
  }
  // SUVs
  if (/crv|rav4|tucson|sportage|trax|escape|equinox|x-?trail|highlander|durango|tahoe|suburban|expedition|murano/.test(text)) {
    return "suv";
  }
  // Chicos conocidos
  if (/pop|aveo|spark|matiz|tsuru|march|gol|i-?10|picanto|atos|chevy/.test(text)) {
    return "small";
  }
  // Default medio (sedanes tipicos)
  return "medium";
}

// ----------------------------------------------------------------------------
// HELPER: Detectar clima por mes (Mexico, conservador)
// ----------------------------------------------------------------------------

export function climateByMonth(monthIndex: number): ClimateType {
  // monthIndex: 0=enero, 11=diciembre
  // Mexico centro (Cuernavaca): muy templado todo el ano
  // Mayo-Junio = mas calido (Cuernavaca llega a 32C)
  // Diciembre-Febrero = mas fresco (madrugadas 8-10C)
  if (monthIndex >= 4 && monthIndex <= 6) return "hot"; // may, jun, jul
  if (monthIndex === 11 || monthIndex <= 1) return "cold"; // dic, ene, feb
  return "temperate";
}
