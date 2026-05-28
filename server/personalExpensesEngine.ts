// ============================================================================
// MOTOR DE CATEGORIZACION - Gastos personales
// ----------------------------------------------------------------------------
// Funcion PURA: sin BD, sin tRPC, sin red. Solo recibe texto y datos, y
// devuelve un analisis. Esto permite usar el MISMO motor en el backend (al
// guardar) y en el frontend (para el preview en vivo, sin latencia).
//
// Que hace:
//   1. Normaliza el texto (minusculas, sin acentos, sin signos raros)
//   2. Extrae el monto (MVP: toma el numero mas grande como total)
//   3. Detecta CATEGORIA por reglas aprendidas o keywords, con un puntaje
//   4. Detecta TIENDA por keywords, con su puntaje
//   5. Calcula una confianza 0-100 y de donde salio la deteccion
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export type DetectionSource = "keyword" | "rule" | "manual" | "none";

export interface KeywordEntity {
  slug: string;
  keywords: string[];
}

export interface LearnedRule {
  categorySlug: string;
  normalizedPhrase: string;
  weight?: number;
}

export interface AnalyzeOptions {
  categories?: KeywordEntity[];
  stores?: KeywordEntity[];
  rules?: LearnedRule[];
}

export interface ExpenseAnalysis {
  amount: number;
  rawInput: string;
  cleanDescription: string;
  normalizedDescription: string;
  categorySlug: string | null;
  categoryConfidence: number; // 0-100
  categorySource: DetectionSource;
  storeSlug: string | null;
  storeConfidence: number; // 0-100
  possibleItems: string[];
}

// ----------------------------------------------------------------------------
// Diccionarios semilla por defecto
// Estos mismos los usara C3 para crear las categorias y tiendas iniciales.
// icon usa emojis (tu estilo). color en hex calido, cohesivo con el admin.
// ----------------------------------------------------------------------------

export interface SeedCategory {
  slug: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

export interface SeedStore {
  slug: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    slug: "gasolina",
    name: "Gasolina",
    icon: "\u26FD",
    color: "#BA7517",
    keywords: ["gasolina", "gas", "pemex", "magna", "premium", "combustible", "diesel"],
  },
  {
    slug: "despensa",
    name: "Despensa",
    icon: "\uD83D\uDED2",
    color: "#378ADD",
    keywords: ["despensa", "super", "mercado", "abarrotes", "leche", "huevo", "pan", "azucar", "arroz", "frijol"],
  },
  {
    slug: "verduleria",
    name: "Verduleria",
    icon: "\uD83E\uDD6C",
    color: "#639922",
    keywords: ["verdura", "verduleria", "fruta", "frutas", "tomate", "jitomate", "cebolla", "papa", "lechuga", "aguacate", "chile"],
  },
  {
    slug: "carne",
    name: "Carne",
    icon: "\uD83E\uDD69",
    color: "#D85A30",
    keywords: ["carne", "pollo", "res", "puerco", "cerdo", "carniceria", "bistec", "milanesa", "pescado", "chuleta"],
  },
  {
    slug: "servicios",
    name: "Servicios",
    icon: "\uD83D\uDCA1",
    color: "#7F77DD",
    keywords: ["luz", "cfe", "agua", "internet", "telmex", "izzi", "totalplay", "telefono", "recibo", "servicio"],
  },
  {
    slug: "sin-clasificar",
    name: "Sin clasificar",
    icon: "\uD83E\uDDFE",
    color: "#888780",
    keywords: [],
  },
];

export const DEFAULT_STORES: SeedStore[] = [
  {
    slug: "sams",
    name: "Sam's Club",
    type: "mayoreo",
    icon: "\uD83C\uDFF7\uFE0F",
    color: "#185FA5",
    keywords: ["sams", "sams club", "sam"],
  },
  {
    slug: "costco",
    name: "Costco",
    type: "mayoreo",
    icon: "\uD83D\uDCE6",
    color: "#A32D2D",
    keywords: ["costco"],
  },
  {
    slug: "walmart",
    name: "Walmart",
    type: "super",
    icon: "\uD83D\uDED2",
    color: "#185FA5",
    keywords: ["walmart", "wal mart"],
  },
  {
    slug: "bodega-aurrera",
    name: "Bodega Aurrera",
    type: "super",
    icon: "\uD83C\uDFEA",
    color: "#993C1D",
    keywords: ["bodega", "aurrera", "bodega aurrera"],
  },
  {
    slug: "central-abastos",
    name: "Central de Abastos",
    type: "mayoreo",
    icon: "\uD83E\uDD55",
    color: "#3B6D11",
    keywords: ["central", "abastos", "central de abastos", "central de abasto"],
  },
  {
    slug: "otro",
    name: "Otro",
    type: "otro",
    icon: "\uD83C\uDFEC",
    color: "#5F5E5A",
    keywords: [],
  },
];

// ----------------------------------------------------------------------------
// Normalizacion
// ----------------------------------------------------------------------------

/**
 * Pasa a minusculas, quita acentos, quita apostrofes y signos raros.
 * Conserva letras, numeros, punto y coma (para los montos) y espacios.
 */
