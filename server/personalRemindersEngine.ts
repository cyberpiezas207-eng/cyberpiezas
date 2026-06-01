// ============================================================================
// MOTOR DE PARSEO - Capturas de recordatorios en lenguaje natural
// ----------------------------------------------------------------------------
// Reusa el cerebro de fechas (dateEngine) al maximo.
// Entiende capturas naturales como:
//
//   - "recordar pagar luz dia 12"               -> dueDay: 12, title: "pagar luz"
//   - "cambiar aceite en 6 meses"               -> dueDate: hoy+180, title: "cambiar aceite"
//   - "renovar dominio 15 de julio"             -> dueDate: 2026-07-15
//   - "comprar regalo mama mañana 6pm"          -> dueDate: manana, dueTime: 18:00
#   - "pagar internet cada mes urgente"         -> isRecurring: monthly, priority: urgent
#   - "cita dentista lunes 3pm"                 -> proximo lunes a las 15:00
#
// Pure function. Reusable desde router (quickCreate) y frontend (preview).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  findFirstDate,
  findDateNearKeyword,
  normalizeText,
  type DateDetection,
} from "./dateEngine";

// ----------------------------------------------------------------------------
// Tipos publicos
// ----------------------------------------------------------------------------

export type ReminderPriority = "low" | "normal" | "high" | "urgent";

export type RecurrencePattern =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | null;

export interface ReminderDetection {
  title: string | null;
  dueDate: string | null; // YMD completo (si se detecto dia+mes)
  dueDay: number | null; // solo dia 1-31 (si captura es "dia 12" sin mes)
  dueTime: string | null; // HH:MM
  priority: ReminderPriority;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  tags: string[];
  rawText: string;
  confidence: number;
}

// ----------------------------------------------------------------------------
// Diccionarios
// ----------------------------------------------------------------------------

const URGENT_KEYWORDS = [
  "urgente",
  "urgentemente",
  "muy urgente",
  "ya",
  "ahora mismo",
];

const HIGH_KEYWORDS = [
  "importante",
  "no olvidar",
  "no olvido",
  "no se olvide",
  "prioridad",
];

const LOW_KEYWORDS = ["cuando pueda", "sin prisa", "tranqui"];

// Recurrencias en español
const RECURRENCE_MAP: Array<{ keywords: string[]; pattern: RecurrencePattern }> = [
  { keywords: ["cada dia", "diario", "diariamente", "todos los dias"], pattern: "daily" },
  { keywords: ["cada semana", "semanal", "semanalmente"], pattern: "weekly" },
  { keywords: ["cada 2 semanas", "quincenal", "bisemanal"], pattern: "biweekly" },
  { keywords: ["cada mes", "mensual", "mensualmente", "todos los meses"], pattern: "monthly" },
  { keywords: ["cada 3 meses", "trimestral", "trimestralmente"], pattern: "quarterly" },
  { keywords: ["cada año", "anual", "anualmente", "todos los años"], pattern: "yearly" },
];

// Dias de la semana (lunes a domingo)
const WEEKDAYS_ES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

// Keywords de "recordar" que normalmente se quitan del titulo
const REMINDER_PREFIX_KEYWORDS = [
  "recordar",
  "recordame",
  "recuerdame",
  "no olvidar",
  "no olvido",
  "no se olvide",
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function padYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayYMD(): string {
  const d = nowMexico();
  return padYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// Suma N dias a una fecha YMD
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return padYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

// Encuentra el proximo dia de la semana (lunes, martes, etc) desde hoy
function nextWeekdayYMD(targetWeekday: number): string {
  const today = nowMexico();
  const currentWeekday = today.getDay();
  let diff = targetWeekday - currentWeekday;
  if (diff <= 0) diff += 7; // siempre futuro
  const target = new Date(today);
  target.setDate(target.getDate() + diff);
  return padYMD(target.getFullYear(), target.getMonth() + 1, target.getDate());
}

// ----------------------------------------------------------------------------
// Detectores especificos
// ----------------------------------------------------------------------------

function detectPriority(text: string): ReminderPriority {
  for (const kw of URGENT_KEYWORDS) {
    if (text.includes(kw)) return "urgent";
  }
  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) return "high";
  }
  for (const kw of LOW_KEYWORDS) {
    if (text.includes(kw)) return "low";
  }
  return "normal";
}

