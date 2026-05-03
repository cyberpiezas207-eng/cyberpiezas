'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ShoppingCart, X, Info, Camera } from "lucide-react";
import { jsPDF } from "jspdf";
import { useState } from "react";

interface DVRModel {
  id: string;
  name: string;
  brand: string;
  channels: number;
  resolution: string;
  price: number;
  features: string[];
  imageUrl: string;
  specs: {
    megapixels: string;
    lens: string;
    type: string;
    other?: string;
  };
}

interface QuotationItem {
  modelId: string;
  modelName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

const CAMARAS_CYBERPIEZAS: DVRModel[] = [
  {
    id: "cyber-hfw1200t",
    name: "DAHUA HFW1200T-A - CAMARA BULLET HDCVI 1080P",
    brand: "Dahua",
    channels: 1,
    resolution: "1080p",
    price: 368,
    features: ["1080P", "HDCVI", "Micrófono integrado", "103 grados"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1200T",
    specs: {
      megapixels: "2 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "HDCVI",
    },
  },
  {
    id: "cyber-hfw1500cn",
    name: "DAHUA HAC-HFW1500CN-A - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 496,
    features: ["5 Megapixeles", "Micrófono integrado", "Lente 2.8mm"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1500CN",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "IR 30m",
    },
  },
  {
    id: "cyber-hfw1509t-led",
    name: "DAHUA HFW1509T-A-LED - CÁMARA BULLET FULL COLOR 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 668,
    features: ["5 Megapixeles", "Full Color", "Lente 3.6mm", "LED"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1509T",
    specs: {
      megapixels: "5 MP",
      lens: "3.6mm",
      type: "Bullet",
      other: "Full Color LED",
    },
  },
  {
    id: "cyber-hfw1500tl",
    name: "DAHUA HAC-HFW1500TL-28 - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 554,
    features: ["5 Megapixeles", "Micrófono integrado", "Lente 2.8mm"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1500TL",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "IR 30m",
    },
  },
  {
    id: "cyber-hfw1801t-a",
    name: "DAHUA HFW1801T-A - CAMARA BULLET 4K",
    brand: "Dahua",
    channels: 1,
    resolution: "4K",
    price: 761,
    features: ["8 Megapixeles", "4K", "Micrófono integrado", "Lente 2.8mm"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1801T",
    specs: {
      megapixels: "8 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "4K Resolution",
    },
  },
  {
    id: "cyber-b2a51-28",
    name: "DAHUA HAC-B2A51-28 - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 404,
    features: ["5 Megapixeles", "Lente 2.8mm", "IR 20m"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+B2A51",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "IR 20m",
    },
  },
  {
    id: "cyber-b1a21n-il",
    name: "DAHUA HAC-B1A21N-U-IL-A - CÁMARA BULLET 2MP",
    brand: "Dahua",
    channels: 1,
    resolution: "2MP",
    price: 295,
    features: ["2 Megapixeles", "Lente 2.8mm", "Iluminación dual"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+B1A21N",
    specs: {
      megapixels: "2 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Dual Illumination",
    },
  },
  {
    id: "cyber-hfw1801t-metal",
    name: "DAHUA HAC-HFW1801T - CAMARA BULLET 4K METALICA",
    brand: "Dahua",
    channels: 1,
    resolution: "4K",
    price: 718,
    features: ["8 Megapixeles", "4K", "Carcasa metálica", "Lente 2.8mm"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1801T+Metal",
    specs: {
      megapixels: "8 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Metal Housing",
    },
  },
  {
    id: "cyber-b2a51n-u-28",
    name: "DAHUA HAC-B2A51N-U-28-S2 - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 399,
    features: ["5 Megapixeles", "Lente 2.8mm", "Ángulo 111 grados"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+B2A51N",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Wide Angle",
    },
  },
  {
    id: "cyber-hfw1200d36",
    name: "DAHUA HFW1200D36 - CAMARA BULLET HDCVI 1080P",
    brand: "Dahua",
    channels: 1,
    resolution: "1080p",
    price: 502,
    features: ["1080P", "HDCVI", "Lente 3.6mm", "87.5 grados"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1200D36",
    specs: {
      megapixels: "2 MP",
      lens: "3.6mm",
      type: "Bullet",
      other: "HDCVI",
    },
  },
  {
    id: "cyber-hfw1200rl-il",
    name: "DAHUA DH-HAC-HFW1200RL-IL-T - CAMARA BULLET 2MP",
    brand: "Dahua",
    channels: 1,
    resolution: "2MP",
    price: 471,
    features: ["2 Megapixeles", "Audio bidireccional", "Iluminación dual"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1200RL",
    specs: {
      megapixels: "2 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Two-way Audio",
    },
  },
  {
    id: "cyber-hfw1500t-28",
    name: "DAHUA HAC-HFW1500T-28 - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 524,
    features: ["5 Megapixeles", "Lente 2.8mm", "111 grados"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1500T",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Wide Angle",
    },
  },
  {
    id: "cyber-hfw1500cl-il",
    name: "DAHUA HAC-HFW1500CL-IL-A - CAMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 558,
    features: ["5 Megapixeles", "Iluminación dual inteligente", "Lente 2.8mm"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1500CL",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Smart Dual Illumination",
    },
  },
  {
    id: "cyber-hfw1200cmn",
    name: "DAHUA HAC-HFW1200CMN-A - CAMARA BULLET 1080P",
    brand: "Dahua",
    channels: 1,
    resolution: "1080p",
    price: 373,
    features: ["1080P", "Lente 2.8mm", "Micrófono integrado"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+HFW1200CMN",
    specs: {
      megapixels: "2 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Integrated Microphone",
    },
  },
  {
    id: "cyber-b1a51n-il",
    name: "DAHUA DH-HAC-B1A51N-U-IL-A - CÁMARA BULLET 5MP",
    brand: "Dahua",
    channels: 1,
    resolution: "5MP",
    price: 462,
    features: ["5 Megapixeles", "Lente 2.8mm", "Iluminación dual"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+B1A51N",
    specs: {
      megapixels: "5 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Dual Illumination",
    },
  },
  {
    id: "cyber-b2a21n-il",
    name: "DAHUA DH-HAC-B2A21N-U-IL-A - CÁMARA BULLET 2MP",
    brand: "Dahua",
    channels: 1,
    resolution: "2MP",
    price: 330,
    features: ["2 Megapixeles", "Lente 2.8mm", "Iluminación dual"],
    imageUrl: "https://via.placeholder.com/300x300?text=DAHUA+B2A21N",
    specs: {
      megapixels: "2 MP",
      lens: "2.8mm",
      type: "Bullet",
      other: "Dual Illumination",
    },
  },
];

const SHIPPING_BASE = 200; // Pesos
const SHIPPING_INCREMENT = 50; // Por cada cámara adicional

export default function DVRQuotation() {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<DVRModel | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleAddCamera = () => {
    if (!selectedCamera) return;

    const newItem: QuotationItem = {
      modelId: selectedCamera.id,
      modelName: selectedCamera.name,
      unitPrice: selectedCamera.price,
      quantity,
      imageUrl: selectedCamera.imageUrl,
    };

    setQuotationItems([...quotationItems, newItem]);
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  const calculateShipping = () => {
    const totalItems = quotationItems.reduce((sum, item) => sum + item.quantity, 0);
    return SHIPPING_BASE + (totalItems > 1 ? (totalItems - 1) * SHIPPING_INCREMENT : 0);
  };

  const calculateSubtotal = () => {
    return quotationItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = calculateShipping();
  const iva = (subtotal + shipping) * 0.16;
  const total = subtotal + shipping + iva;

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.text("COTIZACIÓN - CÁMARAS CYBERPIEZAS", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // Info
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 20, yPosition);
    yPosition += 10;

    // Tabla de productos
    doc.setFontSize(12);
    doc.text("Productos:", 20, yPosition);
    yPosition += 10;

    quotationItems.forEach((item, index) => {
      const itemTotal = item.unitPrice * item.quantity;
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${item.modelName}`, 20, yPosition);
      yPosition += 5;
      doc.text(`   Cantidad: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${itemTotal.toFixed(2)}`, 20, yPosition);
      yPosition += 8;

      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Resumen
    yPosition += 5;
    doc.setFontSize(11);
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Envío: $${shipping.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`IVA (16%): $${iva.toFixed(2)}`, 20, yPosition);
    yPosition += 10;
    doc.setFontSize(13);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, yPosition);

    doc.save("cotizacion_camaras_cyberpiezas.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Camera className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Cámaras Cyberpiezas</h1>
          </div>
          <p className="text-gray-600">Selecciona cámaras y genera tu cotización personalizada</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selector de cámaras */}
          <div className="lg:col-span-2">
            <Card className="p-6 border-2 border-purple-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Catálogo de Cámaras</h2>

              {/* Selector */}
              <div className="mb-6">
                <Label className="text-lg font-semibold mb-2 block">Selecciona una cámara:</Label>
                <select
                  value={selectedCamera?.id || ""}
                  onChange={(e) => {
                    const camera = CAMARAS_CYBERPIEZAS.find((c) => c.id === e.target.value);
                    setSelectedCamera(camera || null);
                  }}
                  className="w-full p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600"
                >
                  <option value="">-- Selecciona una cámara --</option>
                  {CAMARAS_CYBERPIEZAS.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name} - ${camera.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vista previa de cámara seleccionada */}
              {selectedCamera && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Imagen */}
                  <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-64">
                    <img
                      src={selectedCamera.imageUrl}
                      alt={selectedCamera.name}
                      className="max-w-full max-h-64 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = `https://via.placeholder.com/300x300?text=${encodeURIComponent(selectedCamera.name)}`;
                      }}
                    />
                  </div>

                  {/* Características */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-900">{selectedCamera.name}</h3>
                    <div className="space-y-3">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Megapixeles</p>
                        <p className="text-lg font-bold text-purple-600">{selectedCamera.specs.megapixels}</p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Lente</p>
                        <p className="text-lg font-bold text-orange-600">{selectedCamera.specs.lens}</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Tipo</p>
                        <p className="text-lg font-bold text-blue-600">{selectedCamera.specs.type}</p>
                      </div>
                      {selectedCamera.specs.other && (
                        <div className="bg-green-100 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Características</p>
                          <p className="text-lg font-bold text-green-600">{selectedCamera.specs.other}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cantidad y agregar */}
              {selectedCamera && (
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label className="block mb-2 font-semibold">Cantidad:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="border-2 border-purple-300"
                    />
                  </div>
                  <Button
                    onClick={handleAddCamera}
                    className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Carrito y resumen */}
          <div>
            <Card className="p-6 border-2 border-orange-200 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Cotización</h2>

              {/* Carrito */}
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {quotationItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay cámaras en la cotización</p>
                ) : (
                  quotationItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900 line-clamp-2">{item.modelName}</p>
                          <p className="text-xs text-gray-600 mt-1">Cantidad: {item.quantity}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-purple-600">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Resumen de precios */}
              <div className="space-y-2 border-t-2 border-gray-200 pt-4">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Envío:</span>
                  <span className="font-semibold">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>IVA (16%):</span>
                  <span className="font-semibold">${iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-purple-600 border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón descargar PDF */}
              {quotationItems.length > 0 && (
                <Button
                  onClick={handleGeneratePDF}
                  className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Descargar PDF
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
