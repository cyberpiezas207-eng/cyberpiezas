import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarcodeCameraScanner } from "@/components/BarcodeCameraScanner";
import { playScanError } from "@/lib/scannerSound";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BookOpen, Camera, ChevronDown, ChevronUp, Edit2, FileText, History, LayoutGrid, Layers, Loader2, Package, PackagePlus, Plus, Table2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const COLORS = [
  "Negro",
  "Blanco",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
  "Rosa",
  "Gris",
  "Beige",
  "Marrón",
  "Dorado",
  "Plateado",
];

const VARIANT_TEMPLATES = [
  {
    label: "Tallas adulto",
    description: "XS, S, M, L, XL, XXL",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Sin color"],
  },
  {
    label: "Colores básicos",
    description: "Negro, Blanco, Azul, Rojo, Gris, Beige",
    sizes: ["Único"],
    colors: ["Negro", "Blanco", "Azul", "Rojo", "Gris", "Beige"],
  },
  {
    label: "Tallas niño",
    description: "2, 4, 6, 8, 10, 12",
    sizes: ["2", "4", "6", "8", "10", "12"],
    colors: ["Sin color"],
  },
  {
    label: "Tallas zapato",
    description: "22 al 30",
    sizes: ["22", "23", "24", "25", "26", "27", "28", "29", "30"],
    colors: ["Sin color"],
  },
];

