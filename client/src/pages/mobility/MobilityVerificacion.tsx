import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Camera,
  CreditCard,
  Lock,
  Info,
} from "lucide-react";

/**
 * ============================================================================
 * MOBILITY VERIFICACION — flujo de subir INE + selfie sosteniéndola
 * ============================================================================
 *
 * Estados visuales:
 *   1. NUEVA (sin verificación previa o rechazada anterior) → formulario
 *   2. PENDING → banner "En revisión", deshabilita reintentar
 *   3. REJECTED → mensaje con motivo + botón para reintentar
 *   4. APPROVED → mensaje de bienvenida como conductor + CTA a /mobility
 *
 * El cliente:
 *   - Acepta JPG/PNG/HEIC desde el celular
 *   - Comprime a JPEG ≤1600px de lado mayor para evitar archivos enormes
 *   - Convierte a base64 dataURL
 *   - Envía ambas imágenes en un solo mutation atómico
 * ============================================================================
 */

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function MobilityVerificacion() {
  const [, setLocation] = useLocation();
  const verificationQuery = trpc.mobility.verification.getMine.useQuery();
  const profileQuery = trpc.mobility.profile.getMine.useQuery();

  // Si no tiene perfil, redirigir
  if (profileQuery.isSuccess && !profileQuery.data) {
    setLocation("/mobility");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Back link */}
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Mobility
        </button>

        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Verificación de identidad
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.05] mb-3">
            Verifica que eres tú,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
              no alguien usando tu nombre.
            </span>
          </h1>
          <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl">
            Para ofrecer viajes como conductor necesitamos saber que las personas
            que se suben a tu coche pueden confiar en ti. Esta verificación la
            revisa una persona del equipo, no un algoritmo.
          </p>
        </header>

        {/* Contenido según estado */}
        {verificationQuery.isLoading ? (
          <LoadingCard />
        ) : verificationQuery.data?.status === "pending" ? (
          <PendingCard submittedAt={verificationQuery.data.submittedAt} />
        ) : verificationQuery.data?.status === "approved" ? (
          <ApprovedCard onContinue={() => setLocation("/mobility")} />
        ) : verificationQuery.data?.status === "rejected" ? (
          <RejectedCard
            reason={verificationQuery.data.rejectionReason}
            onRetry={() => verificationQuery.refetch()}
          />
        ) : (
          <NewSubmission onSuccess={() => verificationQuery.refetch()} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// LOADING
// =============================================================================

function LoadingCard() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
      <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-3" />
      <p className="text-sm text-slate-400">Cargando estado de verificación...</p>
    </div>
  );
}

// =============================================================================
// PENDING (verificación en revisión)
// =============================================================================

