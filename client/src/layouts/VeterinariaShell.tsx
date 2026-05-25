// =============================================================================
// VeterinariaShell - Layout responsive para Veterinaria POS
// -----------------------------------------------------------------------------
// Comportamiento adaptativo:
//   - Desktop (>1024px): sidebar izquierda expandida con todos los items
//   - Tablet (768-1024px): sidebar colapsada a rail de solo iconos
//   - Mobile (<768px): bottom tabs con 5 items + drawer "Mas" para resto
//
// Tema: Sage Garden (verde sage + naranja tierra + crema). Acogedor, calido.
//
// Patron: este Shell envuelve children. DashboardLayout detecta zona Veterinaria
// y delega aqui automaticamente. Cero cambio en pages individuales (VeterinariaPOS,
// vet-cajeros, vet-configuracion, etc.) - todas heredan el shell.
//
// Items reales del menu (mapeados de DashboardLayout original):
//   /veterinaria-pos             - Punto de Venta (Stethoscope)
//   /veterinaria-pos/mascotas    - Mascotas (PawPrint)
//   /veterinaria-pos/clientes    - Clientes (UserCircle)
//   /veterinaria-pos/citas       - Citas (Calendar)
//   /veterinaria-pos/productos   - Productos (Package)
//   /veterinaria-pos/servicios   - Servicios (Syringe)
//   /vet-configuracion           - Configuracion clinica (Settings)
//   /vet-cajeros                 - Cajeros y Usuarios (Users)
//   /vet-suscripcion             - Mi Suscripcion (Crown)
//   /sistemas                    - Centro Cyberpiezas (Building - global)
//   /notifications               - Notificaciones (Bell - global)
// =============================================================================

