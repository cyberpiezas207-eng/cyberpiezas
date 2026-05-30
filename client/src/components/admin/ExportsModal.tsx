// ============================================================================
// MODAL "Exportar datos" - descargar CSVs del centro personal
// ----------------------------------------------------------------------------
// 4 secciones (cards) para descargar:
//   - Gastos personales (todos)
//   - Historial de precios (alacena)
//   - Alacena (productos con estado actual)
//   - Lista de compra (lo pendiente)
//
// Cada card llama un endpoint diferente y dispara descarga del navegador.
// Overlay propio con ESC, X y clic fuera.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X,
  Download,
  Wallet,
  LineChart,
  Package,
  ShoppingBasket,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type ExportKey = "expenses" | "prices" | "pantry" | "shoppingList";

interface ExportOption {
  key: ExportKey;
  title: string;
  description: string;
  icon: typeof Wallet;
  color: string; // tailwind base, ej: "orange", "amber", "emerald", "cyan"
}

const OPTIONS: ExportOption[] = [
  {
    key: "expenses",
    title: "Gastos personales",
    description: "Todos tus gastos con fecha, monto, categoria, tienda y metodo de pago.",
    icon: Wallet,
    color: "orange",
  },
  {
    key: "prices",
    title: "Historial de precios",
    description: "Precios registrados por producto y tienda con fechas.",
    icon: LineChart,
    color: "amber",
  },
  {
    key: "pantry",
    title: "Alacena",
    description: "Productos con estado actual, ultimo precio y veces comprado.",
    icon: Package,
    color: "emerald",
  },
  {
    key: "shoppingList",
    title: "Lista de compra",
    description: "Productos pendientes de comprar con prioridad y precio referencia.",
    icon: ShoppingBasket,
    color: "cyan",
  },
];

// Mapeo color base -> clases (Tailwind purgea variables dinamicas asi que
// las dejamos explicitas).
const COLOR_STYLES: Record<
  string,
  { cardBg: string; border: string; iconBg: string; iconRing: string; iconText: string; btnBg: string }
> = {
  orange: {
    cardBg: "from-orange-950/50 via-slate-800 to-slate-800/90",
    border: "border-orange-500/40 hover:border-orange-400/60",
    iconBg: "bg-orange-500/20",
    iconRing: "ring-orange-400/30",
    iconText: "text-orange-300",
    btnBg: "bg-orange-600 hover:bg-orange-700",
  },
  amber: {
    cardBg: "from-amber-950/50 via-slate-800 to-slate-800/90",
    border: "border-amber-500/40 hover:border-amber-400/60",
    iconBg: "bg-amber-500/20",
    iconRing: "ring-amber-400/30",
    iconText: "text-amber-300",
    btnBg: "bg-amber-600 hover:bg-amber-700",
  },
  emerald: {
    cardBg: "from-emerald-950/50 via-slate-800 to-slate-800/90",
    border: "border-emerald-500/40 hover:border-emerald-400/60",
    iconBg: "bg-emerald-500/20",
    iconRing: "ring-emerald-400/30",
    iconText: "text-emerald-300",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
  },
  cyan: {
    cardBg: "from-cyan-950/50 via-slate-800 to-slate-800/90",
    border: "border-cyan-500/40 hover:border-cyan-400/60",
    iconBg: "bg-cyan-500/20",
    iconRing: "ring-cyan-400/30",
    iconText: "text-cyan-300",
    btnBg: "bg-cyan-600 hover:bg-cyan-700",
  },
};

// Helper: dispara descarga en el navegador
function triggerDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar memoria del blob
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportsModal({ onClose }: Props) {
  // Estado: cual export se esta descargando (para mostrar spinner por card)
  const [loadingKey, setLoadingKey] = useState<ExportKey | null>(null);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const utils = trpc.useUtils();

  async function handleExport(key: ExportKey) {
    setLoadingKey(key);
    try {
      let result: { filename: string; csv: string };
      if (key === "expenses") {
        result = await utils.personalExports.expenses.fetch();
      } else if (key === "prices") {
        result = await utils.personalExports.prices.fetch();
      } else if (key === "pantry") {
        result = await utils.personalExports.pantry.fetch();
      } else {
        result = await utils.personalExports.shoppingList.fetch();
      }
      triggerDownload(result.filename, result.csv);
      toast.success(`Descargado: ${result.filename}`);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo exportar");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con orbs */}
        <div className="relative overflow-hidden border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <div className="absolute -top-16 -right-12 w-40 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative p-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                    Tu data, tuya
                  </span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Exportar datos
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[12px] text-slate-400 px-1">
            Descarga tus datos en formato CSV compatible con Excel, Google Sheets,
            Numbers y cualquier hoja de calculo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPTIONS.map((opt) => {
              const styles = COLOR_STYLES[opt.color];
              const Icon = opt.icon;
              const isLoading = loadingKey === opt.key;
              return (
                <Card
                  key={opt.key}
                  className={`relative overflow-hidden bg-gradient-to-br ${styles.cardBg} border ${styles.border} shadow-md transition-all`}
                >
                  <div
                    className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl ${styles.iconBg}`}
                  />
                  <CardContent className="relative p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${styles.iconBg} ring-1 ${styles.iconRing} flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${styles.iconText}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">
                          {opt.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport(opt.key)}
                      disabled={loadingKey !== null}
                      className={`${styles.btnBg} text-white shadow-md disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar CSV
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 text-center px-2 pt-2 leading-relaxed">
            Los archivos vienen con codificacion UTF-8 (acentos y emojis correctos
            en Excel). Tus datos son siempre tuyos.
          </p>
        </div>
      </div>
    </div>
  );
}
