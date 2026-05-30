// ============================================================================
// MOTOR DE PARSEO - Capturas de deudas en lenguaje natural
// ----------------------------------------------------------------------------
// El parser detecta el INTENT y luego extrae los datos relevantes.
//
// Intents soportados:
//   - new_debt              : "deuda coppel bici 990 4/12 vence 15"
//   - purchase_installment  : "compre play 5 6800 msi 6 mercado libre"
//   - payment               : "pague coppel bici 990"
//   - partial_payment       : "abone prestamo mama 500"
//   - asset_sale            : "vendi play 5 5000"
//   - ambiguous             : si no se pudo determinar
//
// Si pasas un intent forzado (desde botones de UI), saltamos la deteccion.
// Pure functions, sin BD. Reusable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type DebtCaptureIntent =
  | "new_debt"
  | "purchase_installment"
  | "payment"
  | "partial_payment"
  | "asset_sale"
  | "ambiguous";

export interface DebtLineDetection {
  intent: DebtCaptureIntent;

  // Acreedor / tienda
  creditorKeyword: string | null; // "coppel", "ml", etc.
  creditorName: string | null; // "Coppel", "Mercado Libre"

  // Concepto / titulo (ej: "bici", "play 5", "telefono")
  conceptName: string | null;

  // Para new_debt: si solo hay mensualidad y avance X/Y, derivamos lo demas
  // Para purchase_installment: el monto es el total (no la mensualidad)
  // Para payment/partial_payment/sale: el monto es lo pagado/vendido
  amount: number | null;

  // Solo para new_debt y purchase_installment
  installmentAmount: number | null;
  currentInstallment: number | null;
  totalInstallments: number | null;
  dueDay: number | null;

  // Calculados (solo para new_debt / purchase_installment)
  originalAmount: number | null;
  currentBalance: number | null;
  isMsi: boolean; // detectamos "msi" o "meses sin intereses"

  confidence: number;
  rawText: string;
}

// ----------------------------------------------------------------------------
// Diccionario de acreedores / fuentes de credito (multi-palabra primero)
// ----------------------------------------------------------------------------

const CREDITOR_KEYWORDS: Array<{ keyword: string; name: string }> = [
  // Tiendas departamentales
  { keyword: "mercado libre", name: "Mercado Libre" },
  { keyword: "mercadolibre", name: "Mercado Libre" },
  { keyword: "american express", name: "American Express" },
  { keyword: "citibanamex", name: "Citibanamex" },
  { keyword: "coppel", name: "Coppel" },
  { keyword: "elektra", name: "Elektra" },
  { keyword: "famsa", name: "Famsa" },
  { keyword: "liverpool", name: "Liverpool" },
  { keyword: "suburbia", name: "Suburbia" },
  { keyword: "palacio", name: "El Palacio" },
  { keyword: "sears", name: "Sears" },
  { keyword: "sanborns", name: "Sanborns" },
  { keyword: "walmart", name: "Walmart" },
  { keyword: "amazon", name: "Amazon" },
  // Bancos / tarjetas
  { keyword: "banamex", name: "Banamex" },
  { keyword: "bbva", name: "BBVA" },
  { keyword: "santander", name: "Santander" },
  { keyword: "banorte", name: "Banorte" },
  { keyword: "hsbc", name: "HSBC" },
  { keyword: "scotiabank", name: "Scotiabank" },
  { keyword: "azteca", name: "Banco Azteca" },
  { keyword: "amex", name: "American Express" },
  // Informales (prestamos personales)
  { keyword: "prestamo mama", name: "Prestamo mama" },
  { keyword: "prestamo papa", name: "Prestamo papa" },
  { keyword: "prestamo hermano", name: "Prestamo hermano" },
  { keyword: "prestamo hermana", name: "Prestamo hermana" },
  { keyword: "prestamo amigo", name: "Prestamo amigo" },
  { keyword: "prestamo", name: "Prestamo personal" },
  { keyword: "tarjeta", name: "Tarjeta" },
];

