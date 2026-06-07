// ============================================================================
// EDIT DEBT MODAL - Modal premium para editar una deuda existente
// ----------------------------------------------------------------------------
// Permite cambiar:
//   - Acreedor, concepto, notas
//   - Montos (original, cuota, balance)
//   - Avance (cuotas pagadas / total)
//   - Fechas (startDate "desde cuando estoy pagando", dueDay, nextDueDate)
//   - Estilo (color, icono, prioridad)
//
// MEJORA DE FECHAS (claridad):
//   - El "dia del mes" (1-31) AHORA muestra en vivo la proxima fecha real
//     que va a generar (ej: dia 25 -> "Proximo: 25 jun 2026").
//   - Boton de un toque para usar esa fecha calculada.
//   - El usuario puede sobreescribir la fecha exacta a mano si quiere.
//   - Se envia nextDueDate al backend para que la deuda cuente en el mes.
//
// REGLA CLAVE - SIN CONTAMINAR:
//   - Cambiar "cuotas pagadas" NO crea pagos retroactivos en la BD
//   - Solo ajusta currentInstallment + currentBalance
//   - Las graficas/metricas siguen mostrando solo pagos reales
//   - El startDate es informativo, NO genera gastos pasados
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X,
  Edit3,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  CalendarCheck,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// Calcula la proxima ocurrencia de un dia del mes (dueDay) desde hoy.
