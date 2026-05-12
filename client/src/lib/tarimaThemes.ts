// =============================================================================
// TARIMA THEMES (v2 con template "classic" para compatibilidad)
// =============================================================================
// Definicion de los 7 templates visuales para perfiles publicos de Tarima.
//
// IMPORTANTE: El template "classic" replica el diseño morado/purpura 
// original. Es el FALLBACK para perfiles con themeId="default" (es decir,
// los perfiles existentes antes de Fase 3). Asi no cambian de aspecto.
//
// Helpers exportados:
//   - getTheme(themeId, customColors, fontFamily): resuelve tema final
//   - getThemeCssVars(theme): retorna objeto CSS vars para inyectar
//   - ALL_THEMES: array de todos los templates (para UI selector)
// =============================================================================

export type TarimaThemeId =
  | "classic"
  | "minimal"
  | "neon"
  | "sunset"
  | "forest"
  | "vintage"
  | "bold";

export type TarimaColors = {
  primary: string;
  secondary: string;
  bg: string;
  text: string;
  accent: string;
};

export type TarimaTheme = {
  id: TarimaThemeId;
  name: string;
  description: string;
  vibe: string;
  target: string;
  colors: TarimaColors;
  fontFamily?: string;
  bgGradient?: string;
};

// =============================================================================
// LOS 7 TEMPLATES
// =============================================================================

export const TARIMA_THEMES: Record<TarimaThemeId, TarimaTheme> = {
  // CLASSIC: replica el diseño morado/purpura original.
  // Fallback para perfiles existentes (themeId="default")
  classic: {
    id: "classic",
    name: "Classic",
    description: "Morado vibrante original de Tarima",
    vibe: "Energico",
    target: "Universal",
    colors: {
      primary: "#a855f7",
      secondary: "#ec4899",
      bg: "#0f172a",
      text: "#ffffff",
      accent: "#6366f1",
    },
    fontFamily: "Inter, system-ui, sans-serif",
    bgGradient: "linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #ec4899 100%)",
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Apple-style limpio en blanco y negro",
    vibe: "Sofisticado",
    target: "Indie / folk",
    colors: {
      primary: "#171717",
      secondary: "#525252",
      bg: "#ffffff",
      text: "#0a0a0a",
      accent: "#262626",
    },
    fontFamily: "Inter, system-ui, sans-serif",
  },

  neon: {
    id: "neon",
    name: "Neon",
    description: "Synthwave oscuro con luces electricas",
    vibe: "Energico",
    target: "DJ / electronic",
    colors: {
      primary: "#00ffea",
      secondary: "#ff00ff",
      bg: "#0a0a14",
      text: "#ffffff",
      accent: "#ff00ff",
    },
    fontFamily: "JetBrains Mono, monospace",
    bgGradient: "linear-gradient(135deg, #0a0a14 0%, #1a0a2e 100%)",
  },

  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Atardecer calido con rosas y naranjas",
    vibe: "Calido",
    target: "Pop / latin",
    colors: {
      primary: "#ec4899",
      secondary: "#f97316",
      bg: "#fff1f2",
      text: "#1c1917",
      accent: "#9333ea",
    },
    fontFamily: "Poppins, sans-serif",
    bgGradient: "linear-gradient(135deg, #fce7f3 0%, #fed7aa 100%)",
  },

  forest: {
    id: "forest",
    name: "Forest",
    description: "Bosque organico con verdes y tierra",
    vibe: "Natural",
    target: "Acustico / folk",
    colors: {
      primary: "#16a34a",
      secondary: "#65a30d",
      bg: "#f7fee7",
      text: "#1a2e05",
      accent: "#a16207",
    },
    fontFamily: "Lora, serif",
  },

  vintage: {
    id: "vintage",
    name: "Vintage",
    description: "Sepia elegante con tipografia serif",
    vibe: "Clasico",
    target: "Jazz / clasica",
    colors: {
      primary: "#78350f",
      secondary: "#92400e",
      bg: "#fef3c7",
      text: "#451a03",
      accent: "#d97706",
    },
    fontFamily: "Playfair Display, Georgia, serif",
  },

  bold: {
    id: "bold",
    name: "Bold",
    description: "Alto contraste impactante",
    vibe: "Atrevido",
    target: "Hip-hop / rock",
    colors: {
      primary: "#dc2626",
      secondary: "#facc15",
      bg: "#0a0a0a",
      text: "#fafafa",
      accent: "#f97316",
    },
    fontFamily: "Archivo Black, Impact, sans-serif",
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resuelve el tema final aplicando overrides custom.
 *
 * Logica:
 *   - Si themeId es "default", null, undefined o invalido → usa "classic"
 *     (Para preservar el aspecto de perfiles pre-Fase 3)
 *   - Si hay customColors → los merge sobre el template base
 *   - Si hay fontFamily custom → la usa en lugar de la del template
 *
 * @example
 *   getTheme("neon") → neon template puro
 *   getTheme("neon", { primary: "#ff0080" }) → neon con primary cambiado
 *   getTheme("default") → fallback a classic (preserva diseño original)
 *   getTheme("xxxx") → fallback a classic (themeId desconocido)
 */
export function getTheme(
  themeId: string | null | undefined,
  customColors?: Partial<TarimaColors> | null,
  fontFamily?: string | null,
): TarimaTheme {
  // Normalizar themeId: default/null/invalido → classic (preserva aspecto)
  const isValidId =
    themeId && themeId !== "default" && themeId in TARIMA_THEMES;
  const normalizedId: TarimaThemeId = isValidId
    ? (themeId as TarimaThemeId)
    : "classic";

  const base = TARIMA_THEMES[normalizedId];

  // Si no hay overrides, devolver tema base sin clonar
  if (!customColors && !fontFamily) {
    return base;
  }

  // Merge custom sobre base
  return {
    ...base,
    colors: {
      ...base.colors,
      ...(customColors ?? {}),
    },
    fontFamily: fontFamily || base.fontFamily,
  };
}

/**
 * Convierte un tema a objeto de CSS variables.
 * Para aplicar inline en el style de un elemento React.
 *
 * @example
 *   const cssVars = getThemeCssVars(theme);
 *   <div style={cssVars as React.CSSProperties}>...
 *
 *   Y en CSS/Tailwind usas:
 *   color: var(--tarima-text);
 *   background: var(--tarima-bg);
 */
export function getThemeCssVars(theme: TarimaTheme): Record<string, string> {
  const vars: Record<string, string> = {
    "--tarima-primary": theme.colors.primary,
    "--tarima-secondary": theme.colors.secondary,
    "--tarima-bg": theme.colors.bg,
    "--tarima-text": theme.colors.text,
    "--tarima-accent": theme.colors.accent,
  };
  if (theme.fontFamily) {
    vars["--tarima-font"] = theme.fontFamily;
  }
  if (theme.bgGradient) {
    vars["--tarima-bg-gradient"] = theme.bgGradient;
  }
  return vars;
}

// =============================================================================
// EXPORTS PARA UI
// =============================================================================

/**
 * Array de todos los templates en orden para mostrar en UI selector.
 * Classic primero porque es el default visual histórico.
 */
export const ALL_THEMES: TarimaTheme[] = Object.values(TARIMA_THEMES);
