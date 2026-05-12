import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Music,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Send,
  X,
  Check,
  Star,
  Eye,
  Sparkles,
  PartyPopper,
  Loader2,
  MessageCircle,
  Heart,
  ArrowRight,
} from "lucide-react";

const GENRE_LABELS: Record<string, string> = {
  banda: "Banda",
  mariachi: "Mariachi",
  norteno: "Norteño",
  cumbia: "Cumbia",
  rock: "Rock",
  pop: "Pop",
  regional: "Regional",
  electronica: "Electrónica",
  jazz: "Jazz",
  clasica: "Clásica",
  tropical: "Tropical",
  reggaeton: "Reggaeton",
  otro: "Música",
};

const GENRE_EMOJIS: Record<string, string> = {
  banda: "🎺",
  mariachi: "🎻",
  norteno: "🪗",
  cumbia: "🪘",
  rock: "🎸",
  pop: "🎤",
  regional: "🎼",
  electronica: "🎧",
  jazz: "🎷",
  clasica: "🎹",
  tropical: "🥁",
  reggaeton: "🔊",
  otro: "🎵",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  boda: "Boda",
  "15anos": "XV años",
  cumpleanos: "Cumpleaños",
  evento_corporativo: "Evento corporativo",
  fiesta_privada: "Fiesta privada",
  festival: "Festival",
  bautizo: "Bautizo",
  otro: "Otro",
};

function getYouTubeEmbed(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? "https://www.youtube.com/embed/" + match[1] : null;
}

function getSpotifyEmbed(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url;
  return url.replace("open.spotify.com/", "open.spotify.com/embed/");
}

