// ============================================================================
// MOTOR DE PARSEO - Capturas de alacena en lenguaje natural
// ----------------------------------------------------------------------------
// Cerebro de captura natural para el modulo Alacena. Entiende capturas como:
//
//   "compre pollo 100 pesos 2 kg"          -> add, pollo, 2kg, $100
//   "leche walmart 35 1L"                  -> add, leche, 1L, $35, Walmart
//   "huevo docena oxxo 90"                 -> add, huevo, 1 docena, $90, OXXO
//   "tomate 50 pesos medio kilo"           -> add, tomate, 0.5kg, $50
//   "azucar 1 kilo"                        -> add, azucar, 1kg (sin precio)
//   "se acabo el arroz"                    -> mark_out, arroz
//   "queda poco frijol"                    -> mark_low, frijol
//
// Calcula unitPrice si tiene totalPrice + quantity.
// Reusa dateEngine para detectar "ayer", "lunes", etc.
//
// Pure function. Sin BD, sin queries. Reutilizable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { findFirstDate, normalizeText } from "./dateEngine";

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type PantryIntent =
  | "add_or_restock"
  | "mark_low"
  | "mark_out"
  | "ambiguous";

export interface PantryDetection {
  intent: PantryIntent;

  productName: string | null;

  // Cantidad y unidad
  quantity: number | null;
  unit: string | null; // canonical: "kg" | "g" | "l" | "ml" | "pza" | "docena" | etc

  // Precios (totalPrice es lo que el usuario pago; unitPrice se calcula)
  totalPrice: number | null;
  unitPrice: number | null;

  // Tienda
  storeKeyword: string | null;
  storeName: string | null;

  // Fecha de compra (default hoy si no se detecta)
  purchaseDate: string | null;

  rawText: string;
  confidence: number;
}

// ----------------------------------------------------------------------------
// Diccionarios
// ----------------------------------------------------------------------------

// Unidades soportadas con sus variantes (singular/plural) → canonical
const UNIT_VARIANTS: Array<{ pattern: string; canonical: string }> = [
  // Masa
  { pattern: "kilogramos", canonical: "kg" },
  { pattern: "kilogramo", canonical: "kg" },
  { pattern: "kilos", canonical: "kg" },
  { pattern: "kilo", canonical: "kg" },
  { pattern: "kgs", canonical: "kg" },
  { pattern: "kg", canonical: "kg" },
  { pattern: "gramos", canonical: "g" },
  { pattern: "gramo", canonical: "g" },
  { pattern: "grs", canonical: "g" },
  { pattern: "gr", canonical: "g" },
  { pattern: "g", canonical: "g" },

  // Volumen
  { pattern: "litros", canonical: "l" },
  { pattern: "litro", canonical: "l" },
  { pattern: "lts", canonical: "l" },
  { pattern: "lt", canonical: "l" },
  { pattern: "l", canonical: "l" },
  { pattern: "mililitros", canonical: "ml" },
  { pattern: "ml", canonical: "ml" },

  // Piezas
  { pattern: "piezas", canonical: "pza" },
  { pattern: "pieza", canonical: "pza" },
  { pattern: "pzas", canonical: "pza" },
  { pattern: "pza", canonical: "pza" },
  { pattern: "pz", canonical: "pza" },

  // Conjuntos
  { pattern: "docenas", canonical: "docena" },
  { pattern: "docena", canonical: "docena" },
  { pattern: "manojos", canonical: "manojo" },
  { pattern: "manojo", canonical: "manojo" },
  { pattern: "paquetes", canonical: "paquete" },
  { pattern: "paquete", canonical: "paquete" },
  { pattern: "cajas", canonical: "caja" },
  { pattern: "caja", canonical: "caja" },
  { pattern: "bolsas", canonical: "bolsa" },
  { pattern: "bolsa", canonical: "bolsa" },
  { pattern: "latas", canonical: "lata" },
  { pattern: "lata", canonical: "lata" },
];

