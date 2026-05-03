import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Search, Filter, Mail, ArrowLeft, X } from "lucide-react";

interface Camera {
  id: string;
  name: string;
  brand: string;
  resolution: string;
  channels: number;
  price: number;
  image: string;
  specs: {
    megapixels: string;
    lens: string;
    type: string;
    resolution: string;
  };
}

const cameras: Camera[] = [
  {
    id: "cam-001",
    name: "Cámara DVR 4 Canales 720p",
    brand: "Dahua",
    resolution: "720p",
    channels: 4,
    price: 1200,
    image: "📹",
    specs: {
      megapixels: "1MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "1280x720",
    },
  },
  {
    id: "cam-002",
    name: "Cámara DVR 4 Canales 1080p",
    brand: "Dahua",
    resolution: "1080p",
    channels: 4,
    price: 1800,
    image: "📹",
    specs: {
      megapixels: "2MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "1920x1080",
    },
  },
  {
    id: "cam-003",
    name: "Cámara DVR 4 Canales 4K",
    brand: "Dahua",
    resolution: "4K",
    channels: 4,
    price: 2500,
    image: "📹",
    specs: {
      megapixels: "8MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "3840x2160",
    },
  },
  {
    id: "cam-004",
    name: "Cámara DVR 8 Canales 1080p",
    brand: "Dahua",
    resolution: "1080p",
    channels: 8,
    price: 2800,
    image: "📹",
    specs: {
      megapixels: "2MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "1920x1080",
    },
  },
  {
    id: "cam-005",
    name: "Cámara DVR 8 Canales 4K",
    brand: "Dahua",
    resolution: "4K",
    channels: 8,
    price: 3800,
    image: "📹",
    specs: {
      megapixels: "8MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "3840x2160",
    },
  },
  {
    id: "cam-006",
    name: "Cámara DVR 16 Canales 1080p",
    brand: "Dahua",
    resolution: "1080p",
    channels: 16,
    price: 4500,
    image: "📹",
    specs: {
      megapixels: "2MP",
      lens: "3.6mm",
      type: "Bullet",
      resolution: "1920x1080",
    },
  },
];

