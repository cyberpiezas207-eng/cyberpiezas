// >>> ESTE ARCHIVO VA EN: client/src/pages/PapeleriaPOS.tsx <<<
// =============================================================================
// PapeleriaPOS - Pantalla de VENTA (el corazon del POS) - PASO 2
// -----------------------------------------------------------------------------
// Filosofia: el cajero debe encontrar cualquier producto en segundos y cobrar
// sin detener la fila. Por eso:
//   - Barra de busqueda GIGANTE siempre visible (el minicerebro del backend)
//   - Chips de categorias para filtrar rapido
//   - Seccion "Mas vendidos" para acceso de un toque a lo frecuente
//   - Grid de productos en tarjetas grandes (foto opcional)
//   - Carrito lateral (desktop) o inferior (movil) + cobro con folio
//
// Conectada al backend (papeleria.buscar.search, topSellers, categorias.list,
// productos.listByCategory, sales.create, settings.get).
// El escaneo de codigo de barras y la camara llegan en el Paso 3.
// Comentarios SIN ACENTOS por convencion del proyecto.
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  Package,
  Settings,
  Receipt,
  Flame,
  Check,
  Banknote,
  CreditCard,
  Landmark,
} from "lucide-react";

const PESO = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// -----------------------------------------------------------------------------
// Tipos locales
// -----------------------------------------------------------------------------
interface CartLine {
  lineId: string;
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

// Semaforo de stock: devuelve color y etiqueta segun nivel
function stockBadge(stock: number, trackStock: boolean) {
  if (!trackStock) return null;
  if (stock <= 0) return { cls: "is-out", label: "Agotado" };
  if (stock <= 3) return { cls: "is-low", label: `Quedan ${stock}` };
  return { cls: "is-ok", label: `${stock}` };
}

export default function PapeleriaPOS() {
  const [, setLocation] = useLocation();
  const trpcUtils = trpc.useUtils();

  const accessQuery = trpc.papeleria.hasAccess.useQuery();
  const enabled = accessQuery.data?.hasAccess === true;

  const settingsQuery = trpc.papeleria.settings.get.useQuery(undefined, { enabled });
  const categoriasQuery = trpc.papeleria.categorias.list.useQuery(undefined, { enabled });
  const topSellersQuery = trpc.papeleria.buscar.topSellers.useQuery({ limit: 8 }, { enabled });

  // Estado de busqueda y filtro
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Resultados de busqueda (minicerebro). Si hay query, manda la busqueda.
  const searchQuery = trpc.papeleria.buscar.search.useQuery(
    { q: query, limit: 30 },
    { enabled: enabled && query.trim().length > 0 },
  );

  // Productos por categoria (cuando no hay busqueda activa y hay categoria elegida)
  const byCategoryQuery = trpc.papeleria.productos.listByCategory.useQuery(
    { categoryId: selectedCategory ?? 0 },
    { enabled: enabled && query.trim().length === 0 && selectedCategory !== null },
  );

  // Todos los productos (cuando no hay query ni categoria)
  const allProductsQuery = trpc.papeleria.productos.list.useQuery(undefined, {
    enabled: enabled && query.trim().length === 0 && selectedCategory === null,
  });

  // Decide que productos mostrar en el grid
  const products: any[] = useMemo(() => {
    if (query.trim().length > 0) return searchQuery.data ?? [];
    if (selectedCategory !== null) return byCategoryQuery.data ?? [];
    return allProductsQuery.data ?? [];
  }, [query, selectedCategory, searchQuery.data, byCategoryQuery.data, allProductsQuery.data]);

  const isSearching = query.trim().length > 0 && searchQuery.isLoading;

  // ---------------------------------------------------------------------------
  // Carrito
  // ---------------------------------------------------------------------------
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const addProduct = (p: any) => {
    const price = parseFloat(p.price ?? "0");
    setCart((prev) => {
      // Si ya existe esa linea de producto, suma cantidad
      const idx = prev.findIndex((l) => l.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const ln = copy[idx];
        const q = ln.quantity + 1;
        copy[idx] = { ...ln, quantity: q, lineTotal: ln.unitPrice * q };
        return copy;
      }
      return [
        ...prev,
        {
          lineId: `l-${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          unitPrice: price,
          quantity: 1,
          lineTotal: price,
        },
      ];
    });
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
        .filter(Boolean) as CartLine[],
    );
  };

  const removeLine = (lineId: string) => setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  const clearCart = () => setCart([]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  // ---------------------------------------------------------------------------
  // Cobro
  // ---------------------------------------------------------------------------
  const [lastSale, setLastSale] = useState<{ folio: number; total: string } | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const createSaleMut = trpc.papeleria.sales.create.useMutation({
    onSuccess: (data) => {
      setLastSale({ folio: data.folio, total: data.total });
      setCart([]);
      setShowPayment(false);
      setMobileCartOpen(false);
      // Refrescar mas vendidos y productos (cambio salesCount/stock)
      trpcUtils.papeleria.buscar.topSellers.invalidate();
      trpcUtils.papeleria.productos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCobrar = (paymentMethod: "efectivo" | "tarjeta" | "transferencia") => {
    if (cart.length === 0) return;
    createSaleMut.mutate({
      paymentMethod,
      items: cart.map((l) => ({
        productId: l.productId,
        productName: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        lineTotal: l.lineTotal.toFixed(2),
      })),
    });
  };

  // ---------------------------------------------------------------------------
  // Acceso
  // ---------------------------------------------------------------------------
  if (accessQuery.isLoading) {
    return (
      <div className="pap-loader">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563EB" }} />
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.hasAccess) {
    return (
      <div className="pap" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{PAP_STYLES}</style>
        <div className="pap-noaccess">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <h1>Papeleria</h1>
          <p>Necesitas una suscripcion activa para usar el POS.</p>
          <button className="pap-btn-primary" onClick={() => setLocation("/sistemas")}>Regresar</button>
        </div>
      </div>
    );
  }

  const businessName = settingsQuery.data?.businessName ?? "Mi Papeleria";
  const categorias = categoriasQuery.data ?? [];
  const topSellers = topSellersQuery.data ?? [];
  const showTopSellers = query.trim().length === 0 && selectedCategory === null && topSellers.length > 0;

  return (
    <div className="pap">
      <style>{PAP_STYLES}</style>

      {/* HEADER */}
      <header className="pap-header">
        <div className="pap-brand">
          <span className="pap-brand-emoji">📚</span>
          <span className="pap-brand-name">{businessName}</span>
        </div>
        <div className="pap-nav">
          <button className="pap-nav-btn" onClick={() => setLocation("/papeleria-catalogo")} title="Administrar productos">
            <Package className="w-4 h-4" />
            <span className="hidden md:inline">Catalogo</span>
          </button>
          <button className="pap-nav-btn" onClick={() => setLocation("/papeleria-catalogo")} title="Configuracion">
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Ajustes</span>
          </button>
        </div>
      </header>

      {/* BARRA DE BUSQUEDA GIGANTE */}
      <div className="pap-searchbar">
        <Search className="w-5 h-5 pap-search-icon" />
        <input
          className="pap-search-input"
          placeholder="Buscar producto, marca o codigo..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length > 0) setSelectedCategory(null);
          }}
          autoFocus
        />
        {query && (
          <button className="pap-search-clear" onClick={() => setQuery("")} aria-label="Limpiar">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="pap-body">
        <div className="pap-main">
          {/* CATEGORIAS (chips) - solo si no hay busqueda */}
          {query.trim().length === 0 && categorias.length > 0 && (
            <div className="pap-cats">
              <button
                className={`pap-cat ${selectedCategory === null ? "is-active" : ""}`}
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </button>
              {categorias.map((c: any) => (
                <button
                  key={c.id}
                  className={`pap-cat ${selectedCategory === c.id ? "is-active" : ""}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.icon && <span>{c.icon}</span>} {c.name}
                </button>
              ))}
            </div>
          )}

