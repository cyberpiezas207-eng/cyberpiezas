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
  Wrench,
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
type FilterType = "all" | "product" | "service";
type OperationType = "product" | "service";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  operationType: "product" as OperationType,

  // Producto
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

  // Servicio
  serviceTitle: "",
  serviceFee: "",
  serviceDate: today(),
  customerName: "",
  customerPhone: "",
  customerLocation: "",

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sellForm, setSellForm] = useState(emptySellForm);

  const operations = trpc.personalOperations.list.useQuery({
    status: filterStatus,
    type: filterType,
  });
  const stats = trpc.personalOperations.stats.useQuery();
  const createOp = trpc.personalOperations.create.useMutation();
  const updateOp = trpc.personalOperations.update.useMutation();
  const markSold = trpc.personalOperations.markAsSold.useMutation();
  const deleteOp = trpc.personalOperations.delete.useMutation();

  const filteredOps = useMemo(() => {
    if (!operations.data) return [];
    if (!search.trim()) return operations.data;
    const q = search.toLowerCase();
    return operations.data.filter((op) => {
      const name = op.operationType === "service" ? op.serviceTitle : op.productName;
      const contactName = op.operationType === "service" ? op.customerName : op.supplierName;
      const buyerName = op.buyerName ?? "";
      return (
        (name ?? "").toLowerCase().includes(q) ||
        (contactName ?? "").toLowerCase().includes(q) ||
        buyerName.toLowerCase().includes(q)
      );
    });
  }, [operations.data, search]);

  const chartData = useMemo(() => {
    if (!operations.data) return [];
    // Mezclar productos vendidos + servicios prestados, ordenados por fecha
    const events: Array<{ date: Date; profit: number }> = [];
    for (const op of operations.data) {
      if (op.operationType === "product" && op.soldAt && op.soldPrice) {
        events.push({
          date: new Date(op.soldAt),
          profit: Number(op.soldPrice) - Number(op.acquiredCost ?? 0),
        });
      }
      if (op.operationType === "service" && op.serviceDate && op.serviceFee) {
        events.push({
          date: new Date(op.serviceDate),
          profit: Number(op.serviceFee),
        });
      }
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let acc = 0;
    return events.slice(-30).map((e) => {
      acc += e.profit;
      return {
        date: formatDate(e.date),
        utilidad: acc,
      };
    });
  }, [operations.data]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.operationType === "product") {
      if (!form.productName.trim() || !form.acquiredCost.trim()) {
        toast.error("Producto y precio de compra son obligatorios");
        return;
      }
    } else {
      if (!form.serviceTitle.trim() || !form.serviceFee.trim()) {
        toast.error("Título del servicio y precio cobrado son obligatorios");
        return;
      }
    }

    try {
      await createOp.mutateAsync({
        operationType: form.operationType,

        productName: form.productName || undefined,
        productDescription: form.productDescription || undefined,
        acquiredAt: form.operationType === "product" ? new Date(form.acquiredAt) : undefined,
        acquiredCost: form.acquiredCost || undefined,
        supplierName: form.supplierName || undefined,
        supplierPhone: form.supplierPhone || undefined,
        supplierLocation: form.supplierLocation || undefined,

        soldAt: form.soldAt ? new Date(form.soldAt) : undefined,
        soldPrice: form.soldPrice || undefined,
        buyerName: form.buyerName || undefined,
        buyerPhone: form.buyerPhone || undefined,
        buyerLocation: form.buyerLocation || undefined,

        serviceTitle: form.serviceTitle || undefined,
        serviceFee: form.serviceFee || undefined,
        serviceDate: form.operationType === "service" ? new Date(form.serviceDate) : undefined,
        customerName: form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        customerLocation: form.customerLocation || undefined,

        notes: form.notes || undefined,
      });
      toast.success(form.operationType === "service" ? "Servicio registrado" : "Operación registrada");
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
      operationType: (op.operationType ?? "product") as OperationType,
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
      serviceTitle: op.serviceTitle ?? "",
      serviceFee: op.serviceFee ?? "",
      serviceDate: op.serviceDate ? new Date(op.serviceDate).toISOString().split("T")[0] : today(),
      customerName: op.customerName ?? "",
      customerPhone: op.customerPhone ?? "",
      customerLocation: op.customerLocation ?? "",
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
        operationType: form.operationType,
        productName: form.productName || null,
        productDescription: form.productDescription || null,
        acquiredAt: form.operationType === "product" && form.acquiredAt ? new Date(form.acquiredAt) : null,
        acquiredCost: form.acquiredCost || null,
        supplierName: form.supplierName || null,
        supplierPhone: form.supplierPhone || null,
        supplierLocation: form.supplierLocation || null,
        soldAt: form.soldAt ? new Date(form.soldAt) : null,
        soldPrice: form.soldPrice || null,
        buyerName: form.buyerName || null,
        buyerPhone: form.buyerPhone || null,
        buyerLocation: form.buyerLocation || null,
        serviceTitle: form.serviceTitle || null,
        serviceFee: form.serviceFee || null,
        serviceDate: form.operationType === "service" && form.serviceDate ? new Date(form.serviceDate) : null,
        customerName: form.customerName || null,
        customerPhone: form.customerPhone || null,
        customerLocation: form.customerLocation || null,
        notes: form.notes || null,
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
              Productos y servicios · Solo visible para ti
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

      {/* KPIs */}
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
                <p className="text-xs text-muted-foreground">
                  {stats.data?.productsMonth ?? 0} productos · {stats.data?.servicesMonth ?? 0} servicios
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
            <CardDescription>Últimas {chartData.length} operaciones (productos + servicios)</CardDescription>
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <CardTitle className="text-primary">Historial de operaciones</CardTitle>
              <CardDescription>
                {filteredOps.length} {filteredOps.length === 1 ? "operación" : "operaciones"}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64"
              />
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={filterType === "product" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("product")}
                  className="gap-1"
                >
                  <Package className="h-3 w-3" /> Productos
                </Button>
                <Button
                  variant={filterType === "service" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("service")}
                  className="gap-1"
                >
                  <Wrench className="h-3 w-3" /> Servicios
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  Todas
                </Button>
                <Button
                  variant={filterStatus === "in_inventory" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("in_inventory")}
                >
                  Inventario
                </Button>
                <Button
                  variant={filterStatus === "sold" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("sold")}
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
              {filteredOps.map((op: any) => (
                <OperationCard
                  key={op.id}
                  op={op}
                  onEdit={() => handleOpenEdit(op)}
                  onSell={() => handleOpenSell(op)}
                  onDelete={() =>
                    handleDelete(
                      op.id,
                      op.operationType === "service" ? op.serviceTitle : op.productName,
                    )
                  }
                  isPendingDelete={deleteOp.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Nueva operación</DialogTitle>
            <DialogDescription>
              Elige si es un producto o un servicio y captura los datos.
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

      {/* Edit dialog */}
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
            <DialogDescription>Modifica los datos.</DialogDescription>
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

      {/* Sell dialog */}
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

// ─── Tarjeta individual de operación ──────────────────────────────────
function OperationCard({
  op,
  onEdit,
  onSell,
  onDelete,
  isPendingDelete,
}: {
  op: any;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  isPendingDelete: boolean;
}) {
  const isService = op.operationType === "service";
  const profit = isService
    ? op.serviceFee
      ? Number(op.serviceFee)
      : null
    : op.soldPrice
      ? Number(op.soldPrice) - Number(op.acquiredCost ?? 0)
      : null;

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isService ? (
                <Wrench className="h-5 w-5 text-purple-500" />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-semibold text-foreground">
                {isService ? op.serviceTitle : op.productName}
              </h3>
              {isService ? (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Servicio
                </span>
              ) : op.status === "in_inventory" ? (
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

            {/* Datos según tipo */}
            {isService ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Servicio:</span>{" "}
                {formatCurrency(Number(op.serviceFee ?? 0))} · {formatDate(op.serviceDate)}
                {op.customerName && <span> · cliente {op.customerName}</span>}
                {op.customerPhone && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <Phone className="h-3 w-3" /> {op.customerPhone}
                  </span>
                )}
                {op.customerLocation && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <MapPin className="h-3 w-3" /> {op.customerLocation}
                  </span>
                )}
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Compra:</span>{" "}
                  {formatCurrency(Number(op.acquiredCost ?? 0))} · {formatDate(op.acquiredAt)}
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
              </>
            )}

            {profit !== null && (
              <p
                className={`text-sm font-semibold ${
                  profit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {isService ? "Cobrado: " : "Utilidad: "}
                {formatCurrency(profit)}
              </p>
            )}

            {op.notes && <p className="text-xs text-muted-foreground italic">{op.notes}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isService && op.status === "in_inventory" && (
              <Button
                size="sm"
                onClick={onSell}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                Vender
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Edit2 className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isPendingDelete}
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
}

// ─── Formulario que cambia según tipo ─────────────────────────────────
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
  const isService = form.operationType === "service";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* SELECTOR DE TIPO */}
      <div className="space-y-2">
        <Label className="font-semibold">Tipo de operación</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, operationType: "product" })}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              !isService
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Package className="h-5 w-5" />
            Producto (compraventa)
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, operationType: "service" })}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              isService
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Wrench className="h-5 w-5" />
            Servicio
          </button>
        </div>
      </div>

      {/* CAMPOS DE PRODUCTO */}
      {!isService && (
        <>
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground border-b pb-1">📦 Producto</h4>
            <div>
              <Label className="font-semibold">Nombre del producto *</Label>
              <Input
                placeholder="Ej: Monitor Dell 27 pulgadas"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className="mt-2"
                required={!isService}
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
                  required={!isService}
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
                  required={!isService}
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
        </>
      )}

      {/* CAMPOS DE SERVICIO */}
      {isService && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground border-b pb-1">🔧 Servicio</h4>
          <div>
            <Label className="font-semibold">Título del servicio *</Label>
            <Input
              placeholder="Ej: Instalación de cámaras"
              value={form.serviceTitle}
              onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
              className="mt-2"
              required={isService}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-semibold">Fecha *</Label>
              <Input
                type="date"
                value={form.serviceDate}
                onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                className="mt-2"
                required={isService}
              />
            </div>
            <div>
              <Label className="font-semibold">Precio cobrado *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1500.00"
                value={form.serviceFee}
                onChange={(e) => setForm({ ...form, serviceFee: e.target.value })}
                className="mt-2"
                required={isService}
              />
            </div>
          </div>
          <div>
            <Label className="font-semibold">Cliente</Label>
            <Input
              placeholder="Ej: Sra. María"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="mt-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-semibold">Teléfono</Label>
              <Input
                placeholder="777-123-4567"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="font-semibold">Lugar</Label>
              <Input
                placeholder="Ej: Cuernavaca"
                value={form.customerLocation}
                onChange={(e) => setForm({ ...form, customerLocation: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* NOTAS (común a ambos tipos) */}
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
