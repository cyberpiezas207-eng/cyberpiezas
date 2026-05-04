import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { routeProductScannerCode } from "@/lib/barcodeRouting";
import { BARCODE_SCANNED_EVENT } from "@/lib/posHardware";
import { trpc } from "@/lib/trpc";
import { Edit2, ImagePlus, PackagePlus, Search, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type ProductFormState = {
  name: string;
  categoryId: string;
  brand: string;
  basePrice: string;
  sku: string;
  description: string;
  branchIds: number[];
};

type PendingImage = {
  fileName: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  categoryId: "",
  brand: "",
  basePrice: "",
  sku: "",
  description: "",
  branchIds: [],
};

const PRODUCTS_PAGE_SIZE = 8;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function ProductsManagement() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(EMPTY_FORM);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const products = trpc.products.list.useQuery();
  const categories = trpc.categories.list.useQuery();
  const branchesQuery = trpc.branches.list.useQuery();
  const productImages = trpc.products.images.useQuery(
    { productId: selectedProduct?.id ?? 0 },
    { enabled: Boolean(selectedProduct) },
  );

  const createProduct = trpc.products.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Producto creado exitosamente");
      setFormData(EMPTY_FORM);
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear el producto");
    },
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Producto actualizado correctamente");
      setFormData(EMPTY_FORM);
      setEditingProductId(null);
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo actualizar el producto");
    },
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Producto eliminado del catálogo activo");
      if (isEditDialogOpen) {
        setIsEditDialogOpen(false);
        resetForm();
      }
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo eliminar el producto");
    },
  });

  const addImage = trpc.products.addImage.useMutation();
  const removeImage = trpc.products.removeImage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        productImages.refetch(),
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Imagen eliminada");
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo eliminar la imagen");
    },
  });

  const setPrimaryImage = trpc.products.setPrimaryImage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        productImages.refetch(),
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Foto principal actualizada");
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo actualizar la foto principal");
    },
  });

  const filteredProducts = useMemo(() => {
    const list = products.data ?? [];
    return list.filter((product) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term)
      );
      const matchesCategory = selectedCategoryId === "all" || product.categoryId === Number(selectedCategoryId);
      return matchesSearch && matchesCategory;
    });
  }, [products.data, searchQuery, selectedCategoryId]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PAGE_SIZE;
    return filteredProducts.slice(start, start + PRODUCTS_PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryId]);

  useEffect(() => {
    if (currentPage > totalProductPages) {
      setCurrentPage(totalProductPages);
    }
  }, [currentPage, totalProductPages]);

  useEffect(() => {
    const handleBarcodeScanned = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: string }>;
      const routed = routeProductScannerCode({
        scannedCode: customEvent.detail?.code ?? "",
        isCreateDialogOpen: isCreateDialogOpen || isEditDialogOpen,
      });
      if (!routed) return;

      if (routed.mode === "form") {
        setFormData((current) => ({ ...current, sku: routed.nextSku }));
        toast.success(`SKU capturado desde lector: ${routed.nextSku}`);
        return;
      }

      setSearchQuery(routed.nextSearchQuery);
      toast.success(`Búsqueda de producto activada por lector: ${routed.nextSearchQuery}`);
    };

    window.addEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
    return () => window.removeEventListener(BARCODE_SCANNED_EVENT, handleBarcodeScanned as EventListener);
  }, [isCreateDialogOpen, isEditDialogOpen]);

  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
      branchIds: (branchesQuery.data ?? []).map((branch) => branch.id),
    });
    setEditingProductId(null);
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name || !formData.categoryId || !formData.brand || !formData.basePrice || !formData.sku) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    await createProduct.mutateAsync({
      ...formData,
      categoryId: Number(formData.categoryId),
      branchIds: formData.branchIds,
    });
  };

  const handleUpdateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingProductId) {
      toast.error("No se encontró el producto a editar");
      return;
    }

    if (!formData.name || !formData.categoryId || !formData.brand || !formData.basePrice) {
      toast.error("Completa los datos principales del producto");
      return;
    }

    await updateProduct.mutateAsync({
      id: editingProductId,
      name: formData.name,
      categoryId: Number(formData.categoryId),
      brand: formData.brand,
      basePrice: formData.basePrice,
      description: formData.description,
      branchIds: formData.branchIds,
    });
  };

  const openEditDialog = (product: {
    id: number;
    name: string;
    categoryId: number;
    brand: string;
    basePrice: string;
    sku: string;
    description?: string | null;
    assignedBranchIds?: number[];
  }) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      categoryId: String(product.categoryId),
      brand: product.brand,
      basePrice: product.basePrice,
      sku: product.sku,
      description: product.description ?? "",
      branchIds: product.assignedBranchIds ?? [],
    });
    setIsEditDialogOpen(true);
  };

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    try {
      const parsedFiles = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          base64: await fileToBase64(file),
          previewUrl: URL.createObjectURL(file),
        })),
      );

      setPendingImages((current) => [...current, ...parsedFiles]);
      event.target.value = "";
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron preparar las imágenes seleccionadas");
    }
  };

  const clearPendingImages = () => {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
  };

  const openGallery = (product: { id: number; name: string }) => {
    clearPendingImages();
    setSelectedProduct(product);
    setIsGalleryDialogOpen(true);
  };

  const handleUploadImages = async () => {
    if (!selectedProduct || pendingImages.length === 0) {
      toast.error("Selecciona al menos una imagen para subir");
      return;
    }

    setIsUploadingImages(true);
    try {
      for (let index = 0; index < pendingImages.length; index += 1) {
        const image = pendingImages[index];
        await addImage.mutateAsync({
          productId: selectedProduct.id,
          fileBase64: image.base64,
          fileName: image.fileName,
          mimeType: image.mimeType,
          altText: `${selectedProduct.name} ${index + 1}`,
          isPrimary: index === 0 && (productImages.data?.length ?? 0) === 0,
        });
      }

      await Promise.all([
        productImages.refetch(),
        utils.products.list.invalidate(),
        utils.products.search.invalidate(),
      ]);
      toast.success("Imágenes cargadas correctamente");
      clearPendingImages();
    } catch (error: any) {
      toast.error(error.message || "No se pudieron subir las imágenes");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleOpenInventory = (productId: number) => {
    window.location.href = `/variants?productId=${productId}`;
  };

  const handleDeleteProduct = async (product: { id: number; name: string }) => {
    const confirmed = window.confirm(
      `¿Deseas retirar "${product.name}" del catálogo activo? El historial de ventas se conservará.`
    );

    if (!confirmed) return;

    await deleteProduct.mutateAsync({ id: product.id });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-primary">Gestión de Productos</h1>
            <p className="text-muted-foreground">
              Administra el catálogo, corrige datos rápidamente y mantén visible la galería principal de cada producto.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Edit2 className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <p className="text-sm text-primary font-semibold">📦 Productos activos</p>
              <p className="mt-3 text-4xl font-bold text-primary">{products.data?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <p className="text-sm text-green-600 font-semibold">✓ Con imagen principal</p>
              <p className="mt-3 text-4xl font-bold text-green-500">
                {(products.data ?? []).filter((product) => Boolean(product.primaryImageUrl)).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-600 font-semibold">⚠ Pendientes de foto</p>
              <p className="mt-3 text-4xl font-bold text-yellow-500">
                {(products.data ?? []).filter((product) => !product.primaryImageUrl).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 shadow-md">
          <CardContent className="space-y-5 pt-6">
            <div className="relative group">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-primary/60 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="🔍 Buscar por nombre, SKU o marca..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-12 h-11 bg-secondary/40 border-primary/20 focus:border-primary/60 text-base font-medium"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Tip: También puedes usar el lector para buscar por SKU sin escribir.
              </p>
            </div>
            <div>
              <Label htmlFor="category-filter" className="text-sm font-semibold text-foreground">Filtrar por categoría</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger id="category-filter" className="mt-3 h-11 bg-secondary/40 border-primary/20 focus:border-primary/60 font-medium">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">✓ Todas las categorías</SelectItem>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Catálogo</CardTitle>
            <CardDescription>
              {filteredProducts.length} productos disponibles para administración. Página {currentPage} de {totalProductPages}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Cargando productos...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No hay productos registrados todavía.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="grid gap-4 rounded-2xl border border-border/80 bg-background/80 p-4 transition-colors hover:border-primary/30 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
                        {product.primaryImageUrl ? (
                          <img
                            src={product.primaryImageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 items-center justify-center px-3 text-center text-xs text-muted-foreground">
                            Sin imagen principal
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                          <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {product.sku}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description?.trim() || "Agrega una descripción breve para recordar materiales, estilo o detalles de venta."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-accent">${Number(product.basePrice).toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            {product.primaryImageUrl ? "Foto principal lista" : "Necesita foto principal"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sucursales: {product.assignedBranches?.length ? product.assignedBranches.map((branch) => branch.name).join(", ") : "Sin asignar"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 md:min-w-[190px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Editar producto
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => openGallery({ id: product.id, name: product.name })}
                        >
                          <ImagePlus className="h-4 w-4" />
                          Fotos e imagen principal
                        </Button>
                        <Button
                          size="sm"
                          className="justify-start gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                          onClick={() => handleOpenInventory(product.id)}
                        >
                          <PackagePlus className="h-4 w-4" />
                          Agregar inventario
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={deleteProduct.isPending}
                          onClick={() => handleDeleteProduct({ id: product.id, name: product.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Borrar producto
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalProductPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage((page) => Math.max(1, page - 1));
                          }}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalProductPages }, (_, index) => index + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={page === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage((page) => Math.min(totalProductPages, page + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">Crear nuevo producto</DialogTitle>
              <DialogDescription>
                Registra la ficha base del producto. Después podrás cargar varias fotos en su galería.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateProduct} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nombre del producto *</Label>
                  <Input
                    id="name"
                    className="mt-2"
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ej. Vestido de noche satinado"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData((current) => ({ ...current, categoryId: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.data?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    className="mt-2"
                    value={formData.brand}
                    onChange={(event) => setFormData((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Marca o diseñador"
                  />
                </div>

                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    className="mt-2"
                    value={formData.sku}
                    onChange={(event) => setFormData((current) => ({ ...current, sku: event.target.value }))}
                    placeholder="BTQ-001"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Si el lector funciona como teclado, al escanear con este formulario abierto se llenará automáticamente el SKU.
                  </p>
                </div>

                <div>
                  <Label htmlFor="price">Precio base *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    className="mt-2"
                    value={formData.basePrice}
                    onChange={(event) => setFormData((current) => ({ ...current, basePrice: event.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    className="mt-2"
                    value={formData.description}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Detalles, materiales y estilo del producto"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Sucursales donde estará disponible</Label>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(branchesQuery.data ?? []).map((branch) => {
                      const checked = formData.branchIds.includes(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={checked}
                            onChange={(event) => {
                              setFormData((current) => ({
                                ...current,
                                branchIds: event.target.checked
                                  ? [...current.branchIds, branch.id]
                                  : current.branchIds.filter((branchId) => branchId !== branch.id),
                              }));
                            }}
                          />
                          <span>
                            <span className="block font-medium text-foreground">{branch.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {branch.code}{branch.city ? ` · ${branch.city}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Así decides en qué sucursales debe aparecer y operar este producto desde el inicio.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? "Guardando..." : "Crear producto"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">Editar producto</DialogTitle>
              <DialogDescription>
                Corrige los datos principales del producto sin perder su galería ni su historial operativo.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="edit-name">Nombre del producto *</Label>
                  <Input
                    id="edit-name"
                    className="mt-2"
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ej. Blusa satinada cuello halter"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData((current) => ({ ...current, categoryId: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.data?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-brand">Marca *</Label>
                  <Input
                    id="edit-brand"
                    className="mt-2"
                    value={formData.brand}
                    onChange={(event) => setFormData((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Marca o diseñador"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input id="edit-sku" className="mt-2" value={formData.sku} disabled />
                  <p className="mt-2 text-xs text-muted-foreground">
                    El SKU se mantiene como referencia operativa y no se modifica desde esta edición rápida.
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-price">Precio base *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    className="mt-2"
                    value={formData.basePrice}
                    onChange={(event) => setFormData((current) => ({ ...current, basePrice: event.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea
                    id="edit-description"
                    className="mt-2"
                    value={formData.description}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Detalles, materiales y estilo del producto"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Sucursales asignadas</Label>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(branchesQuery.data ?? []).map((branch) => {
                      const checked = formData.branchIds.includes(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={checked}
                            onChange={(event) => {
                              setFormData((current) => ({
                                ...current,
                                branchIds: event.target.checked
                                  ? [...current.branchIds, branch.id]
                                  : current.branchIds.filter((branchId) => branchId !== branch.id),
                              }));
                            }}
                          />
                          <span>
                            <span className="block font-medium text-foreground">{branch.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {branch.code}{branch.city ? ` · ${branch.city}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Solo se guardarán sucursales de tu negocio. Esto te ayuda a separar catálogo y operación por ubicación.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={updateProduct.isPending}
                >
                  {updateProduct.isPending ? "Guardando cambios..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isGalleryDialogOpen}
          onOpenChange={(open) => {
            setIsGalleryDialogOpen(open);
            if (!open) {
              clearPendingImages();
              setSelectedProduct(null);
            }
          }}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle className="text-primary">
                Galería de producto {selectedProduct ? `· ${selectedProduct.name}` : ""}
              </DialogTitle>
              <DialogDescription>
                Carga varias fotos, define una portada principal y elimina imágenes obsoletas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="border-dashed border-border">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                      <Label htmlFor="product-images">Agregar nuevas fotos</Label>
                      <Input id="product-images" type="file" accept="image/*" multiple onChange={handleSelectFiles} />
                      <p className="text-sm text-muted-foreground">
                        Puedes seleccionar varias imágenes. La primera foto de un producto nuevo se marcará como principal.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={clearPendingImages} disabled={pendingImages.length === 0}>
                        Limpiar selección
                      </Button>
                      <Button type="button" className="gap-2" onClick={handleUploadImages} disabled={pendingImages.length === 0 || isUploadingImages}>
                        <Upload className="h-4 w-4" />
                        {isUploadingImages ? "Subiendo..." : "Subir imágenes"}
                      </Button>
                    </div>
                  </div>

                  {pendingImages.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                      {pendingImages.map((image) => (
                        <div key={`${image.fileName}-${image.previewUrl}`} className="overflow-hidden rounded-xl border border-border bg-background">
                          <img src={image.previewUrl} alt={image.fileName} loading="lazy" className="h-40 w-full object-cover" />
                          <div className="p-3 text-sm text-muted-foreground">{image.fileName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Fotos guardadas</h3>
                {productImages.isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Cargando galería...</div>
                ) : (productImages.data?.length ?? 0) === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    Este producto todavía no tiene fotos cargadas.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {productImages.data?.map((image) => (
                      <Card key={image.id} className="overflow-hidden">
                        <div className="aspect-[4/5] bg-secondary">
                          <img src={image.imageUrl} alt={image.altText ?? selectedProduct?.name ?? "Producto"} loading="lazy" className="h-full w-full object-cover" />
                        </div>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Orden #{image.sortOrder + 1}</p>
                              <p className="text-xs text-muted-foreground">
                                {image.isPrimary ? "Foto principal" : "Foto secundaria"}
                              </p>
                            </div>
                            {image.isPrimary && (
                              <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                                Portada
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={image.isPrimary || setPrimaryImage.isPending}
                              onClick={() => setPrimaryImage.mutate({ productId: image.productId, imageId: image.id })}
                            >
                              <Star className="h-4 w-4" />
                              Principal
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2 text-destructive"
                              disabled={removeImage.isPending}
                              onClick={() => removeImage.mutate({ productId: image.productId, imageId: image.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
