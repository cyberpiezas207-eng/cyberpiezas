import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2, Edit2, Search, Download, Upload } from "lucide-react";
import { toast } from "sonner";

interface ProductForm {
  name: string;
  sku: string;
  basePrice: string;
  categoryId: string;
  description: string;
}

export default function AbarrotesProductsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    sku: "",
    basePrice: "",
    categoryId: "",
    description: "",
  });

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery(undefined);
  
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      refetch();
      resetForm();
      setShowDialog(false);
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      refetch();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      basePrice: "",
      categoryId: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku || !formData.basePrice || !formData.categoryId) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    await createProduct.mutateAsync({
      name: formData.name,
      sku: formData.sku,
      basePrice: formData.basePrice,
      categoryId: parseInt(formData.categoryId),
      brand: "Abarrotes",
      description: formData.description,
    });
  };

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const categories = [
    { id: "1", name: "Granos y Cereales" },
    { id: "2", name: "Bebidas" },
    { id: "3", name: "Lácteos" },
    { id: "4", name: "Frutas y Verduras" },
    { id: "5", name: "Carnes y Embutidos" },
    { id: "6", name: "Panadería" },
    { id: "7", name: "Snacks" },
    { id: "8", name: "Productos de Limpieza" },
    { id: "9", name: "Artículos de Higiene" },
    { id: "10", name: "Otros" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/20 p-2 text-accent">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Gestión de Productos - Abarrotes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Administra el catálogo de productos de tu tienda de abarrotes
                </p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Búsqueda */}
        <Card className="mb-6 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Productos */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle>Productos ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando productos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos. ¡Crea uno para comenzar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">SKU</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Categoría</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Precio</th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border/50 hover:bg-accent/5 transition-all">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">{product.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{product.sku}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {categories.find((c) => c.id === product.categoryId.toString())?.name || "Otros"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-accent">
                            ${typeof product.basePrice === 'string' ? parseFloat(product.basePrice).toFixed(2) : (product.basePrice as number).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-primary"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteProduct.mutateAsync({ id: product.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Nuevo Producto */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Producto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Producto *</Label>
                <Input
                  placeholder="Ej: Arroz 1kg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  placeholder="Ej: ARR-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Precio Base *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  placeholder="Descripción del producto"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createProduct.isPending}>
                {createProduct.isPending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
