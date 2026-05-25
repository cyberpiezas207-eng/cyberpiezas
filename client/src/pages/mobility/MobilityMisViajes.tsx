import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Users,
  Car,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Heart,
  History,
  Plus,
  MapPin,
} from "lucide-react";

/**
 * ============================================================================
 * MIS VIAJES — historial del usuario en Mobility
 * ============================================================================
 *
 * Dos secciones (tabs):
 *   - Como conductor: viajes que publiqué
 *   - Como pasajero: solicitudes que hice
 *
 * Para viajes completados, permite dejar reseñas cualitativas.
 * ============================================================================
 */

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

type Tab = "driver" | "passenger";

export default function MobilityMisViajes() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("driver");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Mobility
        </button>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-4">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Mis viajes
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.05] mb-3">
            Tu historial
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
              en Mobility
            </span>
          </h1>
          <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl">
            Aquí ves todos tus viajes pasados y próximos. Después de cada viaje completado,
            puedes dejar una reseña a las personas con las que compartiste el camino.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "driver"} onClick={() => setTab("driver")} icon={<Car className="w-4 h-4" />} label="Como conductor" />
          <TabButton active={tab === "passenger"} onClick={() => setTab("passenger")} icon={<Users className="w-4 h-4" />} label="Como pasajero" />
        </div>

        {tab === "driver" ? <DriverTab /> : <PassengerTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap " +
        (active
          ? "bg-gradient-to-r " + MOBILITY_ACCENT + " text-white shadow-lg " + MOBILITY_GLOW
          : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10")
      }
    >
      {icon} {label}
    </button>
  );
}

// =============================================================================
// TAB: COMO CONDUCTOR
// =============================================================================

