// ============================================================================
// SubscriberCard
// ----------------------------------------------------------------------------
// Card de un suscriptor/usuario en el panel admin.
//
// Extraido de AdminCyberpiezas como parte de Commit 1B (V2 Admin Hub - Fase 1).
//
// RESPONSABILIDAD:
// - Renderiza la UI completa de UN usuario: header, contactos, accesos a POS
// - NO hace queries (los datos vienen como prop `row`)
// - NO hace mutations directamente (recibe callbacks por props)
// - NO maneja estado global (solo el render de un usuario)
//
// PROPS:
// - row: dato del usuario (incluye user + programAccesses del hibrido)
// - processingKey: para mostrar "..." en boton Desactivar si esta procesando
// - onDeactivate: callback para desactivar un programa (manageable=true)
// - onNavigate: callback para navegar a setupHref (setLocation envuelto)
// - onActivateGratis: callback para abrir modal "Activar gratis"
// - onSendEmail: callback para abrir el flujo de email
// ============================================================================

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Mail,
  Phone,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SourceBadge } from "@/components/SubscriptionBadges";
import { PROGRAMS, type ProgramCode } from "@/lib/adminPosCatalog";
import {
  getAvatarColor,
  getInitials,
  getPlanColor,
  getPlanLabel,
  getRelativeExpiration,
} from "@/lib/adminUserHelpers";

export type SubscriberCardProps = {
  row: any;
  processingKey: string | null;
  onDeactivate: (userId: number, userName: string, programCode: ProgramCode) => void;
  onNavigate: (href: string) => void;
  onActivateGratis: (user: any) => void;
  onSendEmail: (email: string, name: string) => void;
};

export default function SubscriberCard({
  row,
  processingKey,
  onDeactivate,
  onNavigate,
  onActivateGratis,
  onSendEmail,
}: SubscriberCardProps) {
  const u = row.user ?? row;
  const accesses = row.programAccesses ?? {};
  const initials = getInitials(u.name || u.email || "?");
  const avatarColor = getAvatarColor(u.name || u.email || "?");

  const activePrograms = PROGRAMS.filter(
    (p) => accesses[p.code]?.status === "active",
  );
  const isFullyInactive = activePrograms.length === 0;

  return (
    <Card className="bg-slate-800/60 border-slate-700/80 hover:border-purple-500/60 transition-all shadow-lg">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div
            className={
              "flex-shrink-0 w-20 h-20 rounded-2xl " +
              avatarColor +
              " flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-white/10"
            }
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-xl font-bold text-white truncate">
                  {u.name || "Sin nombre"}
                </h3>
                {u.businessName && (
                  <p className="text-sm text-purple-300 flex items-center gap-1.5 mt-0.5">
                    <Store className="w-3.5 h-3.5" />
                    {u.businessName}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {isFullyInactive ? (
                  <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-500/40 font-semibold">
                    Sin accesos
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40 gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {activePrograms.length}{" "}
                    {activePrograms.length === 1 ? "programa" : "programas"}
                  </Badge>
                )}
                <Badge className={getPlanColor(u.subscriptionPlan) + " text-xs font-semibold"}>
                  <CreditCard className="w-3 h-3 mr-1" />
                  {getPlanLabel(u.subscriptionPlan)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-300 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{u.email || "Sin email"}</span>
              </div>
              {u.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{u.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Registro:{" "}
                  {u.createdAt
                    ? format(new Date(u.createdAt), "dd 'de' MMM, yyyy", { locale: es })
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">
                  Login: {u.loginMethod || "-"}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">
                  Accesos a programas
                </p>
                <button
                  onClick={() => onActivateGratis(u)}
                  className="text-[11px] font-bold text-purple-200 hover:text-white bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 rounded-full px-2.5 py-1 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  Activar gratis
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PROGRAMS.map((program) => {
                  const access = accesses[program.code];

                  // LECTURA DEFENSIVA (V1.5):
                  // Si el backend devuelve el shape nuevo, usamos access.active
                  // y access.status. Si solo viene el shape viejo, seguimos igual.
                  const isActive =
                    access?.active === true || access?.status === "active";
                  const status =
                    (access?.status as string) ?? (isActive ? "active" : "none");
                  const isExpired = status === "expired";
                  const isCancelled = status === "cancelled";

                  const key = u.id + "-" + program.code;
                  const isProcessing = processingKey === key;
                  const source =
                    access?.source ?? (program.manageable ? "enum" : "payment");

                  // Datos V1.5 (defensivos)
                  const expiration = getRelativeExpiration(access?.endDate);
                  const planType = access?.planType as string | undefined;

                  // Estilo segun status
                  let cardClass = "bg-slate-900/60 border-slate-700/80";
                  let titleClass = "text-slate-300";
                  if (isActive) {
                    cardClass = "bg-emerald-500/15 border-emerald-500/50 shadow-md";
                    titleClass = "text-emerald-200";
                  } else if (isExpired) {
                    cardClass = "bg-amber-500/10 border-amber-500/40";
                    titleClass = "text-amber-200";
                  } else if (isCancelled) {
                    cardClass = "bg-slate-700/30 border-slate-600/60";
                    titleClass = "text-slate-400";
                  }

                  const handleClick = () => {
                    if (isActive && program.manageable) {
                      onDeactivate(u.id, u.name || "usuario", program.code);
                    } else {
                      onNavigate(program.setupHref);
                    }
                  };

                  return (
                    <div
                      key={program.code}
                      data-program={program.code}
                      data-source={source}
                      data-active={isActive ? "1" : "0"}
                      data-status={status}
                      className={"rounded-lg border p-2.5 transition-all " + cardClass}
                    >
                      {/* Header: icono + nombre + badge source */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{program.icon}</span>
                        <span className={"text-sm font-bold " + titleClass}>
                          {program.name}
                        </span>
                        <SourceBadge sourceType={access?.sourceType} size="xs" />
                      </div>

                      {/* Detalle V1.5: vencimiento + plan */}
                      {(expiration || planType) && (
                        <div className="mb-2 space-y-0.5">
                          {planType && (
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {planType === "monthly" ? "Plan mensual" : "Plan anual"}
                            </div>
                          )}
                          {expiration && (
                            <div
                              className={
                                "text-[11px] font-medium flex items-center gap-1 " +
                                (expiration.urgency === "expired"
                                  ? "text-amber-300"
                                  : expiration.urgency === "today" ||
                                    expiration.urgency === "soon"
                                  ? "text-yellow-200"
                                  : "text-slate-300")
                              }
                            >
                              {expiration.urgency === "expired" && (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {expiration.text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Etiqueta solo si NO activo */}
                      {!isActive && isExpired && (
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Vencida
                        </div>
                      )}
                      {!isActive && isCancelled && (
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Cancelada
                        </div>
                      )}

                      {/* Boton de accion */}
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClick}
                          disabled={isProcessing}
                          className="w-full h-7 text-xs border-red-500/50 text-red-200 hover:bg-red-500/30 font-semibold"
                        >
                          {isProcessing ? "..." : "Desactivar"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClick}
                          className="w-full h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 font-semibold gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate">{program.setupLabel}</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSendEmail(u.email, u.name || "usuario")}
                className="border-slate-600 hover:bg-slate-700 text-slate-200 gap-1.5 font-semibold"
              >
                <Mail className="w-3.5 h-3.5" />
                Enviar email
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
