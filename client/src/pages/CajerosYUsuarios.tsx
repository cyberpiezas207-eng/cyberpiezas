import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

// Datos simulados de cajeros (en producción vendrían del backend)
const mockCajeros = [
  {
    id: 1,
    nombre: "Juan García",
    email: "juan@boutique.com",
    sucursal: "Sucursal Centro",
    estado: "activo",
    fechaCreacion: "2024-01-15",
  },
  {
    id: 2,
    nombre: "María López",
    email: "maria@boutique.com",
    sucursal: "Sucursal Norte",
    estado: "activo",
    fechaCreacion: "2024-02-20",
  },
  {
    id: 3,
    nombre: "Carlos Rodríguez",
    email: "carlos@boutique.com",
    sucursal: "Sucursal Centro",
    estado: "inactivo",
    fechaCreacion: "2024-01-10",
  },
];

export default function CajerosYUsuarios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const branchesQuery = trpc.branches.list.useQuery();
  const [cajeros, setCajeros] = useState(mockCajeros);
  const [showPassword, setShowPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    sucursal: "",
  });

  const sucursales = branchesQuery.data ?? [];

  const handleAddOrEdit = () => {
    if (!formData.nombre || !formData.email || !formData.sucursal) {
      alert("Por favor completa todos los campos");
      return;
    }

    if (editingId) {
      setCajeros(
        cajeros.map((c) =>
          c.id === editingId
            ? {
                ...c,
                nombre: formData.nombre,
                email: formData.email,
                sucursal: formData.sucursal,
              }
            : c
        )
      );
      setEditingId(null);
    } else {
      setCajeros([
        ...cajeros,
        {
          id: Math.max(...cajeros.map((c) => c.id), 0) + 1,
          nombre: formData.nombre,
          email: formData.email,
          sucursal: formData.sucursal,
          estado: "activo",
          fechaCreacion: new Date().toISOString().split("T")[0],
        },
      ]);
    }

    setFormData({ nombre: "", email: "", password: "", sucursal: "" });
    setIsDialogOpen(false);
  };

  const handleEdit = (cajero: typeof mockCajeros[0]) => {
    setFormData({
      nombre: cajero.nombre,
      email: cajero.email,
      password: "",
      sucursal: cajero.sucursal,
    });
    setEditingId(cajero.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas desactivar este cajero?")) {
      setCajeros(
        cajeros.map((c) =>
          c.id === id ? { ...c, estado: "inactivo" } : c
        )
      );
    }
  };

  const handleReactivate = (id: number) => {
    setCajeros(
      cajeros.map((c) =>
        c.id === id ? { ...c, estado: "activo" } : c
      )
    );
  };

  const activeCajeros = cajeros.filter((c) => c.estado === "activo");
  const inactiveCajeros = cajeros.filter((c) => c.estado === "inactivo");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Cajeros y Usuarios</h1>
          </div>
          <p className="text-muted-foreground text-sm">Gestiona los cajeros y usuarios de tu boutique</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Cajeros Activos</p>
              <p className="text-3xl font-bold text-primary mt-2">{activeCajeros.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Cajeros Inactivos</p>
              <p className="text-3xl font-bold text-yellow-500 mt-2">{inactiveCajeros.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-accent mt-2">{cajeros.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Button */}
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ nombre: "", email: "", password: "", sucursal: "" });
                }}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Cajero
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? "Editar Cajero" : "Agregar Nuevo Cajero"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingId
                    ? "Actualiza la información del cajero"
                    : "Completa los datos para crear una nueva cuenta de cajero"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Nombre Completo</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Juan García"
                    className="mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cajero@boutique.com"
                    className="mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                {!editingId && (
                  <div>
                    <Label className="text-slate-300">Contraseña</Label>
                    <div className="relative mt-2">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-slate-300">Sucursal Asignada</Label>
                  {branchesQuery.isLoading ? (
                    <p className="text-slate-400 text-sm mt-2">Cargando sucursales...</p>
                  ) : sucursales.length === 0 ? (
                    <p className="text-yellow-400 text-sm mt-2">No hay sucursales registradas. Crea una en Sucursales primero.</p>
                  ) : (
                    <Select value={formData.sucursal} onValueChange={(value) => setFormData({ ...formData, sucursal: value })}>
                      <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecciona una sucursal" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {sucursales.map((s) => (
                          <SelectItem key={s.id} value={s.name} className="text-white hover:bg-slate-600">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAddOrEdit}
                    className="flex-1 bg-gradient-to-r from-primary to-accent"
                  >
                    {editingId ? "Guardar Cambios" : "Crear Cajero"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 border-slate-600"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cajeros Activos */}
        <Card>
          <CardHeader>
            <CardTitle>Cajeros Activos</CardTitle>
            <CardDescription>
              {activeCajeros.length} cajero{activeCajeros.length !== 1 ? "s" : ""} operando
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeCajeros.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay cajeros activos</p>
            ) : (
              <div className="space-y-3">
                {activeCajeros.map((cajero) => (
                  <div
                    key={cajero.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{cajero.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{cajero.email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">📍 {cajero.sucursal}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cajero)}
                        className="border-border hover:bg-secondary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(cajero.id)}
                        className="border-red-600/50 hover:bg-red-600/20 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cajeros Inactivos */}
        {inactiveCajeros.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cajeros Inactivos</CardTitle>
              <CardDescription>
                {inactiveCajeros.length} cajero{inactiveCajeros.length !== 1 ? "s" : ""} desactivado{inactiveCajeros.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactiveCajeros.map((cajero) => (
                  <div
                    key={cajero.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/10 opacity-75"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-muted-foreground">{cajero.nombre}</h3>
                      <p className="text-sm text-muted-foreground/70">{cajero.email}</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">📍 {cajero.sucursal}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReactivate(cajero.id)}
                      className="border-green-600/50 hover:bg-green-600/20 text-green-400"
                    >
                      Reactivar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
