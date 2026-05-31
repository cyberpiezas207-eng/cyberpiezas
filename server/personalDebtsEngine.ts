// ============================================================================
// MOTOR DE PARSEO - Capturas de deudas en lenguaje natural
// ----------------------------------------------------------------------------
// VERSION 2: ahora usa el cerebro de fechas reutilizable (dateEngine).
// Entiende:
//   - "vence febrero 03"        -> dueDate: 2026-02-03, dueDay: 3
//   - "vence 15"                -> dueDay: 15 (dia solo)
//   - "la compre en enero 03"   -> purchaseDate: 2026-01-03
//   - "mi pago es en junio 03"  -> nextPaymentDate: 2026-06-03
//
// Adicionalmente, los pedazos matcheados como fechas SE QUITAN del concepto,
// asi nunca veras "bici febrero enero" en el titulo.
//
// Intents soportados:
//   - new_debt, purchase_installment
//   - payment, partial_payment, asset_sale, ambiguous
//
// Pure functions, sin BD. Reusable desde router y frontend.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  findDateNearKeyword,
  normalizeText,
  type DateDetection,
} from "./dateEngine";

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

  creditorKeyword: string | null;
  creditorName: string | null;

  conceptName: string | null;

  amount: number | null;

  installmentAmount: number | null;
  currentInstallment: number | null;
  totalInstallments: number | null;

  // Fechas detectadas (NUEVAS en V2)
  dueDay: number | null;
  dueDate: string | null;
  purchaseDate: string | null;
  nextPaymentDate: string | null;

  originalAmount: number | null;
  currentBalance: number | null;
  isMsi: boolean;

  confidence: number;
  rawText: string;
}

// ----------------------------------------------------------------------------
// Diccionario de acreedores
// ----------------------------------------------------------------------------

const CREDITOR_KEYWORDS: Array<{ keyword: string; name: string }> = [
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
  { keyword: "banamex", name: "Banamex" },
  { keyword: "bbva", name: "BBVA" },
  { keyword: "santander", name: "Santander" },
  { keyword: "banorte", name: "Banorte" },
  { keyword: "hsbc", name: "HSBC" },
  { keyword: "scotiabank", name: "Scotiabank" },
  { keyword: "azteca", name: "Banco Azteca" },
  { keyword: "amex", name: "American Express" },
  { keyword: "prestamo mama", name: "Prestamo mama" },
  { keyword: "prestamo papa", name: "Prestamo papa" },
  { keyword: "prestamo hermano", name: "Prestamo hermano" },
  { keyword: "prestamo hermana", name: "Prestamo hermana" },
  { keyword: "prestamo amigo", name: "Prestamo amigo" },
  { keyword: "prestamo", name: "Prestamo personal" },
  { keyword: "tarjeta", name: "Tarjeta" },
];

const INTENT_KEYWORDS: Array<{
  keywords: string[];
  intent: DebtCaptureIntent;
}> = [
  { keywords: ["abone", "abono", "abone a"], intent: "partial_payment" },
  { keywords: ["pague", "pago de", "pago a"], intent: "payment" },
  { keywords: ["compre", "compra a meses"], intent: "purchase_installment" },
  { keywords: ["vendi", "venta de", "vendido"], intent: "asset_sale" },
  { keywords: ["deuda", "debo a", "debo en", "tengo deuda"], intent: "new_debt" },
];

const MSI_KEYWORDS = ["msi", "meses sin intereses", "sin intereses"];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

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
    out.push({ value, hasDecimal: raw.includes("."), raw: m[1], index: m.index });
  }
  return out;
}

function findInstallmentProgress(
  text: string,
): { current: number; total: number; rawIndex: number; rawLen: number } | null {
  const re1 = /(\d+)\s*\/\s*(\d+)/;
  const m1 = re1.exec(text);
  if (m1) {
    const current = parseInt(m1[1], 10);
    const total = parseInt(m1[2], 10);
    if (
      Number.isFinite(current) && Number.isFinite(total) &&
      total > 0 && total <= 100 && current >= 0 && current <= total
    ) {
      return { current, total, rawIndex: m1.index, rawLen: m1[0].length };
    }
  }
  const re2 = /(?:voy\s+)?(\d+)\s+de\s+(\d+)/;
  const m2 = re2.exec(text);
  if (m2) {
    const current = parseInt(m2[1], 10);
    const total = parseInt(m2[2], 10);
    if (
      Number.isFinite(current) && Number.isFinite(total) &&
      total > 0 && total <= 100 && current >= 0 && current <= total
    ) {
      return { current, total, rawIndex: m2.index, rawLen: m2[0].length };
    }
  }
  return null;
}

