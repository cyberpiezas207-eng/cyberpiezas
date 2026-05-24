import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "../../_core/hooks/useAuth";
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
  CheckCircle2,
  XCircle,
  MessageCircle,
  Phone,
  Send,
  Flag,
  StopCircle,
  ExternalLink,
} from "lucide-react";

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

export default function MobilityViaje() {
  const [, params] = useRoute("/mobility/viaje/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth() as any;

  const rideId = params?.id ? parseInt(params.id) : null;

  const rideQuery = trpc.mobility.rides.getById.useQuery(
    { id: rideId ?? 0 },
    { enabled: !!rideId },
  );

  if (!rideId) {
    return <ErrorScreen message="Viaje inválido." />;
  }
  if (rideQuery.isLoading) {
    return <LoadingScreen />;
  }
  if (!rideQuery.data) {
    return <ErrorScreen message="Este viaje no existe o fue eliminado." />;
  }

  const ride = rideQuery.data;
  const isDriver = user?.id === ride.driverId;

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

        <RideSummary ride={ride} />

        {isDriver ? (
          <DriverActions ride={ride} onRefetch={() => rideQuery.refetch()} />
        ) : (
          <PassengerActions ride={ride} onRefetch={() => rideQuery.refetch()} />
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <p className="text-sm text-slate-300 mb-5">{message}</p>
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full text-sm font-semibold transition-colors"
        >
          Volver a Mobility <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function RideSummary({ ride }: { ride: any }) {
  const [, setLocation] = useLocation();
  const departureDate = new Date(ride.departureAt);
  const dateStr = departureDate.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = departureDate.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const driverProfileQuery = trpc.mobility.profile.getPublic.useQuery({
    userId: ride.driverId,
  });

  const cost = ride.suggestedCostPerSeat ? parseFloat(ride.suggestedCostPerSeat) : null;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 mb-5 relative overflow-hidden">
      <div className={"absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 bg-gradient-to-br " + MOBILITY_ACCENT} />

      <div className="relative">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <StatusBadge status={ride.status} />
          {driverProfileQuery.data && (
            <button
              onClick={() => setLocation("/mobility/perfil/" + ride.driverId)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
            >
              <span>Conductor:</span>
              <span className="text-white font-medium group-hover:underline">{driverProfileQuery.data.displayName}</span>
              {(driverProfileQuery.data.role === "driver_verified" || driverProfileQuery.data.role === "both") && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium capitalize">{dateStr}</span>
          <span>·</span>
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium">{timeStr}</span>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Desde</p>
              <p className="text-base text-white font-medium">{ride.originText}</p>
            </div>
          </div>
          <div className="ml-1.5 w-px h-6 bg-gradient-to-b from-blue-400/50 to-cyan-400/50" />
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Hasta</p>
              <p className="text-base text-white font-medium">{ride.destinationText}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider font-bold">Lugares</span>
            </div>
            <p className="text-lg font-bold text-white">
              {ride.seatsAvailable} <span className="text-slate-500 text-sm font-normal">/ {ride.seatsTotal}</span>
            </p>
          </div>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-bold">Costo sugerido</span>
            </div>
            <p className="text-lg font-bold text-white">
              {cost && cost > 0 ? "$" + cost.toFixed(0) + " MXN" : "Gratis"}
            </p>
          </div>
        </div>

        {ride.notes && (
          <div className="mt-5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1.5">
              Notas del conductor
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{ride.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    published: { label: "Disponible", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    full: { label: "Lleno", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
    departed: { label: "En curso", color: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
    completed: { label: "Completado", color: "bg-slate-500/15 border-slate-500/30 text-slate-300" },
    cancelled: { label: "Cancelado", color: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  };
  const c = config[status] ?? config.published;
  return (
    <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider " + c.color}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}

function PassengerActions({ ride, onRefetch }: { ride: any; onRefetch: () => void }) {
  const myBookingQuery = trpc.mobility.bookings.getMineForRide.useQuery({ rideId: ride.id });

  if (myBookingQuery.isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
      </div>
    );
  }

  const myBooking = myBookingQuery.data;

  if (!myBooking) {
    if (ride.status !== "published") {
      return (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <p className="text-sm text-slate-400">Este viaje ya no acepta solicitudes.</p>
        </div>
      );
    }
    if (ride.seatsAvailable <= 0) {
      return (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <p className="text-sm text-slate-400">Ya no hay lugares disponibles.</p>
        </div>
      );
    }
    return <RequestSeatForm ride={ride} onSuccess={() => { onRefetch(); myBookingQuery.refetch(); }} />;
  }

  return <MyBookingStatus ride={ride} booking={myBooking} onRefetch={() => myBookingQuery.refetch()} />;
}

function RequestSeatForm({ ride, onSuccess }: { ride: any; onSuccess: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestMutation = trpc.mobility.bookings.request.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    requestMutation.mutate({
      rideId: ride.id,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT}>
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">Solicitar un lugar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            El conductor verá tu solicitud y decidirá si te aprueba. Cuando apruebe,
            les compartiremos su WhatsApp para coordinarse.
          </p>
        </div>
      </div>

      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
        Mensaje al conductor <span className="text-slate-500 normal-case font-normal">(opcional)</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ej. Llevo una mochila grande. ¿Puedes pasar por mí al centro?"
        rows={3}
        maxLength={500}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none mb-4"
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={requestMutation.isPending}
        className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-40 text-white rounded-full h-11 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
      >
        {requestMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Enviando solicitud...
          </>
        ) : (
          <>
            Solicitar lugar <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

function MyBookingStatus({
  ride,
  booking,
  onRefetch,
}: {
  ride: any;
  booking: any;
  onRefetch: () => void;
}) {
  const [showReport, setShowReport] = useState(false);

  const cancelMutation = trpc.mobility.bookings.cancelByPassenger.useMutation({
    onSuccess: () => onRefetch(),
  });

  const handleCancel = () => {
    if (!confirm("¿Cancelar tu solicitud en este viaje?")) return;
    cancelMutation.mutate({ bookingId: booking.id });
  };

  if (booking.status === "requested") {
    return (
      <div className="bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-base font-bold text-amber-200 mb-1">
              Esperando respuesta del conductor
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu solicitud fue enviada. El conductor la revisará y decidirá si te aprueba.
              Te avisaremos cuando responda.
            </p>
          </div>
        </div>
        {booking.requestNote && (
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Tu mensaje:</p>
            <p className="text-sm text-slate-300 leading-relaxed">{booking.requestNote}</p>
          </div>
        )}
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {cancelMutation.isPending ? "Cancelando..." : "Cancelar mi solicitud"}
        </button>
      </div>
    );
  }

  if (booking.status === "approved") {
    return (
      <>
        <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 mb-4">
          <div className="flex items-start gap-3 mb-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-emerald-200 mb-1">
                Tu lugar fue aprobado
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coordina con el conductor por WhatsApp para confirmar punto de encuentro,
                hora exacta y cualquier detalle adicional.
              </p>
            </div>
          </div>
          <ContactInfoButton otherUserId={ride.driverId} rideId={ride.id} role="conductor" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar mi lugar
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Flag className="w-3.5 h-3.5" /> Reportar conductor
          </button>
        </div>

        {showReport && (
          <ReportModal
            subjectUserId={ride.driverId}
            rideId={ride.id}
            onClose={() => setShowReport(false)}
          />
        )}
      </>
    );
  }

  if (booking.status === "rejected") {
    return (
      <div className="bg-rose-500/5 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-rose-200 mb-1">Solicitud no aprobada</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              El conductor no aprobó tu solicitud. Puedes buscar otro viaje.
            </p>
          </div>
        </div>
        {booking.responseNote && (
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Mensaje del conductor:</p>
            <p className="text-sm text-slate-300 leading-relaxed">{booking.responseNote}</p>
          </div>
        )}
      </div>
    );
  }

  if (booking.status.startsWith("cancelled")) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
        <StopCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-400">
          {booking.status === "cancelled_by_passenger"
            ? "Cancelaste tu solicitud en este viaje."
            : "El conductor canceló este viaje."}
        </p>
      </div>
    );
  }

  if (booking.status === "completed") {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300">Viaje completado.</p>
        <p className="text-xs text-slate-500 mt-1">Pronto podrás dejar una reseña.</p>
      </div>
    );
  }

  return null;
}

function DriverActions({ ride, onRefetch }: { ride: any; onRefetch: () => void }) {
  const bookingsQuery = trpc.mobility.bookings.listForRide.useQuery({ rideId: ride.id });

  const cancelRideMutation = trpc.mobility.rides.cancel.useMutation({
    onSuccess: () => onRefetch(),
  });
  const markCompletedMutation = trpc.mobility.rides.markCompleted.useMutation({
    onSuccess: () => { onRefetch(); bookingsQuery.refetch(); },
  });

  const handleCancelRide = () => {
    if (!confirm("¿Cancelar este viaje? Se notificará a todos los pasajeros aprobados.")) return;
    cancelRideMutation.mutate({ rideId: ride.id });
  };
  const handleMarkCompleted = () => {
    if (!confirm("¿Marcar el viaje como completado? Esto habilitará las reseñas.")) return;
    markCompletedMutation.mutate({ rideId: ride.id });
  };

  const bookings = bookingsQuery.data ?? [];
  const requested = bookings.filter((b: any) => b.status === "requested");
  const approved = bookings.filter((b: any) => b.status === "approved" || b.status === "completed");

  const canManage = ride.status === "published" || ride.status === "full";
  const canComplete = ride.status === "published" || ride.status === "full" || ride.status === "departed";

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
          Solicitudes nuevas {requested.length > 0 && <span className="text-blue-400">({requested.length})</span>}
        </h3>
        {bookingsQuery.isLoading ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
          </div>
        ) : requested.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
            <p className="text-sm text-slate-400">No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requested.map((b: any) => (
              <BookingCard key={b.id} booking={b} variant="pending" onDecided={() => { bookingsQuery.refetch(); onRefetch(); }} />
            ))}
          </div>
        )}
      </section>

      {approved.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
            Pasajeros confirmados ({approved.length})
          </h3>
          <div className="space-y-3">
            {approved.map((b: any) => (
              <BookingCard key={b.id} booking={b} variant="approved" rideId={ride.id} onDecided={() => bookingsQuery.refetch()} />
            ))}
          </div>
        </section>
      )}

      {(canManage || canComplete) && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
            Acciones del viaje
          </h3>
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-2">
            {canComplete && (
              <button
                onClick={handleMarkCompleted}
                disabled={markCompletedMutation.isPending}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {markCompletedMutation.isPending ? "Marcando..." : "Marcar como completado"}
              </button>
            )}
            {canManage && (
              <button
                onClick={handleCancelRide}
                disabled={cancelRideMutation.isPending}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {cancelRideMutation.isPending ? "Cancelando..." : "Cancelar viaje"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  variant,
  rideId,
  onDecided,
}: {
  booking: any;
  variant: "pending" | "approved";
  rideId?: number;
  onDecided: () => void;
}) {
  const [, setLocation] = useLocation();
  const [responseNote, setResponseNote] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const passengerProfileQuery = trpc.mobility.profile.getPublic.useQuery({
    userId: booking.passengerId,
  });

  const decideMutation = trpc.mobility.bookings.decide.useMutation({
    onSuccess: () => onDecided(),
  });

  const handleApprove = () => {
    decideMutation.mutate({
      bookingId: booking.id,
      decision: "approved",
      note: responseNote.trim() || undefined,
    });
  };
  const handleReject = () => {
    decideMutation.mutate({
      bookingId: booking.id,
      decision: "rejected",
      note: responseNote.trim() || undefined,
    });
  };

  const passenger = passengerProfileQuery.data;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={() => setLocation("/mobility/perfil/" + booking.passengerId)}
          className="flex items-center gap-3 group"
        >
          <div className={"w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br " + MOBILITY_ACCENT}>
            <span className="text-sm font-bold text-white">
              {passenger?.displayName?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white group-hover:underline">{passenger?.displayName ?? "Pasajero"}</p>
            {passenger?.baseCity && (
              <p className="text-xs text-slate-400">{passenger.baseCity}</p>
            )}
          </div>
        </button>
        {variant === "approved" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
            Aprobado
          </span>
        )}
      </div>

      {booking.requestNote && (
        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Mensaje:</p>
          <p className="text-sm text-slate-300 leading-relaxed">{booking.requestNote}</p>
        </div>
      )}

      {variant === "pending" && (
        <>
          {showResponse && (
            <textarea
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder="Mensaje opcional al pasajero..."
              rows={2}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none mb-3"
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReject}
              disabled={decideMutation.isPending}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Rechazar
            </button>
            <button
              onClick={handleApprove}
              disabled={decideMutation.isPending}
              className={"bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 text-white rounded-full h-10 text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"}
            >
              <CheckCircle2 className="w-4 h-4" /> Aprobar
            </button>
          </div>
          {!showResponse && (
            <button
              onClick={() => setShowResponse(true)}
              className="w-full text-xs text-slate-400 hover:text-white mt-2 transition-colors"
            >
              Agregar mensaje al responder
            </button>
          )}
        </>
      )}

      {variant === "approved" && rideId && (
        <div className="space-y-2">
          <ContactInfoButton otherUserId={booking.passengerId} rideId={rideId} role="pasajero" />
          <button
            onClick={() => setShowReport(true)}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-9 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Flag className="w-3 h-3" /> Reportar pasajero
          </button>
        </div>
      )}

      {showReport && rideId && (
        <ReportModal
          subjectUserId={booking.passengerId}
          rideId={rideId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function ContactInfoButton({
  otherUserId,
  rideId,
  role,
}: {
  otherUserId: number;
  rideId: number;
  role: "conductor" | "pasajero";
}) {
  const [revealed, setRevealed] = useState(false);

  const contactQuery = trpc.mobility.profile.getContactInfo.useQuery(
    { otherUserId, rideId },
    { enabled: revealed },
  );

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 text-white rounded-full h-11 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2 text-sm"}
      >
        <MessageCircle className="w-4 h-4" /> Ver WhatsApp del {role}
      </button>
    );
  }

  if (contactQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (contactQuery.error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-rose-300">{contactQuery.error.message}</p>
      </div>
    );
  }

  const data = contactQuery.data;
  if (!data) return null;

  const whatsappLink = "https://wa.me/" + data.phone.replace(/[^0-9]/g, "");

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-3 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
            Abrir WhatsApp
          </p>
          <p className="text-sm text-white font-medium">{data.displayName}</p>
          <p className="text-xs text-slate-400">{data.phone}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      </div>
    </a>
  );
}

function ReportModal({
  subjectUserId,
  rideId,
  onClose,
}: {
  subjectUserId: number;
  rideId: number;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<"harassment" | "fraud" | "no_show" | "safety" | "doxxing" | "spam" | "discrimination" | "other">("harassment");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reportMutation = trpc.mobility.reports.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(onClose, 2000);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (description.trim().length < 10) {
      setError("Describe brevemente qué pasó (mínimo 10 caracteres).");
      return;
    }
    reportMutation.mutate({
      subjectUserId,
      rideId,
      category,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 max-h-[92vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white mb-1">Reporte recibido</p>
            <p className="text-sm text-slate-400">Una persona del equipo lo va a revisar.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <Flag className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reportar a esta persona</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tu reporte lo revisa una persona del equipo.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                ¿Qué pasó?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "harassment", label: "Acoso" },
                  { value: "safety", label: "Conducta peligrosa" },
                  { value: "no_show", label: "No se presentó" },
                  { value: "fraud", label: "Fraude" },
                  { value: "discrimination", label: "Discriminación" },
                  { value: "doxxing", label: "Privacidad" },
                  { value: "spam", label: "Spam" },
                  { value: "other", label: "Otra cosa" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value as any)}
                    className={
                      "h-9 rounded-lg border text-xs font-semibold transition-all " +
                      (category === opt.value
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-200"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cuéntanos qué pasó
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la situación con tus propias palabras..."
                rows={4}
                maxLength={2000}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-rose-400 focus:outline-none transition-colors resize-none"
              />
            </div>

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
                disabled={reportMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-full h-10 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {reportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Enviar reporte
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
