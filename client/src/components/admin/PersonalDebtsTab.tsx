// ============================================================================
// SUB-PESTANA "Deudas" - dentro de Mis Gastos
// ----------------------------------------------------------------------------
// Estructura:
//   - Header con navegador de mes
//   - 4 stats cards (deuda total, por pagar mes, proximo pago, ahorro diario)
//   - Captura rapida con cerebro (parser) + preview en vivo
//   - Lista de deudas activas con barra de progreso + boton "Pagar"
//   - Modal RecordPayment con monto, toggle parcial, toggle gasto vinculado
//
// Color tema rosa/rojo (deudas como urgencia/cuidado).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SellAssetModal from "@/components/admin/SellAssetModal";
import DebtInsightsPanel from "@/components/admin/DebtInsightsPanel";
import PaidDebtsSection from "@/components/admin/PaidDebtsSection";
import CompleteDebtModal from "@/components/admin/CompleteDebtModal";
import EditDebtModal from "@/components/admin/EditDebtModal";
import MonthPaymentPlan from "@/components/admin/MonthPaymentPlan";
import DebtKPIsPanel from "@/components/admin/DebtKPIsPanel";
import TodayActionCard from "@/components/admin/TodayActionCard";
import {
  CreditCard,
  Wallet,
  TrendingDown,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Trash2,
  Receipt,
  AlertCircle,
  Trophy,
  Tag,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtExact = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function formatDay(ymd: string | null): string {
  if (!ymd) return "—";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}`;
}

function daysUntil(ymd: string | null): number | null {
  if (!ymd) return null;
  const due = new Date(ymd + "T12:00:00");
  const now = nowMexico();
  now.setHours(12, 0, 0, 0);
  const diff = Math.round(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

const INTENT_LABEL: Record<string, string> = {
  new_debt: "Nueva deuda",
  purchase_installment: "Compra a meses",
  payment: "Pago",
  partial_payment: "Abono parcial",
  asset_sale: "Venta de activo",
  ambiguous: "Sin detectar",
};

// ----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------------

export default function PersonalDebtsTab() {
  const today = nowMexico();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [payingDebtId, setPayingDebtId] = useState<number | null>(null);
  const [sellingAssetId, setSellingAssetId] = useState<number | null>(null);
  // Debts-Edit: estado para modal de edicion
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const debtsQuery = trpc.personalDebts.debts.list.useQuery({
    status: "active",
  });
  const debts = debtsQuery.data ?? [];

  function refreshAll() {
    utils.personalDebts.debts.list.invalidate();
    utils.personalDebts.stats.monthSummary.invalidate();
    utils.personalDebts.stats.upcoming.invalidate();
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }
  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;

  const payingDebt = debts.find((d) => d.id === payingDebtId) ?? null;
  const sellingAsset = debts.find((d) => d.id === sellingAssetId) ?? null;
  // Debts-Edit: deuda activa para edicion
  const editingDebt = debts.find((d) => d.id === editingDebtId) ?? null;

  return (
    <div className="space-y-5">
      {/* Header con badge premium */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-slate-900 to-red-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-red-500/15 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 mb-2">
              <CreditCard className="w-3 h-3 text-rose-300" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-200">
                Centro de deudas
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Deudas y compras a pagos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Llevate la cuenta clara, sin sustos.
            </p>
          </div>
        </div>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => shiftMonth(-1)}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-5 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-lg min-w-[170px] text-center">
          <div className="text-sm font-bold text-white tracking-wide">
            {monthLabel}
          </div>
          {!atCurrentMonth && (
            <button
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth() + 1);
              }}
              className="text-[10px] text-rose-300 hover:text-rose-100 uppercase tracking-wider font-bold"
            >
              ← Mes actual
            </button>
          )}
        </div>
        <button
          onClick={() => shiftMonth(1)}
          disabled={atCurrentMonth}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all shadow-md disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Card "Hoy que hago" - asesor del dia ARRIBA DE TODO */}
      <TodayActionCard
        year={year}
        month={month}
        onPay={(id) => setPayingDebtId(id)}
        onEdit={(id) => setEditingDebtId(id)}
      />

      {/* Stats */}
      <StatsCards year={year} month={month} />

      {/* Plan de pago del mes (panel asesor) */}
      <MonthPaymentPlan
        year={year}
        month={month}
        onPay={(id) => setPayingDebtId(id)}
        onEdit={(id) => setEditingDebtId(id)}
      />

      {/* KPIs de presion financiera */}
      <DebtKPIsPanel year={year} month={month} />

      {/* Insights inteligentes */}
      <DebtInsightsPanel year={year} month={month} />

      {/* Captura rapida */}
      <QuickDebtCapture onCreated={refreshAll} />

      {/* Lista de deudas activas */}
      <DebtsList
        debts={debts}
        isLoading={debtsQuery.isLoading}
        onPay={(id) => setPayingDebtId(id)}
        onSell={(id) => setSellingAssetId(id)}
        onEdit={(id) => setEditingDebtId(id)}
        onArchived={refreshAll}
      />

      {/* Archivo de trofeos: deudas liquidadas */}
      <PaidDebtsSection />

      {/* Modal de pago */}
      {payingDebt && (
        <RecordPaymentModal
          debt={payingDebt}
          onClose={() => setPayingDebtId(null)}
          onPaid={() => {
            setPayingDebtId(null);
            refreshAll();
          }}
        />
      )}

      {/* Modal de venta de activo */}
      {sellingAsset && (
        <SellAssetModal
          debt={sellingAsset}
          onClose={() => setSellingAssetId(null)}
          onCompleted={() => {
            setSellingAssetId(null);
            refreshAll();
          }}
        />
      )}

      {/* Debts-Edit: modal de edicion */}
      <EditDebtModal
        open={!!editingDebt}
        debt={editingDebt}
        onClose={() => setEditingDebtId(null)}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// STATS CARDS (4 cards)
// ----------------------------------------------------------------------------

function StatsCards({ year, month }: { year: number; month: number }) {
  const sumQuery = trpc.personalDebts.stats.monthSummary.useQuery({
    year,
    month,
  });
  const s = sumQuery.data;
  const nextDueDays = daysUntil(s?.nextDueDate ?? null);
  const remainingToCover = Math.max(
    0,
    (s?.expectedThisMonth ?? 0) - (s?.paymentsThisMonth ?? 0),
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Deuda total */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-rose-950/60 via-slate-800 to-slate-800/90 border border-rose-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 ring-2 ring-rose-400/50 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
            <CreditCard className="w-5 h-5 text-rose-200" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Deuda total
          </p>
          <div className="text-2xl font-black text-rose-200 tracking-tight leading-tight">
            {fmt(s?.totalCurrentBalance ?? 0)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {s?.activeDebtsCount ?? 0} deuda(s) activa(s)
          </p>
        </CardContent>
      </Card>

      {/* Por pagar este mes */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/60 via-slate-800 to-slate-800/90 border border-amber-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 ring-2 ring-amber-400/50 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
            <Wallet className="w-5 h-5 text-amber-200" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Por pagar este mes
          </p>
          <div className="text-2xl font-black text-amber-200 tracking-tight leading-tight">
            {fmt(remainingToCover)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            pagado {fmt(s?.paymentsThisMonth ?? 0)} de{" "}
            {fmt(s?.expectedThisMonth ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Proximo pago */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-orange-950/60 via-slate-800 to-slate-800/90 border border-orange-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-11 h-11 rounded-xl bg-orange-500/20 ring-2 ring-orange-400/50 flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
            <Calendar className="w-5 h-5 text-orange-200" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Proximo pago
          </p>
          <div className="text-2xl font-black text-orange-200 tracking-tight leading-tight">
            {s?.nextDueAmount ? fmt(s.nextDueAmount) : "—"}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {s?.nextDueCreditor
              ? nextDueDays != null
                ? nextDueDays === 0
                  ? `${s.nextDueCreditor} · hoy`
                  : nextDueDays < 0
                    ? `${s.nextDueCreditor} · vencida`
                    : `${s.nextDueCreditor} · en ${nextDueDays}d`
                : s.nextDueCreditor
              : "sin vencimientos"}
          </p>
        </CardContent>
      </Card>

      {/* Ahorro diario sugerido */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-800 to-slate-800/90 border border-indigo-500/40 shadow-lg">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
        <CardContent className="relative p-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 ring-2 ring-indigo-400/50 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-indigo-200" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Ahorro diario
          </p>
          <div className="text-2xl font-black text-indigo-200 tracking-tight leading-tight">
            {fmt(s?.ahorroDiarioSugerido ?? 0)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            para cubrir el mes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------------
// QUICK DEBT CAPTURE - captura rapida con parser preview
// ----------------------------------------------------------------------------

function QuickDebtCapture({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const preview = trpc.personalDebts.debts.previewCapture.useQuery(
    { text: debounced },
    { enabled: debounced.length > 0 },
  );

  const quickCreate = trpc.personalDebts.debts.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Deuda creada");
      setText("");
      setDebounced("");
      onCreated();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const d = preview.data;
  const canQuickCreate =
    d &&
    (d.intent === "new_debt" || d.intent === "purchase_installment") &&
    d.creditorName &&
    d.conceptName &&
    (d.confidence ?? 0) >= 0.7;

  // Si hay deteccion parcial (intent de creacion pero falta algo), podemos
  // abrir el modal "Completar" en lugar de fallar
  const canOpenComplete =
    d &&
    (d.intent === "new_debt" || d.intent === "purchase_installment") &&
    !canQuickCreate;

  const [completing, setCompleting] = useState<any>(null);

  function handlePrimaryAction() {
    if (!text.trim()) return;
    if (canQuickCreate) {
      quickCreate.mutate({ text: text.trim() });
    } else if (canOpenComplete && d) {
      setCompleting(d);
    }
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5 text-rose-300" />
          Captura rapida
        </label>
        <p className="text-[11px] text-slate-500 mt-0.5">
          ej: deuda coppel bici 990 4/12 vence 15 · compre play 5 6800 msi 6
          mercado libre
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ej: deuda coppel bici 990 4/12"
            onKeyDown={(e) => e.key === "Enter" && handlePrimaryAction()}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <Button
            onClick={handlePrimaryAction}
            disabled={
              quickCreate.isPending ||
              (!canQuickCreate && !canOpenComplete)
            }
            className={
              canQuickCreate
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            {quickCreate.isPending
              ? "..."
              : canQuickCreate
                ? "Crear"
                : "Completar"}
          </Button>
        </div>

        {/* Preview en vivo */}
        {debounced.length > 0 && d && (
          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 border border-rose-400/30 text-rose-200">
                {INTENT_LABEL[d.intent] ?? d.intent}
              </span>
              <span className="text-[10px] text-slate-500">
                Confianza: {Math.round((d.confidence ?? 0) * 100)}%
              </span>
            </div>

            {/* Datos detectados */}
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {d.creditorName && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200">
                  {d.creditorName}
                </span>
              )}
              {d.conceptName && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-200">
                  {d.conceptName}
                </span>
              )}
              {d.installmentAmount != null && (
                <span className="text-rose-300 font-bold">
                  {fmt(d.installmentAmount)}/mes
                </span>
              )}
              {d.originalAmount != null && d.installmentAmount == null && (
                <span className="text-rose-300 font-bold">
                  {fmt(d.originalAmount)} total
                </span>
              )}
              {d.totalInstallments != null && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 border border-indigo-400/30 text-indigo-200">
                  {d.currentInstallment ?? 0}/{d.totalInstallments} pagos
                </span>
              )}
              {d.isMsi && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
                  MSI
                </span>
              )}
              {d.dueDate ? (
                <span className="text-xs text-slate-400">
                  📅 vence {d.dueDate}
                </span>
              ) : d.dueDay != null ? (
                <span className="text-xs text-slate-400">
                  vence dia {d.dueDay}
                </span>
              ) : null}
              {d.purchaseDate && (
                <span className="text-xs text-indigo-300">
                  🛍️ comprada {d.purchaseDate}
                </span>
              )}
            </div>

            {d.currentBalance != null && d.originalAmount != null && (
              <div className="text-xs text-slate-400">
                Saldo: <span className="text-rose-300 font-bold">{fmt(d.currentBalance)}</span>
                {" "}de{" "}
                <span className="text-slate-300 font-bold">{fmt(d.originalAmount)}</span>
              </div>
            )}

            {!canQuickCreate && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 leading-snug">
                  {d.intent === "payment" ||
                  d.intent === "partial_payment" ||
                  d.intent === "asset_sale"
                    ? "Para pagos, abonos o ventas usa el boton de cada deuda en la lista de abajo."
                    : canOpenComplete
                      ? "Faltan datos. El boton 'Completar' abre un formulario con lo detectado para que llenes lo que falta."
                      : "No detectamos suficiente. Intenta: 'deuda [acreedor] [concepto] [monto] [X/Y]'"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal "Completar deuda" */}
        {completing && (
          <CompleteDebtModal
            detection={completing}
            onClose={() => setCompleting(null)}
            onCreated={() => {
              setCompleting(null);
              setText("");
              setDebounced("");
              onCreated();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// DEBTS LIST
// ----------------------------------------------------------------------------

function DebtsList({
  debts,
  isLoading,
  onPay,
  onSell,
  onEdit,
  onArchived,
}: {
  debts: any[];
  isLoading: boolean;
  onPay: (id: number) => void;
  onSell: (id: number) => void;
  onEdit: (id: number) => void;
  onArchived: () => void;
}) {
  if (isLoading) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-5">
          <div className="h-20 rounded-xl bg-slate-700/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (debts.length === 0) {
    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardContent className="p-8 text-center">
          <Trophy className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-200 font-bold">Sin deudas activas</p>
          <p className="text-slate-500 text-sm mt-1">
            Aprovecha tu mes sin compromisos. O usa la captura rapida arriba
            para agregar una.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-rose-300" />
          Deudas activas
        </h3>
        <div className="space-y-3">
          {debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onPay={() => onPay(debt.id)}
              onSell={() => onSell(debt.id)}
              onEdit={() => onEdit(debt.id)}
              onArchived={onArchived}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// DEBT CARD (item de la lista)
// ----------------------------------------------------------------------------

function DebtCard({
  debt,
  onPay,
  onSell,
  onEdit,
  onArchived,
}: {
  debt: any;
  onPay: () => void;
  onSell: () => void;
  onEdit: () => void;
  onArchived: () => void;
}) {
  const utils = trpc.useUtils();
  const archive = trpc.personalDebts.debts.archive.useMutation({
    onSuccess: () => {
      toast.success("Deuda archivada");
      utils.personalDebts.debts.list.invalidate();
      utils.personalDebts.stats.monthSummary.invalidate();
      onArchived();
    },
    onError: (e) => toast.error(e.message || "No se pudo archivar"),
  });

  const balance = Number(debt.currentBalance);
  const original = debt.originalAmount ? Number(debt.originalAmount) : null;
  const installment = debt.installmentAmount
    ? Number(debt.installmentAmount)
    : null;
  const current = debt.currentInstallment ?? 0;
  const total = debt.totalInstallments ?? null;

  // Progress %
  let progressPct = 0;
  if (total != null && total > 0) {
    progressPct = Math.min(100, Math.round((current / total) * 100));
  } else if (original && original > 0) {
    progressPct = Math.min(
      100,
      Math.round(((original - balance) / original) * 100),
    );
  }

  const dueDays = daysUntil(debt.nextDueDate);
  const isOverdue = dueDays != null && dueDays < 0;
  const isSoon = dueDays != null && dueDays >= 0 && dueDays <= 3;

  function handleArchive() {
    if (
      window.confirm(
        `Archivar "${debt.title}"? Esto la quitara de la lista activa.`,
      )
    ) {
      archive.mutate({ id: debt.id });
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/80 shadow-md p-4 cursor-pointer transition-all"
      title="Click para editar esta deuda"
    >
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl ring-1 flex items-center justify-center text-lg shrink-0"
          style={{
            backgroundColor: (debt.color ?? "#fb7185") + "22",
            borderColor: debt.color ?? "#fb7185",
          }}
        >
          {debt.icon ?? "💳"}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {debt.creditorName} · {debt.title}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {total != null && (
                  <span className="text-[11px] text-slate-400">
                    {current}/{total} pagos
                  </span>
                )}
                {installment != null && (
                  <>
                    <span className="text-[11px] text-slate-600">·</span>
                    <span className="text-[11px] text-slate-400">
                      {fmt(installment)}/mes
                    </span>
                  </>
                )}
                {debt.isInstallmentPurchase && (
                  <>
                    <span className="text-[11px] text-slate-600">·</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      {debt.installmentPlanType === "msi" ? "MSI" : "A meses"}
                    </span>
                  </>
                )}
                {debt.linkedAssetName && (
                  <>
                    <span className="text-[11px] text-slate-600">·</span>
                    {debt.assetStatus === "sold" ? (
                      <span className="text-[11px] text-orange-300 font-bold">
                        🏷️ {debt.linkedAssetName} · vendido
                        {debt.assetSoldPrice
                          ? ` por ${fmt(Number(debt.assetSoldPrice))}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-[11px] text-indigo-300">
                        🎮 {debt.linkedAssetName}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive();
                }}
                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                title="Archivar deuda"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Debts-Edit: Badge prominente de urgencia + dia de pago visible */}
          {(dueDays != null || debt.dueDay != null) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {dueDays != null && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                    isOverdue
                      ? "bg-rose-500/20 text-rose-200 border-rose-500"
                      : dueDays === 0
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/70"
                        : dueDays <= 2
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/50"
                          : dueDays <= 7
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/50"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {isOverdue
                    ? `🚨 Vencida hace ${Math.abs(dueDays)} d`
                    : dueDays === 0
                      ? "⚠ Vence HOY"
                      : dueDays === 1
                        ? "⚠ Vence MAÑANA"
                        : `⏰ Vence en ${dueDays} dias`}
                </span>
              )}
              {debt.dueDay != null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700">
                  <Calendar className="w-3 h-3" />
                  Dia {debt.dueDay} de cada mes
                </span>
              )}
            </div>
          )}

          {/* Barra de progreso */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Saldo restante</span>
              <span className="text-rose-300 font-bold">
                {fmtExact(balance)}
                {original != null && (
                  <span className="text-slate-500 font-normal">
                    {" "}/ {fmtExact(original)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 bg-slate-700/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  background:
                    "linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)",
                }}
              />
            </div>
          </div>

          {/* Proximo pago + boton Pagar */}
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="text-[11px] text-slate-400">
              {debt.nextDueDate ? (
                <span>
                  Proximo pago:{" "}
                  <span
                    className={`font-bold ${
                      isOverdue
                        ? "text-rose-300"
                        : isSoon
                          ? "text-amber-300"
                          : "text-emerald-300"
                    }`}
                  >
                    {formatDay(debt.nextDueDate)}
                  </span>
                </span>
              ) : debt.dueDay != null ? (
                <span className="text-slate-500 italic">
                  Sin proxima fecha exacta
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300/80 italic">
                  <Calendar className="w-3 h-3" />
                  Click para agregar fecha de pago
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onPay();
              }}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Receipt className="w-3.5 h-3.5 mr-1" />
              Pagar
            </Button>
            {debt.linkedAssetName && debt.assetStatus !== "sold" && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSell();
                }}
                size="sm"
                variant="outline"
                className="border-orange-500/50 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200"
                title={`Vender ${debt.linkedAssetName}`}
              >
                <Tag className="w-3.5 h-3.5 mr-1" />
                Vender
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Si el activo fue vendido, mostrar bloque con info de la venta */}
      {debt.assetStatus === "sold" && (
        <div className="mt-3 pt-3 border-t border-slate-700/60">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-200 font-bold uppercase tracking-wider text-[9px]">
              Activo vendido
            </span>
            {debt.assetSoldAt && (
              <span className="text-slate-400">{formatDay(debt.assetSoldAt)}</span>
            )}
            {debt.assetSoldPrice && (
              <span className="text-orange-300 font-bold">
                {fmtExact(Number(debt.assetSoldPrice))}
              </span>
            )}
            {debt.assetSoldPrice && debt.originalAmount && (
              <span
                className={`font-bold ${
                  Number(debt.assetSoldPrice) - Number(debt.originalAmount) < 0
                    ? "text-rose-300"
                    : "text-emerald-300"
                }`}
              >
                {(() => {
                  const diff =
                    Number(debt.assetSoldPrice) - Number(debt.originalAmount);
                  return `${diff >= 0 ? "+" : ""}${fmtExact(diff)}`;
                })()}
              </span>
            )}
            {debt.assetSoldBuyer && (
              <span className="text-slate-500">
                a {debt.assetSoldBuyer}
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// RECORD PAYMENT MODAL
// ----------------------------------------------------------------------------

function RecordPaymentModal({
  debt,
  onClose,
  onPaid,
}: {
  debt: any;
  onClose: () => void;
  onPaid: () => void;
}) {
  const balance = Number(debt.currentBalance);
  const installment = debt.installmentAmount
    ? Number(debt.installmentAmount)
    : null;
  const suggestedAmount = installment ?? balance;

  const [amount, setAmount] = useState(String(suggestedAmount));
  const [isPartial, setIsPartial] = useState(false);
  const [createExpense, setCreateExpense] = useState(true);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const categories = categoriesQuery.data ?? [];
  const deudasCategory = categories.find((c) =>
    (c.slug ?? "").toLowerCase().includes("deuda"),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const record = trpc.personalDebts.payments.record.useMutation({
    onSuccess: (res) => {
      const bits = ["Pago registrado"];
      if (res.expenseId) bits.push("gasto creado");
      if (res.debt.status === "paid") bits.push("DEUDA LIQUIDADA 🏆");
      toast.success(bits.join(" · "));
      onPaid();
    },
    onError: (e) => toast.error(e.message || "No se pudo registrar"),
  });

  function handleSubmit() {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      toast.error("Monto invalido");
      return;
    }
    record.mutate({
      debtId: debt.id,
      amount: a,
      isPartial,
      installmentNumber:
        !isPartial && debt.totalInstallments
          ? (debt.currentInstallment ?? 0) + 1
          : null,
      createExpense,
      expenseCategoryId: deudasCategory?.id ?? null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <div className="absolute -top-16 -right-12 w-40 h-40 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative p-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 ring-1 ring-rose-400/30 flex items-center justify-center text-lg shrink-0">
                {debt.icon ?? "💳"}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200 mb-0.5">
                  Registrar pago
                </div>
                <h2 className="text-base font-black text-white tracking-tight truncate">
                  {debt.creditorName} · {debt.title}
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

        <div className="p-5 space-y-4">
          {/* Info de la deuda */}
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Saldo actual</span>
              <span className="text-rose-300 font-bold">{fmtExact(balance)}</span>
            </div>
            {installment != null && (
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-slate-400">Mensualidad</span>
                <span className="text-white font-bold">
                  {fmtExact(installment)}
                </span>
              </div>
            )}
            {debt.totalInstallments != null && (
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-slate-400">Avance</span>
                <span className="text-white">
                  {debt.currentInstallment ?? 0} de {debt.totalInstallments}
                </span>
              </div>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Monto del pago *
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="bg-slate-900 border-slate-700 text-white mt-1 text-xl font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Sugerido: {fmtExact(suggestedAmount)}
            </p>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPartial}
              onChange={(e) => setIsPartial(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span className="text-sm text-slate-200">Es abono parcial</span>
            <span className="text-[10px] text-slate-500">
              (no avanza la mensualidad)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createExpense}
              onChange={(e) => setCreateExpense(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span className="text-sm text-slate-200">
              Crear gasto personal vinculado
            </span>
            {deudasCategory ? (
              <span className="text-[10px] text-emerald-300 font-bold">
                · categoria "{deudasCategory.name}"
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">
                · sin categoria (puedes asignarla luego)
              </span>
            )}
          </label>

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
              disabled={record.isPending}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            >
              <Receipt className="w-4 h-4 mr-1" />
              {record.isPending ? "Registrando..." : "Registrar pago"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
