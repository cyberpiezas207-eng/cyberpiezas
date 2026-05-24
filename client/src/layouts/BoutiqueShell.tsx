// =============================================================================
// BoutiqueShell - Layout responsive para Boutique POS
// -----------------------------------------------------------------------------
// Comportamiento adaptativo:
//   - Desktop (>1024px): sidebar izquierda expandida con todos los items
//   - Tablet (768-1024px): sidebar colapsada a rail de solo iconos
//   - Mobile (<768px): bottom tabs con 5 items + drawer "Mas" para resto
//
// Tema: Atelier hardcoded (magenta + negro + crema). En Commit 3 se hace
// configurable con persistencia + permisos.
//
// Patron: este Shell envuelve children. Cada page Boutique que quiera el
// nuevo look hace <BoutiqueShell>{contenido}</BoutiqueShell> en lugar de
// <DashboardLayout>...
//
// Mantiene los 14 items del menu original sin perder funcionalidad.
// =============================================================================

import { useState, useEffect, useMemo, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Home,
  ShoppingCart,
  Building2,
  Receipt,
  ShoppingBag,
  Tag,
  Palette,
  Building,
  Package,
  Bell,
  ListChecks,
  Crown,
  Users,
  Settings,
  Plus,
  Menu,
  Search,
  X,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

// =============================================================================
// MENU DEFINITION
// =============================================================================

type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

const MENU_SECTIONS: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: "Principal",
    items: [
      { id: "dashboard", label: "Inicio", icon: Home, path: "/dashboard" },
      { id: "pos", label: "Punto de venta", icon: ShoppingCart, path: "/pos" },
      { id: "sistemas", label: "Centro Cyberpiezas", icon: Building, path: "/sistemas" },
    ],
  },
  {
    title: "Operacion",
    items: [
      { id: "sales", label: "Ventas", icon: Receipt, path: "/sales" },
      { id: "products", label: "Productos", icon: ShoppingBag, path: "/products" },
      { id: "categories", label: "Categorias", icon: Tag, path: "/categories" },
      { id: "variants", label: "Variantes", icon: Palette, path: "/variants" },
      { id: "branches", label: "Sucursales", icon: Building2, path: "/branches" },
      { id: "inventory", label: "Inventario", icon: Package, path: "/inventory-reports" },
    ],
  },
  {
    title: "Administracion",
    items: [
      { id: "notifications", label: "Notificaciones", icon: Bell, path: "/notifications" },
      { id: "mis-subs", label: "Mis suscripciones", icon: ListChecks, path: "/mis-suscripciones" },
      { id: "subscription", label: "Mi suscripcion", icon: Crown, path: "/subscription" },
      { id: "users", label: "Cajeros y usuarios", icon: Users, path: "/users-management" },
      { id: "settings", label: "Configuracion de tienda", icon: Settings, path: "/settings/pos-hardware" },
    ],
  },
];

// Tabs principales del mobile bottom nav (5 items maximo)
type BottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string | null;
  isMain?: boolean;
};

const BOTTOM_TABS: BottomTab[] = [
  { id: "dashboard", label: "Inicio", icon: Home, path: "/dashboard" },
  { id: "products", label: "Productos", icon: ShoppingBag, path: "/products" },
  { id: "pos", label: "Vender", icon: Plus, path: "/pos", isMain: true },
  { id: "inventory", label: "Stock", icon: Package, path: "/inventory-reports" },
  { id: "more", label: "Mas", icon: Menu, path: null },
];

// =============================================================================
// THEME: Atelier (magenta + negro + crema)
// En Commit 3 se vuelve dinamico desde BD + preferencias del usuario
// =============================================================================

const ATELIER_THEME = {
  "--bq-primary": "#E91E63",
  "--bq-primary-dark": "#C2185B",
  "--bq-primary-soft": "#FBEAF0",
  "--bq-primary-text": "#993556",
  "--bq-accent": "#1A1A1A",
  "--bq-surface": "#FFFFFF",
  "--bq-card-bg": "#FAF7F2",
  "--bq-text": "#1A1A1A",
  "--bq-text-muted": "#6B6B6B",
  "--bq-border": "rgba(0,0,0,0.08)",
  "--bq-good": "#1D9E75",
} as React.CSSProperties;

// =============================================================================
// COMPONENT
// =============================================================================