export function normalizeText(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/['`\u00b4]/g, "") // quitar apostrofes -> sam's = sams
    .replace(/[^a-z0-9.,\s]/g, " ") // signos raros a espacio
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------------------------------
// Extraccion de monto (MVP: el numero mas grande es el total)
// ----------------------------------------------------------------------------

export function extractAmount(normText: string): number {
  if (!normText) return 0;
  // quitar comas de miles: 1,200 -> 1200
  const cleaned = normText.replace(/(\d),(\d{3})/g, "$1$2");
  const matches = cleaned.match(/\d+(?:\.\d+)?/g) || [];
  let amount = 0;
  for (const m of matches) {
    const n = parseFloat(m);
    if (!isNaN(n) && n > amount) amount = n;
  }
  return Math.round(amount * 100) / 100;
}

// ----------------------------------------------------------------------------
// Scoring por keywords (coincidencia por palabra completa)
// ----------------------------------------------------------------------------

interface ScoreRow {
  slug: string;
  score: number;
}

function scoreEntities(normText: string, entities: KeywordEntity[]): { topSlug: string | null; topScore: number; secondScore: number } {
  const padded = " " + normText + " ";
  const rows: ScoreRow[] = entities.map((e) => {
    let score = 0;
    for (const kwRaw of e.keywords || []) {
      const kw = normalizeText(kwRaw);
      if (!kw) continue;
      // coincidencia por palabra/frase completa (bordeada por espacios)
      if (padded.indexOf(" " + kw + " ") >= 0) score++;
    }
    return { slug: e.slug, score };
  });
  rows.sort((a, b) => b.score - a.score);
  const top = rows[0];
  const second = rows[1];
  return {
    topSlug: top && top.score > 0 ? top.slug : null,
    topScore: top ? top.score : 0,
    secondScore: second ? second.score : 0,
  };
}

function keywordConfidence(topScore: number, secondScore: number): number {
  if (topScore <= 0) return 0;
  let c = 45 + topScore * 18;
  if (topScore > secondScore) c += 8; // ganador unico
  if (c > 95) c = 95; // reservamos 96-100 para reglas/manual
  return Math.round(c);
}

function matchRule(normText: string, rules: LearnedRule[]): LearnedRule | null {
  const padded = " " + normText + " ";
  // la regla con frase mas larga gana (mas especifica)
  const sorted = [...rules].sort((a, b) => (b.normalizedPhrase || "").length - (a.normalizedPhrase || "").length);
  for (const r of sorted) {
    const phrase = normalizeText(r.normalizedPhrase || "");
    if (phrase && padded.indexOf(" " + phrase + " ") >= 0) return r;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Limpieza de descripcion y posibles productos
// ----------------------------------------------------------------------------

function stripNumbers(input: string): string {
  return input
    .replace(/\d+(?:[.,]\d+)?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildKeywordSet(...entityLists: KeywordEntity[][]): Set<string> {
  const set = new Set<string>();
  for (const list of entityLists) {
    for (const e of list) {
      for (const kw of e.keywords || []) {
        const n = normalizeText(kw);
        if (n) n.split(" ").forEach((tok) => set.add(tok));
      }
    }
  }
  return set;
}

function leftoverItems(normText: string, used: Set<string>): string[] {
  const items: string[] = [];
  for (const tok of normText.split(" ")) {
    if (!tok) continue;
    if (/^\d/.test(tok)) continue; // numeros no
    if (tok.length < 3) continue; // muy cortos no
    if (used.has(tok)) continue; // ya es keyword de categoria/tienda
    if (!items.includes(tok)) items.push(tok);
  }
  return items;
}

// ----------------------------------------------------------------------------
// Funcion principal
// ----------------------------------------------------------------------------

export function analyzeExpenseLine(input: string, opts: AnalyzeOptions = {}): ExpenseAnalysis {
  const categories: KeywordEntity[] = opts.categories ?? DEFAULT_CATEGORIES;
  const stores: KeywordEntity[] = opts.stores ?? DEFAULT_STORES;
  const rules: LearnedRule[] = opts.rules ?? [];

  const normalizedDescription = normalizeText(input);
  const amount = extractAmount(normalizedDescription);

  // CATEGORIA: primero reglas aprendidas, luego keywords
  let categorySlug: string | null = null;
  let categoryConfidence = 0;
  let categorySource: DetectionSource = "none";

  const rule = matchRule(normalizedDescription, rules);
  if (rule) {
    categorySlug = rule.categorySlug;
    categoryConfidence = 92;
    categorySource = "rule";
  } else {
    const onlyWithKeywords = categories.filter((c) => (c.keywords || []).length > 0);
    const catScore = scoreEntities(normalizedDescription, onlyWithKeywords);
    if (catScore.topSlug) {
      categorySlug = catScore.topSlug;
      categoryConfidence = keywordConfidence(catScore.topScore, catScore.secondScore);
      categorySource = "keyword";
    }
  }

  // TIENDA
  let storeSlug: string | null = null;
  let storeConfidence = 0;
  const onlyStoresWithKeywords = stores.filter((s) => (s.keywords || []).length > 0);
  const storeScore = scoreEntities(normalizedDescription, onlyStoresWithKeywords);
  if (storeScore.topSlug) {
    storeSlug = storeScore.topSlug;
    storeConfidence = keywordConfidence(storeScore.topScore, storeScore.secondScore);
  }

  // Descripcion limpia y posibles productos (para fases futuras)
  const cleanDescription = stripNumbers(input);
  const usedKeywords = buildKeywordSet(categories, stores);
  const possibleItems = leftoverItems(normalizedDescription, usedKeywords);

  return {
    amount,
    rawInput: input,
    cleanDescription,
    normalizedDescription,
    categorySlug,
    categoryConfidence,
    categorySource,
    storeSlug,
    storeConfidence,
    possibleItems,
  };
}
