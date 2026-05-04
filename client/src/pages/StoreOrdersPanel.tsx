import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Package, Truck } from "lucide-react";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  deliveryType: "pickup" | "delivery";
  address?: string;
  status: "pending" | "preparing" | "ready" | "delivered";
  createdAt: Date;
  paymentProof?: string;
}

const mockOrders: Order[] = [
  {
    id: "1",
    customerName: "Juan Pérez",
    phone: "+52 1234567890",
    email: "juan@email.com",
    items: [{ name: "Blusa Casual", quantity: 1, price: 299 }],
    total: 299,
    deliveryType: "pickup",
    status: "pending",
    createdAt: new Date(),
  },
  {
    id: "2",
    customerName: "María López",
    phone: "+52 9876543210",
    email: "maria@email.com",
    items: [
      { name: "Pantalón Denim", quantity: 2, price: 499 },
      { name: "Blusa Casual", quantity: 1, price: 299 },
    ],
    total: 1297,
    deliveryType: "delivery",
    address: "Calle Principal 123, Apt 4B",
    status: "preparing",
    createdAt: new Date(Date.now() - 3600000),
    paymentProof: "comprobante.jpg",
  },
];

const statusConfig = {
  pending: { label: "Recibido", icon: Clock, color: "bg-yellow-500/20 text-yellow-400", border: "border-yellow-500/30" },
  preparing: { label: "En preparación", icon: Package, color: "bg-blue-500/20 text-blue-400", border: "border-blue-500/30" },
  ready: { label: "Listo", icon: CheckCircle, color: "bg-green-500/20 text-green-400", border: "border-green-500/30" },
  delivered: { label: "Entregado", icon: Truck, color: "bg-purple-500/20 text-purple-400", border: "border-purple-500/30" },
};

export default function StoreOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const updateOrderStatus = (orderId: string, newStatus: Order["status"]) => {
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const getNextStatus = (currentStatus: Order["status"]): Order["status"] | null => {
    const statuses: Order["status"][] = ["pending", "preparing", "ready", "delivered"];
    const currentIndex = statuses.indexOf(currentStatus);
    return currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Gestión de Pedidos</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {orders.map((order) => {
                const config = statusConfig[order.status];
                const StatusIcon = config.icon;
                return (
                  <Card
                    key={order.id}
                    className={`bg-slate-800/50 border-slate-700 p-6 cursor-pointer hover:bg-slate-800/70 transition-all ${selectedOrder?.id === order.id ? "ring-2 ring-purple-500" : ""}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{order.customerName}</h3>
                        <p className="text-sm text-slate-400">Pedido #{order.id}</p>
                      </div>
                      <Badge className={`${config.color} border ${config.border}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-400">Teléfono</p>
                        <p className="text-white font-semibold">{order.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Total</p>
                        <p className="text-white font-semibold">${order.total}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">
                        {order.items.length} producto{order.items.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-slate-500">
                        {order.createdAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Order Details */}
          {selectedOrder && (
            <div>
              <Card className="bg-slate-800/50 border-slate-700 p-6 sticky top-24">
                <h2 className="text-2xl font-bold text-white mb-6">Detalles del Pedido</h2>

                {/* Customer Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Cliente</p>
                    <p className="text-white font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Email</p>
                    <p className="text-white">{selectedOrder.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Teléfono</p>
                    <p className="text-white">{selectedOrder.phone}</p>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="border-t border-slate-700 pt-4 mb-6">
                  <p className="text-xs text-slate-400 uppercase mb-2">Entrega</p>
                  <p className="text-white capitalize mb-2">
                    {selectedOrder.deliveryType === "pickup" ? "Pasar a recoger" : "Entrega a domicilio"}
                  </p>
                  {selectedOrder.address && (
                    <p className="text-sm text-slate-300">{selectedOrder.address}</p>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-slate-700 pt-4 mb-6">
                  <p className="text-xs text-slate-400 uppercase mb-3">Productos</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.name} x{item.quantity}</span>
                        <span className="text-white font-semibold">${item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Proof */}
                {selectedOrder.paymentProof && (
                  <div className="border-t border-slate-700 pt-4 mb-6">
                    <p className="text-xs text-slate-400 uppercase mb-2">Comprobante</p>
                    <div className="bg-slate-700/50 p-2 rounded text-center">
                      <p className="text-sm text-green-400">✓ {selectedOrder.paymentProof}</p>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-slate-700 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-2xl font-bold text-purple-400">${selectedOrder.total}</span>
                  </div>
                </div>

                {/* Status Update */}
                {getNextStatus(selectedOrder.status) && (
                  <Button
                    onClick={() => {
                      const nextStatus = getNextStatus(selectedOrder.status);
                      if (nextStatus) updateOrderStatus(selectedOrder.id, nextStatus);
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    Marcar como {statusConfig[getNextStatus(selectedOrder.status) as Order["status"]].label}
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
