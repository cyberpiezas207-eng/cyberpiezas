import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Music,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Send,
  X,
  Check,
  Eye,
  Loader2,
  MessageCircle,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import { getTheme, getThemeCssVars, type TarimaTheme } from "@/lib/tarimaThemes";

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

// Helper: detectar si un color hex es "claro" (para decidir overlays)
function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const h = hex.length === 4
    ? hex.slice(1).split("").map((c) => c + c).join("")
    : hex.slice(1);
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Formula relativa de luminancia perceptual
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export default function TarimaPublic() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [showBooking, setShowBooking] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const profileQuery = trpc.tarima.profile.getBySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false },
  );

  const photosQuery = trpc.tarima.media.listBySlug.useQuery(
    { slug, type: "photo" },
    { enabled: !!slug },
  );

  const videosQuery = trpc.tarima.media.listBySlug.useQuery(
    { slug, type: "video" },
    { enabled: !!slug },
  );

  const musicQuery = trpc.tarima.media.listBySlug.useQuery(
    { slug, type: "music" },
    { enabled: !!slug },
  );

  // Resolver tema visual a partir del perfil
  const theme = useMemo<TarimaTheme>(() => {
    const profile = profileQuery.data;
    return getTheme(
      profile?.themeId,
      (profile?.customColors as any) ?? null,
      profile?.fontFamily as any,
    );
  }, [profileQuery.data?.themeId, profileQuery.data?.customColors, profileQuery.data?.fontFamily]);

  const cssVars = getThemeCssVars(theme);
  const isLight = isLightColor(theme.colors.bg);

  // Loading state con tema
  if (profileQuery.isLoading) {
    return (
      <div
        style={{ background: theme.colors.bg, color: theme.colors.text }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: theme.colors.primary }}
          />
          <p className="text-sm tracking-widest uppercase opacity-50">
            Cargando perfil
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div
        style={{ background: theme.colors.bg, color: theme.colors.text }}
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6 opacity-50">🎭</div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Artista no encontrado
          </h1>
          <p className="opacity-60">
            Este perfil no existe o no esta publicado todavia.
          </p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const genreEmoji = GENRE_EMOJIS[profile.genre] || "🎵";
  const genreLabel = GENRE_LABELS[profile.genre] || "Musica";
  const youtubeEmbed = getYouTubeEmbed(profile.youtubeFeaturedVideo);
  const spotifyEmbed = getSpotifyEmbed(profile.spotifyUrl);
  const whatsappLink = profile.whatsapp
    ? "https://wa.me/" + profile.whatsapp.replace(/\D/g, "")
    : null;

  // Construir la tagline sutil del hero
  const taglineParts: string[] = [genreLabel];
  if (profile.location) taglineParts.push(profile.location);
  if (profile.yearsActive && profile.yearsActive > 0) {
    taglineParts.push(profile.yearsActive + " años");
  }
  const tagline = taglineParts.join(" · ");

  const hasSocials = !!(
    profile.instagramUrl ||
    profile.facebookUrl ||
    profile.tiktokUrl ||
    profile.youtubeUrl ||
    profile.spotifyUrl
  );

  // Color de border/divider con alpha del text color
  const subtleBorder = isLight
    ? "rgba(0, 0, 0, 0.08)"
    : "rgba(255, 255, 255, 0.1)";
  const subtleBg = isLight
    ? "rgba(0, 0, 0, 0.03)"
    : "rgba(255, 255, 255, 0.05)";

  return (
    <div
      style={{
        ...cssVars,
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: theme.fontFamily,
      } as React.CSSProperties}
      className="min-h-screen"
    >
      {/* =====================================================================
          HERO - Apple-style massive (mobile-first)
          ===================================================================== */}
      <section className="relative min-h-screen sm:min-h-[88vh] flex flex-col items-center justify-center px-5 sm:px-6 py-16 sm:py-24 overflow-hidden">
        {/* Background */}
        {profile.coverImage ? (
          <>
            <img
              src={profile.coverImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${theme.colors.bg}40 0%, ${theme.colors.bg}80 50%, ${theme.colors.bg} 100%)`,
              }}
            />
          </>
        ) : theme.bgGradient ? (
          <div
            className="absolute inset-0"
            style={{ background: theme.bgGradient }}
          />
        ) : null}

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto w-full">
          {/* Avatar */}
          <div className="inline-block mb-7 sm:mb-10">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.artistName}
                className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full object-cover shadow-2xl"
                style={{
                  boxShadow: `0 25px 50px -12px ${theme.colors.primary}40`,
                }}
              />
            ) : (
              <div
                className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full flex items-center justify-center text-5xl sm:text-6xl lg:text-7xl shadow-2xl"
                style={{
                  background: theme.colors.primary,
                  boxShadow: `0 25px 50px -12px ${theme.colors.primary}40`,
                }}
              >
                {genreEmoji}
              </div>
            )}
          </div>

          {/* MASSIVE NAME - mobile first */}
          <h1
            className="text-4xl sm:text-7xl lg:text-8xl font-bold tracking-tighter mb-4 sm:mb-6 leading-[1.05] px-2"
            style={{ color: theme.colors.text }}
          >
            {profile.artistName}
          </h1>

          {/* Sutil tagline */}
          <p
            className="text-[10px] sm:text-sm font-semibold uppercase mb-10 sm:mb-14"
            style={{
              color: theme.colors.text,
              opacity: 0.55,
              letterSpacing: "0.25em",
            }}
          >
            {tagline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2 sm:px-0">
            <button
              onClick={() => setShowBooking(true)}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold rounded-full px-7 sm:px-8 h-13 sm:h-14 text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: theme.colors.primary,
                color: isLightColor(theme.colors.primary)
                  ? "#000000"
                  : "#ffffff",
                boxShadow: `0 10px 30px -10px ${theme.colors.primary}90`,
              }}
            >
              Reservar para mi evento
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold rounded-full px-7 sm:px-7 h-13 sm:h-14 text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  background: "#22c55e",
                  color: "#ffffff",
                  boxShadow: "0 10px 30px -10px rgba(34, 197, 94, 0.6)",
                }}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-40"
          style={{ color: theme.colors.text }}
        >
          <ArrowDown className="w-5 h-5" />
        </div>
      </section>

      {/* =====================================================================
          BIO - Editorial style
          ===================================================================== */}
      {profile.bio && (
        <section className="py-14 sm:py-20 lg:py-28 px-5 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <p
              className="text-lg sm:text-2xl lg:text-3xl font-light leading-relaxed tracking-tight text-center"
              style={{ color: theme.colors.text, opacity: 0.9 }}
            >
              {profile.bio}
            </p>
          </div>
        </section>
      )}

      {/* =====================================================================
          SOCIALES - Minimal row
          ===================================================================== */}
      {hasSocials && (
        <section className="py-10 sm:py-12 px-5 sm:px-6">
          <div className="max-w-md mx-auto">
            <p
              className="text-center text-[10px] font-bold uppercase mb-6"
              style={{
                color: theme.colors.text,
                opacity: 0.5,
                letterSpacing: "0.3em",
              }}
            >
              Encuentrame en
            </p>
            <div className="flex items-center justify-center gap-3">
              {profile.spotifyUrl && (
                <a
                  href={profile.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Spotify"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: subtleBg, color: theme.colors.text }}
                >
                  <Music className="w-5 h-5" />
                </a>
              )}
              {profile.youtubeUrl && (
                <a
                  href={profile.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: subtleBg, color: theme.colors.text }}
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: subtleBg, color: theme.colors.text }}
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.facebookUrl && (
                <a
                  href={profile.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: subtleBg, color: theme.colors.text }}
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {profile.tiktokUrl && (
                <a
                  href={profile.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="TikTok"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: subtleBg, color: theme.colors.text }}
                >
                  <span className="text-lg">🎵</span>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          VIDEO DESTACADO - Massive
          ===================================================================== */}
      {youtubeEmbed && (
        <section className="py-14 sm:py-20 lg:py-28 px-5 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <p
              className="text-center text-[10px] font-bold uppercase mb-6 sm:mb-8"
              style={{
                color: theme.colors.text,
                opacity: 0.5,
                letterSpacing: "0.3em",
              }}
            >
              Video destacado
            </p>
            <div
              className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
              style={{
                boxShadow: `0 25px 60px -15px ${theme.colors.primary}40`,
              }}
            >
              <iframe
                src={youtubeEmbed}
                title="Video destacado"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SPOTIFY DESTACADO
          ===================================================================== */}
      {spotifyEmbed && (
        <section className="py-12 sm:py-16 px-5 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <p
              className="text-center text-[10px] font-bold uppercase mb-6"
              style={{
                color: theme.colors.text,
                opacity: 0.5,
                letterSpacing: "0.3em",
              }}
            >
              Escuchame en Spotify
            </p>
            <div
              className="rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{ border: `1px solid ${subtleBorder}` }}
            >
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
        </section>
      )}

      {/* =====================================================================
          GALERIA DE FOTOS
          ===================================================================== */}
      {photosQuery.data && photosQuery.data.length > 0 && (
        <section className="py-14 sm:py-20 lg:py-28 px-5 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <p
                className="text-[10px] font-bold uppercase mb-2 sm:mb-3"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.3em",
                }}
              >
                Galeria
              </p>
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
                style={{ color: theme.colors.text }}
              >
                Mis momentos
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {photosQuery.data.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo.url)}
                  className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: subtleBg }}
                >
                  <img
                    src={photo.url}
                    alt={photo.title ?? ""}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {photo.isHighlight && (
                    <span
                      className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{
                        background: theme.colors.accent,
                        color: isLightColor(theme.colors.accent)
                          ? "#000000"
                          : "#ffffff",
                        letterSpacing: "0.15em",
                      }}
                    >
                      ⭐
                    </span>
                  )}
                  {photo.title && (
                    <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs font-bold text-white truncate">
                        {photo.title}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAS VIDEOS
          ===================================================================== */}
      {videosQuery.data && videosQuery.data.length > 0 && (
        <section className="py-14 sm:py-20 lg:py-28 px-5 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <p
                className="text-[10px] font-bold uppercase mb-2 sm:mb-3"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.3em",
                }}
              >
                Videos
              </p>
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
                style={{ color: theme.colors.text }}
              >
                Mira y escucha
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {videosQuery.data.map((video) => {
                const embed = getYouTubeEmbed(video.url);
                if (!embed) return null;
                return (
                  <div key={video.id}>
                    <div
                      className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden"
                      style={{
                        boxShadow: `0 15px 40px -10px ${theme.colors.primary}30`,
                      }}
                    >
                      <iframe
                        src={embed}
                        title={video.title ?? "Video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    {video.title && (
                      <p
                        className="text-sm font-medium mt-3 px-1"
                        style={{ color: theme.colors.text, opacity: 0.8 }}
                      >
                        {video.title}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAS MUSICA
          ===================================================================== */}
      {musicQuery.data && musicQuery.data.length > 0 && (
        <section className="py-14 sm:py-20 lg:py-28 px-5 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <p
                className="text-[10px] font-bold uppercase mb-2 sm:mb-3"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.3em",
                }}
              >
                Musica
              </p>
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
                style={{ color: theme.colors.text }}
              >
                Mi sonido
              </h2>
            </div>
            <div className="space-y-4">
              {musicQuery.data.map((track) => {
                const embed = getSpotifyEmbed(track.url);
                if (!embed) return null;
                return (
                  <div key={track.id}>
                    {track.title && (
                      <p
                        className="text-base font-bold mb-2 px-1"
                        style={{ color: theme.colors.text }}
                      >
                        {track.title}
                      </p>
                    )}
                    <div
                      className="rounded-xl sm:rounded-2xl overflow-hidden"
                      style={{ border: `1px solid ${subtleBorder}` }}
                    >
                      <iframe
                        src={embed}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          INFO DE CONTRATACION
          ===================================================================== */}
      {(profile.minBudget || profile.serviceArea) && (
        <section className="py-14 sm:py-20 px-5 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div
              className="p-7 sm:p-10 lg:p-14 rounded-2xl sm:rounded-3xl"
              style={{
                background: subtleBg,
                border: `1px solid ${subtleBorder}`,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase mb-6 sm:mb-8"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.3em",
                }}
              >
                Informacion de contratacion
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                {profile.minBudget && (
                  <div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: theme.colors.text, opacity: 0.5 }}
                    >
                      Desde
                    </p>
                    <p
                      className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
                      style={{ color: theme.colors.text }}
                    >
                      ${parseFloat(profile.minBudget).toLocaleString("es-MX")}
                    </p>
                  </div>
                )}
                {profile.serviceArea && (
                  <div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: theme.colors.text, opacity: 0.5 }}
                    >
                      Zona de cobertura
                    </p>
                    <p
                      className="text-base sm:text-lg font-medium"
                      style={{ color: theme.colors.text, opacity: 0.9 }}
                    >
                      {profile.serviceArea}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          CTA FINAL - Massive
          ===================================================================== */}
      <section className="py-20 sm:py-28 lg:py-40 px-5 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tighter mb-5 sm:mb-6 leading-[1.05]"
            style={{ color: theme.colors.text }}
          >
            ¿Listo para vivir tu evento?
          </h2>
          <p
            className="text-base sm:text-lg lg:text-xl font-light mb-8 sm:mb-12 max-w-xl mx-auto px-2"
            style={{ color: theme.colors.text, opacity: 0.65 }}
          >
            Cuentame que tienes en mente y te respondo lo antes posible.
          </p>
          <button
            onClick={() => setShowBooking(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold rounded-full px-8 sm:px-10 h-14 sm:h-16 text-base sm:text-lg transition-all hover:-translate-y-1 active:scale-[0.98]"
            style={{
              background: theme.colors.primary,
              color: isLightColor(theme.colors.primary) ? "#000000" : "#ffffff",
              boxShadow: `0 20px 50px -15px ${theme.colors.primary}90`,
            }}
          >
            <Send className="w-5 h-5" />
            Enviar solicitud
          </button>
        </div>
      </section>

      {/* =====================================================================
          FOOTER
          ===================================================================== */}
      <footer
        className="py-10 sm:py-12 px-5 sm:px-6 text-center"
        style={{ borderTop: `1px solid ${subtleBorder}` }}
      >
        <a
          href="/"
          className="inline-block text-[10px] font-bold uppercase transition-opacity hover:opacity-100"
          style={{
            color: theme.colors.text,
            opacity: 0.4,
            letterSpacing: "0.3em",
          }}
        >
          Tarima · Powered by CyberPiezas
        </a>
      </footer>

      {/* =====================================================================
          LIGHTBOX
          ===================================================================== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxPhoto}
            alt=""
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* =====================================================================
          MODAL DE RESERVA (con tema)
          ===================================================================== */}
      {showBooking && (
        <BookingModal
          slug={slug}
          artistName={profile.artistName}
          theme={theme}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL DE RESERVA - tematizado
// ============================================================================

function BookingModal({
  slug,
  artistName,
  theme,
  onClose,
}: {
  slug: string;
  artistName: string;
  theme: TarimaTheme;
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

  const isLight = isLightColor(theme.colors.bg);
  const inputBg = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.06)";
  const inputBorder = isLight
    ? "rgba(0, 0, 0, 0.1)"
    : "rgba(255, 255, 255, 0.1)";

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
      toast.error("Nombre y telefono son obligatorios");
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

  const inputStyle = {
    background: inputBg,
    border: "1px solid " + inputBorder,
    color: theme.colors.text,
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div
          className="rounded-3xl max-w-md w-full p-10 text-center shadow-2xl"
          style={{
            background: theme.colors.bg,
            color: theme.colors.text,
            border: "1px solid " + inputBorder,
          }}
        >
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: "#22c55e" }}
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2
            className="text-3xl font-bold tracking-tight mb-3"
            style={{ color: theme.colors.text }}
          >
            ¡Solicitud enviada!
          </h2>
          <p style={{ color: theme.colors.text, opacity: 0.7 }} className="mb-8">
            {artistName} recibio tu mensaje y te respondera pronto al telefono
            que diste.
          </p>
          <button
            onClick={onClose}
            className="font-bold rounded-full h-12 px-8 w-full transition-all hover:-translate-y-0.5"
            style={{
              background: theme.colors.primary,
              color: isLightColor(theme.colors.primary) ? "#000000" : "#ffffff",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl sm:rounded-3xl max-w-lg w-full sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        style={{
          background: theme.colors.bg,
          color: theme.colors.text,
          border: "1px solid " + inputBorder,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between sticky top-0 rounded-t-3xl flex-shrink-0"
          style={{
            background: theme.colors.bg,
            borderBottom: "1px solid " + inputBorder,
          }}
        >
          <div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: theme.colors.text }}
            >
              Reservar a {artistName}
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: theme.colors.text, opacity: 0.55 }}
            >
              Cuentame de tu evento
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: inputBg, color: theme.colors.text }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
          <div>
            <p
              className="text-[10px] font-bold uppercase mb-2"
              style={{
                color: theme.colors.text,
                opacity: 0.5,
                letterSpacing: "0.2em",
              }}
            >
              Tu nombre *
            </p>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: Maria Gonzalez"
              className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p
                className="text-[10px] font-bold uppercase mb-2"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.2em",
                }}
              >
                Telefono *
              </p>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                style={inputStyle}
              />
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase mb-2"
                style={{
                  color: theme.colors.text,
                  opacity: 0.5,
                  letterSpacing: "0.2em",
                }}
              >
                Email (opcional)
              </p>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                style={inputStyle}
              />
            </div>
          </div>

          <div
            className="pt-5"
            style={{ borderTop: "1px solid " + inputBorder }}
          >
            <p
              className="text-[10px] font-bold uppercase mb-4"
              style={{
                color: theme.colors.text,
                opacity: 0.5,
                letterSpacing: "0.2em",
              }}
            >
              Sobre el evento
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p
                  className="text-xs mb-1.5"
                  style={{ color: theme.colors.text, opacity: 0.5 }}
                >
                  Tipo de evento
                </p>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                  style={inputStyle}
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key} style={{ background: theme.colors.bg, color: theme.colors.text }}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p
                  className="text-xs mb-1.5"
                  style={{ color: theme.colors.text, opacity: 0.5 }}
                >
                  Fecha aproximada
                </p>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-3">
              <p
                className="text-xs mb-1.5"
                style={{ color: theme.colors.text, opacity: 0.5 }}
              >
                Lugar del evento
              </p>
              <input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Ej: Salon Las Palmas, Cuernavaca"
                className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                style={inputStyle}
              />
            </div>

            <div className="mb-3">
              <p
                className="text-xs mb-1.5"
                style={{ color: theme.colors.text, opacity: 0.5 }}
              >
                Presupuesto aproximado (opcional)
              </p>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ej: 8000"
                className="w-full rounded-xl px-4 h-12 sm:h-11 focus:outline-none text-base"
                style={inputStyle}
              />
            </div>

            <div>
              <p
                className="text-xs mb-1.5"
                style={{ color: theme.colors.text, opacity: 0.5 }}
              >
                Detalles adicionales
              </p>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Cuentame mas sobre tu evento, horarios, numero de invitados, etc..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 sm:px-7 py-4 sm:py-5 sm:rounded-b-3xl flex-shrink-0"
          style={{
            background: theme.colors.bg,
            borderTop: "1px solid " + inputBorder,
          }}
        >
          <button
            onClick={handleSubmit}
            disabled={createBooking.isPending}
            className="w-full font-bold rounded-full h-13 sm:h-12 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: theme.colors.primary,
              color: isLightColor(theme.colors.primary) ? "#000000" : "#ffffff",
              boxShadow: `0 10px 30px -10px ${theme.colors.primary}80`,
            }}
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
          <p
            className="text-[10px] text-center mt-3"
            style={{ color: theme.colors.text, opacity: 0.4 }}
          >
            Al enviar aceptas compartir tus datos con el artista para responder
            tu solicitud.
          </p>
        </div>
      </div>
    </div>
  );
}
