import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Boxes,
  CheckCircle2,
  Cloud,
  CreditCard,
  FileText,
  Grid3x3,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  PanelLeft,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Store,
  Sun,
  Tags,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { NotificationBell } from "./NotificationBell";

type AppRole = "admin" | "cashier";
type ProgramCode = "boutique" | "abarrotes" | "celine";

type MenuSection = "principal" | "operacion" | "administracion" | "cuenta";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  section: MenuSection;
  roles?: AppRole[];
  program?: ProgramCode;
};

const sectionLabels: Record<MenuSection, string> = {
  principal: "Principal",
  operacion: "Operación",
  administracion: "Administración",
  cuenta: "Cuenta",
};

const menuItems: MenuItem[] = [
  { icon: Grid3x3, label: "Centro Cyberpiezas", path: "/cyberpiezas", section: "principal" },
  { icon: ShoppingCart, label: "Punto de Venta", path: "/pos", section: "principal", program: "boutique" },
  { icon: ReceiptText, label: "Ventas", path: "/sales", section: "operacion", program: "boutique" },
  { icon: Package, label: "Productos", path: "/products", section: "operacion", roles: ["admin", "cashier"], program: "boutique" },
  { icon: Tags, label: "Categorías", path: "/categories", section: "operacion", roles: ["admin", "cashier"], program: "boutique" },
  { icon: Boxes, label: "Variantes", path: "/variants", section: "operacion", roles: ["admin", "cashier"], program: "boutique" },
  { icon: Store, label: "Sucursales", path: "/branches", section: "operacion", roles: ["admin", "cashier"], program: "boutique" },
  { icon: Store, label: "Inventario", path: "/inventory-reports", section: "operacion", roles: ["admin", "cashier"], program: "boutique" },
  { icon: Bell, label: "Notificaciones", path: "/notifications", section: "administracion", program: "boutique" },
  { icon: Bell, label: "Preferencias de notificaciones", path: "/notifications/preferences", section: "administracion", program: "boutique" },
  { icon: CreditCard, label: "Planes y Acceso", path: "/plans", section: "cuenta" },
  { icon: CreditCard, label: "Mi Suscripción", path: "/subscription", section: "cuenta" },
  { icon: FileText, label: "Facturas y Pagos", path: "/billing", section: "cuenta" },
  { icon: CheckCircle2, label: "Revisión de Pagos", path: "/admin/payment-review", section: "administracion", roles: ["admin"] },
  { icon: Settings2, label: "Configuración", path: "/settings/pos-hardware", section: "cuenta", program: "boutique" },
  { icon: LayoutDashboard, label: "Dashboard interno", path: "/dashboard", section: "cuenta", roles: ["admin"], program: "boutique" },
  { icon: Cloud, label: "Sincronización Offline", path: "/settings/offline-sync", section: "cuenta", program: "boutique" },
  { icon: CheckCircle2, label: "Términos y Condiciones", path: "/terms", section: "cuenta" },
];