// ----------------------------------------------------------------------------
// Diccionarios de intent
// ----------------------------------------------------------------------------

const INTENT_KEYWORDS: Array<{
  keywords: string[];
  intent: DebtCaptureIntent;
}> = [
  {
    keywords: ["abone", "abono", "abone a"],
    intent: "partial_payment",
  },
  {
    keywords: ["pague", "pago de", "pago a"],
    intent: "payment",
  },
  {
    keywords: ["compre", "compra a meses"],
    intent: "purchase_installment",
  },
  {
    keywords: ["vendi", "venta de", "vendido"],
    intent: "asset_sale",
  },
  {
    keywords: ["deuda", "debo a", "debo en", "tengo deuda"],
    intent: "new_debt",
  },
];

// Palabras que indican MSI (meses sin intereses)
const MSI_KEYWORDS = ["msi", "meses sin intereses", "sin intereses"];

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

// Encuentra patron X/Y (avance/total) tipo "4/12" o "4 de 12"
function findInstallmentProgress(
  text: string,
): { current: number; total: number; rawIndex: number; rawLen: number } | null {
  // Patron 1: "4/12"
  const re1 = /(\d+)\s*\/\s*(\d+)/;
  const m1 = re1.exec(text);
  if (m1) {
    const current = parseInt(m1[1], 10);
    const total = parseInt(m1[2], 10);
    if (
      Number.isFinite(current) &&
      Number.isFinite(total) &&
      total > 0 &&
      total <= 100 &&
      current >= 0 &&
      current <= total
    ) {
      return {
        current,
        total,
        rawIndex: m1.index,
        rawLen: m1[0].length,
      };
    }
  }
  // Patron 2: "4 de 12" / "voy 4 de 12"
  const re2 = /(?:voy\s+)?(\d+)\s+de\s+(\d+)/;
  const m2 = re2.exec(text);
  if (m2) {
    const current = parseInt(m2[1], 10);
    const total = parseInt(m2[2], 10);
    if (
      Number.isFinite(current) &&
      Number.isFinite(total) &&
      total > 0 &&
      total <= 100 &&
      current >= 0 &&
      current <= total
    ) {
      return {
        current,
        total,
        rawIndex: m2.index,
        rawLen: m2[0].length,
      };
    }
  }
  return null;
}

// Detecta "vence 15" o "vence el 15" → dia del mes
function findDueDay(text: string): number | null {
  const re = /vence(?:\s+el)?\s+(\d{1,2})/i;
  const m = re.exec(text);
  if (m) {
    const day = parseInt(m[1], 10);
    if (day >= 1 && day <= 31) return day;
  }
  return null;
}

