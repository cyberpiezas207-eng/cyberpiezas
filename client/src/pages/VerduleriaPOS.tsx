import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  CreditCard,
  Banknote,
  ArrowLeft,
  Sparkles,
  Apple,
  Carrot,
} from "lucide-react";

// Categorias con iconos
const CATEGORIES = [
  { id: "all", name: "Todos", icon: "🛒" },
  { id: "fruta", name: "Frutas", icon: "🍎" },
  { id: "verdura", name: "Verduras", icon: "🥬" },
  { id: "tuberculo", name: "Raices", icon: "🥕" },
  { id: "hierba", name: "Hierbas", icon: "🌿" },
  { id: "otro", name: "Otros", icon: "📦" },
];

// Emojis comunes para "Otra cosa"
const COMMON_EMOJIS = [
  "🍎", "🍌", "🍊", "🍋", "🍇", "🍉", "🍓", "🥝", "🥑", "🍑",
  "🍒", "🥭", "🍍", "🫐", "🥥", "🍅", "🥒", "🥬", "🥦", "🌽",
  "🥕", "🧅", "🧄", "🥔", "🌶️", "🍆", "🍄", "🌿", "🥚", "🥛",
  "🧀", "🥖", "🍞", "🥩", "🍗", "🍤", "📦",
];

