import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Download, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Subscriber {
  id: number;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  plan: "basic" | "professional" | "permanent";
  status: "pending_payment" | "active" | "suspended" | "canceled";
  registrationDate: Date;
  paymentDate?: Date;
  expirationDate?: Date;
  notes?: string;
}

const planColors = {
  basic: "bg-blue-100 text-blue-800",
  professional: "bg-purple-100 text-purple-800",
  permanent: "bg-green-100 text-green-800",
};

const statusColors = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-800",
};

export default function SubscribersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  // Mock data - en producción vendrá del servidor
  const mockSubscribers: Subscriber[] = [
    {
      id: 1,
      name: "Juan Pérez",
      email: "juan@example.com",
      phone: "5551234567",
      businessName: "Tienda de Ropa Juan",
      plan: "professional",
      status: "active",
      registrationDate: new Date("2026-04-01"),
      paymentDate: new Date("2026-04-01"),
      expirationDate: new Date("2026-05-01"),
      notes: "Cliente de prueba",
    },
    {
      id: 2,
      name: "María García",
      email: "maria@example.com",
      phone: "5559876543",
      businessName: "Boutique María",
      plan: "basic",
      status: "pending_payment",
      registrationDate: new Date("2026-04-15"),
      notes: "Enviado recordatorio de pago",
    },
  ];

  const filteredSubscribers = mockSubscribers.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: mockSubscribers.length,
    active: mockSubscribers.filter((s) => s.status === "active").length,
    pending: mockSubscribers.filter((s) => s.status === "pending_payment").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestión de Suscriptores</h1>
          <p className="text-slate-600">Administra todos los suscriptores de Cyberpiezas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-l-4 border-blue-500 p-6">
            <h3 className="text-slate-600 text-sm font-medium mb-2">Total de Suscriptores</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </Card>
          <Card className="bg-white border-l-4 border-green-500 p-6">
            <h3 className="text-slate-600 text-sm font-medium mb-2">Activos</h3>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </Card>
          <Card className="bg-white border-l-4 border-yellow-500 p-6">
            <h3 className="text-slate-600 text-sm font-medium mb-2">Pendientes de Pago</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, email o negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Suscriptor
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Subscribers Table */}
        <Card className="bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Nombre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Teléfono</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Fecha de Registro</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{subscriber.name}</p>
                        <p className="text-sm text-slate-500">{subscriber.businessName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{subscriber.email}</td>
                    <td className="px-6 py-4 text-slate-600">{subscriber.phone}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${planColors[subscriber.plan]} border-0`}>
                        {subscriber.plan === "basic"
                          ? "Básico"
                          : subscriber.plan === "professional"
                            ? "Profesional"
                            : "Permanente"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${statusColors[subscriber.status]} border-0`}
                        variant="secondary"
                      >
                        {subscriber.status === "pending_payment"
                          ? "Pendiente"
                          : subscriber.status === "active"
                            ? "Activo"
                            : subscriber.status === "suspended"
                              ? "Suspendido"
                              : "Cancelado"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {subscriber.registrationDate.toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-6 py-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubscriber(subscriber)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Detalles del Suscriptor</DialogTitle>
                          </DialogHeader>
                          {selectedSubscriber && (
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-slate-600">Nombre</p>
                                <p className="font-medium">{selectedSubscriber.name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">Email</p>
                                <p className="font-medium">{selectedSubscriber.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">Teléfono</p>
                                <p className="font-medium">{selectedSubscriber.phone}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">Negocio</p>
                                <p className="font-medium">{selectedSubscriber.businessName || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">Plan</p>
                                <Badge className={`${planColors[selectedSubscriber.plan]} border-0`}>
                                  {selectedSubscriber.plan === "basic"
                                    ? "Básico"
                                    : selectedSubscriber.plan === "professional"
                                      ? "Profesional"
                                      : "Permanente"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">Estado</p>
                                <Badge
                                  className={`${statusColors[selectedSubscriber.status]} border-0`}
                                  variant="secondary"
                                >
                                  {selectedSubscriber.status === "pending_payment"
                                    ? "Pendiente"
                                    : selectedSubscriber.status === "active"
                                      ? "Activo"
                                      : selectedSubscriber.status === "suspended"
                                        ? "Suspendido"
                                        : "Cancelado"}
                                </Badge>
                              </div>
                              {selectedSubscriber.expirationDate && (
                                <div>
                                  <p className="text-sm text-slate-600">Vencimiento</p>
                                  <p className="font-medium">
                                    {selectedSubscriber.expirationDate.toLocaleDateString("es-MX")}
                                  </p>
                                </div>
                              )}
                              {selectedSubscriber.notes && (
                                <div>
                                  <p className="text-sm text-slate-600">Notas</p>
                                  <p className="font-medium">{selectedSubscriber.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty State */}
        {filteredSubscribers.length === 0 && (
          <Card className="bg-white p-12 text-center">
            <p className="text-slate-600 mb-4">No se encontraron suscriptores</p>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Suscriptor
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
