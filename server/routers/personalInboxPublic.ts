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
  ShoppingCart,
  Fuel,
  Banknote,
  Heart,
} from "lucide-react";

// ============================================================================
// BUZON PUBLICO (formato esposa) - Paso 3 + tipos (gasto/gasolina/ingreso/deseo)
// ----------------------------------------------------------------------------
// Pagina publica accesible via cyberpiezas.com/buzon/:token
// Es lo que la esposa (u otra persona de confianza) ve en su celular cuando
// abre el link secreto que el dueno le mando.
//
// Sin login, sin password. El token ES la credencial.
//
// AMPLIACION: primero elige QUE quiere mandar con 4 botones grandes:
//   - Gasto    : algo que compro
//   - Gasolina : echo gas al carro (pide odometro)
//   - Ingreso  : dinero que va a entrar (pide fecha de pago)
//   - Deseo    : algo que quiere (pide para cuando)
// Segun el tipo, el formulario pide lo necesario. Todo viaja en "meta".
//
// Solo CREA pendientes (no gastos reales). El dueno revisa y confirma luego.
// Mobile-first, calido, botones grandes, simple.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

type Kind = "gasto" | "gasolina" | "ingreso" | "deseo";

export default function PublicInbox() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const checkQuery = trpc.personalInboxPublic.check.useQuery(
    { token },
    {
      enabled: !!token && token.length >= 10,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

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

  const label = checkQuery.data?.label ?? null;
  return <InboxForm token={token} label={label} />;
}

// ============================================================================
// CONFIG de tipos (para los botones grandes)
// ============================================================================

const KINDS: Array<{
  key: Kind;
  label: string;
  desc: string;
  icon: any;
  grad: string;
  ring: string;
  text: string;
}> = [
  {
    key: "gasto",
    label: "Gasto",
    desc: "Algo que compre",
    icon: ShoppingCart,
    grad: "from-orange-400 to-amber-500",
    ring: "ring-orange-300",
    text: "text-orange-700",
  },
  {
    key: "gasolina",
    label: "Gasolina",
    desc: "Le eche gas al carro",
    icon: Fuel,
    grad: "from-sky-400 to-blue-500",
    ring: "ring-sky-300",
    text: "text-sky-700",
  },
  {
    key: "ingreso",
    label: "Ingreso",
    desc: "Dinero que va a entrar",
    icon: Banknote,
    grad: "from-emerald-400 to-green-500",
    ring: "ring-emerald-300",
    text: "text-emerald-700",
  },
  {
    key: "deseo",
    label: "Deseo",
    desc: "Algo que quiero",
    icon: Heart,
    grad: "from-pink-400 to-rose-500",
    ring: "ring-pink-300",
    text: "text-pink-700",
  },
];

// ============================================================================
// FORMULARIO (estado OK)
// ============================================================================

function InboxForm({ token, label }: { token: string; label: string | null }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [senderName, setSenderName] = useState("");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [storeName, setStoreName] = useState("");
  const [odometerText, setOdometerText] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [wishWhen, setWishWhen] = useState("");
  const [justSent, setJustSent] = useState(false);

  const submitMutation = trpc.personalInboxPublic.submit.useMutation({
    onSuccess: () => {
      setJustSent(true);
      setDescription("");
      setAmountText("");
      setStoreName("");
      setOdometerText("");
      setIncomeDate("");
      setWishWhen("");
    },
  });

  function parseNum(t: string): number | null {
    const cleaned = t.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const parsedAmount = parseNum(amountText);
  const parsedOdometer = parseNum(odometerText);

  const canSend =
    kind != null &&
    description.trim().length > 0 &&
    !submitMutation.isPending;

  const handleSend = () => {
    if (!canSend || !kind) return;
    const meta: Record<string, any> = { kind };
    if (kind === "gasolina") {
      meta.odometer = parsedOdometer;
    } else if (kind === "ingreso") {
      meta.incomeDate = incomeDate || null;
    } else if (kind === "deseo") {
      meta.wishWhen = wishWhen || null;
    }
    submitMutation.mutate({
      token,
      senderName: senderName.trim() || null,
      description: description.trim(),
      amount: parsedAmount,
      storeName: storeName.trim() || null,
      rawText: null,
      meta,
    });
  };

  const activeKind = KINDS.find((k) => k.key === kind) ?? null;

  // Textos que cambian segun el tipo
  const descLabel =
    kind === "gasolina"
      ? "Que carro / nota"
      : kind === "ingreso"
        ? "De que es el ingreso"
        : kind === "deseo"
          ? "Que te gustaria"
          : "Que compraste";
  const descPlaceholder =
    kind === "gasolina"
      ? "Ej. Chevy"
      : kind === "ingreso"
        ? "Ej. Trabajo del sabado"
        : kind === "deseo"
          ? "Ej. Perfume tal"
          : "Ej. Despensa de la semana";
  const amountLabel =
    kind === "ingreso"
      ? "Cuanto te van a pagar"
      : kind === "deseo"
        ? "Cuanto cuesta"
        : "Cuanto costo";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 pb-12">
      {/* HEADER */}
      <header className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl">
        <div className="max-w-xl mx-auto px-5 py-7">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100">
                Mi buzon
              </p>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {label ? `Hola, ${label}` : "Que quieres mandar?"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-5 py-6 space-y-5">
        {/* AVISO DE EXITO */}
        {justSent && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">
                Listo, ya se mando
              </p>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                Quedo guardado para revision. Puedes mandar otro abajo.
              </p>
            </div>
          </section>
        )}

        {/* ERROR DE ENVIO */}
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

        {/* PASO 1: ELEGIR TIPO (botones grandes) */}
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 px-1">
            1. Que quieres mandar
          </p>
          <div className="grid grid-cols-2 gap-3">
            {KINDS.map((k) => {
              const active = kind === k.key;
              return (
                <button
                  key={k.key}
                  onClick={() => {
                    setKind(k.key);
                    setJustSent(false);
                  }}
                  className={`relative overflow-hidden rounded-3xl border-2 p-4 text-left transition-all active:scale-[0.97] ${
                    active
                      ? `bg-gradient-to-br ${k.grad} text-white border-transparent shadow-lg`
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2 ${
                      active ? "bg-white/20" : "bg-stone-100"
                    }`}
                  >
                    <k.icon
                      className={`w-6 h-6 ${active ? "text-white" : k.text}`}
                    />
                  </div>
                  <p
                    className={`text-base font-bold leading-tight ${
                      active ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {k.label}
                  </p>
                  <p
                    className={`text-[11px] leading-snug mt-0.5 ${
                      active ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {k.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* PASO 2: FORMULARIO (aparece al elegir tipo) */}
        {kind && (
          <section className="bg-white rounded-3xl shadow-md border border-stone-200 px-5 py-6 space-y-5">
            <div className="flex items-center gap-2">
              {activeKind && (
                <span
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeKind.grad} flex items-center justify-center`}
                >
                  <activeKind.icon className="w-5 h-5 text-white" />
                </span>
              )}
              <p className="text-sm font-bold text-slate-900">
                2. Datos del {activeKind?.label.toLowerCase()}
              </p>
            </div>

            {/* Descripcion (obligatorio) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                {descLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descPlaceholder}
                maxLength={255}
                className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                {amountLabel}
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

            {/* Campo extra GASOLINA: odometro */}
            {kind === "gasolina" && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">
                  Kilometraje (odometro)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={odometerText}
                  onChange={(e) => setOdometerText(e.target.value)}
                  placeholder="Ej. 45200"
                  className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  El numero que marca el tablero del carro.
                </p>
              </div>
            )}

            {/* Campo extra TIENDA (solo gasto) */}
            {kind === "gasto" && (
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
            )}

            {/* Campo extra INGRESO: fecha de pago */}
            {kind === "ingreso" && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">
                  Que dia te pagan
                </label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Asi se agenda como ingreso que va a entrar.
                </p>
              </div>
            )}

            {/* Campo extra DESEO: para cuando */}
            {kind === "deseo" && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">
                  Para cuando lo quieres
                </label>
                <input
                  type="date"
                  value={wishWhen}
                  onChange={(e) => setWishWhen(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-stone-300 bg-stone-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Una meta para ir ahorrando hacia eso.
                </p>
              </div>
            )}

            {/* Tu nombre (opcional) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                Tu nombre{" "}
                <span className="text-slate-400 font-normal">(opcional)</span>
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
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar
                </>
              )}
            </button>
          </section>
        )}

        {/* Boton mandar otro tras exito */}
        {justSent && (
          <button
            onClick={() => {
              setKind(null);
              setJustSent(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-amber-300 text-amber-700 font-bold h-12 rounded-2xl active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            Mandar otra cosa
          </button>
        )}

        {/* FOOTER */}
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
