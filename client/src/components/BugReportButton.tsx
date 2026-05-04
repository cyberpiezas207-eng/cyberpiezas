import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Send, CheckCircle2 } from "lucide-react";

// Mapa de rutas a nombre legible del punto de venta
const POS_ROUTE_LABELS: Record<string, string> = {
  "/pos": "Punto de Venta — Boutique",
  "/abarrotes-pos": "Punto de Venta — Abarrotes",
  "/celine": "Punto de Venta — CELINE",
  "/sales": "Ventas — Boutique",
  "/products": "Productos",
  "/variants": "Variantes",
  "/categories": "Categorías",
  "/branches": "Sucursales",
  "/inventory-reports": "Reportes de Inventario",
  "/dashboard": "Dashboard",
  "/cajeros-usuarios": "Cajeros y Usuarios",
  "/settings/pos-hardware": "Configuración de Tienda",
  "/subscription": "Mi Suscripción",
  "/notifications": "Notificaciones",
  "/admin-cyberpiezas": "Panel CyberPiezas",
};

function getLocationLabel(path: string): string {
  return POS_ROUTE_LABELS[path] ?? `Página: ${path}`;
}

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const { user } = useAuth();
  const [location] = useLocation();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posLabel = getLocationLabel(location);
  const userName = user?.name ?? "Usuario desconocido";
  const userEmail = user?.email ?? "sin-email";
  const businessName = (user as any)?.businessName ?? "";

  const handleOpen = () => {
    setOpen(true);
    setStatus("idle");
    setDescription("");
  };

  const handleClose = () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setOpen(false);
    setStatus("idle");
    setDescription("");
  };

  const handleSend = () => {
    if (!description.trim()) return;

    setStatus("sending");

    // Construir el cuerpo del reporte
    const subject = `[CyberPiezas] Reporte de problema — ${posLabel}`;
    const body = [
      `REPORTE DE PROBLEMA`,
      `==================`,
      `Usuario: ${userName}`,
      `Email: ${userEmail}`,
      businessName ? `Negocio: ${businessName}` : null,
      `Ubicación: ${posLabel}`,
      `Ruta: ${location}`,
      `Fecha: ${new Date().toLocaleString("es-MX")}`,
      ``,
      `DESCRIPCIÓN DEL PROBLEMA:`,
      description.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    // Crear un <a> oculto y dispararlo sin abrir pestaña visible
    // En navegadores modernos, mailto: en un iframe oculto no interrumpe la página
    try {
      const mailtoUrl = `mailto:cyberpiezas207@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Método 1: iframe oculto (no abre pestaña)
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = mailtoUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);

      // Mostrar éxito inmediatamente
      setStatus("success");
      successTimerRef.current = setTimeout(() => {
        handleClose();
      }, 3000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {/* Botón flotante — esquina inferior izquierda */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-slate-800/90 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur hover:bg-slate-700 hover:border-primary/40 hover:text-white transition-all"
          title="Reportar un problema"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <span className="hidden sm:inline">¿Algo no funciona?</span>
        </button>
      )}

      {/* Panel del formulario */}
      {open && (
        <div className="fixed bottom-5 left-5 z-50 w-80 rounded-2xl border border-border bg-slate-900/95 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-foreground">Reportar problema</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {status === "success" ? (
              /* Mensaje de éxito */
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-sm font-semibold text-foreground">¡Reporte enviado!</p>
                <p className="text-xs text-muted-foreground">Gracias, lo atenderemos pronto.</p>
              </div>
            ) : (
              <>
                {/* Contexto automático */}
                <div className="rounded-lg bg-secondary/40 border border-border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p><span className="text-foreground/70">Desde:</span> {posLabel}</p>
                  {businessName && <p><span className="text-foreground/70">Negocio:</span> {businessName}</p>}
                  <p><span className="text-foreground/70">Usuario:</span> {userName}</p>
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">¿Qué está pasando?</label>
                  <textarea
                    autoFocus
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el problema con el mayor detalle posible..."
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                {status === "error" && (
                  <p className="text-xs text-red-400">No se pudo enviar. Intenta de nuevo.</p>
                )}

                <Button
                  onClick={handleSend}
                  disabled={!description.trim() || status === "sending"}
                  size="sm"
                  className="w-full gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {status === "sending" ? "Enviando..." : "Enviar reporte"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
