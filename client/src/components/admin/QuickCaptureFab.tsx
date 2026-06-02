// ============================================================================
// QUICK CAPTURE FAB v2 (Captura Universal)
// ----------------------------------------------------------------------------
// Boton flotante en esquina inferior derecha de /admin-cyberpiezas.
// V2: SIN TABS. El usuario escribe lo que sea, el detector clasifica solo
// a que cerebro va (gasto / deuda / combustible).
//
// Comportamiento:
//   - High confidence (>= 0.65): clasifica automatico, muestra chip
//   - Medium (0.4-0.65): clasifica + muestra chips de override
//   - Low (< 0.4) o unknown: muestra los 3 chips para elegir
//
// Endpoints reusados (cero backend nuevo):
//   - personalExpenses.expenses.previewCapture + quickCreate
//   - personalDebts.debts.previewCapture + quickCreate
//   - personalVehicles.fuelLogs.previewCapture + quickCreate
//
// Tema: indigo-cyan palacio fino.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect, useMemo } from "react";
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
  Fuel,
  Bell,
  Package,
  AlertCircle,
  Wand2,
} from "lucide-react";
import {
  detectCaptureIntent,
  type CaptureKind,
} from "@/lib/captureIntentDetector";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

// ----------------------------------------------------------------------------
// Tema por kind
// ----------------------------------------------------------------------------

const KIND_THEME: Record<
  Exclude<CaptureKind, "unknown">,
  {
    label: string;
    icon: typeof Wallet;
    chipBg: string;
    chipBorder: string;
    chipText: string;
    buttonBg: string;
  }
