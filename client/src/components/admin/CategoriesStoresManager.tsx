// ============================================================================
// MODAL "Gestionar categorias y tiendas" del modulo de gastos
// ----------------------------------------------------------------------------
// Dos sub-pestanas internas (Categorias | Tiendas) con la misma estructura:
//   - Form para agregar/editar (nombre, icono emoji, color preset)
//   - Lista con boton Editar / Archivar por fila
// Archivar = soft delete (isArchived). Los gastos historicos conservan su ref.
// Overlay propio (no depende de shadcn Dialog). Cierra con ESC, X o clic fuera.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  Tag,
  Store,
  Plus,
  Pencil,
  Archive,
  Check,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type TabKey = "categorias" | "tiendas";
type FormMode = { mode: "idle" } | { mode: "add" } | { mode: "edit"; id: number };

const COLOR_PRESETS = [
  "#ef4444", // rojo
  "#f97316", // naranja
  "#eab308", // amarillo
  "#84cc16", // lima
  "#22c55e", // verde
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#ec4899", // rosa
];

const CATEGORY_ICONS = [
  "📦", "🛒", "⛽", "🥬", "🥩", "💡", "🧾", "🧼", "🧴",
  "🍔", "💊", "👕", "📱", "🐶", "🎁", "🏠", "✈️",
];

const STORE_ICONS = [
  "🏪", "🛒", "⛽", "🏬", "🛍️", "🍴", "🥖", "💊",
  "🚚", "📦", "🏠", "💻",
];

