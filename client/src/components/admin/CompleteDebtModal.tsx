// ============================================================================
// MODAL "Completar deuda"
// ----------------------------------------------------------------------------
// Se abre cuando el parser detecta una captura pero le faltan datos criticos
// (concepto, monto, total pagos). Pre-llena con lo detectado y resalta lo
// que falta en amarillo. Submit directo a personalDebts.debts.create.
//
// Indicadores visuales:
//   - Campo verde con check: detectado por el cerebro
//   - Campo amarillo con !: falta llenar
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  Check,
  AlertCircle,
  CreditCard,
  Receipt,
  Calendar,
  Tag,
  FileText,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

interface DebtDetection {
  intent: string;
  creditorName: string | null;
  conceptName: string | null;
  installmentAmount: number | null;
  currentInstallment: number | null;
  totalInstallments: number | null;
  originalAmount: number | null;
  currentBalance: number | null;
  dueDay: number | null;
  dueDate: string | null;
  purchaseDate: string | null;
  isMsi: boolean;
  rawText: string;
}

interface Props {
  detection: DebtDetection;
  onClose: () => void;
  onCreated: () => void;
}

type PlanType = "msi" | "interest" | "fixed_payment" | "informal" | "other";

// ----------------------------------------------------------------------------
// Sub-component: Campo con badge de "detectado" o "falta"
// ----------------------------------------------------------------------------

