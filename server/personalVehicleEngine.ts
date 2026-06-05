// ============================================================================
// MOTOR DE PARSEO - Capturas de gasolina en lenguaje natural
// ----------------------------------------------------------------------------
// analyzeFuelLine entiende variantes como:
//   "pemex 200 23.49 km 125400 tanque 40"
//   "pemex 200 a 23.49"
//   "carga 800 24.50 km 126500"
//   "pemex gasolina 500 litro 23.5"
//
// Heuristica: keyword + rango numerico esperado para cada campo:
//   - Tanque: numero cercano a "tanque" + rango 0-100
//   - Odometro: numero cercano a "km"/"odometro" + rango >= 1000
//   - Precio/litro: numero cercano a "litro"/"@"/"x" + rango 5-60
//                   o numero con decimales en rango 5-60
//   - Monto pagado: numero restante en rango 50-10000
//
// Pure functions, sin BD. Reusable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export interface FuelLineDetection {
  amountPaid: number | null;
  pricePerLiter: number | null;
  odometerReading: number | null;
  tankPercentBefore: number | null;
  storeKeyword: string | null;
  storeName: string | null;
  liters: number | null; // computado: amountPaid / pricePerLiter
  confidence: number; // 0-1
}

// ----------------------------------------------------------------------------
// Tiendas (gasolineras) conocidas. Multi-palabra primero.
// ----------------------------------------------------------------------------

const STORE_KEYWORDS: Array<{ keyword: string; name: string }> = [
  { keyword: "oxxo gas", name: "Oxxo Gas" },
  { keyword: "petro 7", name: "Petro 7" },
  { keyword: "petro7", name: "Petro 7" },
  { keyword: "pemex", name: "Pemex" },
  { keyword: "shell", name: "Shell" },
  { keyword: "mobil", name: "Mobil" },
  { keyword: "g500", name: "G500" },
  { keyword: "g 500", name: "G500" },
  { keyword: "gulf", name: "Gulf" },
  { keyword: "orsan", name: "Orsan" },
  { keyword: "arco", name: "Arco" },
  { keyword: "corsa", name: "Corsa" },
  { keyword: "redco", name: "Redco" },
  { keyword: "hidrosina", name: "Hidrosina" },
  { keyword: "bp ", name: "BP" }, // espacio para evitar match con "bpx" o palabras
];

// Palabras que NO son nombre de sucursal: marcas, unidades, verbos comunes,
// tipos de gasolina y conectores. Lo que sobre se toma como apodo del lugar.
// (sin acentos por convencion del proyecto)
const STORE_STOPWORDS = new Set<string>([
  // conectores
  "de", "del", "la", "el", "las", "los", "al", "en", "con", "por", "para",
  "un", "una", "mi", "su",
  // verbos/acciones tipicas al capturar
  "gaste", "gasto", "puse", "pague", "pago", "cargue", "carga", "cargar",
  "lleno", "llene", "meti", "eche", "voy", "fui", "marca", "marco", "esta",
  // unidades / palabras de medida
  "pesos", "peso", "litro", "litros", "lt", "lts", "tanque", "tank",
  "km", "kms", "kilometros", "kilometro", "odometro", "odom", "mil",
  // combustible / tipos
  "gasolina", "gas", "diesel", "magna", "premium", "verde", "roja", "regular",
]);

// Toma el texto y, ya detectada la marca, junta hasta 3 palabras "raras"
// (no marca, no stopword, no numero) como apodo del lugar. Asi "pemex 3 marias"
// guarda "Pemex marias" y el cerebro puede separar sucursales.
function extractStoreNickname(lower: string, brandKeyword: string): string {
  const brandWords = new Set(brandKeyword.split(/\s+/).filter(Boolean));
  const picked: string[] = [];
  for (const rawTok of lower.split(/\s+/)) {
    // dejar solo letras (asi "3marias" -> "marias", "marias," -> "marias")
    const letters = rawTok.replace(/[^a-z]/g, "");
    if (letters.length < 3) continue;
    if (brandWords.has(letters)) continue;
    if (STORE_STOPWORDS.has(letters)) continue;
    if (picked.includes(letters)) continue;
    picked.push(letters);
    if (picked.length >= 3) break;
  }
  return picked.join(" ");
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Extrae todos los numeros (enteros o decimales) con metadata
interface NumberMatch {
  value: number;
  hasDecimal: boolean;
  raw: string;
  index: number;
}

function extractNumbers(text: string): NumberMatch[] {
  const re = /(\d+(?:[.,]\d+)?)/g;
  const out: NumberMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(",", ".");
    const value = parseFloat(raw);
    if (!Number.isFinite(value)) continue;
    out.push({
      value,
      hasDecimal: raw.includes("."),
      raw: m[1],
      index: m.index,
    });
  }
  return out;
}

