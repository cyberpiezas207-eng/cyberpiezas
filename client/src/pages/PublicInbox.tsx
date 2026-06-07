import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Loader2,
  Plus,
} from "lucide-react";

// ============================================================================
// BUZON PUBLICO (formato esposa) - Paso 3
// ----------------------------------------------------------------------------
// Pagina publica accesible via cyberpiezas.com/buzon/:token
// Es lo que la esposa (u otra persona de confianza) ve en su celular cuando
// abre el link secreto que el dueno le mando.
//
// Sin login, sin password. El token ES la credencial.
//
// Solo CREA pendientes (no gastos reales). El dueno revisa y confirma luego
// desde su panel privado. Mobile-first, calido/dorado, simple.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

export default function PublicInbox() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  // Verifica si el link sirve (no expone userId, solo valid + label)
  const checkQuery = trpc.personalInboxPublic.check.useQuery(
    { token },
    {
      enabled: !!token && token.length >= 10,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  // ============================================================
  // ESTADO: cargando
  // ============================================================
  if (checkQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30 animate-pulse">
            <Inbox className="w-8 h-8 text-white" />
          </div>
          <p className="text-amber-900 font-semibold mb-1">Abriendo buzon...</p>
          <p className="text-sm text-amber-700">Un momento por favor</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO: link invalido (no existe, revocado) o error
  // ============================================================
  const linkValid = checkQuery.data?.valid === true;
  if (checkQuery.isError || !linkValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-br from-rose-100 via-amber-50 to-rose-50 px-6 pt-10 pb-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-lg mb-3">
              <XCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">
              Link no valido
            </h1>
            <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
              Este enlace no funciona o fue desactivado.
            </p>
          </div>

          <div className="px-6 py-6 space-y-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-900 mb-1.5">
                Que puedes hacer
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Verifica que copiaste el link completo del mensaje.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Pide que te envien un nuevo link.</span>
                </li>
              </ul>
            </div>
            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Buzon privado y seguro
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO: OK - mostrar formulario
  // ============================================================
  const label = checkQuery.data?.label ?? null;
  return <InboxForm token={token} label={label} />;
}

// ============================================================================
// FORMULARIO (estado OK)
// ============================================================================

function InboxForm({ token, label }: { token: string; label: string | null }) {
  const [senderName, setSenderName] = useState("");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [storeName, setStoreName] = useState("");
  const [justSent, setJustSent] = useState(false);

  const submitMutation = trpc.personalInboxPublic.submit.useMutation({
    onSuccess: () => {
      setJustSent(true);
      // Limpiar solo los campos del gasto; conservar el nombre del remitente
      setDescription("");
      setAmountText("");
      setStoreName("");
    },
  });

  const parsedAmount = (() => {
    const cleaned = amountText.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();

  const canSend =
    description.trim().length > 0 && !submitMutation.isPending;

  const handleSend = () => {
    if (!canSend) return;
    submitMutation.mutate({
      token,
      senderName: senderName.trim() || null,
      description: description.trim(),
      amount: parsedAmount,
      storeName: storeName.trim() || null,
      rawText: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 pb-12">
      {/* ========== HEADER ========== */}
      <header className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl">
        <div className="max-w-xl mx-auto px-5 py-7">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100">
                Buzon de gastos
              </p>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {label ? `Hola, ${label}` : "Registrar un gasto"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-5 py-6 space-y-5">
        {/* ========== AVISO DE EXITO ========== */}
        {justSent && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">
                Listo, gasto enviado
              </p>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                Quedo guardado para revision. Puedes mandar otro abajo.
              </p>
            </div>
          </section>
        )}

        {/* ========== ERROR DE ENVIO ========== */}
        {submitMutation.isError && (
          <section className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900">No se pudo enviar</p>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                {submitMutation.error?.message ||
                  "Revisa tu conexion e intenta de nuevo."}
              </p>
            </div>
          </section>
        )}

        {/* ========== TARJETA FORMULARIO ========== */}
        <section className="bg-white rounded-3xl shadow-md border border-stone-200 px-5 py-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              Nuevo gasto
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Llena lo que sepas. Solo el{" "}
              <span className="font-bold text-slate-900">que compraste</span> es
              obligatorio.
            </p>
          </div>

          {/* Que compraste (obligatorio) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Que compraste <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Despensa de la semana"
              maxLength={255}
              className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
            />
          </div>

          {/* Cuanto costo */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Cuanto costo
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 pl-8 pr-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Donde lo compraste */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Donde lo compraste
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ej. Walmart, mercado, etc."
              maxLength={120}
              className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
            />
          </div>

          {/* Tu nombre (opcional) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Tu nombre <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Para saber quien lo mando"
              maxLength={80}
              className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
            />
          </div>

          {/* Boton enviar */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold h-14 rounded-2xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : justSent ? (
              <>
                <Plus className="w-5 h-5" />
                Enviar otro gasto
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar gasto
              </>
            )}
          </button>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="pt-2 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            Buzon privado y seguro · Tu link es unico
          </p>
        </footer>
      </main>
    </div>
  );
}