interface CartItem {
  camera: Camera;
  quantity: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CamerasStore() {
  const [search, setSearch] = useState("");
  const [selectedResolution, setSelectedResolution] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [quotationData, setQuotationData] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
  });

  const filteredCameras = useMemo(() => {
    return cameras.filter((camera) => {
      const matchesSearch =
        camera.name.toLowerCase().includes(search.toLowerCase()) ||
        camera.brand.toLowerCase().includes(search.toLowerCase());
      const matchesResolution = !selectedResolution || camera.resolution === selectedResolution;
      const matchesBrand = !selectedBrand || camera.brand === selectedBrand;
      return matchesSearch && matchesResolution && matchesBrand;
    });
  }, [search, selectedResolution, selectedBrand]);

  const addToCart = (camera: Camera) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.camera.id === camera.id);
      if (existing) {
        return prev.map((item) =>
          item.camera.id === camera.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { camera, quantity: 1 }];
    });
  };

  const removeFromCart = (cameraId: string) => {
    setCart((prev) => prev.filter((item) => item.camera.id !== cameraId));
  };

  const updateQuantity = (cameraId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cameraId);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.camera.id === cameraId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.camera.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuotationSubmit = () => {
    if (!quotationData.company || !quotationData.email) {
      alert("Por favor completa los campos requeridos");
      return;
    }

    const cartItems = cart
      .map((item) => `${item.quantity}x ${item.camera.name}`)
      .join("\n");

    alert(
      `Cotización enviada a ${quotationData.email}\n\nEmpresa: ${quotationData.company}\nProductos:\n${cartItems}\nTotal: ${formatCurrency(cartTotal)}`
    );

    setQuotationData({ company: "", contact: "", email: "", phone: "" });
    setShowQuotationDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/cyberpiezas">
              <Button variant="ghost" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-2xl font-bold">{cartCount}</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Cámaras de Vigilancia</h1>
          <p className="text-purple-100">Catálogo B2B/B2C - Compra directa o solicita cotización empresarial</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar - Filtros */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Búsqueda */}
                <div>
                  <Label className="mb-2 block">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nombre o marca..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Resolución */}
                <div>
                  <Label className="mb-2 block">Resolución</Label>
                  <div className="space-y-2">
                    {["720p", "1080p", "4K"].map((res) => (
                      <label key={res} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value={res}
                          checked={selectedResolution === res}
                          onChange={(e) => setSelectedResolution(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{res}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="resolution"
                        value=""
                        checked={selectedResolution === ""}
                        onChange={(e) => setSelectedResolution(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Todas</span>
                    </label>
                  </div>
                </div>

                {/* Marca */}
                <div>
                  <Label className="mb-2 block">Marca</Label>
                  <div className="space-y-2">
                    {["Dahua"].map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="brand"
                          value={brand}
                          checked={selectedBrand === brand}
                          onChange={(e) => setSelectedBrand(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="brand"
                        value=""
                        checked={selectedBrand === ""}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Todas</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Productos */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {filteredCameras.map((camera) => (
                <Card
                  key={camera.id}
                  className="overflow-hidden hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedCamera(camera)}
                >
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 text-center">
                    <div className="text-6xl mb-2">{camera.image}</div>
                    <h3 className="font-semibold text-foreground">{camera.name}</h3>
                  </div>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Resolución</p>
                        <p className="font-semibold">{camera.resolution}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Canales</p>
                        <p className="font-semibold">{camera.channels}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-2xl font-bold text-purple-600 mb-3">
                        {formatCurrency(camera.price)}
                      </p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(camera);
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Agregar al carrito
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCameras.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 text-lg">No se encontraron productos con los filtros seleccionados</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Carrito flotante */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{cartCount} producto(s) en carrito</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(cartTotal)}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowQuotationDialog(true)}
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Solicitar Cotización
                  </Button>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Proceder a Compra
                  </Button>
                </div>
              </div>

              {/* Resumen del carrito */}
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.camera.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>
                      {item.quantity}x {item.camera.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatCurrency(item.camera.price * item.quantity)}</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.camera.id, parseInt(e.target.value))}
                        className="w-12 px-2 py-1 border rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => removeFromCart(item.camera.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Ficha de Producto */}
      {selectedCamera && (
        <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCamera.name}</DialogTitle>
              <DialogDescription>{selectedCamera.brand}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-lg text-center">
                <div className="text-8xl mb-4">{selectedCamera.image}</div>
                <p className="text-gray-600">Cámara DVR</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-600 mb-2">Especificaciones</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Megapíxeles:</span>
                      <span className="font-semibold">{selectedCamera.specs.megapixels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lente:</span>
                      <span className="font-semibold">{selectedCamera.specs.lens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-semibold">{selectedCamera.specs.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resolución:</span>
                      <span className="font-semibold">{selectedCamera.specs.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Canales:</span>
                      <span className="font-semibold">{selectedCamera.channels}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-3xl font-bold text-purple-600 mb-4">
                    {formatCurrency(selectedCamera.price)}
                  </p>
                  <Button
                    onClick={() => {
                      addToCart(selectedCamera);
                      setSelectedCamera(null);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Agregar al carrito
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal - Cotización Empresarial */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Cotización Empresarial</DialogTitle>
            <DialogDescription>
              Completa tus datos para recibir una cotización personalizada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="company">Nombre de la Empresa *</Label>
              <Input
                id="company"
                placeholder="Tu empresa"
                value={quotationData.company}
                onChange={(e) =>
                  setQuotationData({ ...quotationData, company: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="contact">Persona de Contacto</Label>
              <Input
                id="contact"
                placeholder="Nombre completo"
                value={quotationData.contact}
                onChange={(e) =>
                  setQuotationData({ ...quotationData, contact: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@empresa.com"
                value={quotationData.email}
                onChange={(e) =>
                  setQuotationData({ ...quotationData, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="+52 1234567890"
                value={quotationData.phone}
                onChange={(e) =>
                  setQuotationData({ ...quotationData, phone: e.target.value })
                }
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Resumen de Cotización</h4>
              <div className="space-y-1 text-sm mb-3">
                {cart.map((item) => (
                  <div key={item.camera.id} className="flex justify-between">
                    <span>{item.quantity}x {item.camera.name}</span>
                    <span>{formatCurrency(item.camera.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-purple-600">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowQuotationDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleQuotationSubmit}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar Cotización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CamerasStore;
