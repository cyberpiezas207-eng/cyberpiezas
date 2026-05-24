import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Users,
  Mail,
  Flag,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  Eye,
  Send,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

/**
 * ============================================================================
 * MOBILITY ADMIN — panel unificado para gestionar el piloto cerrado
 * ============================================================================
 *
 * Tres pestañas:
 *   1. Whitelist     → invitar usuarios al piloto, ver lista, desactivar
 *   2. Verificaciones → revisar INE+selfie pendientes, aprobar/rechazar
 *   3. Reportes      → ver reportes abiertos, resolver/descartar/escalar
 *
 * Solo accesible para usuarios con role=admin.
 * ============================================================================
 */

const MOBILITY_ACCENT = "from-blue-500 via-cyan-500 to-blue-600";
const MOBILITY_GLOW = "shadow-blue-500/30";

type Tab = "whitelist" | "verifications" | "reports";

export default function MobilityAdmin() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("whitelist");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <button
          onClick={() => setLocation("/mobility")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Mobility
        </button>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">
              Panel de moderación
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.05] mb-3">
            Mobility · Admin
          </h1>
          <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl">
            Aquí gestionas el piloto cerrado: a quién invitas, qué verificaciones apruebas,
            y cómo resuelves los reportes. Cada decisión define la cultura del cuarto.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <TabButton active={tab === "whitelist"} onClick={() => setTab("whitelist")} icon={<Mail className="w-4 h-4" />} label="Whitelist" />
          <TabButton active={tab === "verifications"} onClick={() => setTab("verifications")} icon={<ShieldCheck className="w-4 h-4" />} label="Verificaciones" />
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={<Flag className="w-4 h-4" />} label="Reportes" />
        </div>

        {/* Contenido */}
        {tab === "whitelist" && <WhitelistTab />}
        {tab === "verifications" && <VerificationsTab />}
        {tab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}

// =============================================================================
// TAB BUTTON
// =============================================================================

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
// WHITELIST TAB
// =============================================================================