// Tiendas conocidas (orden importa: patrones largos primero)
const STORE_KEYWORDS: Array<{ keyword: string; name: string }> = [
  // Cadenas grandes (patrones de varias palabras primero)
  { keyword: "bodega aurrera", name: "Bodega Aurrera" },
  { keyword: "frutas y verduras", name: "Frutas y Verduras" },
  { keyword: "central de abastos", name: "Central de Abastos" },
  { keyword: "la comer", name: "La Comer" },
  { keyword: "circle k", name: "Circle K" },
  { keyword: "city market", name: "City Market" },
  { keyword: "city club", name: "City Club" },
  { keyword: "fresko", name: "Fresko" },
  { keyword: "7 eleven", name: "7-Eleven" },
  { keyword: "7-eleven", name: "7-Eleven" },
  { keyword: "7eleven", name: "7-Eleven" },
  { keyword: "sam's club", name: "Sam's Club" },
  { keyword: "sams club", name: "Sam's Club" },
  { keyword: "sam's", name: "Sam's Club" },
  { keyword: "sams", name: "Sam's Club" },

  // Cadenas grandes (1 palabra)
  { keyword: "walmart", name: "Walmart" },
  { keyword: "soriana", name: "Soriana" },
  { keyword: "costco", name: "Costco" },
  { keyword: "chedraui", name: "Chedraui" },
  { keyword: "superama", name: "Superama" },
  { keyword: "calimax", name: "Calimax" },
  { keyword: "merco", name: "Merco" },
  { keyword: "smart", name: "Smart" },
  { keyword: "heb", name: "HEB" },
  { keyword: "ley", name: "Ley" },

  // Tiendas de conveniencia
  { keyword: "oxxo", name: "OXXO" },

  // Tiendas locales/especializadas
  { keyword: "verduleria", name: "Verduleria" },
  { keyword: "carniceria", name: "Carniceria" },
  { keyword: "pescaderia", name: "Pescaderia" },
  { keyword: "tortilleria", name: "Tortilleria" },
  { keyword: "panaderia", name: "Panaderia" },
  { keyword: "fruteria", name: "Fruteria" },
  { keyword: "mercado", name: "Mercado" },
  { keyword: "tianguis", name: "Tianguis" },
  { keyword: "tiendita", name: "Tiendita local" },
  { keyword: "tienda", name: "Tienda local" },
];

// Acciones de stock
const OUT_KEYWORDS = [
  "se acabo",
  "se acabaron",
  "se termino",
  "se terminaron",
  "ya no hay",
  "no hay",
  "agotado",
  "agotada",
  "agotados",
  "agotadas",
];

const LOW_KEYWORDS = [
  "queda poco",
  "queda poca",
  "queda nada",
  "casi se acaba",
  "casi se acaban",
  "casi no hay",
  "esta bajo",
  "esta baja",
  "se esta acabando",
  "se estan acabando",
];

// Verbos de captura (a quitar del titulo)
const ACTION_VERBS = [
  "compre",
  "compraste",
  "compraron",
  "compramos",
  "agregame",
  "agrega",
  "registra",
  "anota",
  "apunta",
  "metele",
  "metelo",
  "metiendo",
];

