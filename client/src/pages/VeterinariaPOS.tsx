import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Stethoscope,
  PawPrint,
  Package,
  Wrench,
  ShoppingCart,
  Settings,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CalendarDays,
  Clock,
  Syringe,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  UserCircle,
  User,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

type TabKey = "pos" | "pets" | "customers" | "appointments" | "products" | "services" | "settings";

// Mapa de URL param a TabKey
const tabFromUrl = (urlTab: string | undefined): TabKey => {
  switch (urlTab) {
    case "mascotas": return "pets";
    case "clientes": return "customers";
    case "citas": return "appointments";
    case "productos": return "products";
    case "servicios": return "services";
    case "configuracion": return "settings";
    default: return "pos";
  }
};

const speciesEmoji: Record<string, string> = {
  perro: "🐕",
  gato: "🐈",
  ave: "🦜",
  reptil: "🦎",
  roedor: "🐹",
  exotico: "🦊",
  otro: "🐾",
};

function formatMoney(amount: string | number) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "$0.00";
  return "$" + n.toFixed(2);
}

function VeterinariaPOSContent() {
  const params = useParams() as { tab?: string };
  const activeTab = tabFromUrl(params?.tab);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Headers contextuales por pestaña
  const headers: Record<TabKey, { title: string; subtitle: string; icon: any }> = {
    pos: { title: "Punto de Venta", subtitle: "Vende productos y servicios de tu clinica", icon: ShoppingCart },
    pets: { title: "Mascotas", subtitle: "Registro y expediente clinico de mascotas", icon: PawPrint },
    customers: { title: "Clientes", subtitle: "Duenos de las mascotas que atiendes", icon: UserCircle },
    appointments: { title: "Citas", subtitle: "Agenda y administra las citas de tus pacientes", icon: CalendarDays },
    products: { title: "Productos", subtitle: "Inventario de productos y medicamentos", icon: Package },
    services: { title: "Servicios", subtitle: "Catalogo de servicios y consultas", icon: Wrench },
    settings: { title: "Configuracion", subtitle: "Datos de la clinica para recibos", icon: Settings },
  };

  const currentHeader = headers[activeTab];
  const HeaderIcon = currentHeader.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-start gap-4 bg-slate-900/80 rounded-2xl p-5 border border-slate-600 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
            <HeaderIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">{currentHeader.title}</h1>
            <p className="text-slate-100 mt-1 text-base font-medium">{currentHeader.subtitle}</p>
          </div>
        </div>

        {selectedPetId ? (
          <PetDetailView petId={selectedPetId} onBack={() => setSelectedPetId(null)} />
        ) : (
          <>
            {activeTab === "pos" && <POSTab />}
            {activeTab === "pets" && <PetsTab onSelectPet={setSelectedPetId} />}
            {activeTab === "customers" && <CustomersTab />}
            {activeTab === "appointments" && <AppointmentsTab />}
            {activeTab === "products" && <ProductsTab />}
            {activeTab === "services" && <ServicesTab />}
            {activeTab === "settings" && <SettingsTab />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// CUSTOMERS TAB - Clientes (duenos de mascotas)
// ============================================================================

function CustomersTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const customersQuery = trpc.customers.list.useQuery();
  const customers: any[] = (customersQuery.data as any[]) ?? [];

  const filtered = customers.filter((c: any) => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <Input
            placeholder="Buscar cliente por nombre, email o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-100 h-11"
          />
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            utils.customers.list.invalidate();
          }}
        />
      )}

      {customersQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-100 mt-4 font-medium">Cargando clientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <UserCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-xl mb-1">
              {search ? "No se encontraron clientes" : "Aun no tienes clientes"}
            </p>
            <p className="text-sm text-slate-100 max-w-sm mx-auto">
              {search
                ? "Prueba con otros terminos de busqueda."
                : "Empieza agregando un cliente. Despues podras registrar sus mascotas y atenderlos."}
            </p>
            {!search && (
              <Button
                onClick={() => setShowForm(true)}
                className="mt-5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold"
              >
                <Plus className="w-4 h-4" /> Agregar primer cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any) => (
            <Card key={c.id} className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                    {(c.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{c.name || "Sin nombre"}</h3>
                    <p className="text-xs text-emerald-300/70 font-medium uppercase tracking-wider mt-0.5">
                      Cliente
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {c.phone ? (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs italic">Sin telefono</span>
                    </div>
                  )}
                  {c.email ? (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                      <span className="truncate text-xs">{c.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs italic">Sin email</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const createMut = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success("Cliente creado correctamente"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const data: any = { name: name.trim() };
    if (phone.trim()) data.phone = phone.trim();
    if (email.trim()) data.email = email.trim();
    if (notes.trim()) data.notes = notes.trim();

    createMut.mutate(data);
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-950/80 via-slate-950 to-cyan-950/80 border-emerald-500/60 shadow-2xl shadow-emerald-500/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-emerald-200" />
            </div>
            Nuevo cliente
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-slate-100 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
            Nombre completo <span className="text-rose-400">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Juan Perez"
            className="bg-slate-950 border-slate-600 text-white h-11"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Telefono</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5512345678"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              type="email"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Notas</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Direccion, observaciones, alergias del cliente..."
            className="bg-slate-950 border-slate-600 text-white min-h-[90px]"
          />
          <p className="text-xs text-slate-200 mt-1.5">
            Anota direccion, alergias, preferencias o cualquier nota util.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={createMut.isPending}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold flex-1 sm:flex-none shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {createMut.isPending ? "Guardando..." : "Crear cliente"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// POS TAB - Punto de venta
// ============================================================================

function POSTab() {
  const utils = trpc.useUtils();
  const productsQuery = trpc.veterinaria.products.list.useQuery({});
  const servicesQuery = trpc.veterinaria.services.list.useQuery({});
  const statsQuery = trpc.veterinaria.sales.stats.useQuery();
  const settingsQuery = trpc.veterinaria.settings.get.useQuery();

  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSale, setLastSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const createSale = trpc.veterinaria.sales.create.useMutation({
    onSuccess: (data) => {
      // Guardar info de la venta para el recibo
      setLastSale({
        items: [...cart],
        total: cartTotal,
        date: new Date(),
        receiptNumber: data?.id ? "A" + String(data.id).padStart(4, "0") : "A0001",
      });
      setShowReceipt(true);
      toast.success("Venta registrada correctamente");
      setCart([]);
      utils.veterinaria.sales.stats.invalidate();
      utils.veterinaria.products.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear venta");
    },
  });

  const products = productsQuery.data ?? [];
  const services = servicesQuery.data ?? [];

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const cartTotal = cart.reduce((acc, item) => {
    return acc + parseFloat(item.unitPrice) * parseFloat(item.quantity);
  }, 0);

  const addProduct = (product: any) => {
    const existing = cart.find((c) => c.itemType === "product" && c.productId === product.id);
    if (existing) {
      setCart(cart.map((c) =>
        c === existing
          ? { ...c, quantity: (parseFloat(c.quantity) + 1).toString() }
          : c,
      ));
    } else {
      setCart([
        ...cart,
        {
          itemType: "product",
          productId: product.id,
          description: product.name,
          quantity: "1",
          unitPrice: product.price,
        },
      ]);
    }
  };

  const addService = (service: any) => {
    setCart([
      ...cart,
      {
        itemType: "service",
        serviceId: service.id,
        description: service.name,
        quantity: "1",
        unitPrice: service.price,
      },
    ]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: string) => {
    setCart(cart.map((item, i) => (i === index ? { ...item, quantity: qty } : item)));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Agrega items al carrito");
      return;
    }
    createSale.mutate({
      items: cart,
      paymentMethod: "efectivo",
      paymentStatus: "pagado",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats con tipografia mejorada y sombras de color */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600/30 via-emerald-700/20 to-cyan-700/20 border-emerald-500/60 shadow-xl shadow-emerald-500/10">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-white uppercase tracking-wider font-bold mb-1">Ingresos del mes</p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {formatMoney(statsQuery.data?.totalRevenue ?? "0")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/30 via-purple-700/20 to-pink-700/20 border-purple-500/60 shadow-xl shadow-purple-500/10">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-white uppercase tracking-wider font-bold mb-1">Ventas del mes</p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {statsQuery.data?.totalSales ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600/30 via-amber-700/20 to-orange-700/20 border-amber-500/40 shadow-xl shadow-amber-500/10">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-white uppercase tracking-wider font-bold mb-1">En carrito</p>
                <p className="text-3xl font-bold text-white tracking-tight">{formatMoney(cartTotal)}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/30 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalogo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/80 border-slate-600 text-white"
            />
          </div>

          {/* Servicios */}
          {services.length > 0 && (
            <Card className="bg-slate-900/80 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-base font-bold">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  Servicios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {services.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => addService(s)}
                      className="bg-emerald-600/10 hover:bg-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl p-3.5 text-left transition-all shadow-sm"
                    >
                      <p className="font-bold text-white text-sm truncate mb-0.5">{s.name}</p>
                      <p className="text-xs text-emerald-100 truncate">{s.category}</p>
                      <p className="text-emerald-300 font-bold mt-1.5">{formatMoney(s.price)}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos */}
          <Card className="bg-slate-900/80 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base font-bold">
                <div className="w-7 h-7 rounded-lg bg-purple-500/30 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-100 text-sm">No hay productos disponibles.</p>
                  <p className="text-xs text-slate-200 mt-1">Agregalos desde la pestania Productos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={p.stock <= 0}
                      className="bg-purple-600/10 hover:bg-purple-600/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 border border-purple-500/30 hover:border-purple-400/50 rounded-xl p-3.5 text-left transition-all shadow-sm relative"
                    >
                      {p.stock <= 0 && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-500/30 text-rose-200 text-[10px] font-bold rounded">AGOTADO</span>
                      )}
                      <p className="font-bold text-white text-sm truncate mb-0.5">{p.name}</p>
                      <p className="text-xs text-purple-100">Stock: {p.stock}</p>
                      <p className="text-purple-300 font-bold mt-1.5">{formatMoney(p.price)}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Carrito */}
        <Card className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-emerald-500/30 sticky top-4 h-fit shadow-2xl shadow-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between text-base">
              <div className="flex items-center gap-2 font-bold">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-emerald-200" />
                </div>
                Carrito
              </div>
              {cart.length > 0 && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-200 text-sm font-bold rounded-full">
                  {cart.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-900/80 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-slate-500" />
                </div>
                <p className="text-white text-sm font-bold">Carrito vacio</p>
                <p className="text-slate-200 text-xs mt-1">Agrega productos o servicios</p>
              </div>
            ) : (
              <>
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-900/85 rounded-xl border border-slate-600">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-emerald-300/70">
                        {formatMoney(item.unitPrice)} c/u
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(i, e.target.value)}
                      className="w-16 h-8 bg-slate-800 border-slate-600 text-white text-center font-bold"
                      min="0.01"
                      step="0.01"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(i)}
                      className="text-rose-400 hover:bg-rose-500/20 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="border-t border-slate-600 pt-3 mt-2">
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="text-sm text-slate-100 font-medium uppercase tracking-wider">Total</span>
                    <span className="text-2xl text-emerald-300 font-bold tracking-tight">{formatMoney(cartTotal)}</span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={createSale.isPending}
                  className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {createSale.isPending ? "Procesando..." : "Cobrar"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Recibo */}
      {showReceipt && lastSale && (
        <ReceiptModal
          sale={lastSale}
          settings={settingsQuery.data}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// PETS TAB - Mascotas
// ============================================================================

function PetsTab({ onSelectPet }: { onSelectPet: (id: number) => void }) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const petsQuery = trpc.veterinaria.pets.list.useQuery({ search });
  const customersQuery = trpc.customers.list.useQuery();

  const pets = petsQuery.data ?? [];
  const customers: any[] = (customersQuery.data as any[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <Input
            placeholder="Buscar por nombre de mascota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800/80 border-slate-600 text-white h-11"
          />
        </div>
        <Button
          onClick={() => {
            if (customers.length === 0) {
              toast.error("Primero registra al menos un cliente (dueño)");
              return;
            }
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nueva mascota
        </Button>
      </div>

      {customers.length === 0 && !showForm && (
        <Card className="bg-amber-950/40 border-amber-500/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-100 font-bold text-sm">Necesitas registrar clientes primero</p>
                <p className="text-white text-xs mt-0.5">
                  Cada mascota debe tener un dueño. Ve a la pestaña <strong>Clientes</strong> y agrega al menos uno.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <PetForm
          customers={customers}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            utils.veterinaria.pets.list.invalidate();
          }}
        />
      )}

      {petsQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-100 mt-4 font-medium">Cargando mascotas...</p>
        </div>
      ) : pets.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <PawPrint className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-xl mb-1">
              {search ? "No se encontraron mascotas" : "Aun no hay mascotas registradas"}
            </p>
            <p className="text-sm text-slate-100 max-w-sm mx-auto">
              {search
                ? "Prueba con otro nombre."
                : "Registra la primera mascota para empezar a llevar su expediente clinico."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((row: any) => {
            const pet = row.pet;
            const customer = row.customer;
            return (
              <Card
                key={pet.id}
                onClick={() => onSelectPet(pet.id)}
                className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer transition-all group"
              >
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                      {speciesEmoji[pet.species] || "🐾"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{pet.name}</h3>
                      <p className="text-sm text-emerald-300/70 truncate font-medium capitalize">
                        {pet.breed || pet.species}
                      </p>
                      {customer && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                          <UserCircle className="w-3 h-3 text-purple-300 flex-shrink-0" />
                          <span className="text-purple-200 truncate font-medium">{customer.name}</span>
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        <Badge className="bg-slate-700/80 text-slate-100 text-xs capitalize border border-slate-600">
                          {pet.sex}
                        </Badge>
                        {pet.sterilized && (
                          <Badge className="bg-emerald-500/20 text-emerald-200 text-xs border border-emerald-500/60">
                            Esterilizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PetForm({ customers, onClose, onSaved }: { customers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customerId: 0,
    name: "",
    species: "perro" as const,
    breed: "",
    sex: "desconocido" as const,
    sterilized: false,
    color: "",
    microchip: "",
    weight: "",
    notes: "",
  });

  const createPet = trpc.veterinaria.pets.create.useMutation({
    onSuccess: () => {
      toast.success("Mascota registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.customerId) return toast.error("Selecciona un cliente");
    if (!form.name) return toast.error("Nombre requerido");
    createPet.mutate({
      customerId: form.customerId,
      name: form.name,
      species: form.species,
      breed: form.breed || undefined,
      sex: form.sex,
      sterilized: form.sterilized,
      color: form.color || undefined,
      microchip: form.microchip || undefined,
      weight: form.weight || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-950/80 via-slate-950 to-cyan-950/80 border-emerald-500/60 shadow-2xl shadow-emerald-500/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-emerald-200" />
          </div>
          Nueva mascota
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-100 hover:text-white hover:bg-slate-800">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Selector de cliente destacado */}
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4">
          <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCircle className="w-3.5 h-3.5" />
            Dueño de la mascota <span className="text-rose-400">*</span>
          </label>
          {customers.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-200 text-sm bg-amber-950/30 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Primero registra un cliente en la pestaña <strong>Clientes</strong>.</span>
            </div>
          ) : (
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-purple-500/60 focus:outline-none"
            >
              <option value={0}>-- Selecciona el cliente --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? " (" + c.phone + ")" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Datos basicos */}
        <div>
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <PawPrint className="w-3 h-3" /> Datos de la mascota
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Nombre <span className="text-rose-400">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Firulais"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Especie</label>
              <select
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-emerald-500/60 focus:outline-none"
              >
                <option value="perro">🐕 Perro</option>
                <option value="gato">🐈 Gato</option>
                <option value="ave">🦜 Ave</option>
                <option value="reptil">🦎 Reptil</option>
                <option value="roedor">🐹 Roedor</option>
                <option value="exotico">🦊 Exotico</option>
                <option value="otro">🐾 Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Raza</label>
              <Input
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                placeholder="Labrador, Persa, Mestizo..."
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Sexo</label>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-emerald-500/60 focus:outline-none"
              >
                <option value="desconocido">Desconocido</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Color</label>
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="Cafe con blanco"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Peso (kg)</label>
              <Input
                type="number"
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="12.5"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
          </div>
        </div>

        {/* Datos opcionales */}
        <div className="space-y-3 pt-2 border-t border-slate-600">
          <div>
            <label className="text-xs font-bold text-slate-200 mb-1.5 block">Numero de microchip</label>
            <Input
              value={form.microchip}
              onChange={(e) => setForm({ ...form, microchip: e.target.value })}
              placeholder="123456789012345"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-100 bg-slate-900/85 rounded-lg p-3 border border-slate-600 cursor-pointer hover:bg-slate-900/80 transition-colors">
            <input
              type="checkbox"
              checked={form.sterilized}
              onChange={(e) => setForm({ ...form, sterilized: e.target.checked })}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="font-medium">Mascota esterilizada</span>
          </label>
          <div>
            <label className="text-xs font-bold text-slate-200 mb-1.5 block">Notas medicas / observaciones</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alergias, comportamiento, condiciones especiales..."
              className="bg-slate-950 border-slate-600 text-white min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={createPet.isPending || customers.length === 0}
            className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {createPet.isPending ? "Guardando mascota..." : "Guardar mascota"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PET DETAIL VIEW - Expediente clinico
// ============================================================================

function PetDetailView({ petId, onBack }: { petId: number; onBack: () => void }) {
  const petQuery = trpc.veterinaria.pets.getById.useQuery({ id: petId });
  const visitsQuery = trpc.veterinaria.visits.listByPet.useQuery({ petId });
  const vaccinationsQuery = trpc.veterinaria.vaccinations.listByPet.useQuery({ petId });

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showVaccineForm, setShowVaccineForm] = useState(false);

  const utils = trpc.useUtils();

  if (petQuery.isLoading) {
    return <p className="text-center text-slate-200 py-12">Cargando expediente...</p>;
  }

  if (!petQuery.data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-200">Mascota no encontrada</p>
        <Button onClick={onBack} variant="link" className="mt-2">Volver</Button>
      </div>
    );
  }

  const pet = petQuery.data.pet;
  const customer = petQuery.data.customer;
  const visits = visitsQuery.data ?? [];
  const vaccinations = vaccinationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Button
        onClick={onBack}
        variant="ghost"
        className="text-slate-200 gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a mascotas
      </Button>

      {/* Datos basicos */}
      <Card className="bg-gradient-to-br from-emerald-600/10 to-cyan-600/10 border-emerald-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="text-6xl">{speciesEmoji[pet.species] || "🐾"}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{pet.name}</h2>
              <p className="text-slate-200">
                {pet.breed || pet.species} • {pet.sex}
                {pet.weight && ` • ${pet.weight} kg`}
              </p>
              {customer && (
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-100">
                  <span className="flex items-center gap-1">
                    👤 {customer.name}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {customer.phone}
                    </span>
                  )}
                </div>
              )}
              {pet.allergies && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
                  <p className="text-xs text-red-300 font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alergias
                  </p>
                  <p className="text-sm text-red-200">{pet.allergies}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitas */}
      <Card className="bg-slate-900/80 border-slate-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Historial de visitas ({visits.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowVisitForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
          >
            <Plus className="w-3 h-3" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showVisitForm && (
            <VisitForm
              petId={petId}
              customerId={pet.customerId}
              onClose={() => setShowVisitForm(false)}
              onSaved={() => {
                setShowVisitForm(false);
                utils.veterinaria.visits.listByPet.invalidate({ petId });
              }}
            />
          )}
          {visits.length === 0 ? (
            <p className="text-center text-slate-200 py-6 text-sm">
              Sin visitas registradas
            </p>
          ) : (
            visits.map((v: any) => (
              <div key={v.id} className="p-3 bg-slate-900/80 rounded-lg border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{v.reason}</p>
                    <p className="text-xs text-slate-200 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(v.visitDate), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                {v.diagnosis && (
                  <p className="text-sm text-slate-100 mt-2">
                    <span className="text-purple-400 font-semibold">Diagnostico:</span> {v.diagnosis}
                  </p>
                )}
                {v.treatment && (
                  <p className="text-sm text-slate-100 mt-1">
                    <span className="text-emerald-400 font-semibold">Tratamiento:</span> {v.treatment}
                  </p>
                )}
                {v.prescribedMedications && (
                  <p className="text-sm text-slate-100 mt-1">
                    <span className="text-amber-400 font-semibold">Medicamentos:</span> {v.prescribedMedications}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Vacunas */}
      <Card className="bg-slate-900/80 border-slate-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Syringe className="w-5 h-5 text-cyan-400" />
            Vacunas ({vaccinations.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowVaccineForm(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
          >
            <Plus className="w-3 h-3" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showVaccineForm && (
            <VaccineForm
              petId={petId}
              onClose={() => setShowVaccineForm(false)}
              onSaved={() => {
                setShowVaccineForm(false);
                utils.veterinaria.vaccinations.listByPet.invalidate({ petId });
              }}
            />
          )}
          {vaccinations.length === 0 ? (
            <p className="text-center text-slate-200 py-6 text-sm">
              Sin vacunas registradas
            </p>
          ) : (
            vaccinations.map((vac: any) => (
              <div key={vac.id} className="p-3 bg-slate-900/80 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{vac.vaccineName}</p>
                    <p className="text-xs text-slate-200">
                      Aplicada: {format(new Date(vac.appliedDate), "dd MMM yyyy", { locale: es })}
                      {vac.brand && ` • ${vac.brand}`}
                    </p>
                  </div>
                  {vac.nextDoseDate && (
                    <Badge className="bg-amber-500/20 text-amber-300">
                      Proxima: {format(new Date(vac.nextDoseDate), "dd MMM", { locale: es })}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VisitForm({ petId, customerId, onClose, onSaved }: {
  petId: number;
  customerId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    reason: "",
    weight: "",
    temperature: "",
    diagnosis: "",
    treatment: "",
    prescribedMedications: "",
  });

  const createVisit = trpc.veterinaria.visits.create.useMutation({
    onSuccess: () => {
      toast.success("Visita registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.reason) return toast.error("Motivo requerido");
    createVisit.mutate({
      petId,
      customerId,
      reason: form.reason,
      weight: form.weight || undefined,
      temperature: form.temperature || undefined,
      diagnosis: form.diagnosis || undefined,
      treatment: form.treatment || undefined,
      prescribedMedications: form.prescribedMedications || undefined,
    });
  };

  return (
    <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-purple-200">Nueva visita</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        placeholder="Motivo de la visita *"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        className="bg-slate-900/80 border-slate-600 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Peso (kg)"
          type="number"
          step="0.01"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          className="bg-slate-900/80 border-slate-600 text-white"
        />
        <Input
          placeholder="Temperatura"
          type="number"
          step="0.1"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          className="bg-slate-900/80 border-slate-600 text-white"
        />
      </div>
      <Textarea
        placeholder="Diagnostico"
        value={form.diagnosis}
        onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-600 text-white"
      />
      <Textarea
        placeholder="Tratamiento"
        value={form.treatment}
        onChange={(e) => setForm({ ...form, treatment: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-600 text-white"
      />
      <Textarea
        placeholder="Medicamentos recetados"
        value={form.prescribedMedications}
        onChange={(e) => setForm({ ...form, prescribedMedications: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-600 text-white"
      />
      <Button
        onClick={handleSubmit}
        disabled={createVisit.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {createVisit.isPending ? "Guardando..." : "Guardar visita"}
      </Button>
    </div>
  );
}

function VaccineForm({ petId, onClose, onSaved }: {
  petId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    vaccineName: "",
    brand: "",
    batchNumber: "",
    nextDoseDate: "",
  });

  const createVaccine = trpc.veterinaria.vaccinations.create.useMutation({
    onSuccess: () => {
      toast.success("Vacuna registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.vaccineName) return toast.error("Nombre de vacuna requerido");
    createVaccine.mutate({
      petId,
      vaccineName: form.vaccineName,
      brand: form.brand || undefined,
      batchNumber: form.batchNumber || undefined,
      nextDoseDate: form.nextDoseDate ? new Date(form.nextDoseDate) : undefined,
    });
  };

  return (
    <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-cyan-200">Nueva vacuna</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        placeholder="Nombre de la vacuna *"
        value={form.vaccineName}
        onChange={(e) => setForm({ ...form, vaccineName: e.target.value })}
        className="bg-slate-900/80 border-slate-600 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Marca"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          className="bg-slate-900/80 border-slate-600 text-white"
        />
        <Input
          placeholder="Lote"
          value={form.batchNumber}
          onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
          className="bg-slate-900/80 border-slate-600 text-white"
        />
      </div>
      <div>
        <label className="text-xs text-cyan-300">Proxima dosis (opcional)</label>
        <Input
          type="date"
          value={form.nextDoseDate}
          onChange={(e) => setForm({ ...form, nextDoseDate: e.target.value })}
          className="bg-slate-900/80 border-slate-600 text-white"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={createVaccine.isPending}
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {createVaccine.isPending ? "Guardando..." : "Registrar vacuna"}
      </Button>
    </div>
  );
}

// ============================================================================
// PRODUCTS TAB
// ============================================================================

function ProductsTab() {
  const utils = trpc.useUtils();
  const productsQuery = trpc.veterinaria.products.list.useQuery({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "otro" as const,
    price: "",
    cost: "",
    stock: 0,
    requiresPrescription: false,
  });

  const createProduct = trpc.veterinaria.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado correctamente");
      setShowForm(false);
      setForm({ name: "", category: "otro", price: "", cost: "", stock: 0, requiresPrescription: false });
      utils.veterinaria.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProduct = trpc.veterinaria.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      utils.veterinaria.products.list.invalidate();
    },
  });

  const products = productsQuery.data ?? [];

  const categoryColors: Record<string, string> = {
    medicamento: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    alimento: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    accesorio: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    higiene: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    vitamina: "bg-emerald-500/20 text-emerald-200 border-emerald-500/60",
    otro: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 font-bold shadow-lg shadow-purple-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nuevo producto
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gradient-to-br from-purple-950/80 via-slate-950 to-pink-950/80 border-purple-500/60 shadow-2xl shadow-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-200" />
              </div>
              Nuevo producto
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-slate-100 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">
                Nombre del producto <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="Ej. Antiparasitario Drontal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
              >
                <option value="medicamento">💊 Medicamento</option>
                <option value="alimento">🍖 Alimento</option>
                <option value="accesorio">🦴 Accesorio</option>
                <option value="higiene">🧼 Higiene</option>
                <option value="vitamina">🌿 Vitamina</option>
                <option value="otro">📦 Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">
                  Precio <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-950 border-slate-600 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Costo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-950 border-slate-600 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Stock</label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-600 text-white h-11"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-100 bg-slate-900/85 rounded-lg p-3 border border-slate-600 cursor-pointer hover:bg-slate-900/80">
              <input
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="font-medium">Requiere receta medica</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio son obligatorios");
                  createProduct.mutate({
                    name: form.name,
                    category: form.category,
                    price: form.price,
                    cost: form.cost || undefined,
                    stock: form.stock,
                    requiresPrescription: form.requiresPrescription,
                  });
                }}
                disabled={createProduct.isPending}
                className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 font-bold shadow-lg shadow-purple-500/20"
              >
                <Save className="w-4 h-4" />
                {createProduct.isPending ? "Guardando..." : "Guardar producto"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {productsQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-slate-100 mt-4 font-medium">Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/40 flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Package className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-white font-bold text-xl mb-1">Aun no tienes productos</p>
            <p className="text-sm text-slate-100 max-w-sm mx-auto">
              Agrega productos como medicamentos, alimentos, accesorios para venderlos en tu POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p: any) => (
            <Card
              key={p.id}
              className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 hover:border-purple-500/50 transition-all"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={categoryColors[p.category] + " capitalize text-xs font-bold border"}>
                        {p.category}
                      </Badge>
                      {p.requiresPrescription && (
                        <Badge className="bg-rose-500/20 text-rose-200 border-rose-500/40 text-xs font-bold border">
                          Receta
                        </Badge>
                      )}
                      {p.stock <= 0 && (
                        <Badge className="bg-slate-700 text-slate-100 border-slate-600 text-xs font-bold border">
                          Agotado
                        </Badge>
                      )}
                    </div>
                    <p className="font-bold text-white text-base truncate">{p.name}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl font-bold text-purple-300 tracking-tight">{formatMoney(p.price)}</span>
                      <span className="text-xs text-slate-200">Stock: <span className="font-bold text-slate-200">{p.stock}</span></span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Eliminar este producto?")) deleteProduct.mutate({ id: p.id });
                    }}
                    className="text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SERVICES TAB
// ============================================================================

function ServicesTab() {
  const utils = trpc.useUtils();
  const servicesQuery = trpc.veterinaria.services.list.useQuery({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "consulta" as const,
    price: "",
    durationMinutes: 30,
  });

  const createService = trpc.veterinaria.services.create.useMutation({
    onSuccess: () => {
      toast.success("Servicio creado correctamente");
      setShowForm(false);
      setForm({ name: "", category: "consulta", price: "", durationMinutes: 30 });
      utils.veterinaria.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteService = trpc.veterinaria.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Servicio eliminado");
      utils.veterinaria.services.list.invalidate();
    },
  });

  const services = servicesQuery.data ?? [];

  const categoryColors: Record<string, string> = {
    consulta: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    vacuna: "bg-emerald-500/20 text-emerald-200 border-emerald-500/60",
    desparasitacion: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    estetica: "bg-pink-500/20 text-pink-200 border-pink-500/40",
    cirugia: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    hospitalizacion: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    domicilio: "bg-purple-500/20 text-purple-200 border-purple-500/60",
    otro: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  };

  const categoryEmoji: Record<string, string> = {
    consulta: "🩺",
    vacuna: "💉",
    desparasitacion: "🧪",
    estetica: "✂️",
    cirugia: "⚕️",
    hospitalizacion: "🏥",
    domicilio: "🏠",
    otro: "📋",
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gradient-to-br from-emerald-950/80 via-slate-950 to-cyan-950/80 border-emerald-500/60 shadow-2xl shadow-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-emerald-200" />
              </div>
              Nuevo servicio
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-slate-100 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Nombre del servicio <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="Ej. Consulta general"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
              >
                <option value="consulta">🩺 Consulta</option>
                <option value="vacuna">💉 Vacuna</option>
                <option value="desparasitacion">🧪 Desparasitacion</option>
                <option value="estetica">✂️ Estetica</option>
                <option value="cirugia">⚕️ Cirugia</option>
                <option value="hospitalizacion">🏥 Hospitalizacion</option>
                <option value="domicilio">🏠 Domicilio</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                  Precio <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="300.00"
                  className="bg-slate-950 border-slate-600 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Duracion (min)</label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-600 text-white h-11"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio son obligatorios");
                  createService.mutate(form);
                }}
                disabled={createService.isPending}
                className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                {createService.isPending ? "Guardando..." : "Guardar servicio"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {servicesQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-100 mt-4 font-medium">Cargando servicios...</p>
        </div>
      ) : services.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <Wrench className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-xl mb-1">Aun no tienes servicios</p>
            <p className="text-sm text-slate-100 max-w-sm mx-auto">
              Agrega los servicios que ofreces (consulta, vacunas, esteticos) para venderlos en tu POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((s: any) => (
            <Card
              key={s.id}
              className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 hover:border-emerald-500/50 transition-all"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-3xl flex-shrink-0">{categoryEmoji[s.category] || "📋"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className={categoryColors[s.category] + " capitalize text-xs font-bold border"}>
                          {s.category}
                        </Badge>
                        <span className="text-xs text-slate-200 font-medium">
                          {s.durationMinutes} min
                        </span>
                      </div>
                      <p className="font-bold text-white text-base truncate">{s.name}</p>
                      <p className="text-2xl font-bold text-emerald-300 tracking-tight mt-1">{formatMoney(s.price)}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Eliminar este servicio?")) deleteService.mutate({ id: s.id });
                    }}
                    className="text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.veterinaria.settings.get.useQuery();

  const [form, setForm] = useState({
    clinicName: "",
    doctorName: "",
    professionalLicense: "",
    university: "",
    phone: "",
    email: "",
    address: "",
    rfc: "",
    receiptFooter: "",
  });

  // Cargar datos cuando lleguen del backend
  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        clinicName: settingsQuery.data.clinicName ?? "",
        doctorName: settingsQuery.data.doctorName ?? "",
        professionalLicense: settingsQuery.data.professionalLicense ?? "",
        university: settingsQuery.data.university ?? "",
        phone: settingsQuery.data.phone ?? "",
        email: settingsQuery.data.email ?? "",
        address: settingsQuery.data.address ?? "",
        rfc: settingsQuery.data.rfc ?? "",
        receiptFooter: settingsQuery.data.receiptFooter ?? "",
      });
    }
  }, [settingsQuery.data]);

  const upsertSettings = trpc.veterinaria.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Configuracion guardada correctamente");
      utils.veterinaria.settings.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const isComplete = form.clinicName && form.doctorName && form.professionalLicense;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Card de estado */}
      <Card className={
        isComplete
          ? "bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border-emerald-500/60 shadow-xl shadow-emerald-500/10"
          : "bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/40 shadow-xl shadow-amber-500/10"
      }>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className={
              "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 " +
              (isComplete ? "bg-emerald-500/30" : "bg-amber-500/30")
            }>
              {isComplete
                ? <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                : <AlertTriangle className="w-6 h-6 text-amber-200" />
              }
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-base">
                {isComplete ? "Tu clinica esta configurada" : "Configuracion incompleta"}
              </p>
              <p className={"text-sm mt-0.5 " + (isComplete ? "text-white" : "text-white")}>
                {isComplete
                  ? "Estos datos apareceran en los recibos de venta de tu clinica."
                  : "Llena los campos marcados con * para que tus recibos salgan completos."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de la clinica */}
      <Card className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-emerald-200" />
            </div>
            Datos de la clinica
          </CardTitle>
          <CardDescription className="text-slate-100">
            Informacion basica que aparecera en encabezado de recibos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
              Nombre de la clinica <span className="text-rose-400">*</span>
            </label>
            <Input
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              placeholder="Ej. Veterinaria San Francisco"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Doctor (a) <span className="text-rose-400">*</span>
              </label>
              <Input
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                placeholder="MVZ Juan Perez"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Cedula profesional <span className="text-rose-400">*</span>
              </label>
              <Input
                value={form.professionalLicense}
                onChange={(e) => setForm({ ...form, professionalLicense: e.target.value })}
                placeholder="12345678"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Universidad</label>
            <Input
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="Universidad Nacional Autonoma de Mexico"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos de contacto */}
      <Card className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/30 flex items-center justify-center">
              <Phone className="w-5 h-5 text-cyan-300" />
            </div>
            Contacto
          </CardTitle>
          <CardDescription className="text-slate-100">
            Como te pueden contactar tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Telefono</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555 123 4567"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contacto@clinica.com"
                className="bg-slate-950 border-slate-600 text-white h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Direccion</label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Calle, numero, colonia, ciudad, codigo postal"
              rows={2}
              className="bg-slate-950 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos fiscales y recibo */}
      <Card className="bg-gradient-to-br from-slate-900/85 to-slate-900/95 border-slate-600 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-200" />
            </div>
            Recibos y facturacion
          </CardTitle>
          <CardDescription className="text-slate-100">
            Personaliza la apariencia de tus recibos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">RFC (opcional)</label>
            <Input
              value={form.rfc}
              onChange={(e) => setForm({ ...form, rfc: e.target.value })}
              placeholder="RFC123456ABC"
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
            <p className="text-xs text-slate-200 mt-1.5">Solo si emites facturas formales.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Pie de recibo</label>
            <Textarea
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              placeholder="Ej. Gracias por confiar en nosotros para el cuidado de tu mascota."
              rows={2}
              className="bg-slate-950 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-200 mt-1.5">Mensaje que aparecera al final de cada recibo.</p>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="sticky bottom-4 z-10">
        <Button
          onClick={() => upsertSettings.mutate(form)}
          disabled={upsertSettings.isPending}
          className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-2xl shadow-emerald-500/30 text-base"
        >
          <Save className="w-5 h-5" />
          {upsertSettings.isPending ? "Guardando configuracion..." : "Guardar configuracion"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// APPOINTMENTS TAB - Citas y agenda
// ============================================================================

function AppointmentsTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "upcoming" | "today">("upcoming");
  const [showForm, setShowForm] = useState(false);

  const appointmentsQuery = trpc.veterinaria.appointments.list.useQuery();
  const customersQuery = trpc.customers.list.useQuery();

  const appointments: any[] = (appointmentsQuery.data as any[]) ?? [];
  const customers: any[] = (customersQuery.data as any[]) ?? [];

  const updateStatus = trpc.veterinaria.appointments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Cita actualizada");
      utils.veterinaria.appointments.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAppointment = trpc.veterinaria.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Cita eliminada");
      utils.veterinaria.appointments.list.invalidate();
    },
  });

  // Filtrar
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const filtered = appointments.filter((row: any) => {
    const d = new Date(row.appointment.appointmentAt);
    if (filter === "today") return d >= todayStart && d < tomorrowStart;
    if (filter === "upcoming") return d >= now && row.appointment.status !== "cancelada";
    return true;
  });

  const statusColors: Record<string, string> = {
    pendiente: "bg-amber-500/20 text-amber-100 border-amber-500/40",
    confirmada: "bg-emerald-500/20 text-emerald-100 border-emerald-500/60",
    completada: "bg-blue-500/20 text-blue-100 border-blue-500/40",
    cancelada: "bg-rose-500/20 text-rose-100 border-rose-500/40",
  };

  const statusEmoji: Record<string, string> = {
    pendiente: "⏳",
    confirmada: "✅",
    completada: "✔️",
    cancelada: "❌",
  };

  return (
    <div className="space-y-5">
      {/* Filtros y boton nueva */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setFilter("today")}
            className={
              "px-4 py-2 rounded-lg text-sm font-bold transition-all " +
              (filter === "today"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                : "text-slate-200 hover:bg-slate-700/60")
            }
          >
            Hoy
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={
              "px-4 py-2 rounded-lg text-sm font-bold transition-all " +
              (filter === "upcoming"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                : "text-slate-200 hover:bg-slate-700/60")
            }
          >
            Próximas
          </button>
          <button
            onClick={() => setFilter("all")}
            className={
              "px-4 py-2 rounded-lg text-sm font-bold transition-all " +
              (filter === "all"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                : "text-slate-200 hover:bg-slate-700/60")
            }
          >
            Todas
          </button>
        </div>

        <Button
          onClick={() => {
            if (customers.length === 0) {
              toast.error("Primero registra al menos un cliente");
              return;
            }
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nueva cita
        </Button>
      </div>

      {showForm && (
        <AppointmentForm
          customers={customers}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            utils.veterinaria.appointments.list.invalidate();
          }}
        />
      )}

      {appointmentsQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-100 mt-4 font-medium">Cargando citas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CalendarDays className="w-10 h-10 text-emerald-200" />
            </div>
            <p className="text-white font-bold text-xl mb-1">
              {filter === "today" ? "No hay citas para hoy" : filter === "upcoming" ? "No hay citas próximas" : "Aún no tienes citas"}
            </p>
            <p className="text-sm text-slate-100 max-w-sm mx-auto">
              Agenda una cita para empezar a llevar el control de tus consultas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row: any) => {
            const a = row.appointment;
            const pet = row.pet;
            const customer = row.customer;
            const date = new Date(a.appointmentAt);
            const isToday = date >= todayStart && date < tomorrowStart;
            const isPast = date < now;

            return (
              <Card
                key={a.id}
                className={
                  "bg-gradient-to-br from-slate-900/85 to-slate-900/95 border transition-all hover:shadow-lg " +
                  (isToday
                    ? "border-emerald-500/60 shadow-emerald-500/10"
                    : isPast
                    ? "border-slate-600 opacity-75"
                    : "border-slate-600 hover:border-emerald-500/60")
                }
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Fecha grande izq */}
                    <div className="flex-shrink-0 sm:w-28 text-center bg-slate-900/85 rounded-xl p-3 border border-slate-600">
                      <p className="text-xs text-emerald-200 uppercase tracking-wider font-bold">
                        {format(date, "MMM", { locale: es })}
                      </p>
                      <p className="text-3xl font-bold text-white tracking-tight">
                        {format(date, "dd")}
                      </p>
                      <p className="text-sm text-slate-100 font-bold mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-200" />
                        {format(date, "HH:mm")}
                      </p>
                    </div>

                    {/* Info central */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                        <div>
                          <p className="font-bold text-white text-base flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">{speciesEmoji[pet?.species] || "🐾"}</span>
                            {pet?.name || "Sin mascota"}
                          </p>
                          <p className="text-sm text-slate-100 mt-0.5 flex items-center gap-1.5">
                            <UserCircle className="w-3.5 h-3.5 text-purple-200" />
                            {customer?.name || "Sin cliente"}
                          </p>
                        </div>
                        <Badge className={statusColors[a.status] + " text-xs font-bold border capitalize"}>
                          {statusEmoji[a.status]} {a.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-200 mt-2 bg-slate-900/85 rounded-lg p-2 border border-slate-600">
                        <span className="text-emerald-300 font-bold">Motivo:</span> {a.reason}
                      </p>

                      {a.notes && (
                        <p className="text-xs text-slate-200 mt-1.5 italic">
                          📝 {a.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {a.status === "pendiente" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: a.id, status: "confirmada" })}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                          </Button>
                        )}
                        {(a.status === "pendiente" || a.status === "confirmada") && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: a.id, status: "completada" })}
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completar
                          </Button>
                        )}
                        {a.status !== "cancelada" && a.status !== "completada" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: a.id, status: "cancelada" })}
                            className="h-8 border-rose-500/40 text-rose-200 hover:bg-rose-500/20 gap-1 font-bold"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancelar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Eliminar esta cita?")) deleteAppointment.mutate({ id: a.id });
                          }}
                          className="h-8 text-slate-200 hover:text-rose-300 hover:bg-rose-500/10 gap-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentForm({ customers, onClose, onSaved }: { customers: any[]; onClose: () => void; onSaved: () => void }) {
  const [customerId, setCustomerId] = useState<number>(0);
  const [petId, setPetId] = useState<number>(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Mascotas filtradas por cliente
  const petsQuery = trpc.veterinaria.pets.list.useQuery({});
  const pets = (petsQuery.data ?? []).filter((row: any) => row.pet.customerId === customerId);

  const createMut = trpc.veterinaria.appointments.create.useMutation({
    onSuccess: () => { toast.success("Cita agendada correctamente"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!customerId) return toast.error("Selecciona el cliente");
    if (!petId) return toast.error("Selecciona la mascota");
    if (!date || !time) return toast.error("Fecha y hora son obligatorias");
    if (!reason.trim()) return toast.error("El motivo es obligatorio");

    const appointmentAt = new Date(date + "T" + time + ":00").toISOString();

    createMut.mutate({
      customerId,
      petId,
      appointmentAt,
      durationMinutes: duration,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-950/80 via-slate-950 to-cyan-950/80 border-emerald-500/60 shadow-2xl shadow-emerald-500/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-emerald-200" />
          </div>
          Nueva cita
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-200 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5" /> Cliente <span className="text-rose-400">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(Number(e.target.value)); setPetId(0); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
            >
              <option value={0}>-- Selecciona el cliente --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? " (" + c.phone + ")" : ""}
                </option>
              ))}
            </select>
          </div>
          {customerId > 0 && (
            <div>
              <label className="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <PawPrint className="w-3.5 h-3.5" /> Mascota <span className="text-rose-400">*</span>
              </label>
              {pets.length === 0 ? (
                <p className="text-amber-200 text-sm bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
                  Este cliente no tiene mascotas registradas. Crea una en la pestaña Mascotas.
                </p>
              ) : (
                <select
                  value={petId}
                  onChange={(e) => setPetId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
                >
                  <option value={0}>-- Selecciona la mascota --</option>
                  {pets.map((row: any) => (
                    <option key={row.pet.id} value={row.pet.id}>
                      {row.pet.name} ({row.pet.species})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
              Fecha <span className="text-rose-400">*</span>
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
              Hora <span className="text-rose-400">*</span>
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Duración (min)</label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-slate-950 border-slate-600 text-white h-11"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
            Motivo de la cita <span className="text-rose-400">*</span>
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Consulta general, vacunación, control..."
            className="bg-slate-950 border-slate-600 text-white h-11"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Notas adicionales</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información extra, recordatorios..."
            className="bg-slate-950 border-slate-600 text-white min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={createMut.isPending}
            className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {createMut.isPending ? "Agendando..." : "Agendar cita"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECEIPT MODAL - Recibo imprimible
// ============================================================================

function ReceiptModal({ sale, settings, onClose }: { sale: any; settings: any; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Estilos de impresion - solo visible al imprimir */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-printable, #receipt-printable * { visibility: visible; }
          #receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          #receipt-printable .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
          id="receipt-printable"
        >
          {/* Header del modal (no print) */}
          <div className="no-print sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between rounded-t-3xl z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Venta registrada</p>
                <p className="text-xs text-slate-500">Recibo #{sale.receiptNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Recibo - aqui se imprime */}
          <div className="px-8 py-6 text-slate-900 font-mono text-sm">
            {/* Logo CyberPiezas */}
            <div className="text-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 200 200"
                width="56"
                height="56"
                style={{ display: "inline-block" }}
              >
                <defs>
                  <linearGradient id="receiptLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <rect width="200" height="200" rx="40" fill="#0a0a0a" />
                <circle cx="100" cy="100" r="62" fill="none" stroke="#1f2937" strokeWidth="0.5" />
                <path d="M 142 50 A 50 50 0 1 0 142 150" fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
                <rect x="138" y="89" width="24" height="24" rx="4.5" fill="url(#receiptLogo)" transform="rotate(45 150 101)" />
                <circle cx="146" cy="97" r="2" fill="#ffffff" opacity="0.7" />
              </svg>
            </div>

            {/* Datos de la clinica */}
            <div className="text-center mb-4 pb-4 border-b border-dashed border-slate-300">
              <p className="font-bold text-base uppercase tracking-wide">
                {settings?.clinicName || "Veterinaria"}
              </p>
              {settings?.doctorName && (
                <p className="text-xs mt-1">{settings.doctorName}</p>
              )}
              {settings?.professionalLicense && (
                <p className="text-xs">Cedula: {settings.professionalLicense}</p>
              )}
              {settings?.university && (
                <p className="text-xs">{settings.university}</p>
              )}
              {settings?.address && (
                <p className="text-xs mt-1">{settings.address}</p>
              )}
              {settings?.phone && (
                <p className="text-xs">Tel: {settings.phone}</p>
              )}
              {settings?.rfc && (
                <p className="text-xs mt-1">RFC: {settings.rfc}</p>
              )}
            </div>

            {/* Info del recibo */}
            <div className="mb-4 pb-4 border-b border-dashed border-slate-300 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Recibo:</span>
                <span className="font-bold">#{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{formatDate(sale.date)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4 pb-4 border-b border-dashed border-slate-300">
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">
                Productos y servicios
              </p>
              <div className="space-y-2">
                {sale.items.map((item: any, i: number) => {
                  const subtotal = parseFloat(item.unitPrice) * parseFloat(item.quantity);
                  return (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="flex-1 min-w-0 break-words">{item.description}</span>
                        <span className="font-bold whitespace-nowrap">
                          ${subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        {item.quantity} x ${parseFloat(item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="mb-4">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-base uppercase">Total</span>
                <span className="font-bold text-2xl tracking-tight">
                  ${sale.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Pie del recibo */}
            <div className="text-center text-xs pt-4 border-t border-dashed border-slate-300">
              <p className="italic text-slate-700">
                {settings?.receiptFooter || "Gracias por confiar en nosotros para el cuidado de tu mascota."}
              </p>
              <p className="text-[10px] text-slate-500 mt-3">
                Generado por CyberPiezas POS
              </p>
            </div>
          </div>

          {/* Botones de accion (no print) */}
          <div className="no-print sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex gap-2 rounded-b-3xl">
            <Button
              onClick={handlePrint}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 font-bold gap-2"
            >
              <FileText className="w-4 h-4" /> Imprimir
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-300 hover:bg-slate-50 text-slate-900 rounded-full h-10 font-bold"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}


// ============================================================================
// SUBSCRIPTION CORE V1 - Guard de acceso para Veterinaria
// Patron wrapper: el componente original (VeterinariaPOSContent) queda intacto
// con sus 2713 lineas y todos sus hooks (useParams, queries, mutations).
// Este wrapper hace la validacion ANTES de cualquier render del POS.
//
// IMPORTANTE: VeterinariaPOS.tsx esta marcado como REFACTOR URGENTE (5x el
// limite de 500 lineas). El patron wrapper permite cerrar el agujero de
// seguridad sin tocar la estructura interna del componente original.
// El refactor de las 2713 lineas internas es una tarea aparte.
//
// Nota: useLocation ya estaba importado de wouter (linea 2), no se duplica.
// ============================================================================

export default function VeterinariaPOS() {
  const [, navigateTo] = useLocation();
  const { data: access, isLoading: accessLoading } =
    trpc.pagos.subscriptions.hasAccess.useQuery({ posCode: "veterinaria" });

  // Mientras carga el estado de acceso: loading amigable
  if (accessLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Verificando tu acceso...</p>
      </div>
    );
  }

  // Sin acceso activo: pantalla amigable con CTAs a planes
  if (access && !access.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header con gradiente emerald/cyan tipico de Veterinaria */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-8 pt-12 pb-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="text-7xl mb-3">🐾</div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Veterinaria</h1>
              <p className="text-emerald-50 text-sm font-medium">Sistema integral de gestion clinica</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Necesitas una suscripcion activa
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Para usar Veterinaria necesitas estar suscrito.
                Expedientes, citas, vacunacion y ventas, todo en un solo lugar.
              </p>
            </div>

            {/* Highlights del plan */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <span className="text-base">✓</span>
                <span>Expedientes de mascotas y duenos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <span className="text-base">✓</span>
                <span>Citas con recordatorios automaticos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <span className="text-base">✓</span>
                <span>Vacunacion con alertas de refuerzo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <span className="text-base">✓</span>
                <span>$300/mes o $3,000/ano</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigateTo("/pricing?posCode=veterinaria")}
                className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all"
              >
                Ver planes
              </button>
              <button
                onClick={() => navigateTo("/sistemas")}
                className="w-full h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
              >
                Volver a mi panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Acceso confirmado: renderiza Veterinaria normal (componente original intacto)
  return <VeterinariaPOSContent />;
}
