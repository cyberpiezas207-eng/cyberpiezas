// >>> ESTE ARCHIVO VA EN: client/src/pages/TaqueriaHistorial.tsx <<<
// =============================================================================
// TaqueriaHistorial - Historial de ventas y corte de caja (PASO 5)
// -----------------------------------------------------------------------------
// Muestra, para una fecha elegible:
//   - Resumen (corte de caja): total vendido, numero de ordenes,
//     desglose por metodo de pago (efectivo / tarjeta / transferencia)
//   - Lista de ordenes con folio, hora, modo (aqui/llevar), metodo y total
//   - Al tocar una orden, se ven sus productos (getItems)
//
// Conectada al backend (orders.listByDate, orders.getItems). Sin endpoints
// nuevos. Comentarios SIN ACENTOS por convencion del proyecto.
// =============================================================================

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Loader2,
  Store,
  Bike,
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

const PESO = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// Formatea Date a YYYY-MM-DD en hora local
const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const HORA = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const PAY_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transfer",
};

export default function TaqueriaHistorial() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(toDateInput(new Date()));

  const accessQuery = trpc.taqueria.hasAccess.useQuery();
  const ordersQuery = trpc.taqueria.orders.listByDate.useQuery(
    { date: selectedDate },
    { enabled: accessQuery.data?.hasAccess === true },
  );

  const orders = ordersQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // Corte de caja: totales del dia
  // ---------------------------------------------------------------------------
  const resumen = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;
    for (const o of orders) {
      const t = parseFloat(o.total ?? "0");
      total += t;
      if (o.paymentMethod === "efectivo") efectivo += t;
      else if (o.paymentMethod === "tarjeta") tarjeta += t;
      else if (o.paymentMethod === "transferencia") transferencia += t;
    }
    return { total, efectivo, tarjeta, transferencia, count: orders.length };
  }, [orders]);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateInput(d));
  };

  const isToday = selectedDate === toDateInput(new Date());

  // ---------------------------------------------------------------------------
  // Acceso
  // ---------------------------------------------------------------------------
  if (accessQuery.isLoading) {
    return (
      <div className="tqh-loader">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#E8590C" }} />
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.hasAccess) {
    return (
      <div className="tqh" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{TQH_STYLES}</style>
        <div className="tqh-noaccess">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌮</div>
          <h1>Historial de Taqueria</h1>
          <p>Necesitas una suscripcion activa para ver el historial.</p>
          <button className="tqh-btn-primary" onClick={() => setLocation("/sistemas")}>Regresar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tqh">
      <style>{TQH_STYLES}</style>

      {/* HEADER */}
      <header className="tqh-header">
        <button onClick={() => setLocation("/taqueria")} className="tqh-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">POS</span>
        </button>
        <div className="tqh-title">
          <Receipt className="w-5 h-5" style={{ color: "#E8590C" }} />
          <span className="tqh-title-text">Historial y corte</span>
        </div>
        <div style={{ width: 60 }} />
      </header>

      <div className="tqh-content">
        {/* SELECTOR DE FECHA */}
        <div className="tqh-datebar">
          <button className="tqh-date-arrow" onClick={() => shiftDay(-1)} aria-label="Dia anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="tqh-date-center">
            <input
              type="date"
              className="tqh-date-input"
              value={selectedDate}
              max={toDateInput(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {isToday && <span className="tqh-today-badge">Hoy</span>}
          </div>
          <button
            className="tqh-date-arrow"
            onClick={() => shiftDay(1)}
            disabled={isToday}
            aria-label="Dia siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* CORTE DE CAJA (resumen) */}
        <div className="tqh-corte">
          <div className="tqh-corte-main">
            <div className="tqh-corte-label">
              <TrendingUp className="w-4 h-4" />
              <span>Total del dia</span>
            </div>
            <div className="tqh-corte-total">{PESO(resumen.total)}</div>
            <div className="tqh-corte-count">{resumen.count} {resumen.count === 1 ? "orden" : "ordenes"}</div>
          </div>
          <div className="tqh-corte-breakdown">
            <div className="tqh-corte-method">
              <Banknote className="w-4 h-4" style={{ color: "#16A34A" }} />
              <span className="tqh-corte-method-label">Efectivo</span>
              <span className="tqh-corte-method-val">{PESO(resumen.efectivo)}</span>
            </div>
            <div className="tqh-corte-method">
              <CreditCard className="w-4 h-4" style={{ color: "#2563EB" }} />
              <span className="tqh-corte-method-label">Tarjeta</span>
              <span className="tqh-corte-method-val">{PESO(resumen.tarjeta)}</span>
            </div>
            <div className="tqh-corte-method">
              <Landmark className="w-4 h-4" style={{ color: "#9333EA" }} />
              <span className="tqh-corte-method-label">Transfer</span>
              <span className="tqh-corte-method-val">{PESO(resumen.transferencia)}</span>
            </div>
          </div>
        </div>

        {/* LISTA DE ORDENES */}
        <div className="tqh-orders-head">Ordenes</div>
        {ordersQuery.isLoading ? (
          <div className="tqh-empty"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E8590C" }} /></div>
        ) : orders.length === 0 ? (
          <div className="tqh-empty">
            <Receipt className="w-9 h-9 opacity-25" />
            <p>No hay ventas en esta fecha</p>
          </div>
        ) : (
          <div className="tqh-orders">
            {orders.map((o: any) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// OrderRow - fila de orden que se expande para ver sus productos
// -----------------------------------------------------------------------------

function OrderRow({ order }: { order: any }) {
  const [open, setOpen] = useState(false);
  const itemsQuery = trpc.taqueria.orders.getItems.useQuery(
    { orderId: order.id },
    { enabled: open },
  );

  const items = itemsQuery.data ?? [];
  const PayIcon =
    order.paymentMethod === "efectivo" ? Banknote :
    order.paymentMethod === "tarjeta" ? CreditCard : Landmark;

  return (
    <div className="tqh-order">
      <button className="tqh-order-main" onClick={() => setOpen((v) => !v)}>
        <div className="tqh-order-folio">#{order.folio}</div>
        <div className="tqh-order-info">
          <div className="tqh-order-line1">
            <span className="tqh-order-mode">
              {order.serviceMode === "aqui" ? <Store className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
              {order.serviceMode === "aqui" ? "Aqui" : "Llevar"}
            </span>
            <span className="tqh-order-time">{HORA(order.createdAt)}</span>
          </div>
          <div className="tqh-order-line2">
            <PayIcon className="w-3.5 h-3.5" />
            <span>{PAY_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
            <span className="tqh-order-items-count">- {order.itemCount} art.</span>
          </div>
        </div>
        <div className="tqh-order-right">
          <span className="tqh-order-total">{PESO(parseFloat(order.total ?? "0"))}</span>
          <ChevronDown className={`w-4 h-4 tqh-order-chev ${open ? "is-open" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="tqh-order-detail">
          {itemsQuery.isLoading ? (
            <div className="tqh-empty" style={{ padding: 16 }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#E8590C" }} />
            </div>
          ) : items.length === 0 ? (
            <p className="tqh-detail-empty">Sin productos</p>
          ) : (
            items.map((it: any) => (
              <div key={it.id} className="tqh-detail-item">
                <span className="tqh-detail-qty">{it.quantity}x</span>
                <div className="tqh-detail-main">
                  <span className="tqh-detail-name">{it.productName}</span>
                  {it.modifiers && <span className="tqh-detail-mods">{it.modifiers}</span>}
                </div>
                <span className="tqh-detail-total">{PESO(parseFloat(it.lineTotal ?? "0"))}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ESTILOS
// =============================================================================

const TQH_STYLES = `
.tqh {
  --c-primary: #E8590C;
  --c-primary-dark: #C2410C;
  --c-primary-soft: #FFF1E6;
  --c-surface: #FFFFFF;
  --c-bg: #F5F1EC;
  --c-text: #1C1917;
  --c-muted: #78716C;
  --c-border: rgba(0,0,0,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh; background: var(--c-bg); color: var(--c-text);
}
.tqh-loader { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F5F1EC; }
.tqh-noaccess { background: #fff; border-radius: 24px; padding: 32px; text-align: center; max-width: 380px; }
.tqh-noaccess h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; }
.tqh-noaccess p { font-size: 14px; color: var(--c-muted); margin: 0 0 20px; }

.tqh-header {
  position: sticky; top: 0; z-index: 20; background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  display: flex; align-items: center; gap: 12px; padding: 10px 16px;
}
.tqh-back {
  display: flex; align-items: center; gap: 6px; border: none; background: none;
  cursor: pointer; color: var(--c-muted); font-size: 14px; font-weight: 600;
  padding: 6px 10px; border-radius: 8px;
}
.tqh-back:hover { background: var(--c-bg); color: var(--c-text); }
.tqh-title { display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center; }
.tqh-title-text { font-size: 18px; font-weight: 700; font-family: Georgia, serif; }

.tqh-content { max-width: 640px; margin: 0 auto; padding: 16px 16px 60px; }

/* SELECTOR FECHA */
.tqh-datebar {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: 14px; padding: 8px;
}
.tqh-date-arrow {
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: var(--c-bg); cursor: pointer; color: var(--c-text);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tqh-date-arrow:hover:not(:disabled) { background: var(--c-primary-soft); color: var(--c-primary); }
.tqh-date-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.tqh-date-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
.tqh-date-input {
  border: none; background: none; font-size: 16px; font-weight: 700;
  color: var(--c-text); text-align: center; cursor: pointer; font-family: inherit;
}
.tqh-today-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  background: var(--c-primary-soft); color: var(--c-primary-dark);
  padding: 3px 8px; border-radius: 999px;
}

/* CORTE DE CAJA */
.tqh-corte {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: 18px; overflow: hidden; margin-bottom: 20px;
}
.tqh-corte-main {
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-dark));
  color: white; padding: 20px;
}
.tqh-corte-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;
}
.tqh-corte-total { font-size: 40px; font-weight: 800; line-height: 1.1; margin-top: 4px; font-family: Georgia, serif; }
.tqh-corte-count { font-size: 14px; opacity: 0.85; margin-top: 2px; }
.tqh-corte-breakdown { display: flex; padding: 4px; }
.tqh-corte-method {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 14px 8px; text-align: center;
}
.tqh-corte-method:not(:last-child) { border-right: 1px solid var(--c-border); }
.tqh-corte-method-label { font-size: 12px; color: var(--c-muted); font-weight: 600; }
.tqh-corte-method-val { font-size: 16px; font-weight: 800; color: var(--c-text); }

/* LISTA ORDENES */
.tqh-orders-head { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--c-muted); margin-bottom: 10px; }
.tqh-orders { display: flex; flex-direction: column; gap: 8px; }
.tqh-order { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; overflow: hidden; }
.tqh-order-main {
  width: 100%; display: flex; align-items: center; gap: 12px; border: none;
  background: none; cursor: pointer; padding: 12px 14px; text-align: left;
}
.tqh-order-main:hover { background: var(--c-bg); }
.tqh-order-folio {
  font-size: 18px; font-weight: 800; color: var(--c-primary);
  font-family: Georgia, serif; flex-shrink: 0; min-width: 42px;
}
.tqh-order-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tqh-order-line1 { display: flex; align-items: center; gap: 10px; }
.tqh-order-mode { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: var(--c-text); }
.tqh-order-time { font-size: 12px; color: var(--c-muted); }
.tqh-order-line2 { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--c-muted); }
.tqh-order-items-count { color: var(--c-muted); }
.tqh-order-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.tqh-order-total { font-size: 17px; font-weight: 800; color: var(--c-text); }
.tqh-order-chev { color: var(--c-muted); transition: transform 0.2s ease; }
.tqh-order-chev.is-open { transform: rotate(180deg); }

.tqh-order-detail { border-top: 1px solid var(--c-border); padding: 8px 14px 12px; background: var(--c-bg); }
.tqh-detail-empty { font-size: 13px; color: var(--c-muted); text-align: center; padding: 8px; }
.tqh-detail-item { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; }
.tqh-detail-item:not(:last-child) { border-bottom: 1px dashed var(--c-border); }
.tqh-detail-qty { font-size: 14px; font-weight: 800; color: var(--c-primary); flex-shrink: 0; min-width: 28px; }
.tqh-detail-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tqh-detail-name { font-size: 14px; font-weight: 600; color: var(--c-text); }
.tqh-detail-mods { font-size: 12px; color: var(--c-muted); }
.tqh-detail-total { font-size: 14px; font-weight: 700; color: var(--c-text); flex-shrink: 0; }

.tqh-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 50px 20px; color: var(--c-muted); text-align: center;
}
.tqh-btn-primary {
  border: none; cursor: pointer; background: var(--c-primary); color: white;
  border-radius: 11px; padding: 11px 22px; font-size: 15px; font-weight: 700;
}
.tqh-btn-primary:hover { background: var(--c-primary-dark); }
`;