interface FieldProps {
  label: string;
  required?: boolean;
  detected?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, detected, hint, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
        {detected && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
            <Check className="w-2.5 h-2.5" />
            detectado
          </span>
        )}
        {!detected && required && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-amber-500/15 border border-amber-400/30 text-[8px] font-bold uppercase tracking-wider text-amber-300">
            <AlertCircle className="w-2.5 h-2.5" />
            falta
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

export default function CompleteDebtModal({
  detection,
  onClose,
  onCreated,
}: Props) {
  // Estado del formulario, pre-llenado con la deteccion
  const [creditorName, setCreditorName] = useState(detection.creditorName ?? "");
  const [title, setTitle] = useState(detection.conceptName ?? "");

  const initialHasPlan =
    detection.totalInstallments != null ||
    detection.installmentAmount != null ||
    detection.isMsi;
  const [hasInstallmentPlan, setHasInstallmentPlan] = useState(initialHasPlan);

  const [planType, setPlanType] = useState<PlanType>(
    detection.isMsi ? "msi" : "fixed_payment",
  );

  const [installmentAmount, setInstallmentAmount] = useState(
    detection.installmentAmount != null ? String(detection.installmentAmount) : "",
  );
  const [totalInstallments, setTotalInstallments] = useState(
    detection.totalInstallments != null ? String(detection.totalInstallments) : "",
  );
  const [currentInstallment, setCurrentInstallment] = useState(
    String(detection.currentInstallment ?? 0),
  );

  const [originalAmount, setOriginalAmount] = useState(
    detection.originalAmount != null ? String(detection.originalAmount) : "",
  );
  const [currentBalance, setCurrentBalance] = useState(
    detection.currentBalance != null ? String(detection.currentBalance) : "",
  );

  const [dueDay, setDueDay] = useState(
    detection.dueDay != null ? String(detection.dueDay) : "",
  );
  const [nextDueDate, setNextDueDate] = useState(detection.dueDate ?? "");
  const [startDate, setStartDate] = useState(detection.purchaseDate ?? "");

  const [linkedAssetName, setLinkedAssetName] = useState(
    detection.intent === "purchase_installment" && detection.conceptName
      ? detection.conceptName
      : "",
  );

  const [notes, setNotes] = useState("");

  // Auto-recalculo del saldo cuando hay plan a meses
  useEffect(() => {
    if (hasInstallmentPlan && installmentAmount && totalInstallments) {
      const ia = Number(installmentAmount);
      const ti = Number(totalInstallments);
      const ci = Number(currentInstallment) || 0;
      if (ia > 0 && ti > 0 && ci <= ti) {
        const total = Math.round(ia * ti * 100) / 100;
        const balance = Math.round(ia * (ti - ci) * 100) / 100;
        setOriginalAmount(String(total));
        setCurrentBalance(String(balance));
      }
    }
  }, [hasInstallmentPlan, installmentAmount, totalInstallments, currentInstallment]);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = trpc.personalDebts.debts.create.useMutation({
    onSuccess: () => {
      toast.success("Deuda creada");
      onCreated();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  function handleSubmit() {
    if (!creditorName.trim()) {
      toast.error("Falta acreedor");
      return;
    }
    if (!title.trim()) {
      toast.error("Falta concepto");
      return;
    }

    const installmentAmountN = Number(installmentAmount) || null;
    const totalInstallmentsN = Number(totalInstallments) || null;
    const currentInstallmentN = Number(currentInstallment) || 0;
    const originalAmountN = Number(originalAmount) || null;
    const currentBalanceN = Number(currentBalance) || null;
    const dueDayN = Number(dueDay) || null;

    // Necesitamos AL MENOS un indicador de monto
    if (
      !hasInstallmentPlan &&
      !originalAmountN &&
      !currentBalanceN
    ) {
      toast.error("Falta monto / saldo");
      return;
    }
    if (hasInstallmentPlan && !installmentAmountN && !originalAmountN) {
      toast.error("Falta mensualidad o monto total");
      return;
    }

    create.mutate({
      creditorName: creditorName.trim(),
      title: title.trim(),
      originalAmount: originalAmountN,
      currentBalance: currentBalanceN ?? originalAmountN ?? 0,
      installmentAmount: installmentAmountN,
      currentInstallment: currentInstallmentN,
      totalInstallments: totalInstallmentsN,
      dueDay: dueDayN,
      nextDueDate: nextDueDate || null,
      startDate: startDate || null,
      isInstallmentPurchase: hasInstallmentPlan,
      installmentPlanType: hasInstallmentPlan ? planType : null,
      linkedAssetName: linkedAssetName.trim() || null,
      assetStatus: linkedAssetName.trim() ? "owned" : null,
      notes: notes.trim() || null,
    });
  }

  // Helpers para los chips de "detectado"
  const hasDetCreditor = !!detection.creditorName;
  const hasDetTitle = !!detection.conceptName;
  const hasDetInstallment = detection.installmentAmount != null;
  const hasDetTotal = detection.totalInstallments != null;
  const hasDetCurrent = detection.currentInstallment != null;
  const hasDetOriginal = detection.originalAmount != null;
  const hasDetBalance = detection.currentBalance != null;
  const hasDetDueDay = detection.dueDay != null;
  const hasDetDueDate = !!detection.dueDate;
  const hasDetStartDate = !!detection.purchaseDate;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <div className="absolute -top-16 -right-12 w-40 h-40 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative p-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 ring-1 ring-rose-400/30 flex items-center justify-center text-lg shrink-0">
                <CreditCard className="w-5 h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200 mb-0.5">
                  Completar deuda
                </div>
                <h2 className="text-base font-black text-white tracking-tight">
                  Casi listo, falta poco
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Detectamos parte. Llena los campos en amarillo.
                </p>
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

        <div className="p-5 space-y-5">
          {/* Captura original (referencia) */}
          {detection.rawText && (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                Tu captura
              </p>
              <p className="text-xs text-slate-300 italic">
                "{detection.rawText}"
              </p>
            </div>
          )}

          {/* ============ Datos basicos ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-rose-300" />
              Datos basicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Acreedor"
                required
                detected={hasDetCreditor}
                hint="Coppel, Mercado Libre, BBVA, etc."
              >
                <Input
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  placeholder="Coppel"
                  className={`bg-slate-900 text-white ${hasDetCreditor ? "border-emerald-500/40" : "border-slate-700"}`}
                />
              </Field>
              <Field
                label="Concepto"
                required
                detected={hasDetTitle}
                hint="Bici, Play 5, refrigerador, etc."
              >
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bici"
                  className={`bg-slate-900 text-white ${hasDetTitle ? "border-emerald-500/40" : "border-slate-700"}`}
                />
              </Field>
            </div>
          </section>

          {/* ============ Tipo de deuda ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-rose-300" />
              Tipo de deuda
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  hasInstallmentPlan
                    ? "bg-rose-500/10 border-rose-400/50"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  checked={hasInstallmentPlan}
                  onChange={() => setHasInstallmentPlan(true)}
                  className="accent-rose-500"
                />
                <span className="text-xs font-bold text-white">A pagos fijos</span>
              </label>
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  !hasInstallmentPlan
                    ? "bg-rose-500/10 border-rose-400/50"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  checked={!hasInstallmentPlan}
                  onChange={() => setHasInstallmentPlan(false)}
                  className="accent-rose-500"
                />
                <span className="text-xs font-bold text-white">Saldo libre</span>
              </label>
            </div>

            {hasInstallmentPlan && (
              <div className="mt-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Plan
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { v: "msi", label: "MSI" },
                    { v: "fixed_payment", label: "Pago fijo" },
                    { v: "interest", label: "Con interes" },
                    { v: "informal", label: "Informal" },
                  ].map((opt) => (
                    <label
                      key={opt.v}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                        planType === opt.v
                          ? "bg-emerald-500/10 border-emerald-400/50 text-emerald-200"
                          : "bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={planType === opt.v}
                        onChange={() => setPlanType(opt.v as PlanType)}
                        className="accent-emerald-400 w-3 h-3"
                      />
                      <span className="font-bold">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ============ Pagos / Saldos ============ */}
          {hasInstallmentPlan ? (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
                <Receipt className="w-3 h-3 text-rose-300" />
                Pagos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field
                  label="Mensualidad"
                  required
                  detected={hasDetInstallment}
                >
                  <Input
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="990"
                    inputMode="decimal"
                    className={`bg-slate-900 text-white ${hasDetInstallment ? "border-emerald-500/40" : "border-slate-700"}`}
                  />
                </Field>
                <Field
                  label="Total de pagos"
                  required
                  detected={hasDetTotal}
                >
                  <Input
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    placeholder="12"
                    inputMode="numeric"
                    className={`bg-slate-900 text-white ${hasDetTotal ? "border-emerald-500/40" : "border-slate-700"}`}
                  />
                </Field>
                <Field
                  label="Pago actual (avance)"
                  detected={hasDetCurrent}
                  hint="cuantos has pagado"
                >
                  <Input
                    value={currentInstallment}
                    onChange={(e) => setCurrentInstallment(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    className={`bg-slate-900 text-white ${hasDetCurrent ? "border-emerald-500/40" : "border-slate-700"}`}
                  />
                </Field>
              </div>
              {originalAmount && currentBalance && (
                <p className="text-[11px] text-emerald-300 mt-2">
                  Total a pagar: <strong>${Number(originalAmount).toLocaleString("es-MX")}</strong>
                  {" · "}
                  Saldo restante: <strong>${Number(currentBalance).toLocaleString("es-MX")}</strong>
                  <span className="text-slate-500 ml-1">(auto-calculado)</span>
                </p>
              )}
            </section>
          ) : (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
                <Receipt className="w-3 h-3 text-rose-300" />
                Saldo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  label="Saldo total original"
                  required
                  detected={hasDetOriginal}
                >
                  <Input
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="6800"
                    inputMode="decimal"
                    className={`bg-slate-900 text-white ${hasDetOriginal ? "border-emerald-500/40" : "border-slate-700"}`}
                  />
                </Field>
                <Field
                  label="Saldo restante actual"
                  detected={hasDetBalance}
                  hint="lo que falta por pagar"
                >
                  <Input
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="6800"
                    inputMode="decimal"
                    className={`bg-slate-900 text-white ${hasDetBalance ? "border-emerald-500/40" : "border-slate-700"}`}
                  />
                </Field>
              </div>
            </section>
          )}

          {/* ============ Fechas ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-rose-300" />
              Fechas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field
                label="Dia de vencimiento"
                detected={hasDetDueDay}
                hint="1-31, dia mensual"
              >
                <Input
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value.replace(/\D/g, ""))}
                  placeholder="15"
                  inputMode="numeric"
                  className={`bg-slate-900 text-white ${hasDetDueDay ? "border-emerald-500/40" : "border-slate-700"}`}
                />
              </Field>
              <Field
                label="Proximo pago (fecha)"
                detected={hasDetDueDate}
              >
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className={`bg-slate-900 text-white ${hasDetDueDate ? "border-emerald-500/40" : "border-slate-700"}`}
                />
              </Field>
              <Field
                label="Fecha de compra"
                detected={hasDetStartDate}
              >
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`bg-slate-900 text-white ${hasDetStartDate ? "border-emerald-500/40" : "border-slate-700"}`}
                />
              </Field>
            </div>
          </section>

          {/* ============ Activo + Notas ============ */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-rose-300" />
              Extra (opcional)
            </h3>
            <div className="space-y-3">
              <Field
                label="Activo comprado"
                hint="ej: Play 5, bici, refri (para vincular ventas)"
              >
                <Input
                  value={linkedAssetName}
                  onChange={(e) => setLinkedAssetName(e.target.value)}
                  placeholder="Play 5"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </Field>
              <Field label="Notas">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej: comprada con tarjeta crédito"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </Field>
            </div>
          </section>

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            >
              <Check className="w-4 h-4 mr-1" />
              {create.isPending ? "Guardando..." : "Guardar deuda"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