// Mismo algoritmo que el backend: si el dia ya paso este mes, salta al
// siguiente; respeta meses cortos (dia 31 en un mes de 30 usa el ultimo dia).
// Devuelve YYYY-MM-DD o null.
function resolveNextDueFromDueDay(dueDay: number | null): string | null {
  if (dueDay == null || dueDay < 1 || dueDay > 31) return null;
  const now = nowMexico();
  const todayDay = now.getDate();
  const clampDay = (y: number, mo: number, day: number): number => {
    const last = new Date(y, mo + 1, 0).getDate();
    return Math.min(day, last);
  };
  let y = now.getFullYear();
  let mo = now.getMonth(); // 0-based
  let day = clampDay(y, mo, dueDay);
  if (day < todayDay) {
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
    day = clampDay(y, mo, dueDay);
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Convierte YYYY-MM-DD a etiqueta legible "25 jun 2026". Null-safe.
function ymdToLabel(ymd: string | null): string {
  if (!ymd || ymd.length < 10) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// Catalogos visuales
const COLOR_PRESETS = [
  "#fb7185", // rose default
  "#f97316", // orange
  "#fbbf24", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

const ICON_PRESETS = ["💳", "💰", "🏪", "🚗", "📱", "🏠", "🎮", "🛒", "💼", "📦"];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja", color: "text-slate-400" },
  { value: "medium", label: "Media", color: "text-amber-400" },
  { value: "high", label: "Alta", color: "text-rose-400" },
] as const;

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

export interface EditDebtModalProps {
  open: boolean;
  debt: any | null; // La deuda completa a editar
  onClose: () => void;
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function EditDebtModal({
  open,
  debt,
  onClose,
}: EditDebtModalProps) {
  const utils = trpc.useUtils();

  // Form state - se hidrata cada vez que se abre con una deuda nueva
  const [creditorName, setCreditorName] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [currentInstallment, setCurrentInstallment] = useState("0");
  const [dueDay, setDueDay] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState(ICON_PRESETS[0]);

  // Hidratar campos al abrir el modal
  useEffect(() => {
    if (open && debt) {
      setCreditorName(debt.creditorName || "");
      setTitle(debt.title || "");
      setCategory(debt.category || "");
      setOriginalAmount(debt.originalAmount ? String(debt.originalAmount) : "");
      setInstallmentAmount(
        debt.installmentAmount ? String(debt.installmentAmount) : "",
      );
      setTotalInstallments(
        debt.totalInstallments ? String(debt.totalInstallments) : "",
      );
      setCurrentInstallment(String(debt.currentInstallment ?? 0));
      setDueDay(debt.dueDay ? String(debt.dueDay) : "");
      setNextDueDate(debt.nextDueDate || "");
      setStartDate(debt.startDate || "");
      setNotes(debt.notes || "");
      setPriority(debt.priority || "medium");
      setColor(debt.color || COLOR_PRESETS[0]);
      setIcon(debt.icon || ICON_PRESETS[0]);
    }
  }, [open, debt]);

  const updateMutation = trpc.personalDebts.debts.update.useMutation({
    onSuccess: () => {
      toast.success("Deuda actualizada");
      utils.personalDebts.debts.list.invalidate();
      utils.personalDebts.stats.monthSummary.invalidate();
      utils.personalDebts.stats.insights.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo actualizar"),
  });

  // Calculos derivados para preview
  const totalNum = parseInt(totalInstallments) || 0;
  const currentNum = parseInt(currentInstallment) || 0;
  const installmentNum = parseFloat(installmentAmount) || 0;
  const originalNum = parseFloat(originalAmount) || 0;
  const remaining = Math.max(0, totalNum - currentNum);
  const computedBalance =
    installmentNum > 0 && remaining > 0
      ? installmentNum * remaining
      : null;

  const tooManyInstallments = currentNum > totalNum && totalNum > 0;

  // ----- Logica de fecha (la mejora pedida) -----
  const dueDayNum = dueDay ? parseInt(dueDay) : null;
  const dueDayValid =
    dueDayNum != null && dueDayNum >= 1 && dueDayNum <= 31;
  // Fecha que GENERARIA el dia del mes elegido (preview en vivo)
  const previewFromDueDay = dueDayValid
    ? resolveNextDueFromDueDay(dueDayNum)
    : null;
  // La fecha que realmente se enviara: la manual si existe, si no la del dia
  const effectiveNextDue = nextDueDate || previewFromDueDay || null;
  // Si la fecha manual no coincide con lo que daria el dia, avisamos (no es error)
  const manualDiffersFromDay =
    nextDueDate &&
    previewFromDueDay &&
    nextDueDate !== previewFromDueDay;

  function handleClose() {
    if (updateMutation.isPending) return;
    onClose();
  }

  function handleSubmit() {
    if (!debt) return;
    if (!creditorName.trim()) {
      toast.error("El acreedor es obligatorio");
      return;
    }
    if (!title.trim()) {
      toast.error("El concepto es obligatorio");
      return;
    }
    if (tooManyInstallments) {
      toast.error("Las cuotas pagadas no pueden ser mas que el total");
      return;
    }

    // Construimos el payload solo con campos cambiados
    const payload: any = {
      id: debt.id,
      creditorName: creditorName.trim(),
      title: title.trim(),
      category: category.trim() || null,
      originalAmount: originalNum > 0 ? originalNum : null,
      installmentAmount: installmentNum > 0 ? installmentNum : null,
      totalInstallments: totalNum > 0 ? totalNum : null,
      currentInstallment: currentNum,
      dueDay: dueDayNum,
      // Enviar la fecha efectiva: manual si la pusiste, o la calculada del dia.
      // Asi la deuda SI cuenta en "Por pagar este mes".
      nextDueDate: effectiveNextDue,
      startDate: startDate || null,
      notes: notes.trim() || null,
      priority,
      color,
      icon,
    };

    // Si tenemos balance computable, lo enviamos para que quede sincronizado
    if (computedBalance != null) {
      payload.currentBalance = computedBalance;
    }

    updateMutation.mutate(payload);
  }

  if (!open || !debt) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700 shrink-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              backgroundColor: color + "22",
              border: `1px solid ${color}`,
            }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Editando deuda
            </p>
            <h3 className="text-base font-black text-white tracking-tight truncate">
              {creditorName || "Deuda"} · {title || "Sin titulo"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={updateMutation.isPending}
            type="button"
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">
          {/* SECCION: Info basica */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Tag className="w-3 h-3" />
              <span>Informacion</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Acreedor *
              </label>
              <input
                type="text"
                value={creditorName}
                onChange={(e) => setCreditorName(e.target.value)}
                placeholder="Coppel, Nu, Klar..."
                maxLength={100}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Concepto *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bicicleta, Tarjeta, Prestamo..."
                maxLength={150}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Categoria (opcional)
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Hogar, transporte, ropa..."
                maxLength={60}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </section>

          {/* SECCION: Montos */}
          <section className="space-y-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <DollarSign className="w-3 h-3" />
              <span>Montos</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Monto total original
                </label>
                <input
                  type="number"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Cuota mensual
                </label>
                <input
                  type="number"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Total de pagos (cuotas en todo el plan)
              </label>
              <input
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                min="1"
                max="100"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:border-rose-500"
              />
            </div>
          </section>

          {/* SECCION: Avance y fechas (clave para "desde cuando") */}
          <section className="space-y-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>Avance y fechas</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Cuotas ya pagadas (antes de usar la app)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentInstallment}
                  onChange={(e) => setCurrentInstallment(e.target.value)}
                  min="0"
                  max="100"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:border-rose-500"
                />
                {totalNum > 0 && (
                  <span className="text-xs text-slate-400 font-bold">
                    de {totalNum}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                💡 Si llevas 3 pagos antes de la app, pon 3 aqui. No se crearan
                gastos pasados.
              </p>
              {tooManyInstallments && (
                <p className="text-[11px] text-rose-300 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No puedes tener mas pagados que el total
                </p>
              )}
            </div>

            {/* ============ DIA DEL MES + PROXIMA FECHA (mejora) ============ */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Dia del mes que pagas (1-31)
                </label>
                <input
                  type="number"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  min="1"
                  max="31"
                  placeholder="Ej: 25 (el dia 25 de cada mes)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:border-rose-500"
                />
                {/* Preview en vivo de la fecha que genera el dia */}
                {dueDay && !dueDayValid && (
                  <p className="text-[11px] text-rose-300 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    El dia debe estar entre 1 y 31
                  </p>
                )}
                {previewFromDueDay && (
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Proximo pago:{" "}
                      <span className="font-bold">
                        {ymdToLabel(previewFromDueDay)}
                      </span>
                    </p>
                    {nextDueDate !== previewFromDueDay && (
                      <button
                        type="button"
                        onClick={() => setNextDueDate(previewFromDueDay)}
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 transition-colors"
                      >
                        Usar esta fecha
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Proxima fecha exacta de pago
                </label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {effectiveNextDue
                    ? `Esta deuda contara en "Por pagar" del mes de ${ymdToLabel(effectiveNextDue)}.`
                    : "Pon el dia del mes arriba y se calcula sola, o elige la fecha aqui."}
                </p>
                {manualDiffersFromDay && (
                  <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Esta fecha es distinta al dia {dueDayNum} que pusiste arriba.
                    Se usara esta fecha exacta.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Fecha de inicio (cuando empezaste a pagarla)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 italic">
                💡 Informativo. No afecta las graficas del presente.
              </p>
            </div>

            {/* Preview del saldo calculado */}
            {computedBalance != null && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Saldo calculado automatico
                </p>
                <p className="text-lg font-black text-rose-300 tabular-nums">
                  {fmt(computedBalance)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {remaining} cuotas pendientes × {fmt(installmentNum)} c/u
                </p>
              </div>
            )}
          </section>

          {/* SECCION: Estilo */}
          <section className="space-y-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estilo y prioridad
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Prioridad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      priority === opt.value
                        ? "bg-slate-700 border border-slate-500 " + opt.color
                        : "bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                Icono
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {ICON_PRESETS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`h-10 rounded-lg text-xl transition-all ${
                      icon === i
                        ? "bg-rose-500/15 border-2 border-rose-500 scale-105"
                        : "bg-slate-800 border-2 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECCION: Notas */}
          <section className="pt-3 border-t border-slate-700/50">
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Cualquier detalle adicional..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={updateMutation.isPending}
            className="px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              updateMutation.isPending ||
              !creditorName.trim() ||
              !title.trim() ||
              tooManyInstallments
            }
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
