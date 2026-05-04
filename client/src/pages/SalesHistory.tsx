import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getPosHardwareConfig, getPosTaxLabel, shouldDisplayTaxRow } from "@/lib/posHardware";
import {
  Eye,
  Download,
  Calendar,
  AlertCircle,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { buildSalesSummary, filterSalesByPaymentMethod, getRecentCashMovements, paginateSales } from "@/lib/salesHistoryHelpers";
import { parseSaleTransferMetadata } from "@shared/saleTransferMetadata";

type CashMovementForm = {
  movementType: "entry" | "exit";
  category: string;
  amount: string;
  reason: string;
  notes: string;
};

export default function SalesHistory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isReturnSearchOpen, setIsReturnSearchOpen] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [cashForm, setCashForm] = useState<CashMovementForm>({
    movementType: "entry",
    category: "general",
    amount: "",
    reason: "",
    notes: "",
  });

  const todaySales = trpc.sales.listToday.useQuery();
  const dateRangeSales = trpc.sales.listByDateRange.useQuery(
    {
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(),
    },
    { enabled: !!(startDate || endDate) },
  );
  const selectedSale = trpc.sales.getById.useQuery({ id: selectedSaleId || 0 }, { enabled: selectedSaleId !== null });
  const cashMovements = trpc.sales.listCashMovements.useQuery();

  const registerCashMovement = trpc.sales.registerCashMovement.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sales.listCashMovements.invalidate(),
        utils.sales.listToday.invalidate(),
        utils.sales.listByDateRange.invalidate(),
      ]);
      toast.success("Movimiento de caja registrado correctamente.");
      setIsCashDialogOpen(false);
      setCashForm({ movementType: "entry", category: "general", amount: "", reason: "", notes: "" });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo registrar el movimiento de caja.");
    },
  });

  const createReturn = trpc.sales.createReturn.useMutation({
    onSuccess: async (response) => {
      await Promise.all([
        utils.sales.listToday.invalidate(),
        utils.sales.listByDateRange.invalidate(),
        utils.sales.getById.invalidate(),
        utils.sales.listCashMovements.invalidate(),
        utils.dashboard.todayStats.invalidate(),
        utils.dashboard.topProducts.invalidate(),
      ]);
      toast.success(`Devolución registrada: ${response.returnNumber}`);
      setIsReturnDialogOpen(false);
      setIsDetailsDialogOpen(false);
      setReturnReason("");
      setReturnNotes("");
      setReturnQuantities({});
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo registrar la devolución.");
    },
  });

  useEffect(() => {
    if (dateRangeSales.error && startDate) {
      const errorMsg = (dateRangeSales.error as { message?: string })?.message || "Error al obtener ventas";
      if (errorMsg !== dateRangeError) {
        setDateRangeError(errorMsg);
      }
      return;
    }

    if (dateRangeError) {
      setDateRangeError(null);
    }
  }, [dateRangeError, dateRangeSales.error, startDate]);

  const handleViewDetails = (saleId: number) => {
    setSelectedSaleId(saleId);
    setIsDetailsDialogOpen(true);
  };

  const handleOpenReturnDialog = () => {
    if (!selectedSaleId || !selectedSale.data) {
      // Abrir diálogo de búsqueda de venta
      setReturnSearchQuery("");
      setIsReturnSearchOpen(true);
      return;
    }
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
    setIsReturnDialogOpen(true);
  };

  const handleSelectSaleForReturn = (saleId: number) => {
    setSelectedSaleId(saleId);
    setIsReturnSearchOpen(false);
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
    // Pequeño delay para que el query se actualice antes de abrir el diálogo
    setTimeout(() => setIsReturnDialogOpen(true), 300);
  };

  const handleExportSale = (sale: any) => {
    const details = sale.details
      ?.map(
        (detail: any) =>
          `${detail.productName}\n${detail.color} - ${detail.size}\n${detail.quantity}x $${parseFloat(detail.unitPrice).toFixed(2)} = $${parseFloat(detail.lineTotal).toFixed(2)}`,
      )
      .join("\n\n");

    const hardware = getPosHardwareConfig();
    const taxLabel = getPosTaxLabel(hardware);
    const showTaxRow = shouldDisplayTaxRow(hardware, parseFloat(sale.tax));
    const taxLine = showTaxRow ? `${taxLabel}:       $${parseFloat(sale.tax).toFixed(2)}\n` : "";

    const content = `
===========================================
              RECIBO DE VENTA
===========================================
Número de Venta: ${sale.saleNumber}
Fecha: ${format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
Método de Pago: ${sale.paymentMethod === "cash" ? "Efectivo" : sale.paymentMethod === "card" ? "Tarjeta" : "Transferencia"}

-------------------------------------------
DETALLES DE PRODUCTOS
-------------------------------------------
${details}

-------------------------------------------
RESUMEN FINANCIERO
-------------------------------------------
Subtotal:        $${parseFloat(sale.subtotal).toFixed(2)}
Descuento:       -$${parseFloat(sale.discount).toFixed(2)}
${taxLine}-------------------------------------------
TOTAL:           $${parseFloat(sale.total).toFixed(2)}
===========================================
    Gracias por tu compra
===========================================
    `;

    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", `recibo-${sale.saleNumber}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const displayedSales = useMemo(() => {
    const sales = startDate || endDate ? dateRangeSales.data || [] : todaySales.data || [];
    return filterSalesByPaymentMethod(sales, paymentMethodFilter);
  }, [startDate, endDate, dateRangeSales.data, todaySales.data, paymentMethodFilter]);

  const summary = useMemo(() => {
    return buildSalesSummary(displayedSales, cashMovements.data || []);
  }, [displayedSales, cashMovements.data]);

  const salesPageSize = 10;
  const totalSalesPages = Math.max(1, Math.ceil(displayedSales.length / salesPageSize));
  const paginatedSales = useMemo(() => {
    return paginateSales(displayedSales, currentPage, salesPageSize);
  }, [displayedSales, currentPage]);

  useEffect(() => {
    if (currentPage > totalSalesPages) {
      setCurrentPage(totalSalesPages);
    }
  }, [currentPage, totalSalesPages]);

  const returnPreviewTotal = useMemo(() => {
    if (!selectedSale.data?.details) return 0;
    return selectedSale.data.details.reduce((acc: number, detail: any) => {
      const quantity = Number.parseInt(returnQuantities[detail.id] || "0", 10);
      return acc + quantity * parseFloat(detail.unitPrice);
    }, 0);
  }, [returnQuantities, selectedSale.data]);

  const selectedSaleTransfer = useMemo(() => parseSaleTransferMetadata(selectedSale.data?.notes), [selectedSale.data?.notes]);


  const recentCashMovements = getRecentCashMovements(cashMovements.data || [], 6);

  const submitCashMovement = async () => {
    if (!cashForm.amount || Number(cashForm.amount) <= 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }

    if (!cashForm.reason.trim()) {
      toast.error("Describe el motivo del movimiento.");
      return;
    }

    await registerCashMovement.mutateAsync({
      movementType: cashForm.movementType,
      category: cashForm.category,
      amount: Number(cashForm.amount).toFixed(2),
      reason: cashForm.reason,
      notes: cashForm.notes || undefined,
    });
  };

  const submitReturn = async () => {
    if (!selectedSaleId || !selectedSale.data?.details?.length) {
      toast.error("No hay una venta lista para devolución.");
      return;
    }

    const items = selectedSale.data.details
      .map((detail: any) => ({
        saleDetailId: detail.id,
        quantity: Number(returnQuantities[detail.id] || 0),
      }))
      .filter((item: { quantity: number }) => item.quantity > 0);

    if (items.length === 0) {
      toast.error("Selecciona al menos un producto y una cantidad a devolver.");
      return;
    }

    if (!returnReason.trim()) {
      toast.error("Indica el motivo de la devolución.");
      return;
    }

    await createReturn.mutateAsync({
      saleId: selectedSaleId,
      reason: returnReason,
      notes: returnNotes || undefined,
      items,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-1">

        {/* ===== HEADER ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Ventas</h1>
              <p className="mt-1 text-slate-400 text-sm">Historial, devoluciones y movimientos de caja</p>
            </div>
            {/* Botones de acción rápida */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setLocation("/pos")} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <ShoppingCart className="h-4 w-4" /> Abrir POS
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectedSaleId ? handleOpenReturnDialog() : toast.info("Abre primero una venta para preparar la devolución.")} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
                <RotateCcw className="h-4 w-4" /> Devolución
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setCashForm((c) => ({ ...c, movementType: "entry" })); setIsCashDialogOpen(true); }} className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 gap-2">
                <ArrowDownCircle className="h-4 w-4" /> Entrada
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setCashForm((c) => ({ ...c, movementType: "exit" })); setIsCashDialogOpen(true); }} className="border-rose-600/50 text-rose-400 hover:bg-rose-600/10 gap-2">
                <ArrowUpCircle className="h-4 w-4" /> Salida
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-700/40 border border-slate-600/40 p-4">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Ventas visibles</p>
              <p className="text-3xl font-bold text-purple-400">{displayedSales.length}</p>
            </div>
            <div className="rounded-xl bg-slate-700/40 border border-slate-600/40 p-4">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Monto del periodo</p>
              <p className="text-3xl font-bold text-white">${summary.totalAmount.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-slate-700/40 border border-slate-600/40 p-4">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Entradas de caja</p>
              <p className="text-3xl font-bold text-emerald-400">${summary.totalCashEntries.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Alerta plan gratis */}
        {user?.subscriptionPlan === "free" && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm"><strong>Plan Gratis:</strong> Solo puedes ver el historial de los últimos 30 días.</span>
                <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10" onClick={() => { window.location.href = "/planes-y-acceso"; }}>
                  <ArrowRight className="mr-2 h-4 w-4" /> Ver Planes
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ===== FILTROS + CAJA RECIENTE ===== */}
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          {/* Filtros */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-purple-400" />
              <h2 className="text-white font-semibold text-sm">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label htmlFor="startDate" className="text-slate-400 text-xs mb-1 block">Fecha Inicio</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-700/60 border-slate-600 text-white text-sm" />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-slate-400 text-xs mb-1 block">Fecha Fin</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-700/60 border-slate-600 text-white text-sm" />
              </div>
              <div>
                <Label htmlFor="paymentMethod" className="text-slate-400 text-xs mb-1 block">Método de Pago</Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger id="paymentMethod" className="bg-slate-700/60 border-slate-600 text-white text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm" onClick={() => setCurrentPage(1)}>Filtrar</Button>
              </div>
            </div>
            {dateRangeError && <p className="mt-2 text-xs text-rose-400">{dateRangeError}</p>}
          </div>

          {/* Caja reciente */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-4 w-4 text-purple-400" />
              <h2 className="text-white font-semibold text-sm">Caja reciente</h2>
            </div>
            <div className="space-y-2">
              {cashMovements.isLoading ? (
                <p className="text-slate-500 text-sm">Cargando...</p>
              ) : recentCashMovements.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin movimientos registrados.</p>
              ) : (
                recentCashMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2">
                    <div>
                      <p className="text-white text-sm font-medium">{movement.reason}</p>
                      <p className="text-slate-500 text-xs">{format(new Date(movement.createdAt), "dd/MM HH:mm", { locale: es })}</p>
                    </div>
                    <span className={`text-sm font-bold ${movement.movementType === "entry" ? "text-emerald-400" : "text-rose-400"}`}>
                      {movement.movementType === "entry" ? "+" : "-"}${Number(movement.amount).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===== TABLA DE VENTAS ===== */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">{startDate || endDate ? "Ventas por rango de fechas" : "Ventas del día"}</h2>
            <span className="text-slate-400 text-sm">{displayedSales.length} venta{displayedSales.length !== 1 ? "s" : ""}</span>
          </div>

          {todaySales.isLoading ? (
            <div className="py-12 text-center text-slate-500">Cargando ventas...</div>
          ) : displayedSales.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No hay ventas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Número</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Método</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white text-sm">{sale.saleNumber}</td>
                      <td className="px-5 py-4 text-slate-400 text-sm">{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sale.paymentMethod === "cash" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                          sale.paymentMethod === "card" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" :
                          "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                        }`}>
                          {sale.paymentMethod === "cash" ? "Efectivo" : sale.paymentMethod === "card" ? "Tarjeta" : "Transferencia"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-white text-sm">${Number(sale.total).toFixed(2)}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1 text-xs" onClick={() => handleViewDetails(sale.id)}>
                            <Eye className="h-3 w-3" /> Ver
                          </Button>
                          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleExportSale(sale)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {displayedSales.length > salesPageSize && (
            <div className="px-5 py-4 border-t border-slate-700/50">
              <Pagination>
                <PaginationContent className="flex-nowrap">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage((page) => Math.max(1, page - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalSalesPages }, (_, index) => index + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage((page) => Math.min(totalSalesPages, page + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-sm:h-[90vh] max-sm:overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">Detalles de Venta</DialogTitle>
              <DialogDescription>{selectedSale.data?.saleNumber}</DialogDescription>
            </DialogHeader>

            {selectedSale.isLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : selectedSale.data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-secondary p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Venta</p>
                    <p className="font-semibold text-foreground">{selectedSale.data.saleNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-semibold text-foreground">
                      {format(new Date(selectedSale.data.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Pago</p>
                    <p className="font-semibold text-foreground">
                      {selectedSale.data.paymentMethod === "cash" ? "Efectivo" : selectedSale.data.paymentMethod === "card" ? "Tarjeta" : "Transferencia"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Artículos</p>
                    <p className="font-semibold text-foreground">{selectedSale.data.details?.length || 0}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold text-foreground">Productos</h3>
                  <div className="space-y-2">
                    {selectedSale.data.details?.map((detail: any) => (
                      <div key={detail.id} className="flex flex-col gap-3 rounded-lg border border-border bg-secondary p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{detail.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {detail.color} - {detail.size} x {detail.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground">${parseFloat(detail.lineTotal).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedSale.data.paymentMethod === "transfer" && (selectedSaleTransfer.transferReference || selectedSaleTransfer.proofUrl || selectedSaleTransfer.customerNotes) ? (
                  <div className="space-y-4 rounded-lg border border-primary/15 bg-primary/5 p-4">
                    <h3 className="font-semibold text-foreground">Datos de transferencia</h3>
                    {selectedSaleTransfer.transferReference ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Referencia</p>
                        <p className="font-semibold text-foreground">{selectedSaleTransfer.transferReference}</p>
                      </div>
                    ) : null}
                    {selectedSaleTransfer.customerNotes ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Notas</p>
                        <p className="text-sm text-foreground">{selectedSaleTransfer.customerNotes}</p>
                      </div>
                    ) : null}
                    {selectedSaleTransfer.proofUrl ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Comprobante anexado</p>
                        <a href={selectedSaleTransfer.proofUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border bg-background">
                          <img src={selectedSaleTransfer.proofUrl} alt="Comprobante de transferencia" className="max-h-80 w-full object-cover" />
                        </a>
                        <Button asChild variant="outline" className="gap-2">
                          <a href={selectedSaleTransfer.proofUrl} target="_blank" rel="noreferrer">Abrir comprobante</a>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2 rounded-lg border border-border bg-secondary p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold text-foreground">${parseFloat(selectedSale.data.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedSale.data.discount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descuento:</span>
                      <span className="font-semibold text-accent">-${parseFloat(selectedSale.data.discount).toFixed(2)}</span>
                    </div>
                  )}
                  {(() => {
                    const hardware = getPosHardwareConfig();
                    const showTax = shouldDisplayTaxRow(hardware, parseFloat(selectedSale.data.tax));
                    if (!showTax) return null;
                    return (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{getPosTaxLabel(hardware)}:</span>
                        <span className="font-semibold text-foreground">${parseFloat(selectedSale.data.tax).toFixed(2)}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-accent">${parseFloat(selectedSale.data.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3 sm:flex-row">
                  <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                    Cerrar
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleOpenReturnDialog}>
                    <RotateCcw className="h-4 w-4" />
                    Registrar devolución
                  </Button>
                  <Button onClick={() => handleExportSale(selectedSale.data)} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Download className="h-4 w-4" />
                    Descargar Recibo
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-primary">
                {cashForm.movementType === "entry" ? "Registrar entrada de dinero" : "Registrar salida de dinero"}
              </DialogTitle>
              <DialogDescription>Este movimiento queda guardado en la bitácora de caja del sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={cashForm.movementType} onValueChange={(value: "entry" | "exit") => setCashForm((current) => ({ ...current, movementType: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="exit">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input className="mt-2" value={cashForm.category} onChange={(e) => setCashForm((current) => ({ ...current, category: e.target.value }))} placeholder="general, gasto, retiro..." />
                </div>
              </div>
              <div>
                <Label>Monto</Label>
                <Input className="mt-2" type="number" min="0" step="0.01" value={cashForm.amount} onChange={(e) => setCashForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input className="mt-2" value={cashForm.reason} onChange={(e) => setCashForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Describe el movimiento" />
              </div>
              <div>
                <Label>Notas</Label>
                <Input className="mt-2" value={cashForm.notes} onChange={(e) => setCashForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCashDialogOpen(false)}>Cancelar</Button>
                <Button onClick={submitCashMovement} disabled={registerCashMovement.isPending}>
                  {registerCashMovement.isPending ? "Guardando..." : "Guardar movimiento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
          <DialogContent className="max-w-2xl max-sm:h-[90vh] max-sm:overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">Registrar devolución</DialogTitle>
              <DialogDescription>
                Selecciona qué piezas regresan al inventario y deja el motivo de la devolución.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">Venta seleccionada</p>
                <p className="font-semibold text-foreground">{selectedSale.data?.saleNumber || "Sin venta seleccionada"}</p>
              </div>
              <div className="space-y-3">
                {selectedSale.data?.details?.map((detail: any) => (
                  <div key={detail.id} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_120px] sm:items-center">
                    <div>
                      <p className="font-medium text-foreground">{detail.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {detail.color} - {detail.size} | Vendido: {detail.quantity}
                      </p>
                    </div>
                    <div>
                      <Label>Cantidad a devolver</Label>
                      <Input
                        className="mt-2"
                        type="number"
                        min="0"
                        max={detail.quantity}
                        value={returnQuantities[detail.id] || "0"}
                        onChange={(e) => setReturnQuantities((current) => ({ ...current, [detail.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label>Motivo</Label>
                <Input className="mt-2" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Ej. talla equivocada, cambio de opinión" />
              </div>
              <div>
                <Label>Notas</Label>
                <Input className="mt-2" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">Total estimado de devolución</p>
                <p className="text-2xl font-bold text-primary">${returnPreviewTotal.toFixed(2)}</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancelar</Button>
                <Button onClick={submitReturn} disabled={createReturn.isPending}>
                  {createReturn.isPending ? "Guardando..." : "Guardar devolución"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== DIÁLOGO BÚSqueda de venta para devolución ===== */}
        <Dialog open={isReturnSearchOpen} onOpenChange={setIsReturnSearchOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-primary">Buscar venta para devolución</DialogTitle>
              <DialogDescription>
                Escribe el número de venta o el nombre del producto para encontrarla.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                autoFocus
                placeholder="Ej. VTA-0042 o nombre del producto..."
                value={returnSearchQuery}
                onChange={(e) => setReturnSearchQuery(e.target.value)}
              />
              <div className="max-h-72 overflow-y-auto space-y-2">
                {(startDate || endDate ? dateRangeSales.data : todaySales.data)
                  ?.filter((sale: any) => {
                    const q = returnSearchQuery.toLowerCase();
                    if (!q) return true;
                    return (
                      sale.saleNumber?.toLowerCase().includes(q) ||
                      sale.details?.some((d: any) => d.productName?.toLowerCase().includes(q))
                    );
                  })
                  .slice(0, 20)
                  .map((sale: any) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => handleSelectSaleForReturn(sale.id)}
                      className="w-full flex items-center justify-between rounded-xl border border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 p-3 text-left transition-all"
                    >
                      <div>
                        <p className="font-semibold text-foreground text-sm">{sale.saleNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.details?.map((d: any) => d.productName).join(", ").slice(0, 60)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">${parseFloat(sale.total).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.paymentMethod === "cash" ? "Efectivo" : sale.paymentMethod === "card" ? "Tarjeta" : "Transferencia"}
                        </p>
                      </div>
                    </button>
                  ))}
                {!(startDate || endDate ? dateRangeSales.data : todaySales.data)?.length && (
                  <p className="text-center text-muted-foreground text-sm py-6">No hay ventas disponibles para devolución.</p>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setIsReturnSearchOpen(false)}>Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