// Encuentra el numero mas cercano (en posicion) a alguna keyword.
// Filtra por predicate opcional.
function findNumberNearKeyword(
  text: string,
  keywords: string[],
  predicate?: (n: number) => boolean,
): number | null {
  for (const kw of keywords) {
    const escaped = escapeRegex(kw);

    // Patron 1: keyword seguida de numero ("km 125400", "tanque 40")
    const reForward = new RegExp(
      `${escaped}\\s*(?::|=|de\\s+)?\\s*(\\d+(?:[.,]\\d+)?)`,
      "i",
    );
    const m1 = text.match(reForward);
    if (m1) {
      const n = parseFloat(m1[1].replace(",", "."));
      if (Number.isFinite(n) && (!predicate || predicate(n))) return n;
    }

    // Patron 2: numero seguido de keyword ("125400 km", "40 tanque")
    const reBackward = new RegExp(
      `(\\d+(?:[.,]\\d+)?)\\s*${escaped}`,
      "i",
    );
    const m2 = text.match(reBackward);
    if (m2) {
      const n = parseFloat(m2[1].replace(",", "."));
      if (Number.isFinite(n) && (!predicate || predicate(n))) return n;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Funcion principal: analizar una linea de captura
// ----------------------------------------------------------------------------

export function analyzeFuelLine(text: string): FuelLineDetection {
  const lower = normalizeText(text);

  const result: FuelLineDetection = {
    amountPaid: null,
    pricePerLiter: null,
    odometerReading: null,
    tankPercentBefore: null,
    storeKeyword: null,
    storeName: null,
    liters: null,
    confidence: 0,
  };

  if (!lower) return result;

  // 1. Tienda (marca) + apodo de sucursal si se alcanza a leer
  for (const sk of STORE_KEYWORDS) {
    if (lower.includes(sk.keyword)) {
      result.storeKeyword = sk.keyword;
      const nickname = extractStoreNickname(lower, sk.keyword);
      result.storeName = nickname ? `${sk.name} ${nickname}` : sk.name;
      break;
    }
  }

  // 2. Tanque % (entero 0-100 cerca de "tanque")
  result.tankPercentBefore = findNumberNearKeyword(
    lower,
    ["tanque", "tank"],
    (n) => n >= 0 && n <= 100 && Number.isInteger(n),
  );

  // 3. Odometro (entero >= 1000 cerca de "odometro" o "km")
  result.odometerReading = findNumberNearKeyword(
    lower,
    ["odometro", "odom"],
    (n) => n >= 1000 && Number.isInteger(n),
  );
  if (result.odometerReading == null) {
    result.odometerReading = findNumberNearKeyword(
      lower,
      ["km", "kilometros", "kilometro"],
      (n) => n >= 1000 && Number.isInteger(n),
    );
  }

  // 4. Precio por litro
  // 4a. Cerca de "litro", "litros", "@", "/l", "/lt", "x"
  result.pricePerLiter = findNumberNearKeyword(
    lower,
    ["litro", "litros", "/l", "/lt", "@"],
    (n) => n >= 5 && n <= 60,
  );

  // 4b. Si no, busca un decimal en rango 5-60 que no este "usado"
  if (result.pricePerLiter == null) {
    const allNums = extractNumbers(lower);
    const used = new Set<number>();
    if (result.tankPercentBefore != null) used.add(result.tankPercentBefore);
    if (result.odometerReading != null) used.add(result.odometerReading);

    const decimal = allNums.find(
      (n) =>
        n.hasDecimal &&
        n.value >= 5 &&
        n.value <= 60 &&
        !used.has(n.value),
    );
    if (decimal) result.pricePerLiter = decimal.value;
  }

  // 5. Monto pagado: numero restante en rango 50-10000
  const allNums = extractNumbers(lower);
  const usedValues = new Set<number>();
  if (result.tankPercentBefore != null) usedValues.add(result.tankPercentBefore);
  if (result.odometerReading != null) usedValues.add(result.odometerReading);
  if (result.pricePerLiter != null) usedValues.add(result.pricePerLiter);

  // Buscamos por proximidad al inicio (suele ir antes el monto que el resto)
  const amountCandidate = allNums.find(
    (n) =>
      !usedValues.has(n.value) &&
      n.value >= 50 &&
      n.value <= 10000,
  );
  if (amountCandidate) result.amountPaid = amountCandidate.value;

  // 5b. Fallback de odometro: si no se detecto por keyword ("km"/"odometro"),
  // el entero grande restante (>= 10000) que no sea monto/precio/tanque es casi
  // seguro el odometro. Asi funciona aunque escribas natural y sin "km"
  // (ej: "pemex 200 22.55 217030" o "puse 200 a 22.55 odometro marca 217030").
  if (result.odometerReading == null) {
    const usedNow = new Set<number>();
    if (result.tankPercentBefore != null) usedNow.add(result.tankPercentBefore);
    if (result.pricePerLiter != null) usedNow.add(result.pricePerLiter);
    if (result.amountPaid != null) usedNow.add(result.amountPaid);
    const bigInts = extractNumbers(lower)
      .filter(
        (n) =>
          !n.hasDecimal &&
          Number.isInteger(n.value) &&
          n.value >= 10000 &&
          !usedNow.has(n.value),
      )
      .map((n) => n.value)
      .sort((a, b) => b - a);
    if (bigInts.length > 0) result.odometerReading = bigInts[0];
  }

  // 6. Computar litros
  if (
    result.amountPaid != null &&
    result.pricePerLiter != null &&
    result.pricePerLiter > 0
  ) {
    result.liters = Math.round(
      (result.amountPaid / result.pricePerLiter) * 1000,
    ) / 1000;
  }

  // 7. Score de confianza
  let confidence = 0;
  if (result.amountPaid != null) confidence += 0.4;
  if (result.pricePerLiter != null) confidence += 0.3;
  if (result.storeName != null) confidence += 0.1;
  if (result.odometerReading != null) confidence += 0.1;
  if (result.tankPercentBefore != null) confidence += 0.1;
  result.confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return result;
}
