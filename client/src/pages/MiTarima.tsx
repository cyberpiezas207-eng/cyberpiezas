import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Music,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Save,
  Globe,
  Lock,
  Sparkles,
  PartyPopper,
  X,
  Check,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Send,
  Loader2,
  Palette,
} from "lucide-react";
import {
  ALL_THEMES,
  TARIMA_THEMES,
  getTheme,
  type TarimaThemeId,
  type TarimaTheme,
} from "@/lib/tarimaThemes";

const GENRE_OPTIONS = [
  { value: "banda", label: "🎺 Banda" },
  { value: "mariachi", label: "🎻 Mariachi" },
  { value: "norteno", label: "🪗 Norteño" },
  { value: "cumbia", label: "🪘 Cumbia" },
  { value: "rock", label: "🎸 Rock" },
  { value: "pop", label: "🎤 Pop" },
  { value: "regional", label: "🎼 Regional Mexicano" },
  { value: "electronica", label: "🎧 Electrónica" },
  { value: "jazz", label: "🎷 Jazz" },
  { value: "clasica", label: "🎹 Clásica" },
  { value: "tropical", label: "🥁 Tropical" },
  { value: "reggaeton", label: "🔊 Reggaeton" },
  { value: "otro", label: "🎵 Otro" },
];

const EVENT_LABELS: Record<string, string> = {
  boda: "Boda",
  "15anos": "XV años",
  cumpleanos: "Cumpleaños",
  evento_corporativo: "Evento corporativo",
  fiesta_privada: "Fiesta privada",
  festival: "Festival",
  bautizo: "Bautizo",
  otro: "Otro",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Completado",
};

