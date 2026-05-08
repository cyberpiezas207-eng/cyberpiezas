import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type FilterStatus = "all" | "in_inventory" | "sold";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  productName: "",
  productDescription: "",
  acquiredAt: today(),
  acquiredCost: "",
  supplierName: "",
  supplierPhone: "",
  supplierLocation: "",
  soldAt: "",
  soldPrice: "",
  buyerName: "",
  buyerPhone: "",
  buyerLocation: "",
  notes: "",
};

const emptySellForm = {
  soldAt: today(),
  soldPrice: "",
  buyerName: "",
  buyerPhone: "",
  buyerLocation: "",
};

const formatCurrency = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: Date | string | null) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

export type OperationsViewProps = {
  showHeader?: boolean;
};

export default function OperationsView({ showHeader = true }: OperationsViewProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sellForm, setSellForm] = useState(emptySellForm);

  const operations = trpc.personalOperations.list.useQuery({ status: filter });
  const stats = trpc.personalOperations.stats.useQuery();
  const createOp = trpc.personalOperations.create.useMutation();
  const updateOp = trpc.personalOperations.update.useMutation();
  const markSold = trpc.personalOperations.markAsSold.useMutation();
  const deleteOp = trpc.personalOperations.delete.useMutation();

  const filteredOps = useMemo(() => {
    if (!operations.data) return [];
    if (!search.trim()) return operations.data;
    const q = search.toLowerCase();
    return operations.data.filter(
      (op) =>
        op.productName.toLowerCase().includes(q) ||
        (op.supplierName ?? "").toLowerCase().includes(q) ||
        (op.buyerName ?? "").toLowerCase().includes(q),
    );
  }, [operations.data, search]);

  const chartData = useMemo(() => {
    if (!operations.data) return [];
    const sold = operations.data
      .filter((op) => op.soldAt && op.soldPrice)
      .sort((a, b) => new Date(a.soldAt!).getTime() - new Date(b.soldAt!).getTime());

    let acc = 0;
    return sold.slice(-30).map((op) => {
      const profit = Number(op.soldPrice) - Number(op.acquiredCost);
      acc += profit;
      return {
        date: formatDate(op.soldAt),
        utilidad: acc,
      };
    });
  }, [operations.data]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim() || !form.acquiredCost.trim()) {
      toast.error("Producto y precio de compra son obligatorios");
      return;
    }
    try {
      await createOp.mutateAsync({
        productName: form.productName,
        productDescription: form.productDescription || undefined,
        acquiredAt: new Date(form.acquiredAt),
        acquiredCost: form.acquiredCost,
        supplierName: form.supplierName || undefined,
        supplierPhone: form.supplierPhone || undefined,
        supplierLocation: form.supplierLocation || undefined,
        soldAt: form.soldAt ? new Date(form.soldAt) : undefined,
        soldPrice: form.soldPrice || undefined,
        buyerName: form.buyerName || undefined,
        buyerPhone: form.buyerPhone || undefined,
        buyerLocation: form.buyerLocation || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Operación registrada");
      setForm(emptyForm);
      setIsCreateOpen(false);
      operations.refetch();
      stats.refetch();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleOpenEdit = (op: any) => {
    setEditingId(op.id);
    setForm({
      productName: op.productName ?? "",
      productDescription: op.productDescription ?? "",
      acquiredAt: op.acquiredAt ? new Date(op.acquiredAt).toISOString().split("T")[0] : today(),
      acquiredCost: op.acquiredCost ?? "",
      supplierName: op.supplierName ?? "",
      supplierPhone: op.supplierPhone ?? "",
      supplierLocation: op.supplierLocation ?? "",
      soldAt: op.soldAt ? new Date(op.soldAt).toISOString().split("T")[0] : "",
      soldPrice: op.soldPrice ?? "",
      buyerName: op.buyerName ?? "",
      buyerPhone: op.buyerPhone ?? "",
      buyerLocation: op.buyerLocation ?? "",
      notes: op.notes ?? "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await updateOp.mutateAsync({
        id: editingId,
        productName: form.productName,
        productDescription: form.productDescription || undefined,
        acquiredAt: new Date(form.acquiredAt),
        acquiredCost: form.acquiredCost,
        supplierName: form.supplierName || undefined,
        supplierPhone: form.supplierPhone || undefined,
        supplierLocation: form.supplierLocation || undefined,
        soldAt: form.soldAt ? new Date(form.soldAt) : null,
        soldPrice: form.soldPrice || null,
        buyerName: form.buyerName || null,
        buyerPhone: form.buyerPhone || null,
        buyerLocation: form.buyerLocation || null,
        notes: form.notes || undefined,
      });
      toast.success("Operación actualizada");
      setIsEditOpen(false);
      setEditingId(null);
      operations.refetch();
      stats.refetch();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    }
  };

  const handleOpenSell = (op: any) => {
    setSellingId(op.id);
    setSellForm({ ...emptySellForm, soldAt: today() });
    setIsSellOpen(true);
  };

  const handleMarkSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingId || !sellForm.soldPrice.trim()) {
      toast.error("Captura el precio de venta");
      return;
    }
    try {
      await markSold.mutateAsync({
        id: sellingId,
        soldAt: new Date(sellForm.soldAt),
        soldPrice: sellForm.soldPrice,
        buyerName: sellForm.buyerName || undefined,
        buyerPhone: sellForm.buyerPhone || undefined,
        buyerLocation: sellForm.buyerLocation || undefined,
      });
      toast.success("Marcada como vendida");
      setIsSellOpen(false);
      setSellingId(null);
      operations.refetch();
      stats.refetch();
    } catch (err: any) {
      toast.error(err.message || "Error al marcar vendida");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la operación "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteOp.mutateAsync({ id });
      toast.success("Operación eliminada");
      operations.refetch();
      stats.refetch();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Mis Operaciones</h1>
            <p className="text-muted-foreground">
              Control personal de compraventa · Solo visible para ti
            </p>
          </div>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setIsCreateOpen(true);
            }}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva operación
          </Button>
        </div>
      )}

      {!showHeader && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setForm(emptyForm);
              setIsCreateOpen(true);
            }}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva operación
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ingresos del mes</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(stats.data?.revenueMonth ?? 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Utilidad del mes</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(stats.data?.profitMonth ?? 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">En inventario</p>
                <p className="text-2xl font-bold">
                  {stats.data?.inInventoryCount ?? 0} productos
                </p>
                <p className="text-xs text-muted-foreground">
                  Costo: {formatCurrency(Number(stats.data?.inInventoryCost ?? 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-primary">Utilidad acumulada</CardTitle>
            <CardDescription>Últimas {chartData.length} ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Area
                  type="monotone"
                  dataKey="utilidad"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUtilidad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-primary">Historial de operaciones</CardTitle>
              <CardDescription>
                {filteredOps.length} {filteredOps.length === 1 ? "operación" : "operaciones"}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Buscar producto, proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              <div className="flex gap-1">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Todas
                </Button>
                <Button
                  variant={filter === "in_inventory" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("in_inventory")}
                >
                  Inventario
                </Button>
                <Button
                  variant={filter === "sold" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("sold")}
                >
                  Vendidas
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {operations.isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : filteredOps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay operaciones. Agrega tu primera con el botón "Nueva operación".
            </p>
          ) : (
            <div className="space-y-3">
              {filteredOps.map((op: any) => {
                const profit = op.soldPrice
                  ? Number(op.soldPrice) - Number(op.acquiredCost)
                  : null;
                return (
                  <Card key={op.id} className="border-border">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold text-foreground">{op.productName}</h3>
                            {op.status === "in_inventory" ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                En inventario
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Vendida
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Compra:</span>{" "}
                            {formatCurrency(Number(op.acquiredCost))} · {formatDate(op.acquiredAt)}
                            {op.supplierName && <span> · de {op.supplierName}</span>}
                            {op.supplierPhone && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <Phone className="h-3 w-3" /> {op.supplierPhone}
                              </span>
                            )}
                            {op.supplierLocation && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <MapPin className="h-3 w-3" /> {op.supplierLocation}
                              </span>
                            )}
                          </div>

                          {op.status === "sold" && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Venta:</span>{" "}
                              {formatCurrency(Number(op.soldPrice))} · {formatDate(op.soldAt)}
                              {op.buyerName && <span> · a {op.buyerName}</span>}
                              {op.buyerPhone && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                  <Phone className="h-3 w-3" /> {op.buyerPhone}
                                </span>
                              )}
                              {op.buyerLocation && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                  <MapPin className="h-3 w-3" /> {op.buyerLocation}
                                </span>
                              )}
                            </div>
                          )}

                          {profit !== null && (
                            <p
                              className={`text-sm font-semibold ${
                                profit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              Utilidad: {formatCurrency(profit)}
                            </p>
                          )}

                          {op.notes && (
                            <p className="text-xs text-muted-foreground italic">{op.notes}</p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {op.status === "in_inventory" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenSell(op)}
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Vender
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(op)}
                            className="gap-1"
                          >
                            <Edit2 className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(op.id, op.productName)}
                            disabled={deleteOp.isPending}
                            className="text-destructive gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </Button>
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Nueva operación</DialogTitle>
            <DialogDescription>
              Registra una compra. Si ya la vendiste, llena también la sección de venta.
            </DialogDescription>
          </DialogHeader>
          <OperationForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isPending={createOp.isPending}
            submitLabel="Guardar operación"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Editar operación</DialogTitle>
            <DialogDescription>Modifica los datos de la operación.</DialogDescription>
          </DialogHeader>
          <OperationForm
            form={form}
            setForm={setForm}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditOpen(false);
              setEditingId(null);
            }}
            isPending={updateOp.isPending}
            submitLabel="Guardar cambios"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSellOpen}
        onOpenChange={(open) => {
          setIsSellOpen(open);
          if (!open) setSellingId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Marcar como vendida</DialogTitle>
            <DialogDescription>Captura los datos de la venta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkSold} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold">Fecha de venta *</Label>
                <Input
                  type="date"
                  value={sellForm.soldAt}
                  onChange={(e) => setSellForm({ ...sellForm, soldAt: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label className="font-semibold">Precio venta *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1200.00"
                  value={sellForm.soldPrice}
                  onChange={(e) => setSellForm({ ...sellForm, soldPrice: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="font-semibold">Comprador</Label>
              <Input
                placeholder="Ej: Juan"
                value={sellForm.buyerName}
                onChange={(e) => setSellForm({ ...sellForm, buyerName: e.target.value })}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold">Teléfono</Label>
                <Input
                  placeholder="777-123-4567"
                  value={sellForm.buyerPhone}
                  onChange={(e) => setSellForm({ ...sellForm, buyerPhone: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="font-semibold">Lugar</Label>
                <Input
                  placeholder="Ej: Jonacatepec"
                  value={sellForm.buyerLocation}
                  onChange={(e) => setSellForm({ ...sellForm, buyerLocation: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSellOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={markSold.isPending}
              >
                {markSold.isPending ? "Guardando..." : "Marcar vendida"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OperationForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground border-b pb-1">📦 Producto</h4>
        <div>
          <Label className="font-semibold">Nombre del producto *</Label>
          <Input
            placeholder="Ej: Monitor Dell 27 pulgadas"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            className="mt-2"
            required
          />
        </div>
        <div>
          <Label className="font-semibold">Descripción (opcional)</Label>
          <Textarea
            placeholder="Detalles, modelo, condición..."
            value={form.productDescription}
            onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
            className="mt-2"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-foreground border-b pb-1">💰 Compra</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="font-semibold">Fecha *</Label>
            <Input
              type="date"
              value={form.acquiredAt}
              onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })}
              className="mt-2"
              required
            />
          </div>
          <div>
            <Label className="font-semibold">Precio compra *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="400.00"
              value={form.acquiredCost}
              onChange={(e) => setForm({ ...form, acquiredCost: e.target.value })}
              className="mt-2"
              required
            />
          </div>
        </div>
        <div>
          <Label className="font-semibold">Proveedor</Label>
          <Input
            placeholder="Ej: Sr. Poncho"
            value={form.supplierName}
            onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            className="mt-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="font-semibold">Teléfono</Label>
            <Input
              placeholder="777-123-4567"
              value={form.supplierPhone}
              onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-semibold">Lugar</Label>
            <Input
              placeholder="Ej: Cuernavaca"
              value={form.supplierLocation}
              onChange={(e) => setForm({ ...form, supplierLocation: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-foreground border-b pb-1">
          💵 Venta <span className="text-muted-foreground font-normal">(opcional · llenar si ya se vendió)</span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="font-semibold">Fecha</Label>
            <Input
              type="date"
              value={form.soldAt}
              onChange={(e) => setForm({ ...form, soldAt: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-semibold">Precio venta</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1200.00"
              value={form.soldPrice}
              onChange={(e) => setForm({ ...form, soldPrice: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>
        <div>
          <Label className="font-semibold">Comprador</Label>
          <Input
            placeholder="Ej: Juan"
            value={form.buyerName}
            onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
            className="mt-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="font-semibold">Teléfono</Label>
            <Input
              placeholder="777-987-6543"
              value={form.buyerPhone}
              onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-semibold">Lugar</Label>
            <Input
              placeholder="Ej: Jonacatepec"
              value={form.buyerLocation}
              onChange={(e) => setForm({ ...form, buyerLocation: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="font-semibold">Notas</Label>
        <Textarea
          placeholder="Cualquier detalle adicional..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-2"
          rows={2}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isPending}
        >
          {isPending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