export default function TarimaPublic() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [showBooking, setShowBooking] = useState(false);

  const profileQuery = trpc.tarima.profile.getBySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false },
  );

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎭</div>
          <h1 className="text-2xl font-bold text-white mb-2">Artista no encontrado</h1>
          <p className="text-slate-400">
            Este perfil no existe o no está publicado todavía.
          </p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const genreEmoji = GENRE_EMOJIS[profile.genre] || "🎵";
  const genreLabel = GENRE_LABELS[profile.genre] || "Música";
  const youtubeEmbed = getYouTubeEmbed(profile.youtubeFeaturedVideo);
  const spotifyEmbed = getSpotifyEmbed(profile.spotifyUrl);
  const whatsappLink = profile.whatsapp
    ? "https://wa.me/" + profile.whatsapp.replace(/\D/g, "")
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Cover image con overlay */}
      <div className="relative h-[280px] sm:h-[360px] lg:h-[440px] overflow-hidden">
        {profile.coverImage ? (
          <img
            src={profile.coverImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/60 to-slate-950" />
        {/* Orbes decorativos */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      {/* Contenido principal */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 -mt-24 sm:-mt-28 pb-16">
        {/* Avatar + Nombre */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-5">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.artistName}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-slate-950 shadow-2xl"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-6xl ring-4 ring-slate-950 shadow-2xl">
                {genreEmoji}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-full border-4 border-slate-950 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            {profile.artistName}
          </h1>

          {/* Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium">
              <span>{genreEmoji}</span>
              {genreLabel}
            </span>
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location}
              </span>
            )}
            {profile.yearsActive && profile.yearsActive > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                {profile.yearsActive} años de experiencia
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm font-bold text-emerald-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Disponible
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-6">
              {profile.bio}
            </p>
          )}

          {/* CTAs principales */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowBooking(true)}
              className="group bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-bold rounded-full h-14 px-8 shadow-2xl shadow-fuchsia-500/40 transition-all hover:shadow-fuchsia-500/60 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <PartyPopper className="w-5 h-5" />
              <span>Reservar para mi evento</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full h-14 px-7 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Redes sociales */}
        {(profile.instagramUrl || profile.facebookUrl || profile.tiktokUrl || profile.youtubeUrl || profile.spotifyUrl) && (
          <div className="mb-10">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
              Sígueme en
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {profile.spotifyUrl && (
                <a
                  href={profile.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center transition-colors"
                  title="Spotify"
                >
                  <Music className="w-5 h-5 text-emerald-400" />
                </a>
              )}
              {profile.youtubeUrl && (
                <a
                  href={profile.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex items-center justify-center transition-colors"
                  title="YouTube"
                >
                  <Youtube className="w-5 h-5 text-red-400" />
                </a>
              )}
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5 text-pink-400" />
                </a>
              )}
              {profile.facebookUrl && (
                <a
                  href={profile.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5 text-blue-400" />
                </a>
              )}
              {profile.tiktokUrl && (
                <a
                  href={profile.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center transition-colors"
                  title="TikTok"
                >
                  <span className="text-base">🎵</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* YouTube destacado */}
        {youtubeEmbed && (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
              Video destacado
            </p>
            <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <iframe
                src={youtubeEmbed}
                title="Video destacado"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Spotify */}
        {spotifyEmbed && (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
              Escúchame en Spotify
            </p>
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
              <iframe
                src={spotifyEmbed}
                width="100%"
                height="232"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Info de contratación */}
        {(profile.minBudget || profile.serviceArea) && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
              Información de contratación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.minBudget && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Desde</p>
                  <p className="text-2xl font-bold text-white">
                    ${parseFloat(profile.minBudget).toLocaleString("es-MX")}
                  </p>
                </div>
              )}
              {profile.serviceArea && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Zona de cobertura</p>
                  <p className="text-base font-medium text-white">
                    {profile.serviceArea}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA final */}
        <div className="text-center mt-12">
          <div className="inline-block bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 rounded-3xl p-8 max-w-lg">
            <Heart className="w-10 h-10 text-fuchsia-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white mb-2">¿Listo para vivir tu evento?</h2>
            <p className="text-slate-300 mb-5">
              Cuéntame qué tienes en mente y te respondo lo antes posible.
            </p>
            <button
              onClick={() => setShowBooking(true)}
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-bold rounded-full h-12 px-7 shadow-lg shadow-fuchsia-500/40 transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar solicitud
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Powered by CyberPiezas Tarima
          </a>
        </footer>
      </div>

      {/* Modal de reserva */}
      {showBooking && (
        <BookingModal
          slug={slug}
          artistName={profile.artistName}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL DE RESERVA
// ============================================================================

function BookingModal({
  slug,
  artistName,
  onClose,
}: {
  slug: string;
  artistName: string;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<string>("otro");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createBooking = trpc.tarima.bookings.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    if (!customerName || !customerPhone) {
      toast.error("Nombre y teléfono son obligatorios");
      return;
    }
    createBooking.mutate({
      profileSlug: slug,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      eventDate: eventDate || undefined,
      eventType: eventType as any,
      eventLocation: eventLocation || undefined,
      eventDescription: eventDescription || undefined,
      budget: budget || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl max-w-md w-full p-8 text-center border border-white/10 shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
            <Check className="w-10 h-10 text-emerald-400" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-300 mb-6">
            {artistName} recibió tu mensaje y te responderá pronto al teléfono que diste.
          </p>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold rounded-full h-11 px-6 w-full"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-3xl max-w-lg w-full my-8 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-white">Reservar a {artistName}</h2>
            <p className="text-xs text-slate-400">Cuéntame de tu evento</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Datos del cliente */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tu nombre *
            </p>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: María González"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Teléfono *
              </p>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email (opcional)
              </p>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Sobre el evento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Tipo de evento</p>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Fecha aproximada</p>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Lugar del evento</p>
              <input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Ej: Salón Las Palmas, Cuernavaca"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
              />
            </div>

            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Presupuesto aproximado (opcional)</p>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ej: 8000"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 h-11 text-white focus:border-fuchsia-400 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1.5">Detalles adicionales</p>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Cuéntame más sobre tu evento, horarios, número de invitados, etc..."
                rows={3}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-fuchsia-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900 rounded-b-3xl">
          <button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-bold rounded-full h-12 shadow-lg shadow-fuchsia-500/40 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createBooking.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar solicitud
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Al enviar aceptas compartir tus datos con el artista para responder tu solicitud.
          </p>
        </div>
      </div>
    </div>
  );
}
