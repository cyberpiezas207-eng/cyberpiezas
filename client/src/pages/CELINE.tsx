'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, Zap, Cpu, BarChart3 } from "lucide-react";
import { useState } from "react";

interface PCItem {
  id: string;
  category: string;
  description: string;
  specifications: string;
  askingPrice: number;
  sellerName: string;
  sellerPhone: string;
  images: File[];
  wantTradein: boolean;
}

const CATEGORIES = [
  { value: "cpu", label: "Procesadores (Intel/AMD)" },
  { value: "gpu", label: "Tarjetas Gráficas" },
  { value: "ram", label: "Memoria RAM" },
  { value: "storage", label: "Discos Duros/SSD" },
  { value: "psu", label: "Fuentes de Poder" },
  { value: "monitor", label: "Monitores" },
  { value: "peripherals", label: "Teclados/Ratones" },
  { value: "laptop", label: "Laptops" },
  { value: "desktop", label: "Computadoras de Escritorio" },
  { value: "other", label: "Otros Periféricos" },
];

const PRICE_RANGES: Record<string, { min: number; max: number; label: string }> = {
  cpu: { min: 500, max: 8000, label: "Procesadores" },
  gpu: { min: 1000, max: 15000, label: "Tarjetas Gráficas" },
  ram: { min: 200, max: 3000, label: "Memoria RAM" },
  storage: { min: 300, max: 5000, label: "Almacenamiento" },
  psu: { min: 400, max: 3000, label: "Fuentes" },
  monitor: { min: 800, max: 8000, label: "Monitores" },
  peripherals: { min: 100, max: 2000, label: "Periféricos" },
  laptop: { min: 3000, max: 30000, label: "Laptops" },
  desktop: { min: 5000, max: 40000, label: "Computadoras" },
  other: { min: 100, max: 5000, label: "Otros" },
};

export default function CELINE() {
  const [formData, setFormData] = useState<PCItem>({
    id: "",
    category: "cpu",
    description: "",
    specifications: "",
    askingPrice: 0,
    sellerName: "",
    sellerPhone: "",
    images: [],
    wantTradein: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const selectedCategory = CATEGORIES.find((c) => c.value === formData.category);
  const priceRange = PRICE_RANGES[formData.category];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({ ...formData, images: [...formData.images, ...files] });

    // Crear previsualizaciones
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImages((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.sellerName.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }
    if (!formData.sellerPhone.trim()) {
      alert("Por favor ingresa tu teléfono");
      return;
    }
    if (!formData.description.trim()) {
      alert("Por favor describe el artículo");
      return;
    }
    if (!formData.specifications.trim()) {
      alert("Por favor ingresa las características");
      return;
    }
    if (formData.askingPrice <= 0) {
      alert("Por favor ingresa un precio válido");
      return;
    }
    if (formData.images.length === 0) {
      alert("Por favor sube al menos una foto");
      return;
    }

    // Mostrar confirmación
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        id: "",
        category: "cpu",
        description: "",
        specifications: "",
        askingPrice: 0,
        sellerName: "",
        sellerPhone: "",
        images: [],
        wantTradein: false,
      });
      setUploadedImages([]);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">CELINE</h1>
          </div>
          <p className="text-gray-600 text-lg">Compra de Artículos de PC</p>
          <p className="text-gray-500 mt-2">
            Vende tus artículos de informática. Evaluamos tu equipo y te ofrecemos el mejor precio.
          </p>
        </div>

        {/* Mensaje de éxito */}
        {submitted && (
          <Card className="p-6 mb-8 bg-green-50 border-2 border-green-300">
            <p className="text-green-700 font-semibold text-lg">
              ✅ ¡Solicitud enviada exitosamente! Nos pondremos en contacto pronto.
            </p>
          </Card>
        )}

        {/* Formulario */}
        <Card className="p-8 border-2 border-blue-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información del Vendedor */}
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                Información del Vendedor
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block mb-2 font-semibold">Nombre Completo *</Label>
                  <Input
                    type="text"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    placeholder="Tu nombre"
                    className="border-2 border-blue-300"
                  />
                </div>
                <div>
                  <Label className="block mb-2 font-semibold">Teléfono *</Label>
                  <Input
                    type="tel"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                    placeholder="+52 7XX XXXX XXXX"
                    className="border-2 border-blue-300"
                  />
                </div>
              </div>
            </div>

            {/* Información del Artículo */}
            <div className="bg-cyan-50 p-6 rounded-lg border-2 border-cyan-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-cyan-600" />
                Información del Artículo
              </h2>

              <div className="space-y-6">
                {/* Categoría */}
                <div>
                  <Label className="block mb-2 font-semibold">Categoría *</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 border-2 border-cyan-300 rounded-lg focus:outline-none focus:border-cyan-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {priceRange && (
                    <p className="text-sm text-gray-600 mt-2">
                      Rango típico: ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <Label className="block mb-2 font-semibold">Descripción del Artículo *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el estado, marca, modelo, etc."
                    className="border-2 border-cyan-300 min-h-24"
                  />
                </div>

                {/* Especificaciones */}
                <div>
                  <Label className="block mb-2 font-semibold">Características Técnicas *</Label>
                  <Textarea
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    placeholder="Especificaciones detalladas (RAM, procesador, capacidad, etc.)"
                    className="border-2 border-cyan-300 min-h-24"
                  />
                </div>

                {/* Precio */}
                <div>
                  <Label className="block mb-2 font-semibold">Precio Solicitado ($MXN) *</Label>
                  <Input
                    type="number"
                    value={formData.askingPrice || ""}
                    onChange={(e) => setFormData({ ...formData, askingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="100"
                    className="border-2 border-cyan-300"
                  />
                </div>

                {/* Trade-in */}
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-cyan-200">
                  <input
                    type="checkbox"
                    id="tradein"
                    checked={formData.wantTradein}
                    onChange={(e) => setFormData({ ...formData, wantTradein: e.target.checked })}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="tradein" className="cursor-pointer flex-1">
                    <p className="font-semibold text-gray-900">Tomamos a cuenta tus cosas</p>
                    <p className="text-sm text-gray-600">
                      Si lo prefieres, podemos acreditar el valor de tu artículo para que compres en Cyberpiezas
                    </p>
                  </label>
                </div>
              </div>
            </div>

            {/* Fotos */}
            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-600" />
                Fotos del Artículo
              </h2>

              <div className="space-y-4">
                {/* Área de carga */}
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:bg-purple-100 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Sube tus fotos aquí</p>
                    <p className="text-sm text-gray-600">Mínimo 1 foto, máximo 5</p>
                  </label>
                </div>

                {/* Previsualizaciones */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-purple-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  {uploadedImages.length}/5 fotos cargadas
                </p>
              </div>
            </div>

            {/* Botón enviar */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Enviar Solicitud de Compra
            </Button>

            {/* Nota importante */}
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
              <p className="text-sm text-gray-700">
                <strong>Nota:</strong> Nos pondremos en contacto en las próximas 24 horas para evaluar tu artículo y ofrecerte el mejor precio.
              </p>
            </div>
          </form>
        </Card>

        {/* Información adicional */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300">
          <h3 className="text-xl font-bold mb-4 text-gray-900">¿Por qué vender con CELINE?</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Evaluación justa y rápida de tus artículos</li>
            <li>✓ Mejores precios del mercado</li>
            <li>✓ Opción de trade-in para compras en Cyberpiezas</li>
            <li>✓ Proceso simple y transparente</li>
            <li>✓ Pago inmediato al acordar el precio</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
