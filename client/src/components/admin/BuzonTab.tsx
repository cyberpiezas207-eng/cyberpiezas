// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/components/admin/BuzonTab.tsx <<<
// ============================================================================
// VISTA "Buzon" - sub-pestana dentro de Mis Gastos
// ----------------------------------------------------------------------------
// El buzon donde tu esposa (u otra persona con el link) manda gastos para que
// TU los confirmes. Al confirmar, el envio se vuelve un gasto real (entra al
// pastel del mes). Tambien puedes rechazar.
//
// Funciones:
//   - Generar / ver / copiar / regenerar el link secreto de ella
//   - Ver pendientes y confirmarlos o rechazarlos
//   - Ver historial (confirmados / rechazados)
//
// Lee del router personalInbox (lado dueno). Lectura defensiva de campos:
// como los nombres exactos pueden variar, se prueban varios (amount/monto,
// description/note, etc.) con fallback, para no romper.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Inbox,
  Link2,
  Copy,
  RefreshCw,
  Check,
  X as XIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  ShoppingCart,
  Fuel,
  Banknote,
  Heart,
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

// Lectura defensiva: prueba varios nombres de campo comunes.
function pick(obj: any, keys: string[], fallback: any = null): any {
  if (!obj) return fallback;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function subAmount(s: any): number {
  const v = pick(s, ["amount", "monto", "total", "value"], 0);
  return Number(v) || 0;
}

function subText(s: any): string {
  return String(
    pick(s, ["description", "descripcion", "note", "notes", "concept", "concepto", "title"], "Sin descripcion"),
  );
}

function subSender(s: any): string | null {
  return pick(s, ["senderName", "sender", "from", "remitente", "nombre"], null);
}

function subWhen(s: any): string {
  const raw = pick(s, ["createdAt", "created_at", "fecha", "date", "submittedAt"], null);
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Saca el secreto del token de varias formas posibles
function tokenSecret(t: any): string | null {
  return pick(t, ["token", "secret", "value", "code", "slug"], null);
}

// Lee el meta (tipo + datos extra) que viene en rawText como JSON.
// Si no es JSON valido o no tiene kind, lo trata como gasto normal.
function readMeta(s: any): {
  kind: "gasto" | "gasolina" | "ingreso" | "deseo";
  odometer: number | null;
  incomeDate: string | null;
  wishWhen: string | null;
  note: string | null;
} {
  const raw = pick(s, ["rawText", "raw_text", "raw"], null);
  const def = {
    kind: "gasto" as const,
    odometer: null,
    incomeDate: null,
    wishWhen: null,
    note: null,
  };
  if (!raw || typeof raw !== "string") return def;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || !o.kind) return def;
    return {
      kind: ["gasto", "gasolina", "ingreso", "deseo"].includes(o.kind)
        ? o.kind
        : "gasto",
      odometer: o.odometer != null ? Number(o.odometer) : null,
      incomeDate: o.incomeDate ?? null,
      wishWhen: o.wishWhen ?? null,
      note: o.note ?? null,
    };
  } catch {
    return def;
  }
}

// Estilo visual por tipo (icono + color + etiqueta)
const KIND_UI: Record<
  string,
  { label: string; icon: any; cls: string; chip: string }
> = {
  gasto: {
    label: "Gasto",
    icon: ShoppingCart,
    cls: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-200 border-orange-500/40",
  },
  gasolina: {
    label: "Gasolina",
    icon: Fuel,
    cls: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-200 border-sky-500/40",
  },
  ingreso: {
    label: "Ingreso",
    icon: Banknote,
    cls: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  },
  deseo: {
    label: "Deseo",
    icon: Heart,
    cls: "text-pink-300",
    chip: "bg-pink-500/15 text-pink-200 border-pink-500/40",
  },
};


// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function BuzonTab() {
  const utils = trpc.useUtils();
  const [linkSecret, setLinkSecret] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Pendientes
  const pendingQuery = trpc.personalInbox.submissions.list.useQuery({
    status: "pending",
  });
  // Historial: confirmados + rechazados (dos queries separadas)
  const confirmedQuery = trpc.personalInbox.submissions.list.useQuery(
    { status: "confirmed" },
    { enabled: showHistory },
  );
  const rejectedQuery = trpc.personalInbox.submissions.list.useQuery(
    { status: "rejected" },
    { enabled: showHistory },
  );

  function refreshAll() {
    utils.personalInbox.submissions.list.invalidate();
    utils.personalInbox.submissions.pendingCount.invalidate();
    // Confirmar crea un gasto: refrescar gastos y pastel
    utils.personalExpenses.expenses.list.invalidate();
    utils.personalExpenses.stats.dashboard.invalidate();
  }

  const ensureM = trpc.personalInbox.tokens.ensure.useMutation({
    onSuccess: (t: any) => {
      const secret = tokenSecret(t);
      if (secret) {
        setLinkSecret(secret);
      } else {
        toast.error("No se pudo leer el link generado");
      }
    },
    onError: (e: any) => toast.error(e.message || "No se pudo generar el link"),
  });

  const regenerateM = trpc.personalInbox.tokens.regenerate.useMutation({
    onSuccess: (t: any) => {
      const secret = tokenSecret(t);
      if (secret) {
        setLinkSecret(secret);
        toast.success("Link nuevo generado. El anterior dejo de servir.");
      }
    },
    onError: (e: any) => toast.error(e.message || "No se pudo regenerar"),
  });

  const confirmM = trpc.personalInbox.submissions.confirm.useMutation({
    onSuccess: (res: any) => {
      const k = res?.kind;
      if (k === "deseo") {
        toast.success("Confirmado. Lo agregue a tus Deseos.");
      } else if (k === "gasolina") {
        toast.success(
          res?.expenseId
            ? "Carga registrada en tu Vehiculo y contada como gasto."
            : "Carga registrada en tu Vehiculo.",
        );
      } else {
        toast.success("Confirmado. Ya es un gasto del mes.");
      }
      refreshAll();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo confirmar"),
  });

  // Decide como confirmar segun el tipo del envio.
  // Para gasolina pregunta el switch: dinero nuevo (cuenta como gasto) o del
  // que ya le di (solo registro en el Vehiculo). Para lo demas, confirma directo.
  function handleConfirm(s: any) {
    const meta = readMeta(s);
    if (meta.kind === "gasolina") {
      const esNuevo = window.confirm(
        "Esta gasolina:\n\n" +
          "Aceptar = dinero NUEVO (entra al carro Y cuenta como gasto del mes)\n" +
          "Cancelar = del dinero que YA le diste (solo entra al carro, no se cuenta de nuevo)",
      );
      confirmM.mutate({ id: s.id, countAsExpense: esNuevo });
    } else {
      confirmM.mutate({ id: s.id });
    }
  }

  const rejectM = trpc.personalInbox.submissions.reject.useMutation({
    onSuccess: () => {
      toast.success("Envio rechazado");
      refreshAll();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo rechazar"),
  });

  const pendientes = pendingQuery.data ?? [];
  const confirmados = confirmedQuery.data ?? [];
  const rechazados = rejectedQuery.data ?? [];

  // URL completa del link de ella
  const fullUrl = linkSecret
    ? `${typeof window !== "undefined" ? window.location.origin : "https://cyberpiezas.com"}/buzon/${linkSecret}`
    : null;

  function handleCopy() {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl).then(
      () => toast.success("Link copiado. Mandaselo por WhatsApp."),
      () => toast.error("No se pudo copiar"),
    );
  }

  function handleRegenerate() {
    if (
      !window.confirm(
        "Generar un link nuevo? El link anterior dejara de funcionar.",
      )
    )
      return;
    regenerateM.mutate({});
  }

  return (
    <div className="space-y-5">
      {/* Header PREMIUM */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-slate-900 to-sky-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="relative p-5 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/40 flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5 text-cyan-200" />
          </span>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                Buzon de gastos
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-tight">
              Buzon
            </h2>
            <p className="text-xs text-cyan-100/70 mt-0.5">
              Lo que mandan para tu aprobacion. Tu confirmas, y se vuelve gasto.
            </p>
          </div>
        </div>
      </div>

      {/* Link de ella */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-cyan-300" />
            Link para compartir
          </h3>

          {!fullUrl ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400">
                Genera un link secreto y mandaselo (por WhatsApp) a quien quieras
                que registre gastos. Solo con ese link pueden mandar.
              </p>
              <Button
                onClick={() => ensureM.mutate({})}
                disabled={ensureM.isPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white w-fit"
              >
                <Link2 className="w-4 h-4 mr-1.5" />
                {ensureM.isPending ? "Generando..." : "Ver / generar link"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5">
                <Send className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="text-xs text-slate-200 truncate flex-1 font-mono">
                  {fullUrl}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleCopy}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar link
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={regenerateM.isPending}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Cambiar link
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                Si cambias el link, el anterior deja de funcionar (util si se
                filtro o quieres cortar el acceso).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pendientes */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-300" />
            Pendientes de confirmar
            {pendientes.length > 0 && (
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                {pendientes.length}
              </span>
            )}
          </h3>

          {pendingQuery.isLoading ? (
            <div className="h-16 rounded-xl bg-slate-700/40 animate-pulse" />
          ) : pendientes.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Nada pendiente</p>
              <p className="text-slate-500 text-sm mt-1">
                Cuando manden un gasto, aparece aqui para que lo confirmes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendientes.map((s: any) => {
                const monto = subAmount(s);
                const texto = subText(s);
                const quien = subSender(s);
                const cuando = subWhen(s);
                const meta = readMeta(s);
                const ui = KIND_UI[meta.kind] ?? KIND_UI.gasto;
                return (
                  <div
                    key={s.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${ui.chip}`}
                          >
                            <ui.icon className="w-2.5 h-2.5" />
                            {ui.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white truncate">
                          {texto}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                          {quien && (
                            <>
                              <span className="text-cyan-300">{quien}</span>
                              <span className="text-slate-600">·</span>
                            </>
                          )}
                          {cuando && <span>{cuando}</span>}
                          {meta.odometer != null && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-sky-300">
                                odometro {meta.odometer.toLocaleString("es-MX")}
                              </span>
                            </>
                          )}
                          {meta.incomeDate && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-emerald-300">
                                pagan {meta.incomeDate}
                              </span>
                            </>
                          )}
                          {meta.wishWhen && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-pink-300">
                                para {meta.wishWhen}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-base font-black text-cyan-200 tabular-nums shrink-0">
                        {monto > 0 ? fmt(monto) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleConfirm(s)}
                        disabled={confirmM.isPending}
                        className="flex items-center gap-1 text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => rejectM.mutate({ id: s.id })}
                        disabled={rejectM.isPending}
                        className="flex items-center gap-1 text-[12px] font-bold text-rose-200 bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial colapsable */}
      <Card className="bg-slate-800/40 border-slate-700">
        <CardContent className="p-5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-sm font-bold text-slate-100"
          >
            <span className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-slate-400" />
              Historial (confirmados y rechazados)
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-4">
              {/* Confirmados */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 mb-2">
                  Confirmados ({confirmados.length})
                </p>
                {confirmados.length === 0 ? (
                  <p className="text-xs text-slate-500">Ninguno todavia.</p>
                ) : (
                  <div className="space-y-1.5">
                    {confirmados.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 opacity-80"
                      >
                        <span className="text-xs text-slate-300 truncate flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          {subText(s)}
                        </span>
                        <span className="text-xs font-bold text-slate-300 tabular-nums shrink-0">
                          {fmt(subAmount(s))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rechazados */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300/80 mb-2">
                  Rechazados ({rechazados.length})
                </p>
                {rechazados.length === 0 ? (
                  <p className="text-xs text-slate-500">Ninguno.</p>
                ) : (
                  <div className="space-y-1.5">
                    {rechazados.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 opacity-60"
                      >
                        <span className="text-xs text-slate-400 truncate flex items-center gap-1.5 line-through">
                          <XIcon className="w-3 h-3 text-rose-400 shrink-0" />
                          {subText(s)}
                        </span>
                        <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0">
                          {fmt(subAmount(s))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