import { useState, useEffect, useMemo, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Stethoscope,
  PawPrint,
  UserCircle,
  Calendar,
  Package,
  Syringe,
  Settings,
  Users,
  Crown,
  Building,
  Bell,
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
      { id: "inicio", label: "Inicio", icon: Stethoscope, path: "/veterinaria-pos" },
      { id: "caja", label: "Caja registradora", icon: Syringe, path: "/veterinaria-pos/caja" },
      { id: "sistemas", label: "Centro Cyberpiezas", icon: Building, path: "/sistemas" },
    ],
  },
  {
    title: "Operacion",
    items: [
      { id: "mascotas", label: "Mascotas", icon: PawPrint, path: "/veterinaria-pos/mascotas" },
      { id: "clientes", label: "Clientes", icon: UserCircle, path: "/veterinaria-pos/clientes" },
      { id: "citas", label: "Citas", icon: Calendar, path: "/veterinaria-pos/citas" },
      { id: "productos", label: "Productos", icon: Package, path: "/veterinaria-pos/productos" },
      { id: "servicios", label: "Servicios", icon: Syringe, path: "/veterinaria-pos/servicios" },
    ],
  },
  {
    title: "Administracion",
    items: [
      { id: "notifications", label: "Notificaciones", icon: Bell, path: "/vet-notificaciones" },
      { id: "config", label: "Configuracion clinica", icon: Settings, path: "/vet-configuracion" },
      { id: "cajeros", label: "Cajeros y usuarios", icon: Users, path: "/vet-cajeros" },
      { id: "mis-subs", label: "Mis suscripciones", icon: Users, path: "/vet-mis-suscripciones" },
      { id: "suscripcion", label: "Mi suscripcion", icon: Crown, path: "/vet-suscripcion" },
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
  { id: "inicio", label: "Inicio", icon: Stethoscope, path: "/veterinaria-pos" },
  { id: "mascotas", label: "Mascotas", icon: PawPrint, path: "/veterinaria-pos/mascotas" },
  { id: "caja-main", label: "Cobrar", icon: Plus, path: "/veterinaria-pos/caja", isMain: true },
  { id: "citas", label: "Citas", icon: Calendar, path: "/veterinaria-pos/citas" },
  { id: "more", label: "Mas", icon: Menu, path: null },
];

// =============================================================================
// THEME: Sage Garden (verde sage + naranja tierra + crema)
// Acogedor y calido. Adecuado para clinica veterinaria de barrio.
// =============================================================================

const SAGE_THEME = {
  "--vt-primary": "#5A8B5A",
  "--vt-primary-dark": "#466F46",
  "--vt-primary-soft": "#E8F0E8",
  "--vt-primary-text": "#2D5A2D",
  "--vt-accent": "#E8A87C",
  "--vt-accent-dark": "#C68B5F",
  "--vt-deep": "#2D3B2D",
  "--vt-surface": "#FFFFFF",
  "--vt-card-bg": "#F4F0E8",
  "--vt-text": "#2D3B2D",
  "--vt-text-muted": "#6B7A6B",
  "--vt-border": "rgba(45,59,45,0.1)",
  "--vt-good": "#5A8B5A",
} as React.CSSProperties;

// =============================================================================
// COMPONENT
// =============================================================================

export default function VeterinariaShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cerrar drawer al cambiar de ruta
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

  const userRole = user?.role === "admin" ? "Admin" : "Doctor";

  const navigate = (path: string) => {
    setLocation(path);
    setDrawerOpen(false);
  };

  const isActiveRoute = (path: string) => {
    if (path === "/veterinaria-pos") {
      return location === "/veterinaria-pos";
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
    <div className="veterinaria-shell" style={SAGE_THEME}>
      <style>{VETERINARIA_SHELL_STYLES}</style>

      {/* HEADER STICKY */}
      <header className="vt-header" role="banner">
        <button
          className="vt-logo"
          onClick={() => navigate("/veterinaria-pos")}
          aria-label="Ir a inicio Veterinaria"
        >
          <div className="vt-logo-dot">
            <PawPrint size={16} strokeWidth={2.5} />
          </div>
          <div className="vt-logo-text">Veterinaria</div>
        </button>
        <div className="vt-header-actions">
          <button className="vt-icon-btn" aria-label="Buscar" onClick={() => navigate("/veterinaria-pos/mascotas")}>
            <Search size={18} />
          </button>
          <button
            className="vt-icon-btn"
            aria-label="Notificaciones"
            onClick={() => navigate("/vet-notificaciones")}
          >
            <Bell size={18} />
            <span className="vt-badge" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="vt-layout">
        {/* SIDEBAR (desktop expandida + tablet rail) */}
        <aside className="vt-sidebar" aria-label="Navegacion lateral">
          <button
            className="vt-cta"
            onClick={() => navigate("/veterinaria-pos/caja")}
            aria-label="Ir a la caja registradora"
          >
            <Plus size={18} />
            <span>Cobrar</span>
          </button>

          <div className="vt-menu-scroll">
            {MENU_SECTIONS.map((section) => (
              <div key={section.title} className="vt-menu-group">
                <div className="vt-section">{section.title}</div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.path);
                  return (
                    <button
                      key={item.id}
                      className={`vt-menu-item ${active ? "is-active" : ""}`}
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

          <button className="vt-user-pill" aria-label="Mi perfil">
            <div className="vt-user-avatar">{userInitial}</div>
            <div className="vt-user-info">
              <div className="vt-user-name">{userName}</div>
              <div className="vt-user-role">{userRole}</div>
            </div>
          </button>
        </aside>

        {/* MAIN CONTENT - con tema sage aplicado a todas las pages Veterinaria */}
        <main className="vt-main vt-pos-theme" role="main">
          {children}
        </main>
      </div>

      {/* BOTTOM NAV (solo mobile) */}
      <nav className="vt-bottom-nav" aria-label="Navegacion principal mobile">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          if (tab.id === "more") {
            return (
              <button
                key={tab.id}
                className="vt-tab"
                onClick={() => setDrawerOpen(true)}
                aria-label="Mas opciones"
                aria-expanded={drawerOpen}
              >
                <Icon size={20} />
                <span className="vt-tab-label">{tab.label}</span>
              </button>
            );
          }
          const active = tab.path ? isActiveRoute(tab.path) : false;
          return (
            <button
              key={tab.id}
              className={`vt-tab ${tab.isMain ? "is-main" : ""} ${active ? "is-active" : ""}`}
              onClick={() => tab.path && navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={tab.isMain ? 22 : 20} />
              <span className="vt-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* DRAWER "Mas" (solo mobile, animado) */}
      <div
        className={`vt-drawer-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`vt-drawer ${drawerOpen ? "is-open" : ""}`}
        aria-label="Menu adicional"
        aria-hidden={!drawerOpen}
      >
        <div className="vt-drawer-head">
          <div className="vt-drawer-title">Mas opciones</div>
          <button
            className="vt-icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="vt-drawer-body">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.path);
            return (
              <button
                key={item.id}
                className={`vt-drawer-item ${active ? "is-active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <ChevronRight size={14} className="vt-drawer-chevron" />
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

const VETERINARIA_SHELL_STYLES = `
.veterinaria-shell {
  min-height: 100vh;
  background: var(--vt-card-bg);
  color: var(--vt-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.vt-header {
  background: var(--vt-surface);
  border-bottom: 0.5px solid var(--vt-border);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 30;
}
.vt-logo {
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
.vt-logo:hover {
  background: var(--vt-card-bg);
}
.vt-logo-dot {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--vt-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vt-logo-text {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--vt-text);
}
.vt-header-actions {
  display: flex;
  gap: 8px;
}
.vt-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--vt-card-bg);
  border: none;
  color: var(--vt-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.vt-icon-btn:hover {
  background: var(--vt-primary-soft);
  color: var(--vt-primary-text);
}
.vt-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--vt-accent);
  border-radius: 50%;
  border: 1.5px solid var(--vt-surface);
}
.vt-layout {
  display: flex;
  min-height: calc(100vh - 60px);
}
.vt-sidebar {
  width: 230px;
  background: var(--vt-surface);
  border-right: 0.5px solid var(--vt-border);
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
.vt-cta {
  background: var(--vt-primary);
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
.vt-cta:hover {
  background: var(--vt-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(90,139,90,0.25);
}
.vt-menu-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
}
.vt-menu-group + .vt-menu-group {
  margin-top: 6px;
}
.vt-section {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--vt-text-muted);
  padding: 12px 8px 4px;
  font-weight: 500;
}
.vt-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--vt-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  margin-bottom: 1px;
}
.vt-menu-item:hover {
  background: var(--vt-primary-soft);
  color: var(--vt-primary-text);
}
.vt-menu-item.is-active {
  background: var(--vt-primary-soft);
  color: var(--vt-primary-text);
  font-weight: 500;
}
.vt-user-pill {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--vt-card-bg);
  border: 0.5px solid var(--vt-border);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}
.vt-user-pill:hover {
  border-color: var(--vt-primary);
}
.vt-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--vt-deep);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}
.vt-user-info {
  min-width: 0;
}
.vt-user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vt-text);
  line-height: 1.2;
}
.vt-user-role {
  font-size: 11px;
  color: var(--vt-text-muted);
  line-height: 1.2;
}
.vt-main {
  flex: 1;
  padding: 24px 28px;
  overflow-x: hidden;
  min-width: 0;
}
.vt-bottom-nav {
  display: none;
}
.vt-drawer-backdrop,
.vt-drawer {
  display: none;
}

/* TABLET: sidebar colapsada a rail */
@media (max-width: 1024px) {
  .vt-sidebar {
    width: 76px;
    padding: 16px 8px;
  }
  .vt-section,
  .vt-logo-text,
  .vt-user-info,
  .vt-menu-item span,
  .vt-cta span {
    display: none;
  }
  .vt-menu-item {
    justify-content: center;
    padding: 11px 8px;
  }
  .vt-cta {
    padding: 12px 8px;
  }
  .vt-user-pill {
    justify-content: center;
    padding: 8px;
  }
  .vt-main {
    padding: 20px 22px;
  }
}

/* MOBILE: sin sidebar, bottom nav fijo */
@media (max-width: 768px) {
  .vt-sidebar {
    display: none;
  }
  .vt-main {
    padding: 16px 14px 96px 14px;
  }
  .vt-header {
    padding: 10px 14px;
  }
  .vt-bottom-nav {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--vt-surface);
    border-top: 0.5px solid var(--vt-border);
    padding: 8px 6px 10px;
    z-index: 25;
    gap: 0;
  }
  .vt-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 2px;
    cursor: pointer;
    color: var(--vt-text-muted);
    background: none;
    border: none;
    transition: color 0.2s ease;
  }
  .vt-tab.is-active {
    color: var(--vt-primary);
  }
  .vt-tab-label {
    font-size: 10px;
    font-weight: 500;
  }
  .vt-tab.is-main {
    background: var(--vt-primary);
    color: white;
    border-radius: 14px;
    padding: 7px 4px 6px;
    margin-top: -10px;
    box-shadow: 0 6px 18px rgba(90,139,90,0.35);
  }
  .vt-tab.is-main .vt-tab-label {
    color: white;
  }
  .vt-tab.is-main:hover,
  .vt-tab.is-main:active {
    background: var(--vt-primary-dark);
    transform: scale(0.96);
  }
  .vt-drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(45,59,45,0.0);
    z-index: 40;
    pointer-events: none;
    transition: background 0.25s ease;
  }
  .vt-drawer-backdrop.is-open {
    background: rgba(45,59,45,0.45);
    pointer-events: auto;
  }
  .vt-drawer {
    display: flex;
    flex-direction: column;
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 82%;
    max-width: 340px;
    background: var(--vt-surface);
    z-index: 41;
    transform: translateX(100%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    padding: 18px 14px;
  }
  .vt-drawer.is-open {
    transform: translateX(0);
  }
}
.vt-drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid var(--vt-border);
}
.vt-drawer-title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--vt-text);
}
.vt-drawer-body {
  flex: 1;
  overflow-y: auto;
}
.vt-drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  border-radius: 10px;
  color: var(--vt-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  margin-bottom: 2px;
}
.vt-drawer-item:hover,
.vt-drawer-item:active {
  background: var(--vt-primary-soft);
  color: var(--vt-primary-text);
}
.vt-drawer-item.is-active {
  background: var(--vt-primary-soft);
  color: var(--vt-primary-text);
  font-weight: 500;
}
.vt-drawer-item > span {
  flex: 1;
}
.vt-drawer-chevron {
  opacity: 0.4;
}

/* =========================================================================
   THEME OVERRIDES PARA PAGES INTERNAS DE VETERINARIA
   --------------------------------------------------------------------------
   Aplica la paleta Sage (verde + crema + naranja tierra) a TODAS las pages
   Veterinaria que pasan por este shell. Forza overrides en utilidades Tailwind
   dark (slate-*) y purple/blue/indigo (acentos viejos) sin tocar el JSX de cada page.
   ========================================================================= */

/* FONDOS DARK SLATE -> blancos/cremas */
.vt-pos-theme [class*="bg-gradient-to-br"][class*="from-slate"],
.vt-pos-theme [class*="bg-gradient-to-r"][class*="from-slate"],
.vt-pos-theme [class*="bg-gradient-to-bl"][class*="from-slate"] {
  background: #F4F0E8 !important;
}
.vt-pos-theme [class*="bg-slate-9"] {
  background-color: #FFFFFF !important;
}
.vt-pos-theme [class*="bg-slate-8"] {
  background-color: #FFFFFF !important;
}
.vt-pos-theme [class*="bg-slate-7"] {
  background-color: #F4F0E8 !important;
}
.vt-pos-theme [class*="bg-slate-6"] {
  background-color: #F4F0E8 !important;
}

/* FONDOS PURPLE/BLUE/INDIGO -> verde sage */
.vt-pos-theme [class*="bg-purple-6"],
.vt-pos-theme [class*="bg-blue-6"],
.vt-pos-theme [class*="bg-indigo-6"] {
  background-color: #5A8B5A !important;
  color: white !important;
}
.vt-pos-theme [class*="bg-purple-7"],
.vt-pos-theme [class*="bg-blue-7"],
.vt-pos-theme [class*="bg-indigo-7"] {
  background-color: #466F46 !important;
  color: white !important;
}
.vt-pos-theme [class*="bg-purple-9"],
.vt-pos-theme [class*="bg-blue-9"],
.vt-pos-theme [class*="bg-indigo-9"] {
  background-color: #E8F0E8 !important;
}
.vt-pos-theme [class*="bg-purple-6"] *,
.vt-pos-theme [class*="bg-purple-7"] *,
.vt-pos-theme [class*="bg-blue-6"] *,
.vt-pos-theme [class*="bg-blue-7"] *,
.vt-pos-theme [class*="bg-indigo-6"] *,
.vt-pos-theme [class*="bg-indigo-7"] * {
  color: white !important;
}

/* BORDES SLATE -> suaves */
.vt-pos-theme [class*="border-slate-7"],
.vt-pos-theme [class*="border-slate-6"],
.vt-pos-theme [class*="border-slate-5"] {
  border-color: rgba(45,59,45,0.1) !important;
}

/* BORDES PURPLE/BLUE/INDIGO -> sage */
.vt-pos-theme [class*="border-purple-4"],
.vt-pos-theme [class*="border-purple-5"],
.vt-pos-theme [class*="border-blue-4"],
.vt-pos-theme [class*="border-blue-5"],
.vt-pos-theme [class*="border-indigo-4"],
.vt-pos-theme [class*="border-indigo-5"] {
  border-color: #5A8B5A !important;
}

/* TEXTOS SLATE -> oscuros / muted */
.vt-pos-theme [class*="text-slate-2"],
.vt-pos-theme [class*="text-slate-3"] {
  color: #2D3B2D !important;
}
.vt-pos-theme [class*="text-slate-4"],
.vt-pos-theme [class*="text-slate-5"],
.vt-pos-theme [class*="text-slate-6"] {
  color: #6B7A6B !important;
}

/* TEXT-WHITE: oscuro por default, blanco dentro de elementos sage */
.vt-pos-theme .text-white {
  color: #2D3B2D !important;
}
.vt-pos-theme [class*="bg-purple"] .text-white,
.vt-pos-theme [class*="bg-blue"] .text-white,
.vt-pos-theme [class*="bg-indigo"] .text-white,
.vt-pos-theme [class*="bg-purple"],
.vt-pos-theme [class*="bg-blue"],
.vt-pos-theme [class*="bg-indigo"] {
  color: white !important;
}

/* TEXT PURPLE/BLUE/INDIGO -> sage accents */
.vt-pos-theme [class*="text-purple-3"],
.vt-pos-theme [class*="text-purple-4"],
.vt-pos-theme [class*="text-blue-3"],
.vt-pos-theme [class*="text-blue-4"],
.vt-pos-theme [class*="text-indigo-3"],
.vt-pos-theme [class*="text-indigo-4"] {
  color: #5A8B5A !important;
}

/* RING / FOCUS -> sage */
.vt-pos-theme [class*="ring-purple"],
.vt-pos-theme [class*="ring-blue"],
.vt-pos-theme [class*="ring-indigo"],
.vt-pos-theme [class*="focus:ring-purple"],
.vt-pos-theme [class*="focus:ring-blue"],
.vt-pos-theme [class*="focus:ring-indigo"],
.vt-pos-theme [class*="focus-visible:ring-purple"],
.vt-pos-theme [class*="focus-visible:ring-blue"],
.vt-pos-theme [class*="focus-visible:ring-indigo"] {
  --tw-ring-color: #5A8B5A !important;
}

/* INPUTS -> fondo blanco con borde suave */
.vt-pos-theme input,
.vt-pos-theme textarea,
.vt-pos-theme select {
  background-color: white !important;
  color: #2D3B2D !important;
  border-color: rgba(45,59,45,0.1) !important;
}
.vt-pos-theme input::placeholder,
.vt-pos-theme textarea::placeholder {
  color: #9CA39C !important;
}

/* HOVER STATES suaves */
.vt-pos-theme [class*="hover:bg-slate-7"]:hover,
.vt-pos-theme [class*="hover:bg-slate-8"]:hover {
  background-color: #EBE5D8 !important;
}
.vt-pos-theme [class*="hover:bg-purple-7"]:hover,
.vt-pos-theme [class*="hover:bg-blue-7"]:hover,
.vt-pos-theme [class*="hover:bg-indigo-7"]:hover {
  background-color: #466F46 !important;
}

/* DIVIDERS / SEPARATORS */
.vt-pos-theme hr,
.vt-pos-theme [class*="divide-slate"] > * + * {
  border-color: rgba(45,59,45,0.08) !important;
}

/* =========================================================================
   FIX TEXTOS MUTED / FOREGROUND (Shadcn UI)
   --------------------------------------------------------------------------
   Forza contraste legible para textos que usan tokens semanticos de Shadcn
   (text-muted-foreground, text-foreground, etc.) que NO son slate-* y por
   tanto no caian en las reglas anteriores.
   ========================================================================= */
.vt-pos-theme .text-muted-foreground,
.vt-pos-theme [class*="text-muted-foreground"],
.vt-pos-theme [class*="text-foreground/"],
.vt-pos-theme [data-slot="card-description"] {
  color: #6B7A6B !important;
  opacity: 1 !important;
}
.vt-pos-theme .text-foreground,
.vt-pos-theme [data-slot="card-title"] {
  color: #2D3B2D !important;
}
.vt-pos-theme [class*="text-card-foreground"] {
  color: #2D3B2D !important;
}

/* Headings genericos dentro del POS - asegurar contraste */
.vt-pos-theme h1,
.vt-pos-theme h2,
.vt-pos-theme h3,
.vt-pos-theme h4 {
  color: #2D3B2D !important;
}

/* Botones outline / ghost que pueden tener texto claro */
.vt-pos-theme button[class*="variant-outline"],
.vt-pos-theme button[class*="variant-ghost"] {
  color: #2D3B2D !important;
}

/* =========================================================================
   FIX CONTRASTE TEXTOS PASTEL (B1 retrofit)
   --------------------------------------------------------------------------
   Los textos emerald/cyan/purple/rose/amber pastel quedaban casi invisibles
   sobre fondos crema (que el shell genera de bg-slate-* originales).
   Tambien los text-XXX-300/70 con opacidad reducida quedaban "lavados".
   Fix: forzar opacity 1 y mapear pasteles a tonos solidos legibles (WCAG AA).
   ========================================================================= */

/* 1. Eliminar opacidad reducida en textos de color (XXX/70, XXX/80) */
.vt-pos-theme [class*="text-emerald-"],
.vt-pos-theme [class*="text-cyan-"],
.vt-pos-theme [class*="text-purple-"],
.vt-pos-theme [class*="text-rose-"],
.vt-pos-theme [class*="text-amber-"],
.vt-pos-theme [class*="text-fuchsia-"],
.vt-pos-theme [class*="text-pink-"] {
  opacity: 1 !important;
}

/* 2. Textos verde/cyan pastel (100-400) -> sage oscuro legible sobre crema */
.vt-pos-theme [class*="text-emerald-100"],
.vt-pos-theme [class*="text-emerald-200"],
.vt-pos-theme [class*="text-emerald-300"],
.vt-pos-theme [class*="text-emerald-400"],
.vt-pos-theme [class*="text-cyan-100"],
.vt-pos-theme [class*="text-cyan-200"],
.vt-pos-theme [class*="text-cyan-300"],
.vt-pos-theme [class*="text-cyan-400"] {
  color: #466F46 !important;
}

/* 3. Textos purple pastel -> purple solido oscuro */
.vt-pos-theme [class*="text-purple-100"],
.vt-pos-theme [class*="text-purple-200"] {
  color: #6B4F8A !important;
}

/* 4. Textos rose pastel -> rose solido oscuro */
.vt-pos-theme [class*="text-rose-200"],
.vt-pos-theme [class*="text-rose-300"],
.vt-pos-theme [class*="text-rose-400"] {
  color: #BE2E5A !important;
}

/* 5. Textos amber pastel -> naranja tierra (cohesion con tema sage) */
.vt-pos-theme [class*="text-amber-100"],
.vt-pos-theme [class*="text-amber-200"],
.vt-pos-theme [class*="text-amber-300"] {
  color: #B8741C !important;
}

/* 6. Textos fuchsia/pink pastel -> magenta oscuro */
.vt-pos-theme [class*="text-fuchsia-200"],
.vt-pos-theme [class*="text-fuchsia-300"],
.vt-pos-theme [class*="text-pink-200"],
.vt-pos-theme [class*="text-pink-300"] {
  color: #B5358E !important;
}

/* 7. text-slate-100 que se quedaba casi blanco sobre crema */
.vt-pos-theme [class*="text-slate-100"] {
  color: #2D3B2D !important;
}

/* 8. EXCEPCION: restaurar texto claro dentro de fondos sage/sólidos
      (algunos badges y botones tienen bg sage solido y necesitan texto blanco) */
.vt-pos-theme [class*="bg-emerald-5"]:not([class*="/"]) *,
.vt-pos-theme [class*="bg-emerald-6"]:not([class*="/"]) *,
.vt-pos-theme [class*="bg-emerald-7"]:not([class*="/"]) * {
  color: white !important;
}

/* 9. Placeholder de inputs con mejor contraste */
.vt-pos-theme input::placeholder,
.vt-pos-theme textarea::placeholder {
  color: #6B7A6B !important;
}`;