export default function MiTarima() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"perfil" | "bookings" | "multimedia" | "diseno">("perfil");

  const profileQuery = trpc.tarima.profile.getMine.useQuery();
  const statsQuery = trpc.tarima.bookings.stats.useQuery();
  const bookingsQuery = trpc.tarima.bookings.listMine.useQuery({});

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero */}
        <section className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-100 mb-1">
                🎤 Mi Tarima
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                {profile?.artistName ?? "Bienvenido"}
              </h1>
              <p className="text-fuchsia-100 mt-1">
                Tu perfil público para clientes y eventos.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <Eye className="w-4 h-4 mb-1 text-fuchsia-100" />
                <p className="text-2xl font-bold tracking-tight">{stats?.viewCount ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-100">Vistas</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <Clock className="w-4 h-4 mb-1 text-amber-200" />
                <p className="text-2xl font-bold tracking-tight">{stats?.pending ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-100">Pendientes</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <CheckCircle2 className="w-4 h-4 mb-1 text-emerald-200" />
                <p className="text-2xl font-bold tracking-tight">{stats?.confirmed ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-100">Confirmados</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <Calendar className="w-4 h-4 mb-1 text-cyan-200" />
                <p className="text-2xl font-bold tracking-tight">{stats?.totalBookings ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-100">Total</p>
              </div>
            </div>
          </div>
        </section>

        {/* Si NO hay perfil → onboarding */}
        {!profile && !profileQuery.isLoading && <CreateProfileCard onCreated={() => {
          utils.tarima.profile.getMine.invalidate();
          utils.tarima.bookings.stats.invalidate();
        }} />}

        {/* Si HAY perfil → URL pública + toggle publicar + tabs */}
        {profile && (
          <>
            <PublicLinkCard profile={profile} onToggleChange={() => {
              utils.tarima.profile.getMine.invalidate();
            }} />

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("perfil")}
                  className={
                    "flex-1 py-4 px-6 text-sm font-bold transition-colors " +
                    (activeTab === "perfil"
                      ? "border-b-2 border-fuchsia-500 text-fuchsia-600"
                      : "text-slate-500 hover:text-slate-900")
                  }
                >
                  ⚙️ Mi perfil
                </button>
                <button
                  onClick={() => setActiveTab("multimedia")}
                  className={
                    "flex-1 py-4 px-6 text-sm font-bold transition-colors " +
                    (activeTab === "multimedia"
                      ? "border-b-2 border-fuchsia-500 text-fuchsia-600"
                      : "text-slate-500 hover:text-slate-900")
                  }
                >
                  📸 Multimedia
                </button>
                <button
                  onClick={() => setActiveTab("diseno")}
                  className={
                    "flex-1 py-4 px-6 text-sm font-bold transition-colors " +
                    (activeTab === "diseno"
                      ? "border-b-2 border-fuchsia-500 text-fuchsia-600"
                      : "text-slate-500 hover:text-slate-900")
                  }
                >
                  🎨 Diseño
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={
                    "flex-1 py-4 px-6 text-sm font-bold transition-colors " +
                    (activeTab === "bookings"
                      ? "border-b-2 border-fuchsia-500 text-fuchsia-600"
                      : "text-slate-500 hover:text-slate-900")
                  }
                >
                  📅 Solicitudes
                  {stats && stats.pending > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {stats.pending}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-6">
                {activeTab === "perfil" && (
                  <EditProfileForm profile={profile} onSaved={() => {
                    utils.tarima.profile.getMine.invalidate();
                  }} />
                )}
                {activeTab === "multimedia" && (
                  <MultimediaTab />
                )}
                {activeTab === "diseno" && (
                  <DesignTab profile={profile} onSaved={() => {
                    utils.tarima.profile.getMine.invalidate();
                  }} />
                )}
                {activeTab === "bookings" && (
                  <BookingsList
                    bookings={bookingsQuery.data ?? []}
                    onUpdated={() => {
                      utils.tarima.bookings.listMine.invalidate();
                      utils.tarima.bookings.stats.invalidate();
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// Crear perfil (primera vez)
// ============================================================================

function CreateProfileCard({ onCreated }: { onCreated: () => void }) {
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("otro");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");

  const createProfile = trpc.tarima.profile.create.useMutation({
    onSuccess: () => {
      toast.success("¡Perfil creado! Ahora completa tus datos.");
      onCreated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!artistName) {
      toast.error("Necesitas un nombre artístico");
      return;
    }
    createProfile.mutate({
      artistName,
      genre: genre as any,
      location: location || undefined,
      whatsapp: whatsapp || undefined,
      bio: bio || undefined,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-fuchsia-500 to-purple-600 px-8 py-6 text-white">
        <Sparkles className="w-8 h-8 mb-2" />
        <h2 className="text-2xl font-bold tracking-tight">¡Crea tu Tarima!</h2>
        <p className="text-fuchsia-100 mt-1">
          Tu página pública para que tus clientes te encuentren y te contraten.
        </p>
      </div>
      <div className="p-8 space-y-4 max-w-2xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Tu nombre artístico *
          </p>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Ej: Los Norteños del Valle"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            Este nombre aparecerá en tu URL: cyberpiezas.com/tarima/los-norte...
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tu género
            </p>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tu ciudad
            </p>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Cuernavaca, Morelos"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            WhatsApp (con código de país)
          </p>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Ej: +52 777 123 4567"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Breve descripción
          </p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Cuéntale a tus clientes quién eres, qué tocas, cuál es tu propuesta..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-fuchsia-400 focus:outline-none resize-none"
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={createProfile.isPending}
          className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold rounded-full h-12 shadow-lg shadow-fuchsia-500/30"
        >
          {createProfile.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
          ) : (
            <><PartyPopper className="w-4 h-4 mr-2" /> Crear mi Tarima</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Link público + toggle
// ============================================================================

function PublicLinkCard({ profile, onToggleChange }: { profile: any; onToggleChange: () => void }) {
  const publicUrl = window.location.origin + "/tarima/" + profile.slug;

  const togglePublish = trpc.tarima.profile.setPublished.useMutation({
    onSuccess: (data) => {
      toast.success(data.isPublished ? "¡Perfil publicado!" : "Perfil oculto");
      onToggleChange();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado al portapapeles");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Tu URL pública
          </p>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <code className="text-sm text-slate-700 truncate flex-1">{publicUrl}</code>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
              title="Copiar"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
              title="Abrir"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {profile.isPublished ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">PUBLICADO</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-full">
              <Lock className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">OCULTO</span>
            </div>
          )}
          <Button
            onClick={() => togglePublish.mutate({ isPublished: !profile.isPublished })}
            disabled={togglePublish.isPending}
            className={
              profile.isPublished
                ? "bg-slate-900 hover:bg-slate-800 text-white rounded-full h-9 px-4 text-xs font-bold"
                : "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-9 px-4 text-xs font-bold"
            }
          >
            {profile.isPublished ? "Ocultar" : "Publicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Editar perfil
// ============================================================================

function EditProfileForm({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    artistName: profile.artistName ?? "",
    bio: profile.bio ?? "",
    genre: profile.genre ?? "otro",
    location: profile.location ?? "",
    whatsapp: profile.whatsapp ?? "",
    contactEmail: profile.contactEmail ?? "",
    profileImage: profile.profileImage ?? "",
    coverImage: profile.coverImage ?? "",
    spotifyUrl: profile.spotifyUrl ?? "",
    youtubeUrl: profile.youtubeUrl ?? "",
    youtubeFeaturedVideo: profile.youtubeFeaturedVideo ?? "",
    instagramUrl: profile.instagramUrl ?? "",
    facebookUrl: profile.facebookUrl ?? "",
    tiktokUrl: profile.tiktokUrl ?? "",
    minBudget: profile.minBudget ?? "",
    serviceArea: profile.serviceArea ?? "",
    yearsActive: profile.yearsActive ?? 0,
  });

  const updateProfile = trpc.tarima.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    updateProfile.mutate({
      ...formData,
      yearsActive: Number(formData.yearsActive) || undefined,
      minBudget: formData.minBudget ? String(formData.minBudget) : undefined,
      genre: formData.genre as any,
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Datos básicos */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Music className="w-4 h-4 text-fuchsia-500" />
          Datos básicos
        </h3>
        <div className="space-y-3">
          <Field label="Nombre artístico">
            <input
              value={formData.artistName}
              onChange={(e) => handleChange("artistName", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Género">
              <select
                value={formData.genre}
                onChange={(e) => handleChange("genre", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Años activos">
              <input
                type="number"
                value={formData.yearsActive}
                onChange={(e) => handleChange("yearsActive", parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Ciudad">
            <input
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Ej: Cuernavaca, Morelos"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="Bio">
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              rows={4}
              placeholder="Cuéntale a tus clientes quién eres..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-fuchsia-400 focus:outline-none resize-none"
            />
          </Field>
        </div>
      </section>

      {/* Imágenes */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3">📸 Imágenes (URL)</h3>
        <div className="space-y-3">
          <Field label="Foto de perfil (URL)">
            <input
              value={formData.profileImage}
              onChange={(e) => handleChange("profileImage", e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="Foto de portada (URL)">
            <input
              value={formData.coverImage}
              onChange={(e) => handleChange("coverImage", e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <p className="text-xs text-slate-500">
            💡 Tip: Sube tus fotos a Imgur o tu Google Drive y pega el link directo. Próximamente: upload integrado.
          </p>
        </div>
      </section>

      {/* Contacto */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3">📞 Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="WhatsApp">
            <input
              value={formData.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="+52 777..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="Email de contacto">
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
        </div>
      </section>

      {/* Redes */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3">🔗 Redes sociales y música</h3>
        <div className="space-y-3">
          <Field label="Spotify (URL del artista o playlist)">
            <input
              value={formData.spotifyUrl}
              onChange={(e) => handleChange("spotifyUrl", e.target.value)}
              placeholder="https://open.spotify.com/artist/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="YouTube (canal)">
            <input
              value={formData.youtubeUrl}
              onChange={(e) => handleChange("youtubeUrl", e.target.value)}
              placeholder="https://youtube.com/@..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="Video destacado de YouTube (URL del video)">
            <input
              value={formData.youtubeFeaturedVideo}
              onChange={(e) => handleChange("youtubeFeaturedVideo", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Instagram">
              <input
                value={formData.instagramUrl}
                onChange={(e) => handleChange("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
              />
            </Field>
            <Field label="Facebook">
              <input
                value={formData.facebookUrl}
                onChange={(e) => handleChange("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
              />
            </Field>
            <Field label="TikTok">
              <input
                value={formData.tiktokUrl}
                onChange={(e) => handleChange("tiktokUrl", e.target.value)}
                placeholder="https://tiktok.com/@..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Contratación */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3">💰 Contratación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Presupuesto mínimo ($)">
            <input
              type="number"
              value={formData.minBudget}
              onChange={(e) => handleChange("minBudget", e.target.value)}
              placeholder="Ej: 5000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
          <Field label="Zona de cobertura">
            <input
              value={formData.serviceArea}
              onChange={(e) => handleChange("serviceArea", e.target.value)}
              placeholder="Ej: Morelos y CDMX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none"
            />
          </Field>
        </div>
      </section>

      {/* Guardar */}
      <Button
        onClick={handleSubmit}
        disabled={updateProfile.isPending}
        className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold rounded-full h-12 px-8 shadow-lg shadow-fuchsia-500/30"
      >
        {updateProfile.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> Guardar cambios</>
        )}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// ============================================================================
// Lista de bookings
// ============================================================================

function BookingsList({ bookings, onUpdated }: { bookings: any[]; onUpdated: () => void }) {
  const updateStatus = trpc.tarima.bookings.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Actualizado");
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-3">📭</div>
        <h3 className="text-lg font-bold text-slate-900">Aún no tienes solicitudes</h3>
        <p className="text-slate-500 mt-1">
          Comparte tu URL pública para empezar a recibir bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900">{b.customerName}</h4>
                <span className={"px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border " + STATUS_COLORS[b.status]}>
                  {STATUS_LABELS[b.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {EVENT_LABELS[b.eventType] || "Otro"} ·{" "}
                {new Date(b.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "numeric" })}
              </p>
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}
                  disabled={updateStatus.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-8 px-3 text-xs font-bold"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aceptar
                </Button>
                <Button
                  onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}
                  disabled={updateStatus.isPending}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-full h-8 px-3 text-xs font-bold"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Rechazar
                </Button>
              </div>
            )}
            {b.status === "confirmed" && (
              <Button
                onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}
                disabled={updateStatus.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-8 px-3 text-xs font-bold"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar completado
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={"tel:" + b.customerPhone} className="hover:text-fuchsia-600">{b.customerPhone}</a>
            </div>
            {b.customerEmail && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={"mailto:" + b.customerEmail} className="hover:text-fuchsia-600 truncate">{b.customerEmail}</a>
              </div>
            )}
            {b.eventLocation && (
              <div className="flex items-center gap-2 text-slate-700 sm:col-span-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{b.eventLocation}</span>
              </div>
            )}
            {b.eventDate && (
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{new Date(b.eventDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {b.budget && (
              <div className="text-slate-700">
                💰 <span className="font-bold">${parseFloat(b.budget).toLocaleString("es-MX")}</span>
              </div>
            )}
          </div>
          {b.eventDescription && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mensaje del cliente</p>
              <p className="text-sm text-slate-700 italic">"{b.eventDescription}"</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Tab MULTIMEDIA - Fotos, Videos y Musica
// ============================================================================

function MultimediaTab() {
  const [subTab, setSubTab] = useState<"photo" | "video" | "music">("photo");

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setSubTab("photo")}
          className={
            "px-4 py-2 text-sm font-bold rounded-t-lg transition-colors " +
            (subTab === "photo"
              ? "bg-fuchsia-50 text-fuchsia-600 border-b-2 border-fuchsia-500"
              : "text-slate-500 hover:text-slate-900")
          }
        >
          📸 Fotos
        </button>
        <button
          onClick={() => setSubTab("video")}
          className={
            "px-4 py-2 text-sm font-bold rounded-t-lg transition-colors " +
            (subTab === "video"
              ? "bg-fuchsia-50 text-fuchsia-600 border-b-2 border-fuchsia-500"
              : "text-slate-500 hover:text-slate-900")
          }
        >
          🎬 Videos
        </button>
        <button
          onClick={() => setSubTab("music")}
          className={
            "px-4 py-2 text-sm font-bold rounded-t-lg transition-colors " +
            (subTab === "music"
              ? "bg-fuchsia-50 text-fuchsia-600 border-b-2 border-fuchsia-500"
              : "text-slate-500 hover:text-slate-900")
          }
        >
          🎵 Música
        </button>
      </div>

      <MediaSection type={subTab} />
    </div>
  );
}

function MediaSection({ type }: { type: "photo" | "video" | "music" }) {
  const utils = trpc.useUtils();
  const [showAddForm, setShowAddForm] = useState(false);

  const mediaQuery = trpc.tarima.media.listMine.useQuery({ type });

  const deleteMedia = trpc.tarima.media.delete.useMutation({
    onSuccess: () => {
      toast.success("Eliminado");
      utils.tarima.media.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMedia = trpc.tarima.media.reorder.useMutation({
    onSuccess: () => {
      utils.tarima.media.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = mediaQuery.data ?? [];

  const typeLabels: Record<string, { singular: string; plural: string; helpUrl: string; placeholder: string }> = {
    photo: {
      singular: "foto",
      plural: "Fotos",
      helpUrl: "https://imgur.com",
      placeholder: "https://i.imgur.com/abc123.jpg",
    },
    video: {
      singular: "video",
      plural: "Videos de YouTube",
      helpUrl: "https://youtube.com",
      placeholder: "https://youtube.com/watch?v=...",
    },
    music: {
      singular: "track",
      plural: "Música de Spotify",
      helpUrl: "https://spotify.com",
      placeholder: "https://open.spotify.com/track/...",
    },
  };

  const config = typeLabels[type];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{config.plural}</h3>
          <p className="text-xs text-slate-500">
            {items.length === 0
              ? "Aún no has agregado " + config.plural.toLowerCase()
              : items.length + " " + (items.length === 1 ? config.singular : config.plural.toLowerCase())}
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-9 px-4 text-xs font-bold"
        >
          {showAddForm ? "Cancelar" : "+ Agregar"}
        </Button>
      </div>

      {/* Formulario de agregar */}
      {showAddForm && (
        <AddMediaForm
          type={type}
          placeholder={config.placeholder}
          helpUrl={config.helpUrl}
          onAdded={() => {
            setShowAddForm(false);
            utils.tarima.media.listMine.invalidate();
          }}
        />
      )}

      {/* Lista de items */}
      {items.length === 0 && !showAddForm && (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-2">
            {type === "photo" ? "📸" : type === "video" ? "🎬" : "🎵"}
          </div>
          <p className="text-sm text-slate-600 mb-3">
            No tienes {config.plural.toLowerCase()} todavía.
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-9 px-5 text-xs font-bold"
          >
            Agregar mi primera {config.singular}
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2 mt-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3"
            >
              {/* Preview */}
              {type === "photo" ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                  <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 text-2xl">
                  {type === "video" ? "🎬" : "🎵"}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {item.title || "(Sin título)"}
                </p>
                <p className="text-xs text-slate-500 truncate">{item.url}</p>
              </div>

              {/* Reorder + Delete */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reorderMedia.mutate({ id: item.id, direction: "up" })}
                  disabled={idx === 0 || reorderMedia.isPending}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-xs disabled:opacity-30"
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => reorderMedia.mutate({ id: item.id, direction: "down" })}
                  disabled={idx === items.length - 1 || reorderMedia.isPending}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-xs disabled:opacity-30"
                  title="Bajar"
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este item?")) {
                      deleteMedia.mutate({ id: item.id });
                    }
                  }}
                  disabled={deleteMedia.isPending}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 ml-1"
                  title="Eliminar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMediaForm({
  type,
  placeholder,
  helpUrl,
  onAdded,
}: {
  type: "photo" | "video" | "music";
  placeholder: string;
  helpUrl: string;
  onAdded: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const createMedia = trpc.tarima.media.create.useMutation({
    onSuccess: () => {
      toast.success("Agregado");
      setUrl("");
      setTitle("");
      onAdded();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!url) {
      toast.error("Falta la URL");
      return;
    }
    createMedia.mutate({
      type,
      url,
      title: title || undefined,
    });
  };

  const tips: Record<string, string> = {
    photo: "💡 Sube tu foto a Imgur (gratis, sin cuenta) y pega el link de la imagen.",
    video: "💡 Pega el link del video de YouTube. Funciona con cualquier URL (watch?v= o youtu.be).",
    music: "💡 En Spotify: comparte canción → Copy link. Funciona con tracks, álbumes o playlists.",
  };

  return (
    <div className="bg-fuchsia-50 border-2 border-fuchsia-200 rounded-2xl p-4 mb-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            URL *
          </p>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none text-sm"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Título (opcional)
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Tocada en el palenque 2024"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 h-11 focus:border-fuchsia-400 focus:outline-none text-sm"
          />
        </div>
        <p className="text-xs text-slate-600 italic">{tips[type]}</p>
        <Button
          onClick={handleAdd}
          disabled={createMedia.isPending}
          className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-10 font-bold"
        >
          {createMedia.isPending ? "Agregando..." : "Agregar"}
        </Button>
      </div>
    </div>
  );
}


// ============================================================================
// Tab DISEÑO - Selector de tema visual + colores personalizados
// ============================================================================

function DesignTab({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  // Tema actual (si themeId no es valido, fallback a classic)
  const initialThemeId: TarimaThemeId =
    profile.themeId && profile.themeId in TARIMA_THEMES
      ? (profile.themeId as TarimaThemeId)
      : "classic";

  const [selectedThemeId, setSelectedThemeId] = useState<TarimaThemeId>(initialThemeId);
  const [customColors, setCustomColors] = useState<Record<string, string>>(
    (profile.customColors as any) ?? {},
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Si cambia el profile (otra carga), re-sync
  useEffect(() => {
    setSelectedThemeId(initialThemeId);
    setCustomColors((profile.customColors as any) ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const baseTheme = TARIMA_THEMES[selectedThemeId];
  const previewTheme = getTheme(selectedThemeId, customColors as any);
  const hasCustomColors = Object.keys(customColors).length > 0;

  const updateTheme = trpc.tarima.profile.updateTheme.useMutation({
    onSuccess: () => {
      toast.success("Tema guardado");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateTheme.mutate({
      themeId: selectedThemeId,
      customColors:
        Object.keys(customColors).length > 0 ? (customColors as any) : null,
    });
  };

  const handleReset = () => {
    setCustomColors({});
    toast.success("Colores restablecidos al template");
  };

  const updateColor = (key: string, value: string) => {
    setCustomColors({ ...customColors, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Palette className="w-5 h-5 text-fuchsia-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Personaliza el diseño de tu página
            </h3>
            <p className="text-xs text-slate-600">
              Elige un template prediseñado y opcionalmente ajusta los colores
              al estilo de tu marca. Los cambios se aplican a tu página pública
              cuando guardas.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Vista previa en vivo
        </p>
        <PreviewMini theme={previewTheme} artistName={profile.artistName} />
      </div>

      {/* Grid de templates */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Templates ({ALL_THEMES.length})
          </p>
          <p className="text-xs text-slate-400">Click para seleccionar</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_THEMES.map((theme) => (
            <TemplateCard
              key={theme.id}
              theme={theme}
              isSelected={theme.id === selectedThemeId}
              onSelect={() => setSelectedThemeId(theme.id)}
            />
          ))}
        </div>
      </div>

      {/* Personalizar colores (plegable) */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-bold text-fuchsia-600 hover:text-fuchsia-700 flex items-center gap-2"
        >
          <span>{showAdvanced ? "▼" : "▶"}</span>
          Personalizar colores
          {hasCustomColors && (
            <span className="text-[10px] bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Personalizado
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <p className="text-xs text-slate-600">
              Sobrescribe colores especificos del template. Lo que no toques
              mantiene el valor original del template seleccionado.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <ColorInput
                label="Primario"
                value={customColors.primary || baseTheme.colors.primary}
                onChange={(v) => updateColor("primary", v)}
              />
              <ColorInput
                label="Secundario"
                value={customColors.secondary || baseTheme.colors.secondary}
                onChange={(v) => updateColor("secondary", v)}
              />
              <ColorInput
                label="Fondo"
                value={customColors.bg || baseTheme.colors.bg}
                onChange={(v) => updateColor("bg", v)}
              />
              <ColorInput
                label="Texto"
                value={customColors.text || baseTheme.colors.text}
                onChange={(v) => updateColor("text", v)}
              />
              <ColorInput
                label="Accent"
                value={customColors.accent || baseTheme.colors.accent}
                onChange={(v) => updateColor("accent", v)}
              />
            </div>
            {hasCustomColors && (
              <button
                onClick={handleReset}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
              >
                <span>↺</span>
                Restablecer al template original
              </button>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={updateTheme.isPending}
          className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold rounded-full h-12 px-8 shadow-lg shadow-fuchsia-500/30"
        >
          {updateTheme.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar tema
            </>
          )}
        </Button>
        {profile.isPublished && (
          <a
            href={"/tarima/" + profile.slug}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-full h-12 px-6 text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver mi pagina
          </a>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: TarimaTheme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={
        "relative group text-left rounded-2xl overflow-hidden transition-all border-2 " +
        (isSelected
          ? "border-fuchsia-500 shadow-lg shadow-fuchsia-500/20 scale-[1.02]"
          : "border-slate-200 hover:border-slate-300 hover:scale-[1.01]")
      }
    >
      {/* Preview visual */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={{
          background: theme.bgGradient || theme.colors.bg,
          color: theme.colors.text,
          fontFamily: theme.fontFamily,
        }}
      >
        <p className="text-3xl font-bold tracking-tighter">Aa</p>
        {/* Color swatches */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/30"
            style={{ background: theme.colors.primary }}
          />
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/30"
            style={{ background: theme.colors.secondary }}
          />
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/30"
            style={{ background: theme.colors.accent }}
          />
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-lg">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-white p-3">
        <p className="text-sm font-bold text-slate-900 mb-0.5">{theme.name}</p>
        <p className="text-[10px] text-slate-500 line-clamp-1">
          {theme.vibe} · {theme.target}
        </p>
      </div>
    </button>
  );
}

function PreviewMini({
  theme,
  artistName,
}: {
  theme: TarimaTheme;
  artistName: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
      style={{
        background: theme.bgGradient || theme.colors.bg,
        color: theme.colors.text,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="px-6 py-10 sm:py-14 text-center">
        <div
          className="w-20 h-20 mx-auto rounded-full mb-5 flex items-center justify-center text-3xl shadow-xl"
          style={{
            background: theme.colors.primary,
            color: isLightColor(theme.colors.primary) ? "#000000" : "#ffffff",
          }}
        >
          🎵
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter mb-3">
          {artistName || "Tu nombre artistico"}
        </h2>
        <p
          className="text-[10px] font-bold uppercase mb-7"
          style={{ opacity: 0.55, letterSpacing: "0.25em" }}
        >
          {theme.vibe} · {theme.target}
        </p>
        <div
          className="inline-block font-bold rounded-full px-6 py-2.5 text-xs pointer-events-none"
          style={{
            background: theme.colors.primary,
            color: isLightColor(theme.colors.primary) ? "#000000" : "#ffffff",
          }}
        >
          Reservar para mi evento
        </div>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        {label}
      </p>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl cursor-pointer border border-slate-200"
      />
      <p className="text-[10px] text-slate-500 mt-1 font-mono">{value}</p>
    </div>
  );
}

// Helper: detectar si un hex es claro (para decidir text-color)
function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const h =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(1);
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
