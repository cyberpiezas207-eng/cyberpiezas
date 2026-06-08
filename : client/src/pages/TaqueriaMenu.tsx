// >>> ESTE ARCHIVO VA EN: client/src/pages/TaqueriaMenu.tsx <<<
// =============================================================================
// TaqueriaMenu - Administracion del menu de la taqueria (PASO 2)
// -----------------------------------------------------------------------------
// Pantalla para que el dueno cargue su menu antes de vender:
//   - Categorias (Tacos, Quesadillas, Bebidas...)
//   - Productos (Taco al pastor $20, etc) con precio y foto OPCIONAL
//   - Modificadores reutilizables (Salsas, Extras...) con sus opciones
//     y la posibilidad de asignarlos a cada producto
//
// Conectada al backend que ya existe (taqueriaRouter). Sin endpoints nuevos.
// Comentarios SIN ACENTOS por convencion del proyecto.
// =============================================================================

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Tag,
  UtensilsCrossed,
  SlidersHorizontal,
  Store,
  ChevronRight,
} from "lucide-react";

type TabKey = "categorias" | "productos" | "modificadores";

const PESO = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// =============================================================================
// Componente principal
// =============================================================================

export default function TaqueriaMenu() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("categorias");

  const accessQuery = trpc.taqueria.hasAccess.useQuery();

  if (accessQuery.isLoading) {
    return (
      <div className="tqm-loader">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#E8590C" }} />
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.hasAccess) {
    return (
      <div className="tqm" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{TQM_STYLES}</style>
        <div className="tqm-noaccess">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌮</div>
          <h1>Menu de Taqueria</h1>
          <p>Necesitas una suscripcion activa para administrar el menu.</p>
          <button className="tqm-btn-primary" onClick={() => setLocation("/pricing?posCode=taqueria")}>
            Ver planes
          </button>
          <button className="tqm-btn-ghost" onClick={() => setLocation("/sistemas")}>
            Regresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tqm">
      <style>{TQM_STYLES}</style>

      {/* HEADER */}
      <header className="tqm-header">
        <button onClick={() => setLocation("/sistemas")} className="tqm-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Inicio</span>
        </button>
        <div className="tqm-title">
          <span style={{ fontSize: 22 }}>🌮</span>
          <span className="tqm-title-text">Menu</span>
        </div>
        <button onClick={() => setLocation("/taqueria")} className="tqm-gopos">
          <Store className="w-4 h-4" />
          <span className="hidden sm:inline">Ir al POS</span>
        </button>
      </header>

      {/* TABS */}
      <div className="tqm-tabs">
        <button className={`tqm-tab ${tab === "categorias" ? "is-active" : ""}`} onClick={() => setTab("categorias")}>
          <Tag className="w-4 h-4" />
          Categorias
        </button>
        <button className={`tqm-tab ${tab === "productos" ? "is-active" : ""}`} onClick={() => setTab("productos")}>
          <UtensilsCrossed className="w-4 h-4" />
          Productos
        </button>
        <button className={`tqm-tab ${tab === "modificadores" ? "is-active" : ""}`} onClick={() => setTab("modificadores")}>
          <SlidersHorizontal className="w-4 h-4" />
          Modificadores
        </button>
      </div>

      <div className="tqm-content">
        {tab === "categorias" && <CategoriasTab />}
        {tab === "productos" && <ProductosTab />}
        {tab === "modificadores" && <ModificadoresTab />}
      </div>
    </div>
  );
}

// =============================================================================
// TAB CATEGORIAS
// =============================================================================

function CategoriasTab() {
  const utils = trpc.useUtils();
  const listQuery = trpc.taqueria.categorias.list.useQuery();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const createMut = trpc.taqueria.categorias.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria creada");
      setName("");
      setIcon("");
      utils.taqueria.categorias.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.taqueria.categorias.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria actualizada");
      setEditId(null);
      utils.taqueria.categorias.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.taqueria.categorias.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria eliminada");
      utils.taqueria.categorias.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cats = listQuery.data ?? [];

  const submitCreate = () => {
    if (!name.trim()) {
      toast.error("Escribe el nombre de la categoria");
      return;
    }
    createMut.mutate({ name: name.trim(), icon: icon.trim() || undefined, displayOrder: cats.length });
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditIcon(c.icon ?? "");
  };

  const submitEdit = () => {
    if (!editName.trim()) {
      toast.error("El nombre no puede ir vacio");
      return;
    }
    updateMut.mutate({ id: editId!, name: editName.trim(), icon: editIcon.trim() || undefined, displayOrder: 0 });
  };

  return (
    <div className="tqm-pane">
      <p className="tqm-hint">
        Las categorias agrupan tu menu (ej: Tacos, Quesadillas, Bebidas). El emoji es opcional y aparece en el POS.
      </p>

      {/* Form crear */}
      <div className="tqm-form-row">
        <input
          className="tqm-input tqm-input-icon"
          placeholder="🌮"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
        />
        <input
          className="tqm-input"
          placeholder="Nombre de la categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCreate()}
        />
        <button className="tqm-btn-primary tqm-btn-add" onClick={submitCreate} disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      {/* Lista */}
      {listQuery.isLoading ? (
        <div className="tqm-empty"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E8590C" }} /></div>
      ) : cats.length === 0 ? (
        <div className="tqm-empty">
          <Tag className="w-9 h-9 opacity-25" />
          <p>Aun no hay categorias</p>
        </div>
      ) : (
        <div className="tqm-list">
          {cats.map((c: any) => (
            <div key={c.id} className="tqm-item">
              {editId === c.id ? (
                <>
                  <input className="tqm-input tqm-input-icon" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} maxLength={4} />
                  <input className="tqm-input" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  <button className="tqm-icon-btn tqm-ok" onClick={submitEdit}><Check className="w-4 h-4" /></button>
                  <button className="tqm-icon-btn" onClick={() => setEditId(null)}><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="tqm-item-icon">{c.icon || "🍽️"}</span>
                  <span className="tqm-item-name">{c.name}</span>
                  <button className="tqm-icon-btn" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></button>
                  <button className="tqm-icon-btn tqm-del" onClick={() => { if (confirm(`Eliminar "${c.name}"?`)) deleteMut.mutate({ id: c.id }); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TAB PRODUCTOS
// =============================================================================

function ProductosTab() {
  const utils = trpc.useUtils();
  const catsQuery = trpc.taqueria.categorias.list.useQuery();
  const prodsQuery = trpc.taqueria.productos.list.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    price: "",
    description: "",
    imageUrl: "",
  });

  const cats = catsQuery.data ?? [];
  const prods = prodsQuery.data ?? [];

  const catName = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of cats) m[c.id] = c.name;
    return m;
  }, [cats]);

  const resetForm = () => {
    setForm({ categoryId: "", name: "", price: "", description: "", imageUrl: "" });
    setEditId(null);
    setShowForm(false);
  };

  const createMut = trpc.taqueria.productos.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado");
      resetForm();
      utils.taqueria.productos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.taqueria.productos.update.useMutation({
    onSuccess: () => {
      toast.success("Producto actualizado");
      resetForm();
      utils.taqueria.productos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.taqueria.productos.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      utils.taqueria.productos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const startCreate = () => {
    if (cats.length === 0) {
      toast.error("Primero crea una categoria");
      return;
    }
    setForm({ categoryId: String(cats[0].id), name: "", price: "", description: "", imageUrl: "" });
    setEditId(null);
    setShowForm(true);
  };

  const startEdit = (p: any) => {
    setForm({
      categoryId: String(p.categoryId),
      name: p.name,
      price: String(p.price ?? ""),
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const submit = () => {
    if (!form.categoryId) return toast.error("Elige una categoria");
    if (!form.name.trim()) return toast.error("Escribe el nombre");
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) return toast.error("Precio invalido");

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      price: priceNum.toFixed(2),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || "",
      prepTimeMinutes: 5,
      displayOrder: 0,
    };

    if (editId !== null) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <div className="tqm-pane">
      <div className="tqm-pane-head">
        <p className="tqm-hint" style={{ margin: 0 }}>
          Tus productos vendibles. La foto es opcional (en el POS los botones muestran nombre y precio).
        </p>
        <button className="tqm-btn-primary tqm-btn-add" onClick={startCreate}>
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Lista de productos */}
      {prodsQuery.isLoading ? (
        <div className="tqm-empty"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E8590C" }} /></div>
      ) : prods.length === 0 ? (
        <div className="tqm-empty">
          <UtensilsCrossed className="w-9 h-9 opacity-25" />
          <p>Aun no hay productos</p>
          <p className="tqm-empty-hint">Crea categorias y luego agrega productos</p>
        </div>
      ) : (
        <div className="tqm-list">
          {prods.map((p: any) => (
            <div key={p.id} className="tqm-prod">
              <div className="tqm-prod-main">
                <span className="tqm-prod-name">{p.name}</span>
                <span className="tqm-prod-cat">{catName[p.categoryId] ?? "Sin categoria"}</span>
              </div>
              <span className="tqm-prod-price">{PESO(parseFloat(p.price ?? "0"))}</span>
              <button className="tqm-icon-btn" onClick={() => startEdit(p)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className="tqm-icon-btn tqm-del" onClick={() => { if (confirm(`Eliminar "${p.name}"?`)) deleteMut.mutate({ id: p.id }); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="tqm-modal-backdrop" onClick={resetForm}>
          <div className="tqm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tqm-modal-head">
              <h3>{editId !== null ? "Editar producto" : "Nuevo producto"}</h3>
              <button className="tqm-icon-btn" onClick={resetForm}><X className="w-4 h-4" /></button>
            </div>
            <div className="tqm-modal-body">
              <label className="tqm-label">Categoria</label>
              <select className="tqm-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {cats.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.icon ? c.icon + " " : ""}{c.name}</option>
                ))}
              </select>

              <label className="tqm-label">Nombre</label>
              <input className="tqm-input" placeholder="Taco al pastor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />

              <label className="tqm-label">Precio</label>
              <input className="tqm-input" placeholder="20" type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />

              <label className="tqm-label">Descripcion (opcional)</label>
              <input className="tqm-input" placeholder="Con tortilla de maiz" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <label className="tqm-label">URL de foto (opcional)</label>
              <input className="tqm-input" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="tqm-modal-foot">
              <button className="tqm-btn-ghost" onClick={resetForm}>Cancelar</button>
              <button className="tqm-btn-primary" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId !== null ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TAB MODIFICADORES
// =============================================================================

function ModificadoresTab() {
  const utils = trpc.useUtils();
  const groupsQuery = trpc.taqueria.modifierGroups.list.useQuery();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    icon: "",
    selectionType: "multiple" as "single" | "multiple",
    isRequired: false,
  });

  const groups = groupsQuery.data ?? [];

  const createGroupMut = trpc.taqueria.modifierGroups.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo creado");
      setShowGroupForm(false);
      setGroupForm({ name: "", icon: "", selectionType: "multiple", isRequired: false });
      utils.taqueria.modifierGroups.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroupMut = trpc.taqueria.modifierGroups.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo eliminado");
      if (selectedGroup) setSelectedGroup(null);
      utils.taqueria.modifierGroups.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitGroup = () => {
    if (!groupForm.name.trim()) return toast.error("Escribe el nombre del grupo");
    createGroupMut.mutate({
      name: groupForm.name.trim(),
      icon: groupForm.icon.trim() || undefined,
      selectionType: groupForm.selectionType,
      isRequired: groupForm.isRequired,
      minSelections: groupForm.isRequired ? 1 : 0,
      maxSelections: groupForm.selectionType === "single" ? 1 : 10,
      displayOrder: groups.length,
    });
  };

  return (
    <div className="tqm-pane">
      <div className="tqm-pane-head">
        <p className="tqm-hint" style={{ margin: 0 }}>
          Los modificadores son opciones reutilizables (ej: Salsas, Extras). Se crean una vez y se asignan a varios productos.
        </p>
        <button className="tqm-btn-primary tqm-btn-add" onClick={() => setShowGroupForm(true)}>
          <Plus className="w-4 h-4" /> Grupo
        </button>
      </div>

      {groupsQuery.isLoading ? (
        <div className="tqm-empty"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#E8590C" }} /></div>
      ) : groups.length === 0 ? (
        <div className="tqm-empty">
          <SlidersHorizontal className="w-9 h-9 opacity-25" />
          <p>Aun no hay modificadores</p>
          <p className="tqm-empty-hint">Ej: "Salsas" (verde, roja, habanero)</p>
        </div>
      ) : (
        <div className="tqm-list">
          {groups.map((g: any) => (
            <div key={g.id} className="tqm-group-row">
              <button className="tqm-group-main" onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}>
                <span className="tqm-item-icon">{g.icon || "⚙️"}</span>
                <div className="tqm-group-info">
                  <span className="tqm-item-name">{g.name}</span>
                  <span className="tqm-group-meta">
                    {g.selectionType === "single" ? "Elige 1" : "Elige varios"}
                    {g.isRequired ? " - Obligatorio" : ""}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 tqm-chevron ${selectedGroup === g.id ? "is-open" : ""}`} />
              </button>
              <button className="tqm-icon-btn tqm-del" onClick={() => { if (confirm(`Eliminar grupo "${g.name}" y sus opciones?`)) deleteGroupMut.mutate({ id: g.id }); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {selectedGroup === g.id && <OpcionesEditor groupId={g.id} />}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear grupo */}
      {showGroupForm && (
        <div className="tqm-modal-backdrop" onClick={() => setShowGroupForm(false)}>
          <div className="tqm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tqm-modal-head">
              <h3>Nuevo grupo de modificadores</h3>
              <button className="tqm-icon-btn" onClick={() => setShowGroupForm(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="tqm-modal-body">
              <label className="tqm-label">Emoji (opcional)</label>
              <input className="tqm-input" placeholder="🌶️" value={groupForm.icon} onChange={(e) => setGroupForm({ ...groupForm, icon: e.target.value })} maxLength={4} />

              <label className="tqm-label">Nombre</label>
              <input className="tqm-input" placeholder="Salsas" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} autoFocus />

              <label className="tqm-label">Tipo de seleccion</label>
              <div className="tqm-seg">
                <button className={`tqm-seg-btn ${groupForm.selectionType === "single" ? "is-active" : ""}`} onClick={() => setGroupForm({ ...groupForm, selectionType: "single" })}>
                  Elegir 1
                </button>
                <button className={`tqm-seg-btn ${groupForm.selectionType === "multiple" ? "is-active" : ""}`} onClick={() => setGroupForm({ ...groupForm, selectionType: "multiple" })}>
                  Elegir varios
                </button>
              </div>

              <label className="tqm-check">
                <input type="checkbox" checked={groupForm.isRequired} onChange={(e) => setGroupForm({ ...groupForm, isRequired: e.target.checked })} />
                <span>Obligatorio (el cliente debe elegir al menos uno)</span>
              </label>
            </div>
            <div className="tqm-modal-foot">
              <button className="tqm-btn-ghost" onClick={() => setShowGroupForm(false)}>Cancelar</button>
              <button className="tqm-btn-primary" onClick={submitGroup} disabled={createGroupMut.isPending}>
                {createGroupMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Editor de opciones dentro de un grupo (se despliega al abrir el grupo)
// -----------------------------------------------------------------------------

function OpcionesEditor({ groupId }: { groupId: number }) {
  const utils = trpc.useUtils();
  const optsQuery = trpc.taqueria.modifierOptions.listByGroup.useQuery({ groupId });
  const [name, setName] = useState("");
  const [delta, setDelta] = useState("");

  const createMut = trpc.taqueria.modifierOptions.create.useMutation({
    onSuccess: () => {
      toast.success("Opcion agregada");
      setName("");
      setDelta("");
      utils.taqueria.modifierOptions.listByGroup.invalidate({ groupId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.taqueria.modifierOptions.delete.useMutation({
    onSuccess: () => {
      toast.success("Opcion eliminada");
      utils.taqueria.modifierOptions.listByGroup.invalidate({ groupId });
    },
    onError: (e) => toast.error(e.message),
  });

  const opts = optsQuery.data ?? [];

  const submit = () => {
    if (!name.trim()) return toast.error("Escribe el nombre de la opcion");
    const d = delta.trim() === "" ? 0 : parseFloat(delta);
    if (isNaN(d)) return toast.error("Precio extra invalido");
    createMut.mutate({
      groupId,
      name: name.trim(),
      priceDelta: d.toFixed(2),
      isDefault: false,
      displayOrder: opts.length,
    });
  };

  return (
    <div className="tqm-opts">
      <div className="tqm-form-row tqm-opts-form">
        <input className="tqm-input" placeholder="Opcion (ej: Verde)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <input className="tqm-input tqm-input-delta" placeholder="+$0" type="number" inputMode="decimal" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <button className="tqm-btn-primary tqm-btn-add" onClick={submit} disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      {optsQuery.isLoading ? (
        <div className="tqm-empty" style={{ padding: 16 }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#E8590C" }} /></div>
      ) : opts.length === 0 ? (
        <p className="tqm-opts-empty">Sin opciones aun. Agrega la primera arriba.</p>
      ) : (
        <div className="tqm-opts-list">
          {opts.map((o: any) => {
            const d = parseFloat(o.priceDelta ?? "0");
            return (
              <div key={o.id} className="tqm-opt-chip">
                <span>{o.name}</span>
                {d !== 0 && <span className="tqm-opt-delta">{d > 0 ? "+" : ""}{PESO(d)}</span>}
                <button onClick={() => deleteMut.mutate({ id: o.id })} aria-label="Quitar"><X className="w-3 h-3" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ESTILOS
// =============================================================================

const TQM_STYLES = `
.tqm {
  --c-primary: #E8590C;
  --c-primary-dark: #C2410C;
  --c-primary-soft: #FFF1E6;
  --c-surface: #FFFFFF;
  --c-bg: #F5F1EC;
  --c-text: #1C1917;
  --c-muted: #78716C;
  --c-border: rgba(0,0,0,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh; background: var(--c-bg); color: var(--c-text);
}
.tqm-loader { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F5F1EC; }

.tqm-header {
  position: sticky; top: 0; z-index: 20; background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  display: flex; align-items: center; gap: 12px; padding: 10px 16px;
}
.tqm-back, .tqm-gopos {
  display: flex; align-items: center; gap: 6px; border: none; background: none;
  cursor: pointer; color: var(--c-muted); font-size: 14px; font-weight: 600;
  padding: 6px 10px; border-radius: 8px;
}
.tqm-back:hover { background: var(--c-bg); color: var(--c-text); }
.tqm-gopos { background: var(--c-primary-soft); color: var(--c-primary-dark); }
.tqm-gopos:hover { background: var(--c-primary); color: white; }
.tqm-title { display: flex; align-items: center; gap: 8px; flex: 1; }
.tqm-title-text { font-size: 19px; font-weight: 700; font-family: Georgia, serif; }

.tqm-tabs {
  display: flex; gap: 6px; padding: 12px 16px 0; background: var(--c-surface);
  border-bottom: 1px solid var(--c-border); overflow-x: auto;
}
.tqm-tab {
  display: flex; align-items: center; gap: 7px; border: none; background: none;
  cursor: pointer; padding: 10px 16px; border-radius: 10px 10px 0 0;
  font-size: 14px; font-weight: 600; color: var(--c-muted);
  border-bottom: 3px solid transparent; white-space: nowrap;
}
.tqm-tab:hover { color: var(--c-text); }
.tqm-tab.is-active { color: var(--c-primary-dark); border-bottom-color: var(--c-primary); }

.tqm-content { max-width: 820px; margin: 0 auto; padding: 20px 16px 60px; }
.tqm-pane { }
.tqm-pane-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.tqm-hint { font-size: 13px; color: var(--c-muted); margin: 0 0 16px; line-height: 1.5; }

.tqm-form-row { display: flex; gap: 8px; margin-bottom: 20px; }
.tqm-input {
  flex: 1; border: 1.5px solid var(--c-border); background: var(--c-surface);
  border-radius: 11px; padding: 11px 14px; font-size: 15px; color: var(--c-text);
  outline: none; transition: border-color 0.15s ease; width: 100%;
}
.tqm-input:focus { border-color: var(--c-primary); }
.tqm-input-icon { flex: 0 0 60px; text-align: center; font-size: 18px; }
.tqm-input-delta { flex: 0 0 90px; }

.tqm-label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--c-muted); margin: 14px 0 6px; }
.tqm-label:first-child { margin-top: 0; }

.tqm-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  border: none; cursor: pointer; background: var(--c-primary); color: white;
  border-radius: 11px; padding: 11px 18px; font-size: 15px; font-weight: 700;
  transition: background 0.15s ease;
}
.tqm-btn-primary:hover:not(:disabled) { background: var(--c-primary-dark); }
.tqm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.tqm-btn-add { flex-shrink: 0; }
.tqm-btn-ghost {
  border: none; cursor: pointer; background: none; color: var(--c-muted);
  border-radius: 11px; padding: 11px 18px; font-size: 15px; font-weight: 600;
}
.tqm-btn-ghost:hover { background: var(--c-bg); color: var(--c-text); }

.tqm-list { display: flex; flex-direction: column; gap: 8px; }
.tqm-item, .tqm-prod {
  display: flex; align-items: center; gap: 10px; background: var(--c-surface);
  border: 1px solid var(--c-border); border-radius: 14px; padding: 12px 14px;
}
.tqm-item-icon { font-size: 20px; flex-shrink: 0; }
.tqm-item-name { flex: 1; font-size: 15px; font-weight: 600; }

.tqm-prod-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tqm-prod-name { font-size: 15px; font-weight: 700; }
.tqm-prod-cat { font-size: 12px; color: var(--c-muted); }
.tqm-prod-price { font-size: 16px; font-weight: 800; color: var(--c-primary); }

.tqm-icon-btn {
  width: 34px; height: 34px; border-radius: 9px; border: none; background: var(--c-bg);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--c-text); flex-shrink: 0;
}
.tqm-icon-btn:hover { background: var(--c-primary-soft); color: var(--c-primary); }
.tqm-icon-btn.tqm-del:hover { background: #FEE2E2; color: #DC2626; }
.tqm-icon-btn.tqm-ok { background: var(--c-primary); color: white; }

.tqm-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 50px 20px; color: var(--c-muted); text-align: center;
}
.tqm-empty-hint { font-size: 12px; }

/* GRUPOS */
.tqm-group-row {
  background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px;
  display: flex; flex-wrap: wrap; align-items: center; padding: 6px 10px 6px 6px;
}
.tqm-group-main {
  flex: 1; display: flex; align-items: center; gap: 10px; border: none; background: none;
  cursor: pointer; padding: 8px; border-radius: 10px; text-align: left; min-width: 0;
}
.tqm-group-main:hover { background: var(--c-bg); }
.tqm-group-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tqm-group-meta { font-size: 12px; color: var(--c-muted); }
.tqm-chevron { color: var(--c-muted); transition: transform 0.2s ease; }
.tqm-chevron.is-open { transform: rotate(90deg); }

.tqm-opts { flex-basis: 100%; border-top: 1px solid var(--c-border); margin-top: 6px; padding: 14px 8px 8px; }
.tqm-opts-form { margin-bottom: 12px; }
.tqm-opts-empty { font-size: 13px; color: var(--c-muted); text-align: center; padding: 8px 0; }
.tqm-opts-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tqm-opt-chip {
  display: flex; align-items: center; gap: 7px; background: var(--c-primary-soft);
  border-radius: 999px; padding: 7px 8px 7px 14px; font-size: 14px; font-weight: 600;
  color: var(--c-primary-dark);
}
.tqm-opt-delta { font-size: 12px; opacity: 0.8; }
.tqm-opt-chip button {
  width: 20px; height: 20px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(0,0,0,0.08); color: var(--c-primary-dark);
  display: flex; align-items: center; justify-content: center;
}
.tqm-opt-chip button:hover { background: #DC2626; color: white; }

/* SEGMENT + CHECK */
.tqm-seg { display: flex; gap: 6px; background: var(--c-bg); border-radius: 11px; padding: 4px; }
.tqm-seg-btn {
  flex: 1; border: none; background: none; cursor: pointer; padding: 9px;
  border-radius: 8px; font-size: 14px; font-weight: 600; color: var(--c-muted);
}
.tqm-seg-btn.is-active { background: var(--c-surface); color: var(--c-primary-dark); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tqm-check { display: flex; align-items: center; gap: 9px; margin-top: 16px; font-size: 14px; cursor: pointer; }
.tqm-check input { width: 18px; height: 18px; accent-color: var(--c-primary); }

/* MODAL */
.tqm-modal-backdrop {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center;
}
.tqm-modal {
  background: var(--c-surface); width: 100%; max-width: 480px;
  border-radius: 22px 22px 0 0; max-height: 90vh; display: flex; flex-direction: column;
  animation: tqmUp 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes tqmUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.tqm-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--c-border); }
.tqm-modal-head h3 { margin: 0; font-size: 18px; font-weight: 800; }
.tqm-modal-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
.tqm-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 20px; border-top: 1px solid var(--c-border); }

@media (min-width: 560px) {
  .tqm-modal-backdrop { align-items: center; padding: 16px; }
  .tqm-modal { border-radius: 22px; }
}
`;
