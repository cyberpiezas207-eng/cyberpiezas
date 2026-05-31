// ============================================================================
// MOTOR DE FECHAS EN ESPAÑOL (REUTILIZABLE)
// ----------------------------------------------------------------------------
// Modulo generico que entiende fechas en lenguaje natural en español.
// Sera usado por TODOS los cerebros del sistema:
//   - Deudas (vence febrero 3, compre en enero)
//   - Recordatorios (recordar pagar luz dia 12)
//   - Mantenimiento auto (cambio aceite en 6 meses)
//   - Proyectos (entregar el 15 de junio)
//   - Citas (lunes a las 3pm)
//
// Patrones reconocidos:
//   - ISO: 2026-02-15
//   - DD/MM/YYYY: 15/02/2026
//   - DD/MM: 15/02
//   - DD de MES YYYY: 15 de febrero 2026
//   - MES DD: febrero 15
//   - DD MES: 15 febrero
//   - Solo dia: 15 (cuando hay contexto tipo "vence")
//   - Relativas: hoy, mañana, en N dias, en N semanas
//
// Pure functions, sin BD. Comentarios SIN ACENTOS por convencion.
// ============================================================================

// ----------------------------------------------------------------------------
// DICCIONARIO DE MESES EN ESPAÑOL
// ----------------------------------------------------------------------------

