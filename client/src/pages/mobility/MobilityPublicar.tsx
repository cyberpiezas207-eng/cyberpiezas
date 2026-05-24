import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
  CheckCircle2,
} from "lucide-react";

/**
 * ============================================================================
 * MOBILITY PUBLICAR — formulario para crear un viaje
 * ============================================================================
 *
 * Requiere: usuario logueado con perfil de Mobility y rol driver_verified.
 * Si no cumple, redirige a /mobility con mensaje.
 *
 * Campos:
 *   - Origen (texto libre, ej. "Cuernavaca centro")
 *   - Destino (texto libre, ej. "UAEM Cuernavaca")
 *   - Fecha
 *   - Hora
 *   - Lugares disponibles (1-8)
 *   - Costo sugerido por lugar (opcional, MXN)
 *   - Notas adicionales (opcional)
 *
 * Después de publicar exitosamente: regresa a /mobility.
 * ============================================================================
 */

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

export default function MobilityPublicar() {
  const [, setLocation] = useLocation();
  const profileQuery = trpc.mobility.profile.getMine.useQuery();

  // Loading
  if (profileQuery.isLoading) {
    return <LoadingScreen />;
  }

  const profile = profileQuery.data;

  // Sin perfil → mandar a /mobility
  if (!profile) {
    return <RedirectScreen message="Necesitas crear tu perfil de Mobility primero." href="/mobility" />;
  }

  // Sin verificación de conductor → mandar a verificarse
  const isVerifiedDriver = profile.role === "driver_verified" || profile.role === "both";
  if (!isVerifiedDriver) {
    return <NotDriverScreen profile={profile} />;
  }

  return <PublicarForm />;
}

// =============================================================================
// LOADING
// =============================================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    </div>
  );
}

// =============================================================================
// REDIRECT SIMPLE
// =============================================================================

