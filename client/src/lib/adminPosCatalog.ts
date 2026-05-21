// ============================================================================
// adminPosCatalog.ts
// ----------------------------------------------------------------------------
// Catalogo unico de POS para el panel de admin /admin-cyberpiezas.
//
// Usado por:
// - AdminCyberpiezas (page principal)
// - SubscriberCard (renderiza accesos por usuario)
// - AdminUsersTab (cuando se cree en Commit 2)
//
// Cada entrada declara:
// - setupHref: ruta cuando se hace click en el boton (activo no-manageable o
//   inactivo). Casi siempre es /admin-pagos.
// - manageable: si true, el boton "Desactivar" en SubscriberCard llama directo
//   a programAccess.upsert (legacy enum). Si false, navega a setupHref para
//   gestionar el pago/sub.
//
// IMPORTANTE: Este es un archivo de datos. NO contiene hooks, NO contiene
// componentes React, NO hace fetches. Solo expone tipos y datos constantes.
// ============================================================================

export type ProgramCode =
  | "boutique"
  | "abarrotes"
  | "veterinaria"
  | "verduleria"
  | "tarima"
  | "taqueria"
  | "papeleria";

export type ProgramSpec = {
  code: ProgramCode;
  name: string;
  icon: string;
  gradient: string;
  ring: string;
  setupHref: string;
  setupLabel: string;
  manageable: boolean;
};

export const PROGRAMS: ProgramSpec[] = [
  {
    code: "boutique",
    name: "Boutique",
    icon: "👗",
    gradient: "from-purple-500 to-pink-500",
    ring: "ring-purple-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup boutique",
    manageable: true,
  },
  {
    code: "abarrotes",
    name: "Abarrotes",
    icon: "🛒",
    gradient: "from-orange-500 to-red-500",
    ring: "ring-orange-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup abarrotes",
    manageable: true,
  },
  {
    code: "veterinaria",
    name: "Veterinaria",
    icon: "🐾",
    gradient: "from-emerald-500 to-cyan-500",
    ring: "ring-emerald-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup veterinaria",
    manageable: true,
  },
  {
    code: "verduleria",
    name: "Verduleria",
    icon: "🥕",
    gradient: "from-lime-500 to-green-600",
    ring: "ring-lime-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup verduleria",
    manageable: false,
  },
  {
    code: "tarima",
    name: "Tarima",
    icon: "🎤",
    gradient: "from-fuchsia-500 to-indigo-500",
    ring: "ring-fuchsia-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup tarima",
    manageable: false,
  },
  {
    code: "taqueria",
    name: "Taqueria",
    icon: "🌮",
    gradient: "from-amber-500 to-rose-500",
    ring: "ring-amber-500/30",
    setupHref: "/admin-taqueria-setup",
    setupLabel: "Setup taqueria",
    manageable: false,
  },
  {
    code: "papeleria",
    name: "Papeleria",
    icon: "📓",
    gradient: "from-sky-500 to-blue-600",
    ring: "ring-sky-500/30",
    setupHref: "/admin-pagos",
    setupLabel: "Setup papeleria",
    manageable: false,
  },
];
