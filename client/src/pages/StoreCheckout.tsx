import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function StoreCheckout() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const storeSlug = slug || "boutique-demo";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    deliveryType: "pickup" as "pickup" | "delivery",
    address: "",
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const bankData = {
    bank: "AZTECA",
    account: "4027660019183039",
    clabe: "127542013042637791",
    holder: "David Farfan",
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }
    if (formData.deliveryType === "delivery" && !formData.address) {
      alert("Por favor ingresa tu dirección");
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowSuccess(true);
      setTimeout(() => setLocation("/cyberpiezas"), 3000);
    } catch (error) {
      alert("Error al procesar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full mx-4 p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-white mb-2">¡Pedido Confirmado!</h1>
          <p className="text-slate-300 mb-6">Tu pedido ha sido registrado exitosamente.</p>
          <Button onClick={() => setLocation("/cyberpiezas")} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">Volver</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => setLocation(`/tienda/${storeSlug}`)} className="p-2 hover:bg-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-2xl font-bold text-white">Confirmar Pedido</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Tus Datos</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre Completo *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Tu nombre" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="+52 1234567890" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="tu@email.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Modalidad de Entrega *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                      <input type="radio" name="deliveryType" value="pickup" checked={formData.deliveryType === "pickup"} onChange={(e) => setFormData({...formData, deliveryType: e.target.value as "pickup"})} className="w-4 h-4" />
                      <span className="text-white">Pasar a recoger</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                      <input type="radio" name="deliveryType" value="delivery" checked={formData.deliveryType === "delivery"} onChange={(e) => setFormData({...formData, deliveryType: e.target.value as "delivery"})} className="w-4 h-4" />
                      <span className="text-white">Entrega a domicilio</span>
                    </label>
                  </div>
                </div>
                {formData.deliveryType === "delivery" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Dirección *</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none" rows={3} required />
                  </div>
                )}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Comprobante (Opcional)</h3>
                  <Card className="bg-slate-700/50 border-slate-600 p-4 mb-4">
                    <h4 className="text-white font-semibold mb-3">Datos Bancarios</h4>
                    <div className="text-sm text-slate-300 space-y-1">
                      <div><span className="text-slate-400">Banco:</span> {bankData.bank}</div>
                      <div><span className="text-slate-400">Tarjeta:</span> {bankData.account}</div>
                      <div><span className="text-slate-400">CLABE:</span> {bankData.clabe}</div>
                      <div><span className="text-slate-400">Titular:</span> {bankData.holder}</div>
                    </div>
                  </Card>
                  <input type="file" onChange={handleFileChange} accept="image/*,.pdf" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                  {paymentProof && <p className="text-sm text-green-400 mt-2">✓ {paymentProof.name}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 disabled:opacity-50">
                  {isSubmitting ? "Procesando..." : "Confirmar Pedido"}
                </Button>
              </form>
            </Card>
          </div>
          <div>
            <Card className="bg-slate-800/50 border-slate-700 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-white mb-4">Resumen</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-300"><span>Blusa Casual x1</span><span>$299</span></div>
                <div className="flex justify-between text-slate-300"><span>Pantalón Denim x1</span><span>$499</span></div>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-4"><span className="text-slate-300">Subtotal:</span><span className="text-white font-semibold">$798</span></div>
                <div className="flex justify-between items-center mb-4"><span className="text-slate-300">Envío:</span><span className="text-white font-semibold">{formData.deliveryType === "pickup" ? "Gratis" : "$50"}</span></div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-700"><span className="text-white font-bold">Total:</span><span className="text-2xl font-bold text-purple-400">${formData.deliveryType === "pickup" ? "798" : "848"}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
