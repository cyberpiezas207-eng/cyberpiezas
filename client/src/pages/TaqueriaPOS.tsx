// >>> ESTE ARCHIVO VA EN: client/src/pages/TaqueriaPOS.tsx <<<
// =============================================================================
// TaqueriaPOS - Punto de venta para taquerias (PASO 1)
// -----------------------------------------------------------------------------
// Pensado para HORA PICO: botones grandes, pocos toques, modificadores rapidos.
// Conectado al backend que YA existe (taqueriaRouter): categorias, productos
// y grupos de modificadores. El COBRO real (guardar la venta) se conecta en
// el PASO 2, cuando exista la tabla de ordenes.
//
// Responsive:
//   - Desktop/Tablet: catalogo a la izquierda + carrito fijo a la derecha
//   - Mobile: catalogo a pantalla completa + barra inferior con total y boton
//             que abre el carrito en hoja deslizante
//
// Paleta calida (rojo/naranja taqueria) con alto contraste.
// Comentarios SIN ACENTOS por convencion del proyecto.
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ShoppingCart,
  Store,
  Bike,
  X,
  Check,
  UtensilsCrossed,
  Banknote,
  CreditCard,
  Landmark,
  SlidersHorizontal,
  Receipt,
  Settings,
  Printer,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Tipos locales
// -----------------------------------------------------------------------------

type ServiceMode = "aqui" | "llevar";

interface SelectedOption {
  optionId: number;
  name: string;
  priceDelta: number;
}

interface CartLine {
  lineId: string; // id unico local de la linea
  productId: number;
  name: string;
  basePrice: number;
  quantity: number;
  options: SelectedOption[];
  unitPrice: number; // basePrice + suma de priceDelta
  lineTotal: number; // unitPrice * quantity
}

const PESO = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// -----------------------------------------------------------------------------
// Config de impresion (guardada en el navegador, no en base de datos)
// -----------------------------------------------------------------------------

interface PrintConfig {
  businessName: string;
  printTicket: boolean;
  printComanda: boolean;
}

const PRINT_CONFIG_KEY = "taqueria_print_config";

const DEFAULT_PRINT_CONFIG: PrintConfig = {
  businessName: "Mi Taqueria",
  printTicket: true,
  printComanda: true,
};

