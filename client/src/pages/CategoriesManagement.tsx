import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const categories = trpc.categories.list.useQuery();
  const createCategory = trpc.categories.create.useMutation();

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: formData.name,
        description: formData.description,
      });

      toast.success("Categoría creada exitosamente");
      setFormData({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      categories.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al crear la categoría");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
      return;
    }

    try {
      toast.info("Eliminación de categorías disponible en próxima versión");
      // TODO: Implementar eliminación de categorías
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar la categoría");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Gestión de Categorías</h1>
            <p className="text-muted-foreground">
              Organiza tus productos por categorías
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>

        {/* Categories Grid */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Categorías
            </CardTitle>
            <CardDescription>
              Total: {categories.data?.length || 0} categorías
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando categorías...</p>
              </div>
            ) : (categories.data?.length || 0) === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay categorías registradas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.data?.map((category) => (
                  <Card key={category.id} className="border-border">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-foreground mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {category.description}
                        </p>
                      )}
                      <div className="flex gap-2 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive gap-1"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Category Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary">Crear Nueva Categoría</DialogTitle>
              <DialogDescription>
                Agrega una nueva categoría para organizar tus productos
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground font-semibold">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Camisetas, Pantalones, Accesorios"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-foreground font-semibold">
                  Descripción
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la categoría"
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={createCategory.isPending}
                >
                  {createCategory.isPending ? "Creando..." : "Crear Categoría"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