function getInitialProductId() {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("productId");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function VariantsManagement() {
  const initialProductId = getInitialProductId();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialProductId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ id: number; stock: number; color: string; size: string } | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("1");
  const [restockReason, setRestockReason] = useState("Ingreso de mercancía");
  const [manualTotalStock, setManualTotalStock] = useState("");
  const [formData, setFormData] = useState({
    size: "",
    color: "",
    stock: "0",
    price: "",
    sku: "",
    barcode: "",
  });

  const products = trpc.products.list.useQuery();
  const variants = trpc.variants.getByProductId.useQuery(
    { productId: selectedProductId || 0 },
    { enabled: selectedProductId !== null },
  );
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [variantViewMode, setVariantViewMode] = useState<"cards" | "matrix">("cards");
  const [showLowStockList, setShowLowStockList] = useState(false);

  const createVariant = trpc.variants.create.useMutation();
  const updateStock = trpc.variants.updateStock.useMutation();
  const updateVariantImage = trpc.variants.updateImage.useMutation();
  const lowStockAlerts = trpc.dashboard.lowStockAlerts.useQuery();
  const [uploadingVariantId, setUploadingVariantId] = useState<number | null>(null);

  // ===== HISTORIAL DE MOVIMIENTOS =====
  const [historyVariantId, setHistoryVariantId] = useState<number | null>(null);
  const [historyVariantLabel, setHistoryVariantLabel] = useState("");
  const movementsQuery = trpc.variants.getMovementsByVariant.useQuery(
    { variantId: historyVariantId || 0 },
    { enabled: historyVariantId !== null }
  );

  // ===== IMPORTAR CSV VARIANTES =====
  const [isVariantImportOpen, setIsVariantImportOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isInventoryScannerOpen, setIsInventoryScannerOpen] = useState(false);

  const handleInventoryScan = (code: string) => {
    const found = (variants.data ?? []).find(
      (v) => v.barcode === code || v.sku === code
    );
    if (found) {
      openRestockDialog(found);
    } else {
      playScanError();
      toast.error(`Código "${code}" no encontrado en este producto`);
    }
  };
  const [variantCsvRows, setVariantCsvRows] = useState<{ size: string; color: string; price: string; stock: string; sku: string; barcode: string; error?: string }[]>([]);
  const [isImportingVariants, setIsImportingVariants] = useState(false);

  const downloadVariantCsvTemplate = () => {
    const header = "talla,color,precio,stock,sku,codigo_barras";
    const example1 = "S,Negro,350.00,10,CAM-NEG-S,";
    const example2 = "M,Azul,350.00,8,CAM-AZU-M,7501234567890";
    const blob = new Blob([header + "\n" + example1 + "\n" + example2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_variantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVariantCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("El archivo está vacío o solo tiene encabezado"); return; }
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const [size, color, price, stock, sku, barcode] = cols;
        let error: string | undefined;
        if (!size) error = "Talla requerida";
        else if (!color) error = "Color requerido";
        else if (!price || isNaN(Number(price))) error = "Precio inválido";
        return { size: size ?? "", color: color ?? "", price: price ?? "", stock: stock ?? "0", sku: sku ?? "", barcode: barcode ?? "", error };
      });
      setVariantCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImportVariantCsv = async () => {
    if (!selectedProductId) return;
    const validRows = variantCsvRows.filter((r) => !r.error);
    if (validRows.length === 0) { toast.error("No hay filas válidas para importar"); return; }
    setIsImportingVariants(true);
    let success = 0;
    let failed = 0;
    for (const row of validRows) {
      try {
        await createVariant.mutateAsync({
          productId: selectedProductId,
          size: row.size,
          color: row.color,
          price: row.price,
          stock: parseInt(row.stock, 10) || 0,
          sku: row.sku || undefined,
          barcode: row.barcode || undefined,
        });
        success++;
      } catch { failed++; }
    }
    setIsImportingVariants(false);
    if (success > 0) {
      toast.success(`${success} variante${success > 1 ? "s" : ""} importada${success > 1 ? "s" : ""} correctamente${failed > 0 ? ` (${failed} con error)` : ""}`);
      setIsVariantImportOpen(false);
      setVariantCsvRows([]);
      await variants.refetch();
    } else {
      toast.error(`No se pudo importar ninguna variante`);
    }
  };

  const handleVariantImageUpload = async (variantId: number, file: File) => {
    setUploadingVariantId(variantId);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        await updateVariantImage.mutateAsync({ variantId, imageUrl: dataUrl });
        await variants.refetch();
        toast.success("Foto de variante actualizada");
        setUploadingVariantId(null);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error al subir la foto");
      setUploadingVariantId(null);
    }
  };

  const handleApplyTemplate = async (template: typeof VARIANT_TEMPLATES[0]) => {
    if (!selectedProductId || !selectedProduct) return;
    setIsApplyingTemplate(true);
    const basePrice = selectedProduct.basePrice || "0";
    let created = 0;
    try {
      for (const color of template.colors) {
        for (const size of template.sizes) {
          await createVariant.mutateAsync({
            productId: selectedProductId,
            size,
            color,
            stock: 0,
            price: basePrice,
          });
          created++;
        }
      }
      toast.success(`${created} variantes creadas con la plantilla "${template.label}"`);
      setIsCreateDialogOpen(false);
      await variants.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al aplicar la plantilla");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const selectedProduct = products.data?.find((product) => product.id === selectedProductId);
  const totalUnits = useMemo(
    () => (variants.data ?? []).reduce((sum, variant) => sum + variant.stock, 0),
    [variants.data],
  );

  const handleCreateVariant = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedProductId || !formData.size || !formData.color || !formData.price) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      await createVariant.mutateAsync({
        productId: selectedProductId,
        size: formData.size,
        color: formData.color,
        stock: parseInt(formData.stock, 10),
        price: formData.price,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
      });

      toast.success("Variante creada exitosamente");
      setFormData({
        size: "",
        color: "",
        stock: "0",
        price: "",
        sku: "",
        barcode: "",
      });
      setIsCreateDialogOpen(false);
      await variants.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al crear la variante");
    }
  };

  const handleUpdateStock = async (variantId: number, newStock: number, reason: string) => {
    try {
      await updateStock.mutateAsync({
        id: variantId,
        newStock,
        reason,
      });
      toast.success("Inventario actualizado");
      await variants.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar stock");
    }
  };

  const openRestockDialog = (variant: { id: number; stock: number; color: string; size: string }) => {
    setSelectedVariant(variant);
    setRestockQuantity("1");
    setRestockReason("Ingreso de mercancía");
    setManualTotalStock(String(variant.stock));
    setIsRestockDialogOpen(true);
  };

  const handleAddInventory = async () => {
    if (!selectedVariant) {
      toast.error("Selecciona una variante válida");
      return;
    }

    const quantity = parseInt(restockQuantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Ingresa una cantidad válida para agregar al inventario");
      return;
    }

    await handleUpdateStock(
      selectedVariant.id,
      selectedVariant.stock + quantity,
      restockReason || "Ingreso de mercancía",
    );
    setIsRestockDialogOpen(false);
  };

  const handleSetManualStock = async () => {
    if (!selectedVariant) {
      toast.error("Selecciona una variante válida");
      return;
    }

    const newStock = parseInt(manualTotalStock, 10);
    if (!Number.isFinite(newStock) || newStock < 0) {
      toast.error("Ingresa un stock total válido");
      return;
    }

    await handleUpdateStock(
      selectedVariant.id,
      newStock,
      restockReason || "Ajuste manual de inventario",
    );
    setIsRestockDialogOpen(false);
  };

  const lowStockCount = lowStockAlerts.data?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-primary">Gestión de Variantes e Inventario</h1>
          <p className="text-muted-foreground">
            Aquí puedes crear variantes y meter más producto de forma clara cuando llegue nueva mercancía.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Variantes visibles</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{variants.data?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Unidades del producto</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{totalUnits}</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Alertas de stock bajo</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        {lowStockCount > 0 && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                  <div>
                    <p className="font-semibold text-foreground">{lowStockCount} variantes con stock bajo</p>
                    <p className="text-sm text-muted-foreground">
                      Usa el botón <strong>Agregar inventario</strong> para reabastecer rápidamente la mercancía que acaba de llegar.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowLowStockList((prev) => !prev)}
                >
                  {showLowStockList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Ver cuáles
                </Button>
              </div>
              {showLowStockList && (
                <div className="mt-4 space-y-2">
                  {lowStockAlerts.data?.map((alert) => (
                    <div
                      key={alert.variant.id}
                      className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.product.name}</p>
                        <p className="text-xs text-muted-foreground">{alert.variant.color} • {alert.variant.size}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        alert.variant.stock === 0
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-destructive/20 text-destructive"
                      }`}>
                        {alert.variant.stock === 0 ? "Sin stock" : `${alert.variant.stock} uds.`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Seleccionar producto</CardTitle>
            <CardDescription>
              Elige un producto para gestionar sus variantes, sus existencias y los reingresos de mercancía.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProductId?.toString() || ""}
              onValueChange={(value) => setSelectedProductId(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {products.data?.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProduct && (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-secondary/40">
                  {selectedProduct.primaryImageUrl ? (
                    <img src={selectedProduct.primaryImageUrl} alt={selectedProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                      Sin foto
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedProduct.name}</h2>
                  <p className="text-muted-foreground">
                    Marca: {selectedProduct.brand} • Precio base: ${parseFloat(selectedProduct.basePrice).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Buscar variante por código de barras"
                  onClick={() => setIsInventoryScannerOpen(true)}
                  disabled={!selectedProductId || (variants.data?.length ?? 0) === 0}
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar por cámara</span>
                </Button>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4" />
                  Nueva variante
                </Button>
              </div>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-primary">Variantes</CardTitle>
                    <CardDescription>
                      Total: {variants.data?.length || 0} variantes. Usa el reabastecimiento rápido para meter más producto sin editar a ciegas el stock.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setIsVariantImportOpen(true)}
                      disabled={!selectedProductId}
                    >
                      <Upload className="h-3.5 w-3.5" /> Importar CSV
                    </Button>
                    {(variants.data?.length || 0) > 0 && (
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVariantViewMode("cards")}
                          className={`h-7 gap-1.5 px-2 text-xs ${variantViewMode === "cards" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVariantViewMode("matrix")}
                          className={`h-7 gap-1.5 px-2 text-xs ${variantViewMode === "matrix" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                        >
                          <Table2 className="h-3.5 w-3.5" /> Matriz
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {variants.isLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Cargando variantes...</p>
                  </div>
                ) : (variants.data?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center gap-6 py-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-10 w-10 text-primary" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-xl font-bold text-foreground">Este producto aún no tiene variantes</h3>
                      <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
                        <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">¿Qué son las variantes?</strong> Son las versiones de un producto: tallas, colores y tamaños.
                          Por ejemplo: una camisa azul talla M es una variante. Cada variante tiene su propio stock y precio.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["Azul / S", "Negro / M", "Blanco / L"].map((example) => (
                        <span key={example} className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                          {example}
                        </span>
                      ))}
                    </div>
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="gap-2 bg-accent px-6 py-5 text-base text-accent-foreground hover:bg-accent/90"
                    >
                      <Plus className="h-5 w-5" />
                      Crear mi primera variante
                    </Button>
                  </div>
                ) : variantViewMode === "matrix" ? (
                  (() => {
                    const allSizes = Array.from(new Set((variants.data || []).map((v) => v.size)));
                    const allColors = Array.from(new Set((variants.data || []).map((v) => v.color)));
                    const variantMap = new Map(
                      (variants.data || []).map((v) => [`${v.size}|${v.color}`, v])
                    );
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="border border-border bg-secondary/40 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Talla \ Color</th>
                              {allColors.map((color) => (
                                <th key={color} className="border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold text-foreground">
                                  {color}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allSizes.map((size) => (
                              <tr key={size}>
                                <td className="border border-border bg-secondary/20 px-3 py-2 text-xs font-semibold text-foreground">{size}</td>
                                {allColors.map((color) => {
                                  const v = variantMap.get(`${size}|${color}`);
                                  if (!v) {
                                    return (
                                      <td key={color} className="border border-border px-3 py-2 text-center text-muted-foreground">
                                        <span className="text-xs">—</span>
                                      </td>
                                    );
                                  }
                                  const isLow = v.stock <= 5;
                                  return (
                                    <td
                                      key={color}
                                      className={`cursor-pointer border px-3 py-2 text-center transition-colors hover:bg-primary/10 ${
                                        isLow ? "border-destructive/40 bg-destructive/10" : "border-border"
                                      }`}
                                      onClick={() => openRestockDialog(v)}
                                      title={`${v.color} / ${v.size} — $${parseFloat(v.price).toFixed(2)}`}
                                    >
                                      <span className={`text-sm font-bold ${isLow ? "text-destructive" : "text-foreground"}`}>
                                        {v.stock}
                                      </span>
                                      {isLow && <AlertTriangle className="mx-auto mt-0.5 h-3 w-3 text-destructive" />}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-3 text-xs text-muted-foreground">Haz clic en cualquier celda para ajustar el stock de esa variante.</p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {variants.data?.map((variant) => {
                      const isLowStock = variant.stock <= 5;
                      return (
                        <Card
                          key={variant.id}
                          className={`border ${isLowStock ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
                        >
                          <CardContent className="pt-4">
                            {/* Foto de variante */}
                            <div className="relative mb-3 group">
                              {variant.imageUrl ? (
                                <div className="relative">
                                  <img
                                    src={variant.imageUrl}
                                    alt={`${variant.color} ${variant.size}`}
                                    className="h-32 w-full rounded-lg object-cover"
                                  />
                                  <button
                                    className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={async () => {
                                      await updateVariantImage.mutateAsync({ variantId: variant.id, imageUrl: null });
                                      await variants.refetch();
                                      toast.success("Foto eliminada");
                                    }}
                                    title="Quitar foto"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                  <label
                                    htmlFor={`variant-img-${variant.id}`}
                                    className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    title="Cambiar foto"
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                  </label>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`variant-img-${variant.id}`}
                                  className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                                >
                                  {uploadingVariantId === variant.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <>
                                      <Camera className="h-5 w-5" />
                                      <span className="text-xs">Agregar foto</span>
                                    </>
                                  )}
                                </label>
                              )}
                              <input
                                id={`variant-img-${variant.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleVariantImageUpload(variant.id, file);
                                }}
                              />
                            </div>
                            <div className="mb-4 flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {variant.color} - {variant.size}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  ${parseFloat(variant.price).toFixed(2)}
                                </p>
                              </div>
                              {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stock actual</p>
                                <p className="mt-1 text-3xl font-bold text-foreground">{variant.stock}</p>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                                  onClick={() => openRestockDialog(variant)}
                                >
                                  <PackagePlus className="h-4 w-4" />
                                  Agregar inventario
                                </Button>
                                <Button
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => openRestockDialog(variant)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Ajustar stock
                                </Button>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => { setHistoryVariantId(variant.id); setHistoryVariantLabel(`${variant.color} / ${variant.size}`); }}
                              >
                                <History className="h-3.5 w-3.5" /> Ver historial de movimientos
                              </Button>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                {[1, 3, 5].map((amount) => (
                                  <Button
                                    key={amount}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStock(variant.id, variant.stock + amount, `Reabastecimiento rápido +${amount}`)}
                                    disabled={updateStock.isPending}
                                  >
                                    +{amount}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary">Crear nueva variante</DialogTitle>
              <DialogDescription>
                Agrega una nueva combinación de talla y color.
              </DialogDescription>
            </DialogHeader>

            {/* Plantillas rápidas */}
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Plantillas rápidas</p>
              </div>
              <p className="text-xs text-muted-foreground">Crea todas las variantes de una plantilla con un solo clic.</p>
              <div className="grid grid-cols-2 gap-2">
                {VARIANT_TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isApplyingTemplate}
                    onClick={() => handleApplyTemplate(template)}
                    className="flex h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
                  >
                    {isApplyingTemplate ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="text-xs font-semibold">{template.label}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{template.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">o crea una variante individual</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-4">
              <div>
                <Label htmlFor="size" className="font-semibold text-foreground">
                  Talla *
                </Label>
                <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona una talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color" className="font-semibold text-foreground">
                  Color *
                </Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price" className="font-semibold text-foreground">
                  Precio *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                  placeholder="0.00"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="stock" className="font-semibold text-foreground">
                  Stock inicial
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(event) => setFormData({ ...formData, stock: event.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="sku" className="font-semibold text-foreground">
                  SKU <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ej: CAM-NEG-M"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-xs"
                    onClick={() => {
                      const prod = selectedProduct;
                      const initials = prod ? prod.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 3) : "PRD";
                      const colorCode = (formData.color || "X").slice(0, 3).toUpperCase();
                      const sizeCode = (formData.size || "U").toUpperCase();
                      setFormData({ ...formData, sku: `${initials}-${colorCode}-${sizeCode}` });
                    }}
                  >
                    Generar
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="barcode" className="font-semibold text-foreground">
                  Código de barras <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ej: 7501234567890"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Escanear con cámara"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-xs"
                    onClick={() => {
                      const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
                      const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
                      const check = (10 - (sum % 10)) % 10;
                      setFormData({ ...formData, barcode: [...digits, check].join("") });
                    }}
                  >
                    Generar
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={createVariant.isPending}
                >
                  {createVariant.isPending ? "Creando..." : "Crear variante"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isRestockDialogOpen}
          onOpenChange={(open) => {
            setIsRestockDialogOpen(open);
            if (!open) {
              setSelectedVariant(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-primary">Agregar inventario</DialogTitle>
              <DialogDescription>
                Suma nuevas piezas al stock actual o ajusta el total final de la variante seleccionada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {selectedProduct?.name || "Producto"}
                  {selectedVariant ? ` · ${selectedVariant.color} / ${selectedVariant.size}` : ""}
                </p>
                <p className="mt-1">Stock actual: {selectedVariant?.stock ?? 0} unidades</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restock-quantity">Cantidad a agregar</Label>
                <Input
                  id="restock-quantity"
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(event) => setRestockQuantity(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restock-reason">Motivo</Label>
                <Input
                  id="restock-reason"
                  value={restockReason}
                  onChange={(event) => setRestockReason(event.target.value)}
                  placeholder="Ingreso de mercancía, conteo físico, ajuste por devolución..."
                />
              </div>

              <div className="rounded-xl border border-dashed border-border p-4">
                <p className="text-sm font-medium text-foreground">Ajuste manual del total</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Si no quieres sumar piezas sino corregir el número final, escribe aquí el nuevo stock total.
                </p>
                <Input
                  className="mt-3"
                  type="number"
                  min="0"
                  value={manualTotalStock}
                  onChange={(event) => setManualTotalStock(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsRestockDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline" onClick={handleSetManualStock} disabled={updateStock.isPending}>
                  Guardar stock total
                </Button>
                <Button type="button" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddInventory} disabled={updateStock.isPending}>
                  Sumar inventario
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      {/* ===== DIALOG HISTORIAL DE MOVIMIENTOS ===== */}
      <Dialog open={historyVariantId !== null} onOpenChange={(open) => { if (!open) setHistoryVariantId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">Historial de movimientos</DialogTitle>
            <DialogDescription>{selectedProduct?.name} — {historyVariantLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {movementsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (movementsQuery.data?.length || 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <History className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No hay movimientos registrados para esta variante todavía.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary/90">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsQuery.data?.map((mov) => {
                      const isOut = mov.movementType === "sale" || mov.quantity < 0;
                      const typeLabel: Record<string, string> = { sale: "Venta", adjustment: "Ajuste", return: "Devolución", purchase: "Compra" };
                      return (
                        <tr key={mov.id} className="border-t border-border hover:bg-secondary/30">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(mov.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              mov.movementType === "sale" ? "bg-red-500/10 text-red-500" :
                              mov.movementType === "return" ? "bg-yellow-500/10 text-yellow-600" :
                              mov.movementType === "purchase" ? "bg-green-500/10 text-green-600" :
                              "bg-blue-500/10 text-blue-500"
                            }`}>{typeLabel[mov.movementType] || mov.movementType}</span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${isOut ? "text-red-500" : "text-green-600"}`}>
                            {isOut ? "-" : "+"}{Math.abs(mov.quantity)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{mov.reason || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setHistoryVariantId(null)}>Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG IMPORTAR CSV VARIANTES ===== */}
      <Dialog open={isVariantImportOpen} onOpenChange={(open) => { setIsVariantImportOpen(open); if (!open) setVariantCsvRows([]); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">Importar variantes desde CSV</DialogTitle>
            <DialogDescription>Sube un archivo CSV con las variantes del producto. Descarga la plantilla para ver el formato correcto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadVariantCsvTemplate}>
                <FileText className="h-4 w-4" /> Descargar plantilla CSV
              </Button>
              <span className="text-xs text-muted-foreground">Columnas: talla, color, precio, stock, sku, codigo_barras</span>
            </div>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 p-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
              onClick={() => document.getElementById("variant-csv-input")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleVariantCsvFile(file); }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arrastra tu CSV aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">Solo archivos .csv</p>
              <input id="variant-csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVariantCsvFile(file); }} />
            </div>
            {variantCsvRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Vista previa — {variantCsvRows.filter((r) => !r.error).length} válidas, {variantCsvRows.filter((r) => r.error).length} con error
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/80">
                      <tr>
                        <th className="px-3 py-2 text-left">Talla</th>
                        <th className="px-3 py-2 text-left">Color</th>
                        <th className="px-3 py-2 text-left">Precio</th>
                        <th className="px-3 py-2 text-left">Stock</th>
                        <th className="px-3 py-2 text-left">SKU</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantCsvRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={row.error ? "bg-red-500/10" : "hover:bg-secondary/40"}>
                          <td className="px-3 py-1.5">{row.size || "—"}</td>
                          <td className="px-3 py-1.5">{row.color || "—"}</td>
                          <td className="px-3 py-1.5">${row.price}</td>
                          <td className="px-3 py-1.5">{row.stock}</td>
                          <td className="px-3 py-1.5">{row.sku || "—"}</td>
                          <td className="px-3 py-1.5">
                            {row.error ? (
                              <span className="font-medium text-red-500">{row.error}</span>
                            ) : (
                              <span className="font-medium text-green-500">✓ OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {variantCsvRows.length > 10 && <p className="text-xs text-muted-foreground">Mostrando 10 de {variantCsvRows.length} filas</p>}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setIsVariantImportOpen(false); setVariantCsvRows([]); }}>Cancelar</Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={variantCsvRows.filter((r) => !r.error).length === 0 || isImportingVariants}
                onClick={handleImportVariantCsv}
              >
                {isImportingVariants ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : `Importar ${variantCsvRows.filter((r) => !r.error).length} variante${variantCsvRows.filter((r) => !r.error).length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      {/* Escáner de código de barras para el campo barcode */}
      <BarcodeCameraScanner
        open={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onDetected={(code) => {
          setFormData((prev) => ({ ...prev, barcode: code }));
          toast.success(`Código capturado: ${code}`);
        }}
      />

      {/* Escáner de inventario — busca variante y abre ajuste de stock */}
      <BarcodeCameraScanner
        open={isInventoryScannerOpen}
        onClose={() => setIsInventoryScannerOpen(false)}
        onDetected={handleInventoryScan}
      />
    </DashboardLayout>
  );
}