> = {
  gasto: {
    label: "Gasto",
    icon: Wallet,
    chipBg: "bg-emerald-500/20",
    chipBorder: "border-emerald-400/50",
    chipText: "text-emerald-200",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700",
  },
  deuda: {
    label: "Deuda",
    icon: CreditCard,
    chipBg: "bg-rose-500/20",
    chipBorder: "border-rose-400/50",
    chipText: "text-rose-200",
    buttonBg: "bg-rose-600 hover:bg-rose-700",
  },
  fuel: {
    label: "Gasolina",
    icon: Fuel,
    chipBg: "bg-cyan-500/20",
    chipBorder: "border-cyan-400/50",
    chipText: "text-cyan-200",
    buttonBg: "bg-cyan-600 hover:bg-cyan-700",
  },
  reminder: {
    label: "Recordatorio",
    icon: Bell,
    chipBg: "bg-indigo-500/20",
    chipBorder: "border-indigo-400/50",
    chipText: "text-indigo-200",
    buttonBg: "bg-indigo-600 hover:bg-indigo-700",
  },
  pantry: {
    label: "Alacena",
    icon: Package,
    chipBg: "bg-amber-500/20",
    chipBorder: "border-amber-400/50",
    chipText: "text-amber-200",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
  },
};

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function QuickCaptureFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  // Override manual del usuario (null = usar detector automatico)
  const [override, setOverride] = useState<CaptureKind | null>(null);

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

  // --- Detector de intent (memoizado) ---
  const intent = useMemo(() => detectCaptureIntent(debounced), [debounced]);

  // Kind activo: override manual > detector
  const activeKind: CaptureKind = override ?? intent.kind;

  // Reset override cuando se borra todo el texto
  useEffect(() => {
    if (!text) setOverride(null);
  }, [text]);

  // --- Queries (solo activa la del kind correcto) ---
  const previewGasto = trpc.personalExpenses.expenses.previewCapture.useQuery(
    { text: debounced },
    { enabled: isOpen && activeKind === "gasto" && debounced.length > 0 },
  );
  const previewDeuda = trpc.personalDebts.debts.previewCapture.useQuery(
    { text: debounced },
    { enabled: isOpen && activeKind === "deuda" && debounced.length > 0 },
  );
  const previewFuel = trpc.personalVehicles.fuelLogs.previewCapture.useQuery(
    { text: debounced },
    { enabled: isOpen && activeKind === "fuel" && debounced.length > 0 },
  );
  const previewReminder = trpc.personalReminders.reminders.previewCapture.useQuery(
    { text: debounced },
    { enabled: isOpen && activeKind === "reminder" && debounced.length > 0 },
  );
  const previewPantry = trpc.personalPantry.items.previewCapture.useQuery(
    { text: debounced },
    { enabled: isOpen && activeKind === "pantry" && debounced.length > 0 },
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

  const createFuel = trpc.personalVehicles.fuelLogs.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Carga de gasolina creada");
      utils.personalVehicles.fuelLogs.list.invalidate();
      utils.personalVehicles.stats.dashboard.invalidate();
      resetAndClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const createReminder = trpc.personalReminders.reminders.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Recordatorio creado");
      utils.personalReminders.reminders.list.invalidate();
      utils.personalReminders.stats.dashboard.invalidate();
      resetAndClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const createPantry = trpc.personalPantry.items.quickCreate.useMutation({
    onSuccess: (res: any) => {
      const productName = res?.item?.name ?? "Producto";
      if (res?.action === "added") {
        toast.success(`Agregado: ${productName}`);
      } else if (res?.action === "restocked") {
        toast.success(`Recargado: ${productName} al 100%`);
      } else if (res?.action === "marked_low") {
        toast.success(`Marcado bajo: ${productName}`);
      } else if (res?.action === "marked_out") {
        toast.success(`Marcado agotado: ${productName}`);
      } else {
        toast.success("Alacena actualizada");
      }
      utils.personalPantry.items.list.invalidate();
      utils.personalPantry.stats.get.invalidate();
      resetAndClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  function resetAndClose() {
    setText("");
    setDebounced("");
    setOverride(null);
    setIsOpen(false);
  }

  function closeModal() {
    setIsOpen(false);
  }

  // --- canCreate logic ---
  const canCreateGasto =
    activeKind === "gasto" &&
    previewGasto.data != null &&
    (previewGasto.data.amount ?? 0) > 0;

  const debtDetection = previewDeuda.data;
  const canCreateDeuda =
    activeKind === "deuda" &&
    debtDetection != null &&
    (debtDetection.intent === "new_debt" ||
      debtDetection.intent === "purchase_installment") &&
    !!debtDetection.creditorName &&
    !!debtDetection.conceptName &&
    (debtDetection.confidence ?? 0) >= 0.7;

  const canCreateFuel =
    activeKind === "fuel" &&
    previewFuel.data != null &&
    ((previewFuel.data as any).amountPaid ?? 0) > 0;

  const canCreateReminder =
    activeKind === "reminder" &&
    previewReminder.data != null &&
    !!previewReminder.data.title &&
    (previewReminder.data.confidence ?? 0) >= 0.5;

  const canCreatePantry =
    activeKind === "pantry" &&
    previewPantry.data != null &&
    !!previewPantry.data.productName &&
    (previewPantry.data.confidence ?? 0) >= 0.5;

  const canCreate =
    canCreateGasto || canCreateDeuda || canCreateFuel || canCreateReminder || canCreatePantry;
  const isLoading =
    createGasto.isPending ||
    createDeuda.isPending ||
    createFuel.isPending ||
    createReminder.isPending ||
    createPantry.isPending;

  function handleSubmit() {
    if (!text.trim() || !canCreate) return;
    if (canCreateGasto) {
      createGasto.mutate({ text: text.trim() });
    } else if (canCreateDeuda) {
      createDeuda.mutate({ text: text.trim() });
    } else if (canCreateFuel) {
      createFuel.mutate({ text: text.trim() });
    } else if (canCreateReminder) {
      createReminder.mutate({ text: text.trim() });
    } else if (canCreatePantry) {
      createPantry.mutate({ text: text.trim() });
    }
  }

  const activeTheme = activeKind !== "unknown" ? KIND_THEME[activeKind] : null;

  // Mostrar chips manuales si:
  //   - El detector no esta seguro (medium/low confidence)
  //   - O el usuario ya hizo override
  const showManualChips =
    debounced.length > 0 &&
    (intent.kind === "unknown" || intent.confidence < 0.65 || override != null);

  return (
    <>
      {/* === FAB Button === */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-2xl hover:shadow-cyan-500/30 z-40 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        title="Captura rapida universal"
        aria-label="Abrir captura rapida"
      >
        <Plus className="w-6 h-6 text-white" />
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
                  <Wand2 className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                    Captura universal
                  </p>
                  <h2 className="text-base font-black text-white tracking-tight">
                    Yo descubro a donde va
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
              {/* Input principal */}
              <div>
                <Input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ej: pollo 100 pesos 2kg · deuda coppel 990 · recordar luz dia 12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate && !isLoading) {
                      handleSubmit();
                    }
                  }}
                  className="bg-slate-800/60 border-slate-700 text-white text-base h-12 placeholder:text-slate-500"
                />
              </div>

              {/* Banner de intent detectado */}
              {debounced.length > 0 && activeTheme && (
                <div
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${activeTheme.chipBg} border ${activeTheme.chipBorder}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <activeTheme.icon className={`w-4 h-4 ${activeTheme.chipText} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                        {override
                          ? "Tu elegiste"
                          : intent.confidence >= 0.65
                            ? "Detectado"
                            : "Probablemente"}
                      </p>
                      <p className={`text-sm font-black ${activeTheme.chipText} leading-tight mt-0.5`}>
                        {activeTheme.label}
                        {!override && intent.confidence > 0 && (
                          <span className="text-[10px] font-normal text-slate-500 ml-1.5">
                            ({Math.round(intent.confidence * 100)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {override && (
                    <button
                      onClick={() => setOverride(null)}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-700/50"
                    >
                      Auto
                    </button>
                  )}
                </div>
              )}

              {/* Chips de override manual (cuando confianza media/baja) */}
              {showManualChips && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {intent.kind === "unknown"
                      ? "No estoy seguro. Elige tu:"
                      : "O cambia a:"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {(["gasto", "deuda", "fuel", "reminder", "pantry"] as const).map((k) => {
                      const theme = KIND_THEME[k];
                      const isActive = activeKind === k;
                      return (
                        <button
                          key={k}
                          onClick={() => setOverride(k)}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                            isActive
                              ? `${theme.chipBg} ${theme.chipBorder} ${theme.chipText}`
                              : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                          }`}
                        >
                          <theme.icon className="w-3.5 h-3.5" />
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview en vivo (segun el kind activo) */}
              {debounced.length > 0 && activeKind !== "unknown" && (
                <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3 min-h-[60px]">
                  {/* GASTO */}
                  {activeKind === "gasto" &&
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
                                backgroundColor: previewGasto.data.category.color + "22",
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
                  {activeKind === "deuda" &&
                    (previewDeuda.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewDeuda.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado{" "}
                          <span className="text-slate-600">
                            (confianza {Math.round((previewDeuda.data.confidence ?? 0) * 100)}%)
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
                              {previewDeuda.data.currentInstallment ?? 0}/{previewDeuda.data.totalInstallments} pagos
                            </span>
                          )}
                          {previewDeuda.data.isMsi && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                              MSI
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Sin deteccion</p>
                    ))}

                  {/* FUEL */}
                  {activeKind === "fuel" &&
                    (previewFuel.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewFuel.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {(previewFuel.data as any).amountPaid > 0 ? (
                            <span className="text-base font-black text-cyan-300">
                              {fmt((previewFuel.data as any).amountPaid)}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">sin monto</span>
                          )}
                          {(previewFuel.data as any).pricePerLiter != null && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-slate-200">
                              {fmt((previewFuel.data as any).pricePerLiter)}/L
                            </span>
                          )}
                          {(previewFuel.data as any).odometerReading != null && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-cyan-500/15 text-cyan-200">
                              {(previewFuel.data as any).odometerReading} km
                            </span>
                          )}
                          {(previewFuel.data as any).storeKeyword && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-slate-200">
                              {(previewFuel.data as any).storeKeyword}
                            </span>
                          )}
                          {(previewFuel.data as any).tankPercentBefore != null && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-700 text-slate-300">
                              tanque {(previewFuel.data as any).tankPercentBefore}%
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Sin deteccion</p>
                    ))}

                  {/* RECORDATORIO */}
                  {activeKind === "reminder" &&
                    (previewReminder.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewReminder.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado{" "}
                          <span className="text-slate-600">
                            ({Math.round((previewReminder.data.confidence ?? 0) * 100)}%)
                          </span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {previewReminder.data.title ? (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-200">
                              {previewReminder.data.title}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">
                              sin titulo
                            </span>
                          )}
                          {previewReminder.data.dueDate && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                              📅 {previewReminder.data.dueDate}
                            </span>
                          )}
                          {previewReminder.data.dueDay != null && !previewReminder.data.dueDate && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                              📅 dia {previewReminder.data.dueDay}
                            </span>
                          )}
                          {previewReminder.data.dueTime && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200">
                              🕐 {previewReminder.data.dueTime}
                            </span>
                          )}
                          {previewReminder.data.isRecurring && previewReminder.data.recurrencePattern && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                              🔁 {previewReminder.data.recurrencePattern}
                            </span>
                          )}
                          {previewReminder.data.priority && previewReminder.data.priority !== "normal" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              {previewReminder.data.priority}
                            </span>
                          )}
                          {previewReminder.data.tags && previewReminder.data.tags.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-700 text-cyan-300">
                              #{previewReminder.data.tags.join(" #")}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Sin deteccion</p>
                    ))}

                  {/* ALACENA / PANTRY */}
                  {activeKind === "pantry" &&
                    (previewPantry.isLoading ? (
                      <p className="text-xs text-slate-500">Analizando...</p>
                    ) : previewPantry.data ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Detectado{" "}
                          <span className="text-slate-600">
                            ({Math.round((previewPantry.data.confidence ?? 0) * 100)}%)
                          </span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {previewPantry.data.productName ? (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-200">
                              {previewPantry.data.productName}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">
                              sin producto
                            </span>
                          )}
                          {previewPantry.data.intent === "mark_low" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300">
                              ⚠ marcar bajo
                            </span>
                          )}
                          {previewPantry.data.intent === "mark_out" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300">
                              ✗ se acabo
                            </span>
                          )}
                          {previewPantry.data.quantity != null && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-slate-200">
                              {previewPantry.data.quantity} {previewPantry.data.unit ?? ""}
                            </span>
                          )}
                          {previewPantry.data.totalPrice != null && (
                            <span className="text-amber-300 font-black">
                              {fmt(previewPantry.data.totalPrice)}
                            </span>
                          )}
                          {previewPantry.data.unitPrice != null && previewPantry.data.unit && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-700 text-slate-300">
                              {fmt(previewPantry.data.unitPrice)}/{previewPantry.data.unit}
                            </span>
                          )}
                          {previewPantry.data.storeName && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-slate-200">
                              {previewPantry.data.storeName}
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
              {debounced.length > 0 && !canCreate && !isLoading && activeKind !== "unknown" && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200 leading-snug">
                    {activeKind === "gasto"
                      ? "Necesito un monto. Intenta: '[tienda] [producto] [precio]'"
                      : activeKind === "deuda"
                        ? "Necesito acreedor + concepto + monto. Intenta: 'deuda [acreedor] [concepto] [monto] [X/Y]'"
                        : activeKind === "fuel"
                          ? "Necesito monto. Intenta: 'pemex 500 gasolina'"
                          : activeKind === "reminder"
                            ? "Necesito titulo claro. Intenta: 'recordar [que] [cuando]'"
                            : "Necesito producto. Intenta: 'pollo 100 pesos 2 kg' o 'se acabo arroz'"}
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
                  className={`flex-1 ${activeTheme?.buttonBg ?? "bg-slate-700 hover:bg-slate-600"} text-white shadow-md disabled:opacity-50`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isLoading ? "Guardando..." : "Agregar"}
                </Button>
              </div>

              {/* Hint */}
              <p className="text-[10px] text-slate-500 text-center">
                <Sparkles className="w-3 h-3 inline-block mr-0.5 mb-0.5 text-cyan-400/60" />
                El detector aprende a clasificar tu captura · presiona{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  Enter
                </kbd>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
