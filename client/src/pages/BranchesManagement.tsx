import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { routeProductScannerCode } from "@/lib/barcodeRouting";
import { BARCODE_SCANNED_EVENT } from "@/lib/posHardware";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Building2, MapPin, Package2, Plus, Sparkles, Truck } from "lucide-react";
import { toast } from "sonner";

const initialBranchForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  manager: "",
};

const initialTransferForm = {
  fromBranchId: "",
  toBranchId: "",
  productId: "",
  variantId: "",
  quantity: "1",
  reason: "",
};

export default function BranchesManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Card className="border-border/70 bg-background/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Acceso Restringido</CardTitle>
              <CardDescription>
                Solo los administradores pueden gestionar sucursales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contacta a un administrador si necesitas crear o modificar sucursales.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [, setLocation] = useLocation();
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [branchForm, setBranchForm] = useState(initialBranchForm);
  const [transferForm, setTransferForm] = useState(initialTransferForm);

  const utils = trpc.useUtils();
  const branchesQuery = trpc.branches.list.useQuery();
  const transfersQuery = trpc.branches.transfers.useQuery();
  const productsQuery = trpc.products.list.useQuery();
  const variantsQuery = trpc.variants.getByProductId.useQuery(
    { productId: Number(transferForm.productId || 0) },
    { enabled: Boolean(transferForm.productId) }
  );

  const createBranch = trpc.branches.create.useMutation({
    onSuccess: async () => {
      toast.success("Sucursal creada correctamente");
      setBranchForm(initialBranchForm);
      setIsBranchDialogOpen(false);
      await utils.branches.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "No se pudo crear la sucursal"),
  });

  const createTransfer = trpc.branches.createTransfer.useMutation({
    onSuccess: async () => {
      toast.success("Traspaso registrado correctamente");
      setTransferForm(initialTransferForm);
      setIsTransferDialogOpen(false);
      await Promise.all([
        utils.branches.transfers.invalidate(),
        utils.branches.list.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "No se pudo crear el traspaso"),
  });

  const receiveTransfer = trpc.branches.receiveTransfer.useMutation({
    onSuccess: async () => {
      toast.success("Traspaso marcado como recibido");
      await utils.branches.transfers.invalidate();
    },
    onError: (error) => toast.error(error.message || "No se pudo confirmar el traspaso"),
  });

  const branchCount = branchesQuery.data?.length ?? 0;
  const pendingTransfers = useMemo(
    () => (transfersQuery.data ?? []).filter((transfer) => transfer.status !== "received"),
    [transfersQuery.data]
  );

  const selectedProduct = productsQuery.data?.find(
    (product) => product.id === Number(transferForm.productId || 0)
  );

  const selectedVariant = variantsQuery.data?.find(
    (variant) => variant.id === Number(transferForm.variantId || 0)
  );

  const handleBranchChange = (field: keyof typeof initialBranchForm, value: string) => {
    setBranchForm((current) => ({ ...current, [field]: value }));
  };

  const handleTransferChange = (field: keyof typeof initialTransferForm, value: string) => {
    setTransferForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "productId" ? { variantId: "" } : {}),
    }));
  };

  const handleCreateBranch = async () => {
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      toast.error("Nombre y código son obligatorios");
      return;
    }

    if (branchCount >= 3) {
      toast.error("Límite de 3 sucursales alcanzado. Contáctanos para agregar más.");
      return;
    }

    await createBranch.mutateAsync({
      name: branchForm.name.trim(),
      code: branchForm.code.trim(),
      address: branchForm.address.trim() || undefined,
      city: branchForm.city.trim() || undefined,
      state: branchForm.state.trim() || undefined,
      zipCode: branchForm.zipCode.trim() || undefined,
      phone: branchForm.phone.trim() || undefined,
      email: branchForm.email.trim() || undefined,
      manager: branchForm.manager.trim() || undefined,
    });
  };

  const handleCreateTransfer = async () => {
    if (
      !transferForm.fromBranchId ||
      !transferForm.toBranchId ||
      !transferForm.variantId ||
      !transferForm.quantity
    ) {
      toast.error("Completa origen, destino, variante y cantidad");
      return;
    }

    await createTransfer.mutateAsync({
      fromBranchId: Number(transferForm.fromBranchId),
      toBranchId: Number(transferForm.toBranchId),
      productVariantId: Number(transferForm.variantId),
      quantity: Number(transferForm.quantity),
      reason: transferForm.reason.trim() || undefined,
    });
  };

  const branchNameById = (branchId: number) =>
    branchesQuery.data?.find((branch) => branch.id === branchId)?.name || `Sucursal #${branchId}`;

  useEffect(() => {
    const handleBarcodeScanned = (event: Event) => {
      if (!isBranchDialogOpen) return;
      const customEvent = event as CustomEvent<{ code: string }>;
      const routed = routeProductScannerCode({
        scannedCode: customEvent.detail?.code ?? "",
        isCreateDialogOpen: true,
      });
      if (!routed || routed.mode !== "form") return;

      setBranchForm((current) => ({ ...current, code: routed.nextSku }));
      toast.success(`Código de sucursal capturado desde lector: ${routed.nextSku}`);
    };

    window.addEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
    return () => window.removeEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
  }, [isBranchDialogOpen]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Control multi-sucursal
              </div>
              <div>
                <h1 className="text-4xl font-bold text-primary md:text-5xl">Sucursales con mejor orden operativo</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                  Aquí organizas ubicaciones, decides desde dónde opera la caja y controlas traspasos entre sucursales sin perder claridad en el inventario.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button className="h-auto justify-start gap-3 rounded-2xl px-4 py-4 text-left" onClick={() => setIsBranchDialogOpen(true)}>
                  <Plus className="h-5 w-5" />
                  <span>
                    <span className="block font-semibold">Nueva sucursal</span>
                    <span className="block text-xs opacity-80">Alta rápida de una ubicación</span>
                  </span>
                </Button>
                <Button variant="outline" className="h-auto justify-start gap-3 rounded-2xl px-4 py-4 text-left" onClick={() => setIsTransferDialogOpen(true)}>
                  <Truck className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-semibold text-foreground">Nuevo traspaso</span>
                    <span className="block text-xs text-muted-foreground">Mueve stock entre sucursales</span>
                  </span>
                </Button>
                <Button variant="outline" className="h-auto justify-start gap-3 rounded-2xl px-4 py-4 text-left" onClick={() => setLocation("/products")}>
                  <Package2 className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-semibold text-foreground">Productos</span>
                    <span className="block text-xs text-muted-foreground">Revisar asignación por sucursal</span>
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="border-white/70 bg-white/90 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Sucursales activas</CardDescription>
                  <CardTitle className="text-3xl text-primary">{branchCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-white/70 bg-white/90 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Traspasos pendientes</CardDescription>
                  <CardTitle className="text-3xl text-primary">{pendingTransfers.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-white/70 bg-white/90 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Estado del módulo</CardDescription>
                  <CardTitle className="text-lg text-primary">Operación multi-sucursal activa</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                Sucursales registradas
              </CardTitle>
              <CardDescription>
                Cada sucursal puede operar inventario independiente y participar en traspasos controlados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {branchesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando sucursales...</p>
              ) : (branchesQuery.data?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="font-medium text-foreground">Aún no hay sucursales registradas</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Crea la primera sucursal para comenzar a distribuir stock por ubicación.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {branchesQuery.data?.map((branch) => (
                    <div key={branch.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{branch.name}</h3>
                          <p className="text-sm text-muted-foreground">Código: {branch.code}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Activa
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {branch.address ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4" />
                            <span>
                              {branch.address}
                              {branch.city ? `, ${branch.city}` : ""}
                              {branch.state ? `, ${branch.state}` : ""}
                            </span>
                          </div>
                        ) : null}
                        <p>Responsable: {branch.manager || "Sin asignar"}</p>
                        <p>Contacto: {branch.phone || branch.email || "Pendiente"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Truck className="h-5 w-5" />
                Traspasos recientes
              </CardTitle>
              <CardDescription>
                Envía existencias entre sucursales y confirma la recepción desde esta misma vista.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {transfersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando traspasos...</p>
              ) : (transfersQuery.data?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="font-medium text-foreground">Sin traspasos registrados</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cuando muevas inventario entre sucursales, aquí aparecerá el historial operativo.
                  </p>
                </div>
              ) : (
                transfersQuery.data?.map((transfer) => (
                  <div key={transfer.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Traspaso #{transfer.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {transfer.quantity} unidades • {branchNameById(transfer.fromBranchId)} → {branchNameById(transfer.toBranchId)}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                        {transfer.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>Variante #{transfer.productVariantId}</span>
                      {transfer.reason ? <span>Motivo: {transfer.reason}</span> : null}
                    </div>

                    {transfer.status !== "received" ? (
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => receiveTransfer.mutate({ transferId: transfer.id })}
                          disabled={receiveTransfer.isPending}
                        >
                          <Package2 className="h-4 w-4" />
                          Marcar como recibido
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nueva sucursal</DialogTitle>
            <DialogDescription>
              Captura los datos básicos de la ubicación para habilitar inventario independiente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Nombre</Label>
              <Input id="branch-name" value={branchForm.name} onChange={(e) => handleBranchChange("name", e.target.value)} />
            </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Código</Label>
                <Input id="branch-code" value={branchForm.code} onChange={(e) => handleBranchChange("code", e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Si el lector está activo, también puedes capturar este código automáticamente desde el formulario.
                </p>
              </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="branch-address">Dirección</Label>
              <Input id="branch-address" value={branchForm.address} onChange={(e) => handleBranchChange("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-city">Ciudad</Label>
              <Input id="branch-city" value={branchForm.city} onChange={(e) => handleBranchChange("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-state">Estado</Label>
              <Input id="branch-state" value={branchForm.state} onChange={(e) => handleBranchChange("state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-zip">Código postal</Label>
              <Input id="branch-zip" value={branchForm.zipCode} onChange={(e) => handleBranchChange("zipCode", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Teléfono</Label>
              <Input id="branch-phone" value={branchForm.phone} onChange={(e) => handleBranchChange("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-email">Correo</Label>
              <Input id="branch-email" value={branchForm.email} onChange={(e) => handleBranchChange("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-manager">Responsable</Label>
              <Input id="branch-manager" value={branchForm.manager} onChange={(e) => handleBranchChange("manager", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBranch} disabled={createBranch.isPending}>
              {createBranch.isPending ? "Guardando..." : "Crear sucursal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo traspaso</DialogTitle>
            <DialogDescription>
              Registra el movimiento de existencias entre sucursales con control de origen, destino y variante.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Sucursal origen</Label>
              <Select value={transferForm.fromBranchId} onValueChange={(value) => handleTransferChange("fromBranchId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  {branchesQuery.data?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sucursal destino</Label>
              <Select value={transferForm.toBranchId} onValueChange={(value) => handleTransferChange("toBranchId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                  {branchesQuery.data?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={transferForm.productId} onValueChange={(value) => handleTransferChange("productId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {productsQuery.data?.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variante</Label>
              <Select value={transferForm.variantId} onValueChange={(value) => handleTransferChange("variantId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona variante" />
                </SelectTrigger>
                <SelectContent>
                  {variantsQuery.data?.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id.toString()}>
                      {variant.color} - {variant.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-quantity">Cantidad</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min="1"
                value={transferForm.quantity}
                onChange={(e) => handleTransferChange("quantity", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-reason">Motivo</Label>
              <Input
                id="transfer-reason"
                value={transferForm.reason}
                onChange={(e) => handleTransferChange("reason", e.target.value)}
                placeholder="Reabasto, evento, reposición..."
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Resumen del movimiento</p>
            <p className="mt-2">
              {branchNameById(Number(transferForm.fromBranchId || 0))} → {branchNameById(Number(transferForm.toBranchId || 0))}
            </p>
            <p>
              {selectedProduct?.name || "Producto pendiente"}
              {selectedVariant ? ` • ${selectedVariant.color} / ${selectedVariant.size}` : " • Variante pendiente"}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTransfer} disabled={createTransfer.isPending}>
              {createTransfer.isPending ? "Guardando..." : "Registrar traspaso"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