function PendingCard({ submittedAt }: { submittedAt: Date | string | null }) {
  const date = submittedAt ? new Date(submittedAt) : null;
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-amber-500/20 rounded-3xl p-7">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Tu verificación está en revisión
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Una persona del equipo está revisando tu INE y selfie. Suele tomar
            entre algunas horas y un día. Te avisaremos por notificación cuando
            haya resultado.
          </p>
        </div>
      </div>

      {date && (
        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-xs text-slate-500">
            Enviado el{" "}
            <span className="text-slate-300">
              {date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              {" · "}
              {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-white/10">
        <p className="text-xs text-slate-500 leading-relaxed">
          Mientras tanto, puedes solicitar lugares en viajes como pasajero.
          La verificación solo es necesaria para ofrecer viajes como conductor.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// APPROVED
// =============================================================================

function ApprovedCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-7 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        Verificación aprobada
      </h2>
      <p className="text-sm text-slate-400 leading-relaxed mb-7 max-w-md mx-auto">
        Tu identidad fue verificada. Ya puedes publicar viajes como conductor.
        Tu perfil ahora muestra "Identidad verificada" para que otros usuarios sepan.
      </p>
      <button
        onClick={onContinue}
        className={"inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW + " hover:opacity-90 transition-opacity"}
      >
        Ir a Mobility <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// REJECTED
// =============================================================================

function RejectedCard({
  reason,
  onRetry,
}: {
  reason: string | null;
  onRetry: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <NewSubmission onSuccess={onRetry} />;
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-rose-500/30 rounded-3xl p-7">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">
            Tu verificación anterior fue rechazada
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            No pudimos aprobar tu última solicitud. Aquí está el motivo
            que dejó el equipo:
          </p>
        </div>
      </div>

      <div className="px-4 py-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl mb-5">
        <p className="text-sm text-rose-200 leading-relaxed">
          {reason ?? "No se proporcionó motivo específico. Intenta de nuevo asegurándote de que las dos fotos sean claras y la INE coincida con la persona en la selfie."}
        </p>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 text-white rounded-full h-11 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
      >
        Intentar de nuevo <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// FORMULARIO DE NUEVA VERIFICACIÓN
// =============================================================================

function NewSubmission({ onSuccess }: { onSuccess: () => void }) {
  const [ineImage, setIneImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = trpc.mobility.verification.submit.useMutation({
    onSuccess: () => {
      setIneImage(null);
      setSelfieImage(null);
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (!ineImage) {
      setError("Falta subir la foto de tu INE.");
      return;
    }
    if (!selfieImage) {
      setError("Falta subir la selfie con tu INE.");
      return;
    }
    submitMutation.mutate({
      ineFrontImage: ineImage,
      selfieWithIneImage: selfieImage,
    });
  };

  return (
    <div className="space-y-5">
      {/* Por qué pedimos esto */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Por qué pedimos esto
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cuando alguien se sube a tu coche, está confiando algo importante:
              su tiempo y su integridad. La verificación es la forma en que
              hacemos esa confianza posible.
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tus fotos <span className="font-bold text-white">no son visibles</span> para
              otros usuarios. Solo el equipo de moderación las ve en caso de incidente.
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              No las vendemos, no las compartimos, no las usamos para nada
              más allá de confirmar tu identidad.
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Si en algún momento cierras tu cuenta, las borramos.
            </p>
          </div>
        </div>
      </div>

      {/* Upload INE */}
      <ImageUploader
        title="Foto de tu INE"
        subtitle="Solo el frente. Asegúrate de que se lea bien tu nombre y foto."
        icon={<CreditCard className="w-5 h-5" />}
        image={ineImage}
        onImage={setIneImage}
        onError={setError}
      />

      {/* Upload selfie */}
      <ImageUploader
        title="Selfie sosteniendo tu INE"
        subtitle="Tu cara y la INE en la misma foto. Esto previene que alguien use una INE que no es suya."
        icon={<Camera className="w-5 h-5" />}
        image={selfieImage}
        onImage={setSelfieImage}
        onError={setError}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitMutation.isPending || !ineImage || !selfieImage}
        className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full h-12 font-semibold transition-opacity shadow-lg " + MOBILITY_GLOW + " flex items-center justify-center gap-2"}
      >
        {submitMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Subiendo imágenes...
          </>
        ) : (
          <>
            Enviar verificación <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        Al enviar, una persona del equipo revisará tu verificación.
        Suele tomar entre algunas horas y un día.
      </p>
    </div>
  );
}

// =============================================================================
// IMAGE UPLOADER (componente reutilizable)
// =============================================================================

function ImageUploader({
  title,
  subtitle,
  icon,
  image,
  onImage,
  onError,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  image: string | null;
  onImage: (img: string | null) => void;
  onError: (err: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onError(null);
    setProcessing(true);

    try {
      const compressed = await compressImage(file);
      onImage(compressed);
    } catch (err: any) {
      onError(err?.message ?? "No pudimos procesar la imagen. Intenta otra.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-gradient-to-br " + MOBILITY_ACCENT}>
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-0.5">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {image ? (
        <div className="relative">
          <img
            src={image}
            alt="Preview"
            className="w-full h-64 object-cover rounded-2xl border border-white/10"
          />
          <button
            onClick={() => onImage(null)}
            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 border border-white/10 rounded-full text-xs font-bold text-white backdrop-blur transition-colors"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="w-full h-32 border-2 border-dashed border-white/15 hover:border-blue-400/50 hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400">Procesando imagen...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">
                Toca para subir foto
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

// =============================================================================
// COMPRESSION HELPER
// -----------------------------------------------------------------------------
// Reduce imágenes a JPEG ≤1600px del lado mayor, calidad 0.85.
// Una foto típica de celular (4MB-8MB) queda en ~300-800KB después.
// =============================================================================

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validar tipo
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }

    // Validar tamaño antes de procesar (50MB max raw)
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error("La imagen es demasiado grande. Máximo 50MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;

        // Escalar si excede MAX_DIM
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Tu navegador no soporta procesamiento de imágenes."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG quality 0.85 es buen balance calidad/tamaño
        const dataURL = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataURL);
      };
      img.onerror = () => reject(new Error("No pudimos leer la imagen."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
    reader.readAsDataURL(file);
  });
}
