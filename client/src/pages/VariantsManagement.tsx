import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Edit2, PackagePlus, Plus } from "lucide-react";
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
  });

  const products = trpc.products.list.useQuery();
  const variants = trpc.variants.getByProductId.useQuery(
    { productId: selectedProductId || 0 },
    { enabled: selectedProductId !== null },
  );
  const createVariant = trpc.variants.create.useMutation();
  const updateStock = trpc.variants.updateStock.useMutation();
  const lowStockAlerts = trpc.dashboard.lowStockAlerts.useQuery();

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
      });

      toast.success("Variante creada exitosamente");
      setFormData({
        size: "",
        color: "",
        stock: "0",
        price: "",
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
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">{lowStockCount} variantes con stock bajo</p>
                <p className="text-sm text-muted-foreground">
                  Usa el botón <strong>Agregar inventario</strong> para reabastecer rápidamente la mercancía que acaba de llegar.
                </p>
              </div>
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
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" />
                Nueva variante
              </Button>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary">Variantes</CardTitle>
                <CardDescription>
                  Total: {variants.data?.length || 0} variantes. Usa el reabastecimiento rápido para meter más producto sin editar a ciegas el stock.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variants.isLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Cargando variantes...</p>
                  </div>
                ) : (variants.data?.length || 0) === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No hay variantes registradas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {variants.data?.map((variant) => {
                      const isLowStock = variant.stock <= 5;
                      return (
                        <Card
                          key={variant.id}
                          className={`border ${isLowStock ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
                        >
                          <CardContent className="pt-6">
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
      </div>
    </DashboardLayout>
  );
}
