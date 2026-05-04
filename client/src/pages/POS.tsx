import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BarcodeCameraScanner } from "@/components/BarcodeCameraScanner";
import { VariantSelector } from "@/components/VariantSelector";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getActivePosBranchId, saveActivePosBranchId } from "@/lib/posAdminPreferences";
import { BARCODE_SCANNED_EVENT, calculatePosTaxSummary, getPosHardwareConfig, getPosTaxLabel, shouldDisplayTaxRow } from "@/lib/posHardware";
import { queueOfflineSale } from "@/lib/offlineSaleQueue";
import { runPostSaleHardware, type PosCartItem } from "@/lib/posSaleHardware";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Banknote, Camera, CreditCard, History, Landmark, Plus, Printer, ScanLine, Search, Settings2, ShoppingCart, Smartphone, Store, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

interface CartItem extends PosCartItem {
  variantId: number;
  unitPrice: number;
}

const paymentLabel: Record<"cash" | "card" | "transfer", string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export default function POS() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<{ id: number; name: string } | null>(null);
  const [printTicket, setPrintTicket] = useState(true);
  const [transferReference, setTransferReference] = useState("");
  const [transferProof, setTransferProof] = useState<{ base64: string; fileName: string; mimeType: string; previewUrl: string } | null>(null);

  const branches = trpc.branches.list.useQuery();
  const myBranch = trpc.users.myBranch.useQuery();
  const products = trpc.products.list.useQuery();
  const searchResults = trpc.products.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );
  const todaySales = trpc.sales.listToday.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const createSale = trpc.sales.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sales.listToday.invalidate(),
        utils.dashboard.todayStats.invalidate(),
        utils.dashboard.topProducts.invalidate(),
      ]);
    },
  });

  const displayedProducts = searchQuery.trim().length > 0 ? searchResults.data : products.data;
  const selectedBranch = branches.data?.find((branch) => branch.id === Number(selectedBranchId));
  const assignedBranch = myBranch.data?.branch ?? null;
  const activeBranch = selectedBranch ?? assignedBranch ?? null;
  const isAdmin = user?.role === "admin";
  const isCashier = user?.role === "cashier";

  useEffect(() => {
    const handleBarcodeScanned = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: string }>;
      const scannedCode = customEvent.detail?.code?.trim();
      if (!scannedCode) return;
      setSearchQuery(scannedCode);
      toast.success(`Búsqueda por lector activada: ${scannedCode}`);
    };

    window.addEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
    return () => window.removeEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
  }, []);

  useEffect(() => {
    if (isCashier && assignedBranch?.id) {
      setSelectedBranchId(String(assignedBranch.id));
    }
  }, [assignedBranch?.id, isCashier]);

  useEffect(() => {
    if (!isAdmin || !branches.data?.length) return;

    const savedBranchId = getActivePosBranchId();
    const matchingBranch = savedBranchId
      ? branches.data.find((branch) => branch.id === savedBranchId)
      : null;
    const fallbackBranch = matchingBranch ?? branches.data[0];

    if (fallbackBranch && selectedBranchId !== String(fallbackBranch.id)) {
      setSelectedBranchId(String(fallbackBranch.id));
    }

    if (fallbackBranch && fallbackBranch.id !== savedBranchId) {
      saveActivePosBranchId(fallbackBranch.id);
    }
  }, [branches.data, isAdmin, selectedBranchId]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * parseFloat(discount || "0")) / 100, [subtotal, discount]);
  const hardwareConfig = useMemo(() => getPosHardwareConfig(), []);
  const taxSummary = useMemo(
    () => calculatePosTaxSummary(subtotal, discountAmount, hardwareConfig),
    [subtotal, discountAmount, hardwareConfig],
  );
  const tax = taxSummary.tax;
  const total = taxSummary.total;

  const showTaxRow = useMemo(() => shouldDisplayTaxRow(hardwareConfig, tax), [hardwareConfig, tax]);
  const taxLabel = useMemo(() => getPosTaxLabel(hardwareConfig), [hardwareConfig]);

  const recentSales = useMemo(() => {
    return [...(todaySales.data ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [todaySales.data]);

  const handleAddToCart = (product: { id: number; name: string }) => {
    if (!activeBranch?.id) {
      toast.error(
        isAdmin
          ? "Define la sucursal operativa en Configuración antes de vender."
          : "Tu usuario aún no tiene una sucursal asignada.",
      );
      return;
    }

    setSelectedProductForVariant(product);
    setIsVariantSelectorOpen(true);
  };

  const handleAddVariantToCart = (item: CartItem) => {
    setCart((current) => [...current, item]);
    toast.success(`${item.productName} agregado al carrito`);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleOpenCheckout = () => {
    if (!activeBranch?.id) {
      toast.error("No hay una sucursal operativa disponible para cerrar la venta.");
      return;
    }
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPrintTicket(hardwareConfig.autoPrintOnSale);
    setIsCheckoutDialogOpen(true);
  };

  const finalizeSaleFlow = async (saleNumber: string, successMessage: string, options?: { shouldPrintReceipt?: boolean; transferReference?: string | null }) => {
    toast.success(successMessage);

    const hardwareResult = await runPostSaleHardware(
      {
        saleNumber,
        branchName: activeBranch?.name ?? "Sucursal local",
        paymentMethod,
        items: cart,
        subtotal,
        discountAmount,
        tax,
        total,
        shouldPrintReceipt: options?.shouldPrintReceipt,
        transferReference: options?.transferReference,
      },
      {
        openPrintWindow: () => window.open("", "_blank"),
        emitDrawerOpen: ({ reason, branchName, saleNumber: drawerSaleNumber }) => {
          window.dispatchEvent(
            new CustomEvent("boutique-pos:cash-drawer-open", {
              detail: { reason, branchName, saleNumber: drawerSaleNumber },
            }),
          );
        },
      },
    );

    if (hardwareResult.blockedByPopup) {
      toast.error("La venta se registró, pero el navegador bloqueó la impresión automática.");
    }

    if (hardwareResult.drawerRequested) {
      toast.success("Se solicitó la apertura del cajón mediante el adaptador compatible configurado.");
    }

    setCart([]);
    setDiscount("0");
    setIsCheckoutDialogOpen(false);
  };

  const handleCheckout = async () => {
    if (!activeBranch?.id) {
      toast.error("Selecciona una sucursal válida desde Configuración.");
      return;
    }

    if (!user?.id) {
      toast.error("Tu sesión no es válida para registrar ventas.");
      return;
    }

    if (paymentMethod === "transfer" && !transferProof?.base64) {
      toast.error("Adjunta o toma una foto del comprobante antes de cobrar por transferencia.");
      return;
    }

    const salePayload = {
      branchId: activeBranch.id,
      items: cart.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
      })),
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      paymentMethod,
      transferReference: transferReference.trim() || undefined,
      proofBase64: transferProof?.base64,
      proofMimeType: transferProof?.mimeType,
      proofFileName: transferProof?.fileName,
    };

    const persistOfflineSale = async () => {
      const draft = await queueOfflineSale({
        branchId: activeBranch.id,
        userId: user.id,
        paymentMethod,
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        items: salePayload.items,
      });

      await finalizeSaleFlow(
        draft.sale.saleNumber,
        `Venta guardada localmente: ${draft.sale.saleNumber}. Se sincronizará cuando vuelva internet.`,
      );
    };

    if (!navigator.onLine) {
      if (paymentMethod === "transfer") {
        toast.error("Para anexar comprobantes de transferencia necesitas conexión activa.");
        return;
      }
      await persistOfflineSale();
      return;
    }

    try {
      const result = await createSale.mutateAsync(salePayload);
      await finalizeSaleFlow(result.saleNumber, `Venta registrada: ${result.saleNumber}`, {
        shouldPrintReceipt: printTicket,
        transferReference: transferReference.trim() || null,
      });
      setTransferReference("");
      setTransferProof(null);
    } catch (error: any) {
      const message = error?.message || "Error al procesar la venta";
      const isConnectivityIssue =
        !navigator.onLine || /fetch|network|NetworkError|Failed to fetch/i.test(message);

      if (isConnectivityIssue) {
        await persistOfflineSale();
        return;
      }

      toast.error(message);
    }
  };

  const emptyStateMessage = searchQuery.trim().length > 0
    ? "No se encontraron productos con esa búsqueda."
    : "Todavía no hay productos para vender.";

  const handleTransferProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setTransferProof({
        base64: result,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        previewUrl: result,
      });
      toast.success("Comprobante listo para anexarse a la venta");
    };
    reader.readAsDataURL(file);
  };

  const handleCameraDetected = (code: string) => {
    setSearchQuery(code);
    toast.success(`Código enviado a la búsqueda: ${code}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Botón de retroceder */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Regresar
          </Button>
        </div>
        <section className="rounded-[2rem] border border-fuchsia-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.16),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(250,245,255,0.95))] p-6 shadow-[0_30px_80px_-40px_rgba(168,85,247,0.55)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-fuchsia-700/80">Operación de caja</p>
              <h1 className="mt-2 text-4xl font-bold bg-gradient-to-r from-fuchsia-700 via-violet-700 to-cyan-700 bg-clip-text text-transparent">Punto de Venta</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Flujo rápido de venta con lector, ticket, método de pago y resumen del día. La sucursal operativa ahora se controla desde configuración para mantener una caja más limpia y segura.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                <Store className="h-3.5 w-3.5 text-primary" />
                {activeBranch ? `Sucursal activa: ${activeBranch.name}` : "Sin sucursal operativa"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                <WalletCards className="h-3.5 w-3.5 text-primary" />
                Perfil: {isAdmin ? "Administrador" : "Cajero"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                <ScanLine className="h-3.5 w-3.5 text-primary" />
                Lector tipo teclado listo
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                Modo táctil listo para operación desde celular
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="border-white/70 bg-white/75 shadow-none backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Sucursal operativa</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Se define desde Configuración para evitar cambios accidentales durante la venta."
                    : "Los cajeros trabajan únicamente con su sucursal asignada por el administrador."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {activeBranch
                    ? `Las variantes y el checkout usarán el inventario real de ${activeBranch.name}.`
                    : isAdmin
                      ? "Configura una sucursal antes de vender."
                      : "Solicita a un administrador que asigne tu sucursal."}
                </p>
                {isAdmin ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full gap-2" onClick={() => setLocation("/settings/pos-hardware")}>
                        <Settings2 className="h-4 w-4" />
                        Abrir Configuración
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Define sucursal activa, hardware POS e impuestos sin salir del flujo administrativo.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/75 shadow-none backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Permisos por rol</CardTitle>
                <CardDescription>Separación clara entre caja operativa y administración.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Administrador: define sucursal activa, hardware POS, usuarios y permisos.</p>
                <p>Cajero: vende en su sucursal asignada, consulta ventas y opera la caja.</p>
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/75 shadow-none backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Atajos de operación</CardTitle>
                <CardDescription>Diseño pensado para capturar, cobrar y revisar ventas sin salir del flujo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Busca por nombre, SKU o código escaneado.</p>
                <p>Selecciona color y talla por separado antes de agregar al carrito.</p>
                <p>Consulta el historial del día justo debajo del área de venta.</p>
                <Button variant="outline" className="mt-2 w-full gap-2 sm:w-auto" onClick={() => setIsCameraScannerOpen(true)}>
                  <Camera className="h-4 w-4" />
                  Escanear con cámara del celular
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <Card className="border-fuchsia-100 bg-white/90 shadow-[0_24px_60px_-40px_rgba(168,85,247,0.45)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-foreground">Catálogo rápido</CardTitle>
                <CardDescription>
                  Busca productos y agrega la variante correcta al carrito con un flujo más directo para caja.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, SKU o código"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setIsCameraScannerOpen(true)}>
                    <Camera className="h-4 w-4" />
                    Escanear con cámara
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                    <Smartphone className="mb-2 h-4 w-4 text-primary" />
                    Usa el celular en vertical para tocar productos y cobrar más cómodo.
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                    <Camera className="mb-2 h-4 w-4 text-primary" />
                    La cámara puede buscar productos por código sin lector externo.
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                    <ScanLine className="mb-2 h-4 w-4 text-primary" />
                    Si ya tienes lector tipo teclado, el POS sigue aceptándolo.
                  </div>
                </div>

                <div className="grid gap-3">
                  {(displayedProducts ?? []).map((product) => (
                    <div
                      key={product.id}
                      className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-[0_20px_40px_-30px_rgba(168,85,247,0.55)] md:grid-cols-[132px_minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="overflow-hidden rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-white to-fuchsia-50 shadow-[0_18px_30px_-24px_rgba(168,85,247,0.55)]">
                        {product.primaryImageUrl ? (
                          <img src={product.primaryImageUrl} alt={product.name} loading="lazy" className="h-32 w-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-32 items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
                            Sin foto
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-foreground">{product.name}</h3>
                          <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {product.sku}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Desde</p>
                          <p className="text-2xl font-bold text-accent">${parseFloat(product.basePrice).toFixed(2)}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => handleAddToCart({ id: product.id, name: product.name })}
                              disabled={!activeBranch?.id}
                            >
                              <Plus className="h-4 w-4" />
                              Agregar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{activeBranch?.id ? "Abre el selector de variante para elegir color y talla." : "Primero configura una sucursal operativa para vender."}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>

                {(displayedProducts?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 px-6 py-12 text-center text-sm text-muted-foreground">
                    {emptyStateMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6 border-fuchsia-100 bg-white/95 shadow-[0_24px_60px_-36px_rgba(168,85,247,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito actual
                </CardTitle>
                <CardDescription>
                  {cart.length} {cart.length === 1 ? "artículo" : "artículos"} en la venta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      El carrito está vacío.
                    </div>
                  ) : (
                    cart.map((item, index) => (
                      <div key={`${item.variantId}-${index}`} className="rounded-xl border border-border bg-secondary/30 p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              Color: {item.color} · Talla: {item.size}
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveFromCart(index)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Quita esta variante del carrito sin afectar el resto de la venta.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-muted-foreground">{item.quantity} × ${item.unitPrice.toFixed(2)}</span>
                          <span className="font-semibold text-foreground">${item.lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount" className="font-semibold text-foreground">Descuento (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    className="text-right"
                  />
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Forma de cobro</p>
                    <p className="text-xs text-muted-foreground">Selecciona cómo cobrarás esta venta: efectivo, tarjeta o transferencia.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <Banknote className="h-4 w-4" />
                      Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => setPaymentMethod("card")}
                    >
                      <CreditCard className="h-4 w-4" />
                      Tarjeta
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "transfer" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => setPaymentMethod("transfer")}
                    >
                      <Landmark className="h-4 w-4" />
                      Transferencia
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descuento</span>
                      <span className="font-semibold text-accent">-${discountAmount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {showTaxRow ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{taxLabel}</span>
                      <span className="font-semibold text-foreground">${tax.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-border pt-3 text-lg">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-accent">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleOpenCheckout}
                  disabled={cart.length === 0 || !activeBranch?.id}
                  className="w-full gap-2 py-6 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Printer className="h-4 w-4" />
                  Procesar venta
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-fuchsia-200/70 bg-white/95 px-4 py-3 shadow-[0_-18px_40px_-30px_rgba(168,85,247,0.45)] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Venta actual</p>
              <p className="truncate text-sm font-semibold text-foreground">
                {cart.length} {cart.length === 1 ? "artículo" : "artículos"} · ${total.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setIsCameraScannerOpen(true)}>
                <Camera className="h-4 w-4" />
                Cámara
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={cart.length === 0 || !activeBranch?.id}
                onClick={handleOpenCheckout}
              >
                <Printer className="h-4 w-4" />
                Cobrar
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-fuchsia-100 bg-white/90 shadow-[0_24px_60px_-40px_rgba(168,85,247,0.35)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <History className="h-5 w-5" />
              Historial rápido de ventas
            </CardTitle>
            <CardDescription>
              Últimas operaciones del día para consultar folio, hora, método de pago y total sin salir de caja.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {todaySales.isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Cargando ventas del día...
              </div>
            ) : recentSales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Aún no se registran ventas hoy.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Folio</th>
                      <th className="px-3 py-3 font-medium">Hora</th>
                      <th className="hidden px-3 py-3 font-medium sm:table-cell">Pago</th>
                      <th className="px-3 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/60 last:border-b-0">
                        <td className="px-3 py-4 font-semibold text-foreground">{sale.saleNumber}</td>
                        <td className="px-3 py-4 text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="hidden px-3 py-4 text-muted-foreground sm:table-cell">{paymentLabel[sale.paymentMethod as "cash" | "card" | "transfer"]}</td>
                        <td className="px-3 py-4 text-right font-semibold text-foreground">
                          ${parseFloat(sale.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <VariantSelector
        isOpen={isVariantSelectorOpen}
        productId={selectedProductForVariant?.id || null}
        productName={selectedProductForVariant?.name || ""}
        branchId={activeBranch?.id ?? null}
        branchName={activeBranch?.name}
        onClose={() => setIsVariantSelectorOpen(false)}
        onAdd={handleAddVariantToCart}
      />

      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-sm:h-[90vh] max-sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Confirmar venta</DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de cerrar la operación en {activeBranch?.name || "la sucursal configurada"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-2 flex justify-between">
                <span className="text-muted-foreground">Sucursal</span>
                <span className="font-semibold text-foreground">{activeBranch?.name || "Sin sucursal"}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 ? (
                <div className="mb-2 flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-semibold text-accent">-${discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {showTaxRow ? (
                <div className="mb-2 flex justify-between">
                  <span className="text-muted-foreground">{taxLabel}</span>
                  <span className="font-semibold text-foreground">${tax.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-accent">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="payment" className="font-semibold text-foreground">Método de pago</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <Banknote className="h-4 w-4" />
                  Efectivo
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setPaymentMethod("card")}
                >
                  <CreditCard className="h-4 w-4" />
                  Tarjeta
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setPaymentMethod("transfer")}
                >
                  <Landmark className="h-4 w-4" />
                  Transferencia
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Impresión del ticket</p>
                  <p className="text-sm text-muted-foreground">Puedes cobrar esta venta sin mandar el ticket a la impresora.</p>
                </div>
                <Switch checked={printTicket} onCheckedChange={setPrintTicket} />
              </div>
            </div>

            {paymentMethod === "transfer" ? (
              <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div>
                  <p className="font-semibold text-foreground">Comprobante de transferencia</p>
                  <p className="text-sm text-muted-foreground">Adjunta la foto del comprobante para dejarla ligada automáticamente a este cobro.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-reference">Referencia de transferencia</Label>
                  <Input
                    id="transfer-reference"
                    value={transferReference}
                    onChange={(event) => setTransferReference(event.target.value)}
                    placeholder="Ej. SPEI 4567 o folio bancario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-proof">Foto del comprobante</Label>
                  <Input id="transfer-proof" type="file" accept="image/*" capture="environment" onChange={handleTransferProofChange} />
                </div>
                {transferProof ? (
                  <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
                    <img src={transferProof.previewUrl} alt="Comprobante de transferencia" className="max-h-64 w-full rounded-xl object-cover" />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{transferProof.fileName}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setTransferProof(null)}>
                        Quitar foto
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleCheckout} disabled={createSale.isPending} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">
                <Printer className="h-4 w-4" />
                {createSale.isPending ? "Procesando..." : printTicket ? "Procesar e imprimir" : "Cobrar sin imprimir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeCameraScanner
        open={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onDetected={handleCameraDetected}
      />
      <div className="h-24 xl:hidden" aria-hidden="true" />
    </DashboardLayout>
  );
}