// Stop-words (a quitar del nombre del producto)
const STOP_WORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "en",
  "con",
  "para",
  "por",
  "a",
  "al",
  "y",
  "o",
  "u",
  "se",
  "que",
  "lo",
  "le",
  "mi",
  "mis",
  "tu",
  "tus",
  "esta",
  "este",
  "estos",
  "estas",
  "esa",
  "ese",
  "esos",
  "esas",
  "pesos",
  "peso",
  "mxn",
  "ayer",
  "hoy",
  "manana",
  // Verbos de captura
  ...ACTION_VERBS,
]);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayYMD(): string {
  const d = nowMexico();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Span {
  start: number;
  end: number;
}

function addSpan(spans: Span[], start: number, end: number): void {
  if (end > start) spans.push({ start, end });
}

// ----------------------------------------------------------------------------
// Detectores especificos
// ----------------------------------------------------------------------------

function detectIntent(
  text: string,
): { intent: PantryIntent; matchedKeyword: string | null; matchedIndex: number } {
  for (const kw of OUT_KEYWORDS) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      return { intent: "mark_out", matchedKeyword: kw, matchedIndex: idx };
    }
  }
  for (const kw of LOW_KEYWORDS) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      return { intent: "mark_low", matchedKeyword: kw, matchedIndex: idx };
    }
  }
  return { intent: "add_or_restock", matchedKeyword: null, matchedIndex: -1 };
}

function detectStore(
  text: string,
): { keyword: string; name: string; matchedIndex: number } | null {
  for (const entry of STORE_KEYWORDS) {
    // Usar word boundary aproximado: la palabra debe empezar despues de espacio o inicio
    const re = new RegExp(`(^|\\s)(${entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(\\s|$|[.,])`, "i");
    const m = text.match(re);
    if (m) {
      const idx = m.index! + (m[1] ? m[1].length : 0);
      return {
        keyword: entry.keyword,
        name: entry.name,
        matchedIndex: idx,
      };
    }
  }
  return null;
}

// Construye un regex que matchea cualquier unidad
function buildUnitRegex(): RegExp {
  // Patrones ordenados por longitud descendente (largos primero para evitar
  // que "kg" coma "kilogramos")
  const patterns = UNIT_VARIANTS.map((u) => u.pattern).sort(
    (a, b) => b.length - a.length,
  );
  return new RegExp(`(${patterns.join("|")})`, "i");
}

function unitToCanonical(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  for (const v of UNIT_VARIANTS) {
    if (v.pattern === lower) return v.canonical;
  }
  return null;
}

interface QtyDetection {
  quantity: number;
  unit: string;
  span: Span;
}

