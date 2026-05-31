// ============================================================================
// QUICK CAPTURE FAB (Floating Action Button)
// ----------------------------------------------------------------------------
// Boton flotante en esquina inferior derecha de /admin-cyberpiezas.
// Click -> abre modal premium con tabs Gasto / Deuda.
// Cada tab usa el cerebro de su modulo para preview en vivo.
// Submit -> quickCreate directo sin entrar al modulo.
//
// Endpoints reusados (cero backend nuevo):
//   - personalExpenses.expenses.previewCapture + quickCreate
//   - personalDebts.debts.previewCapture + quickCreate
//
// Tema: indigo-cyan palacio fino.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  X,
  Sparkles,
  Wallet,
  CreditCard,
  AlertCircle,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

type Mode = "gasto" | "deuda";

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function QuickCaptureFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("gasto");
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  const utils = trpc.useUtils();

  // Debounce 200ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 200);
    return () => clearTimeout(t);
  }, [text]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // --- Queries ---
  const previewGasto = trpc.personalExpenses.expenses.previewCapture.useQuery(
    { text: debounced },
    {
      enabled: isOpen && mode === "gasto" && debounced.length > 0,
    },
  );
  const previewDeuda = trpc.personalDebts.debts.previewCapture.useQuery(
    { text: debounced },
    {
      enabled: isOpen && mode === "deuda" && debounced.length > 0,
    },
  );

  // --- Mutations ---
  const createGasto = trpc.personalExpenses.expenses.quickCreate.useMutation({
    onSuccess: (res: any) => {
      const cat = res?.category
        ? `${res.category.icon} ${res.category.name}`
        : "Sin clasificar";
      toast.success(`Gasto creado · ${cat}`);
      utils.personalExpenses.expenses.list.invalidate();
      utils.personalExpenses.stats.dashboard.invalidate();
      utils.personalFinanceOverview.getOverview.invalidate();
      resetAndClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const createDeuda = trpc.personalDebts.debts.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Deuda creada");
      utils.personalDebts.debts.list.invalidate();
      utils.personalDebts.stats.monthSummary.invalidate();
      utils.personalDebts.stats.upcoming.invalidate();
      resetAndClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  function resetAndClose() {
    setText("");
    setDebounced("");
    setIsOpen(false);
  }

  function closeModal() {
    setIsOpen(false);
  }

  // --- canCreate logic ---
  const canCreateGasto =
    mode === "gasto" &&
    previewGasto.data != null &&
    (previewGasto.data.amount ?? 0) > 0;

  const debtDetection = previewDeuda.data;
  const canCreateDeuda =
    mode === "deuda" &&
    debtDetection != null &&
    (debtDetection.intent === "new_debt" ||
      debtDetection.intent === "purchase_installment") &&
    !!debtDetection.creditorName &&
    !!debtDetection.conceptName &&
    (debtDetection.confidence ?? 0) >= 0.7;

  const canCreate = canCreateGasto || canCreateDeuda;
  const isLoading = createGasto.isPending || createDeuda.isPending;

  function handleSubmit() {
    if (!text.trim()) return;
    if (canCreateGasto) {
      createGasto.mutate({ text: text.trim() });
    } else if (canCreateDeuda) {
      createDeuda.mutate({ text: text.trim() });
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    // No limpiar texto: el usuario puede querer reusar
  }

  // --- Estilos por modo ---
  const modeColors = {
    gasto: {
      accent: "from-emerald-500 to-emerald-600",
      ring: "ring-emerald-400/40",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700",
      tabActive: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
      icon: Wallet,
    },
    deuda: {
      accent: "from-rose-500 to-rose-600",
      ring: "ring-rose-400/40",
      buttonBg: "bg-rose-600 hover:bg-rose-700",
      tabActive: "bg-rose-500/20 text-rose-200 border-rose-400/50",
      icon: CreditCard,
    },
  };
  const activeColors = modeColors[mode];

  return (
    <>
      {/* === FAB Button === */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-2xl hover:shadow-cyan-500/30 z-40 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        title="Captura rapida (gasto o deuda)"
        aria-label="Abrir captura rapida"
      >
        <Plus className="w-6 h-6 text-white" />
        {/* Ping animation para llamar la atencion */}
        <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping opacity-50 pointer-events-none" />
      </button>

      {/* === Modal === */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow indigo-cyan sutil */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative px-5 py-4 border-b border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                    Captura rapida
                  </p>
                  <h2 className="text-base font-black text-white tracking-tight">
                    Captura sin entrar al modulo
                  </h2>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-white p-1 shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="relative p-5 space-y-4">
              {/* Tabs Gasto / Deuda */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/40 rounded-xl">
                <button
                  onClick={() => switchMode("gasto")}
                  className={`relative flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all border ${
                    mode === "gasto"
                      ? modeColors.gasto.tabActive
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Gasto
                </button>
                <button
                  onClick={() => switchMode("deuda")}
                  className={`relative flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all border ${
                    mode === "deuda"
                      ? modeColors.deuda.tabActive
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Deuda
                </button>
              </div>

              {/* Input */}
              <div>
                <Input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    mode === "gasto"
                      ? "ej: pemex gasolina 500"
                      : "ej: deuda coppel bici 990 4/12"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate && !isLoading) {
                      handleSubmit();
                    }
                  }}
                  className="bg-slate-800/60 border-slate-700 text-white text-base h-12 placeholder:text-slate-500"
                />
              </div>

              {/* Preview en vivo */}
              {debounced.length > 0 && (
                <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3 min-h-[60px]">
                  {/* GASTO */}
                  {mode === "gasto" &&
                    (previewGasto.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewGasto.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {previewGasto.data.amount > 0 ? (
                            <span className="text-base font-black text-emerald-300">
                              {fmt(previewGasto.data.amount)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              sin monto
                            </span>
                          )}
                          {previewGasto.data.category ? (
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-bold"
                              style={{
                                backgroundColor:
                                  previewGasto.data.category.color + "22",
                                color: previewGasto.data.category.color,
                              }}
                            >
                              {previewGasto.data.category.icon}{" "}
                              {previewGasto.data.category.name}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-700 text-slate-300">
                              sin categoria
                            </span>
                          )}
                          {previewGasto.data.store && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-700 text-slate-200">
                              {previewGasto.data.store.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Sin deteccion</p>
                    ))}

                  {/* DEUDA */}
                  {mode === "deuda" &&
                    (previewDeuda.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewDeuda.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado{" "}
                          <span className="text-slate-600">
                            (confianza{" "}
                            {Math.round(
                              (previewDeuda.data.confidence ?? 0) * 100,
                            )}
                            %)
                          </span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {previewDeuda.data.creditorName ? (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-rose-500/20 text-rose-200">
                              {previewDeuda.data.creditorName}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">
                              sin acreedor
                            </span>
                          )}
                          {previewDeuda.data.conceptName ? (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-white">
                              {previewDeuda.data.conceptName}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">
                              sin concepto
                            </span>
                          )}
                          {previewDeuda.data.installmentAmount != null && (
                            <span className="text-rose-300 font-black">
                              {fmt(previewDeuda.data.installmentAmount)}/mes
                            </span>
                          )}
                          {previewDeuda.data.totalInstallments != null && (
                            <span className="text-slate-400">
                              {previewDeuda.data.currentInstallment ?? 0}/
                              {previewDeuda.data.totalInstallments} pagos
                            </span>
                          )}
                          {previewDeuda.data.isMsi && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                              MSI
                            </span>
                          )}
                          {previewDeuda.data.dueDate && (
                            <span className="text-slate-400">
                              📅 vence {previewDeuda.data.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Sin deteccion</p>
                    ))}
                </div>
              )}

              {/* Warning si captura pero no creable */}
              {debounced.length > 0 && !canCreate && !isLoading && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200 leading-snug">
                    {mode === "gasto"
                      ? "Necesito un monto. Intenta: '[tienda] [producto] [precio]'"
                      : "Necesito acreedor + concepto + monto. Intenta: 'deuda [acreedor] [concepto] [monto] [X/Y]'"}
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={closeModal}
                  className="flex-1 text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canCreate || isLoading}
                  className={`flex-1 ${activeColors.buttonBg} text-white shadow-md disabled:opacity-50`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isLoading ? "Guardando..." : "Agregar"}
                </Button>
              </div>

              {/* Hint */}
              <p className="text-[10px] text-slate-500 text-center">
                Tip: presiona{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  Enter
                </kbd>{" "}
                para guardar ·{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  Esc
                </kbd>{" "}
                para cerrar
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
