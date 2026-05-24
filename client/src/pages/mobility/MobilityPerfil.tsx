import { useLocation, useRoute } from "wouter";
import { useAuth } from "../../_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Heart,
  Loader2,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";

/**
 * ============================================================================
 * MOBILITY PERFIL — perfil público de un usuario
 * ============================================================================
 *
 * Muestra:
 *   - Nombre + ciudad + bio
 *   - Badge "Identidad verificada" si aplica
 *   - Reseñas cualitativas (sin números, sin estrellas)
 *
 * No muestra:
 *   - Teléfono (privado, solo se entrega post-aprobación)
 *   - Email
 *   - INE ni selfies
 *
 * Ruta: /mobility/perfil/:userId
 * ============================================================================
 */

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

export default function MobilityPerfil() {
  const [, params] = useRoute("/mobility/perfil/:userId");
  const [, setLocation] = useLocation();
  const { user } = useAuth() as any;

  const userId = params?.userId ? parseInt(params.userId) : null;

  const profileQuery = trpc.mobility.profile.getPublic.useQuery(
    { userId: userId ?? 0 },
    { enabled: !!userId },
  );

  const reviewsQuery = trpc.mobility.reviews.listForUser.useQuery(
    { userId: userId ?? 0, limit: 50 },
    { enabled: !!userId },
  );

  if (!userId) {
    return <ErrorScreen message="Perfil inválido." />;
  }

  if (profileQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!profileQuery.data) {
    return <ErrorScreen message="Este perfil no existe o fue eliminado." />;
  }

  const profile = profileQuery.data;
  const reviews = reviewsQuery.data ?? [];
  const isVerified = profile.role === "driver_verified" || profile.role === "both";
  const isOwnProfile = user?.id === profile.userId;

  // Cuánto tiempo lleva en Mobility
  const memberSince = new Date(profile.createdAt);
  const memberSinceStr = memberSince.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {/* PERFIL CARD */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 mb-6 relative overflow-hidden">
          <div className={"absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 bg-gradient-to-br " + MOBILITY_ACCENT} />

          <div className="relative">
            <div className="flex items-start gap-5 mb-5 flex-wrap">
              <div className={"w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW}>
                <span className="text-3xl font-bold text-white">
                  {profile.displayName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    {profile.displayName}
                  </h1>
                  {isOwnProfile && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/15 border border-blue-500/30 rounded-full px-2 py-0.5">
                      Tú
                    </span>
                  )}
                </div>

                {profile.baseCity && (
                  <p className="text-sm text-slate-400 flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.baseCity}
                  </p>
                )}

                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  En Mobility desde {memberSinceStr}
                </p>
              </div>

              {isVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Identidad verificada
                  </span>
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>
            )}

            {!profile.isActive && (
              <div className="mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  Esta cuenta está inactiva temporalmente.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RESEÑAS */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" />
            Lo que dicen de {profile.displayName}
          </h2>

          {reviewsQuery.isLoading ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
              <User className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-base font-bold text-white mb-2">Aún no hay reseñas</p>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                {isOwnProfile
                  ? "Cuando completes viajes con otras personas, sus reseñas aparecerán aquí."
                  : profile.displayName + " apenas empieza en Mobility. Cuando complete viajes con otras personas, las reseñas aparecerán aquí."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r: any) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </div>

        {/* Mensaje cultural al final */}
        <div className="text-center pt-6 border-t border-white/10">
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            En Mobility no hay estrellas ni puntajes. La confianza se construye con
            palabras concretas de personas reales que ya hicieron viajes juntas.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REVIEW CARD
// =============================================================================

function ReviewCard({ review }: { review: any }) {
  const authorQuery = trpc.mobility.profile.getPublic.useQuery({ userId: review.authorId });

  const createdDate = new Date(review.createdAt);
  const dateStr = createdDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const directionLabel =
    review.direction === "passenger_to_driver"
      ? "como conductor"
      : "como pasajero";

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={"w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br " + MOBILITY_ACCENT}>
          <span className="text-xs font-bold text-white">
            {authorQuery.data?.displayName?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {authorQuery.data?.displayName ?? "..."}
          </p>
          <p className="text-xs text-slate-400">{dateStr} · {directionLabel}</p>
        </div>
      </div>

      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {review.content}
      </p>
    </div>
  );
}

// =============================================================================
// LOADING / ERROR
// =============================================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <p className="text-sm text-slate-300 mb-5">{message}</p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full text-sm font-semibold transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
