import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AccessDeniedScreen from "@/components/AccessDeniedScreen";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  Package,
  Loader2,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// ABARROTES POS - Diseno premium dinamico
// ----------------------------------------------------------------------------
// Mantiene 100% la funcionalidad actual:
//  - Productos + carrito
//  - Pago efectivo/tarjeta con cambio automatico
//  - Subscription guard
//
// Rediseno premium:
//  - Estetica naranja/ambar (caracteristica de abarrotes - sol/maiz/tortilla)
//  - Mesh aurora animado de fondo
//  - Cards con hover lift + shimmer
//  - Modal checkout flotante (no Dialog standard)
//  - Animaciones stagger de entrada
//  - Coherente con SystemsPanel y Veterinaria
//
// Features FUTURAS (para siguientes commits, NO en este):
//  - Fiado inteligente
//  - Productos sin codigo / venta por monto
//  - Stock bajo
//  - Portal Mi Tiendita
//  - Corte de caja
// ============================================================================

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  sku?: string;
}

export default function AbarrotesPOS() {
  const [, navigate] = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // SUBSCRIPTION CORE V1
  const { data: access, isLoading: isLoadingAccess } =
    trpc.pagos.subscriptions.hasAccess.useQuery({ posCode: "abarrotes" });

  const { data: products, isLoading } = trpc.products.list.useQuery(undefined, {
    enabled: true,
  });

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

  // ========================================================================
  // GUARD DE ACCESO
  // ========================================================================
  if (isLoadingAccess) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-slate-400">Validando tu suscripcion...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (access && !access.hasAccess) {
    return (
      <DashboardLayout>
        <AccessDeniedScreen
          posCode="abarrotes"
          description="Sistema de punto de venta para tiendas de abarrotes con codigo de barras, productos a granel y bascula integrada."
          benefits={[
            "Codigo de barras y busqueda rapida",
            "Inventario con stock minimo",
            "Multi-cajero con permisos",
            "Reportes de venta",
          ]}
          onViewPlans={() => navigate("/pricing?posCode=abarrotes")}
        />
      </DashboardLayout>
    );
  }

  // ========================================================================
  // LOGICA DE CARRITO Y VENTA (sin cambios funcionales)
  // ========================================================================
  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: typeof product.basePrice === "string"
            ? parseFloat(product.basePrice)
            : (product.basePrice as number),
          quantity: 1,
          category: String(product.categoryId ?? ""),
          sku: product.sku,
        },
      ]);
    }
    toast.success("Agregado: " + product.name, { duration: 1200 });
  };

  const updateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const change = amountPaid ? parseFloat(amountPaid) - total : 0;

  const filteredProducts = (products ?? []).filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createSale.mutate({
      items: cart.map((item) => ({
        productId: item.id,
        sizeVariant: "N/A",
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

  // Botones de monto rapido para efectivo (UX abarrotes)
  const quickAmounts = [
    { label: "Exacto", value: total > 0 ? total.toFixed(2) : "" },
    { label: "$100", value: "100" },
    { label: "$200", value: "200" },
    { label: "$500", value: "500" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* MESH AURORA dinamico - tematica naranja/ambar abarrotes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[120px] animate-mesh-1" />
        <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-orange-500/15 blur-[120px] animate-mesh-2" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-yellow-500/10 blur-[120px] animate-mesh-3" />
      </div>

      <style>{`
        @keyframes mesh1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes mesh2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 60px) scale(1.15); }
        }
        @keyframes mesh3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.05); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-mesh-1 { animation: mesh1 20s ease-in-out infinite; }
        .animate-mesh-2 { animation: mesh2 25s ease-in-out infinite; }
        .animate-mesh-3 { animation: mesh3 22s ease-in-out infinite; }
        .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
        .stagger-1 { animation-delay: 0.05s; opacity: 0; }
        .stagger-2 { animation-delay: 0.1s; opacity: 0; }
        .stagger-3 { animation-delay: 0.15s; opacity: 0; }
        .card-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* ============================================================ */}
        {/* HEADER PREMIUM con metricas inline                            */}
        {/* ============================================================ */}
        <header className={"mb-6 lg:mb-8 " + (mounted ? "animate-slide-up stagger-1" : "opacity-0")}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Logo abarrotes - gradient ambar */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 blur-md opacity-60" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/40">
                  🛒
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300">
                    Punto de venta
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  Abarrotes
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Tienditas con caracter mexicano
                </p>
              </div>
            </div>

            {/* Indicadores estado */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-xs font-bold text-emerald-300">Sistema activo</span>
              </div>
              {cart.length > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500/15 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-lg shadow-amber-500/10 animate-scale-in">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-xs font-bold text-amber-300">
                    {cart.length} en carrito · ${total.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* GRID PRINCIPAL: catalogo + carrito                            */}
        {/* ============================================================ */}
        <div className="grid gap-4 lg:gap-5 lg:grid-cols-3">
          {/* ─────────────────────────────────────────────────────────── */}
          {/* COLUMNA IZQUIERDA: catalogo de productos                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className={"lg:col-span-2 " + (mounted ? "animate-slide-up stagger-2" : "opacity-0")}>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header del catalogo */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    Catalogo
                    <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full ml-1">
                      {filteredProducts.length}
                    </span>
                  </h2>
                  {/* Buscador */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar producto o SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 h-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:bg-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de productos */}
              <div className="p-3 sm:p-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando productos...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium mb-1">No hay productos</p>
                    <p className="text-slate-500 text-xs">
                      {searchTerm ? "Prueba con otra busqueda" : "Empieza agregando productos al catalogo"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredProducts.map((product: any, idx: number) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={() => addToCart(product)}
                        delay={idx * 30}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* COLUMNA DERECHA: carrito                                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className={"lg:col-span-1 " + (mounted ? "animate-slide-up stagger-3" : "opacity-0")}>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl sticky top-4">
              {/* Header carrito con gradient amber */}
              <div className="bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-300" />
                    Carrito
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-full">
                    {cart.length} items
                  </span>
                </div>
              </div>

              {/* Items del carrito */}
              <div className="p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <ShoppingCart className="w-7 h-7 text-amber-400/60" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">Carrito vacio</p>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Selecciona productos del catalogo para agregarlos aqui
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto mb-4 pr-1">
                      {cart.map((item) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                          onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
                          onRemove={() => removeFromCart(item.id)}
                        />
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-slate-200 font-semibold">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">IVA (16%)</span>
                        <span className="text-slate-200 font-semibold">${tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Total</span>
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Boton de cobro */}
                    <Button
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0}
                      className="w-full h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all gap-2 text-sm"
                    >
                      <Zap className="w-4 h-4" />
                      Proceder al pago
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL CHECKOUT PREMIUM (no Dialog estandard)                 */}
      {/* ============================================================ */}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          change={change}
          quickAmounts={quickAmounts}
          onCancel={() => setShowCheckout(false)}
          onConfirm={handleCheckout}
          isPending={createSale.isPending}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES PREMIUM
// ============================================================================

function ProductCard({ product, onAdd, delay }: { product: any; onAdd: () => void; delay: number }) {
  const price = typeof product.basePrice === "string"
    ? parseFloat(product.basePrice)
    : (product.basePrice as number);

  return (
    <button
      onClick={onAdd}
      className="group relative bg-white/[0.03] hover:bg-amber-500/10 backdrop-blur-md border border-white/10 hover:border-amber-500/40 rounded-2xl p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/20 overflow-hidden animate-slide-up"
      style={{ animationDelay: delay + "ms", animationFillMode: "forwards", opacity: 0 }}
    >
      {/* Orb decorativo */}
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity bg-gradient-to-br from-amber-500 to-orange-500" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-200 group-hover:to-orange-200 transition-all">
            {product.name}
          </p>
          {product.sku && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
              {product.sku}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <p className="text-base font-bold text-amber-300">${price.toFixed(2)}</p>
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center group-hover:bg-amber-500 group-hover:scale-110 transition-all">
            <Plus className="w-3.5 h-3.5 text-amber-300 group-hover:text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}

function CartItemRow({ item, onIncrement, onDecrement, onRemove }: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const lineTotal = item.price * item.quantity;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 animate-scale-in">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="font-bold text-white text-xs truncate flex-1 min-w-0">{item.name}</p>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 flex items-center justify-center transition-all flex-shrink-0"
          aria-label="Eliminar"
        >
          <Trash2 className="w-3 h-3 text-rose-400" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onDecrement}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all"
          >
            <Minus className="w-3 h-3 text-slate-300" />
          </button>
          <span className="w-8 text-center text-white font-bold text-sm">{item.quantity}</span>
          <button
            onClick={onIncrement}
            className="w-7 h-7 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 flex items-center justify-center transition-all"
          >
            <Plus className="w-3 h-3 text-amber-300" />
          </button>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">${item.price.toFixed(2)} c/u</p>
          <p className="text-sm font-bold text-amber-300">${lineTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({
  subtotal, tax, total, paymentMethod, setPaymentMethod, amountPaid, setAmountPaid,
  change, quickAmounts, onCancel, onConfirm, isPending,
}: any) {
  const insufficient = amountPaid && parseFloat(amountPaid) < total;
  const sufficient = amountPaid && parseFloat(amountPaid) >= total;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 px-6 pt-6 pb-5 border-b border-slate-100 rounded-t-3xl">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-0.5">
                Cobro
              </p>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Confirmar pago
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Resumen total */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-900 font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">IVA</span>
              <span className="text-slate-900 font-semibold">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-amber-200 pt-2 mt-1 flex items-center justify-between">
              <span className="text-slate-900 font-bold">Total a cobrar</span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Metodo de pago */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
              Metodo de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={
                  "flex items-center justify-center gap-2 h-12 rounded-xl font-bold transition-all " +
                  (paymentMethod === "cash"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <Banknote className="w-4 h-4" />
                Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={
                  "flex items-center justify-center gap-2 h-12 rounded-xl font-bold transition-all " +
                  (paymentMethod === "card"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <CreditCard className="w-4 h-4" />
                Tarjeta
              </button>
            </div>
          </div>

          {/* Monto recibido (solo efectivo) */}
          {paymentMethod === "cash" && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                  Monto recibido
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 h-14 text-slate-900 text-2xl font-bold placeholder:text-slate-300 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Botones rapidos de monto */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((qa: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAmountPaid(qa.value)}
                    disabled={!qa.value}
                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-700 font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Cambio o error */}
          {paymentMethod === "cash" && sufficient && (
            <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl p-4 animate-scale-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold text-sm">Cambio a entregar</span>
                </div>
                <span className="text-2xl font-bold text-emerald-700">
                  ${change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === "cash" && insufficient && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2 animate-scale-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <p className="text-sm text-rose-700 font-semibold">
                Faltan ${(total - parseFloat(amountPaid)).toFixed(2)} para completar el pago
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 font-bold h-12 px-6 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending || (paymentMethod === "cash" && !sufficient)}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white gap-2 font-bold h-12 px-6 rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar pago
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
