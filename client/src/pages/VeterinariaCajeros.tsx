import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Edit2,
  Key,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Power,
  PowerOff,
  Stethoscope,
  HeartHandshake,
  ClipboardList,
  Building2,
  Loader2,
  Mail,
} from "lucide-react";

// Tipo del cajero (sin passwordHash - lo excluye el backend)
type Cashier = {
  id: number;
  ownerUserId: number;
  name: string;
  email: string;
  role: "doctor" | "asistente" | "recepcionista";
  branchName: string;
  status: "active" | "inactive";
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Mapeo de rol a icono y color
const ROLE_META: Record<
  Cashier["role"],
  { label: string; icon: typeof Stethoscope; color: string; bg: string }
> = {
  doctor: {
    label: "Doctor",
    icon: Stethoscope,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  asistente: {
    label: "Asistente",
    icon: HeartHandshake,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/30",
  },
  recepcionista: {
    label: "Recepcionista",
    icon: ClipboardList,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
};

export default function VeterinariaCajeros() {
  const utils = trpc.useUtils();
  const cashiersQuery = trpc.veterinaria.cashiers.list.useQuery({ status: "all" });

  // Estado de modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [passwordCashier, setPasswordCashier] = useState<Cashier | null>(null);

  // Filtro por sucursal
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const allCashiers = (cashiersQuery.data ?? []) as Cashier[];

  // Branches unicas para el filtro
  const branches = useMemo(() => {
    const set = new Set<string>();
    allCashiers.forEach((c) => {
      if (c.branchName) set.add(c.branchName);
    });
    return Array.from(set).sort();
  }, [allCashiers]);

  // Filtrar por sucursal seleccionada
  const filteredCashiers = useMemo(() => {
    if (branchFilter === "all") return allCashiers;
    return allCashiers.filter((c) => c.branchName === branchFilter);
  }, [allCashiers, branchFilter]);

  const activeCashiers = filteredCashiers.filter((c) => c.status === "active");
  const inactiveCashiers = filteredCashiers.filter((c) => c.status === "inactive");

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const setStatusMutation = trpc.veterinaria.cashiers.setStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "active" ? "Cajero reactivado" : "Cajero desactivado",
      );
      utils.veterinaria.cashiers.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.veterinaria.cashiers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cajero eliminado permanentemente");
      utils.veterinaria.cashiers.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (cashier: Cashier) => {
    const confirmed = window.confirm(
      "Eliminar PERMANENTEMENTE a " +
        cashier.name +
        "?\n\nEsta accion no se puede deshacer.\n\n" +
        "Consejo: usa 'Desactivar' para preservar el historico.",
    );
    if (!confirmed) return;
    deleteMutation.mutate({ id: cashier.id });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-7 h-7 text-emerald-500" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Cajeros y Usuarios
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Gestiona empleados de tu clinica veterinaria
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold h-11 px-5"
          >
            <Plus className="w-4 h-4" />
            Agregar cajero
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total
              </p>
              <p className="text-3xl font-bold text-foreground mt-2 tracking-tight">
                {allCashiers.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Activos
              </p>
              <p className="text-3xl font-bold text-emerald-500 mt-2 tracking-tight">
                {allCashiers.filter((c) => c.status === "active").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Inactivos
              </p>
              <p className="text-3xl font-bold text-amber-500 mt-2 tracking-tight">
                {allCashiers.filter((c) => c.status === "inactive").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sucursales
              </p>
              <p className="text-3xl font-bold text-cyan-500 mt-2 tracking-tight">
                {branches.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtro por sucursal */}
        {branches.length > 0 && (
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">Filtrar por sucursal:</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading */}
        {cashiersQuery.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Empty state */}
        {!cashiersQuery.isLoading && allCashiers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                Aun no tienes cajeros registrados
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Agrega doctores, asistentes y recepcionistas para que puedan
                operar tu clinica.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar primer cajero
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lista de activos */}
        {activeCashiers.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Activos ({activeCashiers.length})
            </h2>
            <div className="space-y-3">
              {activeCashiers.map((c) => (
                <CashierCard
                  key={c.id}
                  cashier={c}
                  onEdit={() => setEditingCashier(c)}
                  onChangePassword={() => setPasswordCashier(c)}
                  onToggleStatus={() =>
                    setStatusMutation.mutate({ id: c.id, status: "inactive" })
                  }
                  onDelete={() => handleDelete(c)}
                  isProcessing={
                    setStatusMutation.isPending || deleteMutation.isPending
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Lista de inactivos */}
        {inactiveCashiers.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <PowerOff className="w-3.5 h-3.5 text-amber-500" />
              Inactivos ({inactiveCashiers.length})
            </h2>
            <div className="space-y-3">
              {inactiveCashiers.map((c) => (
                <CashierCard
                  key={c.id}
                  cashier={c}
                  inactive
                  onEdit={() => setEditingCashier(c)}
                  onChangePassword={() => setPasswordCashier(c)}
                  onToggleStatus={() =>
                    setStatusMutation.mutate({ id: c.id, status: "active" })
                  }
                  onDelete={() => handleDelete(c)}
                  isProcessing={
                    setStatusMutation.isPending || deleteMutation.isPending
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal: Crear/Editar */}
        {(showCreateModal || editingCashier) && (
          <CashierFormModal
            cashier={editingCashier}
            onClose={() => {
              setShowCreateModal(false);
              setEditingCashier(null);
            }}
            onSaved={() => {
              utils.veterinaria.cashiers.list.invalidate();
              setShowCreateModal(false);
              setEditingCashier(null);
            }}
          />
        )}

        {/* Modal: Cambiar password */}
        {passwordCashier && (
          <PasswordModal
            cashier={passwordCashier}
            onClose={() => setPasswordCashier(null)}
            onSaved={() => setPasswordCashier(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// CashierCard - Card individual de cada cajero
// ============================================================================

function CashierCard({
  cashier,
  inactive,
  onEdit,
  onChangePassword,
  onToggleStatus,
  onDelete,
  isProcessing,
}: {
  cashier: Cashier;
  inactive?: boolean;
  onEdit: () => void;
  onChangePassword: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}) {
  const meta = ROLE_META[cashier.role];
  const RoleIcon = meta.icon;

  return (
    <Card className={inactive ? "opacity-60" : ""}>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div
              className={
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border " +
                meta.bg
              }
            >
              <RoleIcon className={"w-5 h-5 " + meta.color} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground tracking-tight truncate">
                  {cashier.name}
                </h3>
                <span
                  className={
                    "text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border " +
                    meta.bg +
                    " " +
                    meta.color
                  }
                >
                  {meta.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {cashier.email}
              </p>
              {cashier.branchName && (
                <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  {cashier.branchName}
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={isProcessing}
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onChangePassword}
              disabled={isProcessing}
              title="Cambiar password"
            >
              <Key className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleStatus}
              disabled={isProcessing}
              className={
                inactive
                  ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              }
              title={inactive ? "Reactivar" : "Desactivar"}
            >
              {inactive ? (
                <>
                  <Power className="w-3.5 h-3.5 mr-1" />
                  Reactivar
                </>
              ) : (
                <PowerOff className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={isProcessing}
              className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
              title="Eliminar permanente"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CashierFormModal - Modal crear/editar
// ============================================================================

function CashierFormModal({
  cashier,
  onClose,
  onSaved,
}: {
  cashier: Cashier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = cashier !== null;

  const [name, setName] = useState(cashier?.name ?? "");
  const [email, setEmail] = useState(cashier?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Cashier["role"]>(cashier?.role ?? "asistente");
  const [branchName, setBranchName] = useState(cashier?.branchName ?? "");

  const createMutation = trpc.veterinaria.cashiers.create.useMutation({
    onSuccess: () => {
      toast.success("Cajero creado");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.veterinaria.cashiers.update.useMutation({
    onSuccess: () => {
      toast.success("Cajero actualizado");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Nombre minimo 2 caracteres");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Email invalido");
      return;
    }
    if (!isEditing && password.length < 6) {
      toast.error("Password minimo 6 caracteres");
      return;
    }

    if (isEditing && cashier) {
      updateMutation.mutate({
        id: cashier.id,
        name: name.trim(),
        email: email.trim(),
        role,
        branchName: branchName.trim(),
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        branchName: branchName.trim(),
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cajero" : "Agregar nuevo cajero"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del cajero. Para cambiar password usa el boton dedicado."
              : "Completa los datos para crear el cajero. La password se hashea con scrypt antes de guardarse."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block">Nombre completo *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Dr. Juan Garcia"
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cajero@miveterinaria.com"
            />
          </div>

          {!isEditing && (
            <div>
              <Label className="mb-1.5 block">Password * (minimo 6 caracteres)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="......"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Cashier["role"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">🩺 Doctor</SelectItem>
                <SelectItem value="asistente">🤝 Asistente</SelectItem>
                <SelectItem value="recepcionista">📋 Recepcionista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Sucursal (opcional)</Label>
            <Input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Ej: Sucursal Centro"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : isEditing ? (
              "Guardar cambios"
            ) : (
              "Crear cajero"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PasswordModal - Modal cambio password
// ============================================================================

function PasswordModal({
  cashier,
  onClose,
  onSaved,
}: {
  cashier: Cashier;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mutation = trpc.veterinaria.cashiers.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Password actualizado");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (newPassword.length < 6) {
      toast.error("Password minimo 6 caracteres");
      return;
    }
    mutation.mutate({ id: cashier.id, newPassword });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar password</DialogTitle>
          <DialogDescription>
            Nueva password para{" "}
            <span className="font-semibold text-foreground">{cashier.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label className="mb-1.5 block">Nueva password * (minimo 6 caracteres)</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="......"
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Cambiar password"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
