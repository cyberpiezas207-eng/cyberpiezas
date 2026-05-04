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
import { ArrowLeft, Banknote, Camera, CreditCard, History, Landmark, LayoutGrid, List, Plus, Printer, ScanLine, Search, Settings2, ShoppingCart, Smartphone, Store, Trash2, WalletCards, X } from "lucide-react";
import { toast } from "sonner";

interface CartItem extends PosCartItem {
  variantId: number;
  unitPrice: number;
  imageUrl?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inlineVariant, setInlineVariant] = useState<{ productId: number; productName: string; imageUrl?: string } | null>(null);
  const [inlineColor, setInlineColor] = useState<string>("");
  const [inlineSize, setInlineSize] = useState<string>("");
  const [inlineQty, setInlineQty] = useState<string>("1");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (window.localStorage.getItem("pos-view-mode") as "grid" | "list") ?? "grid";
  });

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") window.localStorage.setItem("pos-view-mode", mode);
  };
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

  // Cliente frecuente
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string; phone?: string | null } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

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
  const customerSearchQuery = trpc.customers.search.useQuery(
    { query: customerSearch },
    { enabled: customerSearch.trim().length >= 2 },
  );
  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: (newCustomer) => {
      if (newCustomer) {
        setSelectedCustomer({ id: newCustomer.id, name: newCustomer.name, phone: newCustomer.phone });
      }
      setIsAddingCustomer(false);
      setIsCustomerPanelOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
    },
  });

  const inlineVariantsQuery = trpc.variants.getByProductId.useQuery(
    { productId: inlineVariant?.productId ?? 0, branchId: activeBranch?.id ?? undefined },
    { enabled: inlineVariant !== null },
  );

  const inlineColors = useMemo(() => {
    return Array.from(new Set((inlineVariantsQuery.data ?? []).map((v) => v.color))).filter(Boolean);
  }, [inlineVariantsQuery.data]);

  const inlineSizes = useMemo(() => {
    if (!inlineColor) return [];
    return (inlineVariantsQuery.data ?? [])
      .filter((v) => v.color === inlineColor)
      .map((v) => v.size)
      .filter(Boolean);
  }, [inlineVariantsQuery.data, inlineColor]);

  const createSale = trpc.sales.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sales.listToday.invalidate(),
        utils.dashboard.todayStats.invalidate(),
        utils.dashboard.topProducts.invalidate(),
      ]);
    },
  });

  // Categorías únicas extraídas de todos los productos cargados
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products.data ?? []) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [products.data]);

  // Productos base (búsqueda o listado completo) filtrados por categoría
  const baseProducts = searchQuery.trim().length > 0 ? searchResults.data : products.data;
  const displayedProducts = useMemo(() => {
    if (!selectedCategory) return baseProducts;
    return (baseProducts ?? []).filter((p) => p.category === selectedCategory);
  }, [baseProducts, selectedCategory]);
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
    // Abrir selector inline (resetear selección previa)
    setInlineVariant({ productId: product.id, productName: product.name, imageUrl: (product as any).primaryImageUrl ?? undefined });
    setInlineColor("");
    setInlineSize("");
    setInlineQty("1");
  };

  const handleInlineAddToCart = () => {
    if (!inlineVariant) return;
    const variants = inlineVariantsQuery.data ?? [];
    // Si no hay variantes con color/talla, usar la primera disponible
    let matched = variants.find(
      (v) => v.color === inlineColor && v.size === inlineSize
    );
    if (!matched && variants.length === 1) matched = variants[0];
    if (!matched) {
      toast.error("Selecciona color y talla antes de agregar.");
      return;
    }
    const qty = Math.max(1, parseInt(inlineQty) || 1);
    const unitPrice = parseFloat(matched.price ?? "0");
    handleAddVariantToCart({
      variantId: matched.id,
      productName: inlineVariant.productName,
      size: matched.size ?? "",
      color: matched.color ?? "",
      quantity: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
      imageUrl: inlineVariant.imageUrl,
    });
    setInlineVariant(null);
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
            <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 space-y-2">
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
                {/* Toggle vista */}
                <div className="flex rounded-lg border border-slate-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => handleSetViewMode("grid")}
                    title="Vista cuadrícula"
                    className={`px-2.5 py-2 transition-colors ${
                      viewMode === "grid"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSetViewMode("list")}
                    title="Vista lista"
                    className={`px-2.5 py-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
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

            {/* Filtros rápidos por categoría */}
            {availableCategories.length > 0 && (
              <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/30">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === null
                        ? "bg-purple-600 text-white"
                        : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80"
                    }`}
                  >
                    Todas
                  </button>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                        selectedCategory === cat
                          ? "bg-purple-600 text-white"
                          : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Catálogo de productos */}
            <div className="flex-1 overflow-y-auto p-4">
              {(displayedProducts ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{emptyStateMessage}</p>
                </div>
              ) : viewMode === "grid" ? (
                /* ===== VISTA CUADRÍCULA ===== */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(displayedProducts ?? []).map((product) => (
                    <div key={product.id} className="flex flex-col">
                      <button
                        onClick={() => handleAddToCart({ id: product.id, name: product.name })}
                        disabled={!activeBranch?.id}
                        className={`group flex flex-col rounded-xl border overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left ${
                          inlineVariant?.productId === product.id
                            ? "border-purple-500 bg-slate-800/80"
                            : "border-slate-700/50 bg-slate-800/40 hover:border-purple-500/60 hover:bg-slate-800/70"
                        }`}
                      >
                        <div className="aspect-square w-full bg-slate-700/50 overflow-hidden">
                          {product.primaryImageUrl ? (
                            <img src={product.primaryImageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="h-8 w-8 text-slate-600" /></div>
                          )}
                        </div>
                        <div className="p-2.5 flex flex-col gap-1">
                          <p className="text-white font-medium text-xs leading-tight line-clamp-2">{product.name}</p>
                          <p className="text-purple-400 font-bold text-sm">${parseFloat(product.basePrice).toFixed(2)}</p>
                          <div className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-purple-600 group-hover:bg-purple-700 py-1.5 text-white text-xs font-semibold transition-colors">
                            <Plus className="h-3.5 w-3.5" /> Agregar
                          </div>
                        </div>
                      </button>
                      {/* Selector inline de talla y color */}
                      {inlineVariant?.productId === product.id && (
                        <div className="mt-1 rounded-xl border border-purple-500/50 bg-slate-900/90 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-purple-300">Elige variante</p>
                            <button onClick={() => setInlineVariant(null)} className="text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          {inlineVariantsQuery.isLoading ? (
                            <p className="text-xs text-slate-400">Cargando...</p>
                          ) : (
                            <>
                              {inlineColors.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Color</p>
                                  <div className="flex flex-wrap gap-1">
                                    {inlineColors.map((c) => (
                                      <button key={c} onClick={() => { setInlineColor(c); setInlineSize(""); }}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                          inlineColor === c ? "border-purple-500 bg-purple-600 text-white" : "border-slate-600 text-slate-300 hover:border-purple-400"
                                        }`}>{c}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {inlineColor && inlineSizes.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Talla</p>
                                  <div className="flex flex-wrap gap-1">
                                    {inlineSizes.map((s) => (
                                      <button key={s} onClick={() => setInlineSize(s)}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                          inlineSize === s ? "border-purple-500 bg-purple-600 text-white" : "border-slate-600 text-slate-300 hover:border-purple-400"
                                        }`}>{s}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-400 shrink-0">Cant.</p>
                                <input type="number" min="1" value={inlineQty} onChange={(e) => setInlineQty(e.target.value)}
                                  className="w-16 text-xs text-center bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white" />
                                <button onClick={handleInlineAddToCart}
                                  className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1.5 transition-colors">
                                  + Al carrito
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* ===== VISTA LISTA ===== */
                <div className="space-y-2">
                  {(displayedProducts ?? []).map((product) => (
                    <div key={product.id}>
                      <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                        inlineVariant?.productId === product.id
                          ? "border-purple-500 bg-slate-800/70"
                          : "border-slate-700/50 bg-slate-800/40 hover:border-purple-500/40 hover:bg-slate-800/70"
                      }`}>
                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/40">
                          {product.primaryImageUrl ? (
                            <img src={product.primaryImageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">—</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{product.name}</p>
                          <p className="text-slate-400 text-xs">{product.sku} · {product.brand}</p>
                          <p className="text-purple-400 font-bold text-sm mt-0.5">${parseFloat(product.basePrice).toFixed(2)}</p>
                        </div>
                        <Button size="sm" onClick={() => handleAddToCart({ id: product.id, name: product.name })} disabled={!activeBranch?.id}
                          className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Selector inline en vista lista */}
                      {inlineVariant?.productId === product.id && (
                        <div className="mt-1 rounded-xl border border-purple-500/50 bg-slate-900/90 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-purple-300">Elige variante</p>
                            <button onClick={() => setInlineVariant(null)} className="text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          {inlineVariantsQuery.isLoading ? (
                            <p className="text-xs text-slate-400">Cargando...</p>
                          ) : (
                            <>
                              {inlineColors.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Color</p>
                                  <div className="flex flex-wrap gap-1">
                                    {inlineColors.map((c) => (
                                      <button key={c} onClick={() => { setInlineColor(c); setInlineSize(""); }}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                          inlineColor === c ? "border-purple-500 bg-purple-600 text-white" : "border-slate-600 text-slate-300 hover:border-purple-400"
                                        }`}>{c}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {inlineColor && inlineSizes.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Talla</p>
                                  <div className="flex flex-wrap gap-1">
                                    {inlineSizes.map((s) => (
                                      <button key={s} onClick={() => setInlineSize(s)}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                          inlineSize === s ? "border-purple-500 bg-purple-600 text-white" : "border-slate-600 text-slate-300 hover:border-purple-400"
                                        }`}>{s}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-400 shrink-0">Cant.</p>
                                <input type="number" min="1" value={inlineQty} onChange={(e) => setInlineQty(e.target.value)}
                                  className="w-16 text-xs text-center bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white" />
                                <button onClick={handleInlineAddToCart}
                                  className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1.5 transition-colors">
                                  + Al carrito
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CARRITO */}
          <div className="flex flex-col border-l border-slate-700/50 bg-slate-900/60 overflow-hidden">
            {/* Header carrito */}
            <div className="px-4 py-3 border-b border-slate-700/50 space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">Carrito</span>
                <span className="ml-auto text-slate-400 text-xs">{cart.length} {cart.length === 1 ? "artículo" : "artículos"}</span>
              </div>
              {/* Botón cliente frecuente */}
              {selectedCustomer ? (
                <div className="flex items-center gap-2 rounded-lg bg-purple-900/40 border border-purple-500/40 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-200 text-xs font-semibold truncate">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && <p className="text-purple-400 text-xs">{selectedCustomer.phone}</p>}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-purple-400 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCustomerPanelOpen((v) => !v)}
                  className="w-full flex items-center gap-2 rounded-lg border border-dashed border-slate-600 hover:border-purple-500/60 px-3 py-1.5 text-slate-400 hover:text-purple-300 transition-colors text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Asignar cliente frecuente
                </button>
              )}
              {/* Panel de búsqueda de cliente */}
              {isCustomerPanelOpen && !selectedCustomer && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/90 p-3 space-y-2">
                  {!isAddingCustomer ? (
                    <>
                      <Input
                        placeholder="Buscar por nombre o teléfono..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="h-8 text-xs bg-slate-700/60 border-slate-600 text-white placeholder-slate-500"
                        autoFocus
                      />
                      {customerSearch.trim().length >= 2 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {customerSearchQuery.isLoading ? (
                            <p className="text-xs text-slate-400 text-center py-2">Buscando...</p>
                          ) : (customerSearchQuery.data ?? []).length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Sin resultados</p>
                          ) : (
                            (customerSearchQuery.data ?? []).map((c) => (
                              <button key={c.id}
                                onClick={() => { setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone }); setIsCustomerPanelOpen(false); setCustomerSearch(""); }}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                                <p className="text-white text-xs font-medium">{c.name}</p>
                                {c.phone && <p className="text-slate-400 text-xs">{c.phone}</p>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      <button onClick={() => setIsAddingCustomer(true)}
                        className="w-full text-xs text-purple-400 hover:text-purple-300 py-1">
                        + Agregar nuevo cliente
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-purple-300">Nuevo cliente</p>
                      <Input placeholder="Nombre *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                        className="h-8 text-xs bg-slate-700/60 border-slate-600 text-white placeholder-slate-500" />
                      <Input placeholder="Teléfono" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="h-8 text-xs bg-slate-700/60 border-slate-600 text-white placeholder-slate-500" />
                      <div className="flex gap-2">
                        <button onClick={() => setIsAddingCustomer(false)} className="flex-1 text-xs text-slate-400 hover:text-white py-1">Cancelar</button>
                        <button
                          onClick={() => createCustomerMutation.mutate({ name: newCustomerName, phone: newCustomerPhone || undefined })}
                          disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                          className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold py-1.5 transition-colors">
                          {createCustomerMutation.isPending ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                    <div className="flex items-start gap-2">
                      {/* Miniatura del producto */}
                      <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/40">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-slate-400 text-xs">{item.color} · {item.size}</p>
                        <p className="text-slate-300 text-xs mt-1">{item.quantity} × ${item.unitPrice.toFixed(2)} = <span className="text-white font-semibold">${item.lineTotal.toFixed(2)}</span></p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(index)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0"
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
              <div className="space-y-1.5">
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
                {/* Botones rápidos de descuento */}
                <div className="grid grid-cols-4 gap-1">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscount(discount === String(pct) ? "0" : String(pct))}
                      className={`rounded-lg py-1 text-xs font-semibold transition-colors ${
                        discount === String(pct)
                          ? "bg-purple-600 text-white"
                          : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
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

              {/* Botón COBRAR destacado */}
              <button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0 || !activeBranch?.id}
                className={`w-full rounded-xl py-4 flex items-center justify-center gap-3 font-bold text-lg tracking-wide transition-all ${
                  cart.length === 0 || !activeBranch?.id
                    ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white shadow-lg shadow-purple-900/60 active:scale-[0.98]"
                }`}
              >
                <Printer className="h-5 w-5" />
                {cart.length === 0 ? "CARRITO VACÍO" : `COBRAR $${total.toFixed(2)}`}
              </button>

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
