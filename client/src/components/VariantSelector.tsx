import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Palette, Ruler } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VariantSelectorProps {
  isOpen: boolean;
  productId: number | null;
  productName: string;
  branchId?: number | null;
  branchName?: string;
  onClose: () => void;
  onAdd: (item: {
    variantId: number;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }) => void;
}

export function VariantSelector({
  isOpen,
  productId,
  productName,
  branchId,
  branchName,
  onClose,
  onAdd,
}: VariantSelectorProps) {
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState("1");

  const variants = trpc.variants.getByProductId.useQuery(
    { productId: productId || 0, branchId: branchId || undefined },
    { enabled: isOpen && productId !== null },
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedColor("");
      setSelectedSize("");
      setQuantity("1");
    }
  }, [isOpen, productId]);

  const colorOptions = useMemo(() => {
    return Array.from(new Set((variants.data ?? []).map((variant) => variant.color))).filter(Boolean);
  }, [variants.data]);

  const variantsForSelectedColor = useMemo(() => {
    if (!selectedColor) return [];
    return (variants.data ?? []).filter((variant) => variant.color === selectedColor);
  }, [selectedColor, variants.data]);

  const sizeOptions = useMemo(() => {
    return Array.from(new Set(variantsForSelectedColor.map((variant) => variant.size))).filter(Boolean);
  }, [variantsForSelectedColor]);

  useEffect(() => {
    if (!colorOptions.length) return;

    const colorStillExists = colorOptions.includes(selectedColor);
    if (!selectedColor || !colorStillExists) {
      const preferredColor =
        colorOptions.find((color) => (variants.data ?? []).some((variant) => variant.color === color && variant.stock > 0)) ??
        colorOptions[0];
      setSelectedColor(preferredColor);
    }
  }, [colorOptions, selectedColor, variants.data]);

  useEffect(() => {
    if (!sizeOptions.length) {
      setSelectedSize("");
      return;
    }

    const sizeStillExists = sizeOptions.includes(selectedSize);
    if (!selectedSize || !sizeStillExists) {
      const preferredSize =
        sizeOptions.find((size) => variantsForSelectedColor.some((variant) => variant.size === size && variant.stock > 0)) ??
        sizeOptions[0];
      setSelectedSize(preferredSize);
    }
  }, [selectedSize, sizeOptions, variantsForSelectedColor]);

  const selectedVariant = useMemo(() => {
    return (
      variantsForSelectedColor.find(
        (variant) => variant.color === selectedColor && variant.size === selectedSize,
      ) ?? null
    );
  }, [selectedColor, selectedSize, variantsForSelectedColor]);

  const isOutOfStock = Boolean(selectedVariant && selectedVariant.stock <= 0);
  const maxQuantity = selectedVariant?.stock || 0;

  const computedTotal = useMemo(() => {
    if (!selectedVariant) return 0;
    return parseFloat(selectedVariant.price) * Math.max(parseInt(quantity || "1", 10), 1);
  }, [quantity, selectedVariant]);

  const handleAdd = () => {
    if (!selectedVariant) return;

    const qty = Math.max(parseInt(quantity, 10) || 1, 1);
    const unitPrice = parseFloat(selectedVariant.price);

    onAdd({
      variantId: selectedVariant.id,
      productName,
      size: selectedVariant.size,
      color: selectedVariant.color,
      quantity: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    });

    setSelectedColor("");
    setSelectedSize("");
    setQuantity("1");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-primary">Agregar al carrito</DialogTitle>
          <DialogDescription>
            {productName}
            {branchName ? ` • Stock de ${branchName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 rounded-2xl border border-border bg-secondary/20 p-4 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <Label className="font-semibold text-foreground">Color</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => {
                  const hasStock = (variants.data ?? []).some((variant) => variant.color === color && variant.stock > 0);
                  return (
                    <Button
                      key={color}
                      type="button"
                      variant={selectedColor === color ? "default" : "outline"}
                      className="min-w-[88px]"
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                      {!hasStock ? " • Agotado" : ""}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <Label className="font-semibold text-foreground">Talla</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const variant = variantsForSelectedColor.find((item) => item.size === size) ?? null;
                  const disabled = !variant || variant.stock <= 0;
                  return (
                    <Button
                      key={`${selectedColor}-${size}`}
                      type="button"
                      variant={selectedSize === size ? "default" : "outline"}
                      className="min-w-[72px]"
                      disabled={disabled}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {!variants.isLoading && (variants.data?.length ?? 0) === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-600">⚠️ Este producto no tiene variantes registradas para esta sucursal. Puedes agregarlo al carrito de todas formas.</p>
            </div>
          ) : null}

          {isOutOfStock ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">La combinación elegida no tiene existencias en esta sucursal.</p>
            </div>
          ) : null}

          {selectedVariant && !isOutOfStock ? (
            <div className="rounded-lg border border-border bg-background/80 p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Combinación</span>
                <span className="font-semibold text-foreground">{selectedVariant.color} · {selectedVariant.size}</span>
              </div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Precio</span>
                <span className="font-semibold text-foreground">${parseFloat(selectedVariant.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stock disponible</span>
                <span className="font-semibold text-foreground">{selectedVariant.stock}</span>
              </div>
            </div>
          ) : (variants.data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-border bg-background/80 p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Producto</span>
                <span className="font-semibold text-foreground">{productName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio base</span>
                <span className="font-semibold text-foreground">Por confirmar</span>
              </div>
            </div>
          ) : null}

          {selectedVariant && !isOutOfStock ? (
            <div>
              <Label htmlFor="quantity" className="font-semibold text-foreground">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-2"
              />
              {parseInt(quantity || "0", 10) > maxQuantity ? (
                <p className="mt-1 text-xs text-destructive">Cantidad no disponible. Máximo: {maxQuantity}</p>
              ) : null}
            </div>
          ) : (variants.data?.length ?? 0) === 0 ? (
            <div>
              <Label htmlFor="quantity" className="font-semibold text-foreground">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-2"
              />
            </div>
          ) : null}

          {selectedVariant && !isOutOfStock ? (
            <div className="rounded-lg border border-accent/50 bg-accent/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-accent">${computedTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (variants.data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-600 mb-2">Este producto se agregará sin variante específica. Confirma la cantidad y precio en el carrito.</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!selectedVariant && (variants.data?.length ?? 0) > 0 || isOutOfStock || parseInt(quantity || "0", 10) > maxQuantity}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Agregar al carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
