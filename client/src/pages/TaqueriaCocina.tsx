// >>> ESTE ARCHIVO VA EN: client/src/pages/TaqueriaCocina.tsx <<<
// =============================================================================
// TaqueriaCocina - Pantalla de cocina (KDS) para taqueria (PASO 6)
// -----------------------------------------------------------------------------
// Muestra las ordenes activas (no entregadas) como comandas grandes.
// Pensada para que el cocinero la vea de lejos, con las manos ocupadas:
//   - Tarjetas grandes por orden, con folio gigante
//   - Estados: preparando (amarillo) -> listo (verde) -> entregado (sale)
//   - Botones gigantes para cambiar estado de un toque
//   - Auto-refresh cada pocos segundos (no necesita tocar refrescar)
//   - SIN precios (la cocina no necesita dinero, solo que preparar)
//
// Conectada al backend (orders.listKitchen, orders.setKitchenStatus).
// Comentarios SIN ACENTOS por convencion del proyecto.
// =============================================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Store,
  Bike,
  ChefHat,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";

// Cada cuanto se refresca la pantalla (milisegundos)
const REFRESH_MS = 8000;

// Calcula minutos transcurridos desde una fecha ISO
function minutesAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 60000);
}

export default function TaqueriaCocina() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const accessQuery = trpc.taqueria.hasAccess.useQuery();
  const kitchenQuery = trpc.taqueria.orders.listKitchen.useQuery(undefined, {
    enabled: accessQuery.data?.hasAccess === true,
    refetchInterval: REFRESH_MS, // auto-refresh
    refetchOnWindowFocus: true,
  });

  const setStatusMut = trpc.taqueria.orders.setKitchenStatus.useMutation({
    onSuccess: () => {
      utils.taqueria.orders.listKitchen.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const orders = kitchenQuery.data ?? [];
  const preparando = orders.filter((o: any) => o.kitchenStatus === "preparando");
  const listas = orders.filter((o: any) => o.kitchenStatus === "listo");

  // ---------------------------------------------------------------------------
  // Acceso
  // ---------------------------------------------------------------------------
  if (accessQuery.isLoading) {
    return (
      <div className="tqc-loader">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.hasAccess) {
    return (
      <div className="tqc" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{TQC_STYLES}</style>
        <div className="tqc-noaccess">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌮</div>
          <h1>Cocina</h1>
          <p>Necesitas una suscripcion activa.</p>
          <button className="tqc-btn" onClick={() => setLocation("/sistemas")}>Regresar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tqc">
      <style>{TQC_STYLES}</style>

      {/* HEADER */}
      <header className="tqc-header">
        <button onClick={() => setLocation("/taqueria")} className="tqc-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">POS</span>
        </button>
        <div className="tqc-title">
          <ChefHat className="w-6 h-6" style={{ color: "#F59E0B" }} />
          <span className="tqc-title-text">Cocina</span>
        </div>
        <div className="tqc-counts">
          <span className="tqc-count tqc-count-prep">{preparando.length} preparando</span>
          <span className="tqc-count tqc-count-listo">{listas.length} listas</span>
        </div>
      </header>

      <div className="tqc-content">
        {kitchenQuery.isLoading ? (
          <div className="tqc-empty">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
            <p>Cargando comandas...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="tqc-empty">
            <ChefHat className="w-14 h-14 opacity-25" />
            <p className="tqc-empty-title">Sin pedidos pendientes</p>
            <p className="tqc-empty-sub">Las ordenes nuevas apareceran aqui automaticamente.</p>
          </div>
        ) : (
          <div className="tqc-grid">
            {/* Primero las que estan preparando, luego las listas */}
            {[...preparando, ...listas].map((o: any) => (
              <OrderCard
                key={o.id}
                order={o}
                busy={setStatusMut.isPending}
                onAdvance={(status) => setStatusMut.mutate({ orderId: o.id, kitchenStatus: status })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// OrderCard - una comanda de cocina
// -----------------------------------------------------------------------------

function OrderCard({
  order,
  busy,
  onAdvance,
}: {
  order: any;
  busy: boolean;
  onAdvance: (status: "preparando" | "listo" | "entregado") => void;
}) {
  const isListo = order.kitchenStatus === "listo";
  const mins = minutesAgo(order.createdAt);
  // Alerta visual si lleva mucho tiempo (mas de 10 min preparando)
  const urgent = !isListo && mins >= 10;

  return (
    <div className={`tqc-card ${isListo ? "is-listo" : "is-prep"} ${urgent ? "is-urgent" : ""}`}>
      {/* Cabecera: folio + tiempo + modo */}
      <div className="tqc-card-head">
        <span className="tqc-card-folio">#{order.folio}</span>
        <div className="tqc-card-meta">
          <span className="tqc-card-mode">
            {order.serviceMode === "aqui" ? <Store className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
            {order.serviceMode === "aqui" ? "Aqui" : "Llevar"}
          </span>
          <span className={`tqc-card-time ${urgent ? "is-urgent" : ""}`}>
            <Clock className="w-3.5 h-3.5" />
            {mins === 0 ? "ahora" : mins + " min"}
          </span>
        </div>
      </div>

      {/* Productos */}
      <div className="tqc-card-items">
        {(order.items ?? []).map((it: any) => (
          <div key={it.id} className="tqc-item">
            <span className="tqc-item-qty">{it.quantity}</span>
            <div className="tqc-item-main">
              <span className="tqc-item-name">{it.productName}</span>
              {it.modifiers && <span className="tqc-item-mods">{it.modifiers}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Boton de accion segun estado */}
      <div className="tqc-card-actions">
        {isListo ? (
          <button className="tqc-action tqc-action-entregar" disabled={busy} onClick={() => onAdvance("entregado")}>
            <CheckCheck className="w-5 h-5" />
            Entregar
          </button>
        ) : (
          <button className="tqc-action tqc-action-listo" disabled={busy} onClick={() => onAdvance("listo")}>
            <Check className="w-5 h-5" />
            Marcar listo
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ESTILOS - tema oscuro de cocina, alto contraste, para ver de lejos
// =============================================================================

const TQC_STYLES = `
.tqc {
  --bg: #0F172A;
  --surface: #1E293B;
  --surface-2: #334155;
  --text: #F1F5F9;
  --muted: #94A3B8;
  --prep: #F59E0B;
  --listo: #22C55E;
  --urgent: #EF4444;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh; background: var(--bg); color: var(--text);
}
.tqc-loader { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0F172A; }
.tqc-noaccess { background: #1E293B; border-radius: 24px; padding: 32px; text-align: center; max-width: 360px; color: #F1F5F9; }
.tqc-noaccess h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; }
.tqc-noaccess p { font-size: 14px; color: #94A3B8; margin: 0 0 20px; }
.tqc-btn { border: none; cursor: pointer; background: #F59E0B; color: #0F172A; border-radius: 11px; padding: 11px 22px; font-size: 15px; font-weight: 700; }

.tqc-header {
  position: sticky; top: 0; z-index: 20; background: var(--surface);
  border-bottom: 1px solid var(--surface-2);
  display: flex; align-items: center; gap: 12px; padding: 12px 18px;
}
.tqc-back {
  display: flex; align-items: center; gap: 6px; border: none; background: var(--surface-2);
  cursor: pointer; color: var(--text); font-size: 14px; font-weight: 600;
  padding: 8px 12px; border-radius: 9px;
}
.tqc-back:hover { background: #475569; }
.tqc-title { display: flex; align-items: center; gap: 8px; flex: 1; }
.tqc-title-text { font-size: 22px; font-weight: 800; }
.tqc-counts { display: flex; gap: 8px; }
.tqc-count { font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 999px; }
.tqc-count-prep { background: rgba(245,158,11,0.15); color: var(--prep); }
.tqc-count-listo { background: rgba(34,197,94,0.15); color: var(--listo); }

.tqc-content { padding: 18px; }
.tqc-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 80px 20px; color: var(--muted); text-align: center;
}
.tqc-empty-title { font-size: 20px; font-weight: 700; color: var(--text); }
.tqc-empty-sub { font-size: 14px; }

.tqc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* TARJETA DE COMANDA */
.tqc-card {
  background: var(--surface); border-radius: 18px; overflow: hidden;
  border: 2px solid transparent; display: flex; flex-direction: column;
}
.tqc-card.is-prep { border-color: var(--prep); }
.tqc-card.is-listo { border-color: var(--listo); opacity: 0.92; }
.tqc-card.is-urgent { border-color: var(--urgent); animation: tqcPulse 1.5s ease-in-out infinite; }
@keyframes tqcPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }

.tqc-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--surface-2);
}
.tqc-card-folio { font-size: 34px; font-weight: 800; line-height: 1; }
.tqc-card-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.tqc-card-mode { display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 700; color: var(--text); }
.tqc-card-time { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); }
.tqc-card-time.is-urgent { color: var(--urgent); font-weight: 700; }

.tqc-card-items { padding: 12px 16px; flex: 1; }
.tqc-item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; }
.tqc-item:not(:last-child) { border-bottom: 1px dashed var(--surface-2); }
.tqc-item-qty {
  flex-shrink: 0; min-width: 38px; height: 38px; border-radius: 10px;
  background: var(--surface-2); color: var(--text);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 800;
}
.tqc-item-main { flex: 1; min-width: 0; padding-top: 2px; }
.tqc-item-name { display: block; font-size: 19px; font-weight: 700; line-height: 1.2; }
.tqc-item-mods { display: block; font-size: 14px; color: var(--prep); font-weight: 600; margin-top: 2px; }

.tqc-card-actions { padding: 12px 16px; border-top: 1px solid var(--surface-2); }
.tqc-action {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  border: none; cursor: pointer; border-radius: 12px; padding: 16px;
  font-size: 18px; font-weight: 800; transition: transform 0.1s ease, filter 0.15s ease;
}
.tqc-action:active { transform: scale(0.97); }
.tqc-action:disabled { opacity: 0.6; cursor: not-allowed; }
.tqc-action-listo { background: var(--listo); color: #0F172A; }
.tqc-action-listo:hover:not(:disabled) { filter: brightness(1.1); }
.tqc-action-entregar { background: var(--surface-2); color: var(--text); }
.tqc-action-entregar:hover:not(:disabled) { background: #475569; }
`;
