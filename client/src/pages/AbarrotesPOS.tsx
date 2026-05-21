import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Clock,
  AlertTriangle,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  expiryDate?: string;
  category: string;
}

function AbarrotesPOSContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState("");

  const { data: products, isLoading } = trpc.products.list.useQuery(undefined, { enabled: true });
  const createSale = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venta registrada correctamente");
      setCart([]);
      setShowCheckout(false);
      setAmountPaid("");
    },
    onError: (error) => {
      toast.error("Error al registrar la venta: " + error.message);
    },
  });

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    p.name.toLowerCase() !== "pantalón" &&
    (p.categoryId === 1 || p.categoryId === 2 || p.categoryId === 3 || p.categoryId === 4 || p.categoryId === 5)
  ) || [];

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          category: product.category,
        },
      ]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!amountPaid) {
      toast.error("Por favor ingresa el monto pagado");
      return;
    }

    const paid = parseFloat(amountPaid);
    if (paid < total) {
      toast.error("El monto pagado es insuficiente");
      return;
    }

    await createSale.mutateAsync({
      items: cart.map((item) => ({
        variantId: parseInt(item.id),
        productName: item.name,
        size: "N/A",
        color: "N/A",
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        lineTotal: (item.price * item.quantity).toString(),
      })),
      subtotal: subtotal.toString(),
      discount: "0",
      tax: tax.toString(),
      total: total.toString(),
      paymentMethod: paymentMethod as "cash" | "card",
    });
  };

  const change = amountPaid ? parseFloat(amountPaid) - total : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-accent/20 p-2 text-accent">
              <Package className="h-6 w-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Abarrotes POS
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sistema de punto de venta para tiendas de abarrotes
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Productos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Búsqueda */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Catálogo de Productos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando productos...
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron productos
                      </div>
                    ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/5 transition-all"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {product.categoryId}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              SKU: {product.sku}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-accent">
                            ${typeof product.basePrice === 'string' ? parseFloat(product.basePrice).toFixed(2) : (product.basePrice as number).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(product)}
                            disabled={false}
                            className="mt-1"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carrito */}
          <div className="space-y-6">
            <Card className="border-primary/20 sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Carrito vacío
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-primary/5 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-foreground">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${item.price.toFixed(2)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="border-t border-border pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold">
                          ${subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA (16%):</span>
                        <span className="font-semibold">
                          ${tax.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold bg-primary/10 p-2 rounded">
                        <span>Total:</span>
                        <span className="text-primary">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0}
                    >
                      Proceder al Pago
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Pago</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA:</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                  <span>Total:</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="flex-1"
                  >
                    Efectivo
                  </Button>
                  <Button
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("card")}
                    className="flex-1"
                  >
                    Tarjeta
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto Pagado</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              {amountPaid && parseFloat(amountPaid) >= total && (
                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Cambio: ${change.toFixed(2)}
                  </p>
                </div>
              )}

              {amountPaid && parseFloat(amountPaid) < total && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Monto insuficiente
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCheckout(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={
                  !amountPaid || parseFloat(amountPaid) < total || createSale.isPending
                }
              >
                {createSale.isPending ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


// ============================================================================
// SUBSCRIPTION CORE V1 - Guard de acceso para Abarrotes
// Patron wrapper: el componente original (AbarrotesPOSContent) queda intacto
// con todos sus hooks existentes. Este wrapper hace la validacion y solo
// renderiza el contenido si el usuario tiene acceso.
// ============================================================================

export default function AbarrotesPOS() {
  const [, navigateTo] = useLocation();
  const { data: access, isLoading: accessLoading } =
    trpc.pagos.subscriptions.hasAccess.useQuery({ posCode: "abarrotes" });

  // Mientras carga el estado de acceso: loading amigable
  if (accessLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Verificando tu acceso...</p>
      </div>
    );
  }

  // Sin acceso activo: pantalla amigable con CTAs a planes
  if (access && !access.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header con gradiente naranja/rojo tipico de Abarrotes */}
          <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 px-8 pt-12 pb-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-300/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="text-7xl mb-3">🛒</div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Abarrotes</h1>
              <p className="text-orange-50 text-sm font-medium">Punto de venta para tienda</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Necesitas una suscripcion activa
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Para usar Abarrotes necesitas estar suscrito.
                Cobra ventas, controla inventario y revisa tus ingresos diarios.
              </p>
            </div>

            {/* Highlights del plan */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-orange-900">
                <span className="text-base">✓</span>
                <span>Codigos de barras y bascula</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-900">
                <span className="text-base">✓</span>
                <span>Inventario ilimitado</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-900">
                <span className="text-base">✓</span>
                <span>Ventas con fiado y reportes diarios</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-900">
                <span className="text-base">✓</span>
                <span>$300/mes o $3,000/ano</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigateTo("/pricing?posCode=abarrotes")}
                className="w-full h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all"
              >
                Ver planes
              </button>
              <button
                onClick={() => navigateTo("/sistemas")}
                className="w-full h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
              >
                Volver a mi panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Acceso confirmado: renderiza el POS normal (componente original intacto)
  return <AbarrotesPOSContent />;
}