function WhitelistTab() {
  const listQuery = trpc.mobility.whitelist.list.useQuery();
  const [showAddForm, setShowAddForm] = useState(false);

  const entries = listQuery.data ?? [];
  const used = entries.filter((e: any) => e.usedAt !== null);
  const pending = entries.filter((e: any) => e.usedAt === null && e.isActive);
  const deactivated = entries.filter((e: any) => !e.isActive && e.usedAt === null);

  return (
    <div className="space-y-5">
      {/* Stats + acción */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <StatPill label="Pendientes" value={pending.length} color="blue" />
          <StatPill label="Usadas" value={used.length} color="emerald" />
          {deactivated.length > 0 && <StatPill label="Desactivadas" value={deactivated.length} color="slate" />}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className={"inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r " + MOBILITY_ACCENT + " shadow-lg " + MOBILITY_GLOW + " hover:opacity-90 transition-opacity"}
        >
          <Plus className="w-3.5 h-3.5" /> Invitar a alguien
        </button>
      </div>

      {showAddForm && <AddToWhitelistForm onClose={() => setShowAddForm(false)} onSuccess={() => { setShowAddForm(false); listQuery.refetch(); }} />}

      {listQuery.isLoading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
          <Mail className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-base font-bold text-white mb-2">Aún no hay invitaciones</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            La whitelist define quién puede entrar a Mobility durante el piloto.
            Empieza con personas cercanas que confías.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => (
            <WhitelistEntry key={entry.id} entry={entry} onRefetch={() => listQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddToWhitelistForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addMutation = trpc.mobility.whitelist.add.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (!email.includes("@")) {
      setError("El email no es válido.");
      return;
    }
    addMutation.mutate({
      email: email.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <h3 className="text-base font-bold text-white mb-4">Invitar a Mobility</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alguien@ejemplo.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Debe ser el mismo correo con el que se va a registrar.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Teléfono <span className="text-slate-500 normal-case font-normal">(opcional, referencia)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+52 777 123 4567"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Notas <span className="text-slate-500 normal-case font-normal">(opcional, solo tú las ves)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cómo conocí a esta persona, por qué la invito al piloto..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-5">
        <button
          onClick={onClose}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={addMutation.isPending}
          className={"bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-50 text-white rounded-full h-10 text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5"}
        >
          {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Invitar</>}
        </button>
      </div>
    </div>
  );
}

function WhitelistEntry({ entry, onRefetch }: { entry: any; onRefetch: () => void }) {
  const deactivateMutation = trpc.mobility.whitelist.deactivate.useMutation({
    onSuccess: () => onRefetch(),
  });

  const isUsed = !!entry.usedAt;
  const isActive = entry.isActive;
  const createdDate = new Date(entry.createdAt);
  const dateStr = createdDate.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  const handleDeactivate = () => {
    if (!confirm("¿Desactivar esta invitación? La persona ya no podrá usarla.")) return;
    deactivateMutation.mutate({ id: entry.id });
  };

  return (
    <div className={"backdrop-blur-xl border rounded-2xl p-4 " + (isUsed ? "bg-emerald-500/5 border-emerald-500/20" : isActive ? "bg-white/[0.03] border-white/10" : "bg-white/[0.02] border-white/5 opacity-60")}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{entry.email}</p>
            {isUsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                Usada
              </span>
            )}
            {!isUsed && !isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-500/15 border border-slate-500/30 rounded-full px-2 py-0.5">
                Desactivada
              </span>
            )}
            {!isUsed && isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/15 border border-blue-500/30 rounded-full px-2 py-0.5">
                Pendiente
              </span>
            )}
          </div>
          {entry.phone && (
            <p className="text-xs text-slate-400">{entry.phone}</p>
          )}
          {entry.invitationNotes && (
            <p className="text-xs text-slate-500 mt-1.5 italic">"{entry.invitationNotes}"</p>
          )}
          <p className="text-xs text-slate-500 mt-1.5">Invitada el {dateStr}</p>
        </div>

        {!isUsed && isActive && (
          <button
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-8 px-3 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" /> Desactivar
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// VERIFICATIONS TAB
// =============================================================================

function VerificationsTab() {
  const listQuery = trpc.mobility.verification.listPending.useQuery();
  const verifications = listQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <StatPill label="Pendientes" value={verifications.length} color="amber" />
      </div>

      {listQuery.isLoading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : verifications.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-base font-bold text-white mb-2">No hay verificaciones pendientes</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Cuando alguien se quiera registrar como conductor, su solicitud aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v: any) => (
            <VerificationCard key={v.id} verification={v} onDecided={() => listQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function VerificationCard({ verification, onDecided }: { verification: any; onDecided: () => void }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const profileQuery = trpc.mobility.profile.getPublic.useQuery({ userId: verification.userId });

  const reviewMutation = trpc.mobility.verification.review.useMutation({
    onSuccess: () => onDecided(),
    onError: (err) => setError(err.message),
  });

  const submittedDate = new Date(verification.submittedAt);
  const dateStr = submittedDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const timeStr = submittedDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const handleApprove = () => {
    if (!confirm("¿Aprobar a esta persona como conductor verificado?")) return;
    setError(null);
    reviewMutation.mutate({
      verificationId: verification.id,
      decision: "approved",
    });
  };

  const handleReject = () => {
    setError(null);
    if (rejectReason.trim().length < 5) {
      setError("Escribe un motivo claro para que la persona sepa qué corregir.");
      return;
    }
    reviewMutation.mutate({
      verificationId: verification.id,
      decision: "rejected",
      rejectionReason: rejectReason.trim(),
    });
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={"w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br " + MOBILITY_ACCENT}>
            <span className="text-sm font-bold text-white">
              {profileQuery.data?.displayName?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{profileQuery.data?.displayName ?? "Cargando..."}</p>
            <p className="text-xs text-slate-400">
              {profileQuery.data?.baseCity ? profileQuery.data.baseCity + " · " : ""}
              Enviado {dateStr} · {timeStr}
            </p>
          </div>
        </div>
      </div>

      {/* Imágenes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ImagePreview url={verification.ineFrontUrl} label="INE (frente)" />
        <ImagePreview url={verification.selfieWithIneUrl} label="Selfie con INE" />
      </div>

      {/* Acciones */}
      {!showRejectForm ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowRejectForm(true)}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" /> Rechazar
          </button>
          <button
            onClick={handleApprove}
            disabled={reviewMutation.isPending}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Aprobar</>}
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Motivo del rechazo (la persona lo va a leer)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej. La foto del INE está borrosa. Necesitamos que se lea bien el nombre."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-400 focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Sé específico para que sepa qué corregir y pueda intentar de nuevo.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShowRejectForm(false); setRejectReason(""); setError(null); }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReject}
              disabled={reviewMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-full h-10 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Enviar rechazo</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ImagePreview({ url, label }: { url: string; label: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="block w-full bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-400/50 transition-colors group"
      >
        <div className="relative">
          <img src={url} alt={label} className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <p className="text-xs text-slate-400 px-3 py-2 text-left flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> {label}
        </p>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setExpanded(false)}
        >
          <img src={url} alt={label} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </>
  );
}

// =============================================================================
// REPORTS TAB
// =============================================================================

function ReportsTab() {
  const listQuery = trpc.mobility.reports.listOpen.useQuery();
  const reports = listQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <StatPill label="Abiertos" value={reports.length} color="rose" />
      </div>

      {listQuery.isLoading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
          <Flag className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-base font-bold text-white mb-2">No hay reportes abiertos</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Cuando alguien reporte a otra persona, el caso aparecerá aquí para revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r: any) => (
            <ReportCard key={r.id} report={r} onResolved={() => listQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onResolved }: { report: any; onResolved: () => void }) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolution, setResolution] = useState<"resolved" | "dismissed" | "escalated">("resolved");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reporterQuery = trpc.mobility.profile.getPublic.useQuery({ userId: report.reporterId });
  const subjectQuery = trpc.mobility.profile.getPublic.useQuery({ userId: report.subjectId });

  const resolveMutation = trpc.mobility.reports.resolve.useMutation({
    onSuccess: () => onResolved(),
    onError: (err) => setError(err.message),
  });

  const handleResolve = () => {
    setError(null);
    if (notes.trim().length < 3) {
      setError("Escribe brevemente cómo resolviste el caso (al menos una frase).");
      return;
    }
    resolveMutation.mutate({
      reportId: report.id,
      resolution,
      notes: notes.trim(),
    });
  };

  const createdDate = new Date(report.createdAt);
  const dateStr = createdDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const timeStr = createdDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const categoryLabels: Record<string, string> = {
    harassment: "Acoso",
    safety: "Conducta peligrosa",
    no_show: "No se presentó",
    fraud: "Fraude",
    discrimination: "Discriminación",
    doxxing: "Violación de privacidad",
    spam: "Spam",
    other: "Otra cosa",
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-rose-500/20 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full mb-2">
            <Flag className="w-3 h-3 text-rose-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              {categoryLabels[report.category] ?? report.category}
            </span>
          </span>
          <p className="text-xs text-slate-500">Reportado el {dateStr} · {timeStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Reportó</p>
          <p className="text-sm text-white font-medium">{reporterQuery.data?.displayName ?? "..."}</p>
          {reporterQuery.data?.baseCity && (
            <p className="text-xs text-slate-400">{reporterQuery.data.baseCity}</p>
          )}
        </div>
        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Sobre</p>
          <p className="text-sm text-white font-medium">{subjectQuery.data?.displayName ?? "..."}</p>
          {subjectQuery.data?.baseCity && (
            <p className="text-xs text-slate-400">{subjectQuery.data.baseCity}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1.5">Descripción:</p>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.description}</p>
      </div>

      {!showResolveForm ? (
        <button
          onClick={() => setShowResolveForm(true)}
          className={"w-full bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 text-white rounded-full h-10 text-sm font-semibold transition-opacity"}
        >
          Resolver caso
        </button>
      ) : (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Resolución
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResolution("resolved")}
                className={
                  "h-10 rounded-lg border text-xs font-semibold transition-all " +
                  (resolution === "resolved"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")
                }
              >
                Resuelto
              </button>
              <button
                type="button"
                onClick={() => setResolution("dismissed")}
                className={
                  "h-10 rounded-lg border text-xs font-semibold transition-all " +
                  (resolution === "dismissed"
                    ? "bg-slate-500/20 border-slate-500/50 text-slate-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")
                }
              >
                Sin fundamento
              </button>
              <button
                type="button"
                onClick={() => setResolution("escalated")}
                className={
                  "h-10 rounded-lg border text-xs font-semibold transition-all " +
                  (resolution === "escalated"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")
                }
              >
                Escalado
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Notas internas (cómo se resolvió)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Hablé con ambas personas. Hubo malentendido sobre punto de encuentro. Sin acción."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Estas notas son solo internas. Documentan tu decisión para el futuro.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShowResolveForm(false); setNotes(""); setError(null); }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full h-10 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              className={"bg-gradient-to-r " + MOBILITY_ACCENT + " hover:opacity-90 disabled:opacity-50 text-white rounded-full h-10 text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5"}
            >
              {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Cerrar caso</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STAT PILL (chip pequeño con conteo)
// =============================================================================

function StatPill({ label, value, color }: { label: string; value: number; color: "blue" | "emerald" | "amber" | "rose" | "slate" }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    rose: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    slate: "bg-slate-500/10 border-slate-500/30 text-slate-300",
  };
  return (
    <span className={"inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full " + colors[color]}>
      <span className="text-base font-bold">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</span>
    </span>
  );
}
