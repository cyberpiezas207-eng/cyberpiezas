import { useState } from "react";
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
  Syringe,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  UserCircle,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

type TabKey = "pos" | "pets" | "customers" | "products" | "services" | "settings";

// Mapa de URL param a TabKey
const tabFromUrl = (urlTab: string | undefined): TabKey => {
  switch (urlTab) {
    case "mascotas": return "pets";
    case "clientes": return "customers";
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

export default function VeterinariaPOS() {
  const params = useParams() as { tab?: string };
  const activeTab = tabFromUrl(params?.tab);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Headers contextuales por pestaña
  const headers: Record<TabKey, { title: string; subtitle: string; icon: any }> = {
    pos: { title: "Punto de Venta", subtitle: "Vende productos y servicios de tu clinica", icon: ShoppingCart },
    pets: { title: "Mascotas", subtitle: "Registro y expediente clinico de mascotas", icon: PawPrint },
    customers: { title: "Clientes", subtitle: "Duenos de las mascotas que atiendes", icon: UserCircle },
    products: { title: "Productos", subtitle: "Inventario de productos y medicamentos", icon: Package },
    services: { title: "Servicios", subtitle: "Catalogo de servicios y consultas", icon: Wrench },
    settings: { title: "Configuracion", subtitle: "Datos de la clinica para recibos", icon: Settings },
  };

  const currentHeader = headers[activeTab];
  const HeaderIcon = currentHeader.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HeaderIcon className="w-8 h-8 text-emerald-400" />
            {currentHeader.title}
          </h1>
          <p className="text-slate-300 mt-1">{currentHeader.subtitle}</p>
        </div>

        {selectedPetId ? (
          <PetDetailView petId={selectedPetId} onBack={() => setSelectedPetId(null)} />
        ) : (
          <>
            {activeTab === "pos" && <POSTab />}
            {activeTab === "pets" && <PetsTab onSelectPet={setSelectedPetId} />}
            {activeTab === "customers" && <CustomersTab />}
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
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente por nombre, email o tel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
        <Button
          onClick={() => { setEditingCustomer(null); setShowForm(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-md"
        >
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => { setShowForm(false); setEditingCustomer(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingCustomer(null);
            utils.customers.list.invalidate();
          }}
        />
      )}

      {customersQuery.isLoading ? (
        <p className="text-center text-slate-300 py-12">Cargando clientes...</p>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <UserCircle className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-200 font-semibold">No hay clientes registrados</p>
            <p className="text-sm text-slate-400 mt-1">
              Empieza agregando un cliente. Despues podras registrar sus mascotas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any) => (
            <Card key={c.id} className="bg-slate-800/60 border-slate-700 hover:border-emerald-500/50 transition-all shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {(c.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{c.name || "Sin nombre"}</h3>
                    <div className="space-y-1 mt-1.5 text-sm text-slate-300">
                      {c.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate">{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate text-xs">{c.email}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingCustomer(c); setShowForm(true); }}
                      className="mt-3 h-7 text-xs border-slate-600 hover:bg-slate-700 text-slate-200"
                    >
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");

  const createMut = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success("Cliente creado"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.customers.update.useMutation({
    onSuccess: () => { toast.success("Cliente actualizado"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const data: any = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    if (isEdit) {
      updateMut.mutate({ id: customer.id, ...data });
    } else {
      createMut.mutate(data);
    }
  };

  return (
    <Card className="bg-slate-800/80 border-emerald-500/40 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-emerald-400" />
            {isEdit ? "Editar cliente" : "Nuevo cliente"}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 block">Nombre completo *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Perez" className="bg-slate-900 border-slate-700 text-white" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 block">Telefono</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512345678" className="bg-slate-900 border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 block">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@ejemplo.com" className="bg-slate-900 border-slate-700 text-white" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 block">Direccion</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, colonia, ciudad" className="bg-slate-900 border-slate-700 text-white" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 block">Notas</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del cliente..." className="bg-slate-900 border-slate-700 text-white min-h-[80px]" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold">
            <Save className="w-4 h-4" />
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">Cancelar</Button>
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

  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const createSale = trpc.veterinaria.sales.create.useMutation({
    onSuccess: () => {
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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ingresos del mes</p>
                <p className="text-2xl font-bold text-white">
                  {formatMoney(statsQuery.data?.totalRevenue ?? "0")}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-emerald-400 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ventas del mes</p>
                <p className="text-2xl font-bold text-white">
                  {statsQuery.data?.totalSales ?? 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-400 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">En carrito</p>
                <p className="text-2xl font-bold text-white">{formatMoney(cartTotal)}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-amber-400 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalogo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Servicios */}
          {services.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-emerald-400 flex items-center gap-2 text-base">
                  <Wrench className="w-4 h-4" /> Servicios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {services.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => addService(s)}
                      className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-3 text-left transition-colors"
                    >
                      <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.category}</p>
                      <p className="text-emerald-400 font-bold mt-1">{formatMoney(s.price)}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2 text-base">
                <Package className="w-4 h-4" /> Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  No hay productos. Agregalos en la pestania Productos.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={p.stock <= 0}
                      className="bg-purple-600/10 hover:bg-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed border border-purple-500/30 rounded-lg p-3 text-left transition-colors"
                    >
                      <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">Stock: {p.stock}</p>
                      <p className="text-purple-400 font-bold mt-1">{formatMoney(p.price)}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Carrito */}
        <Card className="bg-white/5 border-white/10 sticky top-4 h-fit">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <ShoppingCart className="w-4 h-4" /> Carrito ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">
                Carrito vacio
              </p>
            ) : (
              <>
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(i, e.target.value)}
                      className="w-16 h-8 bg-slate-900/50 border-white/10 text-white text-center"
                      min="0.01"
                      step="0.01"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(i)}
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 space-y-1">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-300">Total:</span>
                    <span className="text-emerald-400">{formatMoney(cartTotal)}</span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={createSale.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {createSale.isPending ? "Procesando..." : "Cobrar"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar mascota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white"
          />
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva mascota
        </Button>
      </div>

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
        <p className="text-center text-slate-500 py-12">Cargando...</p>
      ) : pets.length === 0 ? (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 font-medium">No hay mascotas registradas</p>
            <p className="text-sm text-slate-500 mt-1">
              Empieza creando una nueva mascota.
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
                className="bg-white/5 border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{speciesEmoji[pet.species] || "🐾"}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{pet.name}</h3>
                      <p className="text-sm text-slate-400 truncate">
                        {pet.breed || pet.species}
                      </p>
                      {customer && (
                        <p className="text-xs text-purple-300 mt-1 truncate">
                          👤 {customer.name}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <Badge className="bg-slate-700 text-slate-200 text-xs">
                          {pet.sex}
                        </Badge>
                        {pet.sterilized && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">
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
    <Card className="bg-emerald-950/30 border-emerald-500/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Nueva mascota</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Cliente *</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
            className="w-full bg-slate-900/80 border border-white/10 rounded-md p-2 text-white"
          >
            <option value={0}>Seleccionar cliente...</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              No hay clientes. Crea uno primero en la seccion Clientes.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Nombre *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Firulais"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Especie</label>
            <select
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value as any })}
              className="w-full bg-slate-900/80 border border-white/10 rounded-md p-2 text-white"
            >
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="ave">Ave</option>
              <option value="reptil">Reptil</option>
              <option value="roedor">Roedor</option>
              <option value="exotico">Exotico</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Raza</label>
            <Input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              placeholder="Labrador"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Sexo</label>
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as any })}
              className="w-full bg-slate-900/80 border border-white/10 rounded-md p-2 text-white"
            >
              <option value="desconocido">Desconocido</option>
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Color</label>
            <Input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="Cafe con blanco"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Peso (kg)</label>
            <Input
              type="number"
              step="0.01"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="12.5"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Microchip</label>
          <Input
            value={form.microchip}
            onChange={(e) => setForm({ ...form, microchip: e.target.value })}
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.sterilized}
            onChange={(e) => setForm({ ...form, sterilized: e.target.checked })}
          />
          Esterilizado/a
        </label>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Notas</label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="bg-slate-900/80 border-white/10 text-white"
            rows={2}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createPet.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {createPet.isPending ? "Guardando..." : "Guardar mascota"}
        </Button>
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
    return <p className="text-center text-slate-500 py-12">Cargando expediente...</p>;
  }

  if (!petQuery.data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Mascota no encontrada</p>
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
        className="text-slate-400 gap-2"
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
              <p className="text-slate-400">
                {pet.breed || pet.species} • {pet.sex}
                {pet.weight && ` • ${pet.weight} kg`}
              </p>
              {customer && (
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
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
      <Card className="bg-white/5 border-white/10">
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
            <p className="text-center text-slate-500 py-6 text-sm">
              Sin visitas registradas
            </p>
          ) : (
            visits.map((v: any) => (
              <div key={v.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{v.reason}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(v.visitDate), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                {v.diagnosis && (
                  <p className="text-sm text-slate-300 mt-2">
                    <span className="text-purple-400 font-semibold">Diagnostico:</span> {v.diagnosis}
                  </p>
                )}
                {v.treatment && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-emerald-400 font-semibold">Tratamiento:</span> {v.treatment}
                  </p>
                )}
                {v.prescribedMedications && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-amber-400 font-semibold">Medicamentos:</span> {v.prescribedMedications}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Vacunas */}
      <Card className="bg-white/5 border-white/10">
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
            <p className="text-center text-slate-500 py-6 text-sm">
              Sin vacunas registradas
            </p>
          ) : (
            vaccinations.map((vac: any) => (
              <div key={vac.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{vac.vaccineName}</p>
                    <p className="text-xs text-slate-400">
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
        className="bg-slate-900/80 border-white/10 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Peso (kg)"
          type="number"
          step="0.01"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          className="bg-slate-900/80 border-white/10 text-white"
        />
        <Input
          placeholder="Temperatura"
          type="number"
          step="0.1"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          className="bg-slate-900/80 border-white/10 text-white"
        />
      </div>
      <Textarea
        placeholder="Diagnostico"
        value={form.diagnosis}
        onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-white/10 text-white"
      />
      <Textarea
        placeholder="Tratamiento"
        value={form.treatment}
        onChange={(e) => setForm({ ...form, treatment: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-white/10 text-white"
      />
      <Textarea
        placeholder="Medicamentos recetados"
        value={form.prescribedMedications}
        onChange={(e) => setForm({ ...form, prescribedMedications: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-white/10 text-white"
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
        className="bg-slate-900/80 border-white/10 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Marca"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          className="bg-slate-900/80 border-white/10 text-white"
        />
        <Input
          placeholder="Lote"
          value={form.batchNumber}
          onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
          className="bg-slate-900/80 border-white/10 text-white"
        />
      </div>
      <div>
        <label className="text-xs text-cyan-300">Proxima dosis (opcional)</label>
        <Input
          type="date"
          value={form.nextDoseDate}
          onChange={(e) => setForm({ ...form, nextDoseDate: e.target.value })}
          className="bg-slate-900/80 border-white/10 text-white"
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
      toast.success("Producto creado");
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo producto
        </Button>
      </div>

      {showForm && (
        <Card className="bg-purple-950/30 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white">Nuevo producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-slate-900/80 border-white/10 text-white"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
              className="w-full bg-slate-900/80 border border-white/10 rounded-md p-2 text-white"
            >
              <option value="medicamento">Medicamento</option>
              <option value="alimento">Alimento</option>
              <option value="accesorio">Accesorio</option>
              <option value="higiene">Higiene</option>
              <option value="vitamina">Vitamina</option>
              <option value="otro">Otro</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400">Precio *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="bg-slate-900/80 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Costo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="bg-slate-900/80 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Stock</label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="bg-slate-900/80 border-white/10 text-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
              />
              Requiere receta
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio requeridos");
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
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
              >
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Sin productos. Crea el primero arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-xs text-slate-400">
                  {p.category} • Stock: {p.stock} • {formatMoney(p.price)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Eliminar producto?")) deleteProduct.mutate({ id: p.id });
                }}
                className="text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
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
      toast.success("Servicio creado");
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      {showForm && (
        <Card className="bg-emerald-950/30 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-white">Nuevo servicio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-slate-900/80 border-white/10 text-white"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
              className="w-full bg-slate-900/80 border border-white/10 rounded-md p-2 text-white"
            >
              <option value="consulta">Consulta</option>
              <option value="vacuna">Vacuna</option>
              <option value="desparasitacion">Desparasitacion</option>
              <option value="estetica">Estetica</option>
              <option value="cirugia">Cirugia</option>
              <option value="hospitalizacion">Hospitalizacion</option>
              <option value="domicilio">Domicilio</option>
              <option value="otro">Otro</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Precio *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="bg-slate-900/80 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Duracion (min)</label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="bg-slate-900/80 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio requeridos");
                  createService.mutate(form);
                }}
                disabled={createService.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
              >
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Sin servicios. Crea el primero arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map((s: any) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-slate-400">
                  {s.category} • {s.durationMinutes} min • {formatMoney(s.price)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Eliminar servicio?")) deleteService.mutate({ id: s.id });
                }}
                className="text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
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

  // Cargar datos cuando lleguen
  useState(() => {
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
    return null;
  });

  const upsertSettings = trpc.veterinaria.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Configuracion guardada");
      utils.veterinaria.settings.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="bg-white/5 border-white/10 max-w-3xl">
      <CardHeader>
        <CardTitle className="text-white">Datos de la clinica</CardTitle>
        <CardDescription className="text-slate-400">
          Estos datos apareceran en los recibos y en el sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Nombre de la clinica</label>
          <Input
            value={form.clinicName}
            onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
            placeholder="Veterinaria San Francisco"
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Doctor (a)</label>
            <Input
              value={form.doctorName}
              onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
              placeholder="MVZ Juan Perez"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Cedula profesional</label>
            <Input
              value={form.professionalLicense}
              onChange={(e) => setForm({ ...form, professionalLicense: e.target.value })}
              placeholder="12345678"
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Universidad</label>
          <Input
            value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })}
            placeholder="UNAM"
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Telefono</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Email</label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-slate-900/80 border-white/10 text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Direccion</label>
          <Textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">RFC (opcional)</label>
          <Input
            value={form.rfc}
            onChange={(e) => setForm({ ...form, rfc: e.target.value })}
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Pie de recibo</label>
          <Textarea
            value={form.receiptFooter}
            onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            placeholder="Gracias por su preferencia"
            rows={2}
            className="bg-slate-900/80 border-white/10 text-white"
          />
        </div>
        <Button
          onClick={() => upsertSettings.mutate(form)}
          disabled={upsertSettings.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {upsertSettings.isPending ? "Guardando..." : "Guardar configuracion"}
        </Button>
      </CardContent>
    </Card>
  );
}
