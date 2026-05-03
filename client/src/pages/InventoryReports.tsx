import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, TrendingDown, Package, Download, Store, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function InventoryReports() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<"stock" | "name" | "value">("stock");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedMovementVariantId, setSelectedMovementVariantId] = useState<string>("");

  // Block free plan users from accessing advanced reports
  if (user?.subscriptionPlan === "free") {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Reportes de Inventario</h1>
            <p className="text-muted-foreground">
              Análisis detallado del inventario por sucursal
            </p>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Función Premium</strong>
                  <p className="mt-1 text-sm">
                    Los reportes avanzados de inventario están disponibles solo en planes pagos. Actualiza tu plan para acceder a análisis detallados, alertas de stock y exportación de reportes.
                  </p>
                </div>
                <Button
                  className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => window.location.href = "/planes-y-acceso"}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Ver Planes
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const branches = trpc.branches.list.useQuery();
  const branchInventory = trpc.branches.inventory.useQuery(
    { branchId: Number(selectedBranchId) },
    { enabled: Boolean(selectedBranchId) }
  );

  const selectedBranch = branches.data?.find((branch) => branch.id === Number(selectedBranchId));

  const inventoryRows = useMemo(() => {
    return (branchInventory.data || []).map((item: any) => ({
      productName: item.product.name,
      variantId: item.variant.id,
      size: item.variant.size,
      color: item.variant.color,
      stock: item.inventory.stock,
      price: parseFloat(item.variant.price || item.product.basePrice || "0"),
      sku: item.product.sku,
    }));
  }, [branchInventory.data]);

  const lowStockAlerts = useMemo(() => {
    return inventoryRows.filter((item) => item.stock <= 5);
  }, [inventoryRows]);

  const inventoryValue = useMemo(() => {
    return inventoryRows.reduce((total, item) => total + item.price * item.stock, 0);
  }, [inventoryRows]);

  const totalItems = useMemo(() => {
    return inventoryRows.reduce((total, item) => total + item.stock, 0);
  }, [inventoryRows]);

  const sortedVariants = useMemo(() => {
    const sorted = [...inventoryRows];

    switch (sortBy) {
      case "stock":
        return sorted.sort((a, b) => a.stock - b.stock);
      case "name":
        return sorted.sort((a, b) => a.productName.localeCompare(b.productName));
      case "value":
        return sorted.sort((a, b) => b.price * b.stock - a.price * a.stock);
      default:
        return sorted;
    }
  }, [inventoryRows, sortBy]);

  useEffect(() => {
    if (!sortedVariants.length) {
      setSelectedMovementVariantId("");
      return;
    }

    setSelectedMovementVariantId((current) => {
      if (current && sortedVariants.some((item) => item.variantId.toString() === current)) {
        return current;
      }
      return sortedVariants[0]?.variantId.toString() ?? "";
    });
  }, [sortedVariants]);

  const movementHistoryQuery = trpc.inventory.getMovementsByVariant.useQuery(
    { variantId: Number(selectedMovementVariantId) },
    { enabled: Boolean(selectedMovementVariantId) },
  );

  const selectedMovementVariant = sortedVariants.find(
    (item) => item.variantId === Number(selectedMovementVariantId),
  );

  const handleExportReport = () => {
    if (!selectedBranch || sortedVariants.length === 0) {
      toast.error("Selecciona una sucursal con inventario para exportar el reporte");
      return;
    }

    try {
      const headers = ["Sucursal", "Producto", "SKU", "Talla", "Color", "Stock", "Precio", "Valor Total"];
      const rows = sortedVariants.map((item) => [
        selectedBranch.name,
        item.productName,
        item.sku,
        item.size,
        item.color,
        item.stock.toString(),
        item.price.toFixed(2),
        (item.price * item.stock).toFixed(2),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
        "",
        ["RESUMEN"].join(","),
        [`Sucursal,${selectedBranch.name}`],
        [`Total de Artículos,${totalItems}`],
        [`Valor Total de Inventario,$${inventoryValue.toFixed(2)}`],
        [`Alertas de Stock Bajo,${lowStockAlerts.length}`],
      ].join("\n");

      const element = document.createElement("a");
      element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
      element.setAttribute(
        "download",
        `reporte-inventario-${selectedBranch.code || "sucursal"}-${new Date().toISOString().split("T")[0]}.csv`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Reporte exportado exitosamente");
    } catch {
      toast.error("Error al exportar el reporte");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-primary">Reportes de Inventario</h1>
            <p className="text-muted-foreground">
              Seguimiento del inventario por sucursal para identificar faltantes y valor disponible.
            </p>
          </div>
          <Button
            onClick={handleExportReport}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1.2fr]">
            <div>
              <Label className="font-semibold text-foreground">Sucursal para reporte</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.data?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <Store className="h-4 w-4" />
                Vista multi-sucursal
              </div>
              <p>
                {selectedBranch
                  ? `El reporte actual consolida únicamente el inventario operativo de ${selectedBranch.name}.`
                  : "Selecciona una sucursal para consultar sus existencias, alertas y valor de inventario."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Total de Artículos</p>
                  <p className="text-3xl font-bold text-foreground">{totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-3xl font-bold text-accent">${inventoryValue.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-3xl font-bold text-destructive">{lowStockAlerts.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {lowStockAlerts.length > 0 ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Productos con Stock Bajo
              </CardTitle>
              <CardDescription>
                Alertas activas en {selectedBranch?.name || "la sucursal seleccionada"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockAlerts.map((alert) => (
                  <div
                    key={alert.variantId}
                    className="flex items-center justify-between rounded-lg border border-destructive/20 bg-background p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.color} - {alert.size} • {alert.sku}
                      </p>
                    </div>
                    <Badge variant="destructive">{alert.stock} unidades</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Detalles de Inventario</CardTitle>
            <CardDescription>
              {selectedBranch
                ? `${sortedVariants.length} variantes registradas en ${selectedBranch.name}`
                : "Selecciona una sucursal para ver sus existencias"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button variant={sortBy === "stock" ? "default" : "outline"} size="sm" onClick={() => setSortBy("stock")}>
                Ordenar por Stock
              </Button>
              <Button variant={sortBy === "name" ? "default" : "outline"} size="sm" onClick={() => setSortBy("name")}>
                Ordenar por Nombre
              </Button>
              <Button variant={sortBy === "value" ? "default" : "outline"} size="sm" onClick={() => setSortBy("value")}>
                Ordenar por Valor
              </Button>
            </div>

            {branchInventory.isLoading ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Cargando inventario...</p>
              </div>
            ) : !selectedBranchId ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Selecciona una sucursal para comenzar.</p>
              </div>
            ) : sortedVariants.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No hay inventario registrado en esta sucursal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Producto</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Talla</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Color</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Stock</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Precio</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVariants.map((item) => {
                      const isLowStock = item.stock <= 5;
                      const variantValue = item.price * item.stock;

                      return (
                        <tr
                          key={item.variantId}
                          className={`border-b border-border transition-colors hover:bg-secondary ${isLowStock ? "bg-destructive/5" : ""}`}
                        >
                          <td className="px-4 py-3 text-foreground">{item.productName}</td>
                          <td className="px-4 py-3 text-foreground">{item.sku}</td>
                          <td className="px-4 py-3 text-foreground">{item.size}</td>
                          <td className="px-4 py-3 text-foreground">{item.color}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={isLowStock ? "destructive" : "secondary"}>{item.stock}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">${item.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-accent">${variantValue.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary">
                      <td colSpan={4} className="px-4 py-3 font-bold text-foreground">TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{totalItems}</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-accent">${inventoryValue.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Historial de movimientos de inventario</CardTitle>
            <CardDescription>
              {selectedMovementVariant
                ? `Últimos movimientos registrados para ${selectedMovementVariant.productName} (${selectedMovementVariant.color} - ${selectedMovementVariant.size}).`
                : "Selecciona una sucursal con variantes para consultar sus movimientos."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold text-foreground">Variante a revisar</Label>
              <Select value={selectedMovementVariantId} onValueChange={setSelectedMovementVariantId}>
                <SelectTrigger className="mt-2 max-w-xl">
                  <SelectValue placeholder="Selecciona una variante" />
                </SelectTrigger>
                <SelectContent>
                  {sortedVariants.map((item) => (
                    <SelectItem key={item.variantId} value={item.variantId.toString()}>
                      {item.productName} · {item.color} · {item.size} · SKU {item.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {movementHistoryQuery.isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando movimientos...</div>
            ) : !selectedMovementVariantId ? (
              <div className="py-8 text-center text-muted-foreground">No hay variantes disponibles para consultar movimientos.</div>
            ) : !(movementHistoryQuery.data?.length) ? (
              <div className="py-8 text-center text-muted-foreground">Todavía no hay movimientos registrados para esta variante.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Tipo</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Cantidad</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementHistoryQuery.data.map((movement: any) => (
                      <tr key={movement.id} className="border-b border-border transition-colors hover:bg-secondary">
                        <td className="px-4 py-3 text-foreground">{new Date(movement.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-foreground capitalize">{movement.movementType}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{movement.quantity}</td>
                        <td className="px-4 py-3 text-muted-foreground">{movement.reason || "Sin detalle"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
