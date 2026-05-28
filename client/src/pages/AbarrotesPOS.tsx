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
  Users,
  Wallet,
  Phone,
  UserCircle,
  MessageCircle,
  PiggyBank,
  Save,
  Calendar,
  Receipt,
  ArrowDownCircle,
  AlertCircle,
  TrendingDown,
  ClipboardList,
  Copy,
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
  isQuick?: boolean; // true para ventas rapidas sin codigo
}

type TabKey = "venta" | "clientes" | "fiados" | "stock";

// Umbral por defecto para considerar stock bajo (configurable a futuro)
const LOW_STOCK_THRESHOLD = 10;
const CRITICAL_STOCK_THRESHOLD = 3;

export default function AbarrotesPOS() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("venta");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "fiado">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  // Estado para venta a fiado: cliente seleccionado + descripcion
  const [fiadoCustomerId, setFiadoCustomerId] = useState<number>(0);
  const [fiadoDescription, setFiadoDescription] = useState("");
  const [mounted, setMounted] = useState(false);
  // Estado para modal "Producto personalizado" (venta rapida sin codigo)
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  // Estado para modal "Nuevo cliente" (fiado)
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  // Estado para modal "Registrar abono" (pago parcial de fiado)
  const [abonoFiado, setAbonoFiado] = useState<any>(null);

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

  // Mutation para crear fiado (venta a credito vinculada a cliente)
  const createFiado = trpc.abarrotes.fiado.fiados.create.useMutation({
    onError: (error) => {
      toast.error("Error al registrar el fiado: " + error.message);
    },
  });

  // ========================================================================
  // FIADO - CLIENTES (queries del nuevo router abarrotes.fiado)
  // Solo carga si el tab activo es 'clientes' o 'fiados' (optimizacion)
  // ========================================================================
  const utils = trpc.useUtils();
  const customersQuery = trpc.abarrotes.fiado.customers.list.useQuery(undefined, {
    enabled: activeTab === "clientes" || activeTab === "fiados" || showCheckout,
    refetchOnWindowFocus: false,
  });
  const customers = customersQuery.data ?? [];

  // Query de fiados (deudas) - solo cuando el tab activo es 'fiados'
  const fiadosQuery = trpc.abarrotes.fiado.fiados.list.useQuery(
    { includeAll: false },
    {
      enabled: activeTab === "fiados",
      refetchOnWindowFocus: false,
    }
  );
  const fiados = fiadosQuery.data ?? [];

  // ========================================================================
  // STOCK BAJO - calculo derivado de productos
  // Detecta productos que tienen stock <= LOW_STOCK_THRESHOLD para alertar
  // al tendero antes de quedarse sin existencias. NO requiere endpoint nuevo:
  // usa el mismo products.list que ya tenemos en pantalla.
  // ========================================================================
  const lowStockProducts = (products ?? [])
    .map((p: any) => {
      // El stock puede venir en p.stock, p.totalStock o calcularse de variants
      const stockValue =
        typeof p.stock === "number" ? p.stock :
        typeof p.totalStock === "number" ? p.totalStock :
        Array.isArray(p.variants) ? p.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0) :
        null; // null = sin info de stock

      return { ...p, computedStock: stockValue };
    })
    .filter((p: any) => p.computedStock !== null && p.computedStock <= LOW_STOCK_THRESHOLD)
    .sort((a: any, b: any) => a.computedStock - b.computedStock); // critico primero

  const lowStockCount = lowStockProducts.length;
  const criticalStockCount = lowStockProducts.filter((p: any) => p.computedStock <= CRITICAL_STOCK_THRESHOLD).length;

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
  // ========================================================================
  // VENTA RAPIDA - agregar item sin producto registrado
  // Permite vender productos sueltos (golosinas, pan, etc) sin tenerlos
  // capturados en el catalogo. Se identifican con isQuick: true.
  // ========================================================================
  const addQuickItem = (price: number, name?: string) => {
    const finalName = name?.trim() || "Venta rapida $" + price.toFixed(2);
    // Generar ID unico para items rapidos (no chocan con productos reales)
    const quickId = "quick-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

    setCart([
      ...cart,
      {
        id: quickId,
        name: finalName,
        price: price,
        quantity: 1,
        category: "rapido",
        isQuick: true,
      },
    ]);
    toast.success("Agregado: " + finalName, { duration: 1200 });
  };

  const handleAddCustomProduct = () => {
    const priceNum = parseFloat(customPrice);
    if (!customName.trim()) return toast.error("Escribe el nombre del producto");
    if (!priceNum || priceNum <= 0) return toast.error("Monto invalido");
    addQuickItem(priceNum, customName.trim());
    setCustomName("");
    setCustomPrice("");
    setShowCustomProduct(false);
  };

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

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Validacion especial para fiado
    if (paymentMethod === "fiado") {
      if (!fiadoCustomerId) {
        return toast.error("Selecciona el cliente para registrar la deuda");
      }
    }

    try {
      // PASO 1: Crear la venta normal en el sistema
      const saleResult: any = await createSale.mutateAsync({
        items: cart.map((item) => ({
          // Para items rapidos enviamos el ID generado, igual que productos normales
          // El backend los procesa como ventas (no afectan stock). Identificamos con sizeVariant.
          productId: item.id,
          sizeVariant: item.isQuick ? "rapido" : "N/A",
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
        // Si es fiado, marcamos como cash en sales.create pero registramos en libreta
        paymentMethod: (paymentMethod === "fiado" ? "cash" : paymentMethod) as "cash" | "card",
      });

      // PASO 2: Si es fiado, ademas registramos en la libreta digital
      if (paymentMethod === "fiado" && fiadoCustomerId) {
        const customer = customers.find((c: any) => c.id === fiadoCustomerId);
        const fiadoResult: any = await createFiado.mutateAsync({
          customerId: fiadoCustomerId,
          saleId: saleResult?.id ? Number(saleResult.id) : undefined,
          description: fiadoDescription.trim() || ("Venta del " + new Date().toLocaleDateString("es-MX")),
          totalAmount: total.toString(),
        });

        toast.success("Fiado registrado en libreta de " + (customer?.name || "cliente"));

        // Invalidar query de clientes para que se vea el nuevo saldo
        utils.abarrotes.fiado.customers.list.invalidate();

        // Limpiar estado del fiado
        setFiadoCustomerId(0);
        setFiadoDescription("");
      }
    } catch (err) {
      console.error("[handleCheckout] error:", err);
    }
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
        {/* TABS NAVIGATION - Venta / Clientes / Fiados                   */}
        {/* ============================================================ */}
        <div className={"mb-5 " + (mounted ? "animate-slide-up stagger-2" : "opacity-0")}>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 inline-flex gap-1 shadow-lg">
            <TabButton
              active={activeTab === "venta"}
              onClick={() => setActiveTab("venta")}
              icon={<ShoppingCart className="w-4 h-4" />}
              label="Venta"
              badge={cart.length > 0 ? cart.length : undefined}
            />
            <TabButton
              active={activeTab === "clientes"}
              onClick={() => setActiveTab("clientes")}
              icon={<Users className="w-4 h-4" />}
              label="Clientes"
              badge={customers.length > 0 ? customers.length : undefined}
            />
            <TabButton
              active={activeTab === "fiados"}
              onClick={() => setActiveTab("fiados")}
              icon={<Wallet className="w-4 h-4" />}
              label="Fiados"
              badge={fiados.length > 0 ? fiados.length : undefined}
            />
            <TabButton
              active={activeTab === "stock"}
              onClick={() => setActiveTab("stock")}
              icon={<TrendingDown className="w-4 h-4" />}
              label="Stock"
              badge={lowStockCount > 0 ? lowStockCount : undefined}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB VENTA: GRID PRINCIPAL (catalogo + carrito)                */}
        {/* ============================================================ */}
        {activeTab === "venta" && (
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
                {/* ────────────────────────────────────────────────── */}
                {/* SECCION VENTA RAPIDA - productos sin codigo         */}
                {/* ────────────────────────────────────────────────── */}
                <div className="mb-4 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/30 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Venta rapida
                    </span>
                    <span className="text-[9px] text-slate-500 ml-auto italic">sin codigo</span>
                  </div>

                  {/* Botones de monto preestablecido */}
                  <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                    {[1, 5, 10, 20].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => addQuickItem(amount)}
                        className="h-9 rounded-lg bg-white/[0.05] hover:bg-amber-500/25 border border-white/10 hover:border-amber-500/50 text-white hover:text-amber-100 text-xs font-bold transition-all active:scale-95"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  {/* Boton producto personalizado */}
                  <button
                    onClick={() => setShowCustomProduct(true)}
                    className="w-full h-9 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 text-amber-200 hover:text-amber-100 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Producto personalizado
                  </button>
                </div>

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
        )}

        {/* ============================================================ */}
        {/* TAB CLIENTES: Lista de clientes con saldo + nuevo cliente     */}
        {/* ============================================================ */}
        {activeTab === "clientes" && (
          <div className={mounted ? "animate-slide-up" : "opacity-0"}>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-white/10 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Clientes
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full ml-1">
                    {customers.length}
                  </span>
                </h2>
                <Button
                  onClick={() => setShowCustomerForm(true)}
                  className="h-10 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 gap-2 px-4 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo cliente
                </Button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5">
                {customersQuery.isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando clientes...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <EmptyClientesState onCreate={() => setShowCustomerForm(true)} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {customers.map((customer: any, idx: number) => (
                      <CustomerCard
                        key={customer.id}
                        customer={customer}
                        delay={idx * 50}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB FIADOS: Lista de deudas activas + sistema de abonos       */}
        {/* ============================================================ */}
        {activeTab === "fiados" && (
          <div className={mounted ? "animate-slide-up" : "opacity-0"}>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/10 border-b border-white/10 px-5 py-4">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-rose-400" />
                  Libreta de fiados
                  <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full ml-1">
                    {fiados.length} {fiados.length === 1 ? "deuda activa" : "deudas activas"}
                  </span>
                </h2>
                {fiados.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Total por cobrar:{" "}
                    <span className="font-bold text-rose-300">
                      ${fiados.reduce((sum: number, f: any) =>
                        sum + (Number(f.totalAmount) - Number(f.paidAmount)), 0
                      ).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5">
                {fiadosQuery.isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando deudas...</p>
                  </div>
                ) : fiados.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400/80" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">¡Sin deudas pendientes!</p>
                    <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                      Cuando registres una venta a fiado, aparecera aqui.
                      Por ahora todos tus clientes estan al corriente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fiados.map((fiado: any, idx: number) => {
                      const customer = customers.find((c: any) => c.id === fiado.customerId);
                      return (
                        <FiadoCard
                          key={fiado.id}
                          fiado={fiado}
                          customer={customer}
                          delay={idx * 50}
                          onAbonar={() => setAbonoFiado(fiado)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB STOCK: Productos con stock bajo + lista de surtido         */}
        {/* ============================================================ */}
        {activeTab === "stock" && (
          <div className={mounted ? "animate-slide-up" : "opacity-0"}>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border-b border-white/10 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-orange-400" />
                    Stock bajo
                    {lowStockCount > 0 && (
                      <span className="text-[10px] font-semibold text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded-full ml-1">
                        {lowStockCount} producto{lowStockCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </h2>
                  {criticalStockCount > 0 && (
                    <p className="text-xs text-rose-300 mt-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        <strong className="font-bold">{criticalStockCount}</strong> en estado critico (≤ {CRITICAL_STOCK_THRESHOLD})
                      </span>
                    </p>
                  )}
                </div>
                {lowStockProducts.length > 0 && (
                  <Button
                    onClick={() => {
                      const lista = lowStockProducts
                        .map((p: any) => "• " + p.name + " (quedan " + p.computedStock + ")")
                        .join("\n");
                      const fullText = "LISTA DE SURTIDO - " + new Date().toLocaleDateString("es-MX") + "\n\n" + lista;
                      navigator.clipboard.writeText(fullText)
                        .then(() => toast.success("Lista copiada al portapapeles"))
                        .catch(() => toast.error("No se pudo copiar"));
                    }}
                    className="h-10 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 hover:from-orange-600 hover:via-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 gap-2 px-4 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar lista surtido
                  </Button>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5">
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando inventario...</p>
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400/80" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">¡Inventario sano!</p>
                    <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                      Ningun producto esta por debajo de las {LOW_STOCK_THRESHOLD} unidades.
                      Te avisare cuando alguno necesite resurtido.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Lista de surtido */}
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-3 mb-4 flex items-start gap-2">
                      <ClipboardList className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-slate-300 leading-relaxed">
                        <strong className="font-bold text-orange-300">Tip:</strong>{" "}
                        Usa el boton "Copiar lista" para mandar por WhatsApp a tu proveedor.
                        Ya viene formateada lista para enviar.
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {lowStockProducts.map((product: any, idx: number) => (
                        <LowStockCard
                          key={product.id}
                          product={product}
                          delay={idx * 40}
                          isCritical={product.computedStock <= CRITICAL_STOCK_THRESHOLD}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
          customers={customers}
          fiadoCustomerId={fiadoCustomerId}
          setFiadoCustomerId={setFiadoCustomerId}
          fiadoDescription={fiadoDescription}
          setFiadoDescription={setFiadoDescription}
          onCancel={() => {
            setShowCheckout(false);
            setFiadoCustomerId(0);
            setFiadoDescription("");
          }}
          onConfirm={handleCheckout}
          isPending={createSale.isPending || createFiado.isPending}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL PRODUCTO PERSONALIZADO - venta rapida con nombre        */}
      {/* ============================================================ */}
      {showCustomProduct && (
        <CustomProductModal
          name={customName}
          setName={setCustomName}
          price={customPrice}
          setPrice={setCustomPrice}
          onCancel={() => {
            setShowCustomProduct(false);
            setCustomName("");
            setCustomPrice("");
          }}
          onAdd={handleAddCustomProduct}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL NUEVO CLIENTE - libreta de fiado                        */}
      {/* ============================================================ */}
      {showCustomerForm && (
        <CustomerFormModal
          onCancel={() => setShowCustomerForm(false)}
          onSaved={() => {
            setShowCustomerForm(false);
            utils.abarrotes.fiado.customers.list.invalidate();
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL ABONO - registrar pago parcial de un fiado              */}
      {/* ============================================================ */}
      {abonoFiado && (
        <AbonoModal
          fiado={abonoFiado}
          customer={customers.find((c: any) => c.id === abonoFiado.customerId)}
          onCancel={() => setAbonoFiado(null)}
          onSaved={() => {
            setAbonoFiado(null);
            utils.abarrotes.fiado.fiados.list.invalidate();
            utils.abarrotes.fiado.customers.list.invalidate();
          }}
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
    <div className={"border rounded-xl p-2.5 animate-scale-in " + (item.isQuick ? "bg-amber-500/[0.08] border-amber-500/30" : "bg-white/[0.03] border-white/10")}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <p className="font-bold text-white text-xs truncate">{item.name}</p>
          {item.isQuick && (
            <span className="flex-shrink-0 text-[8px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded">
              Rapido
            </span>
          )}
        </div>
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
  change, quickAmounts, customers, fiadoCustomerId, setFiadoCustomerId,
  fiadoDescription, setFiadoDescription, onCancel, onConfirm, isPending,
}: any) {
  const insufficient = amountPaid && parseFloat(amountPaid) < total;
  const sufficient = amountPaid && parseFloat(amountPaid) >= total;

  // Cliente seleccionado para fiado (objeto completo)
  const selectedCustomer = customers?.find((c: any) => c.id === fiadoCustomerId);
  const currentBalance = selectedCustomer ? Number(selectedCustomer.pendingAmount || 0) : 0;
  const newBalance = currentBalance + total;
  const creditLimit = selectedCustomer ? Number(selectedCustomer.creditLimit || 0) : 0;
  const wouldExceedLimit = creditLimit > 0 && newBalance > creditLimit;

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
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-12 rounded-xl font-bold transition-all text-xs sm:text-sm " +
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
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-12 rounded-xl font-bold transition-all text-xs sm:text-sm " +
                  (paymentMethod === "card"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <CreditCard className="w-4 h-4" />
                Tarjeta
              </button>
              <button
                onClick={() => setPaymentMethod("fiado")}
                className={
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-12 rounded-xl font-bold transition-all text-xs sm:text-sm " +
                  (paymentMethod === "fiado"
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <PiggyBank className="w-4 h-4" />
                Fiado
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

          {/* ============================================================ */}
          {/* SECCION FIADO - selector de cliente + descripcion             */}
          {/* ============================================================ */}
          {paymentMethod === "fiado" && (
            <div className="space-y-3 animate-scale-in">
              {/* Selector de cliente */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                {!customers || customers.length === 0 ? (
                  <div className="flex items-start gap-2 text-amber-900 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      No tienes clientes registrados. Primero crea uno en la pestana{" "}
                      <strong className="font-bold">Clientes</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={fiadoCustomerId}
                      onChange={(e) => setFiadoCustomerId(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 h-12 text-slate-900 font-medium focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all appearance-none"
                    >
                      <option value={0}>-- Selecciona el cliente --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.phone ? " · " + c.phone : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Resumen del saldo si hay cliente seleccionado */}
              {selectedCustomer && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Saldo actual</span>
                    <span className="text-slate-900 font-bold">
                      ${currentBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Esta venta</span>
                    <span className="text-rose-600 font-bold">+ ${total.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-rose-200 pt-1.5 mt-1 flex items-center justify-between">
                    <span className="text-slate-900 font-bold text-sm">Nuevo saldo</span>
                    <span className="text-lg font-bold text-rose-600">
                      ${newBalance.toFixed(2)}
                    </span>
                  </div>
                  {creditLimit > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Limite de credito: ${creditLimit.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Aviso de limite excedido */}
              {wouldExceedLimit && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-rose-700 font-bold">Limite de credito excedido</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      El cliente superara su limite por ${(newBalance - creditLimit).toFixed(2)}.
                      Puedes continuar si confias en el.
                    </p>
                  </div>
                </div>
              )}

              {/* Descripcion */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                  Descripcion <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Despensa semanal, refrescos..."
                  value={fiadoDescription}
                  onChange={(e) => setFiadoDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all"
                />
              </div>

              {/* Tip educativo */}
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>
                  Esta venta se registrara en la libreta digital del cliente.
                  Despues podras recibir abonos parciales.
                </span>
              </div>
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
            disabled={
              isPending ||
              (paymentMethod === "cash" && !sufficient) ||
              (paymentMethod === "fiado" && !fiadoCustomerId)
            }
            className={
              "text-white gap-2 font-bold h-12 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 " +
              (paymentMethod === "fiado"
                ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-600 hover:via-pink-600 hover:to-rose-600 shadow-rose-500/30"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 shadow-amber-500/30")
            }
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : paymentMethod === "fiado" ? (
              <>
                <PiggyBank className="w-4 h-4" />
                Registrar fiado
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

function CustomProductModal({ name, setName, price, setPrice, onCancel, onAdd }: any) {
  const priceNum = parseFloat(price);
  const isValid = name.trim().length > 0 && priceNum > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-300"
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
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-0.5">
                Venta rapida
              </p>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Producto personalizado
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Nombre del producto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Pan blanco, refresco suelto, golosina..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Precio <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && isValid) onAdd(); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 h-14 text-slate-900 text-2xl font-bold placeholder:text-slate-300 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Ideal para productos sin codigo de barras: golosinas sueltas, pan, productos a granel improvisados.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 font-bold h-12 px-6 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onAdd}
            disabled={!isValid}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white gap-2 font-bold h-12 px-6 rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
          >
            <Plus className="w-4 h-4" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB BUTTON - boton de navegacion entre tabs
// ============================================================================
function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-2 px-3 sm:px-4 h-9 rounded-xl font-bold text-xs sm:text-sm transition-all " +
        (active
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
          : "text-slate-300 hover:text-white hover:bg-white/5")
      }
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full " +
            (active ? "bg-white/25 text-white" : "bg-amber-500/20 text-amber-300")
          }
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// EMPTY STATE - cuando no hay clientes aun
// ============================================================================
function EmptyClientesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Users className="w-7 h-7 text-amber-400/60" />
      </div>
      <p className="text-white font-bold text-sm mb-1">Aun no tienes clientes</p>
      <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed mb-4">
        Registra a tus clientes conocidos para empezar a llevar tu libreta digital de fiado.
        Vas a saber quien debe, cuanto debe y cuando.
      </p>
      <Button
        onClick={onCreate}
        className="h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 gap-2 px-5 text-xs"
      >
        <Plus className="w-4 h-4" />
        Agregar mi primer cliente
      </Button>
    </div>
  );
}

// ============================================================================
// CUSTOMER CARD - tarjeta de cliente con saldo pendiente
// ============================================================================
function CustomerCard({ customer, delay }: { customer: any; delay: number }) {
  const hasDebt = Number(customer.pendingAmount) > 0;
  const phoneClean = (customer.phone || "").replace(/\D/g, "");
  const phoneForWA = phoneClean.length === 10 ? "52" + phoneClean : phoneClean;
  const whatsappText = "Hola " + customer.name + ", te recuerdo que tienes un saldo pendiente de $" + Number(customer.pendingAmount).toFixed(2) + ". Gracias!";
  const whatsappUrl = phoneClean ? "https://wa.me/" + phoneForWA + "?text=" + encodeURIComponent(whatsappText) : null;

  return (
    <div
      className="relative bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/10 hover:border-amber-500/30 rounded-2xl p-4 transition-all overflow-hidden animate-slide-up hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/10"
      style={{ animationDelay: delay + "ms", animationFillMode: "forwards", opacity: 0 }}
    >
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-amber-500 to-orange-500" />

      <div className="relative">
        {/* Header: avatar + nombre */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{customer.name}</p>
            {customer.phone && (
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Phone className="w-2.5 h-2.5" />
                {customer.phone}
              </p>
            )}
          </div>
        </div>

        {/* Saldo pendiente */}
        <div
          className={
            "rounded-xl p-3 mb-3 " +
            (hasDebt
              ? "bg-rose-500/10 border border-rose-500/30"
              : "bg-emerald-500/10 border border-emerald-500/30")
          }
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
            Saldo pendiente
          </p>
          <p
            className={
              "text-2xl font-bold tracking-tight " +
              (hasDebt ? "text-rose-300" : "text-emerald-300")
            }
          >
            ${Number(customer.pendingAmount).toFixed(2)}
          </p>
          {hasDebt && customer.activeDebtsCount > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {customer.activeDebtsCount} {customer.activeDebtsCount === 1 ? "deuda activa" : "deudas activas"}
            </p>
          )}
          {!hasDebt && (
            <p className="text-[10px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Sin deudas
            </p>
          )}
        </div>

        {/* Notas */}
        {customer.notes && (
          <p className="text-[11px] text-slate-400 italic mb-3 line-clamp-2">
            {customer.notes}
          </p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-1.5">
          {whatsappUrl && hasDebt && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 hover:border-green-500/50 text-green-300 hover:text-green-200 font-bold text-[11px] transition-all"
            >
              <MessageCircle className="w-3 h-3" />
              Recordar pago
            </a>
          )}
          {!whatsappUrl && hasDebt && (
            <span className="flex-1 text-center text-[10px] text-slate-500 italic h-9 flex items-center justify-center">
              Agrega telefono para WhatsApp
            </span>
          )}
          {!hasDebt && (
            <span className="flex-1 text-center text-[10px] text-slate-500 italic h-9 flex items-center justify-center">
              Cliente al corriente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL NUEVO CLIENTE - crear cliente para libreta de fiado
// ============================================================================
function CustomerFormModal({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  const createCustomer = trpc.abarrotes.fiado.customers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Cliente registrado: " + data.name);
      onSaved();
    },
    onError: (err: any) => {
      console.error("[CustomerFormModal] Error:", err);
      toast.error(err?.message || "No se pudo registrar el cliente");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (name.trim().length < 2) return toast.error("Nombre demasiado corto");
    createCustomer.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      creditLimit: creditLimit || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-300"
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
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-0.5">
                Libreta de fiado
              </p>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Nuevo cliente
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Dona Lupita, Don Pepe..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
            />
          </div>

          {/* Telefono */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Telefono <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(opcional, para WhatsApp)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                placeholder="5551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 h-12 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Limite de credito */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Limite de credito <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(opcional, $0 = sin limite)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 h-12 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Notas <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(opcional)</span>
            </label>
            <textarea
              placeholder="Ej. Paga los viernes, esposa de Juan, vive a una cuadra..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Tip educativo */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Solo registra clientes a los que ya les fias normalmente. Una vez creado podras registrar deudas y abonos.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createCustomer.isPending}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 font-bold h-12 px-6 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createCustomer.isPending || !name.trim()}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white gap-2 font-bold h-12 px-6 rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
          >
            {createCustomer.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar cliente
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FIADO CARD - tarjeta de deuda activa con cliente + saldo + boton abonar
// ============================================================================
function FiadoCard({ fiado, customer, delay, onAbonar }: {
  fiado: any;
  customer: any;
  delay: number;
  onAbonar: () => void;
}) {
  const total = Number(fiado.totalAmount);
  const paid = Number(fiado.paidAmount);
  const remaining = total - paid;
  const progress = total > 0 ? (paid / total) * 100 : 0;
  const isPartial = fiado.status === "partial";

  // Fecha formateada
  const createdDate = fiado.createdAt ? new Date(fiado.createdAt) : null;
  const daysAgo = createdDate
    ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const dateLabel = daysAgo === 0
    ? "Hoy"
    : daysAgo === 1
    ? "Ayer"
    : "Hace " + daysAgo + " dias";

  // WhatsApp
  const phoneClean = (customer?.phone || "").replace(/\D/g, "");
  const phoneForWA = phoneClean.length === 10 ? "52" + phoneClean : phoneClean;
  const whatsappText = customer
    ? "Hola " + customer.name + ", te recuerdo que tienes un saldo pendiente de $" +
      remaining.toFixed(2) + (fiado.description ? " (" + fiado.description + ")" : "") +
      ". Gracias!"
    : "";
  const whatsappUrl = phoneClean
    ? "https://wa.me/" + phoneForWA + "?text=" + encodeURIComponent(whatsappText)
    : null;

  return (
    <div
      className="relative bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/10 hover:border-rose-500/30 rounded-2xl p-4 transition-all overflow-hidden animate-slide-up"
      style={{ animationDelay: delay + "ms", animationFillMode: "forwards", opacity: 0 }}
    >
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-15 bg-gradient-to-br from-rose-500 to-pink-500" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Info principal */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-500/30 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-rose-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-bold text-white text-sm truncate">
                {customer?.name || "Cliente eliminado"}
              </p>
              {isPartial && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded">
                  Abonando
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {fiado.description || "Venta a fiado"}
            </p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {dateLabel}
              </span>
              {customer?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Montos */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Resta pagar
          </p>
          <p className="text-2xl font-bold text-rose-300 tracking-tight">
            ${remaining.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500">
            de ${total.toFixed(2)} {paid > 0 && "(abonado $" + paid.toFixed(2) + ")"}
          </p>
        </div>
      </div>

      {/* Barra de progreso si hay abonos parciales */}
      {paid > 0 && (
        <div className="mt-3 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: progress + "%" }}
          />
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
        <Button
          onClick={onAbonar}
          className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 gap-1.5 text-xs"
        >
          <ArrowDownCircle className="w-3.5 h-3.5" />
          Registrar abono
        </Button>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 hover:border-green-500/50 text-green-300 hover:text-green-200 font-bold text-xs transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recordar</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL ABONO - registrar pago parcial de un fiado
// ============================================================================
function AbonoModal({ fiado, customer, onCancel, onSaved }: {
  fiado: any;
  customer: any;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const total = Number(fiado.totalAmount);
  const paid = Number(fiado.paidAmount);
  const remaining = total - paid;

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [notes, setNotes] = useState("");

  const createAbono = trpc.abarrotes.fiado.abonos.create.useMutation({
    onSuccess: (data: any) => {
      const newStatus = data.status === "paid" ? "¡Deuda saldada por completo!" : "Abono registrado";
      toast.success(newStatus);
      onSaved();
    },
    onError: (err: any) => {
      console.error("[AbonoModal] Error:", err);
      toast.error(err?.message || "No se pudo registrar el abono");
    },
  });

  const amountNum = parseFloat(amount);
  const isValid = amountNum > 0 && amountNum <= remaining;
  const exceedsRemaining = amount && amountNum > remaining;
  const newRemaining = isValid ? remaining - amountNum : remaining;
  const wouldFinish = isValid && newRemaining === 0;

  const handleSubmit = () => {
    if (!isValid) {
      if (exceedsRemaining) return toast.error("El abono excede el saldo");
      return toast.error("Ingresa un monto valido");
    }
    createAbono.mutate({
      fiadoId: fiado.id,
      amount: amountNum.toFixed(2),
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  // Botones rapidos
  const half = (remaining / 2).toFixed(2);
  const quickAmounts = [
    { label: "$50", value: "50.00" },
    { label: "$100", value: "100.00" },
    { label: "Mitad", value: half },
    { label: "Liquidar", value: remaining.toFixed(2) },
  ];

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
        <div className="relative bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 pt-6 pb-5 border-b border-slate-100 rounded-t-3xl">
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <ArrowDownCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-0.5">
                Abono
              </p>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Registrar pago
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Resumen del fiado */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1">
            <p className="text-xs text-slate-600">
              <span className="font-bold text-slate-900">{customer?.name || "Cliente"}</span>
              {fiado.description && " · " + fiado.description}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600">Saldo pendiente</span>
              <span className="text-xl font-bold text-rose-600">
                ${remaining.toFixed(2)}
              </span>
            </div>
            {paid > 0 && (
              <p className="text-[10px] text-slate-500">
                Ya abonado: ${paid.toFixed(2)} de ${total.toFixed(2)}
              </p>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
              Monto del abono <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={remaining}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 h-14 text-slate-900 text-2xl font-bold placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Botones rapidos */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((qa, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAmount(qa.value)}
                disabled={parseFloat(qa.value) > remaining || parseFloat(qa.value) <= 0}
                className="h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Resultado preview */}
          {isValid && (
            <div
              className={
                "rounded-2xl p-4 animate-scale-in border " +
                (wouldFinish
                  ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"
                  : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200")
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={"w-5 h-5 " + (wouldFinish ? "text-emerald-600" : "text-amber-600")}
                  />
                  <span
                    className={"font-bold text-sm " + (wouldFinish ? "text-emerald-700" : "text-amber-700")}
                  >
                    {wouldFinish ? "Liquidacion total" : "Saldo nuevo"}
                  </span>
                </div>
                <span
                  className={"text-2xl font-bold " + (wouldFinish ? "text-emerald-700" : "text-amber-700")}
                >
                  ${newRemaining.toFixed(2)}
                </span>
              </div>
              {wouldFinish && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  ✨ Esta deuda quedara saldada
                </p>
              )}
            </div>
          )}

          {/* Error si excede */}
          {exceedsRemaining && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 animate-scale-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-rose-700 font-bold">Monto demasiado alto</p>
                <p className="text-[11px] text-rose-600">
                  El maximo a abonar es ${remaining.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Metodo de pago del abono */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
              Como pago el cliente
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={
                  "flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold transition-all text-xs " +
                  (paymentMethod === "cash"
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <Banknote className="w-3.5 h-3.5" />
                Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod("transfer")}
                className={
                  "flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold transition-all text-xs " +
                  (paymentMethod === "transfer"
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                Transfer.
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={
                  "flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold transition-all text-xs " +
                  (paymentMethod === "card"
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100")
                }
              >
                <CreditCard className="w-3.5 h-3.5" />
                Tarjeta
              </button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Notas <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Pago parcial, prometio el viernes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createAbono.isPending}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 font-bold h-12 px-6 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createAbono.isPending || !isValid}
            className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 hover:from-emerald-600 hover:via-cyan-600 hover:to-emerald-600 text-white gap-2 font-bold h-12 px-6 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
          >
            {createAbono.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <ArrowDownCircle className="w-4 h-4" />
                Registrar abono
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOW STOCK CARD - tarjeta de producto con stock bajo
// ============================================================================
function LowStockCard({ product, delay, isCritical }: {
  product: any;
  delay: number;
  isCritical: boolean;
}) {
  const stock = product.computedStock;
  const price = typeof product.basePrice === "string"
    ? parseFloat(product.basePrice)
    : (product.basePrice as number);

  return (
    <div
      className={
        "relative backdrop-blur-md border rounded-2xl p-4 transition-all overflow-hidden animate-slide-up hover:-translate-y-0.5 " +
        (isCritical
          ? "bg-rose-500/[0.08] border-rose-500/30 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/10"
          : "bg-orange-500/[0.05] border-orange-500/25 hover:border-orange-500/45 hover:shadow-lg hover:shadow-orange-500/10")
      }
      style={{ animationDelay: delay + "ms", animationFillMode: "forwards", opacity: 0 }}
    >
      <div
        className={
          "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-15 " +
          (isCritical ? "bg-rose-500" : "bg-orange-500")
        }
      />

      <div className="relative">
        {/* Header: icono + status */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 " +
              (isCritical
                ? "bg-rose-500/20 border border-rose-500/40"
                : "bg-orange-500/20 border border-orange-500/40")
            }
          >
            <Package className={"w-5 h-5 " + (isCritical ? "text-rose-300" : "text-orange-300")} />
          </div>
          <span
            className={
              "inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border " +
              (isCritical
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                : "bg-orange-500/20 border-orange-500/40 text-orange-300")
            }
          >
            {isCritical && <AlertCircle className="w-2.5 h-2.5" />}
            {isCritical ? "Critico" : "Bajo"}
          </span>
        </div>

        {/* Nombre */}
        <p className="font-bold text-white text-sm truncate mb-0.5">{product.name}</p>
        {product.sku && (
          <p className="text-[10px] text-slate-500 font-mono mb-2 truncate">{product.sku}</p>
        )}

        {/* Stock info destacado */}
        <div
          className={
            "rounded-xl p-3 mt-2 " +
            (isCritical
              ? "bg-rose-500/10 border border-rose-500/30"
              : "bg-orange-500/10 border border-orange-500/30")
          }
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-0.5">
            Quedan
          </p>
          <p
            className={
              "text-2xl font-bold tracking-tight " +
              (isCritical ? "text-rose-300" : "text-orange-300")
            }
          >
            {stock} <span className="text-xs font-medium text-slate-400">unidades</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Precio: ${price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
