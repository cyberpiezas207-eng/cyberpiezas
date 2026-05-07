import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Trash2,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
} from "lucide-react";

interface IncomeEntry {
  id: string;
  date: string;
  concept: string;
  amount: number;
  category: string;
  notes?: string;
}

const CATEGORIES = [
  "Venta de pieza",
  "Servicio técnico",
  "Suscripción",
  "Donación",
  "Otro",
];

const STORAGE_KEY = "cyberpiezas_personal_income";
const OWNER_EMAIL = "cyberpiezas207@gmail.com";

export default function IncomeTracker() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch {
        setEntries([]);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.email !== OWNER_EMAIL) {
      navigate("/");
    }
  }, [isAuthenticated, user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.email !== OWNER_EMAIL) {
    return null;
  }

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount) return;

    const newEntry: IncomeEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      date,
      concept,
      amount: parseFloat(amount),
      category,
      notes: notes || undefined,
    };

    setEntries([newEntry, ...entries]);
    setConcept("");
    setAmount("");
    setNotes("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar este registro?")) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const exportToCSV = () => {
    const headers = ["Fecha", "Concepto", "Monto", "Categoría", "Notas"];
    const rows = entries.map((e) => [
      e.date,
      `"${e.concept.replace(/"/g, '""')}"`,
      e.amount.toString(),
      e.category,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos_cyberpiezas_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter entries
  const filteredEntries =
    filter === "all"
      ? entries
      : entries.filter((e) => e.category === filter);

  // Calculate totals
  const totalAll = entries.reduce((sum, e) => sum + e.amount, 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalThisMonth = entries
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  // Group by month for chart
  const monthlyData = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      const month = e.date.slice(0, 7);
      acc[month] = (acc[month] || 0) + e.amount;
      return acc;
    }, {})
  )
    .map(([month, total]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("es-MX", {
        month: "short",
        year: "2-digit",
      }),
      total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Group by category for pie/bar
  const categoryData = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  ).map(([category, total]) => ({ category, total }));

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Mis Ingresos
            </h1>
            <p className="text-slate-400 mt-1">
              Control personal de ingresos · Solo visible para ti
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={entries.length === 0}
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo ingreso
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-slate-400 text-sm">Total acumulado</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalAll)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-slate-400 text-sm">Este mes</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalThisMonth)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-pink-400" />
              <div>
                <p className="text-slate-400 text-sm">Registros totales</p>
                <p className="text-2xl font-bold text-white">{entries.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Registrar nuevo ingreso
            </h2>
            <form
              onSubmit={handleAddEntry}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <Label htmlFor="date" className="text-slate-300">
                  Fecha
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="amount" className="text-slate-300">
                  Monto (MXN)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="concept" className="text-slate-300">
                  Concepto
                </Label>
                <Input
                  id="concept"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Cámara DVR vendida a Juan"
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-slate-300">
                  Categoría
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes" className="text-slate-300">
                  Notas (opcional)
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cualquier detalle"
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Guardar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Charts */}
        {entries.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Ingresos por mes
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ fill: "#ec4899", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Por categoría
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="category" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar
                    dataKey="total"
                    fill="url(#colorGrad)"
                    radius={[8, 8, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Table */}
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Historial</h3>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredEntries.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              {entries.length === 0
                ? "Aún no hay registros. Agrega tu primer ingreso."
                : "Sin registros para esta categoría."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-2 text-slate-400 font-medium">
                      Fecha
                    </th>
                    <th className="py-3 px-2 text-slate-400 font-medium">
                      Concepto
                    </th>
                    <th className="py-3 px-2 text-slate-400 font-medium">
                      Categoría
                    </th>
                    <th className="py-3 px-2 text-slate-400 font-medium text-right">
                      Monto
                    </th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-slate-300">
                        {new Date(e.date + "T00:00:00").toLocaleDateString(
                          "es-MX",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {e.concept}
                        {e.notes && (
                          <p className="text-xs text-slate-400 mt-1">
                            {e.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-green-400 font-bold">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          Los datos se guardan localmente en este navegador. Exporta
          regularmente para no perderlos.
        </p>
      </div>
    </div>
  );
}