const MONTHS_ES: Record<string, number> = {
  // Nombre completo
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9, // variante valida
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  // Abreviaciones de 3-4 letras
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

// Lista ordenada de mas larga a mas corta para regex (evitar matches parciales)
const MONTH_NAMES_SORTED = Object.keys(MONTHS_ES).sort(
  (a, b) => b.length - a.length,
);
const MONTH_PATTERN = MONTH_NAMES_SORTED.join("|");

// ----------------------------------------------------------------------------
// TIPOS PUBLICOS
// ----------------------------------------------------------------------------

export interface DateDetection {
  // Componentes individuales detectados
  day: number | null; // 1-31
  month: number | null; // 1-12
  year: number | null;

  // Fecha completa calculada si se pudo
  ymd: string | null; // "2026-02-15"

  // Metadata
  isRelative: boolean; // "en 3 dias", "hoy", "mañana"
  isDayOnly: boolean; // "vence 15" (solo dia, sin mes)
  isMonthOnly: boolean; // "en enero" (solo mes, sin dia)
  matchedText: string; // el pedazo del texto que se matcheo
  matchedIndex: number; // posicion en el texto original

  confidence: number; // 0-1
}

export interface FindDateOptions {
  // Si la fecha es en el pasado, asumir el proximo año
  preferFuture?: boolean;
  // Año base para calcular ymd cuando solo hay dia+mes
  baseYear?: number;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function todayYMD(): string {
  const d = nowMexico();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function padYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const lastDay = new Date(year, month, 0).getDate();
  return day <= lastDay;
}

export function parseMonthName(name: string): number | null {
  const norm = normalizeText(name);
  return MONTHS_ES[norm] ?? null;
}

// Año inferido: usa año actual o siguiente si la fecha pasada y preferFuture
function inferYear(
  day: number,
  month: number,
  options: FindDateOptions = {},
): number {
  const today = nowMexico();
  const baseYear = options.baseYear ?? today.getFullYear();

  if (options.preferFuture) {
    const candidate = new Date(baseYear, month - 1, day, 12, 0, 0);
    if (candidate < today) {
      return baseYear + 1;
    }
  }
  return baseYear;
}

// Calcula fecha relativa: hoy, mañana, en N dias/semanas
function addDays(baseYMD: string, days: number): string {
  const [y, m, d] = baseYMD.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return padYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

// ----------------------------------------------------------------------------
// PATRONES DE FECHA (intentados en orden de especificidad)
// ----------------------------------------------------------------------------

// Patron 1: ISO completa YYYY-MM-DD
const RE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;

// Patron 2: DD/MM/YYYY o DD-MM-YYYY
const RE_DMY = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;

// Patron 3: DD/MM o DD-MM (sin año)
const RE_DM = /(\d{1,2})[\/\-](\d{1,2})(?!\d)/;

// Patron 4: DD de MES YYYY (con "de" opcional para año)
const RE_DD_DE_MES = new RegExp(
  `(\\d{1,2})\\s+de\\s+(${MONTH_PATTERN})(?:\\s+(?:de\\s+)?(\\d{4}))?`,
  "i",
);

// Patron 5: MES DD YYYY (sin "de")
const RE_MES_DD = new RegExp(
  `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?(?!\\d)`,
  "i",
);

// Patron 6: DD MES (sin "de", invertido)
const RE_DD_MES = new RegExp(
  `(\\d{1,2})\\s+(${MONTH_PATTERN})\\b(?!\\d)`,
  "i",
);

// Patron 7: solo MES (sin dia)
const RE_SOLO_MES = new RegExp(`\\b(${MONTH_PATTERN})\\b`, "i");

// Patron 8: "en N dias" o "en N semanas"
const RE_EN_DIAS = /en\s+(\d+)\s+dias?/i;
const RE_EN_SEMANAS = /en\s+(\d+)\s+semanas?/i;
const RE_EN_MESES = /en\s+(\d+)\s+meses?/i;

// ----------------------------------------------------------------------------
// FUNCION PRINCIPAL: encontrar PRIMERA fecha en un texto
// ----------------------------------------------------------------------------

export function findFirstDate(
  text: string,
  options: FindDateOptions = {},
): DateDetection | null {
  const lower = normalizeText(text);
  if (!lower) return null;

  // ---------- Patron 1: ISO ----------
  let m = lower.match(RE_ISO);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (isValidDate(year, month, day)) {
      return {
        day,
        month,
        year,
        ymd: padYMD(year, month, day),
        isRelative: false,
        isDayOnly: false,
        isMonthOnly: false,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 1.0,
      };
    }
  }

  // ---------- Patron 2: DD/MM/YYYY ----------
  m = lower.match(RE_DMY);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (isValidDate(year, month, day)) {
      return {
        day,
        month,
        year,
        ymd: padYMD(year, month, day),
        isRelative: false,
        isDayOnly: false,
        isMonthOnly: false,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 0.95,
      };
    }
  }

  // ---------- Patron 4: DD de MES (YYYY opcional) ----------
  m = lower.match(RE_DD_DE_MES);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseMonthName(m[2]);
    const explicitYear = m[3] ? parseInt(m[3], 10) : null;
    if (month != null && day >= 1 && day <= 31) {
      const year = explicitYear ?? inferYear(day, month, options);
      if (isValidDate(year, month, day)) {
        return {
          day,
          month,
          year,
          ymd: padYMD(year, month, day),
          isRelative: false,
          isDayOnly: false,
          isMonthOnly: false,
          matchedText: m[0],
          matchedIndex: m.index ?? 0,
          confidence: 0.95,
        };
      }
    }
  }

  // ---------- Patron 5: MES DD ----------
  m = lower.match(RE_MES_DD);
  if (m) {
    const month = parseMonthName(m[1]);
    const day = parseInt(m[2], 10);
    const explicitYear = m[3] ? parseInt(m[3], 10) : null;
    if (month != null && day >= 1 && day <= 31) {
      const year = explicitYear ?? inferYear(day, month, options);
      if (isValidDate(year, month, day)) {
        return {
          day,
          month,
          year,
          ymd: padYMD(year, month, day),
          isRelative: false,
          isDayOnly: false,
          isMonthOnly: false,
          matchedText: m[0],
          matchedIndex: m.index ?? 0,
          confidence: 0.9,
        };
      }
    }
  }

  // ---------- Patron 6: DD MES (sin "de") ----------
  m = lower.match(RE_DD_MES);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseMonthName(m[2]);
    if (month != null && day >= 1 && day <= 31) {
      const year = inferYear(day, month, options);
      if (isValidDate(year, month, day)) {
        return {
          day,
          month,
          year,
          ymd: padYMD(year, month, day),
          isRelative: false,
          isDayOnly: false,
          isMonthOnly: false,
          matchedText: m[0],
          matchedIndex: m.index ?? 0,
          confidence: 0.85,
        };
      }
    }
  }

  // ---------- Patron 3: DD/MM (sin año) ----------
  m = lower.match(RE_DM);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const year = inferYear(day, month, options);
      if (isValidDate(year, month, day)) {
        return {
          day,
          month,
          year,
          ymd: padYMD(year, month, day),
          isRelative: false,
          isDayOnly: false,
          isMonthOnly: false,
          matchedText: m[0],
          matchedIndex: m.index ?? 0,
          confidence: 0.8,
        };
      }
    }
  }

  // ---------- Relativas: hoy, mañana, pasado mañana ----------
  if (/\bhoy\b/.test(lower)) {
    const idx = lower.search(/\bhoy\b/);
    return {
      day: null,
      month: null,
      year: null,
      ymd: todayYMD(),
      isRelative: true,
      isDayOnly: false,
      isMonthOnly: false,
      matchedText: "hoy",
      matchedIndex: idx,
      confidence: 0.95,
    };
  }
  if (/\bmanana\b/.test(lower)) {
    const idx = lower.search(/\bmanana\b/);
    return {
      day: null,
      month: null,
      year: null,
      ymd: addDays(todayYMD(), 1),
      isRelative: true,
      isDayOnly: false,
      isMonthOnly: false,
      matchedText: "manana",
      matchedIndex: idx,
      confidence: 0.95,
    };
  }
  if (/\bpasado\s+manana\b/.test(lower)) {
    const idx = lower.search(/\bpasado\s+manana\b/);
    return {
      day: null,
      month: null,
      year: null,
      ymd: addDays(todayYMD(), 2),
      isRelative: true,
      isDayOnly: false,
      isMonthOnly: false,
      matchedText: "pasado manana",
      matchedIndex: idx,
      confidence: 0.95,
    };
  }

  // ---------- "en N dias / semanas / meses" ----------
  m = lower.match(RE_EN_DIAS);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n < 365) {
      return {
        day: null,
        month: null,
        year: null,
        ymd: addDays(todayYMD(), n),
        isRelative: true,
        isDayOnly: false,
        isMonthOnly: false,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 0.9,
      };
    }
  }
  m = lower.match(RE_EN_SEMANAS);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n < 100) {
      return {
        day: null,
        month: null,
        year: null,
        ymd: addDays(todayYMD(), n * 7),
        isRelative: true,
        isDayOnly: false,
        isMonthOnly: false,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 0.9,
      };
    }
  }
  m = lower.match(RE_EN_MESES);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n < 60) {
      return {
        day: null,
        month: null,
        year: null,
        ymd: addDays(todayYMD(), n * 30),
        isRelative: true,
        isDayOnly: false,
        isMonthOnly: false,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 0.75,
      };
    }
  }

  // ---------- Solo mes (sin dia) ----------
  m = lower.match(RE_SOLO_MES);
  if (m) {
    const month = parseMonthName(m[1]);
    if (month != null) {
      return {
        day: null,
        month,
        year: null,
        ymd: null,
        isRelative: false,
        isDayOnly: false,
        isMonthOnly: true,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
        confidence: 0.4,
      };
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// FUNCION CONTEXTUAL: buscar fecha cerca de keyword(s)
// ----------------------------------------------------------------------------
// Busca una fecha DESPUES de alguno de los keywords en el texto.
// Si encuentra una fecha completa, la retorna. Si solo encuentra un dia
// (ej: "vence 15"), retorna DateDetection con isDayOnly=true.

export function findDateNearKeyword(
  text: string,
  keywords: string[],
  options: FindDateOptions = {},
): DateDetection | null {
  const lower = normalizeText(text);
  if (!lower) return null;

  for (const kw of keywords) {
    const kwNorm = normalizeText(kw);
    const idx = lower.indexOf(kwNorm);
    if (idx < 0) continue;

    // Tomar ventana despues del keyword (hasta 50 chars)
    let afterStart = idx + kwNorm.length;
    let window = lower.slice(afterStart, afterStart + 50);

    // Limpiar palabras de relleno comunes: "el", "los", "los proximos"
    const fillerMatch = window.match(/^\s*(el|los\s+proximos|los|la|los)\s+/);
    if (fillerMatch) {
      afterStart += fillerMatch[0].length;
      window = lower.slice(afterStart, afterStart + 50);
    }

    // Intentar fecha completa
    const det = findFirstDate(window, options);
    if (det) {
      det.matchedIndex += afterStart;
      return det;
    }

    // Fallback: solo dia ("vence 15")
    const dayMatch = window.match(/^\s*(\d{1,2})\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (day >= 1 && day <= 31) {
        return {
          day,
          month: null,
          year: null,
          ymd: null,
          isRelative: false,
          isDayOnly: true,
          isMonthOnly: false,
          matchedText: dayMatch[0].trim(),
          matchedIndex:
            afterStart + dayMatch[0].length - dayMatch[0].trimStart().length,
          confidence: 0.65,
        };
      }
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// HELPER: buscar SOLO el dia cerca de keyword (sin fecha completa)
// ----------------------------------------------------------------------------

export function findDayNearKeyword(
  text: string,
  keywords: string[],
): number | null {
  const det = findDateNearKeyword(text, keywords);
  if (det && det.day != null) return det.day;
  return null;
}

// ----------------------------------------------------------------------------
// FIND ALL: encontrar TODAS las fechas en un texto
// ----------------------------------------------------------------------------
// Util cuando un texto puede tener varias fechas (ej: "vence febrero 3 la
// compre en enero 03").

export function findAllDates(
  text: string,
  options: FindDateOptions = {},
): DateDetection[] {
  const results: DateDetection[] = [];
  const lower = normalizeText(text);
  let remaining = lower;
  let offset = 0;
  let safety = 10; // max 10 fechas para evitar loops

  while (safety-- > 0) {
    const det = findFirstDate(remaining, options);
    if (!det) break;
    det.matchedIndex += offset;
    results.push(det);

    // Avanzar despues de la fecha encontrada
    const advance = det.matchedIndex - offset + det.matchedText.length;
    remaining = remaining.slice(advance);
    offset += advance;
  }

  return results;
}