function detectRecurrence(text: string): {
  isRecurring: boolean;
  pattern: RecurrencePattern;
  matchedKeywords: string[];
} {
  for (const entry of RECURRENCE_MAP) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        return {
          isRecurring: true,
          pattern: entry.pattern,
          matchedKeywords: [kw],
        };
      }
    }
  }
  return { isRecurring: false, pattern: null, matchedKeywords: [] };
}

// Detecta dia de la semana ("lunes", "el martes proximo")
function detectWeekday(text: string): { ymd: string; matched: string } | null {
  for (const [name, dayNum] of Object.entries(WEEKDAYS_ES)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    const m = text.match(re);
    if (m) {
      return { ymd: nextWeekdayYMD(dayNum), matched: m[0] };
    }
  }
  return null;
}

// Detecta hora del dia ("3pm", "a las 3", "15:30", "a las 6 de la tarde")
function detectTime(text: string): {
  hhmm: string;
  matchedText: string;
  matchedIndex: number;
} | null {
  // Patron 1: "HH:MM"
  let m = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) {
    const h = parseInt(m[1], 10);
    const mn = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) {
      return {
        hhmm: `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
      };
    }
  }

  // Patron 2: "Npm" o "Nam" o "N pm"
  m = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const ampm = m[2].toLowerCase();
    if (h >= 1 && h <= 12) {
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      return {
        hhmm: `${String(h).padStart(2, "0")}:00`,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
      };
    }
  }

  // Patron 3: "a las N" o "a las N de la tarde/noche/mañana"
  m = text.match(
    /a\s+las?\s+(\d{1,2})(?:\s+de\s+la\s+(tarde|noche|manana|mañana))?/,
  );
  if (m) {
    let h = parseInt(m[1], 10);
    const tod = m[2]?.toLowerCase();
    if (h >= 1 && h <= 23) {
      // Si menciona tarde/noche y h <= 11, sumar 12
      if ((tod === "tarde" || tod === "noche") && h < 12) {
        h += 12;
      }
      return {
        hhmm: `${String(h).padStart(2, "0")}:00`,
        matchedText: m[0],
        matchedIndex: m.index ?? 0,
      };
    }
  }

  return null;
}

// Extrae tags hashtag (#trabajo, #familia)
function detectTags(text: string): { tags: string[]; matchedSpans: Array<{ start: number; end: number }> } {
  const tags: string[] = [];
  const spans: Array<{ start: number; end: number }> = [];
  const re = /#(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1]);
    spans.push({ start: m.index, end: m.index + m[0].length });
  }
  return { tags, matchedSpans: spans };
}

// Limpia el titulo quitando keywords detectados y palabras de relleno
function extractTitle(
  text: string,
  removedSpans: Array<{ start: number; end: number }>,
): string | null {
  // Ordenar spans y mergear solapados
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

  // Construir lo que queda
  let cursor = 0;
  let rest = "";
  for (const sp of merged) {
    rest += text.slice(cursor, sp.start);
    cursor = sp.end;
  }
  rest += text.slice(cursor);

  // Limpieza de stop-words y prefijos
  const STOP_WORDS = new Set([
    "recordar",
    "recordame",
    "recuerdame",
    "no",
    "olvidar",
    "olvido",
    "olvide",
    "se",
    "que",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "de",
    "del",
    "a",
    "al",
    "en",
    "para",
    "con",
    "por",
    "es",
    "y",
    "mi",
    "me",
    "tu",
    "te",
    "le",
    "lo",
    "se",
    "dia",
    "dias",
    "hora",
    "horas",
    "vez",
    "veces",
    "cada",
    "todos",
    "todas",
    "proxim",
    "proximo",
    "proxima",
    // Tarde/noche/manana/dia (ya removidos por detectores, pero por si acaso)
    "tarde",
    "noche",
    "manana",
  ]);

  const tokens = rest
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t.toLowerCase()) && !/^\d+$/.test(t));

  return tokens.length > 0 ? tokens.join(" ") : null;
}

// ----------------------------------------------------------------------------
// MOTOR PRINCIPAL
// ----------------------------------------------------------------------------

export function analyzeReminderLine(text: string): ReminderDetection {
  const rawText = text || "";
  const lower = normalizeText(rawText);

  const result: ReminderDetection = {
    title: null,
    dueDate: null,
    dueDay: null,
    dueTime: null,
    priority: "normal",
    isRecurring: false,
    recurrencePattern: null,
    tags: [],
    rawText,
    confidence: 0,
  };

  if (!lower) return result;

  const removedSpans: Array<{ start: number; end: number }> = [];

  // 1. Prioridad
  result.priority = detectPriority(lower);

  // 2. Recurrencia
  const rec = detectRecurrence(lower);
  result.isRecurring = rec.isRecurring;
  result.recurrencePattern = rec.pattern;
  // Quitar el keyword de recurrencia del texto para el titulo
  for (const kw of rec.matchedKeywords) {
    const idx = lower.indexOf(kw);
    if (idx >= 0) removedSpans.push({ start: idx, end: idx + kw.length });
  }

  // 3. Tags
  const tagDetection = detectTags(lower);
  result.tags = tagDetection.tags;
  removedSpans.push(...tagDetection.matchedSpans);

  // 4. Hora del dia
  const timeDet = detectTime(lower);
  if (timeDet) {
    result.dueTime = timeDet.hhmm;
    removedSpans.push({
      start: timeDet.matchedIndex,
      end: timeDet.matchedIndex + timeDet.matchedText.length,
    });
  }

  // 5. Fecha - intentar varios approaches
  // 5a. Buscar fecha cerca de "el", "vence", "para" o solo en el texto
  let dateDetection: DateDetection | null = findDateNearKeyword(
    lower,
    ["para el", "para", "el dia", "vence"],
    { preferFuture: true },
  );

  // 5b. Si no, buscar primera fecha del texto
  if (!dateDetection) {
    dateDetection = findFirstDate(lower, { preferFuture: true });
  }

  if (dateDetection) {
    if (dateDetection.ymd) result.dueDate = dateDetection.ymd;
    if (dateDetection.day) result.dueDay = dateDetection.day;
    removedSpans.push({
      start: dateDetection.matchedIndex,
      end: dateDetection.matchedIndex + dateDetection.matchedText.length,
    });
  } else {
    // 5c. Intentar dia de la semana
    const wd = detectWeekday(lower);
    if (wd) {
      result.dueDate = wd.ymd;
      const idx = lower.indexOf(wd.matched);
      if (idx >= 0) {
        removedSpans.push({ start: idx, end: idx + wd.matched.length });
      }
    }
  }

  // 6. Quitar prefijos "recordar/no olvidar" para el titulo
  for (const prefix of REMINDER_PREFIX_KEYWORDS) {
    const idx = lower.indexOf(prefix);
    if (idx >= 0) {
      removedSpans.push({ start: idx, end: idx + prefix.length });
    }
  }

  // 7. Tambien quitar palabras de prioridad
  for (const kw of [...URGENT_KEYWORDS, ...HIGH_KEYWORDS, ...LOW_KEYWORDS]) {
    let idx = lower.indexOf(kw);
    while (idx >= 0) {
      removedSpans.push({ start: idx, end: idx + kw.length });
      idx = lower.indexOf(kw, idx + kw.length);
    }
  }

  // 8. Extraer titulo limpio
  result.title = extractTitle(lower, removedSpans);

  // 9. Confidence
  let conf = 0;
  if (result.title && result.title.length >= 2) conf += 0.5;
  if (result.dueDate || result.dueDay) conf += 0.3;
  if (result.dueTime) conf += 0.1;
  if (result.isRecurring) conf += 0.1;
  if (result.priority !== "normal") conf += 0.05;
  result.confidence = Math.min(1, Math.round(conf * 100) / 100);

  return result;
}

