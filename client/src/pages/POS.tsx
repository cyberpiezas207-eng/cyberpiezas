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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Regresar
            </button>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-purple-400" />
              <span className="text-white font-semibold text-sm">
                {activeBranch ? activeBranch.name : "Sin sucursal"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setLocation("/settings/pos-hardware")}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configuración
              </button>
            )}
            <button
              onClick={() => setLocation("/sales")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
            >
              <History className="h-3.5 w-3.5" />
              Historial
            </button>
          </div>
        </div>

        {/* ===== ÁREA PRINCIPAL: CATÁLOGO + CARRITO ===== */}
        <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] h-[calc(100vh-57px)]">

          {/* CATÁLOGO */}
          <div className="flex flex-col overflow-hidden">
            {/* Barra de búsqueda */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nombre, SKU o código..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9 bg-slate-800/60 border-slate-600 text-white placeholder-slate-500 focus:border-purple-500"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-2 shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Escanear</span>
                </Button>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(displayedProducts ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{emptyStateMessage}</p>
                </div>
              ) : (
                (displayedProducts ?? []).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 hover:border-purple-500/40 hover:bg-slate-800/70 transition-all"
                  >
                    {/* Imagen */}
                    <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/40">
                      {product.primaryImageUrl ? (
                        <img src={product.primaryImageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">—</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{product.name}</p>
                      <p className="text-slate-400 text-xs">{product.sku} · {product.brand}</p>
                      <p className="text-purple-400 font-bold text-sm mt-0.5">${parseFloat(product.basePrice).toFixed(2)}</p>
                    </div>
                    {/* Botón agregar */}
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart({ id: product.id, name: product.name })}
                      disabled={!activeBranch?.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CARRITO */}
          <div className="flex flex-col border-l border-slate-700/50 bg-slate-900/60 overflow-hidden">
            {/* Header carrito */}
            <div className="px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">Carrito</span>
                <span className="ml-auto text-slate-400 text-xs">{cart.length} {cart.length === 1 ? "artículo" : "artículos"}</span>
              </div>
            </div>

            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-xs">El carrito está vacío</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={`${item.variantId}-${index}`} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-slate-400 text-xs">{item.color} · {item.size}</p>
                        <p className="text-slate-300 text-xs mt-1">{item.quantity} × ${item.unitPrice.toFixed(2)} = <span className="text-white font-semibold">${item.lineTotal.toFixed(2)}</span></p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(index)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Resumen y cobro */}
            <div className="border-t border-slate-700/50 p-4 space-y-3 bg-slate-900/80">
              {/* Descuento */}
              <div className="flex items-center gap-2">
                <Label htmlFor="discount" className="text-slate-400 text-xs shrink-0">Descuento %</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="bg-slate-800/60 border-slate-600 text-white text-sm text-right h-8"
                />
              </div>

              {/* Método de pago */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                    paymentMethod === "cash"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Tarjeta
                </button>
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                    paymentMethod === "transfer"
                      ? "border-purple-500 bg-purple-500/15 text-purple-400"
                      : "border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                  Transfer
                </button>
              </div>

              {/* Totales */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {showTaxRow && (
                  <div className="flex justify-between text-slate-400">
                    <span>{taxLabel}</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-lg pt-1 border-t border-slate-700/50">
                  <span>Total</span>
                  <span className="text-purple-400">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón cobrar */}
              <Button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0 || !activeBranch?.id}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-5 text-base gap-2 disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
                Cobrar ${total.toFixed(2)}
              </Button>

              {!activeBranch?.id && (
                <p className="text-xs text-amber-400 text-center">
                  {isAdmin ? "Configura una sucursal en Configuración" : "Sin sucursal asignada"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra móvil inferior */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-slate-400 text-xs">{cart.length} artículo{cart.length !== 1 ? "s" : ""}</p>
              <p className="text-white font-bold">${total.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsCameraScannerOpen(true)} className="border-slate-600 text-slate-300 gap-1">
                <Camera className="h-4 w-4" /> Cámara
              </Button>
              <Button
                size="sm"
                disabled={cart.length === 0 || !activeBranch?.id}
                onClick={handleOpenCheckout}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
              >
                <Printer className="h-4 w-4" /> Cobrar
              </Button>
            </div>
          </div>
        </div>
        <div className="h-16 xl:hidden" aria-hidden="true" />
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