function RedirectScreen({ message, href }: { message: string; href: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <p className="text-sm text-slate-300 mb-5">{message}</p>
        <button
          onClick={() => setLocation(href)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full text-sm font-semibold transition-colors"
        >
          Volver a Mobility <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// NO ES CONDUCTOR (pasajero o verificación pendiente)
// =============================================================================

function NotDriverScreen({ profile }: { profile: any }) {
  const [, setLocation] = useLocation();
  const isPending = profile.role === "driver_pending";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7">
        <div className={"w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-gradient-to-br " + MOBILITY_ACCENT + " " + MOBILITY_GLOW + " shadow-lg"}>
          <Car className="w-6 h-6 text-white" />
        </div>

        {isPending ? (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              Tu verificación está en revisión
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed text-center mb-6">
              Cuando aprobemos tu identidad podrás publicar viajes. Mientras
              tanto puedes solicitar lugares como pasajero.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              Primero verifica tu identidad
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed text-center mb-6">
              Para publicar viajes necesitas que confirmemos quién eres con tu INE
              y una selfie. La revisión es rápida — la hace una persona del equipo.
            </p>
          </>
        )}

        <div className="flex flex-col gap-2">
          {!isPending && (
            <button
              onClick={() => setLocation("/mobility/verificacion")}
              className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 text-white rounded-full h-11 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
            >
              <ShieldCheck className="w-4 h-4" /> Verificarme ahora
            </button>
          )}
          <button
            onClick={() => setLocation("/mobility")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-11 font-semibold transition-colors"
          >
            Volver a Mobility
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FORMULARIO DE PUBLICACIÓN
// =============================================================================

function PublicarForm() {
  const [, setLocation] = useLocation();

  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState<number>(3);
  const [costPerSeat, setCostPerSeat] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const createMutation = trpc.mobility.rides.create.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => setLocation("/mobility"), 1800);
    },
    onError: (err) => {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones humanas
    if (originText.trim().length < 3) {
      setError("Falta describir mejor el origen.");
      return;
    }
    if (destinationText.trim().length < 3) {
      setError("Falta describir mejor el destino.");
      return;
    }
    if (!date || !time) {
      setError("Falta la fecha o la hora del viaje.");
      return;
    }

    // Combinar fecha + hora
    const departureISO = new Date(date + "T" + time).toISOString();
    if (isNaN(new Date(departureISO).getTime())) {
      setError("La fecha o la hora no son válidas.");
      return;
    }
    if (new Date(departureISO).getTime() < Date.now()) {
      setError("La fecha y hora del viaje ya pasaron.");
      return;
    }

    const cost = costPerSeat.trim() ? parseFloat(costPerSeat) : undefined;
    if (cost !== undefined && (isNaN(cost) || cost < 0)) {
      setError("El costo sugerido tiene que ser un número o quedar en blanco.");
      return;
    }

    createMutation.mutate({
      originText: originText.trim(),
      destinationText: destinationText.trim(),
      departureAt: departureISO,
      seatsTotal,
      suggestedCostPerSeat: cost,
      notes: notes.trim() || undefined,
    });
  };

  // Fecha mínima: hoy
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  if (showSuccess) {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Back */}
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Mobility
        </button>

        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-4">
            <Car className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Publicar un viaje
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.05] mb-3">
            ¿A dónde vas
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
              y a quién llevas?
            </span>
          </h1>
          <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl">
            Publica una ruta que vas a hacer y ofrece los lugares disponibles.
            Tú decides quién se sube — apruebas o rechazas cada solicitud manualmente.
          </p>
        </header>

        {/* Error global */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* RUTA */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <SectionTitle icon={<MapPin className="w-4 h-4" />} title="Ruta" />

            <div className="space-y-4">
              <Field label="Saliendo desde" required>
                <input
                  type="text"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  placeholder="Ej. Cuernavaca centro, Plaza de Armas"
                  maxLength={200}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </Field>

              <Field label="Llegando a" required>
                <input
                  type="text"
                  value={destinationText}
                  onChange={(e) => setDestinationText(e.target.value)}
                  placeholder="Ej. UAEM Cuernavaca, Chamilpa"
                  maxLength={200}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </Field>
            </div>
          </div>

          {/* HORARIO */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <SectionTitle icon={<Calendar className="w-4 h-4" />} title="Cuándo sales" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required>
                <input
                  type="date"
                  value={date}
                  min={todayISO}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </Field>
              <Field label="Hora" required>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </Field>
            </div>
          </div>

          {/* LUGARES Y COSTO */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <SectionTitle icon={<Users className="w-4 h-4" />} title="Lugares y costo" />

            {/* Selector de lugares */}
            <Field label="Cuántos lugares ofreces" required>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeatsTotal(n)}
                    className={
                      "flex-1 h-11 rounded-xl border text-sm font-bold transition-all " +
                      (seatsTotal === n
                        ? "bg-gradient-to-br " + MOBILITY_ACCENT + " text-white border-transparent shadow-lg " + MOBILITY_GLOW
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            {/* Costo sugerido */}
            <div className="mt-4">
              <Field label="Costo sugerido por lugar" hint="Opcional. Puedes dejarlo gratis.">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={costPerSeat}
                    onChange={(e) => setCostPerSeat(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-16 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    MXN
                  </span>
                </div>
              </Field>

              <div className="mt-3 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  El dinero entre tú y los pasajeros pasa <span className="font-bold text-white">por fuera de la plataforma</span>:
                  efectivo, transferencia, lo que acuerden. CyberPiezas no cobra
                  comisiones ni intermediación.
                </p>
              </div>
            </div>
          </div>

          {/* NOTAS */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <SectionTitle icon={<Info className="w-4 h-4" />} title="Notas adicionales" />

            <Field label="Algo que los pasajeros deben saber" hint="Opcional. Por ejemplo: si llevas mascota, si no fumas en el coche, si tienes una parada intermedia, etc.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Llevo perro chico en transportadora. No fumadores."
                rows={3}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none"
              />
            </Field>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full h-12 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publicando viaje...
              </>
            ) : (
              <>
                Publicar viaje <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Una vez publicado, los pasajeros podrán solicitar lugar y tú decides
            a quién aceptas. Puedes cancelar el viaje en cualquier momento desde
            tu panel de Mobility.
          </p>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// SUCCESS SCREEN (después de publicar)
// =============================================================================

function SuccessScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-7 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Viaje publicado!
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Te avisaremos cuando alguien solicite un lugar. Regresando a Mobility...
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// SECTION TITLE (encabezado de cada sección del formulario)
// =============================================================================

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={"w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br " + MOBILITY_ACCENT}>
        {icon}
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
    </div>
  );
}

// =============================================================================
// FIELD (label + hint + children)
// =============================================================================

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-blue-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
