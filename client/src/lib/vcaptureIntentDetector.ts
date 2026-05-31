// ============================================================================
// CAPTURE INTENT DETECTOR (frontend, pure function)
// ----------------------------------------------------------------------------
// Clasifica una captura de texto natural en uno de los cerebros disponibles:
//   - "gasto"  -> personalExpenses
//   - "deuda"  -> personalDebts
//   - "fuel"   -> personalVehicles.fuelLogs
//
// Scoring aditivo: cada keyword/pattern suma. El kind ganador es el mas alto.
// Si todos quedan abajo del threshold, retorna "unknown" para que la UI
// muestre opciones de override manual.
//
// Pure function. Sin BD, sin queries. Solo regex + diccionarios.
// Reusable: tambien podria llamarse desde otros componentes.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type CaptureKind = "gasto" | "deuda" | "fuel" | "unknown";

export interface IntentDetection {
  kind: CaptureKind;
  confidence: number; // 0-1
  reasons: string[]; // razones legibles para debug/UI
  scores: Record<Exclude<CaptureKind, "unknown">, number>; // scores raw por kind
}

// ----------------------------------------------------------------------------
// Diccionarios de senales (signals)
// ----------------------------------------------------------------------------

// Senales DEUDA
const DEBT_HARD = [
  "deuda",
  "tengo deuda",
  "debo a",
  "debo en",
  "credito",
];

const DEBT_PLAN = [
  "msi",
  "meses sin intereses",
  "sin intereses",
];

const DEBT_CREDITORS = [
  "coppel",
  "elektra",
  "famsa",
  "liverpool",
  "suburbia",
  "sears",
  "sanborns",
  "el palacio",
  "palacio",
  "amazon",
  "mercado libre",
  "mercadolibre",
  "ml",
  "amex",
  "american express",
  "citibanamex",
  "bbva",
  "santander",
  "banorte",
  "hsbc",
  "scotiabank",
  "banco azteca",
  "banamex",
  "tarjeta",
  "prestamo",
];

// Senales FUEL
const FUEL_HARD = [
  "gasolina",
  "litros",
  "tanque lleno",
  "tanque",
  "diesel",
  "magna",
  "premium",
  "verde",
  "roja",
];

const FUEL_STATIONS = [
  "pemex",
  "shell",
  "mobil",
  "bp",
  "g500",
  "redco",
  "petro7",
  "oxxo gas",
  "gasolinera",
];

const FUEL_METER = [
  "km",
  "kilometros",
  "kilometraje",
  "odometro",
  "marcador",
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Cuenta cuantos keywords del array aparecen en el texto
function countMatches(text: string, keywords: string[]): number {
  let n = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) n += 1;
  }
  return n;
}

// ----------------------------------------------------------------------------
// Scoring functions
// ----------------------------------------------------------------------------

function scoreDeuda(text: string, reasons: string[]): number {
  let s = 0;

  // Hard keywords (la palabra "deuda" o sinonimos)
  const hardHits = countMatches(text, DEBT_HARD);
  if (hardHits > 0) {
    s += 0.5;
    reasons.push("keyword de deuda");
  }

  // Plan a meses (MSI etc)
  const planHits = countMatches(text, DEBT_PLAN);
  if (planHits > 0) {
    s += 0.3;
    reasons.push("plan a meses");
  }

  // Pattern X/Y de avance ("4/12")
  if (/\b\d+\s*\/\s*\d+\b/.test(text)) {
    s += 0.4;
    reasons.push("avance X/Y");
  }

  // Acreedor conocido
  const credHits = countMatches(text, DEBT_CREDITORS);
  if (credHits > 0) {
    s += 0.25;
    reasons.push("acreedor conocido");
  }

  return s;
}

function scoreFuel(text: string, reasons: string[]): number {
  let s = 0;

  // Hard keywords (gasolina, tanque, litros)
  const hardHits = countMatches(text, FUEL_HARD);
  if (hardHits > 0) {
    s += 0.55;
    reasons.push("keyword de combustible");
  }

  // Estaciones de gasolina conocidas
  const stationHits = countMatches(text, FUEL_STATIONS);
  if (stationHits > 0) {
    s += 0.4;
    reasons.push("estacion de servicio");
  }

  // Kilometraje
  const meterHits = countMatches(text, FUEL_METER);
  if (meterHits > 0) {
    s += 0.3;
    reasons.push("kilometraje");
  }

  // Patron "N litros" o "N L"
  if (/\b\d+(?:\.\d+)?\s*l(?:itros?)?\b/.test(text)) {
    s += 0.3;
    reasons.push("cantidad litros");
  }

  return s;
}

function scoreGasto(text: string, reasons: string[]): number {
  let s = 0;

  // Tener un numero (monto) es senal basica de gasto
  if (/\d+/.test(text)) {
    s += 0.2;
  }

  // Captura con al menos 2 palabras (tienda/producto + monto)
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length >= 2) {
    s += 0.1;
  }
  if (words.length >= 3) {
    s += 0.1;
    reasons.push("3+ palabras con monto");
  }

  // Penalizacion: si tiene fuerte senal de deuda o fuel, no es gasto
  // (esto es la base del scoring competitivo - el ganador desplaza al gasto)

  return s;
}

// ----------------------------------------------------------------------------
// Detector principal
// ----------------------------------------------------------------------------

export function detectCaptureIntent(text: string): IntentDetection {
  const lower = normalize(text);

  if (!lower || lower.length < 2) {
    return {
      kind: "unknown",
      confidence: 0,
      reasons: [],
      scores: { gasto: 0, deuda: 0, fuel: 0 },
    };
  }

  const reasonsDeuda: string[] = [];
  const reasonsFuel: string[] = [];
  const reasonsGasto: string[] = [];

  const scores = {
    deuda: scoreDeuda(lower, reasonsDeuda),
    fuel: scoreFuel(lower, reasonsFuel),
    gasto: scoreGasto(lower, reasonsGasto),
  };

  // Ordenar por score descendente
  const entries = Object.entries(scores).sort(
    ([, a], [, b]) => b - a,
  ) as Array<[Exclude<CaptureKind, "unknown">, number]>;

  const [winner, winnerScore] = entries[0];
  const [, secondScore] = entries[1];

  // Si nadie tiene score decente -> unknown
  if (winnerScore < 0.2) {
    return {
      kind: "unknown",
      confidence: 0,
      reasons: [],
      scores,
    };
  }

  // Si gana muy cerrado (diferencia < 0.15), confianza media
  // Si gana con holgura, confianza alta
  const gap = winnerScore - secondScore;
  let confidence: number;
  if (gap >= 0.3) {
    confidence = Math.min(1, winnerScore + 0.15);
  } else if (gap >= 0.15) {
    confidence = Math.min(0.85, winnerScore);
  } else {
    confidence = Math.min(0.6, winnerScore);
  }

  const reasons =
    winner === "deuda"
      ? reasonsDeuda
      : winner === "fuel"
        ? reasonsFuel
        : reasonsGasto;

  return {
    kind: winner,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    scores,
  };
}