type CartItem = {
  productId?: number;
  name: string;
  icon: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export function VerduleriaPOS() {
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const productsQuery = trpc.verduleria.products.list.useQuery({});
  const statsQuery = trpc.verduleria.sales.stats.useQuery();

  const seedDefaults = trpc.verduleria.products.seedDefaults.useMutation({
    onSuccess: (res) => {
      if (res.seeded) {
        toast.success("Catalogo cargado con " + res.count + " productos");
        utils.verduleria.products.list.invalidate();
      } else {
        toast.info(res.message);
      }
    },
  });

  const createSale = trpc.verduleria.sales.create.useMutation({
    onSuccess: (data) => {
      setLastSale({
        items: [...cart],
        total: cartTotal,
        date: new Date(),
        receiptNumber: data?.id ? "V" + String(data.id).padStart(4, "0") : "V0001",
      });
      setCart([]);
      setShowCheckout(false);
      setShowReceipt(true);
      utils.verduleria.sales.stats.invalidate();
      utils.verduleria.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const products = productsQuery.data ?? [];

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const addToCart = (product: any) => {
    const existingIdx = cart.findIndex((item) => item.productId === product.id);
    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          icon: product.icon,
          unit: product.unit,
          quantity: 1,
          unitPrice: parseFloat(product.price),
        },
      ]);
    }
  };

  const updateCartQuantity = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].quantity = Math.max(0.001, updated[idx].quantity + delta);
    setCart(updated);
  };

  const setCartQuantity = (idx: number, value: number) => {
    const updated = [...cart];
    updated[idx].quantity = Math.max(0.001, value);
    setCart(updated);
  };

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleCheckout = (paymentMethod: "efectivo" | "tarjeta" | "transferencia" | "credito") => {
    if (cart.length === 0) {
      toast.error("Carrito vacio");
      return;
    }
    createSale.mutate({
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        icon: item.icon,
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })),
    });
  };

  const stats = statsQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Hero compacto */}
        <section className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-green-400/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 mb-1">
                🥕 Punto de venta
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Verduleria</h1>
              <p className="text-emerald-100 mt-1">Tap rapido, cobra rapido.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Ventas hoy</p>
                <p className="text-2xl font-bold tracking-tight">{stats?.totalSales ?? 0}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Ingresos</p>
                <p className="text-2xl font-bold tracking-tight">${parseFloat(stats?.totalRevenue ?? "0").toFixed(0)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Items</p>
                <p className="text-2xl font-bold tracking-tight">{stats?.totalItems ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Si NO hay productos, mostrar onboarding */}
        {products.length === 0 && !productsQuery.isLoading && (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center shadow-sm">
            <div className="text-6xl mb-4">🥕</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Empecemos!</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              Carga el catalogo base con 24 productos comunes para que puedas vender en 30 segundos.
            </p>
            <Button
              onClick={() => seedDefaults.mutate()}
              disabled={seedDefaults.isPending}
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-full h-11 px-6 font-bold shadow-lg shadow-emerald-500/30"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {seedDefaults.isPending ? "Cargando..." : "Cargar catalogo base"}
            </Button>
            <p className="text-xs text-slate-500 mt-4">Despues podras agregar, editar o quitar productos.</p>
          </div>
        )}

        {/* Layout POS con catalogo + carrito */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CATALOGO - 2 columnas */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filtros */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={
                        "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 " +
                        (selectedCategory === cat.id
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                      }
                    >
                      <span className="text-base">{cat.icon}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar producto..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all text-center active:scale-95"
                  >
                    <div className="text-5xl mb-2 group-hover:scale-110 transition-transform">
                      {product.icon}
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                    <p className="text-emerald-600 font-bold text-base mt-1">
                      ${parseFloat(product.price).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">/{product.unit}</p>
                  </button>
                ))}
                {/* Boton "Otra cosa" */}
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center"
                >
                  <div className="text-5xl mb-2">➕</div>
                  <p className="text-sm font-bold text-slate-700">Otra cosa</p>
                  <p className="text-[10px] text-slate-500 mt-1">Producto puntual</p>
                </button>
              </div>

              {filteredProducts.length === 0 && searchQuery && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                  <p className="text-slate-600">No se encontro "{searchQuery}"</p>
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="mt-3 text-sm font-bold text-emerald-600 hover:underline"
                  >
                    Agregar como producto puntual
                  </button>
                </div>
              )}
            </div>

            {/* CARRITO - 1 columna */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-4 text-white">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    <p className="font-bold text-lg">Carrito</p>
                    <span className="ml-auto bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">
                      {cart.length}
                    </span>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-4xl mb-2 opacity-30">🛒</div>
                      <p className="text-sm text-slate-500">Agrega productos para empezar</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {cart.map((item, idx) => (
                        <li key={idx} className="px-4 py-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                              <p className="text-xs text-slate-500">
                                ${item.unitPrice.toFixed(2)}/{item.unit}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-2 ml-12">
                            <button
                              onClick={() => updateCartQuantity(idx, -0.5)}
                              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) => setCartQuantity(idx, parseFloat(e.target.value) || 0.001)}
                              className="w-20 h-8 text-center font-bold text-slate-900 bg-slate-50 rounded-lg border border-slate-200 text-sm"
                            />
                            <button
                              onClick={() => updateCartQuantity(idx, 0.5)}
                              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="ml-auto text-sm font-bold text-emerald-600">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total</span>
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:shadow-none"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Cobrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Otra cosa */}
      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdd={(item) => {
            setCart([...cart, item]);
            setShowQuickAdd(false);
          }}
        />
      )}

      {/* Modal: Checkout */}
      {showCheckout && (
        <CheckoutModal
          total={cartTotal}
          itemCount={cart.length}
          onConfirm={handleCheckout}
          onCancel={() => setShowCheckout(false)}
          loading={createSale.isPending}
        />
      )}

      {/* Modal: Recibo */}
      {showReceipt && lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setShowReceipt(false)} />
      )}
    </DashboardLayout>
  );
}

// ============================================================================
// Modal: Quick Add ("Otra cosa")
// ============================================================================

function QuickAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieza");

  const handleAdd = () => {
    if (!name || !price) {
      toast.error("Falta nombre o precio");
      return;
    }
    onAdd({
      name,
      icon,
      unit,
      quantity: parseFloat(quantity) || 1,
      unitPrice: parseFloat(price) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Agregar producto puntual</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Icono</p>
          <div className="bg-slate-50 rounded-xl p-2 max-h-32 overflow-y-auto grid grid-cols-9 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={
                  "text-2xl p-1.5 rounded-lg transition-all " +
                  (icon === emoji ? "bg-emerald-100 ring-2 ring-emerald-500" : "hover:bg-slate-200")
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sandia chica"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-emerald-400 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Precio</p>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Unidad</p>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-emerald-400 focus:outline-none"
              >
                <option value="kg">kg</option>
                <option value="pieza">pieza</option>
                <option value="atado">atado</option>
                <option value="manojo">manojo</option>
                <option value="caja">caja</option>
                <option value="saco">saco</option>
                <option value="litro">litro</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cantidad</p>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        <Button
          onClick={handleAdd}
          className="w-full mt-5 h-11 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Agregar al carrito
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Modal: Checkout
// ============================================================================

function CheckoutModal({
  total,
  itemCount,
  onConfirm,
  onCancel,
  loading,
}: {
  total: number;
  itemCount: number;
  onConfirm: (method: "efectivo" | "tarjeta" | "transferencia" | "credito") => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
          <ShoppingCart className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total a cobrar</p>
        <p className="text-5xl font-bold text-slate-900 tracking-tight mb-1">${total.toFixed(2)}</p>
        <p className="text-sm text-slate-500 mb-6">{itemCount} {itemCount === 1 ? "item" : "items"}</p>

        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Forma de pago</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => onConfirm("efectivo")}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-14 font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
          >
            <Banknote className="w-5 h-5" />
            <span className="text-sm">Efectivo</span>
          </button>
          <button
            onClick={() => onConfirm("tarjeta")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-14 font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-sm">Tarjeta</span>
          </button>
          <button
            onClick={() => onConfirm("transferencia")}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl h-14 font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
          >
            <span className="text-base">📱</span>
            <span className="text-sm">Transferencia</span>
          </button>
          <button
            onClick={() => onConfirm("credito")}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-14 font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
          >
            <span className="text-base">📝</span>
            <span className="text-sm">Fiado</span>
          </button>
        </div>
        {loading && <p className="text-sm text-slate-500 mt-3">Procesando...</p>}
      </div>
    </div>
  );
}

// ============================================================================
// Modal: Recibo
// ============================================================================

function ReceiptModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #verduleria-receipt, #verduleria-receipt * { visibility: visible; }
          #verduleria-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          #verduleria-receipt .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
          id="verduleria-receipt"
          className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="no-print bg-emerald-500 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <p className="font-bold">¡Venta registrada!</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 font-mono text-sm">
            <div className="text-center mb-4 pb-4 border-b border-dashed border-slate-300">
              <div className="text-4xl mb-2">🥕</div>
              <p className="font-bold uppercase tracking-wide">Verduleria</p>
              <p className="text-xs text-slate-500 mt-1">CyberPiezas POS</p>
            </div>

            <div className="text-xs space-y-1 mb-4 pb-4 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Recibo:</span>
                <span className="font-bold">#{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{sale.date.toLocaleString("es-MX")}</span>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b border-dashed border-slate-300 space-y-1.5">
              {sale.items.map((item: CartItem, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="flex-1 min-w-0">
                      {item.icon} {item.name}
                    </span>
                    <span className="font-bold">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} {item.unit} x ${item.unitPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline mb-4">
              <span className="font-bold uppercase">Total</span>
              <span className="text-2xl font-bold tracking-tight">${sale.total.toFixed(2)}</span>
            </div>

            <div className="text-center text-xs italic text-slate-600 pt-3 border-t border-dashed border-slate-300">
              ¡Gracias por su compra!
            </div>
          </div>

          <div className="no-print px-5 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
            <Button onClick={handlePrint} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 font-bold">
              Imprimir
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 rounded-full h-10 font-bold">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default VerduleriaPOS;