function findMsiCount(text: string): number | null {
  const re1 = /msi\s+(\d+)/i;
  const m1 = re1.exec(text);
  if (m1) {
    const n = parseInt(m1[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
  const re2 = /(\d+)\s+msi/i;
  const m2 = re2.exec(text);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
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

function detectIntent(text: string): DebtCaptureIntent {
  const firstPart = text.slice(0, 30);
  for (const entry of INTENT_KEYWORDS) {
    for (const kw of entry.keywords) {
      const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
      if (re.test(firstPart)) return entry.intent;
    }
  }
  for (const entry of INTENT_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) return entry.intent;
    }
  }
  return "ambiguous";
}

function detectCreditor(text: string): { keyword: string | null; name: string | null } {
  for (const ck of CREDITOR_KEYWORDS) {
    if (text.includes(ck.keyword)) {
      return { keyword: ck.keyword, name: ck.name };
    }
  }
  return { keyword: null, name: null };
}

function addDateSpan(
  removedSpans: Array<{ start: number; end: number }>,
  det: DateDetection | null,
): void {
  if (!det) return;
  removedSpans.push({
    start: det.matchedIndex,
    end: det.matchedIndex + det.matchedText.length,
  });
}

function markKeywordSpansToRemove(
  text: string,
  removedSpans: Array<{ start: number; end: number }>,
): void {
  const keywords = [
    "vence el", "vence",
    "la compre el", "la compre", "compre el", "compre en", "compre",
    "mi pago es en", "mi pago es", "mi pago en", "mi pago",
    "pago es",
    "el dia", "dia",
  ];

  for (const kw of keywords) {
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(kw, searchFrom);
      if (idx < 0) break;
      removedSpans.push({ start: idx, end: idx + kw.length });
      searchFrom = idx + kw.length;
    }
  }
}

function extractConcept(
  text: string,
  removedSpans: Array<{ start: number; end: number }>,
): string | null {
  if (removedSpans.length === 0) {
    const cleaned = cleanConceptText(text);
    return cleaned.length > 0 ? cleaned : null;
  }

  removedSpans.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const sp of removedSpans) {
    const last = merged[merged.length - 1];
    if (last && sp.start <= last.end) {
      last.end = Math.max(last.end, sp.end);
    } else {
      merged.push({ ...sp });
    }
  }

  let cursor = 0;
  let rest = "";
  for (const sp of merged) {
    rest += text.slice(cursor, sp.start);
    cursor = sp.end;
  }
  rest += text.slice(cursor);

  return cleanConceptText(rest);
}