// Detecta "msi 6" o "6 msi"
function findMsiCount(text: string): number | null {
  // "msi 6"
  const re1 = /msi\s+(\d+)/i;
  const m1 = re1.exec(text);
  if (m1) {
    const n = parseInt(m1[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
  // "6 msi"
  const re2 = /(\d+)\s+msi/i;
  const m2 = re2.exec(text);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
  // "a 6 meses" o "6 meses"
  const re3 = /(?:a\s+)?(\d+)\s+meses(?:\s+sin\s+intereses)?/i;
  const m3 = re3.exec(text);
  if (m3) {
    const n = parseInt(m3[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
  return null;
}

function detectIsMsi(text: string): boolean {
  return MSI_KEYWORDS.some((kw) => text.includes(kw));
}

// ----------------------------------------------------------------------------
// Detector de intent (primera pasada)
// ----------------------------------------------------------------------------

function detectIntent(text: string): DebtCaptureIntent {
  // Las primeras palabras pesan mas (mejor indicador)
  const firstPart = text.slice(0, 30);

  for (const entry of INTENT_KEYWORDS) {
    for (const kw of entry.keywords) {
      // Match al inicio o como palabra completa
      const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
      if (re.test(firstPart)) return entry.intent;
    }
  }

  // Fallback: buscar en todo el texto
  for (const entry of INTENT_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) return entry.intent;
    }
  }

  return "ambiguous";
}

// ----------------------------------------------------------------------------
// Detector de acreedor
// ----------------------------------------------------------------------------

function detectCreditor(text: string): {
  keyword: string | null;
  name: string | null;
} {
  for (const ck of CREDITOR_KEYWORDS) {
    if (text.includes(ck.keyword)) {
      return { keyword: ck.keyword, name: ck.name };
    }
  }
  return { keyword: null, name: null };
}

// ----------------------------------------------------------------------------
// Extractor de concepto/titulo
// ----------------------------------------------------------------------------
// Estrategia: quitar del texto los pedazos ya identificados (intent, acreedor,
// numeros, "vence X", "msi N") y lo que queda es el concepto.

function extractConcept(
  text: string,
  removedSpans: Array<{ start: number; end: number }>,
): string | null {
  // Ordenar spans por inicio
  removedSpans.sort((a, b) => a.start - b.start);

  // Construir el "resto"
  let cursor = 0;
  let rest = "";
  for (const sp of removedSpans) {
    rest += text.slice(cursor, sp.start);
    cursor = sp.end;
  }
  rest += text.slice(cursor);

  // Quitar palabras conocidas no aportan al titulo
  const STOP_WORDS = new Set([
    "deuda",
    "debo",
    "tengo",
    "compre",
    "compra",
    "compre a",
    "pague",
    "pago",
    "abone",
    "abono",
    "vendi",
    "voy",
    "de",
    "a",
    "el",
    "la",
    "los",
    "las",
    "para",
    "con",
    "en",
    "msi",
    "meses",
    "sin",
    "intereses",
    "vence",
    "tarjeta",
    "prestamo",
  ]);

  const tokens = rest
    .replace(/[\/\-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

  const concept = tokens.join(" ").trim();
  return concept.length > 0 ? concept : null;
}

// ----------------------------------------------------------------------------
// MOTOR PRINCIPAL
// ----------------------------------------------------------------------------

export function analyzeDebtLine(
  text: string,
  options: { forcedIntent?: DebtCaptureIntent } = {},
): DebtLineDetection {
  const rawText = text || "";
  const lower = normalizeText(rawText);

  const result: DebtLineDetection = {
    intent: "ambiguous",
    creditorKeyword: null,
    creditorName: null,
    conceptName: null,
    amount: null,
    installmentAmount: null,
    currentInstallment: null,
    totalInstallments: null,
    dueDay: null,
    originalAmount: null,
    currentBalance: null,
    isMsi: false,
    confidence: 0,
    rawText,
  };

  if (!lower) return result;

  // 1. Intent
  result.intent = options.forcedIntent ?? detectIntent(lower);

  // Para rastrear spans eliminados (para extraer concept)
  const removedSpans: Array<{ start: number; end: number }> = [];

  // 2. Acreedor
  const cred = detectCreditor(lower);
  result.creditorKeyword = cred.keyword;
  result.creditorName = cred.name;
  if (cred.keyword) {
    const idx = lower.indexOf(cred.keyword);
    if (idx >= 0) {
      removedSpans.push({ start: idx, end: idx + cred.keyword.length });
    }
  }

  // 3. MSI flag
  result.isMsi = detectIsMsi(lower);

  // 4. Avance X/Y
  const progress = findInstallmentProgress(lower);
  if (progress) {
    result.currentInstallment = progress.current;
    result.totalInstallments = progress.total;
    removedSpans.push({
      start: progress.rawIndex,
      end: progress.rawIndex + progress.rawLen,
    });
  }

  // 5. MSI count (si no detectamos progress)
  if (result.totalInstallments == null) {
    const msiCount = findMsiCount(lower);
    if (msiCount != null) {
      result.totalInstallments = msiCount;
      // Si es purchase, asumimos current = 0
      if (result.intent === "purchase_installment") {
        result.currentInstallment = 0;
      }
    }
  }

  // 6. Due day
  result.dueDay = findDueDay(lower);
  if (result.dueDay != null) {
    const re = /vence(?:\s+el)?\s+(\d{1,2})/i;
    const m = re.exec(lower);
    if (m) {
      removedSpans.push({
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  // 7. Extraer numero(s)
  const allNums = extractNumbers(lower);
  // Filtrar numeros que ya estan "usados" por progress, msi count, due day
  const usedValues = new Set<number>();
  if (result.currentInstallment != null) usedValues.add(result.currentInstallment);
  if (result.totalInstallments != null) usedValues.add(result.totalInstallments);
  if (result.dueDay != null) usedValues.add(result.dueDay);

  const moneyNums = allNums.filter(
    (n) => !usedValues.has(n.value) && n.value >= 10 && n.value <= 100000,
  );

  // 8. Asignar montos segun intent
  if (
    result.intent === "new_debt" ||
    (result.intent === "ambiguous" && result.totalInstallments != null)
  ) {
    // "deuda coppel bici 990 4/12" → 990 es la mensualidad
    if (moneyNums.length > 0 && result.totalInstallments != null) {
      result.installmentAmount = moneyNums[0].value;
      // Calculados: total = mensualidad * total_pagos
      result.originalAmount =
        Math.round(result.installmentAmount * result.totalInstallments * 100) /
        100;
      const pagados = result.currentInstallment ?? 0;
      const restantes = result.totalInstallments - pagados;
      result.currentBalance =
        Math.round(result.installmentAmount * restantes * 100) / 100;
    } else if (moneyNums.length > 0) {
      // Sin X/Y, asumimos que el numero es el saldo total
      result.originalAmount = moneyNums[0].value;
      result.currentBalance = moneyNums[0].value;
    }
    if (result.intent === "ambiguous") result.intent = "new_debt";
  } else if (result.intent === "purchase_installment") {
    // "compre play 5 6800 msi 6" → 6800 es el PRECIO TOTAL
    if (moneyNums.length > 0) {
      result.originalAmount = moneyNums[0].value;
      result.currentBalance = moneyNums[0].value;
      if (
        result.totalInstallments != null &&
        result.totalInstallments > 0
      ) {
        result.installmentAmount =
          Math.round((result.originalAmount / result.totalInstallments) * 100) /
          100;
        result.currentInstallment = 0;
      }
    }
  } else if (
    result.intent === "payment" ||
    result.intent === "partial_payment" ||
    result.intent === "asset_sale"
  ) {
    // El monto es lo pagado / vendido
    if (moneyNums.length > 0) {
      result.amount = moneyNums[0].value;
    }
  }

  // Marcar el numero usado como amount (para que no aparezca en concept)
  if (moneyNums.length > 0) {
    const used = moneyNums[0];
    removedSpans.push({
      start: used.index,
      end: used.index + used.raw.length,
    });
  }

  // 9. Extraer concepto (lo que queda)
  result.conceptName = extractConcept(lower, removedSpans);

  // 10. Confidence
  let confidence = 0;
  if (result.intent !== "ambiguous") confidence += 0.3;
  if (result.creditorName != null) confidence += 0.2;
  if (result.conceptName != null) confidence += 0.15;

  if (result.intent === "new_debt" || result.intent === "purchase_installment") {
    if (result.installmentAmount != null) confidence += 0.15;
    if (result.totalInstallments != null) confidence += 0.1;
    if (result.dueDay != null) confidence += 0.05;
    if (result.originalAmount != null) confidence += 0.05;
  } else {
    if (result.amount != null) confidence += 0.35;
  }
  result.confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return result;
}