export default function CategoriesStoresManager({ onClose }: Props) {
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabKey>("categorias");
  const [form, setForm] = useState<FormMode>({ mode: "idle" });
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formColor, setFormColor] = useState(COLOR_PRESETS[6]); // indigo default

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Reset form al cambiar de tab
  useEffect(() => {
    setForm({ mode: "idle" });
    setFormName("");
    setFormIcon("");
    setFormColor(COLOR_PRESETS[6]);
  }, [activeTab]);

  const categoriesQuery = trpc.personalExpenses.categories.list.useQuery();
  const storesQuery = trpc.personalExpenses.stores.list.useQuery();

  const categories = categoriesQuery.data ?? [];
  const stores = storesQuery.data ?? [];

  const invalidateAll = () => {
    utils.personalExpenses.categories.list.invalidate();
    utils.personalExpenses.stores.list.invalidate();
    utils.personalExpenses.stats.dashboard.invalidate();
  };

  // ---- CATEGORIAS ----------------------------------------------------------

  const createCategory = trpc.personalExpensesAdmin.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria creada");
      resetForm();
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const updateCategory = trpc.personalExpensesAdmin.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria actualizada");
      resetForm();
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo actualizar"),
  });

  const archiveCategory = trpc.personalExpensesAdmin.categories.archive.useMutation({
    onSuccess: () => {
      toast.success("Categoria archivada");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo archivar"),
  });

  // ---- TIENDAS -------------------------------------------------------------

  const createStore = trpc.personalExpensesAdmin.stores.create.useMutation({
    onSuccess: () => {
      toast.success("Tienda creada");
      resetForm();
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo crear"),
  });

  const updateStore = trpc.personalExpensesAdmin.stores.update.useMutation({
    onSuccess: () => {
      toast.success("Tienda actualizada");
      resetForm();
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo actualizar"),
  });

  const archiveStore = trpc.personalExpensesAdmin.stores.archive.useMutation({
    onSuccess: () => {
      toast.success("Tienda archivada");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || "No se pudo archivar"),
  });

  // ---- Helpers -------------------------------------------------------------

  function resetForm() {
    setForm({ mode: "idle" });
    setFormName("");
    setFormIcon("");
    setFormColor(COLOR_PRESETS[6]);
  }

  function startAdd() {
    setForm({ mode: "add" });
    setFormName("");
    setFormIcon("");
    setFormColor(COLOR_PRESETS[6]);
  }

  function startEdit(item: { id: number; name: string; icon: string | null; color: string | null }) {
    setForm({ mode: "edit", id: item.id });
    setFormName(item.name);
    setFormIcon(item.icon ?? "");
    setFormColor(item.color || COLOR_PRESETS[6]);
  }

  function handleSubmit() {
    const name = formName.trim();
    if (!name) {
      toast.error("Falta el nombre");
      return;
    }
    const payload = {
      name,
      icon: formIcon.trim() || null,
      color: formColor,
    };

    if (activeTab === "categorias") {
      if (form.mode === "add") {
        createCategory.mutate(payload);
      } else if (form.mode === "edit") {
        updateCategory.mutate({ id: form.id, ...payload });
      }
    } else {
      if (form.mode === "add") {
        createStore.mutate(payload);
      } else if (form.mode === "edit") {
        updateStore.mutate({ id: form.id, ...payload });
      }
    }
  }

  function handleArchive(id: number, name: string) {
    if (
      !window.confirm(
        `Archivar "${name}"? Los registros historicos NO se pierden, solo desaparece de los menus.`,
      )
    ) {
      return;
    }
    if (activeTab === "categorias") {
      archiveCategory.mutate({ id });
    } else {
      archiveStore.mutate({ id });
    }
  }

  // ---- Datos de la pestana activa -----------------------------------------

  const items =
    activeTab === "categorias"
      ? categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon ?? null,
          color: c.color ?? null,
          isDefault: c.isDefault ?? false,
        }))
      : stores.map((s) => ({
          id: s.id,
          name: s.name,
          icon: s.icon ?? null,
          color: s.color ?? null,
          isDefault: false,
        }));

  const iconPresets = activeTab === "categorias" ? CATEGORY_ICONS : STORE_ICONS;
  const isBusy =
    createCategory.isPending ||
    updateCategory.isPending ||
    createStore.isPending ||
    updateStore.isPending;

  const itemLabelSingular = activeTab === "categorias" ? "categoria" : "tienda";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-start justify-between gap-3 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              Gestionar categorias y tiendas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Agrega, edita o archiva tus categorias y tiendas personalizadas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 flex items-center gap-2 border-b border-slate-700/60">
          <button
            onClick={() => setActiveTab("categorias")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === "categorias"
                ? "border-indigo-400 text-indigo-200"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            Categorias ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("tiendas")}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === "tiendas"
                ? "border-indigo-400 text-indigo-200"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store className="w-4 h-4" />
            Tiendas ({stores.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Form (add o edit) */}
          {form.mode !== "idle" && (
            <Card className="bg-slate-800 border border-indigo-500/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    {form.mode === "add"
                      ? `Nueva ${itemLabelSingular}`
                      : `Editar ${itemLabelSingular}`}
                  </h3>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nombre
                  </label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      activeTab === "categorias"
                        ? "Ej: Limpieza, Higiene, Mascotas..."
                        : "Ej: Pemex Oxxo, La Comer..."
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>

                {/* Icono */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Icono (emoji)
                  </label>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Input
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value.slice(0, 4))}
                      placeholder="🧼"
                      className="bg-slate-900 border-slate-700 text-white text-center text-lg w-16 shrink-0"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {iconPresets.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormIcon(emoji)}
                          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                            formIcon === emoji
                              ? "bg-indigo-500/30 ring-2 ring-indigo-400"
                              : "bg-slate-900 border border-slate-700 hover:bg-slate-800"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Color
                  </label>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          formColor === c
                            ? "ring-2 ring-white scale-110"
                            : "ring-1 ring-slate-700 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="flex items-center gap-2 pt-2">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: formColor + "22" }}
                  >
                    {formIcon || (activeTab === "categorias" ? "📦" : "🏪")}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      {formName || `Nueva ${itemLabelSingular}`}
                    </p>
                    <p className="text-[10px] text-slate-500">Vista previa</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={isBusy || !formName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {isBusy
                      ? "Guardando..."
                      : form.mode === "add"
                        ? "Crear"
                        : "Guardar cambios"}
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boton agregar (cuando no estamos en form) */}
          {form.mode === "idle" && (
            <Button
              onClick={startAdd}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar{" "}
              {activeTab === "categorias" ? "categoria" : "tienda"}
            </Button>
          )}

          {/* Lista */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardContent className="p-3">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-300 text-sm">
                    No hay {activeTab === "categorias" ? "categorias" : "tiendas"} aun
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Agrega tu primera arriba.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {items.map((item) => {
                    const isEditingThis =
                      form.mode === "edit" && form.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2 py-2 px-1 ${
                          isEditingThis ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{
                              backgroundColor: (item.color ?? "#888780") + "22",
                            }}
                          >
                            {item.icon ||
                              (activeTab === "categorias" ? "📦" : "🏪")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {item.name}
                            </p>
                            {item.isDefault && (
                              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                Predeterminada
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(item)}
                            disabled={form.mode !== "idle"}
                            className="text-slate-400 hover:text-indigo-300 p-1.5 rounded hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(item.id, item.name)}
                            disabled={form.mode !== "idle"}
                            className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Archivar"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-[10px] text-slate-500 text-center px-2">
            Archivar solo oculta el elemento de los menus. Tus gastos historicos
            no se pierden.
          </p>
        </div>
      </div>
    </div>
  );
}