          {/* MAS VENDIDOS */}
          {showTopSellers && (
            <div className="pap-section">
              <div className="pap-section-head">
                <Flame className="w-4 h-4" style={{ color: "#EA580C" }} />
                <span>Mas vendidos</span>
              </div>
              <div className="pap-chips">
                {topSellers.map((p: any) => (
                  <button key={p.id} className="pap-chip" onClick={() => addProduct(p)}>
                    <span className="pap-chip-name">{p.name}</span>
                    <span className="pap-chip-price">{PESO(parseFloat(p.price))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GRID DE PRODUCTOS */}
          <div className="pap-section-head" style={{ marginTop: 8 }}>
            <Package className="w-4 h-4" style={{ color: "#2563EB" }} />
            <span>
              {query.trim().length > 0
                ? "Resultados"
                : selectedCategory !== null
                ? categorias.find((c: any) => c.id === selectedCategory)?.name ?? "Productos"
                : "Todos los productos"}
            </span>
          </div>

          {isSearching ? (
            <div className="pap-empty"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} /></div>
          ) : products.length === 0 ? (
            <div className="pap-empty">
              <Package className="w-10 h-10 opacity-25" />
              <p>{query.trim().length > 0 ? "Sin resultados para tu busqueda" : "No hay productos. Agregalos en Catalogo."}</p>
              {query.trim().length === 0 && (
                <button className="pap-btn-primary" onClick={() => setLocation("/papeleria-catalogo")}>
                  Ir a Catalogo
                </button>
              )}
            </div>
          ) : (
            <div className="pap-grid">
              {products.map((p: any) => {
                const badge = stockBadge(p.stock ?? 0, p.trackStock ?? false);
                const isOut = p.trackStock && (p.stock ?? 0) <= 0;
                return (
                  <button
                    key={p.id}
                    className={`pap-card ${isOut ? "is-out" : ""}`}
                    onClick={() => !isOut && addProduct(p)}
                    disabled={isOut}
                  >
                    <div className="pap-card-img">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} />
                      ) : (
                        <Package className="w-7 h-7" style={{ color: "#CBD5E1" }} />
                      )}
                      {badge && <span className={`pap-stock ${badge.cls}`}>{badge.label}</span>}
                    </div>
                    <div className="pap-card-info">
                      <span className="pap-card-name">{p.name}</span>
                      <span className="pap-card-price">{PESO(parseFloat(p.price))}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CARRITO - desktop */}
        <aside className="pap-cart-desktop">
          <CartPanel
            cart={cart}
            total={total}
            itemCount={itemCount}
            onQty={changeQty}
            onRemove={removeLine}
            onClear={clearCart}
            onCobrar={() => setShowPayment(true)}
            busy={createSaleMut.isPending}
          />
        </aside>
      </div>

      {/* CARRITO - boton flotante movil */}
      {cart.length > 0 && !mobileCartOpen && (
        <button className="pap-fab" onClick={() => setMobileCartOpen(true)}>
          <ShoppingCart className="w-5 h-5" />
          <span>{itemCount}</span>
          <span className="pap-fab-total">{PESO(total)}</span>
        </button>
      )}

      {/* CARRITO - hoja movil */}
      {mobileCartOpen && (
        <div className="pap-sheet-backdrop" onClick={() => setMobileCartOpen(false)}>
          <div className="pap-sheet" onClick={(e) => e.stopPropagation()}>
            <CartPanel
              cart={cart}
              total={total}
              itemCount={itemCount}
              onQty={changeQty}
              onRemove={removeLine}
              onClear={clearCart}
              onCobrar={() => setShowPayment(true)}
              busy={createSaleMut.isPending}
              onClose={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL DE PAGO */}
      {showPayment && (
        <div className="pap-modal-backdrop" onClick={() => setShowPayment(false)}>
          <div className="pap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pap-modal-head">
              <h3>Cobrar {PESO(total)}</h3>
              <button onClick={() => setShowPayment(false)} className="pap-icon-btn"><X className="w-4 h-4" /></button>
            </div>
            <p className="pap-modal-sub">Como paga el cliente?</p>
            <div className="pap-pay-grid">
              <button className="pap-pay" disabled={createSaleMut.isPending} onClick={() => handleCobrar("efectivo")}>
                <Banknote className="w-7 h-7" style={{ color: "#16A34A" }} />
                <span>Efectivo</span>
              </button>
              <button className="pap-pay" disabled={createSaleMut.isPending} onClick={() => handleCobrar("tarjeta")}>
                <CreditCard className="w-7 h-7" style={{ color: "#2563EB" }} />
                <span>Tarjeta</span>
              </button>
              <button className="pap-pay" disabled={createSaleMut.isPending} onClick={() => handleCobrar("transferencia")}>
                <Landmark className="w-7 h-7" style={{ color: "#9333EA" }} />
                <span>Transfer</span>
              </button>
            </div>
            {createSaleMut.isPending && (
              <div className="pap-modal-loading"><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL VENTA EXITOSA */}
      {lastSale && (
        <div className="pap-success-backdrop" onClick={() => setLastSale(null)}>
          <div className="pap-success" onClick={(e) => e.stopPropagation()}>
            <div className="pap-success-check"><Check className="w-9 h-9" /></div>
            <p className="pap-success-label">Venta cobrada</p>
            <p className="pap-success-folio">#{lastSale.folio}</p>
            <p className="pap-success-total">{PESO(parseFloat(lastSale.total))}</p>
            <button className="pap-btn-primary" onClick={() => setLastSale(null)}>Nueva venta</button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CartPanel - panel del carrito (reusado en desktop y hoja movil)
// -----------------------------------------------------------------------------
function CartPanel({
  cart,
  total,
  itemCount,
  onQty,
  onRemove,
  onClear,
  onCobrar,
  busy,
  onClose,
}: {
  cart: CartLine[];
  total: number;
  itemCount: number;
  onQty: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCobrar: () => void;
  busy: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="pap-cart">
      <div className="pap-cart-head">
        <div className="pap-cart-title">
          <ShoppingCart className="w-5 h-5" />
          <span>Ticket</span>
          {itemCount > 0 && <span className="pap-cart-count">{itemCount}</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {cart.length > 0 && (
            <button className="pap-cart-clear" onClick={onClear} title="Vaciar"><Trash2 className="w-4 h-4" /></button>
          )}
          {onClose && (
            <button className="pap-cart-clear" onClick={onClose} title="Cerrar"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="pap-cart-empty">
          <ShoppingCart className="w-9 h-9 opacity-20" />
          <p>Toca productos para agregarlos</p>
        </div>
      ) : (
        <div className="pap-cart-lines">
          {cart.map((l) => (
            <div key={l.lineId} className="pap-cart-line">
              <div className="pap-cart-line-info">
                <span className="pap-cart-line-name">{l.name}</span>
                <span className="pap-cart-line-price">{PESO(l.unitPrice)} c/u</span>
              </div>
              <div className="pap-cart-qty">
                <button onClick={() => onQty(l.lineId, -1)}><Minus className="w-3.5 h-3.5" /></button>
                <span>{l.quantity}</span>
                <button onClick={() => onQty(l.lineId, 1)}><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <span className="pap-cart-line-total">{PESO(l.lineTotal)}</span>
              <button className="pap-cart-line-del" onClick={() => onRemove(l.lineId)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="pap-cart-foot">
        <div className="pap-cart-total-row">
          <span>Total</span>
          <span className="pap-cart-total-val">{PESO(total)}</span>
        </div>
        <button className="pap-cobrar" disabled={cart.length === 0 || busy} onClick={onCobrar}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
          Cobrar {cart.length > 0 ? PESO(total) : ""}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ESTILOS - paleta azul papeleria, limpia y profesional
// =============================================================================
const PAP_STYLES = `
.pap {
  --c-primary: #2563EB;
  --c-primary-dark: #1D4ED8;
  --c-primary-soft: #EFF6FF;
  --c-surface: #FFFFFF;
  --c-bg: #F1F5F9;
  --c-text: #0F172A;
  --c-muted: #64748B;
  --c-border: rgba(15,23,42,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh; background: var(--c-bg); color: var(--c-text);
}
.pap-loader { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F1F5F9; }
.pap-noaccess { background: #fff; border-radius: 24px; padding: 32px; text-align: center; max-width: 380px; }
.pap-noaccess h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; }
.pap-noaccess p { font-size: 14px; color: var(--c-muted); margin: 0 0 20px; }

.pap-header {
  position: sticky; top: 0; z-index: 30; background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px;
}
.pap-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pap-brand-emoji { font-size: 22px; }
.pap-brand-name { font-size: 18px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pap-nav { display: flex; gap: 6px; flex-shrink: 0; }
.pap-nav-btn {
  display: flex; align-items: center; gap: 6px; border: 1px solid var(--c-border);
  background: var(--c-surface); cursor: pointer; padding: 8px 12px; border-radius: 10px;
  font-size: 13px; font-weight: 600; color: var(--c-muted); transition: all 0.15s ease;
}
.pap-nav-btn:hover { border-color: var(--c-primary); color: var(--c-primary); background: var(--c-primary-soft); }

/* BUSQUEDA GIGANTE */
.pap-searchbar {
  position: sticky; top: 57px; z-index: 25; background: var(--c-bg);
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
}
.pap-search-icon { color: var(--c-muted); flex-shrink: 0; }
.pap-search-input {
  flex: 1; border: 2px solid var(--c-border); background: var(--c-surface);
  border-radius: 14px; padding: 14px 16px; font-size: 17px; color: var(--c-text);
  outline: none; transition: border-color 0.15s ease; min-width: 0;
}
.pap-search-input:focus { border-color: var(--c-primary); }
.pap-search-clear {
  position: absolute; right: 26px; border: none; background: none; cursor: pointer;
  color: var(--c-muted); padding: 4px; display: flex;
}

.pap-body { display: flex; gap: 16px; max-width: 1200px; margin: 0 auto; padding: 16px; }
.pap-main { flex: 1; min-width: 0; }

/* CATEGORIAS */
.pap-cats { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; }
.pap-cat {
  flex-shrink: 0; border: 1px solid var(--c-border); background: var(--c-surface);
  cursor: pointer; padding: 9px 16px; border-radius: 999px; font-size: 14px;
  font-weight: 600; color: var(--c-text); white-space: nowrap; transition: all 0.15s ease;
}
.pap-cat.is-active { background: var(--c-primary); color: #fff; border-color: var(--c-primary); }

/* SECCIONES */
.pap-section { margin-bottom: 16px; }
.pap-section-head {
  display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.4px; color: var(--c-muted); margin-bottom: 10px;
}
.pap-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pap-chip {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  border: 1px solid var(--c-border); background: var(--c-surface); cursor: pointer;
  padding: 10px 14px; border-radius: 12px; transition: all 0.15s ease; text-align: left;
}
.pap-chip:hover { border-color: var(--c-primary); background: var(--c-primary-soft); }
.pap-chip-name { font-size: 14px; font-weight: 700; color: var(--c-text); }
.pap-chip-price { font-size: 13px; font-weight: 700; color: var(--c-primary); }

/* GRID DE PRODUCTOS */
.pap-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;
}
.pap-card {
  border: 1px solid var(--c-border); background: var(--c-surface); cursor: pointer;
  border-radius: 14px; overflow: hidden; padding: 0; text-align: left;
  display: flex; flex-direction: column; transition: all 0.12s ease;
}
.pap-card:hover:not(:disabled) { border-color: var(--c-primary); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37,99,235,0.12); }
.pap-card:active:not(:disabled) { transform: translateY(0); }
.pap-card.is-out { opacity: 0.5; cursor: not-allowed; }
.pap-card-img {
  position: relative; width: 100%; aspect-ratio: 1.4; background: #F8FAFC;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.pap-card-img img { width: 100%; height: 100%; object-fit: cover; }
.pap-stock {
  position: absolute; top: 6px; right: 6px; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px; color: #fff;
}
.pap-stock.is-ok { background: #16A34A; }
.pap-stock.is-low { background: #EA580C; }
.pap-stock.is-out { background: #DC2626; }
.pap-card-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.pap-card-name { font-size: 14px; font-weight: 600; line-height: 1.25; }
.pap-card-price { font-size: 16px; font-weight: 800; color: var(--c-primary); }

.pap-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 50px 20px; color: var(--c-muted); text-align: center;
}

/* CARRITO DESKTOP */
.pap-cart-desktop { width: 340px; flex-shrink: 0; }
.pap-cart-desktop .pap-cart { position: sticky; top: 130px; }
.pap-cart {
  background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 18px;
  display: flex; flex-direction: column; max-height: calc(100vh - 150px);
}
.pap-cart-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--c-border);
}
.pap-cart-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.pap-cart-count { background: var(--c-primary); color: #fff; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.pap-cart-clear { border: none; background: var(--c-bg); cursor: pointer; color: var(--c-muted); padding: 7px; border-radius: 8px; display: flex; }
.pap-cart-clear:hover { background: #FEE2E2; color: #DC2626; }
.pap-cart-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 40px 20px; color: var(--c-muted); text-align: center; font-size: 14px;
}
.pap-cart-lines { flex: 1; overflow-y: auto; padding: 8px; }
.pap-cart-line { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 10px; }
.pap-cart-line:hover { background: var(--c-bg); }
.pap-cart-line-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pap-cart-line-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pap-cart-line-price { font-size: 12px; color: var(--c-muted); }
.pap-cart-qty { display: flex; align-items: center; gap: 8px; background: var(--c-bg); border-radius: 8px; padding: 4px; }
.pap-cart-qty button { border: none; background: var(--c-surface); cursor: pointer; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--c-text); }
.pap-cart-qty button:hover { background: var(--c-primary); color: #fff; }
.pap-cart-qty span { min-width: 18px; text-align: center; font-weight: 700; font-size: 14px; }
.pap-cart-line-total { font-size: 14px; font-weight: 700; min-width: 54px; text-align: right; }
.pap-cart-line-del { border: none; background: none; cursor: pointer; color: #CBD5E1; padding: 4px; display: flex; }
.pap-cart-line-del:hover { color: #DC2626; }
.pap-cart-foot { border-top: 1px solid var(--c-border); padding: 14px 16px; }
.pap-cart-total-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 15px; font-weight: 600; }
.pap-cart-total-val { font-size: 24px; font-weight: 800; color: var(--c-text); }
.pap-cobrar {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  border: none; cursor: pointer; background: var(--c-primary); color: #fff;
  border-radius: 13px; padding: 16px; font-size: 17px; font-weight: 800; transition: background 0.15s ease;
}
.pap-cobrar:hover:not(:disabled) { background: var(--c-primary-dark); }
.pap-cobrar:disabled { opacity: 0.45; cursor: not-allowed; }

/* FAB MOVIL */
.pap-fab {
  position: fixed; bottom: 16px; left: 16px; right: 16px; z-index: 35;
  display: flex; align-items: center; gap: 10px; border: none; cursor: pointer;
  background: var(--c-primary); color: #fff; border-radius: 16px; padding: 16px 20px;
  font-size: 16px; font-weight: 700; box-shadow: 0 8px 24px rgba(37,99,235,0.4);
}
.pap-fab span { font-weight: 800; }
.pap-fab-total { margin-left: auto; }
@media (min-width: 900px) { .pap-fab { display: none; } }

/* HOJA MOVIL */
.pap-sheet-backdrop { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.pap-sheet { width: 100%; max-height: 85vh; background: var(--c-surface); border-radius: 20px 20px 0 0; overflow: hidden; }
.pap-sheet .pap-cart { max-height: 85vh; border: none; border-radius: 0; }
@media (min-width: 900px) { .pap-cart-desktop { display: block; } }
@media (max-width: 899px) { .pap-cart-desktop { display: none; } }

/* MODAL PAGO */
.pap-modal-backdrop, .pap-success-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
.pap-modal { background: var(--c-surface); border-radius: 20px; width: 100%; max-width: 420px; padding: 20px; }
.pap-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.pap-modal-head h3 { font-size: 20px; font-weight: 800; }
.pap-icon-btn { border: none; background: var(--c-bg); cursor: pointer; padding: 8px; border-radius: 8px; display: flex; color: var(--c-muted); }
.pap-modal-sub { font-size: 14px; color: var(--c-muted); margin-bottom: 16px; }
.pap-pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pap-pay {
  display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;
  border: 1.5px solid var(--c-border); background: var(--c-surface); border-radius: 14px;
  padding: 18px 8px; font-size: 14px; font-weight: 700; color: var(--c-text); transition: all 0.15s ease;
}
.pap-pay:hover:not(:disabled) { border-color: var(--c-primary); background: var(--c-primary-soft); }
.pap-pay:disabled { opacity: 0.5; cursor: not-allowed; }
.pap-modal-loading { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; color: var(--c-muted); font-size: 14px; }

/* SUCCESS */
.pap-success { background: var(--c-surface); border-radius: 24px; padding: 32px; text-align: center; max-width: 340px; width: 100%; }
.pap-success-check { width: 72px; height: 72px; border-radius: 50%; background: #DCFCE7; color: #16A34A; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.pap-success-label { font-size: 14px; color: var(--c-muted); }
.pap-success-folio { font-size: 22px; font-weight: 800; color: var(--c-primary); margin: 2px 0; }
.pap-success-total { font-size: 36px; font-weight: 800; margin-bottom: 20px; }

.pap-btn-primary { border: none; cursor: pointer; background: var(--c-primary); color: #fff; border-radius: 12px; padding: 12px 24px; font-size: 15px; font-weight: 700; }
.pap-btn-primary:hover { background: var(--c-primary-dark); }
`;
