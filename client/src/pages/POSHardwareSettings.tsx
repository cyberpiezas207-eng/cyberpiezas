import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  buildReceiptHtml,
  defaultConfig,
  emitBarcodeScanned,
  emitCashDrawerOpen,
  getPosHardwareConfig,
  savePosHardwareConfig,
  type HardwareConfig,
  type ScannerSuffix,
} from "@/lib/posHardware";
import { getActivePosBranchId, saveActivePosBranchId } from "@/lib/posAdminPreferences";
import { BellRing, Building2, ImagePlus, Keyboard, LayoutDashboard, Palette, Printer, Receipt, ScanLine, Settings2, ShieldCheck, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";

const SIDEBAR_PALETTE_KEY = "boutique-pos-sidebar-palette";
type SidebarPalette = "violet" | "midnight" | "emerald";

const sidebarPreviewClasses: Record<SidebarPalette, string> = {
  violet: "border-primary/25 bg-gradient-to-br from-fuchsia-600 via-violet-700 to-indigo-700 text-white",
  midnight: "border-slate-900/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 text-white",
  emerald: "border-emerald-900/30 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white",
};

export default function POSHardwareSettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const branchesQuery = trpc.branches.list.useQuery();
  const brandingQuery = trpc.branding.getActive.useQuery();
  const initInventoryMutation = trpc.inventory.initializeMissingBranchInventory.useMutation();
  const updateBrandingMutation = trpc.branding.update.useMutation();
  const trpcUtils = trpc.useUtils();

  const [config, setConfig] = useState<HardwareConfig>(defaultConfig);
  const [scannerBuffer, setScannerBuffer] = useState("");
  const [lastCapturedCode, setLastCapturedCode] = useState("");
  const [activeBranchId, setActiveBranchId] = useState("");
  const [appTitle, setAppTitle] = useState("Boutique POS");
  const [appSubtitle, setAppSubtitle] = useState("Centro de operación");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerAltText, setBannerAltText] = useState("");
  const [bannerUpload, setBannerUpload] = useState<{ fileBase64: string; fileName: string; mimeType: string } | null>(null);
  const [sidebarPalette, setSidebarPalette] = useState<SidebarPalette>(() => {
    if (typeof window === "undefined") return "violet";
    const saved = window.localStorage.getItem(SIDEBAR_PALETTE_KEY);
    return saved === "midnight" || saved === "emerald" || saved === "violet" ? saved : "violet";
  });

  useEffect(() => {
    setConfig(getPosHardwareConfig());
    const savedBranchId = getActivePosBranchId();
    setActiveBranchId(savedBranchId ? String(savedBranchId) : "");
  }, []);

  useEffect(() => {
    if (!brandingQuery.data) return;
    setAppTitle(brandingQuery.data.appTitle || "Boutique POS");
    setAppSubtitle(brandingQuery.data.appSubtitle || "Centro de operación");
    setBannerImageUrl(brandingQuery.data.bannerImageUrl || "");
    setBannerAltText(brandingQuery.data.bannerAltText || "");
  }, [brandingQuery.data]);

  useEffect(() => {
    savePosHardwareConfig(config);
  }, [config]);

  useEffect(() => {
    if (!branchesQuery.data?.length) return;

    const savedBranchId = getActivePosBranchId();
    const matchingBranch = savedBranchId
      ? branchesQuery.data.find((branch) => branch.id === savedBranchId)
      : null;
    const fallbackBranch = matchingBranch ?? branchesQuery.data[0];

    if (fallbackBranch && activeBranchId !== String(fallbackBranch.id)) {
      setActiveBranchId(String(fallbackBranch.id));
    }

    if (fallbackBranch && fallbackBranch.id !== savedBranchId) {
      saveActivePosBranchId(fallbackBranch.id);
    }
  }, [activeBranchId, branchesQuery.data]);

  useEffect(() => {
    if (!config.barcodeScannerEnabled || typeof window === "undefined") return;

    const finalizeBufferedScan = () => {
      const detectedCode = scannerBuffer.trim();
      if (!detectedCode) return;
      setLastCapturedCode(detectedCode);
      emitBarcodeScanned({ code: detectedCode, source: "keyboard-wedge" });
      toast.success(`Código detectado: ${detectedCode}`);
      setScannerBuffer("");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingField = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (isTypingField) return;

      if (event.key === "Enter" && config.scannerSuffix === "enter") {
        finalizeBufferedScan();
        return;
      }

      if (event.key === "Tab" && config.scannerSuffix === "tab") {
        finalizeBufferedScan();
        return;
      }

      if (event.key.length === 1) {
        setScannerBuffer((current) => `${current}${event.key}`.slice(-64));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.barcodeScannerEnabled, config.scannerSuffix, scannerBuffer]);

  const readiness = useMemo(() => {
    const printerReady = config.thermalPrintingEnabled && config.autoPrintOnSale;
    const drawerReady = config.cashDrawerEnabled && config.openDrawerAfterCashSale;
    const scannerReady = config.barcodeScannerEnabled;

    if (printerReady && drawerReady && scannerReady) {
      return { label: "Listo para operación", variant: "default" as const };
    }

    if (config.thermalPrintingEnabled || config.cashDrawerEnabled || config.barcodeScannerEnabled) {
      return { label: "Configuración parcial", variant: "secondary" as const };
    }

    return { label: "Pendiente", variant: "outline" as const };
  }, [config]);

  const activeBranchName = useMemo(() => {
    return branchesQuery.data?.find((branch) => branch.id === Number(activeBranchId))?.name ?? "Sin definir";
  }, [activeBranchId, branchesQuery.data]);

  const canManageBusiness = user?.role === "admin";

  const handleSidebarPaletteChange = (palette: SidebarPalette) => {
    setSidebarPalette(palette);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_PALETTE_KEY, palette);
      window.dispatchEvent(new CustomEvent("boutique-pos:sidebar-palette-change"));
    }
    toast.success("Color lateral actualizado");
  };

  const updateConfig = <K extends keyof HardwareConfig>(key: K, value: HardwareConfig[K]) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    savePosHardwareConfig(updated);
  };

  const handleBranchChange = (branchId: string) => {
    setActiveBranchId(branchId);
    saveActivePosBranchId(Number(branchId));
    const branchName = branchesQuery.data?.find((branch) => branch.id === Number(branchId))?.name ?? "Sucursal seleccionada";
    toast.success(`Sucursal operativa actualizada a ${branchName}`);
    savePosHardwareConfig(config);
  };

  const handleBannerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setBannerUpload({
        fileBase64: result,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
      });
      setBannerImageUrl(result);
      if (!bannerAltText) {
        setBannerAltText(`Banner de ${appTitle || "Boutique POS"}`);
      }
      toast.success("Banner listo para guardarse en la configuración.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    if (!canManageBusiness) {
      toast.error("Solo el administrador principal puede cambiar el branding del sistema.");
      return;
    }

    updateBrandingMutation.mutate(
      {
        appTitle,
        appSubtitle,
        bannerAltText,
        bannerImageUrl: bannerUpload ? undefined : bannerImageUrl || undefined,
        bannerFileBase64: bannerUpload?.fileBase64,
        bannerFileName: bannerUpload?.fileName,
        bannerMimeType: bannerUpload?.mimeType,
      },
      {
        onSuccess: async () => {
          setBannerUpload(null);
          await trpcUtils.branding.getActive.invalidate();
          toast.success("Branding actualizado correctamente.");
        },
        onError: (error) => {
          toast.error(`No se pudo guardar el branding: ${error.message}`);
        },
      },
    );
  };

  const handlePrintTest = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión de prueba");
      return;
    }

    printWindow.document.write(buildReceiptHtml(config));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success("Se envió un ticket de prueba al navegador");
  };

  const handleDrawerTest = () => {
    if (!config.cashDrawerEnabled) {
      toast.error("Activa primero la opción de cajón de dinero");
      return;
    }

    emitCashDrawerOpen({ reason: "manual-test" });
    toast.success("Se emitió el evento compatible de apertura de cajón para pruebas locales o middleware");
  };

  const handleSimulateScan = () => {
    const code = `75010${Math.floor(Math.random() * 900000 + 100000)}`;
    setLastCapturedCode(code);
    emitBarcodeScanned({ code, source: "simulated" });
    toast.success(`Lectura simulada: ${code}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/70">Administración del POS</p>
            <h1 className="mt-2 text-4xl font-bold text-primary">Configuración</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Aquí se concentra la sucursal operativa del punto de venta, los periféricos de caja y la configuración práctica del negocio, incluyendo impresoras genéricas de 58mm u 80mm.
            </p>
          </div>
          <Badge variant={readiness.variant} className="w-fit px-4 py-2 text-sm">
            {readiness.label}
          </Badge>
        </div>

        <Alert>
          <BellRing className="h-4 w-4" />
          <AlertTitle>{canManageBusiness ? "Configuración del negocio" : "Configuración con alcance limitado"}</AlertTitle>
          <AlertDescription>
            {canManageBusiness
              ? "Desde aquí puedes revisar sucursal, hardware POS, impresión, escáner, conexión operativa y accesos rápidos para administrar tu negocio."
              : "Los cajeros pueden consultar la configuración local del equipo, pero los cambios sensibles del negocio siguen reservados para el administrador."}
          </AlertDescription>
        </Alert>

        {canManageBusiness ? (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ImagePlus className="h-5 w-5" />
                Branding administrativo
              </CardTitle>
              <CardDescription>
                Cambia el título visible del programa, define un subtítulo y administra un banner para el panel del administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-title">Título del programa</Label>
                  <Input id="app-title" value={appTitle} onChange={(event) => setAppTitle(event.target.value)} placeholder="Ej. Boutique POS Deivid" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-subtitle">Subtítulo del programa</Label>
                  <Input id="app-subtitle" value={appSubtitle} onChange={(event) => setAppSubtitle(event.target.value)} placeholder="Ej. Centro de operación y control" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-url">URL del banner</Label>
                  <Input
                    id="banner-url"
                    value={bannerImageUrl}
                    onChange={(event) => {
                      setBannerImageUrl(event.target.value);
                      setBannerUpload(null);
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-upload">O subir banner</Label>
                  <Input id="banner-upload" type="file" accept="image/*" onChange={handleBannerFileChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-alt">Texto alternativo del banner</Label>
                  <Input id="banner-alt" value={bannerAltText} onChange={(event) => setBannerAltText(event.target.value)} placeholder="Banner principal del sistema" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={handleSaveBranding} disabled={updateBrandingMutation.isPending} className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    {updateBrandingMutation.isPending ? "Guardando..." : "Guardar branding"}
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Abrir dashboard interno
                  </Button>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
                <p className="text-sm font-semibold text-foreground">Vista previa administrativa</p>
                {bannerImageUrl ? (
                  <img src={bannerImageUrl} alt={bannerAltText || appTitle} className="h-40 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center text-sm text-muted-foreground">
                    Tu banner aparecerá aquí cuando captures una URL o subas una imagen.
                  </div>
                )}
                <div className="rounded-xl bg-background p-4 shadow-sm">
                  <p className="text-lg font-semibold text-foreground">{appTitle || "Boutique POS"}</p>
                  <p className="text-sm text-muted-foreground">{appSubtitle || "Centro de operación"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="border-border shadow-sm xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Palette className="h-5 w-5" />
                Color lateral del sistema
              </CardTitle>
              <CardDescription>
                Ajusta el menú izquierdo para que Boutique POS se sienta más cómodo visualmente en tu mostrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { value: "violet", label: "Violeta comercial", classes: "from-primary via-fuchsia-600 to-violet-700" },
                { value: "midnight", label: "Negro elegante", classes: "from-slate-950 via-slate-900 to-slate-800" },
                { value: "emerald", label: "Verde mostrador", classes: "from-emerald-600 via-emerald-700 to-teal-800" },
              ].map((palette) => (
                <button
                  key={palette.value}
                  type="button"
                  onClick={() => handleSidebarPaletteChange(palette.value as SidebarPalette)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all ${sidebarPalette === palette.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{palette.label}</p>
                    <p className="text-xs text-muted-foreground">Aplicación inmediata en el menú izquierdo</p>
                  </div>
                  <span className={`h-10 w-16 rounded-xl bg-gradient-to-r ${palette.classes}`} />
                </button>
              ))}
              <div className={`rounded-2xl border p-4 shadow-sm ${sidebarPreviewClasses[sidebarPalette]}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Vista previa aplicada</p>
                <p className="mt-2 text-lg font-semibold">{sidebarPalette === "violet" ? "Violeta comercial" : sidebarPalette === "midnight" ? "Negro elegante" : "Verde mostrador"}</p>
                <p className="mt-1 text-sm text-white/80">Este es el color que debe verse de inmediato en el menú lateral izquierdo en todo el panel.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                Sucursal operativa
              </CardTitle>
              <CardDescription>
                Define qué sucursal usará el punto de venta para inventario, variantes y ventas del administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="active-branch">Sucursal activa para POS</Label>
                <select
                  id="active-branch"
                  value={activeBranchId}
                  onChange={(event) => handleBranchChange(event.target.value)}
                  disabled={!canManageBusiness}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {(branchesQuery.data ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Sucursal actual</p>
                <p className="mt-1">{activeBranchName}</p>
                <p className="mt-3">
                  Los cajeros seguirán atados a su sucursal asignada. Este ajuste impacta solo la operación del administrador dentro del punto de venta.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setLocation("/branches")} className="gap-2" disabled={!canManageBusiness}>
                  <Building2 className="h-4 w-4" />
                  Sucursales
                </Button>
                <Button variant="outline" onClick={() => setLocation("/users")} className="gap-2" disabled={!canManageBusiness}>
                  <Users className="h-4 w-4" />
                  Cajeros y usuarios internos
                </Button>
                <Button variant="outline" onClick={() => setLocation("/products")} className="gap-2" disabled={!canManageBusiness}>
                  <Printer className="h-4 w-4" />
                  Productos
                </Button>
                <Button variant="outline" onClick={() => setLocation("/settings/offline-sync")} className="gap-2">
                  <BellRing className="h-4 w-4" />
                  Conectar celular / offline
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Este acceso es solo para administración interna del negocio. Los cajeros no pueden cambiar personal ni permisos desde aquí.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                Permisos del sistema
              </CardTitle>
              <CardDescription>
                Resumen operativo de qué puede hacer cada rol dentro del sistema y en la caja.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Administrador
                </div>
                <p>Puede cambiar la sucursal operativa, administrar hardware POS, usuarios, sucursales, productos, inventario y revisar pagos.</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Cajero
                </div>
                <p>Puede operar ventas, consultar historial y trabajar únicamente con la sucursal asignada por el administrador.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="border-border shadow-sm xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Printer className="h-5 w-5" />
                Impresión térmica
              </CardTitle>
              <CardDescription>
                Prepara tickets de 58 mm u 80 mm y automatiza la impresión al cerrar una venta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Habilitar impresora térmica</Label>
                  <p className="text-sm text-muted-foreground">Activa el uso de tickets térmicos en el POS.</p>
                </div>
                <Switch checked={config.thermalPrintingEnabled} onCheckedChange={(checked) => updateConfig("thermalPrintingEnabled", checked)} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Impresión automática</Label>
                  <p className="text-sm text-muted-foreground">Lanza el ticket justo después de registrar la venta.</p>
                </div>
                <Switch
                  checked={config.autoPrintOnSale}
                  onCheckedChange={(checked) => updateConfig("autoPrintOnSale", checked)}
                  disabled={!config.thermalPrintingEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="printer-name">Nombre de impresora preferido</Label>
                <Input
                  id="printer-name"
                  value={config.preferredPrinterName}
                  onChange={(event) => updateConfig("preferredPrinterName", event.target.value)}
                  placeholder="Ej. Genérica 58mm, Xprinter, Epson TM-T20III"
                />
                <p className="text-xs text-muted-foreground">
                  Puedes escribir cualquier modelo. Si tu impresora es genérica, basta con indicar el nombre que tú uses para reconocerla.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt-paper-width">Formato del ticket</Label>
                <select
                  id="receipt-paper-width"
                  value={config.receiptPaperWidth}
                  onChange={(event) => updateConfig("receiptPaperWidth", event.target.value as HardwareConfig["receiptPaperWidth"])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="80mm">80 mm estándar</option>
                  <option value="58mm">58 mm genérica</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  El formato de 58 mm ajusta el ancho del ticket para impresoras térmicas compactas o genéricas.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt-header">Encabezado del ticket</Label>
                <Input
                  id="receipt-header"
                  value={config.receiptHeader}
                  onChange={(event) => updateConfig("receiptHeader", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt-footer">Pie del ticket</Label>
                <Input
                  id="receipt-footer"
                  value={config.receiptFooter}
                  onChange={(event) => updateConfig("receiptFooter", event.target.value)}
                />
              </div>

              <Button onClick={handlePrintTest} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Receipt className="h-4 w-4" />
                Imprimir ticket de prueba
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <WalletCards className="h-5 w-5" />
                Cajón de dinero
              </CardTitle>
              <CardDescription>
                Define la política para apertura del cajón en ventas en efectivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Habilitar cajón</Label>
                  <p className="text-sm text-muted-foreground">Prepara el flujo para operar con cajón conectado.</p>
                </div>
                <Switch checked={config.cashDrawerEnabled} onCheckedChange={(checked) => updateConfig("cashDrawerEnabled", checked)} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Abrir en ventas en efectivo</Label>
                  <p className="text-sm text-muted-foreground">Usa esta política como disparador operativo por defecto.</p>
                </div>
                <Switch
                  checked={config.openDrawerAfterCashSale}
                  onCheckedChange={(checked) => updateConfig("openDrawerAfterCashSale", checked)}
                  disabled={!config.cashDrawerEnabled}
                />
              </div>

              <Alert>
                <AlertTitle>Nota técnica</AlertTitle>
                <AlertDescription>
                  En navegadores estándar no existe acceso directo universal al puerto del cajón. La activación real se deja conectada mediante un evento compatible para middleware local o disparo vía impresora.
                </AlertDescription>
              </Alert>

              <Button onClick={handleDrawerTest} variant="outline" className="w-full gap-2">
                <WalletCards className="h-4 w-4" />
                Probar disparador de cajón
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ScanLine className="h-5 w-5" />
                Lector de códigos
              </CardTitle>
              <CardDescription>
                Configura lectores que escriben como teclado y envían un sufijo al finalizar el escaneo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Habilitar lector</Label>
                  <p className="text-sm text-muted-foreground">Activa la escucha global para lecturas rápidas.</p>
                </div>
                <Switch checked={config.barcodeScannerEnabled} onCheckedChange={(checked) => updateConfig("barcodeScannerEnabled", checked)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scanner-suffix">Sufijo esperado</Label>
                <select
                  id="scanner-suffix"
                  value={config.scannerSuffix}
                  onChange={(event) => updateConfig("scannerSuffix", event.target.value as ScannerSuffix)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="enter">Enter</option>
                  <option value="tab">Tab</option>
                  <option value="none">Sin sufijo</option>
                </select>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Keyboard className="h-4 w-4" />
                  Última lectura detectada
                </div>
                <p className="text-2xl font-bold text-accent">{lastCapturedCode || "Sin lecturas"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Si el lector trabaja como teclado, aquí debe aparecer el código cuando termine con {config.scannerSuffix === "none" ? "sin sufijo automático" : config.scannerSuffix.toUpperCase()}.
                </p>
              </div>

              <Button onClick={handleSimulateScan} variant="outline" className="w-full gap-2">
                <ScanLine className="h-4 w-4" />
                Simular lectura
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <WalletCards className="h-5 w-5" />
                Impuestos
              </CardTitle>
              <CardDescription>
                Configura el IVA u otros impuestos que se aplicarán a todas las ventas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <Label className="font-semibold text-foreground">Habilitar IVA</Label>
                  <p className="text-sm text-muted-foreground">Si está deshabilitado, no se aplicará ningún impuesto a las ventas.</p>
                </div>
                <Switch checked={config.taxEnabled} onCheckedChange={(checked) => updateConfig("taxEnabled", checked)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-rate">Porcentaje de IVA</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={config.taxRate}
                    onChange={(event) => updateConfig("taxRate", parseFloat(event.target.value) || 0)}
                    disabled={!config.taxEnabled}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Ingresa un valor entre 0 y 100. Por defecto es 19%.</p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Impacto en tickets y ventas</p>
                <p className="mt-1">
                  El porcentaje de IVA se aplicará automáticamente a todas las ventas nuevas, historial de ventas, tickets impresos y reportes.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Uso desde celular</p>
                <p className="mt-1">
                  Si quieres operar desde un teléfono o tablet, entra también en la opción de conexión offline para preparar sincronización, uso local y continuidad de venta fuera de escritorio.
                </p>
              </div>

              <Button onClick={handlePrintTest} variant="outline" className="w-full gap-2">
                <Receipt className="h-4 w-4" />
                Previsualizar ticket con IVA
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Settings2 className="h-5 w-5" />
                Mantenimiento del sistema
              </CardTitle>
              <CardDescription>
                Herramientas administrativas para sincronización de datos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Inicializar inventario por sucursal</p>
                <p className="mt-1">
                  Si las variantes de productos no aparecen en el punto de venta, ejecuta esta herramienta para sincronizar el inventario con todas las sucursales.
                </p>
              </div>
              <Button 
                onClick={() => {
                  initInventoryMutation.mutate(undefined, {
                    onSuccess: (data) => {
                      toast.success(data.message);
                    },
                    onError: (error) => {
                      toast.error("Error al inicializar inventario: " + error.message);
                    },
                  });
                }}
                disabled={initInventoryMutation.isPending}
                className="w-full gap-2"
              >
                {initInventoryMutation.isPending ? "Procesando..." : "Inicializar inventario"}
              </Button>
            </CardContent>
          </Card>

          {/* Términos y Condiciones */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500 text-center">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-primary underline underline-offset-2 transition-colors"
                >
                  Ver Términos y Condiciones
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