export function filterMenuItemsByAccess(
  user: { role?: string | null; programAccess?: Array<{ programCode: ProgramCode; status: string }> } | null | undefined,
) {
  if (!user) return [] as MenuItem[];

  const activePrograms = new Set(
    (user.programAccess ?? [])
      .filter((item) => item.status === "active")
      .map((item) => item.programCode),
  );

  return menuItems.filter((item) => {
    if (item.roles && !item.roles.includes(user.role as AppRole)) {
      return false;
    }

    if (!item.program) {
      return true;
    }

    if (user.role === "admin") {
      return true;
    }

    return activePrograms.has(item.program);
  });
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const TERMS_ACCEPTED_KEY = "boutique-pos-terms-accepted";
const SIDEBAR_PALETTE_KEY = "boutique-pos-sidebar-palette";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

type SidebarPalette = "violet" | "midnight" | "emerald";

const sidebarPaletteClasses: Record<SidebarPalette, string> = {
  violet: "border-r border-sidebar-border/60 bg-gradient-to-b from-primary via-primary/95 to-primary/90 text-white shadow-lg",
  midnight: "border-r border-slate-900/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg",
  emerald: "border-r border-emerald-950/30 bg-gradient-to-b from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const saved = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Accede a tu panel
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Inicia sesión para administrar ventas, inventario, sucursales y operaciones de tu negocio desde un solo lugar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full"
          >
            Entrar al sistema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();
  const brandingQuery = trpc.branding.getActive.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TERMS_ACCEPTED_KEY) === "true";
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sidebarPalette, setSidebarPalette] = useState<SidebarPalette>(() => {
    if (typeof window === "undefined") return "violet";
    const saved = window.localStorage.getItem(SIDEBAR_PALETTE_KEY);
    return saved === "midnight" || saved === "emerald" || saved === "violet" ? saved : "violet";
  });

  const branding = brandingQuery.data ?? {
    appTitle: "Boutique POS",
    appSubtitle: "Centro de operación",
    bannerImageUrl: null,
    bannerAltText: null,
  };

  const visibleMenuItems = useMemo(() => {
    return filterMenuItemsByAccess(
      user as { role?: string | null; programAccess?: Array<{ programCode: ProgramCode; status: string }> } | null | undefined,
    );
  }, [user]);

  const visibleMenuGroups = useMemo(() => {
    return (["principal", "operacion", "administracion", "cuenta"] as MenuSection[])
      .map((section) => ({
        section,
        label: sectionLabels[section],
        items: visibleMenuItems.filter((item) => item.section === section),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleMenuItems]);

  const activeMenuItem = visibleMenuGroups.flatMap(group => group.items).find(item => location === item.path);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasAcceptedTerms(window.localStorage.getItem(TERMS_ACCEPTED_KEY) === "true");
    }
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPalette = () => {
      const saved = window.localStorage.getItem(SIDEBAR_PALETTE_KEY);
      if (saved === "midnight" || saved === "emerald" || saved === "violet") {
        setSidebarPalette(saved);
      }
    };

    window.addEventListener("storage", syncPalette);
    window.addEventListener("boutique-pos:sidebar-palette-change", syncPalette as EventListener);

    return () => {
      window.removeEventListener("storage", syncPalette);
      window.removeEventListener("boutique-pos:sidebar-palette-change", syncPalette as EventListener);
    };
  }, []);

  const handleAcceptTerms = () => {
    if (!termsChecked) return;
    window.localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    setHasAcceptedTerms(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className={sidebarPaletteClasses[sidebarPalette]} disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-white/10">
            <div className="flex w-full items-center gap-3 px-2 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Alternar navegación"
              >
                <PanelLeft className="h-4 w-4 text-white/80" />
              </button>
              {!isCollapsed ? (
                <div className="min-w-0">
                  <span className="block truncate font-semibold tracking-tight text-white">
                      {branding.appTitle}

                  </span>
                  <span className="block text-xs text-white/60">
                      {branding.appSubtitle || "Centro de operación"}

                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-3">
            <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Vista actual</p>
                <p className="mt-2 text-sm font-medium text-white">{activeMenuItem?.label ?? "Módulo principal"}</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Navegación organizada por áreas para mantener operación, administración y cuenta siempre visibles.</p>
              </div>
            </div>
            {visibleMenuGroups.map((group) => (
              <div key={group.section} className="px-2 py-1.5">
                <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40 group-data-[collapsible=icon]:hidden">
                  {group.label}
                </div>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-11 rounded-xl border font-normal text-white/80 transition-all duration-200 hover:text-white hover:scale-105 ${
                            isActive
                              ? "border-white/25 bg-white/20 text-white shadow-lg backdrop-blur-sm"
                              : "border-transparent hover:border-white/15 hover:bg-white/15 hover:shadow-md"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-white/70"}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <Avatar className="h-9 w-9 shrink-0 border border-white/20">
                    <AvatarFallback className="bg-white/10 text-xs font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none text-white">
                      {user?.name || "Usuario"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-white/60">
                      {user?.email || "Sin correo"}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
                      {user?.role === "admin" ? "Administrador" : "Cajero"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation("/settings/pos-hardware")} className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span>Ir a configuración</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <div className="flex h-14 items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2">
              {isMobile ? (
                <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              ) : null}
              <div className="flex flex-col gap-1">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Módulo principal"}
                </span>
                <span className="hidden text-xs text-muted-foreground md:block">
                  Gestión centralizada para ventas, inventario y operación diaria.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {switchable ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              ) : null}
              <NotificationBell />
            </div>
          </div>
        </div>
        <main className="flex-1 flex flex-col p-4 md:p-6">
          <div className="flex-1">{children}</div>
          <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            <p>© 2026 <span className="font-semibold text-foreground">CyberPiezas</span>. Todos los derechos reservados.</p>
            <p className="mt-1">{branding.appTitle} - Licencia Exclusiva</p>
            <p className="mt-2 text-[10px]">
              <a href="/terms" className="hover:text-foreground transition-colors">Términos y Condiciones</a>
              {" "} | {" "}
              <a href="/terms" className="hover:text-foreground transition-colors">Derechos de Autor</a>
            </p>
          </footer>
        </main>
      </SidebarInset>

      {!hasAcceptedTerms && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Acción requerida</p>
              <h2 className="text-2xl font-bold text-foreground">Debes aceptar los términos y condiciones para continuar</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Antes de seguir usando Boutique POS, confirma que aceptas las reglas de uso, restricciones de licencia y condiciones legales del sistema.
              </p>
            </div>
            <div className="mt-5 max-h-64 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-foreground">
              <p><strong>Resumen:</strong> tu cuenta es personal e intransferible, no puedes revender el sistema, no puedes compartir accesos y el uso debe ser únicamente comercial y legítimo.</p>
              <p className="mt-3">El incumplimiento puede causar suspensión o revocación de licencias. Si deseas revisar el documento completo, abre <a href="/terms" className="font-semibold text-primary underline">Términos y Condiciones</a>.</p>
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-border p-4 text-sm text-foreground">
              <Checkbox checked={termsChecked} onCheckedChange={(checked) => setTermsChecked(Boolean(checked))} className="mt-1" />
              <span>Acepto los términos y condiciones de Boutique POS y entiendo las restricciones de licencia, acceso y comercialización.</span>
            </label>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setLocation("/terms")}>Leer documento completo</Button>
              <Button onClick={handleAcceptTerms} disabled={!termsChecked}>Aceptar y continuar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