function cleanConceptText(rest: string): string {
  const STOP_WORDS = new Set([
    "deuda", "debo", "tengo", "compre", "compra",
    "pague", "pago", "abone", "abono", "vendi",
    "voy", "de", "a", "el", "la", "los", "las",
    "para", "con", "en", "es", "mi",
    "msi", "meses", "sin", "intereses",
    "vence", "tarjeta", "prestamo",
    "dia", "dias",
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "setiembre", "octubre",
    "noviembre", "diciembre",
    "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago",
    "sep", "sept", "oct", "nov", "dic",
    "hoy", "manana",
  ]);

  const tokens = rest
    .replace(/[\/\-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

  return tokens.join(" ").trim();
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
    dueDate: null,
    purchaseDate: null,
    nextPaymentDate: null,
    originalAmount: null,
    currentBalance: null,
    isMsi: false,
    confidence: 0,
    rawText,
  };

  if (!lower) return result;

  // 1. Intent
  result.intent = options.forcedIntent ?? detectIntent(lower);

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
    removedSpans.push({ start: progress.rawIndex, end: progress.rawIndex + progress.rawLen });
  }

  // 5. MSI count
  if (result.totalInstallments == null) {
    const msiCount = findMsiCount(lower);
    if (msiCount != null) {
      result.totalInstallments = msiCount;
      if (result.intent === "purchase_installment") {
        result.currentInstallment = 0;
      }
    }
  }

  // 6. FECHAS usando dateEngine
  // 6a. Vencimiento
  const dueDateDet = findDateNearKeyword(
    lower,
    ["vence el", "vence"],
    { preferFuture: true },
  );
  if (dueDateDet) {
    result.dueDay = dueDateDet.day;
    result.dueDate = dueDateDet.ymd;
    addDateSpan(removedSpans, dueDateDet);
  }

  // 6b. Compra (no aplicable a purchase_installment)
  if (result.intent !== "purchase_installment") {
    const purchaseDet = findDateNearKeyword(
      lower,
      ["la compre el", "la compre", "compre el", "compre en"],
      { preferFuture: false },
    );
    if (purchaseDet && (purchaseDet.day != null || purchaseDet.ymd != null)) {
      result.purchaseDate = purchaseDet.ymd;
      addDateSpan(removedSpans, purchaseDet);
    }
  }

  // 6c. Proximo pago
  const paymentDet = findDateNearKeyword(
    lower,
    ["mi pago es en", "mi pago es", "mi pago en", "mi pago"],
    { preferFuture: true },
  );
  if (paymentDet && (paymentDet.day != null || paymentDet.ymd != null)) {
    result.nextPaymentDate = paymentDet.ymd;
    if (result.dueDate == null && paymentDet.ymd != null) {
      result.dueDate = paymentDet.ymd;
    }
    if (result.dueDay == null && paymentDet.day != null) {
      result.dueDay = paymentDet.day;
    }
    addDateSpan(removedSpans, paymentDet);
  }

  // 6d. Marcar keywords para limpieza
  markKeywordSpansToRemove(lower, removedSpans);

  // 7. Numeros
  const allNums = extractNumbers(lower);
  const usedValues = new Set<number>();
  if (result.currentInstallment != null) usedValues.add(result.currentInstallment);
  if (result.totalInstallments != null) usedValues.add(result.totalInstallments);
  if (result.dueDay != null) usedValues.add(result.dueDay);

  function isInsideRemovedSpan(idx: number): boolean {
    return removedSpans.some((s) => idx >= s.start && idx < s.end);
  }

  const moneyNums = allNums.filter(
    (n) =>
      !usedValues.has(n.value) &&
      n.value >= 10 && n.value <= 100000 &&
      !isInsideRemovedSpan(n.index),
  );

  // 8. Asignar montos
  if (
    result.intent === "new_debt" ||
    (result.intent === "ambiguous" && result.totalInstallments != null)
  ) {
    if (moneyNums.length > 0 && result.totalInstallments != null) {
      result.installmentAmount = moneyNums[0].value;
      result.originalAmount =
        Math.round(result.installmentAmount * result.totalInstallments * 100) / 100;
      const pagados = result.currentInstallment ?? 0;
      const restantes = result.totalInstallments - pagados;
      result.currentBalance =
        Math.round(result.installmentAmount * restantes * 100) / 100;
    } else if (moneyNums.length > 0) {
      result.originalAmount = moneyNums[0].value;
      result.currentBalance = moneyNums[0].value;
    }
    if (result.intent === "ambiguous") result.intent = "new_debt";
  } else if (result.intent === "purchase_installment") {
    if (moneyNums.length > 0) {
      result.originalAmount = moneyNums[0].value;
      result.currentBalance = moneyNums[0].value;
      if (result.totalInstallments != null && result.totalInstallments > 0) {
        result.installmentAmount =
          Math.round((result.originalAmount / result.totalInstallments) * 100) / 100;
        result.currentInstallment = 0;
      }
    }
  } else if (
    result.intent === "payment" ||
    result.intent === "partial_payment" ||
    result.intent === "asset_sale"
  ) {
    if (moneyNums.length > 0) {
      result.amount = moneyNums[0].value;
    }
  }

  if (moneyNums.length > 0) {
    const used = moneyNums[0];
    removedSpans.push({ start: used.index, end: used.index + used.raw.length });
  }

  // 9. Concepto limpio
  result.conceptName = extractConcept(lower, removedSpans);

  // 10. Confidence
  let confidence = 0;
  if (result.intent !== "ambiguous") confidence += 0.3;
  if (result.creditorName != null) confidence += 0.2;
  if (result.conceptName != null && result.conceptName.length > 1) {
    confidence += 0.15;
  }

  if (result.intent === "new_debt" || result.intent === "purchase_installment") {
    if (result.installmentAmount != null || result.originalAmount != null) {
      confidence += 0.15;
    }
    if (result.totalInstallments != null) confidence += 0.1;
    if (result.dueDay != null || result.dueDate != null) confidence += 0.05;
  } else {
    if (result.amount != null) confidence += 0.35;
  }
  result.confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return result;
}