function loadPrintConfig(): PrintConfig {
  try {
    const raw = localStorage.getItem(PRINT_CONFIG_KEY);
    if (!raw) return DEFAULT_PRINT_CONFIG;
    return { ...DEFAULT_PRINT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

function savePrintConfig(cfg: PrintConfig) {
  try {
    localStorage.setItem(PRINT_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignorar si el navegador bloquea storage
  }
}

// Escapa texto para insertarlo en HTML de impresion
function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Datos que necesita la impresion
interface PrintData {
  businessName: string;
  folio: number;
  serviceMode: ServiceMode;
  paymentMethod: string;
  items: CartLine[];
  total: number;
}

// Genera el HTML de ticket + comanda y manda a imprimir en una ventana nueva.
// Formato pensado para papel termico angosto (58/80mm).
function printOrder(data: PrintData, cfg: PrintConfig) {
  const wantTicket = cfg.printTicket;
  const wantComanda = cfg.printComanda;
  if (!wantTicket && !wantComanda) return;

  const fecha = new Date().toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const modoTxt = data.serviceMode === "aqui" ? "PARA AQUI" : "PARA LLEVAR";
  const pagoTxt =
    data.paymentMethod === "efectivo" ? "Efectivo" :
    data.paymentMethod === "tarjeta" ? "Tarjeta" : "Transferencia";

  // --- Ticket del cliente (con precios) ---
  const ticketItems = data.items
    .map((l) => {
      const mods = l.options.length > 0
        ? `<div class="mods">${esc(l.options.map((o) => o.name).join(", "))}</div>`
        : "";
      return `
        <div class="row">
          <span class="qty">${l.quantity}x</span>
          <span class="name">${esc(l.name)}${mods}</span>
          <span class="price">${PESO(l.lineTotal)}</span>
        </div>`;
    })
    .join("");

  const ticketHtml = wantTicket ? `
    <div class="doc">
      <div class="center title">${esc(data.businessName)}</div>
      <div class="center small">${fecha}</div>
      <div class="center folio">Orden #${data.folio}</div>
      <div class="center small">${modoTxt}</div>
      <div class="sep"></div>
      ${ticketItems}
      <div class="sep"></div>
      <div class="row total">
        <span class="name">TOTAL</span>
        <span class="price">${PESO(data.total)}</span>
      </div>
      <div class="center small">Pago: ${pagoTxt}</div>
      <div class="sep"></div>
      <div class="center small">Gracias por su compra!</div>
    </div>` : "";

  // --- Comanda de cocina (sin precios) ---
  const comandaItems = data.items
    .map((l) => {
      const mods = l.options.length > 0
        ? `<div class="mods big">${esc(l.options.map((o) => o.name).join(", "))}</div>`
        : "";
      return `
        <div class="crow">
          <span class="cqty">${l.quantity}</span>
          <span class="cname">${esc(l.name)}${mods}</span>
        </div>`;
    })
    .join("");

  const comandaHtml = wantComanda ? `
    <div class="doc comanda ${wantTicket ? "pagebreak" : ""}">
      <div class="center folio big">#${data.folio}</div>
      <div class="center modo">${modoTxt}</div>
      <div class="center small">${fecha}</div>
      <div class="sep"></div>
      ${comandaItems}
      <div class="sep"></div>
      <div class="center small">COCINA</div>
    </div>` : "";

  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) {
    toast.error("El navegador bloqueo la impresion. Permite ventanas emergentes.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Orden ${data.folio}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; padding: 8px; }
        .doc { width: 100%; max-width: 280px; margin: 0 auto 16px; }
        .pagebreak { page-break-before: always; }
        .center { text-align: center; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .small { font-size: 11px; }
        .folio { font-size: 20px; font-weight: bold; margin: 6px 0; }
        .folio.big { font-size: 40px; }
        .modo { font-size: 16px; font-weight: bold; margin: 4px 0; }
        .sep { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; align-items: flex-start; margin: 4px 0; }
        .row .qty { width: 32px; font-weight: bold; }
        .row .name { flex: 1; }
        .row .price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .row.total { font-size: 16px; font-weight: bold; }
        .mods { font-size: 11px; color: #333; }
        .crow { display: flex; align-items: flex-start; margin: 8px 0; }
        .crow .cqty { width: 36px; font-size: 22px; font-weight: bold; }
        .crow .cname { flex: 1; font-size: 18px; font-weight: bold; padding-top: 2px; }
        .mods.big { font-size: 14px; font-weight: normal; color: #000; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${ticketHtml}
      ${comandaHtml}
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 300);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

export default function TaqueriaPOS() {
  const [, setLocation] = useLocation();

  const accessQuery = trpc.taqueria.hasAccess.useQuery();
  const categoriasQuery = trpc.taqueria.categorias.list.useQuery(undefined, {
    enabled: accessQuery.data?.hasAccess === true,
  });
  const productosQuery = trpc.taqueria.productos.list.useQuery(undefined, {
    enabled: accessQuery.data?.hasAccess === true,
  });

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("aqui");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [modalProduct, setModalProduct] = useState<{ id: number; name: string; price: number } | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(() => loadPrintConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Productos filtrados por categoria
  // ---------------------------------------------------------------------------
  const productos = productosQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];

  const displayedProducts = useMemo(() => {
    if (selectedCategory === null) return productos;
    return productos.filter((p: any) => p.categoryId === selectedCategory);
  }, [productos, selectedCategory]);

  // ---------------------------------------------------------------------------
  // Totales
  // ---------------------------------------------------------------------------
  const total = useMemo(() => cart.reduce((sum, l) => sum + l.lineTotal, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);

  // ---------------------------------------------------------------------------
  // Acciones de carrito
  // ---------------------------------------------------------------------------
  const addLineToCart = (line: CartLine) => {
    setCart((prev) => [...prev, line]);
    toast.success(`${line.name} agregado`);
  };

  const changeQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.lineId !== lineId) return l;
          const q = l.quantity + delta;
          if (q <= 0) return null;
          return { ...l, quantity: q, lineTotal: l.unitPrice * q };
        })
        .filter((l): l is CartLine => l !== null),
    );
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const clearCart = () => setCart([]);

  // ---------------------------------------------------------------------------
  // Cobro: guarda la orden en el backend
  // ---------------------------------------------------------------------------
  const [lastOrder, setLastOrder] = useState<{ folio: number; total: string } | null>(null);
  // Snapshot del carrito al momento de cobrar, para imprimir despues de guardar
  const printSnapshotRef = useRef<{ items: CartLine[]; serviceMode: ServiceMode; paymentMethod: string } | null>(null);

  const createOrderMut = trpc.taqueria.orders.create.useMutation({
    onSuccess: (data) => {
      setLastOrder({ folio: data.folio, total: data.total });
      const snap = printSnapshotRef.current;
      if (snap) {
        printOrder(
          {
            businessName: printConfig.businessName,
            folio: data.folio,
            serviceMode: snap.serviceMode,
            paymentMethod: snap.paymentMethod,
            items: snap.items,
            total: parseFloat(data.total),
          },
          printConfig,
        );
        printSnapshotRef.current = null;
      }
      setCart([]);
      setMobileCartOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCobrar = (paymentMethod: "efectivo" | "tarjeta" | "transferencia") => {
    if (cart.length === 0) return;
    // Guardar snapshot del carrito antes de que se limpie al exito
    printSnapshotRef.current = { items: [...cart], serviceMode, paymentMethod };
    createOrderMut.mutate({
      serviceMode,
      paymentMethod,
      items: cart.map((l) => ({
        productId: l.productId,
        productName: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        lineTotal: l.lineTotal.toFixed(2),
        modifiers: l.options.length > 0 ? l.options.map((o) => o.name).join(", ") : undefined,
      })),
    });
  };

  // ---------------------------------------------------------------------------
  // Al tocar un producto: si tiene modificadores abre modal, si no, directo
  // ---------------------------------------------------------------------------
  const handleProductTap = (product: any) => {
    setModalProduct({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price ?? "0"),
    });
  };

  // ---------------------------------------------------------------------------
  // Pantallas de carga / acceso
  // ---------------------------------------------------------------------------
  if (accessQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm">Cargando taqueria...</p>
        </div>
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-stone-200">
          <div className="text-5xl mb-4">🌮</div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">POS de Taqueria</h1>
          <p className="text-sm text-stone-500 mb-6">
            Necesitas una suscripcion activa para usar el punto de venta de taqueria.
          </p>
          <button
            onClick={() => setLocation("/pricing?posCode=taqueria")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 font-bold transition-colors mb-2"
          >
            Ver planes
          </button>
          <button
            onClick={() => setLocation("/sistemas")}
            className="w-full text-stone-500 hover:text-stone-700 rounded-full h-11 font-medium transition-colors text-sm"
          >
            Regresar
          </button>
        </div>
      </div>
    );
  }

  const noMenu = !categoriasQuery.isLoading && categorias.length === 0 && productos.length === 0;

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------
  return (
    <div className="taq-pos min-h-screen bg-stone-100 text-stone-900">
      <style>{TAQ_STYLES}</style>

      {/* HEADER */}
      <header className="taq-header">
        <button onClick={() => setLocation("/sistemas")} className="taq-back" aria-label="Regresar">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Inicio</span>
        </button>
        <div className="taq-title">
          <span className="taq-title-emoji">🌮</span>
          <span className="taq-title-text">Taqueria</span>
        </div>
        {/* Accesos rapidos */}
        <div className="taq-nav">
          <button className="taq-nav-btn" onClick={() => setLocation("/taqueria-menu")} title="Menu">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden md:inline">Menu</span>
          </button>
          <button className="taq-nav-btn" onClick={() => setLocation("/taqueria-historial")} title="Historial">
            <Receipt className="w-4 h-4" />
            <span className="hidden md:inline">Historial</span>
          </button>
          <button className="taq-nav-btn" onClick={() => setShowConfig(true)} title="Configuracion de impresion">
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Config</span>
          </button>
        </div>
        {/* Toggle Para aqui / Para llevar */}
        <div className="taq-mode">
          <button
            className={`taq-mode-btn ${serviceMode === "aqui" ? "is-active" : ""}`}
            onClick={() => setServiceMode("aqui")}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Aqui</span>
          </button>
          <button
            className={`taq-mode-btn ${serviceMode === "llevar" ? "is-active" : ""}`}
            onClick={() => setServiceMode("llevar")}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Llevar</span>
          </button>
        </div>
      </header>

      <div className="taq-layout">
        {/* ===================== CATALOGO ===================== */}
        <main className="taq-catalog">
          {/* Filtros de categoria */}
          {categorias.length > 0 && (
            <div className="taq-cats">
              <button
                className={`taq-cat ${selectedCategory === null ? "is-active" : ""}`}
                onClick={() => setSelectedCategory(null)}
              >
                Todo
              </button>
              {categorias.map((c: any) => (
                <button
                  key={c.id}
                  className={`taq-cat ${selectedCategory === c.id ? "is-active" : ""}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.icon ? <span className="taq-cat-icon">{c.icon}</span> : null}
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Grid de productos (botones grandes) */}
          <div className="taq-products-scroll">
            {productosQuery.isLoading ? (
              <div className="taq-empty">
                <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
                <p>Cargando menu...</p>
              </div>
            ) : noMenu ? (
              <div className="taq-empty">
                <UtensilsCrossed className="w-10 h-10 opacity-30" />
                <p className="font-semibold">Aun no tienes menu</p>
                <p className="text-sm text-stone-500">
                  Agrega categorias y productos para empezar a vender.
                </p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="taq-empty">
                <UtensilsCrossed className="w-10 h-10 opacity-30" />
                <p>No hay productos en esta categoria.</p>
              </div>
            ) : (
              <div className="taq-grid">
                {displayedProducts.map((p: any) => (
                  <button key={p.id} className="taq-card" onClick={() => handleProductTap(p)}>
                    <span className="taq-card-name">{p.name}</span>
                    <span className="taq-card-price">{PESO(parseFloat(p.price ?? "0"))}</span>
                    <span className="taq-card-add">
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ===================== CARRITO (desktop/tablet) ===================== */}
        <aside className="taq-cart">
          <CartPanel
            cart={cart}
            total={total}
            itemCount={itemCount}
            serviceMode={serviceMode}
            onChangeQty={changeQty}
            onRemove={removeLine}
            onClear={clearCart}
            onCobrar={handleCobrar}
            cobrando={createOrderMut.isPending}
          />
        </aside>
      </div>

      {/* ===================== BARRA MOVIL ===================== */}
      <div className="taq-mobilebar">
        <div className="taq-mobilebar-info">
          <span className="taq-mobilebar-count">{itemCount} art.</span>
          <span className="taq-mobilebar-total">{PESO(total)}</span>
        </div>
        <button
          className="taq-mobilebar-btn"
          onClick={() => setMobileCartOpen(true)}
          disabled={cart.length === 0}
        >
          <ShoppingCart className="w-4 h-4" />
          Ver pedido
        </button>
      </div>

      {/* Hoja de carrito en movil */}
      <div className={`taq-sheet-backdrop ${mobileCartOpen ? "is-open" : ""}`} onClick={() => setMobileCartOpen(false)} />
      <div className={`taq-sheet ${mobileCartOpen ? "is-open" : ""}`}>
        <div className="taq-sheet-head">
          <span className="taq-sheet-title">Tu pedido</span>
          <button onClick={() => setMobileCartOpen(false)} className="taq-icon-btn" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <CartPanel
          cart={cart}
          total={total}
          itemCount={itemCount}
          serviceMode={serviceMode}
          onChangeQty={changeQty}
          onRemove={removeLine}
          onClear={clearCart}
          onCobrar={handleCobrar}
          cobrando={createOrderMut.isPending}
        />
      </div>

      {/* ===================== MODAL DE MODIFICADORES ===================== */}
      {modalProduct && (
        <ModifierModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={(line) => {
            addLineToCart(line);
            setModalProduct(null);
          }}
        />
      )}

      {/* ===================== MODAL VENTA EXITOSA (FOLIO) ===================== */}
      {lastOrder && (
        <div className="taq-success-backdrop" onClick={() => setLastOrder(null)}>
          <div className="taq-success" onClick={(e) => e.stopPropagation()}>
            <div className="taq-success-check">
              <Check className="w-9 h-9" />
            </div>
            <p className="taq-success-label">Orden cobrada</p>
            <p className="taq-success-folio">#{lastOrder.folio}</p>
            <p className="taq-success-total">{PESO(parseFloat(lastOrder.total))}</p>
            <button className="taq-success-btn" onClick={() => setLastOrder(null)}>
              Nueva orden
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODAL CONFIG DE IMPRESION ===================== */}
      {showConfig && (
        <ConfigModal
          config={printConfig}
          onClose={() => setShowConfig(false)}
          onSave={(cfg) => {
            setPrintConfig(cfg);
            savePrintConfig(cfg);
            setShowConfig(false);
            toast.success("Configuracion guardada");
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// ConfigModal - configuracion de impresion (nombre negocio + que imprimir)
// =============================================================================

function ConfigModal({
  config,
  onClose,
  onSave,
}: {
  config: PrintConfig;
  onClose: () => void;
  onSave: (cfg: PrintConfig) => void;
}) {
  const [name, setName] = useState(config.businessName);
  const [ticket, setTicket] = useState(config.printTicket);
  const [comanda, setComanda] = useState(config.printComanda);

  return (
    <div className="taq-modal-backdrop" onClick={onClose}>
      <div className="taq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="taq-modal-head">
          <div>
            <h3 className="taq-modal-title">Impresion</h3>
            <p className="taq-modal-price" style={{ color: "var(--taq-muted)" }}>Se guarda en este dispositivo</p>
          </div>
          <button onClick={onClose} className="taq-icon-btn" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="taq-modal-body">
          <label className="taq-cfg-label">Nombre del negocio</label>
          <input
            className="taq-cfg-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi Taqueria"
            maxLength={60}
          />
          <p className="taq-cfg-hint">Aparece en la parte de arriba del ticket del cliente.</p>

          <label className="taq-cfg-label" style={{ marginTop: 18 }}>Que imprimir al cobrar</label>

          <button className={`taq-cfg-toggle ${ticket ? "is-on" : ""}`} onClick={() => setTicket((v) => !v)}>
            <Receipt className="w-5 h-5" />
            <div className="taq-cfg-toggle-text">
              <span className="taq-cfg-toggle-title">Ticket del cliente</span>
              <span className="taq-cfg-toggle-sub">Con precios y total</span>
            </div>
            <span className={`taq-cfg-switch ${ticket ? "is-on" : ""}`} />
          </button>

          <button className={`taq-cfg-toggle ${comanda ? "is-on" : ""}`} onClick={() => setComanda((v) => !v)}>
            <Printer className="w-5 h-5" />
            <div className="taq-cfg-toggle-text">
              <span className="taq-cfg-toggle-title">Comanda de cocina</span>
              <span className="taq-cfg-toggle-sub">Productos grandes, sin precios</span>
            </div>
            <span className={`taq-cfg-switch ${comanda ? "is-on" : ""}`} />
          </button>
        </div>

        <div className="taq-modal-foot">
          <button className="taq-modal-add" onClick={() => onSave({ businessName: name.trim() || "Mi Taqueria", printTicket: ticket, printComanda: comanda })}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CartPanel - panel del carrito (reusado en desktop y en hoja movil)
// =============================================================================

function CartPanel({
  cart,
  total,
  itemCount,
  serviceMode,
  onChangeQty,
  onRemove,
  onClear,
  onCobrar,
  cobrando,
}: {
  cart: CartLine[];
  total: number;
  itemCount: number;
  serviceMode: ServiceMode;
  onChangeQty: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCobrar: (paymentMethod: "efectivo" | "tarjeta" | "transferencia") => void;
  cobrando: boolean;
}) {
  const [payMethod, setPayMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  return (
    <div className="taq-cartpanel">
      <div className="taq-cart-head">
        <div className="taq-cart-head-left">
          <ShoppingBag className="w-4 h-4 text-orange-500" />
          <span>Pedido</span>
          <span className="taq-cart-badge">
            {serviceMode === "aqui" ? "Para aqui" : "Para llevar"}
          </span>
        </div>
        {cart.length > 0 && (
          <button className="taq-cart-clear" onClick={onClear}>
            Vaciar
          </button>
        )}
      </div>

      <div className="taq-cart-items">
        {cart.length === 0 ? (
          <div className="taq-cart-empty">
            <ShoppingCart className="w-9 h-9 opacity-25" />
            <p>El pedido esta vacio</p>
            <p className="taq-cart-empty-hint">Toca un producto para empezar</p>
          </div>
        ) : (
          cart.map((line) => (
            <div key={line.lineId} className="taq-line">
              <div className="taq-line-main">
                <p className="taq-line-name">{line.name}</p>
                {line.options.length > 0 && (
                  <p className="taq-line-opts">{line.options.map((o) => o.name).join(", ")}</p>
                )}
                <p className="taq-line-price">
                  {line.quantity} x {PESO(line.unitPrice)}
                </p>
              </div>
              <div className="taq-line-right">
                <span className="taq-line-total">{PESO(line.lineTotal)}</span>
                <div className="taq-qty">
                  <button onClick={() => onChangeQty(line.lineId, -1)} aria-label="Menos">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => onChangeQty(line.lineId, 1)} aria-label="Mas">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button className="taq-line-del" onClick={() => onRemove(line.lineId)} aria-label="Quitar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="taq-cart-foot">
        <div className="taq-pay-methods">
          <button
            className={`taq-pay-btn ${payMethod === "efectivo" ? "is-active" : ""}`}
            onClick={() => setPayMethod("efectivo")}
          >
            <Banknote className="w-4 h-4" />
            Efectivo
          </button>
          <button
            className={`taq-pay-btn ${payMethod === "tarjeta" ? "is-active" : ""}`}
            onClick={() => setPayMethod("tarjeta")}
          >
            <CreditCard className="w-4 h-4" />
            Tarjeta
          </button>
          <button
            className={`taq-pay-btn ${payMethod === "transferencia" ? "is-active" : ""}`}
            onClick={() => setPayMethod("transferencia")}
          >
            <Landmark className="w-4 h-4" />
            Transfer
          </button>
        </div>
        <div className="taq-cart-total-row">
          <span>Total</span>
          <span className="taq-cart-total">{PESO(total)}</span>
        </div>
        <button
          className="taq-cobrar"
          disabled={cart.length === 0 || cobrando}
          onClick={() => onCobrar(payMethod)}
        >
          {cobrando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Cobrar {cart.length > 0 ? PESO(total) : ""}</>
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ModifierModal - elige modificadores de un producto
// Carga los grupos via trpc.taqueria.productos.getModifierGroups
// =============================================================================

function ModifierModal({
  product,
  onClose,
  onConfirm,
}: {
  product: { id: number; name: string; price: number };
  onClose: () => void;
  onConfirm: (line: CartLine) => void;
}) {
  const groupsQuery = trpc.taqueria.productos.getModifierGroups.useQuery({
    productId: product.id,
  });

  const [quantity, setQuantity] = useState(1);
  // selecciones: groupId -> set de optionId
  const [selections, setSelections] = useState<Record<number, number[]>>({});

  const groups = groupsQuery.data ?? [];

  const toggleOption = (group: any, optionId: number) => {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selectionType === "single") {
        return { ...prev, [group.id]: [optionId] };
      }
      // multiple
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= (group.maxSelections ?? 99)) {
        toast.error(`Maximo ${group.maxSelections} en ${group.name}`);
        return prev;
      }
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  // Reune opciones seleccionadas con su info
  const selectedOptions: SelectedOption[] = useMemo(() => {
    const out: SelectedOption[] = [];
    for (const g of groups) {
      const chosen = selections[g.id] ?? [];
      for (const opt of g.options ?? []) {
        if (chosen.includes(opt.id)) {
          out.push({
            optionId: opt.id,
            name: opt.name,
            priceDelta: parseFloat(opt.priceDelta ?? "0"),
          });
        }
      }
    }
    return out;
  }, [groups, selections]);

  const unitPrice = useMemo(
    () => product.price + selectedOptions.reduce((s, o) => s + o.priceDelta, 0),
    [product.price, selectedOptions],
  );

  // Valida requeridos
  const missingRequired = useMemo(() => {
    return groups.some((g: any) => {
      if (!g.isRequired) return false;
      const chosen = selections[g.id] ?? [];
      return chosen.length < Math.max(1, g.minSelections ?? 1);
    });
  }, [groups, selections]);

  const confirm = () => {
    if (missingRequired) {
      toast.error("Faltan opciones obligatorias");
      return;
    }
    const line: CartLine = {
      lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      basePrice: product.price,
      quantity,
      options: selectedOptions,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
    onConfirm(line);
  };

  return (
    <div className="taq-modal-backdrop" onClick={onClose}>
      <div className="taq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="taq-modal-head">
          <div>
            <h3 className="taq-modal-title">{product.name}</h3>
            <p className="taq-modal-price">{PESO(product.price)}</p>
          </div>
          <button onClick={onClose} className="taq-icon-btn" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="taq-modal-body">
          {groupsQuery.isLoading ? (
            <div className="taq-empty">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : groups.length === 0 ? (
            <p className="taq-modal-nogroups">Este producto no tiene opciones. Solo elige la cantidad.</p>
          ) : (
            groups.map((g: any) => (
              <div key={g.id} className="taq-group">
                <div className="taq-group-head">
                  <span className="taq-group-name">
                    {g.icon ? <span>{g.icon} </span> : null}
                    {g.name}
                  </span>
                  {g.isRequired ? (
                    <span className="taq-group-req">Obligatorio</span>
                  ) : (
                    <span className="taq-group-opt">Opcional</span>
                  )}
                </div>
                <div className="taq-options">
                  {(g.options ?? []).map((opt: any) => {
                    const chosen = (selections[g.id] ?? []).includes(opt.id);
                    const delta = parseFloat(opt.priceDelta ?? "0");
                    return (
                      <button
                        key={opt.id}
                        className={`taq-option ${chosen ? "is-active" : ""}`}
                        onClick={() => toggleOption(g, opt.id)}
                      >
                        {chosen && <Check className="w-3.5 h-3.5 taq-option-check" />}
                        <span>{opt.name}</span>
                        {delta !== 0 && (
                          <span className="taq-option-delta">
                            {delta > 0 ? "+" : ""}
                            {PESO(delta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="taq-modal-foot">
          <div className="taq-modal-qty">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Menos">
              <Minus className="w-4 h-4" />
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} aria-label="Mas">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button className="taq-modal-add" onClick={confirm}>
            Agregar {PESO(unitPrice * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ESTILOS
// =============================================================================

const TAQ_STYLES = `
.taq-pos {
  --taq-primary: #E8590C;
  --taq-primary-dark: #C2410C;
  --taq-primary-soft: #FFF1E6;
  --taq-surface: #FFFFFF;
  --taq-bg: #F5F1EC;
  --taq-text: #1C1917;
  --taq-muted: #78716C;
  --taq-border: rgba(0,0,0,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--taq-bg);
}
.taq-header {
  position: sticky; top: 0; z-index: 30;
  background: var(--taq-surface);
  border-bottom: 1px solid var(--taq-border);
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
}
.taq-back {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  color: var(--taq-muted); font-size: 14px; font-weight: 500;
  padding: 6px 8px; border-radius: 8px;
}
.taq-back:hover { background: var(--taq-bg); color: var(--taq-text); }
.taq-title { display: flex; align-items: center; gap: 8px; flex: 1; }
.taq-title-emoji { font-size: 22px; }
.taq-title-text {
  font-size: 19px; font-weight: 700; color: var(--taq-text);
  font-family: Georgia, "Times New Roman", serif;
}
.taq-nav { display: flex; gap: 6px; }
.taq-nav-btn {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--taq-border); background: var(--taq-surface);
  cursor: pointer; padding: 8px 12px; border-radius: 10px;
  font-size: 13px; font-weight: 600; color: var(--taq-muted);
  transition: all 0.15s ease;
}
.taq-nav-btn:hover { border-color: var(--taq-primary); color: var(--taq-primary); background: var(--taq-primary-soft); }

.taq-mode {
  display: flex; gap: 4px; background: var(--taq-bg);
  border-radius: 12px; padding: 4px;
}
.taq-mode-btn {
  display: flex; align-items: center; gap: 5px;
  border: none; background: none; cursor: pointer;
  padding: 7px 12px; border-radius: 9px;
  font-size: 13px; font-weight: 600; color: var(--taq-muted);
  transition: all 0.15s ease;
}
.taq-mode-btn.is-active {
  background: var(--taq-primary); color: white;
  box-shadow: 0 2px 8px rgba(232,89,12,0.3);
}

.taq-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 360px;
  height: calc(100vh - 57px);
}
.taq-catalog { display: flex; flex-direction: column; overflow: hidden; }
.taq-cats {
  display: flex; gap: 8px; padding: 12px 16px;
  overflow-x: auto; border-bottom: 1px solid var(--taq-border);
  background: var(--taq-surface);
}
.taq-cats::-webkit-scrollbar { display: none; }
.taq-cat {
  flex-shrink: 0; border: 1px solid var(--taq-border);
  background: var(--taq-surface); cursor: pointer;
  padding: 8px 16px; border-radius: 999px;
  font-size: 14px; font-weight: 600; color: var(--taq-text);
  display: flex; align-items: center; gap: 6px;
  transition: all 0.15s ease; white-space: nowrap;
}
.taq-cat:hover { border-color: var(--taq-primary); }
.taq-cat.is-active {
  background: var(--taq-primary); color: white; border-color: var(--taq-primary);
}
.taq-cat-icon { font-size: 15px; }

.taq-products-scroll { flex: 1; overflow-y: auto; padding: 16px; }
.taq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.taq-card {
  display: flex; flex-direction: column; align-items: flex-start;
  gap: 6px; position: relative;
  background: var(--taq-surface); border: 1px solid var(--taq-border);
  border-radius: 16px; padding: 16px 14px; cursor: pointer;
  min-height: 96px; text-align: left;
  transition: all 0.15s ease;
}
.taq-card:hover {
  border-color: var(--taq-primary);
  box-shadow: 0 6px 18px rgba(232,89,12,0.12);
  transform: translateY(-2px);
}
.taq-card:active { transform: scale(0.98); }
.taq-card-name {
  font-size: 15px; font-weight: 700; color: var(--taq-text);
  line-height: 1.2;
}
.taq-card-price {
  font-size: 17px; font-weight: 800; color: var(--taq-primary);
  margin-top: auto;
}
.taq-card-add {
  position: absolute; top: 12px; right: 12px;
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--taq-primary-soft); color: var(--taq-primary);
  display: flex; align-items: center; justify-content: center;
}

.taq-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 60px 20px;
  color: var(--taq-muted); text-align: center;
}

/* CARRITO */
.taq-cart {
  background: var(--taq-surface);
  border-left: 1px solid var(--taq-border);
  overflow: hidden; display: flex; flex-direction: column;
}
.taq-cartpanel { display: flex; flex-direction: column; height: 100%; }
.taq-cart-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--taq-border);
}
.taq-cart-head-left {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--taq-text);
}
.taq-cart-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; background: var(--taq-primary-soft);
  color: var(--taq-primary-dark); padding: 3px 8px; border-radius: 999px;
}
.taq-cart-clear {
  border: none; background: none; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--taq-muted);
}
.taq-cart-clear:hover { color: #DC2626; }

.taq-cart-items { flex: 1; overflow-y: auto; padding: 12px; }
.taq-cart-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 6px; padding: 50px 16px;
  color: var(--taq-muted); text-align: center;
}
.taq-cart-empty-hint { font-size: 12px; color: var(--taq-muted); }

.taq-line {
  display: flex; gap: 10px; padding: 12px;
  border: 1px solid var(--taq-border); border-radius: 14px;
  margin-bottom: 8px; background: var(--taq-surface);
}
.taq-line-main { flex: 1; min-width: 0; }
.taq-line-name { font-size: 14px; font-weight: 700; color: var(--taq-text); }
.taq-line-opts { font-size: 12px; color: var(--taq-muted); margin-top: 2px; }
.taq-line-price { font-size: 12px; color: var(--taq-muted); margin-top: 4px; }
.taq-line-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
}
.taq-line-total { font-size: 15px; font-weight: 800; color: var(--taq-text); }
.taq-qty {
  display: flex; align-items: center; gap: 8px;
  background: var(--taq-bg); border-radius: 999px; padding: 3px;
}
.taq-qty button {
  width: 26px; height: 26px; border-radius: 50%;
  border: none; background: var(--taq-surface); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--taq-text); box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.taq-qty button:hover { background: var(--taq-primary); color: white; }
.taq-qty span { font-size: 14px; font-weight: 700; min-width: 16px; text-align: center; }
.taq-line-del {
  border: none; background: none; cursor: pointer; color: var(--taq-muted);
  padding: 2px;
}
.taq-line-del:hover { color: #DC2626; }

.taq-cart-foot {
  padding: 16px; border-top: 1px solid var(--taq-border);
  background: var(--taq-surface);
}
.taq-cart-total-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 12px;
}
.taq-cart-total-row > span:first-child {
  font-size: 14px; font-weight: 600; color: var(--taq-muted);
}
.taq-cart-total {
  font-size: 26px; font-weight: 800; color: var(--taq-text);
  font-family: Georgia, "Times New Roman", serif;
}
.taq-cobrar {
  width: 100%; border: none; cursor: pointer;
  background: var(--taq-primary); color: white;
  border-radius: 14px; padding: 16px; font-size: 17px; font-weight: 800;
  transition: all 0.15s ease;
}
.taq-cobrar:hover:not(:disabled) {
  background: var(--taq-primary-dark);
  box-shadow: 0 6px 18px rgba(232,89,12,0.35);
}
.taq-cobrar:disabled { background: #D6D3D1; color: #A8A29E; cursor: not-allowed; }

/* METODOS DE PAGO */
.taq-pay-methods { display: flex; gap: 6px; margin-bottom: 12px; }
.taq-pay-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  border: 1.5px solid var(--taq-border); background: var(--taq-surface);
  cursor: pointer; padding: 9px 4px; border-radius: 11px;
  font-size: 12px; font-weight: 600; color: var(--taq-muted);
  transition: all 0.15s ease;
}
.taq-pay-btn:hover { border-color: var(--taq-primary); }
.taq-pay-btn.is-active {
  border-color: var(--taq-primary); background: var(--taq-primary-soft);
  color: var(--taq-primary-dark);
}

/* MODAL VENTA EXITOSA */
.taq-success-backdrop {
  position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.taq-success {
  background: var(--taq-surface); border-radius: 24px; padding: 32px 28px;
  text-align: center; max-width: 320px; width: 100%;
  animation: taqPop 0.3s cubic-bezier(0.16,1,0.3,1);
}
@keyframes taqPop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.taq-success-check {
  width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 16px;
  background: #16A34A; color: white;
  display: flex; align-items: center; justify-content: center;
}
.taq-success-label { font-size: 13px; font-weight: 600; color: var(--taq-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.taq-success-folio { font-size: 52px; font-weight: 800; color: var(--taq-text); line-height: 1.1; font-family: Georgia, serif; }
.taq-success-total { font-size: 20px; font-weight: 700; color: var(--taq-primary); margin-top: 4px; }
.taq-success-btn {
  width: 100%; margin-top: 22px; border: none; cursor: pointer;
  background: var(--taq-primary); color: white;
  border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 800;
}
.taq-success-btn:hover { background: var(--taq-primary-dark); }

/* CONFIG MODAL */
.taq-cfg-label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--taq-muted); margin-bottom: 6px; }
.taq-cfg-input {
  width: 100%; border: 1.5px solid var(--taq-border); background: var(--taq-surface);
  border-radius: 11px; padding: 12px 14px; font-size: 15px; color: var(--taq-text);
  outline: none; transition: border-color 0.15s ease;
}
.taq-cfg-input:focus { border-color: var(--taq-primary); }
.taq-cfg-hint { font-size: 12px; color: var(--taq-muted); margin-top: 6px; }
.taq-cfg-toggle {
  width: 100%; display: flex; align-items: center; gap: 12px; cursor: pointer;
  border: 1.5px solid var(--taq-border); background: var(--taq-surface);
  border-radius: 14px; padding: 14px; margin-bottom: 10px; text-align: left;
  color: var(--taq-text); transition: all 0.15s ease;
}
.taq-cfg-toggle.is-on { border-color: var(--taq-primary); background: var(--taq-primary-soft); }
.taq-cfg-toggle-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.taq-cfg-toggle-title { font-size: 15px; font-weight: 700; }
.taq-cfg-toggle-sub { font-size: 12px; color: var(--taq-muted); }
.taq-cfg-switch {
  width: 44px; height: 26px; border-radius: 999px; background: #D6D3D1;
  position: relative; flex-shrink: 0; transition: background 0.2s ease;
}
.taq-cfg-switch::after {
  content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
  border-radius: 50%; background: white; transition: transform 0.2s ease;
}
.taq-cfg-switch.is-on { background: var(--taq-primary); }
.taq-cfg-switch.is-on::after { transform: translateX(18px); }

/* ICON BTN GENERICO */
.taq-icon-btn {
  width: 34px; height: 34px; border-radius: 9px;
  border: none; background: var(--taq-bg); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--taq-text);
}
.taq-icon-btn:hover { background: var(--taq-primary-soft); color: var(--taq-primary); }

/* BARRA MOVIL + HOJA */
.taq-mobilebar { display: none; }
.taq-sheet, .taq-sheet-backdrop { display: none; }

/* MODAL MODIFICADORES */
.taq-modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0;
}
.taq-modal {
  background: var(--taq-surface); width: 100%; max-width: 520px;
  border-radius: 24px 24px 0 0; max-height: 88vh;
  display: flex; flex-direction: column; overflow: hidden;
  animation: taqSlideUp 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes taqSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.taq-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--taq-border);
}
.taq-modal-title { font-size: 19px; font-weight: 800; color: var(--taq-text); margin: 0; }
.taq-modal-price { font-size: 15px; font-weight: 700; color: var(--taq-primary); margin: 2px 0 0; }
.taq-modal-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.taq-modal-nogroups { color: var(--taq-muted); font-size: 14px; text-align: center; padding: 20px 0; }
.taq-group { margin-bottom: 20px; }
.taq-group-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.taq-group-name { font-size: 15px; font-weight: 700; color: var(--taq-text); }
.taq-group-req {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  color: var(--taq-primary-dark); background: var(--taq-primary-soft);
  padding: 2px 7px; border-radius: 999px;
}
.taq-group-opt {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  color: var(--taq-muted);
}
.taq-options { display: flex; flex-wrap: wrap; gap: 8px; }
.taq-option {
  display: flex; align-items: center; gap: 6px;
  border: 1.5px solid var(--taq-border); background: var(--taq-surface);
  cursor: pointer; padding: 10px 14px; border-radius: 12px;
  font-size: 14px; font-weight: 600; color: var(--taq-text);
  transition: all 0.15s ease;
}
.taq-option:hover { border-color: var(--taq-primary); }
.taq-option.is-active {
  border-color: var(--taq-primary); background: var(--taq-primary-soft);
  color: var(--taq-primary-dark);
}
.taq-option-check { color: var(--taq-primary); }
.taq-option-delta { font-size: 12px; color: var(--taq-muted); font-weight: 700; }
.taq-modal-foot {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-top: 1px solid var(--taq-border);
}
.taq-modal-qty {
  display: flex; align-items: center; gap: 12px;
  background: var(--taq-bg); border-radius: 999px; padding: 6px;
}
.taq-modal-qty button {
  width: 36px; height: 36px; border-radius: 50%;
  border: none; background: var(--taq-surface); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--taq-text); box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.taq-modal-qty button:hover { background: var(--taq-primary); color: white; }
.taq-modal-qty span { font-size: 17px; font-weight: 800; min-width: 22px; text-align: center; }
.taq-modal-add {
  flex: 1; border: none; cursor: pointer;
  background: var(--taq-primary); color: white;
  border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 800;
  transition: all 0.15s ease;
}
.taq-modal-add:hover { background: var(--taq-primary-dark); }

/* ===================== RESPONSIVE ===================== */
@media (min-width: 641px) {
  .taq-modal-backdrop { align-items: center; padding: 16px; }
  .taq-modal { border-radius: 24px; }
}

@media (max-width: 1024px) {
  .taq-layout { grid-template-columns: minmax(0,1fr) 300px; }
}

@media (max-width: 768px) {
  .taq-layout { grid-template-columns: 1fr; height: auto; }
  .taq-cart { display: none; }
  .taq-products-scroll { padding-bottom: 90px; }
  .taq-mobilebar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 35;
    background: var(--taq-surface); border-top: 1px solid var(--taq-border);
    padding: 12px 16px; box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
  }
  .taq-mobilebar-info { display: flex; flex-direction: column; }
  .taq-mobilebar-count { font-size: 12px; color: var(--taq-muted); }
  .taq-mobilebar-total { font-size: 20px; font-weight: 800; color: var(--taq-text); }
  .taq-mobilebar-btn {
    display: flex; align-items: center; gap: 8px;
    border: none; cursor: pointer; background: var(--taq-primary); color: white;
    border-radius: 12px; padding: 13px 22px; font-size: 15px; font-weight: 700;
  }
  .taq-mobilebar-btn:disabled { background: #D6D3D1; color: #A8A29E; }

  .taq-sheet-backdrop {
    display: block; position: fixed; inset: 0; z-index: 40;
    background: rgba(0,0,0,0); pointer-events: none; transition: background 0.25s ease;
  }
  .taq-sheet-backdrop.is-open { background: rgba(0,0,0,0.45); pointer-events: auto; }
  .taq-sheet {
    display: flex; flex-direction: column;
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 41;
    background: var(--taq-surface); border-radius: 22px 22px 0 0;
    max-height: 85vh; transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .taq-sheet.is-open { transform: translateY(0); }
  .taq-sheet-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px; border-bottom: 1px solid var(--taq-border);
  }
  .taq-sheet-title { font-size: 17px; font-weight: 800; color: var(--taq-text); }
}
`;