function DriverTab() {
  const [, setLocation] = useLocation();
  const ridesQuery = trpc.mobility.rides.listMine.useQuery();
  const rides = ridesQuery.data ?? [];

  const upcoming = rides.filter((r: any) => r.status === "published" || r.status === "full");
  const completed = rides.filter((r: any) => r.status === "completed");
  const cancelled = rides.filter((r: any) => r.status === "cancelled");

  if (ridesQuery.isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
        <Car className="w-10 h-10 text-slate-600 mx-auto mb-4" />
        <p className="text-base font-bold text-white mb-2">Aún no has publicado viajes</p>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
          Cuando publiques un viaje, aparecerá aquí. Puedes empezar ahora.
        </p>
        <button
          onClick={() => setLocation("/mobility/publicar")}
          className={"inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW + " hover:opacity-90 transition-opacity"}
        >
          <Plus className="w-3.5 h-3.5" /> Publicar viaje
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <Section title="Próximos">
          {upcoming.map((ride: any) => (
            <DriverRideCard key={ride.id} ride={ride} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title={"Completados (" + completed.length + ")"}>
          {completed.map((ride: any) => (
            <DriverCompletedRideCard key={ride.id} ride={ride} />
          ))}
        </Section>
      )}

      {cancelled.length > 0 && (
        <Section title="Cancelados">
          {cancelled.map((ride: any) => (
            <DriverRideCard key={ride.id} ride={ride} variant="cancelled" />
          ))}
        </Section>
      )}
    </div>
  );
}

function DriverRideCard({ ride, variant }: { ride: any; variant?: "cancelled" }) {
  const [, setLocation] = useLocation();
  const isCancelled = variant === "cancelled";
  const departureDate = new Date(ride.departureAt);

  return (
    <button
      onClick={() => setLocation("/mobility/viaje/" + ride.id)}
      className={
        "block w-full text-left bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all " +
        (isCancelled ? "opacity-60" : "")
      }
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {departureDate.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
          <span>·</span>
          <Clock className="w-3.5 h-3.5" />
          {departureDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <StatusPill status={ride.status} />
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-sm text-white font-medium line-clamp-1">
          <MapPin className="w-3.5 h-3.5 inline text-blue-400 mr-1" />
          {ride.originText}
        </p>
        <p className="text-sm text-white font-medium line-clamp-1 pl-5">
          → {ride.destinationText}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-white/10">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {ride.seatsAvailable}/{ride.seatsTotal} lugares
        </span>
        <ArrowRight className="w-3 h-3 ml-auto" />
      </div>
    </button>
  );
}

function DriverCompletedRideCard({ ride }: { ride: any }) {
  const bookingsQuery = trpc.mobility.bookings.listForRide.useQuery({ rideId: ride.id });
  const reviewsQuery = trpc.mobility.reviews.listForUser.useQuery({ userId: -1 });

  const completedBookings = (bookingsQuery.data ?? []).filter((b: any) => b.status === "completed");

  const departureDate = new Date(ride.departureAt);

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {departureDate.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
          Completado
        </span>
      </div>

      <div className="space-y-1 mb-4">
        <p className="text-sm text-white font-medium line-clamp-1">
          <MapPin className="w-3.5 h-3.5 inline text-blue-400 mr-1" />
          {ride.originText}
        </p>
        <p className="text-sm text-white font-medium line-clamp-1 pl-5">
          → {ride.destinationText}
        </p>
      </div>

      {bookingsQuery.isLoading ? (
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      ) : completedBookings.length === 0 ? (
        <p className="text-xs text-slate-500">Nadie completó este viaje.</p>
      ) : (
        <div className="space-y-2 pt-3 border-t border-white/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Pasajeros que viajaron contigo
          </p>
          {completedBookings.map((b: any) => (
            <PassengerToReview key={b.id} booking={b} rideId={ride.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function PassengerToReview({ booking, rideId }: { booking: any; rideId: number }) {
  const [showReview, setShowReview] = useState(false);
  const passengerProfileQuery = trpc.mobility.profile.getPublic.useQuery({
    userId: booking.passengerId,
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={"w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT}>
            <span className="text-xs font-bold text-white">
              {passengerProfileQuery.data?.displayName?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <p className="text-sm text-white font-medium truncate">
            {passengerProfileQuery.data?.displayName ?? "..."}
          </p>
        </div>
        <button
          onClick={() => setShowReview(true)}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full h-8 px-3 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
        >
          <Heart className="w-3 h-3" /> Reseñar
        </button>
      </div>

      {showReview && (
        <ReviewModal
          rideId={rideId}
          subjectUserId={booking.passengerId}
          subjectName={passengerProfileQuery.data?.displayName ?? "esta persona"}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// TAB: COMO PASAJERO
// =============================================================================

function PassengerTab() {
  const [, setLocation] = useLocation();
  const bookingsQuery = trpc.mobility.bookings.listMine.useQuery();
  const bookings = bookingsQuery.data ?? [];

  const pending = bookings.filter((b: any) => b.status === "requested");
  const approved = bookings.filter((b: any) => b.status === "approved");
  const completed = bookings.filter((b: any) => b.status === "completed");
  const other = bookings.filter((b: any) =>
    b.status === "rejected" || b.status.startsWith("cancelled"),
  );

  if (bookingsQuery.isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
        <Users className="w-10 h-10 text-slate-600 mx-auto mb-4" />
        <p className="text-base font-bold text-white mb-2">Aún no has solicitado lugares</p>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
          Cuando solicites un lugar en un viaje, aparecerá aquí.
        </p>
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full text-sm font-semibold transition-colors"
        >
          Buscar viajes <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Section title={"Esperando respuesta (" + pending.length + ")"}>
          {pending.map((b: any) => (
            <PassengerBookingCard key={b.id} booking={b} />
          ))}
        </Section>
      )}

      {approved.length > 0 && (
        <Section title="Aprobados (próximos)">
          {approved.map((b: any) => (
            <PassengerBookingCard key={b.id} booking={b} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title={"Completados (" + completed.length + ")"}>
          {completed.map((b: any) => (
            <PassengerCompletedBookingCard key={b.id} booking={b} />
          ))}
        </Section>
      )}

      {other.length > 0 && (
        <Section title="Rechazados / cancelados">
          {other.map((b: any) => (
            <PassengerBookingCard key={b.id} booking={b} variant="other" />
          ))}
        </Section>
      )}
    </div>
  );
}

function PassengerBookingCard({ booking, variant }: { booking: any; variant?: "other" }) {
  const [, setLocation] = useLocation();
  const rideQuery = trpc.mobility.rides.getById.useQuery({ id: booking.rideId });
  const ride = rideQuery.data;

  return (
    <button
      onClick={() => setLocation("/mobility/viaje/" + booking.rideId)}
      className={
        "block w-full text-left bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all " +
        (variant === "other" ? "opacity-60" : "")
      }
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        {ride && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(ride.departureAt).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        )}
        <BookingStatusPill status={booking.status} />
      </div>

      {ride ? (
        <div className="space-y-1">
          <p className="text-sm text-white font-medium line-clamp-1">
            <MapPin className="w-3.5 h-3.5 inline text-blue-400 mr-1" />
            {ride.originText}
          </p>
          <p className="text-sm text-white font-medium line-clamp-1 pl-5">
            → {ride.destinationText}
          </p>
        </div>
      ) : (
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      )}
    </button>
  );
}

function PassengerCompletedBookingCard({ booking }: { booking: any }) {
  const [showReview, setShowReview] = useState(false);
  const rideQuery = trpc.mobility.rides.getById.useQuery({ id: booking.rideId });
  const ride = rideQuery.data;
  const driverProfileQuery = trpc.mobility.profile.getPublic.useQuery(
    { userId: ride?.driverId ?? 0 },
    { enabled: !!ride },
  );

  return (
    <>
      <div className="bg-white/[0.03] backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          {ride && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(ride.departureAt).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
            Completado
          </span>
        </div>

        {ride && (
          <div className="space-y-1 mb-4">
            <p className="text-sm text-white font-medium line-clamp-1">
              <MapPin className="w-3.5 h-3.5 inline text-blue-400 mr-1" />
              {ride.originText}
            </p>
            <p className="text-sm text-white font-medium line-clamp-1 pl-5">
              → {ride.destinationText}
            </p>
          </div>
        )}

        {ride && driverProfileQuery.data && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT}>
                <span className="text-xs font-bold text-white">
                  {driverProfileQuery.data.displayName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Conductor</p>
                <p className="text-sm text-white font-medium truncate">
                  {driverProfileQuery.data.displayName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReview(true)}
              className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full h-8 px-3 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Heart className="w-3 h-3" /> Reseñar
            </button>
          </div>
        )}
      </div>

      {showReview && ride && driverProfileQuery.data && (
        <ReviewModal
          rideId={booking.rideId}
          subjectUserId={ride.driverId}
          subjectName={driverProfileQuery.data.displayName}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// REVIEW MODAL
// =============================================================================

function ReviewModal({
  rideId,
  subjectUserId,
  subjectName,
  onClose,
}: {
  rideId: number;
  subjectUserId: number;
  subjectName: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reviewMutation = trpc.mobility.reviews.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(onClose, 2000);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (content.trim().length < 5) {
      setError("La reseña debe tener al menos unas palabras (mínimo 5 caracteres).");
      return;
    }
    reviewMutation.mutate({
      rideId,
      subjectUserId,
      content: content.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 max-h-[92vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white mb-1">Reseña enviada</p>
            <p className="text-sm text-slate-400">
              {subjectName} ya puede verla en su perfil.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT}>
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reseña para {subjectName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  En Mobility no hay estrellas. Escribe con tus palabras cómo fue compartir camino.
                </p>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ej. Llegó puntual, conversación tranquila, manejó con cuidado..."
              rows={5}
              maxLength={1000}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none mb-2"
            />
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Tu reseña va a quedar visible en el perfil público de {subjectName} para que
              otros la lean antes de viajar con esta persona. Sé honesto y específico.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={reviewMutation.isPending}
                className={"bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-50 text-white rounded-full h-10 text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5"}
              >
                {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Enviar reseña</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    published: { label: "Disponible", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    full: { label: "Lleno", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
    departed: { label: "En curso", color: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
    completed: { label: "Completado", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    cancelled: { label: "Cancelado", color: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  };
  const c = config[status] ?? config.published;
  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider " + c.color}>
      {c.label}
    </span>
  );
}

function BookingStatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    requested: { label: "Esperando", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
    approved: { label: "Aprobado", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    rejected: { label: "Rechazado", color: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
    cancelled_by_passenger: { label: "Cancelado", color: "bg-slate-500/15 border-slate-500/30 text-slate-300" },
    cancelled_by_driver: { label: "Cancelado por conductor", color: "bg-slate-500/15 border-slate-500/30 text-slate-300" },
    completed: { label: "Completado", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  };
  const c = config[status] ?? config.requested;
  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider " + c.color}>
      {c.label}
    </span>
  );
}