export default function BoutiqueShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cerrar drawer automaticamente cuando cambia de ruta
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Bloquear scroll del body cuando drawer abierto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const userInitial = useMemo(() => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  }, [user?.name]);

  const userName = useMemo(() => {
    if (!user?.name) return "Usuario";
    return user.name.split(" ")[0];
  }, [user?.name]);

  const userRole = user?.role === "admin" ? "Admin" : "Owner";

  const navigate = (path: string) => {
    setLocation(path);
    setDrawerOpen(false);
  };

  const isActiveRoute = (path: string) => {
    if (path === "/dashboard") {
      return location === "/dashboard" || location === "/";
    }
    return location === path || location.startsWith(path + "/");
  };

  // Items que NO estan en bottom tabs (van al drawer "Mas")
  const bottomTabIds = new Set(
    BOTTOM_TABS.filter((t) => t.path).map((t) => t.id),
  );
  const allItems = MENU_SECTIONS.flatMap((s) => s.items);
  const moreItems = allItems.filter((item) => !bottomTabIds.has(item.id));

  return (
    <div className="boutique-shell" style={ATELIER_THEME}>
      <style>{BOUTIQUE_SHELL_STYLES}</style>

      {/* HEADER STICKY */}
      <header className="bq-header" role="banner">
        <button
          className="bq-logo"
          onClick={() => navigate("/dashboard")}
          aria-label="Ir a inicio Boutique"
        >
          <div className="bq-logo-dot">B</div>
          <div className="bq-logo-text">Boutique</div>
        </button>
        <div className="bq-header-actions">
          <button className="bq-icon-btn" aria-label="Buscar" onClick={() => navigate("/products")}>
            <Search size={18} />
          </button>
          <button
            className="bq-icon-btn"
            aria-label="Notificaciones"
            onClick={() => navigate("/notifications")}
          >
            <Bell size={18} />
            <span className="bq-badge" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="bq-layout">
        {/* SIDEBAR (desktop expandida + tablet rail) */}
        <aside className="bq-sidebar" aria-label="Navegacion lateral">
          <button
            className="bq-cta"
            onClick={() => navigate("/pos")}
            aria-label="Iniciar nueva venta"
          >
            <Plus size={18} />
            <span>Nueva venta</span>
          </button>

          <div className="bq-menu-scroll">
            {MENU_SECTIONS.map((section) => (
              <div key={section.title} className="bq-menu-group">
                <div className="bq-section">{section.title}</div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.path);
                  return (
                    <button
                      key={item.id}
                      className={`bq-menu-item ${active ? "is-active" : ""}`}
                      onClick={() => navigate(item.path)}
                      title={item.label}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <button className="bq-user-pill" aria-label="Mi perfil">
            <div className="bq-user-avatar">{userInitial}</div>
            <div className="bq-user-info">
              <div className="bq-user-name">{userName}</div>
              <div className="bq-user-role">{userRole}</div>
            </div>
          </button>
        </aside>

        {/* MAIN CONTENT - con tema Atelier aplicado a todas las pages Boutique */}
        <main className="bq-main bq-pos-theme" role="main">
          {children}
        </main>
      </div>

      {/* BOTTOM NAV (solo mobile) */}
      <nav className="bq-bottom-nav" aria-label="Navegacion principal mobile">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          if (tab.id === "more") {
            return (
              <button
                key={tab.id}
                className="bq-tab"
                onClick={() => setDrawerOpen(true)}
                aria-label="Mas opciones"
                aria-expanded={drawerOpen}
              >
                <Icon size={20} />
                <span className="bq-tab-label">{tab.label}</span>
              </button>
            );
          }
          const active = tab.path ? isActiveRoute(tab.path) : false;
          return (
            <button
              key={tab.id}
              className={`bq-tab ${tab.isMain ? "is-main" : ""} ${active ? "is-active" : ""}`}
              onClick={() => tab.path && navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={tab.isMain ? 22 : 20} />
              <span className="bq-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* DRAWER "Mas" (solo mobile, animado) */}
      <div
        className={`bq-drawer-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`bq-drawer ${drawerOpen ? "is-open" : ""}`}
        aria-label="Menu adicional"
        aria-hidden={!drawerOpen}
      >
        <div className="bq-drawer-head">
          <div className="bq-drawer-title">Mas opciones</div>
          <button
            className="bq-icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="bq-drawer-body">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.path);
            return (
              <button
                key={item.id}
                className={`bq-drawer-item ${active ? "is-active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <ChevronRight size={14} className="bq-drawer-chevron" />
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

// =============================================================================
// STYLES (extraidos a constante para mantener JSX limpio)
// =============================================================================

const BOUTIQUE_SHELL_STYLES = `
.boutique-shell {
  min-height: 100vh;
  background: var(--bq-card-bg);
  color: var(--bq-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.bq-header {
  background: var(--bq-surface);
  border-bottom: 0.5px solid var(--bq-border);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 30;
}
.bq-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.2s ease;
}
.bq-logo:hover {
  background: var(--bq-card-bg);
}
.bq-logo-dot {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bq-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 15px;
  font-family: Georgia, "Times New Roman", serif;
}
.bq-logo-text {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--bq-text);
}
.bq-header-actions {
  display: flex;
  gap: 8px;
}
.bq-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--bq-card-bg);
  border: none;
  color: var(--bq-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.bq-icon-btn:hover {
  background: var(--bq-primary-soft);
  color: var(--bq-primary-text);
}
.bq-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--bq-primary);
  border-radius: 50%;
  border: 1.5px solid var(--bq-surface);
}
.bq-layout {
  display: flex;
  min-height: calc(100vh - 60px);
}
.bq-sidebar {
  width: 230px;
  background: var(--bq-surface);
  border-right: 0.5px solid var(--bq-border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.bq-cta {
  background: var(--bq-primary);
  color: white;
  padding: 13px 12px;
  border-radius: 10px;
  border: none;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.bq-cta:hover {
  background: var(--bq-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(233,30,99,0.25);
}
.bq-menu-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
}
.bq-menu-group + .bq-menu-group {
  margin-top: 6px;
}
.bq-section {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--bq-text-muted);
  padding: 12px 8px 4px;
  font-weight: 500;
}
.bq-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--bq-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  margin-bottom: 1px;
}
.bq-menu-item:hover {
  background: var(--bq-primary-soft);
  color: var(--bq-primary-text);
}
.bq-menu-item.is-active {
  background: var(--bq-primary-soft);
  color: var(--bq-primary-text);
  font-weight: 500;
}
.bq-user-pill {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--bq-card-bg);
  border: 0.5px solid var(--bq-border);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}
.bq-user-pill:hover {
  border-color: var(--bq-primary);
}
.bq-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bq-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}
.bq-user-info {
  min-width: 0;
}
.bq-user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--bq-text);
  line-height: 1.2;
}
.bq-user-role {
  font-size: 11px;
  color: var(--bq-text-muted);
  line-height: 1.2;
}
.bq-main {
  flex: 1;
  padding: 24px 28px;
  overflow-x: hidden;
  min-width: 0;
}
.bq-bottom-nav {
  display: none;
}
.bq-drawer-backdrop,
.bq-drawer {
  display: none;
}

/* TABLET: sidebar colapsada a rail */
@media (max-width: 1024px) {
  .bq-sidebar {
    width: 76px;
    padding: 16px 8px;
  }
  .bq-section,
  .bq-logo-text,
  .bq-user-info,
  .bq-menu-item span,
  .bq-cta span {
    display: none;
  }
  .bq-menu-item {
    justify-content: center;
    padding: 11px 8px;
  }
  .bq-cta {
    padding: 12px 8px;
  }
  .bq-user-pill {
    justify-content: center;
    padding: 8px;
  }
  .bq-main {
    padding: 20px 22px;
  }
}

/* MOBILE: sin sidebar, bottom nav fijo */
@media (max-width: 768px) {
  .bq-sidebar {
    display: none;
  }
  .bq-main {
    padding: 16px 14px 96px 14px;
  }
  .bq-header {
    padding: 10px 14px;
  }
  .bq-bottom-nav {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bq-surface);
    border-top: 0.5px solid var(--bq-border);
    padding: 8px 6px 10px;
    z-index: 25;
    gap: 0;
  }
  .bq-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 2px;
    cursor: pointer;
    color: var(--bq-text-muted);
    background: none;
    border: none;
    transition: color 0.2s ease;
  }
  .bq-tab.is-active {
    color: var(--bq-primary);
  }
  .bq-tab-label {
    font-size: 10px;
    font-weight: 500;
  }
  .bq-tab.is-main {
    background: var(--bq-primary);
    color: white;
    border-radius: 14px;
    padding: 7px 4px 6px;
    margin-top: -10px;
    box-shadow: 0 6px 18px rgba(233,30,99,0.35);
  }
  .bq-tab.is-main .bq-tab-label {
    color: white;
  }
  .bq-tab.is-main:hover,
  .bq-tab.is-main:active {
    background: var(--bq-primary-dark);
    transform: scale(0.96);
  }
  .bq-drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.0);
    z-index: 40;
    pointer-events: none;
    transition: background 0.25s ease;
  }
  .bq-drawer-backdrop.is-open {
    background: rgba(0,0,0,0.45);
    pointer-events: auto;
  }
  .bq-drawer {
    display: flex;
    flex-direction: column;
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 82%;
    max-width: 340px;
    background: var(--bq-surface);
    z-index: 41;
    transform: translateX(100%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    padding: 18px 14px;
  }
  .bq-drawer.is-open {
    transform: translateX(0);
  }
}
.bq-drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid var(--bq-border);
}
.bq-drawer-title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--bq-text);
}
.bq-drawer-body {
  flex: 1;
  overflow-y: auto;
}
.bq-drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  border-radius: 10px;
  color: var(--bq-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  margin-bottom: 2px;
}
.bq-drawer-item:hover,
.bq-drawer-item:active {
  background: var(--bq-primary-soft);
  color: var(--bq-primary-text);
}
.bq-drawer-item.is-active {
  background: var(--bq-primary-soft);
  color: var(--bq-primary-text);
  font-weight: 500;
}
.bq-drawer-item > span {
  flex: 1;
}
.bq-drawer-chevron {
  opacity: 0.4;
}

/* =========================================================================
   THEME OVERRIDES (Sub-commit 2D)
   --------------------------------------------------------------------------
   Aplica la paleta Atelier (magenta + crema + negro) a TODAS las pages
   Boutique que pasan por este shell. Forza overrides en utilidades Tailwind
   dark (slate-*, purple-*) sin tocar el JSX de cada page.
   ========================================================================= */

/* FONDOS DARK SLATE -> blancos/cremas */
.bq-pos-theme [class*="bg-gradient-to-br"][class*="from-slate"],
.bq-pos-theme [class*="bg-gradient-to-r"][class*="from-slate"],
.bq-pos-theme [class*="bg-gradient-to-bl"][class*="from-slate"] {
  background: #FAF7F2 !important;
}
.bq-pos-theme [class*="bg-slate-9"] {
  background-color: #FFFFFF !important;
}
.bq-pos-theme [class*="bg-slate-8"] {
  background-color: #FFFFFF !important;
}
.bq-pos-theme [class*="bg-slate-7"] {
  background-color: #FAF7F2 !important;
}
.bq-pos-theme [class*="bg-slate-6"] {
  background-color: #FAF7F2 !important;
}

/* FONDOS PURPLE -> magenta Atelier */
.bq-pos-theme [class*="bg-purple-6"] {
  background-color: #E91E63 !important;
  color: white !important;
}
.bq-pos-theme [class*="bg-purple-7"] {
  background-color: #C2185B !important;
  color: white !important;
}
.bq-pos-theme [class*="bg-purple-9"] {
  background-color: #FBEAF0 !important;
}
.bq-pos-theme [class*="bg-purple-6"] *,
.bq-pos-theme [class*="bg-purple-7"] * {
  color: white !important;
}

/* BORDES SLATE -> suaves */
.bq-pos-theme [class*="border-slate-7"],
.bq-pos-theme [class*="border-slate-6"],
.bq-pos-theme [class*="border-slate-5"] {
  border-color: rgba(0,0,0,0.1) !important;
}

/* BORDES PURPLE -> magenta */
.bq-pos-theme [class*="border-purple-4"],
.bq-pos-theme [class*="border-purple-5"] {
  border-color: #E91E63 !important;
}

/* TEXTOS SLATE -> oscuros / muted */
.bq-pos-theme [class*="text-slate-2"],
.bq-pos-theme [class*="text-slate-3"] {
  color: #1A1A1A !important;
}
.bq-pos-theme [class*="text-slate-4"],
.bq-pos-theme [class*="text-slate-5"],
.bq-pos-theme [class*="text-slate-6"] {
  color: #6B6B6B !important;
}

/* TEXT-WHITE: oscuro por default, blanco dentro de magenta */
.bq-pos-theme .text-white {
  color: #1A1A1A !important;
}
.bq-pos-theme [class*="bg-purple"] .text-white,
.bq-pos-theme [class*="bg-purple"].text-white,
.bq-pos-theme [class*="bg-purple"] {
  color: white !important;
}

/* TEXT PURPLE -> magenta accents */
.bq-pos-theme [class*="text-purple-3"],
.bq-pos-theme [class*="text-purple-4"] {
  color: #E91E63 !important;
}

/* RING / FOCUS -> magenta */
.bq-pos-theme [class*="ring-purple"],
.bq-pos-theme [class*="focus:ring-purple"],
.bq-pos-theme [class*="focus-visible:ring-purple"] {
  --tw-ring-color: #E91E63 !important;
}

/* INPUTS -> fondo blanco */
.bq-pos-theme input,
.bq-pos-theme textarea,
.bq-pos-theme select {
  background-color: white !important;
  color: #1A1A1A !important;
  border-color: rgba(0,0,0,0.1) !important;
}
.bq-pos-theme input::placeholder,
.bq-pos-theme textarea::placeholder {
  color: #9CA3AF !important;
}

/* HOVER STATES suaves */
.bq-pos-theme [class*="hover:bg-slate-7"]:hover,
.bq-pos-theme [class*="hover:bg-slate-8"]:hover {
  background-color: #F5F0E8 !important;
}
.bq-pos-theme [class*="hover:bg-purple-7"]:hover {
  background-color: #C2185B !important;
}

/* DIVIDERS / SEPARATORS */
.bq-pos-theme hr,
.bq-pos-theme [class*="divide-slate"] > * + * {
  border-color: rgba(0,0,0,0.08) !important;
}
`;
