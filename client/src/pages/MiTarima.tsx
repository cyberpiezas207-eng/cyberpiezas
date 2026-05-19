import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import CloudinaryUpload, { CloudinaryUploadDropzone } from "@/components/CloudinaryUpload";
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
} from "lucide-react";

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

  // ==========================================================================
  // GUARD DE ACCESO (Subscription Core V1)
  // Hooks de proteccion: van ARRIBA de los demas hooks (regla de React).
  // Los early returns que usan estos valores van DESPUES de TODOS los hooks.
  //
  // Nota: el nombre "navigateTo" en vez de "setLocation" es intencional para
  // evitar colision con un setLocation existente en otro componente helper
  // del mismo archivo.
  // ==========================================================================
  const [, navigateTo] = useLocation();
  const { data: access, isLoading: accessLoading } =
    trpc.pagos.subscriptions.hasAccess.useQuery({ posCode: "tarima" });

  const [activeTab, setActiveTab] = useState<"perfil" | "bookings" | "multimedia">("perfil");

  const profileQuery = trpc.tarima.profile.getMine.useQuery();
  const statsQuery = trpc.tarima.bookings.stats.useQuery();
  const bookingsQuery = trpc.tarima.bookings.listMine.useQuery({});

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  // ==========================================================================
  // EARLY RETURNS DEL GUARD DE ACCESO
  // Van aqui, despues de TODOS los hooks, antes del render principal.
  // ==========================================================================

  // Mientras carga el estado de acceso: loading amigable con tema tarima
  if (accessLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <div className="w-12 h-12 rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500 animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-medium">Verificando tu acceso...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Sin acceso activo: pantalla amigable con CTAs a planes
  if (access && !access.hasAccess) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header con gradiente fucsia/purple tipico de Tarima */}
            <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 px-8 pt-12 pb-14 text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-400/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="text-7xl mb-3">🎤</div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Mi Tarima</h1>
                <p className="text-fuchsia-100 text-sm font-medium">Plataforma para artistas</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Necesitas una suscripcion activa
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Para usar tu panel de artista necesitas estar suscrito a Tarima.
                  Tu perfil publico, tus bookings y tu galeria viven aqui.
                </p>
              </div>

              {/* Highlights del plan */}
              <div className="bg-fuchsia-50 border border-fuchsia-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-fuchsia-900">
                  <span className="text-base">✓</span>
                  <span>Perfil publico personalizado</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-fuchsia-900">
                  <span className="text-base">✓</span>
                  <span>Bookings y agenda de eventos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-fuchsia-900">
                  <span className="text-base">✓</span>
                  <span>Galeria multimedia y links</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-fuchsia-900">
                  <span className="text-base">✓</span>
                  <span>$150/mes o $1,500/ano</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => navigateTo("/pricing?posCode=tarima")}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-fuchsia-500/30 active:scale-[0.98] transition-all"
                >
                  Ver planes
                </button>
                <button
                  onClick={() => navigateTo("/sistemas")}
                  className="w-full h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
                >
                  Volver a mi panel
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Acceso confirmado: renderiza el panel del artista normal
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
        <h3 className="text-sm font-bold text-slate-900 mb-3">📸 Imágenes</h3>
        <div className="space-y-4">
          {/* FOTO DE PERFIL */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Foto de perfil
            </p>
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              {/* Preview */}
              {formData.profileImage ? (
                <img
                  src={formData.profileImage}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-fuchsia-200 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-3xl flex-shrink-0">
                  🎤
                </div>
              )}
              {/* Acciones */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-2">
                  Tu foto que verán los clientes. Cuadrada (1:1) se ve mejor.
                </p>
                <div className="flex flex-wrap gap-2">
                  <CloudinaryUpload
                    label={formData.profileImage ? "Cambiar foto" : "Subir foto"}
                    size="sm"
                    folder="tarima/perfil"
                    onUploaded={(url) => {
                      handleChange("profileImage", url);
                      toast.success("Foto cargada. Recuerda guardar cambios.");
                    }}
                  />
                  {formData.profileImage && (
                    <button
                      onClick={() => handleChange("profileImage", "")}
                      className="h-9 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-full"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOTO DE PORTADA */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Foto de portada
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              {/* Preview */}
              {formData.coverImage ? (
                <div className="relative h-32 w-full">
                  <img
                    src={formData.coverImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-br from-fuchsia-200 via-purple-200 to-indigo-200 flex items-center justify-center">
                  <p className="text-slate-500 text-sm font-medium">Sin portada</p>
                </div>
              )}
              {/* Acciones */}
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-2">
                  La imagen grande detrás de tu nombre. Horizontal (16:9) se ve mejor.
                </p>
                <div className="flex flex-wrap gap-2">
                  <CloudinaryUpload
                    label={formData.coverImage ? "Cambiar portada" : "Subir portada"}
                    size="sm"
                    folder="tarima/cover"
                    onUploaded={(url) => {
                      handleChange("coverImage", url);
                      toast.success("Portada cargada. Recuerda guardar cambios.");
                    }}
                  />
                  {formData.coverImage && (
                    <button
                      onClick={() => handleChange("coverImage", "")}
                      className="h-9 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-full"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic">
            💡 Las fotos se suben directamente desde tu celular o computadora. Acepta JPG, PNG, WebP hasta 10MB.
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

  // Para fotos: usamos createMedia directo desde el upload
  const createMedia = trpc.tarima.media.create.useMutation({
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
      helpUrl: "",
      placeholder: "",
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
        {/* Para videos/musica, mantener el boton +Agregar (URLs).
            Para fotos, no es necesario - el dropzone arriba se encarga. */}
        {type !== "photo" && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full h-9 px-4 text-xs font-bold"
          >
            {showAddForm ? "Cancelar" : "+ Agregar"}
          </Button>
        )}
      </div>

      {/* PARA FOTOS: Dropzone GRANDE con upload directo */}
      {type === "photo" && (
        <div className="mb-4">
          <CloudinaryUploadDropzone
            multiple
            folder="tarima/galeria"
            onUploaded={(url) => {
              createMedia.mutate({ type: "photo", url });
            }}
          />
          <p className="text-xs text-slate-500 mt-2 italic">
            💡 Sube hasta 10MB por foto. Acepta JPG, PNG, WebP.
          </p>
        </div>
      )}

      {/* PARA VIDEOS Y MUSICA: Formulario manual de URL */}
      {showAddForm && type !== "photo" && (
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
      {items.length === 0 && type !== "photo" && !showAddForm && (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-2">
            {type === "video" ? "🎬" : "🎵"}
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
