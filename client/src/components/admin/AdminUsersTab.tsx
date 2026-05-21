// ============================================================================
// AdminUsersTab
// ----------------------------------------------------------------------------
// Tab "Suscriptores" del panel admin: stats por programa + buscador + lista
// de cards de usuarios.
//
// Extraido de AdminCyberpiezas en Commit 2 de V2 Admin Hub - Fase 1.
//
// PATRON: "Smart container delgado".
// - Maneja su propio state: searchQuery (UX local)
// - Hace su propia query: trpc.personalOperations.listSubscribers
// - Calcula derivados: filteredUsers, programStats
// - Acciones que disparan modales/mutations las delega al padre via callbacks
//
// PROPS (callbacks que delegan al padre):
// - processingKey: cual operacion esta en curso (para spinner en boton)
// - onDeactivate: dispara la mutation que vive en el padre
// - onNavigate: setLocation envuelto
// - onActivateGratis: abre el modal de "Activar gratis" (vive en padre)
// - onSendEmail: abre el modal de welcome email (vive en padre)
//
// NOTA SOBRE INVALIDACION:
// Cuando el padre invalida personalOperations.listSubscribers (despues de
// activar gratis o desactivar), esta query se refetcha automaticamente
// porque trpc invalida globalmente, no por componente.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Users } from "lucide-react";
import SubscriberCard from "@/components/admin/SubscriberCard";
import { PROGRAMS, type ProgramCode } from "@/lib/adminPosCatalog";

export type AdminUsersTabProps = {
  processingKey: string | null;
  onDeactivate: (userId: number, userName: string, programCode: ProgramCode) => void;
  onNavigate: (href: string) => void;
  onActivateGratis: (user: any) => void;
  onSendEmail: (email: string, name: string) => void;
};

export default function AdminUsersTab({
  processingKey,
  onDeactivate,
  onNavigate,
  onActivateGratis,
  onSendEmail,
}: AdminUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const usersQuery = trpc.personalOperations.listSubscribers.useQuery();
  const allUsers: any[] = (usersQuery.data as any[]) ?? [];

  const filteredUsers = allUsers.filter((row: any) => {
    const u = row.user ?? row;
    const q = searchQuery.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.businessName ?? "").toLowerCase().includes(q)
    );
  });

  const programStats = PROGRAMS.map((p) => {
    const activeCount = allUsers.filter((row: any) => {
      const access = row.programAccesses?.[p.code];
      return access?.status === "active";
    }).length;
    return { ...p, activeCount };
  });

  return (
    <div className="space-y-6">
      {/* Stats por programa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {programStats.map((p) => (
          <Card key={p.code} className="bg-slate-800/60 border-slate-700 shadow-md">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="text-xs font-bold text-slate-300 truncate">{p.name}</div>
              <div className="text-lg font-bold text-emerald-300">{p.activeCount}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                activos
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, email o negocio..."
          className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Lista de suscriptores */}
      {usersQuery.isLoading ? (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-12 pb-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Cargando suscriptores...
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-12 pb-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-semibold">No hay suscriptores</p>
            <p className="text-xs mt-1 text-slate-500">
              {searchQuery
                ? "No se encontraron resultados para tu busqueda."
                : "Aun no hay usuarios registrados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900/40 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-300" />
              Suscriptores
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 ml-1">
                {filteredUsers.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Cada card muestra los accesos y estado actual del usuario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredUsers.map((row: any, i: number) => (
              <SubscriberCard
                key={(row.user ?? row).id ?? i}
                row={row}
                processingKey={processingKey}
                onDeactivate={onDeactivate}
                onNavigate={onNavigate}
                onActivateGratis={onActivateGratis}
                onSendEmail={onSendEmail}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
