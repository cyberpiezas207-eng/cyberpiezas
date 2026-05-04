import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, X, Plus, Minus } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  colors?: string[];
  sizes?: string[];
  description?: string;
}

// Datos simulados
const mockStoreData: Record<string, any> = {
  "boutique-demo": {
    name: "Boutique Demo",
    logo: "👗",
    description: "Tu tienda de moda en línea",
    products: [
      {
        id: "1",
        name: "Blusa Casual",
        price: 299,
        image: "👕",
        colors: ["Negro", "Blanco", "Azul"],
        sizes: ["XS", "S", "M", "L", "XL"],
        description: "Blusa cómoda para el día a día",
      },
      {
        id: "2",
        name: "Pantalón Denim",
        price: 499,
        image: "👖",
        colors: ["Azul Claro", "Azul Oscuro", "Negro"],
        sizes: ["28", "30", "32", "34", "36"],
        description: "Pantalón denim clásico",
      },
      {
        id: "3",
        name: "Vestido Elegante",
        price: 799,
        image: "👗",
        colors: ["Negro", "Rojo", "Azul"],
        sizes: ["XS", "S", "M", "L"],
        description: "Vestido perfecto para ocasiones especiales",
      },
      {
        id: "4",
        name: "Chamarra de Cuero",
        price: 1299,
        image: "🧥",
        colors: ["Negro", "Marrón"],
        sizes: ["S", "M", "L", "XL"],
        description: "Chamarra de cuero genuino",
      },
    ],
  },
};

export default function PublicStore() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const storeSlug = slug || "boutique-demo";
  const store = mockStoreData[storeSlug];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Tienda no encontrada</h1>
          <p className="text-slate-300">La tienda que buscas no existe o ha sido desactivada.</p>
        </div>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    if (!selectedSize || !selectedColor) {
      alert("Por favor selecciona talla y color");
      return;
    }

    const cartItem: CartItem = {
      id: `${product.id}-${selectedSize}-${selectedColor}`,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: selectedSize,
      color: selectedColor,
      image: product.image,
    };

    const existingItem = cart.find((item) => item.id === cartItem.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === cartItem.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, cartItem]);
    }

    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    alert("Producto agregado al carrito");
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{store.logo}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{store.name}</h1>
              <p className="text-sm text-slate-400">{store.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-3 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-white" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-purple-500">
                {cart.length}
              </Badge>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">Nuestro Catálogo</h2>
          <p className="text-slate-300">Explora nuestros productos y haz tu pedido</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {store.products.map((product: Product) => (
            <Card
              key={product.id}
              className="bg-slate-800/50 border-slate-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-6xl">
                {product.image}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-purple-400">${product.price}</span>
                  <Button className="bg-purple-500 hover:bg-purple-600">
                    Ver
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-2xl w-full">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-3xl font-bold text-white">{selectedProduct.name}</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-8xl rounded-lg">
                  {selectedProduct.image}
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-slate-300 mb-2">{selectedProduct.description}</p>
                    <div className="text-4xl font-bold text-purple-400 mb-4">
                      ${selectedProduct.price}
                    </div>
                  </div>

                  {/* Color Selection */}
                  {selectedProduct.colors && (
                    <div>
                      <label className="block text-white font-semibold mb-3">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProduct.colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                              selectedColor === color
                                ? "bg-purple-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size Selection */}
                  {selectedProduct.sizes && (
                    <div>
                      <label className="block text-white font-semibold mb-3">Talla</label>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProduct.sizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                              selectedSize === size
                                ? "bg-purple-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => addToCart(selectedProduct)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 text-lg"
                  >
                    Agregar al Carrito
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Carrito</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Tu carrito está vacío</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="bg-slate-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-white font-semibold">{item.name}</h3>
                            <p className="text-sm text-slate-400">
                              {item.color} - Talla {item.size}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-semibold">${item.price}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-slate-600 rounded"
                            >
                              <Minus className="w-4 h-4 text-slate-300" />
                            </button>
                            <span className="text-white w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-600 rounded"
                            >
                              <Plus className="w-4 h-4 text-slate-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-700 pt-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-300">Subtotal:</span>
                      <span className="text-white font-semibold">${cartTotal}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setShowCart(false);
                      setLocation(`/tienda/${storeSlug}/checkout?items=${cart.length}`);
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3"
                  >
                    Proceder al Pedido
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
