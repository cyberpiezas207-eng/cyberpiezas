import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Gift,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const POS_OPTIONS: Array<{
  code:
    | "boutique"
    | "abarrotes"
    | "veterinaria"
    | "verduleria"
    | "tarima"
    | "taqueria"
    | "papeleria";
  name: string;
  icon: string;
  color: string;
}> = [
  { code: "boutique", name: "Boutique", icon: "👗", color: "from-purple-500 to-pink-500" },
  { code: "abarrotes", name: "Abarrotes", icon: "🛒", color: "from-orange-500 to-red-500" },
  { code: "veterinaria", name: "Veterinaria", icon: "🐾", color: "from-emerald-500 to-cyan-500" },
  { code: "verduleria", name: "Verdulería", icon: "🥕", color: "from-emerald-500 to-green-600" },
  { code: "tarima", name: "Tarima", icon: "🎤", color: "from-fuchsia-600 to-purple-600" },
  { code: "taqueria", name: "Taquería", icon: "🌮", color: "from-amber-500 to-rose-600" },
  { code: "papeleria", name: "Papelería", icon: "📓", color: "from-sky-500 to-blue-600" },
];

export type GrantSubscriptionModalProps = {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
};

export default function GrantSubscriptionModal({
  user,
  onClose,
  onSuccess,
}: GrantSubscriptionModalProps) {
  const userName = user?.name ?? user?.email ?? "usuario";
  const userEmail = user?.email ?? "";

  const [selectedPos, setSelectedPos] = useState<
    (typeof POS_OPTIONS)[number]["code"] | null
  >(null);
  const [planType, setPlanType] = useState<"monthly" | "annual">("monthly");
  const [sourceType, setSourceType] = useState<"courtesy" | "admin_grant">(
    "courtesy",
  );
  const [reason, setReason] = useState("");

  // Validacion: motivo minimo 3 chars + POS seleccionado
  const canSubmit = selectedPos !== null && reason.trim().length >= 3;

  const grantMutation = trpc.pagos.admin.grantSubscription.useMutation({
    onSuccess: (data) => {
      const isRenewal = data && (data as any).wasRenewal === true;
      toast.success(
        isRenewal
          ? "🔁 Acceso renovado para " + userName
          : "✨ Acceso activado para " + userName,
      );
      onSuccess();
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
    },
  });

  const handleSubmit = () => {
    if (!canSubmit || !selectedPos) return;
    grantMutation.mutate({
      userId: user.id,
      posCode: selectedPos,
      planType,
      sourceType,
      reason: reason.trim(),
    });
  };

  const isLoading = grantMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header con gradiente premium */}
        <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 px-6 py-5 relative">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <XIcon className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Activar gratis
              </p>
              <h2 className="text-xl font-bold text-white">Dar acceso</h2>
              <p className="text-xs text-white/80 mt-0.5 truncate max-w-[260px]">
                {userName}
              </p>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Email del usuario destino */}
          {userEmail && (
            <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-xs text-slate-600 truncate">{userEmail}</span>
            </div>
          )}

          {/* Seleccion de POS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sistema POS *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POS_OPTIONS.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setSelectedPos(p.code)}
                  disabled={isLoading}
                  className={
                    "relative rounded-xl p-3 text-left transition-all border-2 " +
                    (selectedPos === p.code
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-slate-200 hover:border-slate-300 bg-white")
                  }
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {p.name}
                  </div>
                  {selectedPos === p.code && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de activacion */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tipo de acceso
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSourceType("courtesy")}
                disabled={isLoading}
                className={
                  "rounded-xl p-3 border-2 text-left transition-all " +
                  (sourceType === "courtesy"
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300 bg-white")
                }
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">Cortesía</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Regalo comercial, familia, amigos
                </p>
              </button>
              <button
                onClick={() => setSourceType("admin_grant")}
                disabled={isLoading}
                className={
                  "rounded-xl p-3 border-2 text-left transition-all " +
                  (sourceType === "admin_grant"
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300 bg-white")
                }
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-xs font-bold text-slate-900">Manual</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Demo, prueba, soporte, urgencia
                </p>
              </button>
            </div>
          </div>

          {/* Duracion */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Duración
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlanType("monthly")}
                disabled={isLoading}
                className={
                  "rounded-xl p-3 border-2 text-center transition-all " +
                  (planType === "monthly"
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300 bg-white")
                }
              >
                <div className="text-sm font-bold text-slate-900">1 mes</div>
                <div className="text-[10px] text-slate-500">Acceso mensual</div>
              </button>
              <button
                onClick={() => setPlanType("annual")}
                disabled={isLoading}
                className={
                  "rounded-xl p-3 border-2 text-center transition-all " +
                  (planType === "annual"
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300 bg-white")
                }
              >
                <div className="text-sm font-bold text-slate-900">1 año</div>
                <div className="text-[10px] text-slate-500">Acceso anual</div>
              </button>
            </div>
          </div>

          {/* Motivo obligatorio */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Motivo *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              placeholder="Ej: Cliente VIP, demo de venta, soporte por error de pago..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-slate-400 disabled:opacity-50"
              maxLength={500}
            />
            <p className="text-[10px] text-slate-400">
              {reason.trim().length} / 500 caracteres ·{" "}
              {reason.trim().length < 3 ? "Mínimo 3 caracteres" : "OK"}
            </p>
          </div>
        </div>

        {/* Footer acciones */}
        <div className="border-t border-slate-200 px-6 py-4 bg-white flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="flex-1 rounded-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Activar acceso
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