function detectQuantityAndUnit(text: string): QtyDetection | null {
  const unitsAlt = UNIT_VARIANTS.map((u) => u.pattern)
    .sort((a, b) => b.length - a.length)
    .join("|");

  // Patron 1: "N unidad" con espacio (ej: "2 kg", "1.5 litros", "500 g")
  let re = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s+(${unitsAlt})\\b`, "i");
  let m = text.match(re);
  if (m) {
    const canonical = unitToCanonical(m[2]);
    if (canonical) {
      return {
        quantity: parseFloat(m[1]),
        unit: canonical,
        span: { start: m.index!, end: m.index! + m[0].length },
      };
    }
  }

  // Patron 2: "Nunidad" pegado (ej: "1L", "500g", "2kg")
  re = /\b(\d+(?:\.\d+)?)(kg|g|l|ml)\b/i;
  m = text.match(re);
  if (m) {
    const canonical = unitToCanonical(m[2]);
    if (canonical) {
      return {
        quantity: parseFloat(m[1]),
        unit: canonical,
        span: { start: m.index!, end: m.index! + m[0].length },
      };
    }
  }

  // Patron 3: "medio kilo", "media docena", "medio litro"
  re = /\b(medio|media)\s+(kilo|litro|docena)\b/i;
  m = text.match(re);
  if (m) {
    const word = m[2].toLowerCase();
    const canonical = word === "kilo" ? "kg" : word === "litro" ? "l" : "docena";
    return {
      quantity: 0.5,
      unit: canonical,
      span: { start: m.index!, end: m.index! + m[0].length },
    };
  }

  // Patron 4: "1/2 kilo", "1/4 kilo"
  re = /\b(1\s*\/\s*2|1\s*\/\s*4|3\s*\/\s*4)\s+(kilo|litro|docena)\b/i;
  m = text.match(re);
  if (m) {
    const frac = m[1].replace(/\s+/g, "");
    const num =
      frac === "1/2" ? 0.5 : frac === "1/4" ? 0.25 : frac === "3/4" ? 0.75 : 0;
    if (num > 0) {
      const word = m[2].toLowerCase();
      const canonical = word === "kilo" ? "kg" : word === "litro" ? "l" : "docena";
      return {
        quantity: num,
        unit: canonical,
        span: { start: m.index!, end: m.index! + m[0].length },
      };
    }
  }

  // Patron 5: "una docena", "un manojo", "una caja"
  re = /\b(una?|dos|tres|cuatro|cinco|seis)\s+(docena|manojo|paquete|caja|bolsa|lata|pieza|piezas)\b/i;
  m = text.match(re);
  if (m) {
    const numWord = m[1].toLowerCase();
    const numMap: Record<string, number> = {
      un: 1,
      una: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
    };
    const num = numMap[numWord];
    const canonical = unitToCanonical(m[2]);
    if (num && canonical) {
      return {
        quantity: num,
        unit: canonical,
        span: { start: m.index!, end: m.index! + m[0].length },
      };
    }
  }

  // Patron 6: solo unidad sin cantidad (ej: "docena de huevo" → 1 docena)
  re = /\b(docena|manojo|paquete|caja|bolsa|lata)\s+de\b/i;
  m = text.match(re);
  if (m) {
    const canonical = unitToCanonical(m[1]);
    if (canonical) {
      return {
        quantity: 1,
        unit: canonical,
        span: { start: m.index!, end: m.index! + m[1].length },
      };
    }
  }

  return null;
}

interface PriceDetection {
  amount: number;
  span: Span;
}

function detectPrice(text: string, qtySpan: Span | null): PriceDetection | null {
  // Patron 1: "$N" o "$ N"
  let re = /\$\s*(\d+(?:[.,]\d+)?)/;
  let m = text.match(re);
  if (m) {
    const value = parseFloat(m[1].replace(",", "."));
    return {
      amount: value,
      span: { start: m.index!, end: m.index! + m[0].length },
    };
  }

  // Patron 2: "N pesos" o "N mxn"
  re = /\b(\d+(?:\.\d+)?)\s*(pesos?|mxn)\b/i;
  m = text.match(re);
  if (m) {
    return {
      amount: parseFloat(m[1]),
      span: { start: m.index!, end: m.index! + m[0].length },
    };
  }

  // Patron 3: numero solo, pero NO el que ya uso quantity
  // Buscamos numeros que NO esten dentro del span de qty
  const numRe = /\b(\d+(?:\.\d+)?)\b/g;
  let bestNum: PriceDetection | null = null;
  let nm: RegExpExecArray | null;
  while ((nm = numRe.exec(text)) !== null) {
    const start = nm.index;
    const end = nm.index + nm[0].length;
    // Skip si esta dentro del qtySpan
    if (qtySpan && start >= qtySpan.start && end <= qtySpan.end) continue;
    const value = parseFloat(nm[1]);
    // Heuristica: precios suelen ser > 5 (precios < 5 son inusuales para items)
    // y < 100000. Si hay varios, preferimos el mayor (suele ser el precio total)
    if (value >= 5 && value < 100000) {
      if (!bestNum || value > bestNum.amount) {
        bestNum = { amount: value, span: { start, end } };
      }
    }
  }
  return bestNum;
}

// ----------------------------------------------------------------------------
// Extraer nombre del producto: quitar todos los spans detectados + stop-words
// ----------------------------------------------------------------------------

function extractProductName(text: string, removedSpans: Span[]): string | null {
  // Ordenar y mergear spans
  removedSpans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const sp of removedSpans) {
    const last = merged[merged.length - 1];
    if (last && sp.start <= last.end) {
      last.end = Math.max(last.end, sp.end);
    } else {
      merged.push({ ...sp });
    }
  }

  // Construir lo que queda
  let cursor = 0;
  let rest = "";
  for (const sp of merged) {
    rest += text.slice(cursor, sp.start);
    cursor = sp.end;
  }
  rest += text.slice(cursor);

  // Limpiar
  const tokens = rest
    .split(/\s+/)
    .map((t) => t.trim().replace(/[.,;:]$/, ""))
    .filter((t) => t.length > 0)
    .filter((t) => !STOP_WORDS.has(t.toLowerCase()))
    .filter((t) => !/^\d+(\.\d+)?$/.test(t)); // quitar numeros sueltos

  return tokens.length > 0 ? tokens.join(" ") : null;
}

// ----------------------------------------------------------------------------
// MOTOR PRINCIPAL
// ----------------------------------------------------------------------------

export function analyzePantryLine(text: string): PantryDetection {
  const rawText = text || "";
  const lower = normalizeText(rawText);

  const result: PantryDetection = {
    intent: "ambiguous",
    productName: null,
    quantity: null,
    unit: null,
    totalPrice: null,
    unitPrice: null,
    storeKeyword: null,
    storeName: null,
    purchaseDate: null,
    rawText,
    confidence: 0,
  };

  if (!lower) return result;

  const removedSpans: Span[] = [];

  // 1. Intent (mark_out / mark_low / add_or_restock)
  const intentDet = detectIntent(lower);
  result.intent = intentDet.intent;
  if (intentDet.matchedKeyword && intentDet.matchedIndex >= 0) {
    addSpan(
      removedSpans,
      intentDet.matchedIndex,
      intentDet.matchedIndex + intentDet.matchedKeyword.length,
    );
  }

  // 2. Tienda
  const storeDet = detectStore(lower);
  if (storeDet) {
    result.storeKeyword = storeDet.keyword;
    result.storeName = storeDet.name;
    addSpan(
      removedSpans,
      storeDet.matchedIndex,
      storeDet.matchedIndex + storeDet.keyword.length,
    );
  }

  // 3. Cantidad + unidad
  const qtyDet = detectQuantityAndUnit(lower);
  if (qtyDet) {
    result.quantity = qtyDet.quantity;
    result.unit = qtyDet.unit;
    removedSpans.push(qtyDet.span);
  }

  // 4. Precio (excluyendo el numero ya usado en qty)
  // Solo buscar precio si NO es mark_low/mark_out (esos no traen precio)
  if (result.intent === "add_or_restock") {
    const priceDet = detectPrice(lower, qtyDet?.span ?? null);
    if (priceDet) {
      result.totalPrice = priceDet.amount;
      removedSpans.push(priceDet.span);
    }
  }

  // 5. unitPrice calculado (si tenemos ambos)
  if (
    result.totalPrice != null &&
    result.quantity != null &&
    result.quantity > 0
  ) {
    result.unitPrice =
      Math.round((result.totalPrice / result.quantity) * 100) / 100;
  }

  // 6. Fecha de compra (default hoy)
  const dateDet = findFirstDate(lower, { preferFuture: false });
  if (dateDet && dateDet.ymd) {
    result.purchaseDate = dateDet.ymd;
    addSpan(
      removedSpans,
      dateDet.matchedIndex,
      dateDet.matchedIndex + dateDet.matchedText.length,
    );
  } else {
    result.purchaseDate = todayYMD();
  }

  // 7. Producto (lo que queda)
  result.productName = extractProductName(lower, removedSpans);

  // 8. Confidence scoring
  let conf = 0;
  if (result.productName && result.productName.length >= 2) conf += 0.5;
  if (result.intent === "mark_low" || result.intent === "mark_out") {
    conf += 0.3; // mark actions con producto son alta confianza
  } else {
    if (result.totalPrice != null) conf += 0.2;
    if (result.quantity != null) conf += 0.2;
    if (result.storeName) conf += 0.1;
  }
  result.confidence = Math.min(1, Math.round(conf * 100) / 100);

  return result;
}
